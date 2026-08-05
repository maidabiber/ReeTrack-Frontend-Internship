export function LiveIndicator({ state }: { state: string }) {
  const label =
    state === 'connected'
      ? 'Live'
      : state === 'reconnecting'
        ? 'Reconnecting…'
        : 'Offline'

  const dotColor =
    state === 'connected'
      ? 'bg-green'
      : state === 'reconnecting'
        ? 'bg-orange'
        : 'bg-navy/30'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-navy/50">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  )
}
