import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Redirige les appels /api vers le backend pour éviter les problèmes de CORS en développement.
      proxy: {
        '/api': env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
      },
    },
  }
})
