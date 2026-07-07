import { useEffect, useState } from 'react'
import Memorial from './components/Memorial/Memorial'
import './App.css'
import InteractiveMap from './components/map/InteractiveMap'
import Timeline from './components/Timeline/Timeline'

/* ── Panneau gauche avec onglets ── */
const LEFT_TABS = ['Carte des RT', 'Mémorial'] as const
type LeftTab = typeof LEFT_TABS[number]

/* Borne en libre accès : sans interaction pendant ce délai,
   on revient sur le Mémorial (écran de veille). */
const INACTIVITY_MS = 3 * 60 * 1000

function LeftPanel() {
  const [activeTab, setActiveTab] = useState<LeftTab>('Carte des RT')
  const activeIndex = LEFT_TABS.indexOf(activeTab)

  useEffect(() => {
    let timer = setTimeout(onIdle, INACTIVITY_MS)

    function onIdle() {
      setActiveTab('Mémorial')
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
    <div className="panel panel-left">
      <nav className="tab-bar">
        {LEFT_TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
        <span
          className="tab-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      </nav>

      <div key={activeTab} className="tab-content">
        {activeTab === 'Carte des RT' && <InteractiveMap/>}
        {activeTab === 'Mémorial' && <Memorial />}
      </div>
    </div>
  )
}

/* ── Panneau droit ── */
function RightPanel() {
  return (
    <div className="panel panel-right">
      <Timeline />
    </div>
  )
}

/* ── App ── */
function App() {
  return (
    <div className="split-screen">
      <LeftPanel />
      <div className="divider" />
      <RightPanel />
    </div>
  )
}

export default App
