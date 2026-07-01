import { useCallback, useEffect, useState } from 'react'
import './App.css'

type BackendStatus = 'checking' | 'online' | 'offline'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

function App() {
  const [status, setStatus] = useState<BackendStatus>('checking')

  const checkHealth = useCallback(() => {
    setStatus('checking')

    fetch(`${API_BASE_URL}/health`)
      .then((res) => (res.ok ? setStatus('online') : setStatus('offline')))
      .catch(() => setStatus('offline'))
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  const statusLabel: Record<BackendStatus, string> = {
    checking: 'Checking...',
    online: 'Backend online',
    offline: 'Backend offline',
  }

  return (
    <section id="landing">
      <h1>ReeTrack</h1>
      <p>Track time</p>

      <div className={`status status-${status}`}>
        <span className="status-dot" />
        {statusLabel[status]}
      </div>

      <button type="button" className="retry" onClick={checkHealth}>
        Recheck
      </button>
    </section>
  )
}

export default App
