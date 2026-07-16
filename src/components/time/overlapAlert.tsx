import { CenteredAlertModal } from './CenteredAlertModal'

function formatOverlapMessage(message: string) {
  const trimmed = message.trim()
  const match = trimmed.match(/^This entry overlaps with:\s*(.+)\.?$/i)
  if (!match) return trimmed

  const labels = match[1]
    .replace(/\.$/, '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)

  if (labels.length === 0) return trimmed

  return (
    <>
      This entry overlaps with:{' '}
      {labels.map((label, index) => (
        <span key={`${label}-${index}`}>
          {index > 0 ? ', ' : null}
          <strong className="font-semibold text-navy">{label}</strong>
        </span>
      ))}
      . Please change the times before saving.
    </>
  )
}

export function OverlapAlertModal({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <CenteredAlertModal
      title="Time overlap"
      message={formatOverlapMessage(message)}
      titleId="overlap-alert-title"
      messageId="overlap-alert-message"
      onDismiss={onDismiss}
      primaryLabel="Got it"
      onPrimary={onDismiss}
    />
  )
}