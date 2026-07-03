/**
 * ReeTrack logo mark: a navy rounded square with three cream bars (the "E").
 * Used on the standalone auth screens.
 */
export function BrandMark({ className = 'h-[52px] w-[52px]' }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-[16px] bg-navy ${className}`}>
      <span className="flex h-[22px] w-[22px] flex-col justify-between">
        <span className="h-[14%] w-full rounded-[1px] bg-cream" />
        <span className="h-[14%] w-full rounded-[1px] bg-cream" />
        <span className="h-[14%] w-full rounded-[1px] bg-cream" />
      </span>
    </span>
  )
}
