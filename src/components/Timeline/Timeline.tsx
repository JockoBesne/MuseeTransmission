import { useEffect, useRef, useState, useCallback } from 'react'
import timelineData from '../../data/timeline.json'
import type { TimelineEvent } from '../../types'
import { Ord } from '../../utils/ordinals'
import { TimelineDialog } from './TimelineDialog'
import './Timeline.css'

const EVENTS = timelineData as TimelineEvent[]

/* Sections d'ancrage dérivées des données : nom + index du premier jalon.
   Elles ne découpent pas la frise, elles servent uniquement de repères. */
const SECTIONS = EVENTS.reduce<{ nom: string; start: number }[]>((acc, e, i) => {
  if (acc.length === 0 || acc[acc.length - 1].nom !== e.section) {
    acc.push({ nom: e.section, start: i })
  }
  return acc
}, [])

const VISIBLE_COUNT = 4      // jalons visibles simultanément
const SCROLL_SPEED = 22      // px/s de défilement automatique
const RESUME_DELAY_MS = 4000 // reprise du défilement après le dernier toucher
const JUMP_MS = 900          // durée du saut animé vers une section

/* Un « jalon » de blanc supplémentaire est inséré à la fin de chaque copie :
   sans lui, la frise enchaîne 2020 → 1875 sans transition visible, ce qui
   ressemble à une erreur. Il occupe un slot entier (même hauteur qu'un
   événement) pour que les calculs de défilement restent uniformes. */
const LOOP_LEN = EVENTS.length + 1

/* Classe posée/retirée par l'IntersectionObserver pour déclencher les
   animations d'entrée (manipulation directe du DOM : pas de re-render
   React à chaque frame de défilement). */
const IN_CLASS = 'tl-event--in'

export default function Timeline() {
  const [activeSection, setActiveSection] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [indexOpen, setIndexOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const rafRef = useRef(0)
  const lastTsRef = useRef(0)
  const posRef = useRef(0)
  const pausedRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const jumpRef = useRef<{ from: number; to: number; start: number } | null>(null)

  /* Au recalage de la boucle (saut d'une copie à l'autre), l'observer ne
     réagit qu'à la frame suivante : on recopie l'état d'entrée des jalons
     de la copie source vers la copie cible pour éviter tout flash. */
  const mirrorInClasses = useCallback((fromOffset: number, toOffset: number) => {
    const items = itemRefs.current
    for (let i = 0; i < LOOP_LEN; i++) {
      const src = items[fromOffset + i]
      const dst = items[toOffset + i]
      if (src && dst) dst.classList.toggle(IN_CLASS, src.classList.contains(IN_CLASS))
    }
  }, [])

  /* Boucle d'animation unique : défilement auto, saut vers une section,
     recalage de la boucle infinie et détection de la section courante. */
  const tick = useCallback((ts: number) => {
    const el = scrollRef.current
    if (el) {
      const itemHeight = el.clientHeight / VISIBLE_COUNT
      const loopHeight = itemHeight * LOOP_LEN
      const dt = lastTsRef.current ? (ts - lastTsRef.current) / 1000 : 0

      const jump = jumpRef.current
      if (jump) {
        const t = Math.min((ts - jump.start) / JUMP_MS, 1)
        const eased = 1 - Math.pow(1 - t, 3) // ease-out cubique
        posRef.current = jump.from + (jump.to - jump.from) * eased
        el.scrollTop = posRef.current
        if (t >= 1) jumpRef.current = null
      } else if (pausedRef.current) {
        /* Exploration manuelle : le DOM fait foi. Les deux copies étant
           identiques, ramener la position dans la bande centrale est
           invisible et rend la boucle infinie dans les deux sens. */
        let st = el.scrollTop
        if (st > loopHeight + itemHeight) {
          st -= loopHeight
          el.scrollTop = st
          mirrorInClasses(LOOP_LEN, 0)
        } else if (st < itemHeight) {
          st += loopHeight
          el.scrollTop = st
          mirrorInClasses(0, LOOP_LEN)
        }
        posRef.current = st
      } else {
        posRef.current += SCROLL_SPEED * dt
        if (loopHeight > 0 && posRef.current >= loopHeight) {
          posRef.current -= loopHeight
          mirrorInClasses(LOOP_LEN, 0)
        }
        el.scrollTop = posRef.current
      }

      /* Section courante pour l'index, d'après le jalon en haut d'écran
         (le jalon de fin de boucle a un index >= EVENTS.length : il
         retombe naturellement sur la dernière section, ce qui est correct
         puisqu'on n'a pas encore rebouclé sur la première). */
      if (itemHeight > 0) {
        const topIndex = Math.round(el.scrollTop / itemHeight) % LOOP_LEN
        let current = 0
        for (let i = 0; i < SECTIONS.length; i++) {
          if (topIndex >= SECTIONS[i].start) current = i
        }
        setActiveSection(current)
      }
    }
    lastTsRef.current = ts
    rafRef.current = requestAnimationFrame(tick)
  }, [mirrorInClasses])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [tick])

  /* Animations d'entrée : chaque jalon reçoit la classe quand il entre
     dans la zone visible, la perd quand il en sort (rejouées en boucle). */
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          entry.target.classList.toggle(IN_CLASS, entry.isIntersecting)
        }
      },
      { root, threshold: 0.15 },
    )
    for (const item of itemRefs.current) if (item) observer.observe(item)
    return () => observer.disconnect()
  }, [])

  const pause = () => {
    jumpRef.current = null
    pausedRef.current = true
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }

  const scheduleResume = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false
    }, RESUME_DELAY_MS)
  }

  const jumpToSection = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    pause()
    const itemHeight = el.clientHeight / VISIBLE_COUNT
    const loopHeight = itemHeight * LOOP_LEN
    /* Recalage invisible sur la première copie avant de calculer la cible */
    const from = el.scrollTop % loopHeight
    if (from !== el.scrollTop) {
      el.scrollTop = from
      mirrorInClasses(LOOP_LEN, 0)
    }
    let to = SECTIONS[index].start * itemHeight
    if (to <= from) to += loopHeight // on avance toujours dans le sens du temps
    to = Math.min(to, el.scrollHeight - el.clientHeight)
    jumpRef.current = { from, to, start: performance.now() }
    scheduleResume()
  }

  const openEvent = (index: number) => {
    pause() // la frise reste figée tant que la modale est ouverte
    setSelectedIdx(index)
  }

  const closeEvent = () => {
    setSelectedIdx(null)
    scheduleResume()
  }

  /* Navigation circulaire précédent/suivant dans la modale */
  const stepEvent = (delta: number) => {
    setSelectedIdx(i => (i === null ? i : (i + delta + EVENTS.length) % EVENTS.length))
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2 className="timeline-title">Frise chronologique</h2>
        <p className="timeline-subtitle">L'histoire de l'arme des Transmissions</p>
      </div>

      <div className="timeline-body">
        <div
          className="timeline-scroll"
          ref={scrollRef}
          onPointerDown={pause}
          onPointerUp={scheduleResume}
          onPointerCancel={scheduleResume}
          onWheel={() => { pause(); scheduleResume() }}
        >
          {/* Deux copies identiques pour un défilement en boucle sans couture,
              chacune terminée par un jalon de fin de boucle (voir LOOP_LEN) */}
          {[0, 1].map(copy => [
            ...EVENTS.map((event, i) => {
              const isSectionStart = SECTIONS.some(s => s.start === i)
              const side = i % 2 === 0 ? 'left' : 'right'
              const yearSlot = (
                <div className="tl-slot tl-slot--year">
                  <span className="tl-year">{event.annee}</span>
                  {isSectionStart && (
                    <span className="tl-section-chip"><Ord>{event.section}</Ord></span>
                  )}
                </div>
              )
              const cardSlot = (
                <div className="tl-slot tl-slot--card">
                  <button className="tl-card" onClick={() => openEvent(i)}>
                    <h3 className="tl-event-title"><Ord>{event.titre}</Ord></h3>
                    <p className="tl-event-text">{event.texte}</p>
                    <span className="tl-more">En savoir plus <span className="tl-more-arrow">›</span></span>
                  </button>
                </div>
              )
              return (
                <article
                  key={`${copy}-${i}`}
                  ref={el => { itemRefs.current[copy * LOOP_LEN + i] = el }}
                  className={`tl-event tl-event--${side}`}
                >
                  {side === 'left' ? cardSlot : yearSlot}
                  <div className="tl-axis">
                    <span className={`tl-dot${isSectionStart ? ' tl-dot--section' : ''}`} />
                  </div>
                  {side === 'left' ? yearSlot : cardSlot}
                </article>
              )
            }),
            <div
              key={`gap-${copy}`}
              ref={el => { itemRefs.current[copy * LOOP_LEN + EVENTS.length] = el }}
              className="tl-loop-gap"
            >
              <span className="tl-loop-gap-line" aria-hidden="true" />
              <span className="tl-loop-gap-label">↺ Retour au début de la frise</span>
              <span className="tl-loop-gap-line" aria-hidden="true" />
            </div>,
          ])}
        </div>

        {/* Index escamotable : tiroir + poignée collée au bord droit */}
        <div className={`tl-drawer${indexOpen ? ' tl-drawer--open' : ''}`}>
          <button
            className="tl-drawer-handle"
            onClick={() => setIndexOpen(o => !o)}
            aria-expanded={indexOpen}
            aria-label={indexOpen ? "Masquer l'index des sections" : "Afficher l'index des sections"}
          >
            <span className="tl-drawer-chevron" aria-hidden="true">‹</span>
            <span className="tl-drawer-label">Sections</span>
          </button>
          <nav className="timeline-index" aria-label="Sections de la frise">
            {SECTIONS.map((section, i) => (
              <button
                key={section.nom}
                className={`tl-index-btn${activeSection === i ? ' tl-index-btn--active' : ''}`}
                onClick={() => jumpToSection(i)}
              >
                <Ord>{section.nom}</Ord>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {selectedIdx !== null && (
        <TimelineDialog
          event={EVENTS[selectedIdx]}
          prevEvent={EVENTS[(selectedIdx + EVENTS.length - 1) % EVENTS.length]}
          nextEvent={EVENTS[(selectedIdx + 1) % EVENTS.length]}
          contentKey={selectedIdx}
          progress={(selectedIdx + 1) / EVENTS.length}
          onPrev={() => stepEvent(-1)}
          onNext={() => stepEvent(1)}
          onClose={closeEvent}
        />
      )}
    </div>
  )
}
