import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend (ReeTrack.Api) HTTP dev port — default `dotnet run` profile (see launchSettings.json).
// Use the https profile (port 7231) only if you start the API with `dotnet run --launch-profile https`.
const BACKEND_HTTP_PORT = 7231

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Keep heavy deps in their own chunks so the eager Timer shell stays
        // under the 500 kB warning even with react-aria on the landing page.
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react-dom|react-router(?:-dom)?|scheduler|react)(?:[\\/]|$)/,
              priority: 40,
            },
            {
              name: 'recharts',
              test: /node_modules[\\/]recharts(?:[\\/]|$)/,
              priority: 30,
            },
            {
              name: 'react-aria',
              test: /node_modules[\\/](?:react-aria-components|@internationalized)(?:[\\/]|$)/,
              priority: 25,
            },
            {
              name: 'dicebear',
              test: /node_modules[\\/]@dicebear(?:[\\/]|$)/,
              priority: 20,
            },
            {
              name: 'dnd-kit',
              test: /node_modules[\\/]@dnd-kit(?:[\\/]|$)/,
              priority: 20,
            },
          ],
        },
        strictExecutionOrder: true,
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/.vs/**'],
    },
    proxy: {
      '/api': {
        target: `https://localhost:${BACKEND_HTTP_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: `https://localhost:${BACKEND_HTTP_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})