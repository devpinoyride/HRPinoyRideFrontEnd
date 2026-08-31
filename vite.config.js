import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev proxy forwards /api and /auth to the deployed C# API on Render, so
// local development works without running the backend locally. To test against
// a locally running API instead, start it and run:
//   API_PROXY_TARGET=http://localhost:5000 npm run dev   (macOS/Linux)
//   $env:API_PROXY_TARGET='http://localhost:5000'; npm run dev   (PowerShell)
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || 'https://hrpinoyridebackend.onrender.com'

// Auto-open the dev server in Google Chrome. Vite picks the browser from the
// BROWSER environment variable, so set it here (before the server starts)
// unless it was already overridden externally.
process.env.BROWSER ||= 'chrome'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': { target: API_PROXY_TARGET, changeOrigin: true },
      '/auth': { target: API_PROXY_TARGET, changeOrigin: true }
    }
  },
  preview: {
    open: true
  }
})