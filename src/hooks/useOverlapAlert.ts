import { useState } from 'react'
import { timeEntryApiErrorMessage } from '../api/timeEntries'
import { isOverlapConflictError } from '../lib/timeEntryErrors'

export function useOverlapAlert() {
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)

  const clearOverlapAlert = () => {
    setOverlapWarning(null)
  }

  const showOverlapAlert = Boolean(overlapWarning)

  /** Tries to save; on overlap conflict shows the Got it alert instead. */
  const saveOrShowOverlapAlert = async ({
    validationError,
    onValidationError,
    onClearError,
    save,
    onOtherError,
  }: {
    validationError: string | null
    onValidationError: (message: string) => void
    onClearError?: () => void
    save: () => Promise<void>
    onOtherError?: (err: unknown) => void
  }) => {
    onClearError?.()

    if (validationError) {
      onValidationError(validationError)
      return
    }

    try {
      await save()
      clearOverlapAlert()
    } catch (err) {
      if (isOverlapConflictError(err)) {
        setOverlapWarning(
          timeEntryApiErrorMessage(err, 'This entry overlaps with an existing entry.'),
        )
        return
      }

      onOtherError?.(err)
    }
  }

  return {
    overlapWarning,
    showOverlapAlert,
    clearOverlapAlert,
    saveOrShowOverlapAlert,
  }
}