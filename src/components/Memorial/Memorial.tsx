import { useState, useEffect, useRef, useCallback } from 'react'
import memorial1gm from '../../data/memorial-1gm.json'
import VirtualKeyboard from './VirtualKeyboard'
import { Ord } from '../../utils/ordinals'
import './Memorial.css'

type War = '1GM' | '2GM'

interface Soldat {
  nom: string
  prenom: string
  role: string
  annee: string
}

const WAR_LABELS: Record<War, string> = {
  '1GM': 'Première Guerre Mondiale · 1914–1918',
  '2GM': 'Deuxième Guerre Mondiale · 1939–1945',
}

const SCROLL_SPEED = 28 // px/seconde

function normalizeSoldat(item: unknown): Soldat {
  const o = (item ?? {}) as Record<string, unknown>
  return {
    nom: String(o.nom ?? o.Nom ?? '').trim(),
    prenom: String(o.prenom ?? o.Prenom ?? '').trim(),
    role: String(o.role ?? o.Role ?? '').trim(),
    annee: String(o.annee ?? o.Annee ?? '').trim(),
  }
}

// Données bundlées (comme villes.json) — régénérées via `npm run import-docx`.
const SOLDATS: Record<War, Soldat[]> = {
  '1GM': (memorial1gm as unknown[]).map(normalizeSoldat).filter(s => s.nom),
  '2GM': [], // données non disponibles pour l'instant
}

function NameEntry({ soldat }: { soldat: Soldat }) {
  const { nom, prenom, role, annee } = soldat
  return (
    <div className="name-entry">
      <div className="name-main">
        <span className="memorial-nom">{nom}</span>
        {prenom && <>{' '}<span className="memorial-prenom">{prenom}</span></>}
      </div>
      {(role || annee) && (
        <div className="name-meta">
          <Ord>{role}</Ord>{role && annee ? ' · ' : ''}{annee}
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

  const soldats = SOLDATS[war]

  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const posRef = useRef<number>(0)
  const touchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setSearch('')
    setKeyboardOpen(false)
    posRef.current = 0
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [war])

  const shouldScroll = !search && !hovering && !touching && !keyboardOpen

  const tick = useCallback((ts: number) => {
    const el = scrollRef.current
    if (!el) return
    if (lastTimeRef.current) {
      const dt = (ts - lastTimeRef.current) / 1000
      posRef.current += SCROLL_SPEED * dt
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxScroll > 0 && posRef.current >= maxScroll) posRef.current = 0
      el.scrollTop = posRef.current
    }
    lastTimeRef.current = ts
    rafRef.current = requestAnimationFrame(tick)
  }, [])

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
          {(['1GM', '2GM'] as War[]).map(w => (
            <button
              key={w}
              className={`war-tab ${war === w ? 'active' : ''}`}
              onClick={() => setWar(w)}
            >
              <Ord>{w === '1GM' ? '1ère GM' : '2ème GM'}</Ord>
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
      >
        {soldats.length === 0 ? (
          <p className="memorial-status">
            {war === '2GM' ? 'Données non disponibles.' : 'Aucun fichier de données trouvé.'}
          </p>
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
    </div>
  )
}
