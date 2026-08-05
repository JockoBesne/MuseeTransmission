// CLI développeur : data-memorial/*.xlsx -> public/data/memorial/*.json
// (mêmes validation et tri que le serveur de la borne : server/memorial-import.mjs).
//
//   npm run import-memorial                     # les 5 catégories
//   node server/import-cli.mjs data-memorial/memorial-algerie.xlsx
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, analyseClasseur, versJson } from './memorial-import.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER_XLSX = path.join(RACINE, 'data-memorial')
const DOSSIER_JSON = path.join(RACINE, 'public', 'data', 'memorial')

const args = process.argv.slice(2)
const fichiers = args.length
  ? args
  : Object.keys(CATEGORIES).map((cat) => path.join(DOSSIER_XLSX, `memorial-${cat}.xlsx`))

let avertissementsTotal = 0
for (const fichier of fichiers) {
  const cat = path.basename(fichier, '.xlsx').replace(/^memorial-/, '')
  if (!(cat in CATEGORIES)) {
    console.error(
      `ERREUR : nom de fichier inattendu ${path.basename(fichier)} — attendus : ` +
        Object.keys(CATEGORIES).map((c) => `memorial-${c}.xlsx`).join(', '),
    )
    process.exit(2)
  }
  if (!existsSync(fichier)) {
    console.error(`ERREUR : fichier introuvable : ${fichier}`)
    process.exit(2)
  }
  const resultat = await analyseClasseur(await readFile(fichier), cat)
  if (!resultat.ok) {
    console.error(`ERREUR dans ${path.basename(fichier)} :`)
    for (const e of resultat.erreurs) console.error(`  ${e}`)
    process.exit(2)
  }
  for (const a of resultat.avertissements) console.log(`  AVERTISSEMENT ${path.basename(fichier)} — ${a}`)
  avertissementsTotal += resultat.avertissements.length
  await mkdir(DOSSIER_JSON, { recursive: true })
  const sortie = path.join(DOSSIER_JSON, `${cat}.json`)
  await writeFile(sortie, versJson(resultat.personnes), 'utf8')
  console.log(`  ${CATEGORIES[cat]} : ${resultat.nombre} personnes -> ${path.relative(RACINE, sortie)}`)
}
if (avertissementsTotal) {
  console.log(`\nTerminé avec ${avertissementsTotal} avertissement(s) — lignes à corriger dans l'Excel.`)
}
