import { PROJECT_COLORS } from '../../lib/projectColors'

/**
 * A small colour picker: a "None" option followed by a fixed palette of swatches.
 * Used to give projects (RT-38) and tags (RT-44) an optional accent colour.
 * `value` is a hex string from PROJECT_COLORS, or null for no colour.
 */
export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  const normalized = value?.toUpperCase() ?? null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="No colour"
        aria-pressed={normalized === null}
        title="No colour"
        className={`flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] bg-white ${
          normalized === null ? 'border-navy' : 'border-navy/15'
        }`}
      >
        {/* Diagonal slash to read as "none". */}
        <span aria-hidden="true" className="h-4 w-px rotate-45 bg-navy/40" />
      </button>

      {PROJECT_COLORS.map((color) => {
        const selected = normalized === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={color}
            aria-pressed={selected}
            title={color}
            style={{ backgroundColor: color }}
            className={`h-7 w-7 rounded-full ring-offset-2 ${
              selected ? 'ring-2 ring-navy' : 'ring-0'
            }`}
          />
        )
      })}
    </div>
  )
}
