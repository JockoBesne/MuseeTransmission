import { useEffect, useId, useRef } from 'react'
import type { TimelineEvent } from '../../types'
import { Ord } from '../../utils/ordinals'
import './TimelineDialog.css'

/* Borne en libre accès : si le visiteur part sans fermer, la modale
   se referme seule et la frise reprend son défilement. */
const AUTO_CLOSE_MS = 3 * 60 * 1000

interface TimelineDialogProps {
  event: TimelineEvent
  prevEvent: TimelineEvent
  nextEvent: TimelineEvent
  /** Change à chaque navigation : rejoue l'animation d'entrée du contenu. */
  contentKey: number
  /** Position chronologique (0 à 1) : remplit la barre sous le titre. */
  progress: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

export function TimelineDialog({
  event,
  prevEvent,
  nextEvent,
  contentKey,
  progress,
  onPrev,
  onNext,
  onClose,
}: TimelineDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  useEffect(() => {
    let timer = setTimeout(onClose, AUTO_CLOSE_MS)
    function reset() {
      clearTimeout(timer)
      timer = setTimeout(onClose, AUTO_CLOSE_MS)
    }
    window.addEventListener('pointerdown', reset, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', reset)
    }
  }, [onClose])

  return (
    <div className="tl-dialog-overlay" onClick={onClose}>
      <div
        className="tl-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Motif décoratif : ondes radio concentriques */}
        <span className="tl-dialog-waves" aria-hidden="true" />

        <button ref={closeRef} className="tl-dialog-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>

        <div className="tl-dialog-content" key={contentKey}>
          <span className="tl-dialog-year">{event.annee}</span>
          <h3
            id={titleId}
            className="tl-dialog-title"
            style={{ '--tl-progress': `${progress * 100}%` } as React.CSSProperties}
          >
            <Ord>{event.titre}</Ord>
          </h3>
          <p className="tl-dialog-text"><Ord>{event.texte}</Ord></p>
          <p className="tl-dialog-hint">Toucher en dehors de la fenêtre pour fermer</p>
        </div>

        <footer className="tl-dialog-nav">
          <button className="tl-dialog-nav-btn" onClick={onPrev}>
            <span className="tl-dialog-nav-arrow" aria-hidden="true">‹</span>
            <span className="tl-dialog-nav-info">
              <small>Précédent</small>
              <strong>{prevEvent.annee}</strong>
            </span>
          </button>
          <span className="tl-dialog-nav-sep" aria-hidden="true" />
          <button className="tl-dialog-nav-btn tl-dialog-nav-btn--next" onClick={onNext}>
            <span className="tl-dialog-nav-info">
              <small>Suivant</small>
              <strong>{nextEvent.annee}</strong>
            </span>
            <span className="tl-dialog-nav-arrow" aria-hidden="true">›</span>
          </button>
        </footer>
      </div>
    </div>
  )
}
