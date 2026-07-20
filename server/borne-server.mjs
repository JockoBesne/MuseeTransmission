// Serveur local de la borne (100 % hors-ligne : n'écoute que sur la machine).
//
//   npm run borne          # sert dist/ sur http://localhost:3210 + API mémorial
//
// Rôles :
//   1. Servir l'application construite (dist/).
//   2. Servir les données du Mémorial (/data/memorial/*.json) en privilégiant
//      la version « borne-data » écrite par l'écran d'administration ; à défaut,
//      la version embarquée dans le build.
//   3. API de l'écran d'administration :
//        POST /api/memorial/validate      corps = .xlsx -> analyse sans rien écrire
//        PUT  /api/memorial/<categorie>   corps = .xlsx -> écrit JSON + copie Excel
//
// Les fichiers déposés sont archivés renommés dans borne-data/uploads/
// (memorial-<categorie>.xlsx) : c'est la sauvegarde à récupérer pour
// resynchroniser data-memorial/ du dépôt.
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, analyseClasseur, versJson } from './memorial-import.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(RACINE, 'dist')
const DONNEES = process.env.BORNE_DATA ?? path.join(RACINE, 'borne-data')
const PORT = Number(process.env.PORT ?? 3210)
const TAILLE_MAX = 20 * 1024 * 1024 // 20 Mo

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

function json(res, code, corps) {
  const donnees = JSON.stringify(corps)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(donnees)
}

function litCorps(req) {
  return new Promise((resolve, reject) => {
    const morceaux = []
    let taille = 0
    req.on('data', (chunk) => {
      taille += chunk.length
      if (taille > TAILLE_MAX) {
        reject(new Error('fichier trop volumineux (20 Mo max)'))
        req.destroy()
        return
      }
      morceaux.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(morceaux)))
    req.on('error', reject)
  })
}

async function sertFichier(res, chemin, cache) {
  try {
    const contenu = await readFile(chemin)
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(chemin).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': cache,
    })
    res.end(contenu)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Introuvable')
  }
}

const serveur = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const chemin = decodeURIComponent(url.pathname)

  try {
    // ── API admin ──
    if (req.method === 'POST' && chemin === '/api/memorial/validate') {
      const resultat = await analyseClasseur(await litCorps(req))
      // L'aperçu suffit à l'écran d'admin ; inutile de renvoyer 1 700 fiches.
      json(res, 200, { ...resultat, personnes: undefined, apercu: resultat.personnes.slice(0, 12) })
      return
    }

    const commit = chemin.match(/^\/api\/memorial\/([a-z0-9]+)$/)
    if (req.method === 'PUT' && commit) {
      const cat = commit[1]
      if (!(cat in CATEGORIES)) {
        json(res, 404, { ok: false, erreurs: [`Catégorie inconnue : ${cat}`] })
        return
      }
      const corps = await litCorps(req)
      const resultat = await analyseClasseur(corps)
      if (!resultat.ok) {
        json(res, 422, { ok: false, erreurs: resultat.erreurs })
        return
      }
      await mkdir(path.join(DONNEES, 'data', 'memorial'), { recursive: true })
      await mkdir(path.join(DONNEES, 'uploads'), { recursive: true })
      await writeFile(path.join(DONNEES, 'data', 'memorial', `${cat}.json`), versJson(resultat.personnes), 'utf8')
      // Copie du fichier déposé, renommée au nom canonique de la catégorie.
      await writeFile(path.join(DONNEES, 'uploads', `memorial-${cat}.xlsx`), corps)
      console.log(`[borne] ${new Date().toISOString()} ${CATEGORIES[cat]} remplacé : ${resultat.nombre} personnes`)
      json(res, 200, { ok: true, nombre: resultat.nombre, avertissements: resultat.avertissements })
      return
    }

    // ── Données mémorial : version admin d'abord, sinon celle du build ──
    if (req.method === 'GET' && chemin.startsWith('/data/memorial/')) {
      const nom = path.basename(chemin)
      const surcharge = path.join(DONNEES, 'data', 'memorial', nom)
      await sertFichier(res, existsSync(surcharge) ? surcharge : path.join(DIST, 'data', 'memorial', nom), 'no-store')
      return
    }

    // ── Statique (dist/) ──
    if (req.method === 'GET') {
      const relatif = chemin === '/' ? 'index.html' : chemin.slice(1)
      const cible = path.normalize(path.join(DIST, relatif))
      if (!cible.startsWith(DIST)) {
        res.writeHead(403).end()
        return
      }
      await sertFichier(res, cible, chemin === '/' ? 'no-store' : 'public, max-age=3600')
      return
    }

    res.writeHead(405).end()
  } catch (e) {
    json(res, 500, { ok: false, erreurs: [String(e.message ?? e)] })
  }
})

serveur.listen(PORT, () => {
  console.log(`[borne] Application : http://localhost:${PORT}`)
  console.log(`[borne] Données admin : ${DONNEES}`)
  if (!existsSync(DIST)) console.warn('[borne] ATTENTION : dist/ absent — lancer « npm run build » d\'abord.')
})
