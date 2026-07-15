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
  mx: number // position affichée du marqueur (décalée si désencombrement)
  my: number
  displaced: boolean
  props: City
  label: { x: number; y: number; anchor: TextAnchor; baseline: Baseline }
}

const LABEL_GAP = 10

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

/* ── Désencombrement des marqueurs trop proches ──
   Certaines villes sont géographiquement si proches que leurs cibles tactiles
   se chevaucheraient (Île-de-France, Alsace, Issoire/Clermont). On décale alors
   le marqueur vers une zone libre (dx/dy en unités SVG) et on trace une ligne
   de rappel jusqu'au vrai point géographique. `labelDir` optionnel repositionne
   l'étiquette autour du marqueur décalé (sinon celui de villes.json). */
const MARKER_OFFSETS: Record<string, { dx: number; dy: number; labelDir?: LabelDirection }> = {
  Paris: { dx: 0, dy: 0, labelDir: 'top' }, // libère le bas pour les rappels franciliens
  Versailles: { dx: -80, dy: 4, labelDir: 'bottom' },
  Arcueil: { dx: 45, dy: 29, labelDir: 'right' },
  Montlhéry: { dx: 0, dy: 56, labelDir: 'bottom' },
  Mutzig: { dx: -43, dy: 35, labelDir: 'bottom' },
  Haguenau: { dx: 0, dy: -30, labelDir: 'right' },
  Issoire: { dx: 0, dy: 20, labelDir: 'bottom' },
}

const cityPoints: CityPoint[] = villes.features.map((f) => {
  const [x, y] = project(f.geometry.coordinates)
  const props = f.properties
  const off = MARKER_OFFSETS[props.nom]
  const mx = x + (off?.dx ?? 0)
  const my = y + (off?.dy ?? 0)
  const dir = off?.labelDir ?? props.labelDir ?? 'bottom'
  return {
    x,
    y,
    mx,
    my,
    displaced: !!off && (off.dx !== 0 || off.dy !== 0),
    props,
    label: labelLayout(mx, my, dir),
  }
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
          <h2 className="map-title-main">Régiments de transmission</h2>
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

        {cityPoints.map(({ mx, my, props, label }) => (
          <g
            key={props.nom}
            className="map-city"
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
              className="map-label"
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
