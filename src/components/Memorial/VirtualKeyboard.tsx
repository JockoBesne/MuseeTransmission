import './VirtualKeyboard.css'

/* Clavier virtuel AZERTY : la borne n'a pas de clavier physique.
   La logique de recherche reste dans Memorial — le clavier se contente
   de produire la prochaine valeur du champ via onChange. */

interface VirtualKeyboardProps {
  value: string
  onChange: (next: string) => void
  onClose: () => void
  /** Langue : pilote la disposition (AZERTY / QWERTY) et les libellés. */
  lang: 'fr' | 'en'
}

/* Trois rangées de 10 touches dans les deux dispositions : la grille CSS reste
   identique. Le M est donc gardé en fin de 2e rangée même en QWERTY (où il est
   normalement en 3e), ce qui libère la place des voyelles accentuées — les noms
   du mémorial sont français, un visiteur anglophone doit pouvoir les saisir.
   La recherche neutralise de toute façon les accents (cleRecherche). */
const ROWS: Record<'fr' | 'en', string[][]> = {
  fr: [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['W', 'X', 'C', 'V', 'B', 'N', 'É', 'È', 'À', 'Ç'],
  ],
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'É', 'È', 'À', 'Ç'],
  ],
}

const STRINGS = {
  fr: {
    clavier: 'Clavier virtuel',
    tiret: 'Tiret',
    espace: 'Espace',
    retourArriere: 'Retour arrière',
    fermer: 'Fermer',
  },
  en: {
    clavier: 'Virtual keyboard',
    tiret: 'Hyphen',
    espace: 'Space',
    retourArriere: 'Backspace',
    fermer: 'Close',
  },
} as const

export default function VirtualKeyboard({ value, onChange, onClose, lang }: VirtualKeyboardProps) {
  const t = STRINGS[lang]
  const rows = ROWS[lang]
  return (
    <div className="virtual-keyboard" role="group" aria-label={t.clavier}>
      {rows.map((row) => (
        <div key={row[0]} className="vk-row">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className="vk-key"
              onClick={() => onChange(value + key)}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="vk-row">
        <button
          type="button"
          className="vk-key"
          onClick={() => onChange(value + '-')}
          aria-label={t.tiret}
        >
          -
        </button>
        <button
          type="button"
          className="vk-key vk-key--space"
          onClick={() => onChange(value + ' ')}
        >
          {t.espace}
        </button>
        <button
          type="button"
          className="vk-key vk-key--wide"
          onClick={() => onChange(value.slice(0, -1))}
          aria-label={t.retourArriere}
        >
          ⌫
        </button>
        <button
          type="button"
          className="vk-key vk-key--close vk-key--wide"
          onClick={onClose}
        >
          {t.fermer}
        </button>
      </div>
    </div>
  )
}
