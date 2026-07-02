import { useEffect, useId, useRef, useState } from 'react'
import type { City } from '../../types'
import './CardDialog.css'

interface CardDialogProps {
  city: City
  onClose: () => void
}

export function CardDialog({ city, onClose }: CardDialogProps) {
  const { regiment, texte, histoire, specificite, garnison, photo } = city
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const photoBtnRef = useRef<HTMLButtonElement>(null)
  const zoomCloseRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const [zoomed, setZoomed] = useState(false)
  // Miroir de l'état pour le gestionnaire clavier (évite une closure périmée).
  const zoomedRef = useRef(false)
  zoomedRef.current = zoomed

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        // Échap ferme d'abord le zoom, sinon la modale.
        if (zoomedRef.current) setZoomed(false)
        else onClose()
        return
      }
      if (e.key === 'Tab' && !zoomedRef.current && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  // Déplace le focus vers/depuis le lightbox (en ignorant le montage initial).
  const zoomMounted = useRef(false)
  useEffect(() => {
    if (!zoomMounted.current) {
      zoomMounted.current = true
      return
    }
    if (zoomed) zoomCloseRef.current?.focus()
    else photoBtnRef.current?.focus()
  }, [zoomed])

  return (
    <>
      <div className="card-overlay" onClick={onClose}>
        <div
          className="card"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="card-header">
            <div className="card-header-text">
              <h3 id={titleId}>{regiment}</h3>
              <span className="card-subtitle">{texte}</span>
            </div>
            <button ref={closeRef} className="card-close" onClick={onClose} aria-label="Fermer">✕</button>
          </div>

          <div className="card-body">
            <div className="card-media-col">
              {photo ? (
                <button
                  type="button"
                  ref={photoBtnRef}
                  className="card-photo card-photo--zoomable"
                  onClick={() => setZoomed(true)}
                  aria-label={`Agrandir la pucelle du ${regiment}`}
                >
                  <img src={photo} alt={`Pucelle du ${regiment}`} />
                </button>
              ) : (
                <div className="card-photo">
                  <span>Photo</span>
                </div>
              )}
              <p className="card-geo">📍 {garnison}</p>
            </div>

            <div className="card-section card-histoire">
              <h4>Histoire</h4>
              <p>{histoire}</p>
            </div>

            <div className="card-section card-specificite">
              <h4>Spécificité</h4>
              <p>{specificite}</p>
            </div>
          </div>
        </div>
      </div>

      {zoomed && photo && (
        <div
          className="photo-zoom-overlay"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Pucelle du ${regiment} agrandie`}
        >
          <button
            ref={zoomCloseRef}
            className="photo-zoom-close"
            onClick={() => setZoomed(false)}
            aria-label="Fermer l'agrandissement"
          >
            ✕
          </button>
          <img
            className="photo-zoom-img"
            src={photo}
            alt={`Pucelle du ${regiment}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
