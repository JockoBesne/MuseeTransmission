import { useState, useEffect, useRef, useCallback } from 'react'
import VirtualKeyboard from './VirtualKeyboard'
import { Ord } from '../../utils/ordinals'
import './Memorial.css'

type War = '1GM' | '2GM' | 'Indochine' | 'Algérie' | 'Opex'

interface Soldat {
  nom: string
  prenom: string
  role: string
  annee: string
  /** Théâtre d'opération (renseigné pour l'Opex : Tchad, Ex-Yougoslavie…). */
  conflit: string
}

const WARS: War[] = ['1GM', '2GM', 'Indochine', 'Algérie', 'Opex']

/** Libellé court de l'onglet (les ordinaux passent par <Ord>). */
const TAB_LABELS: Record<War, string> = {
  '1GM': '1ère GM',
  '2GM': '2ème GM',
  Indochine: 'Indochine',
  Algérie: 'Algérie',
  Opex: 'Opex',
}

const WAR_LABELS: Record<War, string> = {
  '1GM': 'Première Guerre Mondiale · 1914–1918',
  '2GM': 'Deuxième Guerre Mondiale · 1939–1945',
  Indochine: "Guerre d'Indochine · 1946–1954",
  Algérie: "Guerre d'Algérie · 1954–1962",
  Opex: 'Opérations extérieures et autres théâtres',
}

const SCROLL_SPEED = 28 // px/seconde

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

  useEffect(() => {
    setSearch('')
    setKeyboardOpen(false)
    posRef.current = 0
    dwellRef.current = 0
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [war])

  const shouldScroll = !search && !hovering && !touching && !keyboardOpen && !transition

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
          {WARS.map(w => (
            <button
              key={w}
              className={`war-tab ${war === w ? 'active' : ''}`}
              onClick={() => setWar(w)}
            >
              <Ord>{TAB_LABELS[w]}</Ord>
            </button>
          ))}
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
