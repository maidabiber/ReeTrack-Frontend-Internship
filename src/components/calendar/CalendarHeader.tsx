import type { ReactNode } from 'react'
import type { CalendarViewMode } from './types'
import { formatHeaderLabel } from './dateUtils'
import { MAX_HOUR_HEIGHT, MIN_HOUR_HEIGHT } from './hourZoom'
import { Icon } from '../ui/Icon'

interface CalendarHeaderProps {
  selectedDate: Date
  viewMode: CalendarViewMode
  onViewModeChange: (mode: CalendarViewMode) => void
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  hourHeight: number
  onZoomIn: () => void
  onZoomOut: () => void
}

export function CalendarHeader({
  selectedDate,
  viewMode,
  onViewModeChange,
  onToday,
  onPrev,
  onNext,
  hourHeight,
  onZoomIn,
  onZoomOut,
}: CalendarHeaderProps) {
  const canZoomOut = hourHeight > MIN_HOUR_HEIGHT
  const canZoomIn = hourHeight < MAX_HOUR_HEIGHT

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-navy/8 px-4 py-3">
        <div className="flex items-center gap-1">
        <NavButton label="Previous" onClick={onPrev} />
        <NavButton label="Next" onClick={onNext} direction="right" />
      </div>

      <h2 className="min-w-0 flex-1 font-display text-[15px] font-bold text-navy">
        {formatHeaderLabel(selectedDate, viewMode)}
      </h2>

      <div className="flex items-center gap-1">
        <ZoomButton label="Zoom out" onClick={onZoomOut} disabled={!canZoomOut}>
          −
        </ZoomButton>
        <ZoomButton label="Zoom in" onClick={onZoomIn} disabled={!canZoomIn}>
          +
        </ZoomButton>
      </div>

      <div className="flex rounded-full bg-surface-muted p-[3px]">
        <ToggleButton active={viewMode === 'day'} onClick={() => onViewModeChange('day')}>
          Day
        </ToggleButton>
        <ToggleButton active={viewMode === 'week'} onClick={() => onViewModeChange('week')}>
          Week
        </ToggleButton>
      </div>
    </div>
  )
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-[10px] font-display text-[16px] font-semibold leading-none text-navy/55 hover:bg-surface-muted hover:text-navy disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-navy/55"
    >
      {children}
    </button>
  )
}

function NavButton({
  label,
  onClick,
  direction = 'left',
}: {
  label: string
  onClick: () => void
  direction?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-[10px] text-navy/55 hover:bg-surface-muted hover:text-navy"
    >
      <Icon
        name="chevron-right"
        className={`h-4 w-4 ${direction === 'left' ? 'rotate-180' : ''}`}
      />
    </button>
  )
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold ${
        active ? 'bg-navy text-cream' : 'text-navy/55'
      }`}
    >
      {children}
    </button>
  )
}
