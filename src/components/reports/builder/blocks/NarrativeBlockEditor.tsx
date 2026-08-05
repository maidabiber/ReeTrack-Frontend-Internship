import { useState } from 'react'
import { apiErrorMessage } from '../../../../api/client'
import { generateCustomReportInsights } from '../../../../api/customReports'
import type { CustomReportSpec, NarrativeBlockSpec } from '../../../../types/customReport'
import { Icon } from '../../../ui/Icon'

/**
 * Generation is explicit. Running a report is fast and free; a model call is neither, and
 * folding it into every run would make two exports of the same report differ.
 */
export function NarrativeBlockEditor({
  block,
  spec,
  onChange,
}: {
  block: NarrativeBlockSpec
  /** The draft spec, sent as the data the insights describe. */
  spec: CustomReportSpec
  onChange: (next: NarrativeBlockSpec) => void
}) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasBlocksToDescribe = spec.blocks.some((candidate) => candidate.type !== 'narrative')

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const insights = await generateCustomReportInsights(spec, block.id)
      onChange({
        ...block,
        cachedText: insights.paragraphs.join('\n'),
        generatedAtUtc: insights.generatedAtUtc,
        generatedForFingerprint: insights.fingerprint,
      })
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Could not generate insights.'))
    } finally {
      setGenerating(false)
    }
  }

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

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating || !hasBlocksToDescribe}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-body font-medium text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="sparkle" className="h-3.5 w-3.5" />
          {generating ? 'Generating…' : block.cachedText ? 'Regenerate' : 'Generate insights'}
        </button>
        {block.cachedText ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                cachedText: null,
                generatedAtUtc: null,
                generatedForFingerprint: null,
              })
            }
            disabled={generating}
            className="rounded-full px-3 py-2 text-body font-medium text-navy/60 hover:bg-surface-muted disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {!hasBlocksToDescribe ? (
        <p className="text-body text-navy/50">
          Add a KPI, breakdown, or chart block first — there is nothing to comment on yet.
        </p>
      ) : null}

      {error ? <p className="text-body text-red">{error}</p> : null}

      {block.cachedText ? (
        <div className="space-y-2 rounded-xl bg-surface-muted/70 px-3 py-2.5 text-body leading-[1.5] text-navy/80">
          {block.cachedText.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {block.generatedAtUtc ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/40">
              Generated {new Date(block.generatedAtUtc).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-body text-navy/50">
          Figures come straight from the report — the model only chooses what is worth pointing at.
        </p>
      )}
    </div>
  )
}
