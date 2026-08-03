import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AssistantMessage } from '../../types/assistant'

/**
 * Renders a single chat message (user or assistant).
 * Assistant messages render markdown; user messages are plain text.
 */
export function ChatMessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isUser ? (
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-brand px-4 py-2.5 text-body leading-[1.6] text-white">
          {message.content}
        </div>
      ) : (
        <div className="max-w-[85%] rounded-2xl bg-surface-muted px-4 py-2.5 text-body leading-[1.6] text-navy">
          <div className="prose-assistant prose-sm prose-navy max-w-none leading-[1.6]">
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          </div>
        </div>
      )}
    </div>
  )
}
