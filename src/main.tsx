import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { TimerProvider } from './context/TimerContext'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TimerProvider>
        <RouterProvider router={router} />
      </TimerProvider>
    </AuthProvider>
  </StrictMode>,
)
