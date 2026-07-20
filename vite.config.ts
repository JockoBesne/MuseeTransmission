import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // L'API admin vit dans le serveur de la borne (npm run borne) ;
    // en dev, on la lui relaie pour pouvoir tester l'écran « Modifier le mémorial ».
    proxy: {
      '/api': 'http://localhost:3210',
    },
  },
})
