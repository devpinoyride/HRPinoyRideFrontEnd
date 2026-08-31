import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During local development the API is proxied so the SPA can talk to the
// backend on the same origin. For production, set VITE_API_URL to the API's URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/auth': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
})