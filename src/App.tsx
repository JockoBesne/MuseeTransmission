import { useEffect, useRef, useState } from 'react'
import { FaWheelchair } from 'react-icons/fa'
import Memorial from './components/Memorial/Memorial'
import './App.css'
import InteractiveMap from './components/map/InteractiveMap'
import Timeline from './components/Timeline/Timeline'
import { preloadCardImages } from './utils/preloadImages'
import AdminHub from './components/Admin/AdminHub'
import AdminPin from './components/Admin/AdminPin'
import MemorialAdmin from './components/Admin/MemorialAdmin'

/* ── Panneau gauche avec onglets ── */
// Identifiants stables (indépendants de la langue) ; le libellé affiché
// vient de STRINGS[lang].tabLabel.
const LEFT_TABS = ['map', 'memorial'] as const
type LeftTab = typeof LEFT_TABS[number]

const STRINGS = {
  fr: {
    tabLabel: { map: 'Carte intéractive', memorial: 'Mémorial' },
    pmrAria: "Accès PMR : déplacer les onglets en bas de l'écran",
  },
  en: {
    tabLabel: { map: 'Interactive map', memorial: 'Memorial' },
    pmrAria: 'Wheelchair access: move the tabs to the bottom of the screen',
  },
} as const

/* Borne en libre accès : sans interaction pendant ce délai,
   on revient sur le Mémorial (écran de veille). */
const INACTIVITY_MS = 3 * 60 * 1000

function LeftPanel() {
  const [activeTab, setActiveTab] = useState<LeftTab>('map')
  // Compte les mises en veille : intégré à la clé du contenu, il force le
  // remontage du Mémorial même si l'onglet était déjà actif (recherche vidée,
  // clavier virtuel fermé, défilement relancé).
  const [idleCount, setIdleCount] = useState(0)
  // Mode PMR : bascule la barre d'onglets en bas du panneau, activable
  // depuis la carte interactive (bouton en bas à gauche).
  const [pmrMode, setPmrMode] = useState(false)
  // Langue d'affichage du panneau gauche, indépendante du panneau droit.
  // Pilote le choix villes.json / villes_en.json dans InteractiveMap ; le
  // Mémorial n'a pas encore de traduction.
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const t = STRINGS[lang]
  const activeIndex = LEFT_TABS.indexOf(activeTab)

  useEffect(() => {
    let timer = setTimeout(onIdle, INACTIVITY_MS)

    function onIdle() {
      setActiveTab('memorial')
      setIdleCount(c => c + 1)
      // Retour à la configuration standard pour le visiteur suivant.
      setPmrMode(false)
    }

    function reset() {
      clearTimeout(timer)
      timer = setTimeout(onIdle, INACTIVITY_MS)
    }

    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of events) window.addEventListener(e, reset, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, reset)
    }
  }, [])

  return (
    <div className={`panel panel-left${pmrMode ? ' panel-left--pmr' : ''}`}>
      <button
        type="button"
        className="pmr-btn"
        aria-pressed={pmrMode}
        aria-label={t.pmrAria}
        onClick={() => setPmrMode((v) => !v)}
      >
        <FaWheelchair className="pmr-icon" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="lang-btn lang-btn--left"
        aria-label={lang === 'fr' ? 'Langue : français. Basculer en anglais.' : 'Language: English. Switch to French.'}
        onClick={() => setLang((v) => (v === 'fr' ? 'en' : 'fr'))}
      >
        <span className="lang-flag" aria-hidden="true">{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
      </button>

      <nav className="tab-bar">
        {LEFT_TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {t.tabLabel[tab]}
          </button>
        ))}
        <span
          className="tab-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      </nav>

      <div key={`${activeTab}-${idleCount}`} className="tab-content">
        {activeTab === 'map' && <InteractiveMap pmrMode={pmrMode} lang={lang} />}
        {activeTab === 'memorial' && <Memorial />}
      </div>
    </div>
  )
}

/* ── Panneau droit ── */
function RightPanel() {
  // Langue d'affichage du panneau droit, indépendante du panneau gauche.
  // Pilote le choix timeline.json / timeline_en.json dans Timeline.
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  return (
    <div className="panel panel-right">
      <button
        type="button"
        className="lang-btn lang-btn--right"
        aria-label={lang === 'fr' ? 'Langue : français. Basculer en anglais.' : 'Language: English. Switch to French.'}
        onClick={() => setLang((v) => (v === 'fr' ? 'en' : 'fr'))}
      >
        <span className="lang-flag" aria-hidden="true">{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
      </button>
      <Timeline lang={lang} />
    </div>
  )
}

/* ── App ── */
// Appui maintenu sur le coin haut-droit pour ouvrir l'admin (accès personnel).
const ADMIN_PRESS_MS = 5000
// Sans action en admin, retour automatique à l'affichage public.
const ADMIN_IDLE_MS = 5 * 60 * 1000

type AdminView = 'borne' | 'pin' | 'hub' | 'memorial'

function App() {
  const [adminView, setAdminView] = useState<AdminView>('borne')
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(null)

  // Met en cache les images des fiches dès le démarrage : les pop-ups de la
  // carte s'ouvrent ensuite sans délai de chargement.
  useEffect(() => {
    preloadCardImages()
  }, [])

  const startPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => setAdminView('pin'), ADMIN_PRESS_MS)
  }
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  // Filet de sécurité : un écran admin oublié revient tout seul au mode borne.
  useEffect(() => {
    if (adminView === 'borne') return
    let timer = setTimeout(() => setAdminView('borne'), ADMIN_IDLE_MS)

    function reset() {
      clearTimeout(timer)
      timer = setTimeout(() => setAdminView('borne'), ADMIN_IDLE_MS)
    }

    const events = ['pointerdown', 'keydown'] as const
    for (const e of events) window.addEventListener(e, reset, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, reset)
    }
  }, [adminView])

  if (adminView === 'pin') {
    return (
      <AdminPin
        onValide={() => setAdminView('hub')}
        onAnnule={() => setAdminView('borne')}
      />
    )
  }
  if (adminView === 'hub') {
    return (
      <AdminHub
        onBorne={() => setAdminView('borne')}
        onMemorial={() => setAdminView('memorial')}
      />
    )
  }
  if (adminView === 'memorial') {
    return (
      <MemorialAdmin
        onRetour={() => setAdminView('hub')}
        onBorne={() => setAdminView('borne')}
      />
    )
  }

  return (
    <div className="split-screen">
      <LeftPanel />
      <div className="divider" />
      <RightPanel />
      <div
        className="admin-hotspot"
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        aria-hidden="true"
      />
    </div>
  )
}

export default App
