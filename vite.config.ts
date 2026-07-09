import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend (ReeTrack.Api) HTTP dev port — default `dotnet run` profile (see launchSettings.json).
// Use the https profile (port 7231) only if you start the API with `dotnet run --launch-profile https`.
const BACKEND_HTTP_PORT = 7231

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: `https://localhost:${BACKEND_HTTP_PORT}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})