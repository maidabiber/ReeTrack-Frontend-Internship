import logoFull from '../../assets/logo_full.png'

/**
 * ReeTrack wordmark, rendered from the brand logo asset. The source PNG is
 * white strokes on a transparent background, so it's applied as a CSS mask
 * with `bg-current` rather than an <img> — that lets it take the surrounding
 * text color (e.g. navy on a white auth card) instead of disappearing.
 */
export function LogoMark({ className = 'h-9', label = 'ReeTrack' }: { className?: string; label?: string }) {
  return (
    <span
      aria-label={label}
      className={`inline-block bg-current ${className}`}
      style={{
        aspectRatio: '496 / 102',
        maskImage: `url(${logoFull})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskImage: `url(${logoFull})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}
