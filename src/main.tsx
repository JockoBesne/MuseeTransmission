import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.tsx'
import { installWatchdog } from './utils/watchdog'

// Borne tactile : bloque le menu contextuel (appui long / clic droit) qui
// permettrait de sortir du contenu en mode kiosque.
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Avant le rendu : une erreur au tout premier montage doit déjà être rattrapée.
installWatchdog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
