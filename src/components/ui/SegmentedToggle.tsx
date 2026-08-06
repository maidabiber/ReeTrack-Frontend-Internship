/**
 * Segmented toggle per design.md §5: white track, mono uppercase labels,
 * active segment flips to navy/cream. Shared by view/status toggles.
 */
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="flex w-fit rounded-full bg-surface-muted p-segment">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
          className={`rounded-full px-3.5 py-compact font-mono text-eyebrow font-medium tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            value === option.value ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
