/**
 * ReeTrack wordmark. Set in caps, with each "E" drawn as three horizontal bars
 * and no vertical stem — echoing the BrandMark logo. Bars use `bg-current`, so
 * the whole mark takes its colour from the surrounding `text-*` (e.g. white on
 * the ink sidebar). Sized in `em`, so it scales with the parent font size.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="ReeTrack"
      className={`inline-flex items-center font-display font-bold uppercase leading-none tracking-[0.05em] ${className}`}
    >
      <span aria-hidden="true">R</span>
      <EBars />
      <EBars />
      <span aria-hidden="true">TRACK</span>
    </span>
  )
}

function EBars() {
  return (
    <span
      aria-hidden="true"
      className="mx-[0.1em] inline-flex h-[0.68em] w-[0.46em] flex-col justify-between"
    >
      <span className="h-[16%] w-full rounded-[1px] bg-current" />
      <span className="h-[16%] w-full rounded-[1px] bg-current" />
      <span className="h-[16%] w-full rounded-[1px] bg-current" />
    </span>
  )
}
