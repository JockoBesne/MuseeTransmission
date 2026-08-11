/* Types partagés du domaine */

export type LabelDirection = 'top' | 'bottom' | 'left' | 'right'

/** Jalon de la frise chronologique (src/data/timeline.json). */
export interface TimelineEvent {
  /** Section d'ancrage (1ère GM, 2ème GM, Guerre du Golfe, OPEX…). */
  section: string
  annee: string
  titre: string
  /** Résumé affiché sur la carte de la frise. */
  texte: string
  /** Paragraphes du « En savoir plus », affichés dans la pop-up. */
  detail?: string[]
}

/** Média additionnel d'une unité (fichier local dans public/, hors-ligne strict). */
export interface UniteMedia {
  type: 'image' | 'video'
  src: string
  /** Légende : sous la vidéo, ou dans le zoom pour une image. */
  legende?: string
  /** Vignette affichée avant lecture (vidéos uniquement). */
  poster?: string
}

/** Unité implantée sur un site — une ville peut en accueillir plusieurs. */
export interface Unite {
  regiment: string
  /** Libellé court de l'onglet ; sinon déduit des parenthèses de `regiment`. */
  abrege?: string
  /** Devise de l'unité. */
  texte: string
  histoire: string
  specificite: string
  garnison: string
  photo?: string
  /** Description de la pucelle, affichée en légende dans le zoom photo. */
  photoDescription?: string
  medias?: UniteMedia[]
}

/** Propriétés d'une ville (properties d'une Feature GeoJSON Point). */
export interface City {
  nom: string
  labelDir?: LabelDirection
  entites: Unite[]
}

/** Traduction d'une unité (src/data/villes_en.json) : uniquement des champs
    de texte. villes.json reste seul maître de la structure de la carte —
    coordonnées, `labelDir`, pucelles et fichiers médias. Un champ absent
    laisse le texte français en place. */
export type UniteTraduite = Partial<
  Pick<
    Unite,
    'regiment' | 'abrege' | 'texte' | 'histoire' | 'specificite' | 'garnison' | 'photoDescription'
  >
> & {
  /** Légendes des `medias`, dans l'ordre de villes.json (null = non traduite). */
  legendes?: (string | null)[]
}

/** Traductions d'une ville : `entites` suit l'ordre des unités de villes.json
    (null ou entrée manquante = unité laissée en français). */
export interface VilleTraduite {
  entites: (UniteTraduite | null)[]
}

/** Calque de traduction de la carte, indexé par le `nom` des villes de
    villes.json (src/data/villes_en.json). */
export type VillesTraduction = Record<string, VilleTraduite>

/** Propriétés d'une zone de regroupement de la carte
    (src/data/regions-zones.json : délimitations régionales tactiles). */
export interface ZoneProps {
  code: string
  nom: string
}
