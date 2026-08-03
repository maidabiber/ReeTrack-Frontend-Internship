/**
 * Typed SSE (Server-Sent Events) client for consuming the assistant streaming endpoint.
 * Uses fetch + ReadableStream for broad browser support.
 */

export interface SSEEvent {
  event: string
  data: string
}

export interface SSEConnection {
  close: () => void
  /** Promise that resolves when the stream ends or rejects on error. */
  finished: Promise<void>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * Opens an SSE connection via POST and calls `onEvent` for each received event.
 * Returns a handle to close the connection and a promise for completion.
 */
export function streamAssistantChat(
  body: unknown,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Error) => void,
): SSEConnection {
  const controller = new AbortController()

  const finished = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`SSE request failed: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            onEvent({ event: currentEvent || 'message', data })
            currentEvent = ''
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
    }
  })()

  return {
    close: () => controller.abort(),
    finished,
  }
}
