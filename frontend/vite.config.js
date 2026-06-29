import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // PROXY: cuando React pide /auth/..., Vite lo redirige al backend.
    // Así el navegador cree que todo está en el mismo servidor → no hay CORS.
    proxy: {
      '/auth':     'http://localhost:4000',
      '/usuarios': 'http://localhost:4000',
      '/me':       'http://localhost:4000'
    }
  }
})
