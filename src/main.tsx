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

// Borne tactile : un balayage horizontal déclenchait encore le retour arrière
// d'Edge (écran blanc jusqu'au soir) — ni le drapeau kiosque
// --overscroll-history-navigation=0 ni overscroll-behavior:none ne l'arrêtent
// de façon fiable. L'app n'a aucun routage : on ajoute une entrée d'historique
// factice et on la remet en place à chaque tentative de retour.
history.pushState(null, '', location.href)
window.addEventListener('popstate', () => {
  history.pushState(null, '', location.href)
})

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
