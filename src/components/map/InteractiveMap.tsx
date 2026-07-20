import { useEffect, useRef, useState } from 'react'
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon, Position } from 'geojson'
import franceContourRaw from '../../data/france-contour.json'
import regionsZonesRaw from '../../data/regions-zones.json'
import villesData from '../../data/villes.json'
import type { City, LabelDirection, ZoneProps } from '../../types'
import { CardDialog } from './CardDialog'
import './InteractiveMap.css'

const franceContour = franceContourRaw as Feature<MultiPolygon>
const villes = villesData as FeatureCollection<Point, City>
const regionsZones = regionsZonesRaw as FeatureCollection<Polygon, ZoneProps>

/* ── Projection Web Mercator → repère SVG ── */
const VIEW_W = 800
const PAD = 24

function mercator([lng, lat]: Position): [number, number] {
  const x = (lng * Math.PI) / 180
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  return [x, y]
}

const bounds = (() => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const polygon of franceContour.geometry.coordinates) {
    for (const ring of polygon) {
      for (const coord of ring) {
        const [x, y] = mercator(coord)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { minX, maxX, minY, maxY }
})()

const scale = (VIEW_W - PAD * 2) / (bounds.maxX - bounds.minX)
const VIEW_H = (bounds.maxY - bounds.minY) * scale + PAD * 2

function project(coord: Position): [number, number] {
  const [mx, my] = mercator(coord)
  const x = (mx - bounds.minX) * scale + PAD
  const y = (bounds.maxY - my) * scale + PAD
  return [x, y]
}

function ringToPath(ring: Position[]): string {
  const d = ring
    .map((coord, i) => {
      const [x, y] = project(coord)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
  return `${d} Z`
}

const contourPath = franceContour.geometry.coordinates
  .flatMap((polygon) => polygon.map(ringToPath))
  .join(' ')

/* ══ Mode « zoom tactile » ══

   Les secteurs denses (Île-de-France, Bas-Rhin, Puy-de-Dôme) sont délimités
   par les polygones de regions-zones.json, dessinés sur la carte en zones
   tactiles. En vue d'ensemble, les villes situées dans une zone sont
   masquées ; toucher la zone anime le viewBox pour zoomer sur la région :
   chaque ville retrouve alors son point et son nom, bien espacés (tailles
   constantes à l'écran grâce au facteur u = view.w / VIEW_W). Retour par le
   bouton « Vue d'ensemble » ou en touchant la carte hors d'une ville.

   Les étiquettes sont placées automatiquement : direction labelDir de
   villes.json d'abord, puis les autres directions, puis des diagonales, en
   refusant toute collision (étiquettes, points, zones, bords). */

const MARKER_R = 6
const LABEL_FS = 13 // cohérent avec font-size de .map-label
const ZOOM_MS = 650
const MAX_K = 13 // facteur de zoom maximal

type TextAnchor = 'start' | 'middle' | 'end'
type Baseline = 'auto' | 'central' | 'hanging'

interface Pt {
  nom: string
  props: City
  tx: number
  ty: number
  x: number
  y: number
  lx: number
  ly: number
  anchor: TextAnchor
  baseline: Baseline
}

interface Rect { x: number; y: number; w: number; h: number }
interface LabelRect extends Rect { lx: number; ly: number; anchor: TextAnchor; baseline: Baseline }
interface ViewBox { x: number; y: number; w: number; h: number }

interface Zone {
  nom: string
  code: string
  path: string
  bbox: Rect
  members: Pt[]
  /* Cadre cible du zoom et position de l'étiquette (centre de la zone). */
  view: ViewBox
  lx: number
  ly: number
}

const basePts = (): Pt[] =>
  villes.features.map((f) => {
    const [x, y] = project(f.geometry.coordinates)
    return {
      nom: f.properties.nom, props: f.properties,
      tx: x, ty: y, x, y,
      lx: x, ly: y, anchor: 'middle', baseline: 'hanging',
    }
  })

/* Test point-dans-polygone (lancer de rayon) sur un anneau projeté. */
function pointInRing(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const inter = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/* Placement d'étiquettes avec évitement de collisions.
   u = facteur d'unité (1 en vue pleine, view.w / VIEW_W en zoom). */
function placeLabels(pts: Pt[], u: number, bnds: ViewBox, extraRects: Rect[]): Rect[] {
  const lh = LABEL_FS * 1.15 * u
  const wOf = (nom: string) => (nom.length * LABEL_FS * 0.62 + 2) * u
  const gap = (MARKER_R + 5) * u
  const rects: Rect[] = [...extraRects]
  const mr = (MARKER_R + 2) * u
  const mrects = () => pts.map((p) => ({ p, x: p.x - mr, y: p.y - mr, w: 2 * mr, h: 2 * mr }))
  const m = 3 * u
  const hit = (r: Rect, self: Pt) =>
    r.x < bnds.x + m || r.y < bnds.y + m ||
    r.x + r.w > bnds.x + bnds.w - m || r.y + r.h > bnds.y + bnds.h - m ||
    rects.some((o) => inter(r, o)) ||
    mrects().some((o) => o.p !== self && inter(r, o))

  const rectFor = (p: Pt, dir: LabelDirection): LabelRect => {
    const w = wOf(p.nom)
    switch (dir) {
      case 'right':
        return { x: p.x + gap, y: p.y - lh / 2, w, h: lh, lx: p.x + gap, ly: p.y, anchor: 'start', baseline: 'central' }
      case 'left':
        return { x: p.x - gap - w, y: p.y - lh / 2, w, h: lh, lx: p.x - gap, ly: p.y, anchor: 'end', baseline: 'central' }
      case 'top':
        return { x: p.x - w / 2, y: p.y - gap - lh, w, h: lh, lx: p.x, ly: p.y - gap, anchor: 'middle', baseline: 'auto' }
      case 'bottom':
      default:
        return { x: p.x - w / 2, y: p.y + gap, w, h: lh, lx: p.x, ly: p.y + gap, anchor: 'middle', baseline: 'hanging' }
    }
  }
  const rectAt = (p: Pt, ang: number, dist: number): LabelRect => {
    const px = p.x + Math.cos(ang) * dist * u
    const py = p.y + Math.sin(ang) * dist * u
    const c = Math.cos(ang)
    const anchor: TextAnchor = c > 0.38 ? 'start' : c < -0.38 ? 'end' : 'middle'
    const w = wOf(p.nom)
    const x = anchor === 'start' ? px : anchor === 'end' ? px - w : px - w / 2
    return { x, y: py - lh / 2, w, h: lh, lx: px, ly: py, anchor, baseline: 'central' }
  }

  for (const p of pts) {
    let r: LabelRect | null = null
    const pref = p.props.labelDir ?? 'bottom'
    const dirs: LabelDirection[] = [pref, ...(['right', 'left', 'top', 'bottom'] as LabelDirection[]).filter((d) => d !== pref)]
    for (const d of dirs) {
      const t = rectFor(p, d)
      if (!hit(t, p)) { r = t; break }
    }
    if (!r) {
      outer: for (const dist of [(MARKER_R + 5) * 2.1, (MARKER_R + 5) * 3.2]) {
        for (let k = 0; k < 8; k++) {
          const t = rectAt(p, (k * Math.PI) / 4, dist)
          if (!hit(t, p)) { r = t; break outer }
        }
      }
    }
    if (!r) r = rectFor(p, pref)
    rects.push(r)
    p.lx = r.lx; p.ly = r.ly; p.anchor = r.anchor; p.baseline = r.baseline
  }
  return rects
}

/* Cadre de zoom d'une zone : sa boîte englobante + marge, ramenée au ratio
   de la carte pour remplir l'écran, zoom plafonné à MAX_K. */
function zoneView(b: Rect): ViewBox {
  let w = b.w * 1.36 + 16
  let h = b.h * 1.36 + 16
  const ratio = VIEW_W / VIEW_H
  if (w / h > ratio) h = w / ratio
  else w = h * ratio
  if (w < VIEW_W / MAX_K) {
    h *= VIEW_W / MAX_K / w
    w = VIEW_W / MAX_K
  }
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h }
}

/* ── Vue d'ensemble : villes isolées + zones délimitées (calculée une fois) ── */
const overview = (() => {
  const pts = basePts()

  const zones: Zone[] = regionsZones.features.map((f) => {
    const outerRing = f.geometry.coordinates[0].map(project)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const [x, y] of outerRing) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    const bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    return {
      nom: f.properties.nom,
      code: f.properties.code,
      path: f.geometry.coordinates.map(ringToPath).join(' '),
      bbox,
      members: pts.filter((p) => pointInRing(p.tx, p.ty, outerRing)),
      view: zoneView(bbox),
      lx: minX + bbox.w / 2,
      ly: minY + bbox.h / 2,
    }
  })

  const zoned = new Set(zones.flatMap((z) => z.members))
  const singles = pts.filter((p) => !zoned.has(p))
  placeLabels(singles, 1, { x: 0, y: 0, w: VIEW_W, h: VIEW_H }, zones.map((z) => z.bbox))
  return { singles, zones }
})()

const FULL_VIEW: ViewBox = { x: 0, y: 0, w: VIEW_W, h: VIEW_H }

/* Vue zoomée : villes à leur position réelle dans le cadre, étiquettes recalculées */
function zoomCities(view: ViewBox): Pt[] {
  const u = view.w / VIEW_W
  const pts = basePts().filter(
    (p) =>
      p.tx > view.x - 40 * u && p.tx < view.x + view.w + 40 * u &&
      p.ty > view.y - 40 * u && p.ty < view.y + view.h + 40 * u,
  )
  placeLabels(pts, u, view, [])
  return pts
}

// Cartouche de titre : visible ~10 s à l'ouverture de l'onglet, puis effacé.
const TITLE_HOLD_MS = 10_000
const TITLE_ANIM_MS = 1100

// Entrées du tiroir-index, triées par nom de ville (ordre alphabétique français).
const indexEntries = [...villes.features]
  .map((f) => f.properties)
  .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

// Sortie du mode PMR : durée du coulissement du tiroir hors de l'écran
// avant son retrait du DOM (aligné sur la transition CSS de .map-drawer).
const DRAWER_EXIT_MS = 550

interface InteractiveMapProps {
  /** Affiche le tiroir-index (intercalaire) : réservé au mode PMR. */
  pmrMode: boolean
}

export default function InteractiveMap({ pmrMode }: InteractiveMapProps) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [titlePhase, setTitlePhase] = useState<'in' | 'out' | 'gone'>('in')
  const [view, setView] = useState<ViewBox>(FULL_VIEW)
  const [zoomedZone, setZoomedZone] = useState<Zone | null>(null)
  const [animating, setAnimating] = useState(false)
  const rafRef = useRef(0)
  // Tiroir-index (intercalaire) : liste des villes/régiments pour naviguer
  // directement vers une carte. Uniquement proposé en mode PMR.
  const [indexOpen, setIndexOpen] = useState(false)
  // Le tiroir reste monté après la sortie du mode PMR, le temps de coulisser
  // hors de l'écran (classe map-drawer--exit) au lieu de disparaître d'un coup.
  const [drawerMounted, setDrawerMounted] = useState(pmrMode)

  useEffect(() => {
    if (pmrMode) {
      setDrawerMounted(true)
      return
    }
    setIndexOpen(false)
    const exitTimer = setTimeout(() => setDrawerMounted(false), DRAWER_EXIT_MS)
    return () => clearTimeout(exitTimer)
  }, [pmrMode])

  const openCityFromIndex = (city: City) => {
    setSelectedCity(city)
    setIndexOpen(false)
  }

  useEffect(() => {
    const outTimer = setTimeout(() => setTitlePhase('out'), TITLE_HOLD_MS)
    const goneTimer = setTimeout(
      () => setTitlePhase('gone'),
      TITLE_HOLD_MS + TITLE_ANIM_MS,
    )
    return () => {
      clearTimeout(outTimer)
      clearTimeout(goneTimer)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function animateTo(from: ViewBox, target: ViewBox, done?: () => void) {
    cancelAnimationFrame(rafRef.current)
    setAnimating(true)
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ZOOM_MS)
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      setView({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      })
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else { setAnimating(false); done?.() }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  function zoomTo(z: Zone) {
    setZoomedZone(z)
    animateTo(view, z.view)
  }

  function zoomOut() {
    animateTo(view, FULL_VIEW, () => setZoomedZone(null))
  }

  const zoomed = zoomedZone !== null
  const u = view.w / VIEW_W // tailles constantes à l'écran
  // Total d'unités de la zone zoomée, pour l'encart de région.
  const nbUnites =
    zoomedZone?.members.reduce((s, p) => s + p.props.entites.length, 0) ?? 0

  // Villes affichées : vue d'ensemble → isolées ; zoom → toutes (étiquettes hors animation)
  const cities = zoomed ? zoomCities(view) : overview.singles
  const showLabels = !animating

  /* Tailles dynamiques en style inline : la feuille CSS l'emporterait sur de
     simples attributs de présentation SVG. */
  const cityGroup = (p: Pt) => (
    <g
      key={p.nom}
      className="map-city"
      role="button"
      tabIndex={0}
      aria-label={
        p.props.entites.length > 1
          ? `${p.nom} — ${p.props.entites.length} unités : ${p.props.entites
              .map((e) => e.regiment)
              .join(', ')}`
          : `${p.nom} — ${p.props.entites[0]?.regiment ?? ''}`
      }
      onClick={(e) => {
        e.stopPropagation()
        setSelectedCity(p.props)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setSelectedCity(p.props)
        }
      }}
    >
      <circle className="map-hit" cx={p.x} cy={p.y} r={13 * u} />
      <circle
        className="map-marker"
        cx={p.x}
        cy={p.y}
        r={MARKER_R * u}
        style={{ strokeWidth: 2 * u }}
      />
      {showLabels && (
        <text
          className="map-label"
          x={p.lx}
          y={p.ly}
          textAnchor={p.anchor}
          dominantBaseline={p.baseline}
          style={{ fontSize: LABEL_FS * u, strokeWidth: 3.5 * u }}
        >
          {p.nom}
        </text>
      )}
    </g>
  )

  return (
    <div className="map-wrapper">
      {titlePhase !== 'gone' && (
        <div className={`map-title map-title--${titlePhase}`}>
          <span className="map-title-kicker">Carte intéractive</span>
          <h2 className="map-title-main">Carte des unités de transmission</h2>
        </div>
      )}

      {zoomed && (
        <button type="button" className="map-back-btn" onClick={zoomOut}>
          ← Vue d'ensemble
        </button>
      )}

      {zoomedZone && (
        <div className="map-region-card">
          <span className="map-region-kicker">Région</span>
          <span className="map-region-name">{zoomedZone.nom}</span>
          <span className="map-region-sub">
            {nbUnites} unité{nbUnites > 1 ? 's' : ''} · toucher la mer pour revenir
          </span>
        </div>
      )}

      <svg
        className="map-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Carte des régiments de Transmissions en France"
        onClick={() => { if (zoomed && !animating) zoomOut() }}
      >
        <path
          className="map-contour"
          d={contourPath}
          fillRule="evenodd"
          style={{ strokeWidth: 1.5 * u }}
        />

        {/* Zones délimitées : tactiles en vue d'ensemble, simple trait de
           contexte pendant le zoom — la zone zoomée gagne un léger voile et
           son nom en filigrane. */}
        {overview.zones.map((z) => {
          if (zoomed) {
            const active = z === zoomedZone
            /* Filigrane à gauche pour le Bas-Rhin/Alsace (code 67) :
               au-dessus de la zone, le nom serait illisible sur la
               frontière. Ancré sur le code, stable si le nom change. */
            const left = z.code === '67'
            return (
              <g key={z.nom}>
                <path
                  className={`map-zone-shape map-zone-shape--bg${active ? ' map-zone-shape--active' : ''}`}
                  d={z.path}
                  style={{ strokeWidth: 2 * u, strokeDasharray: `${6 * u} ${4 * u}` }}
                />
                {active && (
                  <text
                    className="map-zone-watermark"
                    x={left ? z.bbox.x - 10 * u : z.bbox.x + z.bbox.w / 2}
                    y={left ? z.bbox.y + z.bbox.h / 2 : z.bbox.y - 8 * u}
                    textAnchor={left ? 'end' : 'middle'}
                    dominantBaseline={left ? 'central' : 'auto'}
                    style={{ fontSize: 15 * u }}
                  >
                    {z.nom.toUpperCase()}
                  </text>
                )}
              </g>
            )
          }
          return (
            <g
              key={z.nom}
              className="map-zone"
              role="button"
              tabIndex={0}
              aria-label={`${z.nom} — ${z.members.length} villes, toucher pour agrandir`}
              onClick={(e) => { e.stopPropagation(); zoomTo(z) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  zoomTo(z)
                }
              }}
            >
              <path className="map-zone-shape" d={z.path} />
              {showLabels && (
                <text
                  className="map-label"
                  x={z.lx}
                  y={z.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontSize: LABEL_FS - 1 }}
                >
                  {z.nom}
                </text>
              )}
            </g>
          )
        })}

        {cities.map(cityGroup)}
      </svg>

      {drawerMounted && (
        <div
          className={`map-drawer${indexOpen ? ' map-drawer--open' : ''}${
            pmrMode ? '' : ' map-drawer--exit'
          }`}
        >
          <nav className="map-index" aria-label="Index des villes et régiments">
            {indexEntries.map((props) => (
              <button
                key={props.nom}
                className="map-index-btn"
                aria-label={
                  props.entites.length > 1
                    ? `${props.nom} — ${props.entites.length} unités : ${props.entites
                        .map((e) => e.regiment)
                        .join(', ')}`
                    : `${props.nom} — ${props.entites[0]?.regiment ?? ''}`
                }
                onClick={() => openCityFromIndex(props)}
              >
                <span className="map-index-city">{props.nom}</span>
              </button>
            ))}
          </nav>
          <button
            className="map-drawer-handle"
            onClick={() => setIndexOpen((o) => !o)}
            aria-expanded={indexOpen}
            aria-label={indexOpen ? "Masquer l'index des villes" : "Afficher l'index des villes"}
          >
            <span className="map-drawer-chevron" aria-hidden="true">›</span>
            <span className="map-drawer-label">Villes</span>
          </button>
        </div>
      )}

      {selectedCity && (
        <CardDialog city={selectedCity} onClose={() => setSelectedCity(null)} />
      )}
    </div>
  )
}
