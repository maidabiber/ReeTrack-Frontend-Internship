import { CenteredAlertModal } from './CenteredAlertModal'

export function DurationLimitModal({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <CenteredAlertModal
      title="Duration too long"
      message={message}
      titleId="duration-limit-title"
      messageId="duration-limit-message"
      onDismiss={onDismiss}
      primaryLabel="Got it"
      onPrimary={onDismiss}
    />
  )
}