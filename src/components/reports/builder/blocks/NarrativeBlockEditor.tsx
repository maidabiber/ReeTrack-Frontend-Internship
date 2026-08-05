import type { NarrativeBlockSpec } from '../../../../types/customReport'

/**
 * Narrative config only — Generate / Refresh lands in FE4.
 * Cached prose still renders through the IR preview when present.
 */
export function NarrativeBlockEditor({
  block,
  onChange,
}: {
  block: NarrativeBlockSpec
  onChange: (next: NarrativeBlockSpec) => void
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">
          Focus (optional)
        </span>
        <input
          value={block.focus ?? ''}
          onChange={(event) => onChange({ ...block, focus: event.target.value || null })}
          placeholder="e.g. margin by client"
          className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-body text-navy outline-none focus:border-brand"
        />
      </label>

      {block.cachedText ? (
        <div className="rounded-xl bg-surface-muted/70 px-3 py-2.5 text-body leading-[1.5] text-navy/80">
          {block.cachedText}
          {block.generatedAtUtc ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-navy/40">
              Generated {new Date(block.generatedAtUtc).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-body text-navy/50">
          Narrative generation arrives in a later slice. Run the report to see any cached summary.
        </p>
      )}
    </div>
  )
}
