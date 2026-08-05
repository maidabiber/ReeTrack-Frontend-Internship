import type { OverviewScope } from '../../types/overview'

export function ScopeBadge({ scope, projectCount }: { scope: OverviewScope; projectCount?: number }) {
  const label =
    scope === 'workspace'
      ? 'All projects'
      : projectCount
        ? `Your projects (${projectCount})`
        : 'Your projects'

  return (
    <span className="rounded-xl bg-brand-tint px-2.5 py-1 text-xs font-medium text-brand">
      {label}
    </span>
  )
}
