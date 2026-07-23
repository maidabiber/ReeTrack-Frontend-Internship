import { useRef } from 'react'
import { Icon } from '../ui/Icon'

type SmartParseDescriptionFieldProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onExit: () => void
  disabled?: boolean
  isParsing?: boolean
  error?: string | null
}

export function SmartParseDescriptionField({
  value,
  onChange,
  onSubmit,
  onExit,
  disabled = false,
  isParsing = false,
  error = null,
}: SmartParseDescriptionFieldProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="px-4 pt-5 pb-4 sm:px-5">
      <div className="rounded-2xl bg-brand-gradient p-px shadow-soft">
        <div className="rounded-[calc(var(--radius-2xl)-1px)] bg-white px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-micro font-semibold uppercase tracking-[0.08em] text-brand">
              AI time entry
            </p>
            <button
              type="button"
              onClick={onExit}
              disabled={disabled || isParsing}
              className="rounded-md p-1 text-navy/40 transition-colors hover:bg-surface-muted hover:text-navy/70 disabled:opacity-50"
              aria-label="Exit AI input"
            >
              <Icon name="x" className="size-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={value}
              disabled={disabled || isParsing}
              placeholder='Try: "2h on website redesign for Acme yesterday, billable"'
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  onExit()
                  return
                }

                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  onSubmit()
                }
              }}
              className="min-h-[2rem] min-w-0 flex-1 resize-none border-none bg-transparent py-0.5 font-sans text-lg leading-snug text-navy outline-none placeholder:font-medium placeholder:text-navy/35 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={disabled || isParsing || !value.trim()}
              onClick={onSubmit}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand-gradient px-3.5 py-1.5 text-micro font-semibold text-white shadow-soft transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <span
                    aria-hidden="true"
                    className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  />
                  Parsing…
                </>
              ) : (
                <>
                  <Icon name="sparkle" className="size-3" />
                  Parse
                </>
              )}
            </button>
          </div>

          {error ? (
            <p className="mt-2 text-sm text-red" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
