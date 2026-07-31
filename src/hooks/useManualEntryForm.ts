import { useState } from 'react'
import { apiErrorMessage } from '../api/client'

import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../lib/timeEntryErrors'
import { useOverlapAlert } from './useOverlapAlert'

import type { ManualFieldState } from '../components/time/ManualField'
import { useTimer } from './useTimer'
import type { Teammate } from '../lib/mention'
import {
  applyManualFieldChange,
  createDefaultManualEntry,
  formatManualDurationInput,
  MANUAL_ENTRY_MESSAGES,
  MAX_MANUAL_DURATION_SECONDS,
  parseDatetimeLocal,
  parseDurationInput,
  validateManualEntry,
} from '../lib/manualEntry'

export function useManualEntryForm({
  description,
  mentionedTeammates,
  onShared,
  onClearDescription,
  onClearMentions,
  onClearShareNotice,
}: {
  description: string
  mentionedTeammates: Teammate[]
  onShared: (notice: string) => void
  onClearDescription: () => void
  onClearMentions: () => void
  onClearShareNotice: () => void
}) {
  const { isInitializing, isSavingManual, addManualEntry } = useTimer()
  const overlapAlert = useOverlapAlert()

  const [manualEntry, setManualEntry] = useState(createDefaultManualEntry)
  const [durationInput, setDurationInput] = useState(() =>
    formatManualDurationInput(createDefaultManualEntry().durationSeconds),
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [durationParseError, setDurationParseError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)

  const validation = validateManualEntry(manualEntry, [], null)
  const endOrderError =
    manualEntry.end <= manualEntry.start ? MANUAL_ENTRY_MESSAGES.endBeforeStart : null
  const blockingError = validation.error ?? durationParseError ?? localError
  const timeFieldState: ManualFieldState = endOrderError ? 'error' : 'default'
  const durationFieldState: ManualFieldState = 'default'
  const showManualFeedback = Boolean(endOrderError)

  const clearFeedback = () => {
    setLocalError(null)
    setDurationParseError(null)
    setDurationLimitMessage(null)
    overlapAlert.clearOverlapAlert()
    onClearShareNotice()
  }

  const reset = () => {
    const defaults = createDefaultManualEntry()
    setManualEntry(defaults)
    setDurationInput(formatManualDurationInput(defaults.durationSeconds))
    setLocalError(null)
    setDurationParseError(null)
    setDurationLimitMessage(null)
    overlapAlert.clearOverlapAlert()
  }

  const resetAfterSave = () => {
    reset()
    onClearMentions()
    onClearShareNotice()
  }

  const setStart = (value: string) => {
    const parsed = parseDatetimeLocal(value)
    if (!parsed) return
    clearFeedback()
    const next = applyManualFieldChange(manualEntry, 'start', parsed)
    setManualEntry(next)
    setDurationInput(formatManualDurationInput(next.durationSeconds))
  }

  const setEnd = (value: string) => {
    const parsed = parseDatetimeLocal(value)
    if (!parsed) return
    clearFeedback()
    const next = applyManualFieldChange(manualEntry, 'end', parsed)
    setManualEntry(next)
    setDurationInput(formatManualDurationInput(next.durationSeconds))
  }

  const setDuration = (value: string) => {
    setDurationInput(value)
    setDurationParseError(null)
    clearFeedback()
    const parsed = parseDurationInput(value)
    if (parsed === null) return
    setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
  }

  const blurDuration = () => {
    const parsed = parseDurationInput(durationInput)
    if (durationInput.trim() && parsed === null) {
      setDurationParseError('Use 1:30 or 1:30:00')
      return
    }
    setDurationParseError(null)
    setDurationInput(formatManualDurationInput(manualEntry.durationSeconds))
  }

  const saveEntry = async () => {
    setDurationLimitMessage(null)

    if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    await overlapAlert.saveOrShowOverlapAlert({
      onClearError: () => setLocalError(null),
      validationError: validation.error,
      onValidationError: setLocalError,
      save: async () => {
        const sharedNames = mentionedTeammates.map((teammate) => teammate.displayName ?? teammate.email)

        await addManualEntry({
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          ...(mentionedTeammates.length > 0
            ? { assigneeUserIds: mentionedTeammates.map((teammate) => teammate.id) }
            : {}),
        })

        resetAfterSave()
        if (sharedNames.length === 1) {
          onShared(`Shared with ${sharedNames[0]}. They will be notified to approve it.`)
        } else if (sharedNames.length > 1) {
          onShared(`Shared with ${sharedNames.length} teammates. They will be notified to approve it.`)
        }
        onClearDescription()
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(apiErrorMessage(err, DURATION_LIMIT_MESSAGE))
          return
        }

        setLocalError(apiErrorMessage(err, 'Could not save the manual entry.'))
      },
    })
  }

  return {
    manualEntry,
    durationInput,
    durationParseError,
    durationLimitMessage,
    setDurationLimitMessage,
    endOrderError,
    blockingError,
    timeFieldState,
    durationFieldState,
    showManualFeedback,
    isInitializing,
    isSavingManual,
    overlapAlert,
    setStart,
    setEnd,
    setDuration,
    blurDuration,
    clearFeedback,
    reset,
    saveEntry,
  }
}
