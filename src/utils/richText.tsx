import { Fragment, type ReactNode } from 'react'
import { formatOrdinals } from './ordinals'

// Marquage léger dans les données (villes.json) : `_mot_` → mis en italique
// (ex. emprunts à l'anglais, mise en valeur ponctuelle). Chaque segment de
// texte brut restant repasse par formatOrdinals, d'où le Fragment à clé
// dédiée : sans lui, les <sup> de plusieurs segments partageraient les
// mêmes clés (0, 1, 2…) au sein du même tableau de parts.
const ITALIC_RE = /_([^_]+)_/g

function formatItalics(text: string): ReactNode[] {
  ITALIC_RE.lastIndex = 0
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = ITALIC_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={`t${key}`}>{formatOrdinals(text.slice(lastIndex, match.index))}</Fragment>)
    }
    parts.push(<em key={`i${key}`}>{match[1]}</em>)
    key++
    lastIndex = ITALIC_RE.lastIndex
  }
  parts.push(<Fragment key={`t${key}`}>{formatOrdinals(text.slice(lastIndex))}</Fragment>)
  return parts
}

/** Enrobage JSX combinant italiques (`_mot_`) et ordinaux (28e, 1er…). */
export function RichText({ children }: { children: string }) {
  return <>{formatItalics(children)}</>
}
