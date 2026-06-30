import { useState } from 'react'
import Memorial from './components/Memorial'
import './App.css'

interface PanelProps {
  side: 'left' | 'right'
  title: string
}

function Panel({ side, title }: PanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`panel panel-${side}`}>
      <h2>{title}</h2>
      <button className="open-btn" onClick={() => setOpen(true)}>
        Ouvrir la boîte de dialogue
      </button>

      {open && (
        <div className="dialog-overlay" onClick={() => setOpen(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Boîte de dialogue — {title}</h3>
            <p>Contenu indépendant du panneau {side === 'left' ? 'gauche' : 'droit'}.</p>
            <button className="close-btn" onClick={() => setOpen(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <div className="split-screen">
      <Memorial />
      <div className="divider" />
      <Panel side="right" title="Panneau droit" />
    </div>
  )
}

export default App
