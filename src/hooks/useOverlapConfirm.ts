import { useState } from 'react'
import { timeEntryApiErrorMessage } from '../api/timeEntries'
import { isOverlapConflictError } from '../lib/overlapErrors'

export function useOverlapConfirm() {
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [pendingOverlapConfirm, setPendingOverlapConfirm] = useState(false)

  const clearOverlapConfirm = () => {
    setOverlapWarning(null)
    setPendingOverlapConfirm(false)
  }

  const showOverlapConfirm = Boolean(pendingOverlapConfirm && overlapWarning)

  const saveWithOverlapConfirm = async (
    confirmOverlap: boolean,
    {
      validationError,
      onValidationError,
      onClearError,
      save,
      onOtherError,
    }: {
      validationError: string | null
      onValidationError: (message: string) => void
      onClearError?: () => void
      save: (confirmOverlap: boolean) => Promise<void>
      onOtherError?: (err: unknown) => void
    },
  ) => {
    onClearError?.()

    if (validationError) {
      onValidationError(validationError)
      return
    }

    try {
      await save(confirmOverlap)
      clearOverlapConfirm()
    } catch (err) {
      if (!confirmOverlap && isOverlapConflictError(err)) {
        setOverlapWarning(
          timeEntryApiErrorMessage(err, 'This entry overlaps with an existing entry.'),
        )
        setPendingOverlapConfirm(true)
        return
      }

      onOtherError?.(err)
    }
  }

  return {
    overlapWarning,
    pendingOverlapConfirm,
    showOverlapConfirm,
    clearOverlapConfirm,
    saveWithOverlapConfirm,
  }
}
