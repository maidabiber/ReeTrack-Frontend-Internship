/**
 * Compact removable chip used for tracker / entry metadata (project·task, tags).
 * Boxy badge; fill uses the item accent colour.
 */
export function MetadataBubble({
  label,
  color,
  onRemove,
  title,
}: {
  label: string
  color?: string | null
  onRemove?: () => void
  title?: string
}) {
  const fill = color?.trim() || '#C7CDDB'

  return (
    <span
      title={title ?? label}
      className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-white shadow-soft"
      style={{ backgroundColor: `color-mix(in srgb, ${fill} 85%, black)` }}
    >
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm text-white/80 hover:bg-black/15 hover:text-white"
        >
          <span aria-hidden="true" className="text-md leading-none">
            ×
          </span>
        </button>
      ) : null}
    </span>
  )
}
