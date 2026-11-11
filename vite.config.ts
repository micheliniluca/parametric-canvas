import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In produzione il sito è pubblicato su GitHub Pages sotto /parametric-canvas/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/parametric-canvas/' : '/',
  // il catalogo profili (~700 kB, 130 kB compressi) è un file a parte caricato dopo l'avvio
  build: { chunkSizeWarningLimit: 800 },
}))
