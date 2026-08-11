import type { ReactNode } from 'react'

/* Suffixes ordinaux français : 28e, 1er, 1re, 1ère, 2ème/2eme. Ordre important
   (les suffixes longs doivent être tentés avant "e"/"er" sous peine de coupe
   au milieu).

   Volontairement français seulement. Les ordinaux anglais (8th, 1st, 2nd, 3rd)
   ne sont PAS mis en exposant : contrairement au français, l'usage typographique
   anglais les écrit à la ligne (Chicago, AP). Ils traversent la fonction intacts,
   les deux jeux de suffixes étant disjoints — ne pas « corriger » en ajoutant
   th|st|nd|rd ici, ce serait une faute de composition en anglais. */
const ORDINAL_RE = /(\d+)(ère|ème|eme|er|re|e)\b/gi

/** Repère les ordinaux dans un texte et met leur suffixe en exposant. */
export function formatOrdinals(text: string): ReactNode[] {
  ORDINAL_RE.lastIndex = 0
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = ORDINAL_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(match[1])
    parts.push(<sup key={key++}>{match[2]}</sup>)
    lastIndex = ORDINAL_RE.lastIndex
  }
  parts.push(text.slice(lastIndex))
  return parts
}

/** Enrobage JSX : `<Ord>{"28e régiment"}</Ord>` → "28" + <sup>e</sup> + " régiment". */
export function Ord({ children }: { children: string }) {
  return <>{formatOrdinals(children)}</>
}
