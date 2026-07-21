import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import timelineDataFr from '../../data/timeline.json'
import timelineDataEn from '../../data/timeline_en.json'
import type { TimelineEvent } from '../../types'
import { Ord } from '../../utils/ordinals'
import { TimelineDialog } from './TimelineDialog'
import './Timeline.css'

// Deux jeux de données aux mêmes champs (voir types.ts) : Timeline choisit
// l'un ou l'autre selon la langue du bouton du panneau droit. timeline_en.json
// ne couvre qu'un jalon pour l'instant (traduction en cours).
const EVENTS_FR = timelineDataFr as TimelineEvent[]
const EVENTS_EN = timelineDataEn as TimelineEvent[]

const VISIBLE_COUNT = 4      // jalons visibles simultanément
const SCROLL_SPEED = 22      // px/s de défilement automatique
const RESUME_DELAY_MS = 4000 // reprise du défilement après le dernier toucher
const JUMP_MS = 900          // durée du saut animé vers une section

/* Classe posée/retirée par l'IntersectionObserver pour déclencher les
   animations d'entrée (manipulation directe du DOM : pas de re-render
   React à chaque frame de défilement). */
const IN_CLASS = 'tl-event--in'

const STRINGS = {
  fr: {
    titre: 'Frise chronologique',
    soustitre: "L'histoire de l'Arme des Transmissions",
    enSavoirPlus: 'En savoir plus',
    sections: 'Sections',
    sectionsAria: 'Sections de la frise',
    masquerIndex: "Masquer l'index des sections",
    afficherIndex: "Afficher l'index des sections",
  },
  en: {
    titre: 'Timeline',
    soustitre: 'The history of the Transmissions Corps',
    enSavoirPlus: 'Learn more',
    sections: 'Sections',
    sectionsAria: 'Timeline sections',
    masquerIndex: 'Hide the section index',
    afficherIndex: 'Show the section index',
  },
} as const

interface TimelineProps {
  /** Langue d'affichage : sélectionne timeline.json (fr) ou timeline_en.json (en). */
  lang: 'fr' | 'en'
}

export default function Timeline({ lang }: TimelineProps) {
  const t = STRINGS[lang]
  const EVENTS = lang === 'en' ? EVENTS_EN : EVENTS_FR
  // Sections d'ancrage dérivées des données : nom + index du premier jalon.
  // Elles ne découpent pas la frise, elles servent uniquement de repères.
  const SECTIONS = useMemo(
    () =>
      EVENTS.reduce<{ nom: string; start: number }[]>((acc, e, i) => {
        if (acc.length === 0 || acc[acc.length - 1].nom !== e.section) {
          acc.push({ nom: e.section, start: i })
        }
        return acc
      }, []),
    [EVENTS],
  )
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

  // Changement de langue : le nouveau jeu de données a une autre longueur
  // (parfois plus courte), la position et la modale ouverte référencent
  // donc l'ancien tableau — on revient à un état neutre en haut de la frise.
  useEffect(() => {
    setSelectedIdx(null)
    setActiveSection(0)
    pausedRef.current = false
    jumpRef.current = null
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    posRef.current = 0
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [lang])

  /* Au recalage de la boucle (saut d'une copie à l'autre), l'observer ne
     réagit qu'à la frame suivante : on recopie l'état d'entrée des jalons
     de la copie source vers la copie cible pour éviter tout flash. */
  const mirrorInClasses = useCallback((fromOffset: number, toOffset: number) => {
    const items = itemRefs.current
    for (let i = 0; i < EVENTS.length; i++) {
      const src = items[fromOffset + i]
      const dst = items[toOffset + i]
      if (src && dst) dst.classList.toggle(IN_CLASS, src.classList.contains(IN_CLASS))
    }
  }, [EVENTS])

  /* Boucle d'animation unique : défilement auto, saut vers une section,
     recalage de la boucle infinie et détection de la section courante. */
  const tick = useCallback((ts: number) => {
    const el = scrollRef.current
    if (el) {
      const itemHeight = el.clientHeight / VISIBLE_COUNT
      const loopHeight = itemHeight * EVENTS.length
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
          mirrorInClasses(EVENTS.length, 0)
        } else if (st < itemHeight) {
          st += loopHeight
          el.scrollTop = st
          mirrorInClasses(0, EVENTS.length)
        }
        posRef.current = st
      } else {
        posRef.current += SCROLL_SPEED * dt
        if (loopHeight > 0 && posRef.current >= loopHeight) {
          posRef.current -= loopHeight
          mirrorInClasses(EVENTS.length, 0)
        }
        el.scrollTop = posRef.current
      }

      /* Section courante pour l'index, d'après le jalon en haut d'écran */
      if (itemHeight > 0) {
        const topIndex = Math.round(el.scrollTop / itemHeight) % EVENTS.length
        let current = 0
        for (let i = 0; i < SECTIONS.length; i++) {
          if (topIndex >= SECTIONS[i].start) current = i
        }
        setActiveSection(current)
      }
    }
    lastTsRef.current = ts
    rafRef.current = requestAnimationFrame(tick)
  }, [mirrorInClasses, EVENTS, SECTIONS])

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
    const loopHeight = itemHeight * EVENTS.length
    /* Recalage invisible sur la première copie avant de calculer la cible */
    const from = el.scrollTop % loopHeight
    if (from !== el.scrollTop) {
      el.scrollTop = from
      mirrorInClasses(EVENTS.length, 0)
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
        <h2 className="timeline-title">{t.titre}</h2>
        <p className="timeline-subtitle">{t.soustitre}</p>
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
          {/* Deux copies identiques pour un défilement en boucle sans couture */}
          {[0, 1].map(copy =>
            EVENTS.map((event, i) => {
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
                    <span className="tl-more">{t.enSavoirPlus} <span className="tl-more-arrow">›</span></span>
                  </button>
                </div>
              )
              return (
                <article
                  key={`${copy}-${i}`}
                  ref={el => { itemRefs.current[copy * EVENTS.length + i] = el }}
                  className={`tl-event tl-event--${side}`}
                >
                  {side === 'left' ? cardSlot : yearSlot}
                  <div className="tl-axis">
                    <span className={`tl-dot${isSectionStart ? ' tl-dot--section' : ''}`} />
                  </div>
                  {side === 'left' ? yearSlot : cardSlot}
                </article>
              )
            })
          )}
        </div>

        {/* Index escamotable : tiroir + poignée collée au bord droit */}
        <div className={`tl-drawer${indexOpen ? ' tl-drawer--open' : ''}`}>
          <button
            className="tl-drawer-handle"
            onClick={() => setIndexOpen(o => !o)}
            aria-expanded={indexOpen}
            aria-label={indexOpen ? t.masquerIndex : t.afficherIndex}
          >
            <span className="tl-drawer-chevron" aria-hidden="true">‹</span>
            <span className="tl-drawer-label">{t.sections}</span>
          </button>
          <nav className="timeline-index" aria-label={t.sectionsAria}>
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
          lang={lang}
          onPrev={() => stepEvent(-1)}
          onNext={() => stepEvent(1)}
          onClose={closeEvent}
        />
      )}
    </div>
  )
}
