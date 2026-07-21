import { useState, useEffect, useRef, useCallback } from 'react'
import VirtualKeyboard from './VirtualKeyboard'
import { Ord } from '../../utils/ordinals'
import './Memorial.css'

type War = '1GM' | 'EntreDeuxGuerres' | '2GM' | 'Indochine' | 'Algérie' | 'Opex'

interface Soldat {
  nom: string
  prenom: string
  role: string
  annee: string
  /** Théâtre d'opération (renseigné pour l'Opex : Tchad, Ex-Yougoslavie…). */
  conflit: string
}

const WARS: War[] = ['1GM', 'EntreDeuxGuerres', '2GM', 'Indochine', 'Algérie', 'Opex']

/** Libellé de l'onglet, en toutes lettres (les ordinaux passent par <Ord>). */
const TAB_LABELS: Record<War, string> = {
  '1GM': 'Première Guerre mondiale',
  EntreDeuxGuerres: 'Entre-deux-guerres',
  '2GM': 'Seconde Guerre mondiale',
  Indochine: 'Indochine',
  Algérie: 'Algérie',
  Opex: 'Opex',
}

const WAR_LABELS: Record<War, string> = {
  '1GM': 'Première Guerre mondiale · 1914–1918',
  EntreDeuxGuerres: 'Entre-deux-guerres · 1918–1939',
  '2GM': 'Seconde Guerre mondiale · 1939–1945',
  Indochine: "Guerre d'Indochine · 1946–1954",
  Algérie: "Guerre d'Algérie · 1954–1962",
  Opex: 'Opérations extérieures et autres théâtres',
}

const SCROLL_SPEED = 28 // px/seconde
const SWIPE_MIN_PX = 40 // glissement horizontal minimal sur le sélecteur de guerre

/* Enchaînement des catégories : arrivé tout en bas d'une liste (défilement
   automatique OU glissement manuel), une transition plein panneau annonce la
   catégorie suivante (1GM → 2GM → … → Opex → 1GM). */
const TRANSITION_TOTAL_MS = 3600 // durée du voile (voir Memorial.css)
const TRANSITION_SWITCH_MS = 1100 // changement de liste, une fois le voile opaque
const COURTE_LISTE_ATTENTE_S = 30 // liste tenant à l'écran : délai avant d'enchaîner

function normalizeSoldat(item: unknown): Soldat {
  const o = (item ?? {}) as Record<string, unknown>
  return {
    nom: String(o.nom ?? o.Nom ?? '').trim(),
    prenom: String(o.prenom ?? o.Prenom ?? '').trim(),
    role: String(o.role ?? o.Role ?? '').trim(),
    annee: String(o.annee ?? o.Annee ?? '').trim(),
    conflit: String(o.conflit ?? '').trim(),
  }
}

/* Fichiers JSON servis à l'exécution (public/data/memorial en dev ; sur la
   borne, le serveur local privilégie la version déposée via l'écran admin —
   c'est pour cela qu'on ne bundle plus ces données). */
const FICHIERS: Record<War, string> = {
  '1GM': '1gm',
  EntreDeuxGuerres: 'entre-deux-guerres',
  '2GM': '2gm',
  Indochine: 'indochine',
  Algérie: 'algerie',
  Opex: 'opex',
}

async function chargeCategorie(war: War): Promise<Soldat[]> {
  try {
    const rep = await fetch(`${import.meta.env.BASE_URL}data/memorial/${FICHIERS[war]}.json`, {
      cache: 'no-store',
    })
    if (!rep.ok) return []
    return ((await rep.json()) as unknown[]).map(normalizeSoldat).filter(s => s.nom)
  } catch {
    return []
  }
}

function NameEntry({ soldat }: { soldat: Soldat }) {
  const { nom, prenom, role, annee, conflit } = soldat
  return (
    <div className="name-entry">
      <div className="name-main">
        <span className="memorial-nom">{nom}</span>
        {prenom && <>{' '}<span className="memorial-prenom">{prenom}</span></>}
      </div>
      {(role || annee || conflit) && (
        <div className="name-meta">
          <Ord>{role}</Ord>
          {role && (annee || conflit) ? ' · ' : ''}
          {annee}
          {annee && conflit ? ' · ' : ''}
          {conflit && <span className="name-conflit">{conflit}</span>}
        </div>
      )}
    </div>
  )
}

export default function Memorial() {
  const [war, setWar] = useState<War>('1GM')
  const [search, setSearch] = useState('')
  const [hovering, setHovering] = useState(false)
  const [touching, setTouching] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  // Menu déroulant du sélecteur de guerre (toucher simple sur le bouton central).
  const [menuOpen, setMenuOpen] = useState(false)
  // Direction visée pendant un glissement en cours (-1 gauche, 1 droite, 0 aucune) :
  // illumine la flèche correspondante pour guider le geste.
  const [swipeDir, setSwipeDir] = useState(0)
  // null = chargement en cours (les données arrivent en fetch, plus du bundle).
  const [donnees, setDonnees] = useState<Record<War, Soldat[]> | null>(null)
  // Catégorie annoncée par le voile de transition (null = pas de transition).
  const [transition, setTransition] = useState<War | null>(null)

  // Miroirs pour les gestionnaires stables (tick / scroll).
  const warRef = useRef(war)
  warRef.current = war
  const transitionRef = useRef(transition)
  transitionRef.current = transition
  const searchRef = useRef(search)
  searchRef.current = search
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  // Temps passé (s) sur une liste tenant entièrement à l'écran.
  const dwellRef = useRef(0)

  const declencheTransition = useCallback(() => {
    if (transitionRef.current) return
    const suivant = WARS[(WARS.indexOf(warRef.current) + 1) % WARS.length]
    setTransition(suivant)
    transitionTimers.current.push(
      setTimeout(() => setWar(suivant), TRANSITION_SWITCH_MS),
      setTimeout(() => setTransition(null), TRANSITION_TOTAL_MS),
    )
  }, [])

  // Fonctionnement continu de la borne : timers purgés au démontage.
  useEffect(() => {
    const timers = transitionTimers.current
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    let actif = true
    Promise.all(WARS.map(chargeCategorie)).then(listes => {
      if (actif) {
        setDonnees(Object.fromEntries(WARS.map((w, i) => [w, listes[i]])) as Record<War, Soldat[]>)
      }
    })
    return () => {
      actif = false
    }
  }, [])

  const soldats = donnees?.[war] ?? []

  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const posRef = useRef<number>(0)
  const touchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  // Glissement horizontal sur le sélecteur de guerre (point de départ + drapeau
  // pour avaler le click synthétique qui suit un glissement).
  const swipeStartRef = useRef({ x: 0, y: 0 })
  const swipedRef = useRef(false)

  /** Guerre précédente (-1) ou suivante (+1), en boucle. */
  const changeWar = (dir: number) =>
    setWar(w => WARS[(WARS.indexOf(w) + dir + WARS.length) % WARS.length])

  /** Direction d'un glissement qualifié (assez long ET à dominante horizontale). */
  const swipeDirection = (t: { clientX: number; clientY: number }) => {
    const dx = t.clientX - swipeStartRef.current.x
    const dy = t.clientY - swipeStartRef.current.y
    return Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0
  }

  useEffect(() => {
    setSearch('')
    setKeyboardOpen(false)
    setMenuOpen(false)
    posRef.current = 0
    dwellRef.current = 0
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [war])

  // menuOpen : défilement en pause pendant que le visiteur consulte le menu
  // (sinon le voile de transition pourrait changer de guerre sous ses doigts).
  const shouldScroll = !search && !hovering && !touching && !keyboardOpen && !transition && !menuOpen

  const tick = useCallback((ts: number) => {
    const el = scrollRef.current
    if (!el) return
    if (lastTimeRef.current) {
      const dt = (ts - lastTimeRef.current) / 1000
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxScroll > 0) {
        // Butée en bas de liste : on n'y reboucle plus, on enchaîne.
        posRef.current = Math.min(posRef.current + SCROLL_SPEED * dt, maxScroll)
        el.scrollTop = posRef.current
        if (posRef.current >= maxScroll) declencheTransition()
      } else {
        // Liste plus courte que l'écran : enchaîner après un temps de recueillement.
        dwellRef.current += dt
        if (dwellRef.current >= COURTE_LISTE_ATTENTE_S) declencheTransition()
      }
    }
    lastTimeRef.current = ts
    rafRef.current = requestAnimationFrame(tick)
  }, [declencheTransition])

  useEffect(() => {
    if (shouldScroll) {
      if (scrollRef.current) posRef.current = scrollRef.current.scrollTop
      lastTimeRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = 0
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [shouldScroll, tick])

  const handleTouchStart = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    setTouching(true)
  }

  const handleTouchEnd = () => {
    if (scrollRef.current) posRef.current = scrollRef.current.scrollTop
    touchTimerRef.current = setTimeout(() => setTouching(false), 1500)
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
      posRef.current = 0
    }
  }

  const filtered = search
    ? soldats.filter(s => {
        const q = search.toLowerCase()
        return s.nom.toLowerCase().includes(q) || s.prenom.toLowerCase().includes(q)
      })
    : soldats

  return (
    <div className="memorial">
      <div className="memorial-header">
        <div className="memorial-emblem">✦</div>
        <h2 className="memorial-title">MÉMORIAL</h2>
        <div className="memorial-wars">
          <button
            className={`war-arrow war-arrow--prev ${swipeDir < 0 ? 'targeted' : ''}`}
            onClick={() => changeWar(-1)}
            aria-label="Guerre précédente"
          >
            ‹
          </button>
          <button
            className={`war-current ${menuOpen ? 'open' : ''}`}
            onTouchStart={e => {
              swipedRef.current = false
              swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
            }}
            onTouchMove={e => setSwipeDir(swipeDirection(e.touches[0]))}
            onTouchCancel={() => setSwipeDir(0)}
            onTouchEnd={e => {
              // Glisser vers une flèche = aller vers cette guerre (gauche = précédente).
              const dir = swipeDirection(e.changedTouches[0])
              setSwipeDir(0)
              if (dir) {
                swipedRef.current = true
                changeWar(dir)
              }
            }}
            onClick={() => {
              if (swipedRef.current) {
                swipedRef.current = false
                return
              }
              setMenuOpen(o => !o)
            }}
          >
            <Ord>{TAB_LABELS[war]}</Ord>
            <span className="war-caret" aria-hidden="true">▾</span>
          </button>
          <button
            className={`war-arrow war-arrow--next ${swipeDir > 0 ? 'targeted' : ''}`}
            onClick={() => changeWar(1)}
            aria-label="Guerre suivante"
          >
            ›
          </button>

          {menuOpen && (
            <>
              {/* Toucher hors du menu le referme. */}
              <div className="war-menu-backdrop" onClick={() => setMenuOpen(false)} />
              <ul className="war-menu">
                {WARS.map(w => (
                  <li key={w}>
                    <button
                      className={`war-option ${war === w ? 'active' : ''}`}
                      onClick={() => {
                        setWar(w)
                        setMenuOpen(false)
                      }}
                    >
                      <Ord>{TAB_LABELS[w]}</Ord>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <p className="memorial-subtitle">{WAR_LABELS[war]}</p>
      </div>

      <div className="memorial-search">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          inputMode="none"
          placeholder="Rechercher un nom…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => setKeyboardOpen(true)}
          onTouchEnd={e => (e.currentTarget as HTMLInputElement).focus()}
          className="search-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {search && (
          <button
            className="search-clear"
            onClick={() => {
              handleSearch('')
              setKeyboardOpen(false)
            }}
            aria-label="Effacer"
          >
            ✕
          </button>
        )}
      </div>

      {keyboardOpen && (
        <VirtualKeyboard
          value={search}
          onChange={handleSearch}
          onClose={() => setKeyboardOpen(false)}
        />
      )}

      <div
        className="memorial-list"
        ref={scrollRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onScroll={() => {
          // Bas atteint aussi au glissement manuel -> même enchaînement.
          const el = scrollRef.current
          if (!el || searchRef.current) return
          const maxScroll = el.scrollHeight - el.clientHeight
          if (maxScroll > 0 && el.scrollTop >= maxScroll - 2) declencheTransition()
        }}
      >
        {donnees === null ? (
          <p className="memorial-status">Chargement…</p>
        ) : soldats.length === 0 ? (
          <p className="memorial-status">Données non disponibles.</p>
        ) : filtered.length === 0 ? (
          <p className="memorial-status">Aucun résultat pour « {search} »</p>
        ) : (
          filtered.map((s, i) => (
            <div key={i} className="memorial-name">
              <NameEntry soldat={s} />
            </div>
          ))
        )}
      </div>

      <div className="memorial-footer">
        {soldats.length > 0 && (
          search
            ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''} · ${soldats.length} inscrits`
            : `${soldats.length} noms inscrits`
        )}
      </div>

      {/* Voile de transition entre deux catégories (fin de liste atteinte). */}
      {transition && (
        <div className="memorial-transition" aria-hidden="true">
          <div className="memorial-transition-emblem">✦</div>
          <span className="memorial-transition-kicker">Mémorial</span>
          <h3 className="memorial-transition-title">{WAR_LABELS[transition]}</h3>
        </div>
      )}
    </div>
  )
}
