import { useState } from 'react'
import type { ReactNode } from 'react'
import { Modal } from './Modal'

export function ConfirmDeleteModal({
  title,
  message,
  confirmLabel = 'Delete',
  confirmingLabel = 'Deleting…',
  onCancel,
  onConfirm,
  cancelDisabled = false,
}: {
  title: string
  message: ReactNode
  confirmLabel?: string
  confirmingLabel?: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  cancelDisabled?: boolean
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const disabled = cancelDisabled || isConfirming

  const handleConfirm = async () => {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={() => {
        if (!isConfirming) onCancel()
      }}
    >
      <p className="text-body leading-normal text-navy/70">{message}</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={disabled}
          className="flex-1 rounded-full bg-red py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-red/90 disabled:opacity-50"
        >
          {isConfirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
