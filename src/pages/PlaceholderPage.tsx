/**
 * Generic placeholder for nav destinations that don't have a screen yet.
 * Keeps the app navigable end-to-end while individual screens are built out
 * under their own tickets.
 */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 rounded-full bg-brand-tint px-3 py-1 font-mono text-[11px] font-medium tracking-[0.12em] text-brand uppercase">
        Coming soon
      </span>
      <h1 className="font-display text-3xl font-semibold text-navy">{title}</h1>
      <p className="mt-2 max-w-sm text-navy/60">
        This screen hasn't been built yet. It will be added in a later task.
      </p>
    </div>
  )
}
