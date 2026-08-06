import type { ManualFieldState } from '../../time/ManualField'

export const FIELD_STATE_STYLES: Record<ManualFieldState, string> = {
  default: 'border-navy/[0.08] focus-within:border-brand/40',
  error: 'border-orange/30 bg-orange-tint/25 focus-within:border-orange/45',
  warning: 'border-yellow/35 bg-yellow-tint/40 focus-within:border-yellow/50',
}

export const TRACKER_INPUT_CLASS =
  'h-9 rounded-lg border border-navy/[0.08] bg-white px-2 text-sm leading-9 text-navy shadow-[0_1px_2px_rgba(31,43,77,0.04)] outline-none transition-colors'

/** Shared tracker field value typography — date pickers and duration input. */
export const TRACKER_VALUE_CLASS = 'text-sm font-medium tabular-nums text-navy'
export const TRACKER_TIME_CLASS = 'text-sm font-medium tabular-nums text-navy/50'

export const MODAL_LABEL_CLASS =
  'mb-1.5 block font-display text-label font-semibold text-navy/70'

/** Fixed modal picker row height — date trigger and duration input share this. */
export const MODAL_PICKER_HEIGHT_CLASS = 'h-[33px]'

export const MODAL_INPUT_CLASS =
  'w-full rounded-md border-control border-navy/[0.08] bg-white px-3 py-field text-body text-navy outline-none transition-colors focus:border-brand'

/** Value text inside modal date/duration controls — explicit size overrides input UA styles. */
export const MODAL_PICKER_VALUE_CLASS =
  'text-[0.8125rem] font-normal leading-none text-navy'

export const MODAL_PICKER_INPUT_CLASS =
  'box-border block h-[33px] w-full min-w-0 appearance-none rounded-md border border-navy/[0.08] bg-white px-3 font-sans outline-none transition-colors'

export const CALENDAR_CELL_CLASS =
  'mx-auto flex size-8 cursor-default items-center justify-center rounded-full text-[13px] font-mono tabular-nums text-navy outline-none hover:bg-surface-muted pressed:bg-surface-muted selected:bg-ink selected:text-white outside-month:invisible outside-month:pointer-events-none disabled:text-navy/25'
