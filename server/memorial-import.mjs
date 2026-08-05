// Validation et conversion d'un fichier Excel « propre » du Mémorial.
// Source de vérité UNIQUE de la règle de format (utilisée par le serveur de la
// borne et par le CLI d'import) : 1 feuille, 4 colonnes exactes
// (Nom, Prénom, Date de décès, Grade), Nom obligatoire, date JJ/MM/AAAA ou AAAA.
import ExcelJS from 'exceljs'

export const COLONNES = ['Nom', 'Prénom', 'Date de décès', 'Grade']

/* 5e colonne, dont l'intitulé et le rôle dépendent de la catégorie :
   - « Conflit » (Opex, obligatoire) : théâtre affiché à la suite du nom ;
   - « Section » (2GM, facultative)  : regroupe les entrées sous un intertitre
     (les radioamateurs 1939-1945, par exemple) ;
   - les autres catégories n'ont pas de 5e colonne. */
export const COLONNE_CONFLIT = 'Conflit'
export const COLONNE_SECTION = 'Section'

/** Intitulé attendu en colonne E, et caractère obligatoire, par catégorie. */
export const COLONNE5 = {
  opex: { entete: COLONNE_CONFLIT, champ: 'conflit', obligatoire: true },
  '2gm': { entete: COLONNE_SECTION, champ: 'section', obligatoire: false },
}

export const CATEGORIES = {
  '1gm': '1ère Guerre mondiale',
  'entre-deux-guerres': 'Entre-deux-guerres',
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
  const entete5 = texte(ws.getRow(1).getCell(5).value)
  // Colonne E attendue pour cette catégorie (aucune si la catégorie n'en prévoit pas).
  const regle5 = categorie ? COLONNE5[categorie] : null
  const entetesConnus = [COLONNE_CONFLIT, COLONNE_SECTION]
  const avecColonne5 = regle5 ? entete5 === regle5.entete : entetesConnus.includes(entete5)

  const enteteExces = texte(ws.getRow(1).getCell(6).value)
  if (enteteExces) {
    return {
      ok: false,
      erreurs: [
        `Trop de colonnes : « ${enteteExces} » trouvée en colonne F.`,
        `Le format accepte au maximum 5 colonnes : ${COLONNES.join(' | ')} | ${regle5?.entete ?? COLONNE_CONFLIT}.`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }
  if (entetes.join('|') !== COLONNES.join('|') || (entete5 && !avecColonne5)) {
    const attendu5 = regle5
      ? ` (+ « ${regle5.entete} » en colonne E)`
      : ` (aucune colonne E pour cette catégorie)`
    return {
      ok: false,
      erreurs: [
        'Les colonnes de la ligne 1 ne correspondent pas au format imposé.',
        `Attendu : ${COLONNES.join(' | ')}${attendu5}`,
        `Trouvé : ${[...entetes, entete5].map((e) => e || '(vide)').join(' | ')}`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }

  // Règle par catégorie : chaque registre a sa propre colonne E, ou aucune.
  if (regle5?.obligatoire && !avecColonne5) {
    return {
      ok: false,
      erreurs: [
        `La catégorie ${CATEGORIES[categorie]} utilise 5 colonnes : ${COLONNES.join(' | ')} | ${regle5.entete}.`,
        `La colonne E « ${regle5.entete} » (théâtre d'opération : Tchad, Ex-Yougoslavie…) manque dans ce fichier.`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }
  if (categorie && !regle5 && entete5) {
    return {
      ok: false,
      erreurs: [
        `La colonne « ${entete5} » n'est pas prévue pour la catégorie ${CATEGORIES[categorie] ?? categorie}.`,
        `Ce registre doit avoir exactement 4 colonnes : ${COLONNES.join(' | ')}.`,
      ],
      avertissements: [],
      personnes: [],
      nombre: 0,
    }
  }
  const champ5 = regle5?.champ ?? (entete5 === COLONNE_SECTION ? 'section' : 'conflit')

  const personnes = []
  const avertissements = []
  ws.eachRow((row, numero) => {
    if (numero === 1) return
    const [nom, prenom, dateBrute, grade] = [1, 2, 3, 4].map((c) => texte(row.getCell(c).value))
    const valeur5 = avecColonne5 ? texte(row.getCell(5).value) : ''
    if (!nom && !prenom && !dateBrute && !grade && !valeur5) return // ligne vide
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
    personnes.push({
      nom: nom.toLocaleUpperCase('fr'), prenom, role: grade, annee, date,
      conflit: champ5 === 'conflit' ? valeur5 : '',
      section: champ5 === 'section' ? valeur5 : '',
    })
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

  // Tri : les entrées sans section d'abord (chaîne vide en tête), puis chaque
  // section regroupée, et à l'intérieur un ordre alphabétique nom puis prénom.
  const cle = (s) => (s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  personnes.sort((a, b) =>
    cle(a.section).localeCompare(cle(b.section)) ||
    cle(a.nom).localeCompare(cle(b.nom)) ||
    cle(a.prenom).localeCompare(cle(b.prenom)))

  return { ok: true, erreurs: [], avertissements, personnes, nombre: personnes.length }
}

/** Sérialisation JSON identique pour le CLI et le serveur. */
export function versJson(personnes) {
  return JSON.stringify(personnes, null, 1) + '\n'
}
