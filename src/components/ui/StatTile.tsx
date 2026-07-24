export interface StatDelta {
  /** Percentage change; null when there is no comparable prior window. */
  pct: number | null
  /** What the change is measured against, e.g. "vs prior 4 weeks". */
  caption: string
}

/** Compact KPI tile used on reports surfaces, optionally showing period-over-period change. */
export function StatTile({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: StatDelta
}) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-card">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-navy/45">{label}</p>
      <p className="mt-1 font-mono text-xl font-medium text-navy">{value}</p>
      {delta ? <DeltaChip {...delta} /> : null}
    </div>
  )
}

function DeltaChip({ pct, caption }: StatDelta) {
  if (pct === null) {
    return <p className="mt-1.5 text-xs text-navy/40">No prior {caption.replace(/^vs /, '')}</p>
  }

  // Flat within half a percent — an arrow there reads as noise, not signal.
  const flat = Math.abs(pct) < 0.5
  const tone = flat ? 'text-navy/45' : pct > 0 ? 'text-green' : 'text-red'
  const arrow = flat ? '→' : pct > 0 ? '▲' : '▼'

  return (
    <p className={`mt-1.5 text-xs ${tone}`}>
      <span aria-hidden>{arrow} </span>
      {flat ? 'Flat' : `${Math.abs(pct).toFixed(1)}%`}
      <span className="text-navy/40"> {caption}</span>
    </p>
  )
}
