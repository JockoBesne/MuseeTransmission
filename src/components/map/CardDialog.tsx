import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { City, Unite } from '../../types'
import { Ord } from '../../utils/ordinals'
import './CardDialog.css'

interface CardDialogProps {
  city: City
  onClose: () => void
}

/** Média affiché en grand dans le lightbox (pucelle ou image de la galerie). */
interface ZoomMedia {
  src: string
  alt: string
  titre: string
  legende?: string
}

/** Libellé court d'un onglet : `abrege`, sinon le sigle entre parenthèses. */
function shortName(unit: Unite): string {
  if (unit.abrege) return unit.abrege
  const sigle = unit.regiment.match(/\(([^)]+)\)/)
  return sigle ? sigle[1] : unit.regiment
}

export function CardDialog({ city, onClose }: CardDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const zoomCloseRef = useRef<HTMLButtonElement>(null)
  // Élément qui a ouvert le lightbox, pour lui rendre le focus à la fermeture.
  const zoomTriggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const [activeIndex, setActiveIndex] = useState(0)
  const [zoom, setZoom] = useState<ZoomMedia | null>(null)
  // Miroir de l'état pour le gestionnaire clavier (évite une closure périmée).
  const zoomRef = useRef<ZoomMedia | null>(null)
  zoomRef.current = zoom

  // Indicateur « contenu au-delà du bord bas » du corps défilant.
  const [canScrollDown, setCanScrollDown] = useState(false)

  const unit = city.entites[activeIndex] ?? city.entites[0]

  const updateScrollCue = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 16)
  }, [])

  // Au changement d'unité : retour en haut du corps, recalcul de l'indicateur.
  // Le ResizeObserver suit les chargements d'images/vidéos qui allongent le contenu.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = 0
    updateScrollCue()
    const observer = new ResizeObserver(updateScrollCue)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [activeIndex, updateScrollCue])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        // Échap ferme d'abord le lightbox, sinon la modale.
        if (zoomRef.current) setZoom(null)
        else onClose()
        return
      }
      if (e.key === 'Tab' && !zoomRef.current && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])',
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
    if (zoom) zoomCloseRef.current?.focus()
    else zoomTriggerRef.current?.focus?.()
  }, [zoom])

  function openZoom(media: ZoomMedia) {
    zoomTriggerRef.current = document.activeElement as HTMLElement | null
    setZoom(media)
  }

  function scrollDown() {
    const el = bodyRef.current
    if (!el) return
    el.scrollBy({ top: el.clientHeight * 0.7, behavior: 'smooth' })
  }

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
          {/* En-tête : ville + onglets d'unités (l'onglet rempli = fiche affichée). */}
          <div className="card-header">
            <span className="card-kicker">{city.nom}</span>
            <nav className="card-tabs" aria-label="Unités présentes sur ce site">
              {city.entites.map((entite, i) => (
                <button
                  key={entite.regiment}
                  type="button"
                  className={`card-tab${i === activeIndex ? ' card-tab--active' : ''}`}
                  aria-pressed={i === activeIndex}
                  onClick={() => setActiveIndex(i)}
                >
                  {entite.photo && <img className="card-tab-insigne" src={entite.photo} alt="" />}
                  <span className="card-tab-label"><Ord>{shortName(entite)}</Ord></span>
                </button>
              ))}
            </nav>
            <button ref={closeRef} className="card-close" onClick={onClose} aria-label="Fermer">✕</button>
          </div>

          <div className="card-body" ref={bodyRef} onScroll={updateScrollCue}>
            {/* key={activeIndex} : remonte le contenu au changement d'unité
               (et décharge donc les vidéos en cours de lecture). */}
            <div className="card-content" key={activeIndex}>
              <div className="card-title-block">
                <h3 id={titleId}><Ord>{unit.regiment}</Ord></h3>
                <span className="card-subtitle"><Ord>{unit.texte}</Ord></span>
              </div>

              <div className="card-intro">
                <div className="card-section card-histoire">
                  <h4>Histoire</h4>
                  <p><Ord>{unit.histoire}</Ord></p>
                </div>

                <div className="card-media-col">
                  {unit.photo ? (
                    <button
                      type="button"
                      className="card-photo card-photo--zoomable"
                      onClick={() =>
                        openZoom({
                          src: unit.photo!,
                          alt: `Pucelle du ${unit.regiment}`,
                          titre: unit.regiment,
                          legende: unit.photoDescription,
                        })
                      }
                      aria-label={`Agrandir la pucelle du ${unit.regiment}`}
                    >
                      <img src={unit.photo} alt={`Pucelle du ${unit.regiment}`} />
                    </button>
                  ) : (
                    <div className="card-photo">
                      <span>Photo</span>
                    </div>
                  )}
                  <p className="card-geo">
                    <span className="card-geo-label">Garnison</span>
                    {unit.garnison}
                  </p>
                </div>
              </div>

              <div className="card-section card-specificite">
                <h4>Spécificité</h4>
                <p><Ord>{unit.specificite}</Ord></p>
              </div>

              {unit.medias && unit.medias.length > 0 && (
                <div className="card-section card-galerie">
                  <h4>Galerie</h4>
                  <div className="card-gallery">
                    {unit.medias.map((media, i) =>
                      media.type === 'video' ? (
                        <figure key={`${media.src}-${i}`} className="card-gallery-video">
                          <video
                            src={media.src}
                            poster={media.poster}
                            controls
                            playsInline
                            preload="metadata"
                          />
                          {media.legende && (
                            <figcaption><Ord>{media.legende}</Ord></figcaption>
                          )}
                        </figure>
                      ) : (
                        <button
                          key={`${media.src}-${i}`}
                          type="button"
                          className="card-gallery-item"
                          onClick={() =>
                            openZoom({
                              src: media.src,
                              alt: media.legende ?? `Image du ${unit.regiment}`,
                              titre: unit.regiment,
                              legende: media.legende,
                            })
                          }
                          aria-label={
                            media.legende ? `Agrandir : ${media.legende}` : "Agrandir l'image"
                          }
                        >
                          <img src={media.src} alt={media.legende ?? ''} loading="lazy" />
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {canScrollDown && (
            <div className="card-more">
              <div className="card-more-fade" aria-hidden="true" />
              <button
                type="button"
                className="card-more-btn"
                onClick={scrollDown}
                aria-label="Faire défiler le contenu vers le bas"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    d="M4 8l8 8 8-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {zoom && (
        <div
          className="photo-zoom-overlay"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${zoom.alt} — agrandissement`}
        >
          <button
            ref={zoomCloseRef}
            className="photo-zoom-close"
            onClick={() => setZoom(null)}
            aria-label="Fermer l'agrandissement"
          >
            ✕
          </button>
          <figure
            className="photo-zoom-figure"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <img className="photo-zoom-img" src={zoom.src} alt={zoom.alt} />
            {zoom.legende && (
              <figcaption className="photo-zoom-caption">
                <span className="photo-zoom-caption-title"><Ord>{zoom.titre}</Ord></span>
                <p><Ord>{zoom.legende}</Ord></p>
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  )
}
