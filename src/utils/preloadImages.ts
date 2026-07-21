import type { FeatureCollection, Point } from 'geojson'
import villesData from '../data/villes.json'
import type { City } from '../types'

const villes = villesData as FeatureCollection<Point, City>

let done = false

/** Précharge toutes les images des fiches (pucelles, galeries, vignettes)
    dans le cache du navigateur, pour que les pop-ups s'ouvrent sans délai
    de chargement. Borne hors-ligne : fichiers locaux, quelques Mo au total.
    Idempotent (garde `done`) : un seul passage par session. */
export function preloadCardImages() {
  if (done) return
  done = true
  const urls = new Set<string>()
  for (const f of villes.features) {
    for (const u of f.properties.entites) {
      if (u.photo) urls.add(u.photo)
      for (const m of u.medias ?? []) {
        if (m.type === 'image') urls.add(m.src)
        if (m.poster) urls.add(m.poster)
      }
    }
  }
  for (const src of urls) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
  }
}
