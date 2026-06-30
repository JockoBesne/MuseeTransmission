import { useState } from 'react'
import Memorial from './components/Memorial/Memorial'
import './App.css'

/* ── Panneau gauche avec onglets ── */
const LEFT_TABS = ['Carte des RT', 'Mémorial'] as const
type LeftTab = typeof LEFT_TABS[number]

function LeftPanel() {
  const [activeTab, setActiveTab] = useState<LeftTab>('Carte des RT')
  const activeIndex = LEFT_TABS.indexOf(activeTab)

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
        {activeTab === 'Carte des RT' && <div className="tab-pane" />}
        {activeTab === 'Mémorial' && <Memorial />}
      </div>
    </div>
  )
}

/* ── Panneau droit ── */
function RightPanel() {
  return (
    <div className="panel panel-right" />
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
