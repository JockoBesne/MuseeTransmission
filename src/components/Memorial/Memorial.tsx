import { useState, useEffect, useRef, useCallback } from 'react'
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

const DATA_FILES: Record<War, string> = {
  '1GM': '/data/memorial-1gm.json',
  '2GM': '/data/memorial-2gm.json',
}

const SCROLL_SPEED = 28 // px/seconde

async function loadSoldats(war: War): Promise<Soldat[]> {
  const url = DATA_FILES[war]
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) return []
    const text = await res.text()
    const ext = url.split('.').pop()?.toLowerCase() ?? 'json'
    return parseContent(text, ext)
  } catch {
    return []
  }
}

function parseContent(content: string, ext: string): Soldat[] {
  if (ext === 'json') {
    try {
      const data = JSON.parse(content) as unknown
      if (Array.isArray(data)) {
        return data.map(item => {
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>
            return {
              nom: String(o.nom ?? o.Nom ?? '').trim(),
              prenom: String(o.prenom ?? o.Prenom ?? o.name ?? '').trim(),
              role: String(o.role ?? o.Role ?? '').trim(),
              annee: String(o.annee ?? o.Annee ?? '').trim(),
            }
          }
          if (typeof item === 'string') {
            const parts = item.trim().split(/\s+/)
            return { nom: parts[0] ?? '', prenom: parts.slice(1).join(' '), role: '', annee: '' }
          }
          return { nom: '', prenom: '', role: '', annee: '' }
        }).filter(s => s.nom)
      }
    } catch { /**/ }
    return []
  }
  // .txt / .csv : une entrée par ligne
  return content
    .split('\n')
    .map(line => line.split(',')[0].replace(/\r/g, '').trim())
    .filter(Boolean)
    .map(line => {
      const spaceIdx = line.indexOf(' ')
      return {
        nom: spaceIdx === -1 ? line : line.slice(0, spaceIdx),
        prenom: spaceIdx === -1 ? '' : line.slice(spaceIdx + 1),
        role: '',
        annee: '',
      }
    })
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
          {role}{role && annee ? ' · ' : ''}{annee}
        </div>
      )}
    </div>
  )
}

export default function Memorial() {
  const [war, setWar] = useState<War>('1GM')
  const [soldats, setSoldats] = useState<Soldat[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hovering, setHovering] = useState(false)
  const [touching, setTouching] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const posRef = useRef<number>(0)
  const touchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLoading(true)
    setSearch('')
    posRef.current = 0
    loadSoldats(war).then(data => {
      setSoldats(data)
      setLoading(false)
    })
  }, [war])

  const shouldScroll = !search && !hovering && !touching && !loading

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
              {w === '1GM' ? '1ère GM' : '2ème GM'}
            </button>
          ))}
        </div>
        <p className="memorial-subtitle">{WAR_LABELS[war]}</p>
      </div>

      <div className="memorial-search">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          inputMode="text"
          placeholder="Rechercher un nom…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          onTouchEnd={e => (e.currentTarget as HTMLInputElement).focus()}
          className="search-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {search && (
          <button className="search-clear" onClick={() => handleSearch('')} aria-label="Effacer">
            ✕
          </button>
        )}
      </div>

      <div
        className="memorial-list"
        ref={scrollRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <p className="memorial-status">Chargement…</p>
        ) : soldats.length === 0 ? (
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
        {!loading && soldats.length > 0 && (
          search
            ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''} · ${soldats.length} inscrits`
            : `${soldats.length} noms inscrits`
        )}
      </div>
    </div>
  )
}
