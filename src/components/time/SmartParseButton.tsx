import { Icon } from '../ui/Icon'

type SmartParseButtonProps = {
  disabled?: boolean
  loading?: boolean
  onClick: () => void
  className?: string
}

export function SmartParseButton({
  disabled = false,
  loading = false,
  onClick,
  className = '',
}: SmartParseButtonProps) {
  return (
    <button
      type="button"
      title="Describe your work with AI"
      aria-label="Open AI time entry input"
      disabled={disabled || loading}
      onClick={onClick}
      className={`flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      ) : (
        <Icon name="sparkle" className="size-4" />
      )}
    </button>
  )
}
