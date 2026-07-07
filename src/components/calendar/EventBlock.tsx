import type { CalendarEvent, EventColor } from './types'
import { formatTimeRange } from './dateUtils'

const EVENT_COLOR_CLASSES: Record<EventColor, { bg: string; ring: string }> = {
  purple: { bg: 'bg-brand-tint', ring: 'ring-brand' },
  orange: { bg: 'bg-orange-tint', ring: 'ring-orange' },
  green: { bg: 'bg-green-tint', ring: 'ring-green' },
  yellow: { bg: 'bg-yellow-tint', ring: 'ring-yellow' },
}

interface EventBlockProps {
  event: CalendarEvent
  top: number
  height: number
  left?: number
  width?: number
  selected?: boolean
  compact?: boolean
  onClick?: () => void
}

export function EventBlock({
  event,
  top,
  height,
  left = 0,
  width = 100,
  selected = false,
  compact = false,
  onClick,
}: EventBlockProps) {
  const colors = EVENT_COLOR_CLASSES[event.color ?? 'purple']

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute overflow-hidden rounded-[8px] px-2 py-0.5 text-left transition-shadow ${colors.bg} ${
        selected ? `ring-2 ${colors.ring} ring-offset-1` : 'hover:brightness-[0.97]'
      }`}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        minHeight: compact ? 18 : 22,
      }}
    >
      <div className="truncate font-display text-[11px] font-semibold leading-tight text-navy">
        {event.title}
      </div>
      {!compact && height > 3 && (
        <div className="truncate text-[10px] text-navy/55">
          {formatTimeRange(event.start, event.end)}
        </div>
      )}
    </button>
  )
}
