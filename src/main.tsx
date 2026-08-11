import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.tsx'
import { installWatchdog } from './utils/watchdog'
import { installMultiTouchTap } from './utils/multiTouchTap'

// Borne tactile : bloque le menu contextuel (appui long / clic droit) qui
// permettrait de sortir du contenu en mode kiosque.
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Rend les boutons cliquables quand un second doigt est déjà posé ailleurs
// sur la dalle (voir le commentaire du module).
installMultiTouchTap()

// Avant le rendu : une erreur au tout premier montage doit déjà être rattrapée.
installWatchdog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
