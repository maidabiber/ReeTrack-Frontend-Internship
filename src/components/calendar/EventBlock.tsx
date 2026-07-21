import { useState } from 'react'
import type { CalendarEvent } from './types'
import { formatTimeRange, hoverMinDisplayHeightPercent, hoverMinDisplayHeightPx } from './dateUtils'
import { DEFAULT_HOUR_HEIGHT } from './hourZoom'

const DEFAULT_EVENT_COLOR = '#EEF1FD'

interface EventBlockProps {
  event: CalendarEvent
  top: number
  height: number
  hourHeight?: number
  viewportHeight?: number
  totalColumns?: number
  left?: number
  width?: number
  selected?: boolean
  compact?: boolean
  editable?: boolean
  isDragSource?: boolean
  isDragPreview?: boolean
  isResizePreview?: boolean
  onPointerDown?: (event: React.PointerEvent) => void
  onResizeStartPointerDown?: (event: React.PointerEvent) => void
  onResizeEndPointerDown?: (event: React.PointerEvent) => void
  onClick?: () => void
}

export function EventBlock({
  event,
  top,
  height,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800,
  totalColumns = 1,
  left = 0,
  width = 100,
  selected = false,
  compact = false,
  editable = false,
  isDragSource = false,
  isDragPreview = false,
  isResizePreview = false,
  onPointerDown,
  onResizeStartPointerDown,
  onResizeEndPointerDown,
  onClick,
}: EventBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  const eventColor = event.color ?? DEFAULT_EVENT_COLOR

  const dayHeightPx = hourHeight * 24
  const minHeightPx = compact ? 18 : 22
  const renderedHeightPx = Math.max((height / 100) * dayHeightPx, minHeightPx)
  const minHoverHeightPx = hoverMinDisplayHeightPx(viewportHeight)
  const suppressHover = isDragSource || isDragPreview || isResizePreview
  const isStretched = !suppressHover && isHovered && renderedHeightPx < minHoverHeightPx
  const displayHeight = isStretched
    ? hoverMinDisplayHeightPercent(viewportHeight, hourHeight)
    : height

  const isOverlapExpanded = !suppressHover && isHovered && totalColumns > 1
  const displayLeft = isOverlapExpanded ? 0 : left
  const displayWidth = isOverlapExpanded ? 100 : width
  const isElevated =
    isDragPreview || isResizePreview || (!suppressHover && isHovered && (isStretched || isOverlapExpanded))
  const showResizeHandles = editable && !isDragSource && !isDragPreview && !isResizePreview
  const disableTransition = isDragPreview || isResizePreview

  return (
    <div
      className={`absolute touch-none ${disableTransition ? '' : 'transition-[height,left,width,box-shadow,opacity,transform] duration-150 ease-out'} ${
        isElevated ? 'z-50' : ''
      }`}
      style={{
        top: `${top}%`,
        height: `${displayHeight}%`,
        left: `calc(${displayLeft}% + 2px)`,
        width: `calc(${displayWidth}% - 4px)`,
        minHeight: minHeightPx,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onPointerDown={(pointerEvent) => {
          pointerEvent.stopPropagation()
          onPointerDown?.(pointerEvent)
        }}
        onClick={onClick}
        style={{
          backgroundColor: eventColor,
          ...(selected ? { outline: `2px solid ${eventColor}`, outlineOffset: '1px' } : {}),
        }}
        className={`h-full w-full rounded-sm px-2 py-0.5 text-left ${
          isElevated ? 'overflow-visible shadow-lg' : 'overflow-hidden'
        } ${isDragSource ? 'opacity-30' : ''} ${
          isDragPreview || isResizePreview
            ? 'scale-[1.02] cursor-grabbing'
            : editable
              ? 'cursor-grab'
              : 'cursor-pointer'
        } ${!selected && !isDragPreview && !isResizePreview ? 'hover:brightness-[0.97]' : ''}`}
      >
        <div className="truncate font-display text-xs font-semibold leading-tight text-navy">
          {event.title}
        </div>
        {(isHovered || isDragPreview || isResizePreview) && (
          <div className="truncate text-xs text-navy/55">
            {formatTimeRange(event.start, event.end)}
          </div>
        )}
      </button>

      {showResizeHandles ? (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize start time"
            className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize"
            onPointerDown={(pointerEvent) => {
              pointerEvent.stopPropagation()
              onResizeStartPointerDown?.(pointerEvent)
            }}
          />
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize end time"
            className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
            onPointerDown={(pointerEvent) => {
              pointerEvent.stopPropagation()
              onResizeEndPointerDown?.(pointerEvent)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
