import { PAGE_PAD } from '../layout/pageChrome'
import { Icon } from '../ui/Icon'

/** Shown on report pages when a non-admin lands on one. */
export function AdminsOnly({
  message = 'Custom reports are available to workspace admins.',
}: {
  message?: string
}) {
  return (
    <div className={`flex min-h-full flex-1 items-center justify-center ${PAGE_PAD}`}>
      <div className="max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-card">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-navy/60">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-lg font-bold text-navy">Admins only</h1>
        <p className="mt-1.5 text-body leading-[1.5] text-navy/60">{message}</p>
      </div>
    </div>
  )
}
