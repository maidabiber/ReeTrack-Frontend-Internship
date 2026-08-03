import { Icon } from '../ui/Icon'

export function AccessDenied({
  title = "You don't have access",
  description = 'This area is not available for your workspace role.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-10 py-8">
      <div className="max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-card">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-navy/60">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-lg font-bold text-navy">{title}</h1>
        <p className="mt-1.5 text-body leading-[1.5] text-navy/60">{description}</p>
      </div>
    </div>
  )
}
