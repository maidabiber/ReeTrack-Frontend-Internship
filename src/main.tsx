import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { TimerProvider } from './context/TimerContext'
import { PomodoroProvider } from './context/PomodoroContext'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationsProvider>
        <TimerProvider>
          <PomodoroProvider>
            <RouterProvider router={router} />
          </PomodoroProvider>
        </TimerProvider>
      </NotificationsProvider>
    </AuthProvider>
  </StrictMode>,
)
