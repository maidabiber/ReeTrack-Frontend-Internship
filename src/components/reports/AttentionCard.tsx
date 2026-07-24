import type { AttentionItem } from '../../lib/reportView'
import { Icon } from '../ui/Icon'

/**
 * Signals worth acting on, at the top of the report. Callers render this only when
 * there is something to say — an "all clear" panel is noise on a dashboard.
 */
export function AttentionCard({ items }: { items: AttentionItem[] }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-tint text-orange">
          <Icon name="alert" className="h-3.5 w-3.5" />
        </span>
        <h3 className="font-display text-body font-bold text-navy">Needs attention</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 text-body">
            <span className="font-medium text-navy">{item.label}</span>
            <span className="text-caption text-navy/50">{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
