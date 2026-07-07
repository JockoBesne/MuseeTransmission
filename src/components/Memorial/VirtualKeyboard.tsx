import './VirtualKeyboard.css'

/* Clavier virtuel AZERTY : la borne n'a pas de clavier physique.
   La logique de recherche reste dans Memorial — le clavier se contente
   de produire la prochaine valeur du champ via onChange. */

interface VirtualKeyboardProps {
  value: string
  onChange: (next: string) => void
  onClose: () => void
}

const ROWS: string[][] = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  ['W', 'X', 'C', 'V', 'B', 'N', 'É', 'È', 'À', 'Ç'],
]

export default function VirtualKeyboard({ value, onChange, onClose }: VirtualKeyboardProps) {
  return (
    <div className="virtual-keyboard" role="group" aria-label="Clavier virtuel">
      {ROWS.map((row) => (
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
          aria-label="Tiret"
        >
          -
        </button>
        <button
          type="button"
          className="vk-key vk-key--space"
          onClick={() => onChange(value + ' ')}
        >
          Espace
        </button>
        <button
          type="button"
          className="vk-key vk-key--wide"
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="Retour arrière"
        >
          ⌫
        </button>
        <button
          type="button"
          className="vk-key vk-key--close vk-key--wide"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
