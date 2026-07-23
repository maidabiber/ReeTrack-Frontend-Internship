/** Compact KPI tile used on timesheet / reports surfaces. */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-card">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-navy/45">{label}</p>
      <p className="mt-1 font-mono text-xl font-medium text-navy">{value}</p>
    </div>
  )
}
