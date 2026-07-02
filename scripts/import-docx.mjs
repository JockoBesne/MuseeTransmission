import mammoth from 'mammoth'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Mots qui débutent la section "rôle" (insensible à la casse)
const ROLE_KEYWORDS = new Set([
  'sapeur', 'soldat', 'caporal', 'sergent', 'adjudant', 'conducteur',
  'télégraphiste', 'telegraphiste', 'téléphoniste', 'telephoniste',
  'lieutenant', 'sous-lieutenant', 'médecin', 'medecin',
  'infirmier', 'maréchal', 'marechal', 'chef', 'brigadier', 'canonnier',
  'artilleur', 'cavalier', 'chasseur', 'fantassin', 'brancardier',
  'cycliste', 'tirailleur', 'zouave', 'pionnier', 'clairon', 'trompette',
  'cuirassier', 'hussard', 'dragon', 'spahi', 'goumier', 'ouvrier', 'pilote',
])

function isAllCaps(word) {
  const alpha = word.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (!alpha) return false
  return alpha === alpha.toUpperCase()
}

function parseEntry(raw) {
  // Nettoyer les tirets/points de fin issus du formatage Word
  raw = raw.replace(/\s*[–\-]+\.?\s*$/, '').replace(/\.\s*$/, '').trim()
  if (!raw) return null

  // Prendre la dernière année trouvée (ignore le texte parasite après)
  const yearMatches = [...raw.matchAll(/\b(19\d{2})\b/g)]
  if (!yearMatches.length) return null

  const lastYear = yearMatches[yearMatches.length - 1]
  const annee = lastYear[1]
  const beforeYear = raw.slice(0, lastYear.index).trim()
  const words = beforeYear.split(/\s+/).filter(Boolean)
  if (!words.length) return null

  // NOM = mots entièrement en majuscules au début
  let i = 0
  while (i < words.length && isAllCaps(words[i])) i++
  if (i === 0) return null

  const nom = words.slice(0, i).join(' ')
  const remaining = words.slice(i)

  // Le rôle commence au premier mot-clé de rôle ou au premier chiffre
  let roleStart = remaining.length
  for (let j = 0; j < remaining.length; j++) {
    const w = remaining[j]
    if (ROLE_KEYWORDS.has(w.toLowerCase()) || /^\d/.test(w)) {
      roleStart = j
      break
    }
  }

  const prenom = remaining.slice(0, roleStart).join(' ')
  const role = remaining.slice(roleStart).join(' ')

  return { nom, prenom, role, annee }
}

async function main() {
  const docxPath = resolve(ROOT, 'public/data/A.docx')
  console.log('Lecture du fichier :', docxPath)

  const result = await mammoth.extractRawText({ path: docxPath })
  const text = result.value

  const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean)

  const soldats = []
  let errors = 0

  for (const para of paragraphs) {
    // Ignorer les en-têtes de lettre (A, B, C…)
    if (/^[A-ZÀ-Ÿ]$/.test(para)) continue

    // Séparer les entrées par " - " ou " – "
    const parts = para.split(/\s[–\-]\s/)
    for (const part of parts) {
      const entry = parseEntry(part.trim())
      if (entry) {
        soldats.push(entry)
      } else if (part.trim().length > 2) {
        errors++
        console.warn('  Non parsé :', part.trim().slice(0, 80))
      }
    }
  }

  console.log(`\n✓ ${soldats.length} soldats extraits (${errors} entrées ignorées)`)

  const outPath = resolve(ROOT, 'src/data/memorial-1gm.json')
  writeFileSync(outPath, JSON.stringify(soldats, null, 2), 'utf8')
  console.log('✓ Fichier généré :', outPath)
}

main().catch(err => { console.error(err); process.exit(1) })
