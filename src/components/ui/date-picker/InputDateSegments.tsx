import { DateField, DateInput, DateSegment } from 'react-aria-components'
import { cn } from '../../../lib/utils'

type InputDateSegmentsProps = {
  className?: string
  compact?: boolean
}

export function InputDateSegments({ className = '', compact = false }: InputDateSegmentsProps) {
  return (
    <DateField aria-label="Date" granularity="day" className={cn('flex-1', className)}>
      <DateInput
        className={cn(
          'flex items-center rounded-md border border-navy/10 bg-surface-muted font-sans text-navy tabular-nums outline-none transition-colors focus-within:border-brand/40',
          compact ? 'h-8 px-2 text-sm' : 'h-9 px-2.5 text-sm',
        )}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className="rounded-xs px-0.5 outline-none placeholder-shown:text-navy/35 focus:bg-brand-tint focus:text-navy"
          />
        )}
      </DateInput>
    </DateField>
  )
}
