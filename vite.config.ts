import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend (ReeTrack.Api) HTTPS dev port, see backend/src/ReeTrack.Api/Properties/launchSettings.json
const BACKEND_HTTPS_PORT = 7231

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `https://localhost:${BACKEND_HTTPS_PORT}`,
        changeOrigin: true,
        // Backend uses the ASP.NET Core dev-certs self-signed certificate.
        secure: false,
      },
    },
  },
})
