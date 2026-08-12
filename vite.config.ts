import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Le seuil par défaut (500 kB) mesure un coût de téléchargement : sans
    // objet pour une borne hors-ligne, servie depuis son disque local. Plus
    // de la moitié du bundle est constituée des données (contour de la
    // France, zones, villes FR/EN, frise FR/EN) et découper l'app en
    // plusieurs chunks ne ferait que multiplier les fichiers locaux.
    // Relevé pour taire l'avertissement, sans le désactiver : un bundle qui
    // dépasserait 1 Mo signalerait, lui, une vraie anomalie.
    chunkSizeWarningLimit: 1000,
  },
  server: {
    // L'API admin vit dans le serveur de la borne (npm run borne) ;
    // en dev, on la lui relaie pour pouvoir tester l'écran « Modifier le mémorial ».
    proxy: {
      '/api': 'http://localhost:3210',
    },
  },
})
