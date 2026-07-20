import { useEffect, useState } from 'react'
import './Admin.css'

/** Code d'accès à l'administration — à changer ici et à communiquer au personnel. */
const ADMIN_PIN = '1205'

interface AdminPinProps {
  onValide: () => void
  onAnnule: () => void
}

/** Pavé numérique tactile demandé après l'appui long, avant le hub admin. */
export default function AdminPin({ onValide, onAnnule }: AdminPinProps) {
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState(false)

  // Validation automatique au dernier chiffre. Effectuée dans un effet (et la
  // saisie via mise à jour fonctionnelle) : des appuis très rapprochés ne
  // peuvent ni perdre de chiffre ni déclencher deux validations.
  useEffect(() => {
    if (saisie.length !== ADMIN_PIN.length) return
    if (saisie === ADMIN_PIN) {
      onValide()
    } else {
      setErreur(true)
      setSaisie('')
    }
  }, [saisie, onValide])

  function tape(chiffre: string) {
    setErreur(false)
    setSaisie(prev => (prev.length >= ADMIN_PIN.length ? prev : prev + chiffre))
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <span className="admin-kicker">Musée des Transmissions — accès personnel</span>
        <h1 className="admin-title">Code d'accès</h1>
      </header>

      <div className="admin-pin">
        <div className={`admin-pin-points${erreur ? ' admin-pin-points--erreur' : ''}`} aria-live="polite">
          {Array.from({ length: ADMIN_PIN.length }, (_, i) => (
            <span
              key={i}
              className={`admin-pin-point${i < saisie.length ? ' admin-pin-point--plein' : ''}`}
            />
          ))}
        </div>
        <p className="admin-pin-message">
          {erreur ? 'Code incorrect — réessayer.' : 'Saisir le code du personnel.'}
        </p>

        <div className="admin-pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(c => (
            <button key={c} type="button" className="admin-pin-touche" onClick={() => tape(c)}>
              {c}
            </button>
          ))}
          <button
            type="button"
            className="admin-pin-touche admin-pin-touche--secondaire"
            onClick={() => {
              setSaisie('')
              setErreur(false)
            }}
            aria-label="Effacer la saisie"
          >
            ⌫
          </button>
          <button type="button" className="admin-pin-touche" onClick={() => tape('0')}>
            0
          </button>
          <button
            type="button"
            className="admin-pin-touche admin-pin-touche--secondaire"
            onClick={onAnnule}
            aria-label="Annuler et revenir à l'affichage borne"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
