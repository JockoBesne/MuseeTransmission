// Validation et conversion d'un fichier Excel « propre » du Mémorial.
// Source de vérité UNIQUE de la règle de format (utilisée par le serveur de la
// borne et par le CLI d'import) : 1 feuille, 4 colonnes exactes
// (Nom, Prénom, Date de décès, Grade), Nom obligatoire, date JJ/MM/AAAA ou AAAA.
import ExcelJS from 'exceljs'

export const COLONNES = ['Nom', 'Prénom', 'Date de décès', 'Grade']
// 5e colonne facultative (utilisée par l'Opex) : théâtre affiché sous le nom.
export const COLONNE_CONFLIT = 'Conflit'

export const CATEGORIES = {
  '1gm': '1ère Guerre mondiale',
  '2gm': '2ème Guerre mondiale',
  indochine: 'Indochine',
  algerie: 'Algérie',
  opex: 'Opex',
}

const RE_DATE = /^(?:(\d{2})\/(\d{2})\/(\d{4})|(\d{4}))$/

/** Valeur de cellule exceljs -> texte épuré. */
function texte(v) {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    const jj = String(v.getUTCDate()).padStart(2, '0')
    const mm = String(v.getUTCMonth() + 1).padStart(2, '0')
    return `${jj}/${mm}/${v.getUTCFullYear()}`
  }
  if (typeof v === 'object') {
    // Cellules « richText », formules, hyperliens… -> texte brut.
    if ('richText' in v) return v.richText.map((r) => r.text).join('').trim()
    if ('text' in v) return String(v.text).trim()
    if ('result' in v) return texte(v.result)
    return ''
  }
  return String(v).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Analyse un classeur (Buffer/ArrayBuffer) et renvoie :
 * { ok, erreurs[], avertissements[], personnes[], nombre }
 * `ok === false` : structure invalide (mauvais type de fichier ou colonnes),
 * aucune donnée exploitable. Les avertissements, eux, n'empêchent pas l'import.
 *
 * `categorie` (clé de CATEGORIES) déclenche la règle stricte des colonnes :
 * « opex » exige la 5e colonne Conflit, les autres catégories l'interdisent
 * (4 colonnes exactement). Sans catégorie, la colonne reste simplement optionnelle.
 */
export async function analyseClasseur(buffer, categorie) {
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer)
  } catch {
    return {
      ok: false,
      erreurs: ["Ce fichier n'est pas un classeur Excel (.xlsx) lisible."],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }

  const ws = wb.worksheets[0]
  if (!ws) {
    return { ok: false, erreurs: ['Le classeur ne contient aucune feuille.'], avertissements: [], personnes: [], nombre: 0 }
  }

  const entetes = [1, 2, 3, 4].map((c) => texte(ws.getRow(1).getCell(c).value))
  const enteteConflit = texte(ws.getRow(1).getCell(5).value)
  const avecConflit = enteteConflit === COLONNE_CONFLIT
  const enteteExces = texte(ws.getRow(1).getCell(6).value)
  if (enteteExces) {
    return {
      ok: false,
      erreurs: [
        `Trop de colonnes : « ${enteteExces} » trouvée en colonne F.`,
        `Le format accepte au maximum 5 colonnes : ${COLONNES.join(' | ')} | ${COLONNE_CONFLIT}.`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }
  if (entetes.join('|') !== COLONNES.join('|') || (enteteConflit && !avecConflit)) {
    return {
      ok: false,
      erreurs: [
        'Les colonnes de la ligne 1 ne correspondent pas au format imposé.',
        `Attendu : ${COLONNES.join(' | ')} (+ « ${COLONNE_CONFLIT} » en colonne E, réservée à l'Opex)`,
        `Trouvé : ${[...entetes, enteteConflit].map((e) => e || '(vide)').join(' | ')}`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }

  // Règle par catégorie : la colonne Conflit appartient à l'Opex, et à lui seul.
  if (categorie === 'opex' && !avecConflit) {
    return {
      ok: false,
      erreurs: [
        `La catégorie Opex utilise 5 colonnes : ${COLONNES.join(' | ')} | ${COLONNE_CONFLIT}.`,
        `La colonne E « ${COLONNE_CONFLIT} » (théâtre d'opération : Tchad, Ex-Yougoslavie…) manque dans ce fichier.`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }
  if (categorie && categorie !== 'opex' && avecConflit) {
    return {
      ok: false,
      erreurs: [
        `La colonne « ${COLONNE_CONFLIT} » est réservée à la catégorie Opex.`,
        `Pour ${CATEGORIES[categorie] ?? categorie}, le fichier doit avoir exactement 4 colonnes : ${COLONNES.join(' | ')}.`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }

  const personnes = []
  const avertissements = []
  ws.eachRow((row, numero) => {
    if (numero === 1) return
    const [nom, prenom, dateBrute, grade] = [1, 2, 3, 4].map((c) => texte(row.getCell(c).value))
    const conflit = avecConflit ? texte(row.getCell(5).value) : ''
    if (!nom && !prenom && !dateBrute && !grade && !conflit) return // ligne vide
    if (!nom) {
      avertissements.push(`ligne ${numero} : Nom manquant — ligne ignorée`)
      return
    }
    let date = dateBrute
    let annee = ''
    if (date) {
      const m = RE_DATE.exec(date)
      if (m) {
        annee = m[3] ?? m[4]
      } else {
        avertissements.push(
          `ligne ${numero} (${nom}) : date invalide « ${date} » (attendu JJ/MM/AAAA ou AAAA) — date laissée vide`,
        )
        date = ''
      }
    }
    personnes.push({ nom: nom.toLocaleUpperCase('fr'), prenom, role: grade, annee, date, conflit })
  })

  // Garde-fou : un fichier sans aucun nom valide effacerait toute la liste —
  // c'est presque à coup sûr une erreur de manipulation, on refuse.
  if (personnes.length === 0) {
    return {
      ok: false,
      erreurs: [
        'Aucun nom valide trouvé dans le fichier — import refusé.',
        'Le fichier doit contenir la liste complète de la catégorie (au moins une ligne de données sous les en-têtes).',
      ],
      avertissements,
      personnes: [],
      nombre: 0,
    }
  }

  const cle = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  personnes.sort((a, b) => cle(a.nom).localeCompare(cle(b.nom)) || cle(a.prenom).localeCompare(cle(b.prenom)))

  return { ok: true, erreurs: [], avertissements, personnes, nombre: personnes.length }
}

/** Sérialisation JSON identique pour le CLI et le serveur. */
export function versJson(personnes) {
  return JSON.stringify(personnes, null, 1) + '\n'
}
