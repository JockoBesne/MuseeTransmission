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
  x: number
  y: number
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

const cityPoints: CityPoint[] = villes.features.map((f) => {
  const [x, y] = project(f.geometry.coordinates)
  const props = f.properties
  return { x, y, props, label: labelLayout(x, y, props.labelDir ?? 'bottom') }
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

        {cityPoints.map(({ x, y, props, label }) => (
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
            {/* Zone tactile élargie : r=13 max, la paire la plus proche
               (Mutzig–Haguenau) est à 26,3 unités — pas de chevauchement. */}
            <circle className="map-hit" cx={x} cy={y} r={13} />
            <circle className="map-marker" cx={x} cy={y} r={6} />
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
