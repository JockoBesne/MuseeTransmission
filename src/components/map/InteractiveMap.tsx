import { useEffect, useState } from 'react'
import type { Feature, FeatureCollection, MultiPolygon, Point, Position } from 'geojson'
import franceContourRaw from '../../data/france-contour.json'
import villesData from '../../data/villes.json'
import type { City, LabelDirection } from '../../types'
import { CardDialog } from './CardDialog'
import './InteractiveMap.css'

const franceContour = franceContourRaw as Feature<MultiPolygon>
const villes = villesData as FeatureCollection<Point, City>

/* ── Projection Web Mercator → repère SVG ──
   Rendu statique : plus de dépendance à Leaflet, un simple SVG suffit. */
const VIEW_W = 800
const PAD = 24

function mercator([lng, lat]: Position): [number, number] {
  const x = (lng * Math.PI) / 180
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  return [x, y]
}

// Bornes de la France en coordonnées Mercator (calculées une fois au chargement).
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
  const y = (bounds.maxY - my) * scale + PAD // l'axe Y du SVG est inversé
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

// Contour France (mono-tracé, remplissage evenodd pour gérer d'éventuels trous).
const contourPath = franceContour.geometry.coordinates
  .flatMap((polygon) => polygon.map(ringToPath))
  .join(' ')

type TextAnchor = 'start' | 'middle' | 'end'
type Baseline = 'auto' | 'central' | 'hanging'

interface CityPoint {
  x: number // vrai point géographique projeté (origine de la ligne de rappel)
  y: number
  mx: number // position affichée du marqueur (décalée / dans un encart)
  my: number
  displaced: boolean // décalé avec ligne de rappel (hors encart)
  inInset: boolean // replacé dans un encart de zoom
  props: City
  label: { x: number; y: number; anchor: TextAnchor; baseline: Baseline }
}

const LABEL_GAP = 12

function labelLayout(x: number, y: number, dir: LabelDirection): CityPoint['label'] {
  switch (dir) {
    case 'top':
      return { x, y: y - LABEL_GAP, anchor: 'middle', baseline: 'auto' }
    case 'left':
      return { x: x - LABEL_GAP, y, anchor: 'end', baseline: 'central' }
    case 'right':
      return { x: x + LABEL_GAP, y, anchor: 'start', baseline: 'central' }
    case 'bottom':
    default:
      return { x, y: y + LABEL_GAP, anchor: 'middle', baseline: 'hanging' }
  }
}

/* ── Désencombrement 1 : petits décalages avec ligne de rappel ──
   Pour les paires modérément proches (hors Île-de-France) : le marqueur est
   décalé (dx/dy en unités SVG) et relié à son vrai point par un trait fin. */
const MARKER_OFFSETS: Record<string, { dx: number; dy: number; labelDir?: LabelDirection }> = {
  Mutzig: { dx: -43, dy: 35, labelDir: 'bottom' },
  Haguenau: { dx: 0, dy: -30, labelDir: 'right' },
  Issoire: { dx: 0, dy: 20, labelDir: 'bottom' },
}

/* ── Désencombrement 2 : encart de zoom (« loupe ») ──
   La région la plus dense (Île-de-France : 4 villes dans ~12×20 px) est
   agrandie dans un encart posé sur la mer. Les villes membres y sont replacées,
   espacées et tactiles ; un rectangle sur la carte + un trait relient l'encart
   à la vraie zone. `box` = position/taille de l'encart (unités SVG). */
interface ZoomRegion {
  id: string
  title: string
  members: string[]
  box: { x: number; y: number; w: number; h: number }
  labels: Record<string, LabelDirection>
}

const ZOOM_REGIONS: ZoomRegion[] = [
  {
    id: 'idf',
    title: 'Île-de-France',
    members: ['Paris', 'Versailles', 'Arcueil', 'Montlhéry'],
    box: { x: 22, y: 44, w: 214, h: 196 },
    labels: { Paris: 'top', Versailles: 'bottom', Arcueil: 'right', Montlhéry: 'top' },
  },
]

const INSET_PAD = 16
const INSET_TITLE_H = 28
const MAX_ZOOM = 8

// Vrai point projeté de chaque ville (référence des encarts et des rappels).
const trueXY: Record<string, [number, number]> = {}
for (const f of villes.features) trueXY[f.properties.nom] = project(f.geometry.coordinates)

interface RegionLayout {
  region: ZoomRegion
  positions: Record<string, { mx: number; my: number }>
  srcRect: { x: number; y: number; w: number; h: number }
  connector: { x1: number; y1: number; x2: number; y2: number }
}

// Point où le segment centre→cible sort d'un rectangle (pour un trait « propre »).
function borderPoint(r: { x: number; y: number; w: number; h: number }, tx: number, ty: number) {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const dx = tx - cx
  const dy = ty - cy
  const sx = dx !== 0 ? r.w / 2 / Math.abs(dx) : Infinity
  const sy = dy !== 0 ? r.h / 2 / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

const regionLayouts: RegionLayout[] = ZOOM_REGIONS.map((r) => {
  const pts = r.members.map((n) => trueXY[n])
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minx = Math.min(...xs), maxx = Math.max(...xs)
  const miny = Math.min(...ys), maxy = Math.max(...ys)
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2
  const bw = Math.max(maxx - minx, 1), bh = Math.max(maxy - miny, 1)
  const z = Math.min(
    (r.box.w - INSET_PAD * 2) / bw,
    (r.box.h - INSET_PAD * 2 - INSET_TITLE_H) / bh,
    MAX_ZOOM,
  )
  const icx = r.box.x + r.box.w / 2
  const icy = r.box.y + INSET_TITLE_H + (r.box.h - INSET_TITLE_H) / 2
  const positions: Record<string, { mx: number; my: number }> = {}
  for (const n of r.members) {
    const [tx, ty] = trueXY[n]
    positions[n] = { mx: icx + (tx - cx) * z, my: icy + (ty - cy) * z }
  }
  const srcRect = { x: minx - 8, y: miny - 8, w: bw + 16, h: bh + 16 }
  const from = borderPoint(srcRect, icx, icy)
  const to = borderPoint(r.box, cx, cy)
  return { region: r, positions, srcRect, connector: { x1: from.x, y1: from.y, x2: to.x, y2: to.y } }
})

// Ville → position/étiquette dans un encart (si membre d'une région de zoom).
const insetMembers: Record<string, { pos: { mx: number; my: number }; labelDir: LabelDirection }> = {}
for (const rl of regionLayouts) {
  for (const n of rl.region.members) {
    insetMembers[n] = { pos: rl.positions[n], labelDir: rl.region.labels[n] ?? 'bottom' }
  }
}

const cityPoints: CityPoint[] = villes.features.map((f) => {
  const [x, y] = project(f.geometry.coordinates)
  const props = f.properties
  const inset = insetMembers[props.nom]
  const off = MARKER_OFFSETS[props.nom]
  let mx = x
  let my = y
  let dir: LabelDirection = props.labelDir ?? 'bottom'
  let displaced = false
  if (inset) {
    mx = inset.pos.mx
    my = inset.pos.my
    dir = inset.labelDir
  } else if (off) {
    mx = x + off.dx
    my = y + off.dy
    dir = off.labelDir ?? dir
    displaced = off.dx !== 0 || off.dy !== 0
  }
  return { x, y, mx, my, displaced, inInset: !!inset, props, label: labelLayout(mx, my, dir) }
})

// Cartouche de titre : visible ~30 s à l'ouverture de l'onglet, puis effacé.
const TITLE_HOLD_MS = 10_000 // durée d'affichage
const TITLE_ANIM_MS = 1100 // durée de l'animation de sortie avant retrait (cf. CSS)

export default function InteractiveMap() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  // Phases du cartouche : entrée → sortie → retiré du DOM. Le composant se
  // remonte à chaque ouverture de l'onglet, donc la séquence rejoue à chaque fois.
  const [titlePhase, setTitlePhase] = useState<'in' | 'out' | 'gone'>('in')

  useEffect(() => {
    const outTimer = setTimeout(() => setTitlePhase('out'), TITLE_HOLD_MS)
    const goneTimer = setTimeout(
      () => setTitlePhase('gone'),
      TITLE_HOLD_MS + TITLE_ANIM_MS,
    )
    return () => {
      clearTimeout(outTimer)
      clearTimeout(goneTimer)
    }
  }, [])

  return (
    <div className="map-wrapper">
      {titlePhase !== 'gone' && (
        <div className={`map-title map-title--${titlePhase}`}>
          <span className="map-title-kicker">Carte intéractive</span>
          <h2 className="map-title-main">Carte des unités de transmission</h2>
        </div>
      )}
      <svg
        className="map-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Carte des régiments de Transmissions en France"
      >
        <path className="map-contour" d={contourPath} fillRule="evenodd" />

        {/* Encarts de zoom (« loupe ») sur les régions denses : rectangle
           autour de la vraie zone + trait de liaison + panneau agrandi.
           Décoratif ; les marqueurs agrandis sont rendus dans la boucle des
           villes (donc au-dessus du panneau) et restent tactiles. */}
        {regionLayouts.map((rl) => (
          <g key={rl.region.id} className="map-inset" aria-hidden="true">
            <rect
              className="map-inset-src"
              x={rl.srcRect.x}
              y={rl.srcRect.y}
              width={rl.srcRect.w}
              height={rl.srcRect.h}
              rx={3}
            />
            {rl.region.members.map((n) => (
              <circle
                key={n}
                className="map-leader-anchor"
                cx={trueXY[n][0]}
                cy={trueXY[n][1]}
                r={2}
              />
            ))}
            <line
              className="map-inset-link"
              x1={rl.connector.x1}
              y1={rl.connector.y1}
              x2={rl.connector.x2}
              y2={rl.connector.y2}
            />
            <rect
              className="map-inset-panel"
              x={rl.region.box.x}
              y={rl.region.box.y}
              width={rl.region.box.w}
              height={rl.region.box.h}
              rx={8}
            />
            <text
              className="map-inset-title"
              x={rl.region.box.x + rl.region.box.w / 2}
              y={rl.region.box.y + 18}
              textAnchor="middle"
            >
              {rl.region.title}
            </text>
          </g>
        ))}

        {/* Lignes de rappel des marqueurs décalés, tracées derrière les
           marqueurs (décoratives : le vrai point est marqué d'un petit repère). */}
        <g className="map-leaders" aria-hidden="true">
          {cityPoints
            .filter((p) => p.displaced)
            .map((p) => (
              <g key={p.props.nom}>
                <line className="map-leader" x1={p.x} y1={p.y} x2={p.mx} y2={p.my} />
                <circle className="map-leader-anchor" cx={p.x} cy={p.y} r={2.5} />
              </g>
            ))}
        </g>

        {cityPoints.map(({ mx, my, props, label, inInset }) => (
          <g
            key={props.nom}
            className={`map-city${inInset ? ' map-city--inset' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={
              props.entites.length > 1
                ? `${props.nom} — ${props.entites.length} unités : ${props.entites
                    .map((e) => e.regiment)
                    .join(', ')}`
                : `${props.nom} — ${props.entites[0]?.regiment ?? ''}`
            }
            onClick={() => setSelectedCity(props)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedCity(props)
              }
            }}
          >
            {/* Zone tactile élargie (r=13). Les villes trop proches sont
               décalées via MARKER_OFFSETS pour que les cibles ne se
               chevauchent pas (cf. ligne de rappel vers le vrai point). */}
            <circle className="map-hit" cx={mx} cy={my} r={13} />
            <circle className="map-marker" cx={mx} cy={my} r={6} />
            <text
              className={`map-label${inInset ? ' map-label--inset' : ''}`}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              dominantBaseline={label.baseline}
            >
              {props.nom}
            </text>
          </g>
        ))}
      </svg>

      {selectedCity && (
        <CardDialog city={selectedCity} onClose={() => setSelectedCity(null)} />
      )}
    </div>
  )
}
