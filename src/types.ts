/* Types partagés du domaine */

export type LabelDirection = 'top' | 'bottom' | 'left' | 'right'

/** Jalon de la frise chronologique (src/data/timeline.json). */
export interface TimelineEvent {
  /** Section d'ancrage (1ère GM, 2ème GM, Guerre du Golfe, OPEX…). */
  section: string
  annee: string
  titre: string
  texte: string
}

/** Propriétés d'une ville / régiment (properties d'une Feature GeoJSON Point). */
export interface City {
  nom: string
  regiment: string
  texte: string
  histoire: string
  specificite: string
  garnison: string
  photo?: string
  /** Description de la pucelle, affichée en légende dans le zoom photo. */
  photoDescription?: string
  labelDir?: LabelDirection
}
