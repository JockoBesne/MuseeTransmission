import { useId, type SVGProps } from 'react'

/* Drapeau du bouton de bascule de langue (App.tsx) : tricolore ou Union Jack.

   Le bouton affiche la langue **cible**, pas la langue courante : un panneau
   en français montre l'Union Jack. C'est une bascule directe, pas un menu —
   un contrôle doit annoncer ce qu'il va faire. Et celui qui a besoin de ce
   bouton est le visiteur étranger, planté devant un écran qu'il ne sait pas
   lire : le drapeau de sa langue lui saute aux yeux, celui de la langue
   courante ne lui apprendrait rien. Ne pas « corriger » en passant `lang`
   directement, ce serait inverser l'information.

   Tracé en SVG et non écrit en emoji : Windows, qui fait tourner la borne, ne
   fournit aucun glyphe de drapeau national (sa police Segoe UI Emoji n'en
   contient pas, par choix de Microsoft). Les caractères 🇫🇷 et 🇬🇧 y retombent
   sur leurs deux « indicateurs régionaux » et s'affichent « FR » et « GB ».
   Le piège est invisible en développement sous Linux, où Noto Color Emoji les
   dessine. Règle générale pour la borne : rien de visible à l'écran ne doit
   dépendre d'un glyphe fourni par le système. */

const FR = { bleu: '#002395', blanc: '#ffffff', rouge: '#ED2939' }
const UK = { bleu: '#012169', blanc: '#ffffff', rouge: '#C8102E' }

interface DrapeauProps extends Omit<SVGProps<SVGSVGElement>, 'lang'> {
  /** Langue du panneau : détermine le drapeau dessiné. */
  langue: 'fr' | 'en'
}

export default function Drapeau({ langue, ...props }: DrapeauProps) {
  /* Les deux panneaux affichent chacun un bouton : sans identifiant unique,
     leurs <clipPath> se marcheraient dessus dans le document. Les deux-points
     produits par useId sont retirés, ils ne passent pas dans un url(#...). */
  const uid = useId().replace(/:/g, '')
  const cadre = `drapeau-${uid}`

  return (
    <svg viewBox="0 0 24 16" width="1.5em" height="1em" aria-hidden="true" {...props}>
      <defs>
        <clipPath id={cadre}>
          <rect width="24" height="16" rx="2" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${cadre})`}>
        {langue === 'fr' ? (
          /* Proportions officielles du drapeau français (2:3) : trois bandes
             verticales d'égale largeur. */
          <>
            <rect width="8" height="16" fill={FR.bleu} />
            <rect x="8" width="8" height="16" fill={FR.blanc} />
            <rect x="16" width="8" height="16" fill={FR.rouge} />
          </>
        ) : (
          /* Union Jack ramené au même cadre 3:2 (le vrai est en 2:1, la
             différence ne se voit pas à cette taille). Ordre de tracé :
             fond bleu, croix de Saint-André en diagonale — blanche puis rouge
             par-dessus —, puis croix de Saint-Georges droite, blanche puis
             rouge. La croix de Saint-Patrick n'est pas décalée : à 24 px de
             large, le décalage se réduirait à un demi-pixel. */
          <>
            <rect width="24" height="16" fill={UK.bleu} />
            <path d="M0 0 L24 16 M24 0 L0 16" fill="none" stroke={UK.blanc} strokeWidth="3.4" />
            <path d="M0 0 L24 16 M24 0 L0 16" fill="none" stroke={UK.rouge} strokeWidth="1.3" />
            <path d="M12 0 V16 M0 8 H24" fill="none" stroke={UK.blanc} strokeWidth="5.4" />
            <path d="M12 0 V16 M0 8 H24" fill="none" stroke={UK.rouge} strokeWidth="3.2" />
          </>
        )}

        {/* Liseré sombre : détache le drapeau du fond translucide du bouton,
            dont le flou laisse passer le bleu nuit du panneau — sans lui, le
            blanc du tricolore flotte sans contour. */}
        <rect
          x="0.4"
          y="0.4"
          width="23.2"
          height="15.2"
          rx="1.8"
          fill="none"
          stroke="rgba(0, 0, 0, 0.35)"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  )
}
