/**
 * Small labelled status/role indicator: a coloured dot followed by text.
 * Used in the members table for role and account status.
 */
export function Pill({ label, dotClassName }: { label: string; dotClassName: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 text-md font-semibold text-navy/80">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClassName}`} />
      {label}
    </span>
  )
}
