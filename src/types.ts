/* Types partagés du domaine */

export type LabelDirection = 'top' | 'bottom' | 'left' | 'right'

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
