import { useCallback, useState } from 'react'
import { timeEntryApiErrorMessage } from '../api/timeEntries'

import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../lib/timeEntryErrors'
import { useOverlapAlert } from './useOverlapAlert'
import { useWeekLock } from './useWeekLock'

import type { ManualFieldState } from '../components/time/ManualField'
import { useTimer } from './useTimer'
import type { Teammate } from '../lib/mention'
import type { TimeEntryAssociations } from '../types/timeEntry'
import type { TimeEntryTemplate } from '../types/timeEntryTemplate'
import {
  applyManualFieldChange,
  createDefaultManualEntry,
  createManualEntryFromTemplate,
  dateInputToUtcIso,
  formatManualDurationInput,
  MANUAL_ENTRY_MESSAGES,
  MAX_MANUAL_DURATION_SECONDS,
  parseDateInput,
  parseDatetimeLocal,
  parseDurationInput,
  toDateInputValue,
  validateDurationOnlyEntry,
  validateManualEntry,
} from '../lib/manualEntry'

const DEFAULT_DURATION_ONLY_SECONDS = 60 * 60

/** Local-noon instant for a duration entry's date, matching dateInputToUtcIso. */
function durationDateInstant(entryDate: string): Date | null {
  const day = parseDateInput(entryDate)
  if (!day) return null
  day.setHours(12, 0, 0, 0)
  return day
}

export type TimeEntryFormVariant = 'range' | 'duration'

export function useTimeEntryForm({
  variant,
  description,
  mentionedTeammates,
  onShared,
  onClearDescription,
  onClearMentions,
  onClearShareNotice,
  associations,
}: {
  variant: TimeEntryFormVariant
  description: string
  mentionedTeammates: Teammate[]
  onShared: (notice: string) => void
  onClearDescription: () => void
  onClearMentions: () => void
  onClearShareNotice: () => void
  associations: TimeEntryAssociations
}) {
  const { isInitializing, isSavingManual, addManualEntry, addDurationEntry } = useTimer()
  const overlapAlert = useOverlapAlert()

  // Shared range + duration-only field state (only the active variant is edited/saved).
  const [manualEntry, setManualEntry] = useState(createDefaultManualEntry)
  const [durationInput, setDurationInput] = useState(() =>
    formatManualDurationInput(
      variant === 'duration'
        ? DEFAULT_DURATION_ONLY_SECONDS
        : createDefaultManualEntry().durationSeconds,
    ),
  )
  const [durationOnlySeconds, setDurationOnlySeconds] = useState(DEFAULT_DURATION_ONLY_SECONDS)
  const [entryDate, setEntryDate] = useState(() => toDateInputValue(new Date()))
  const [localError, setLocalError] = useState<string | null>(null)
  const [durationParseError, setDurationParseError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)

  // The week the entry would land in — range entries by their start, duration
  // entries by their date. Locked (submitted/approved) weeks block the save.
  const weekLock = useWeekLock(
    variant === 'duration' ? durationDateInstant(entryDate) : manualEntry.start,
  )

  const rangeValidation = validateManualEntry(manualEntry, [], null)
  const endOrderError =
    manualEntry.end <= manualEntry.start ? MANUAL_ENTRY_MESSAGES.endBeforeStart : null
  const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)

  const blockingError =
    variant === 'range'
      ? rangeValidation.error ?? durationParseError ?? localError
      : durationOnlyValidationError ?? durationParseError ?? localError

  const timeFieldState: ManualFieldState = endOrderError ? 'error' : 'default'
  const durationFieldState: ManualFieldState = durationParseError ? 'error' : 'default'
  const showManualFeedback = variant === 'range' && Boolean(endOrderError)
  const showBlockingNotice = variant === 'duration' && Boolean(blockingError)

  const clearFeedback = useCallback(() => {
    setLocalError(null)
    setDurationParseError(null)
    setDurationLimitMessage(null)
    overlapAlert.clearOverlapAlert()
    onClearShareNotice()
  }, [overlapAlert, onClearShareNotice])

  const reset = useCallback(() => {
    const defaults = createDefaultManualEntry()
    setManualEntry(defaults)
    setDurationInput(
      formatManualDurationInput(
        variant === 'duration' ? DEFAULT_DURATION_ONLY_SECONDS : defaults.durationSeconds,
      ),
    )
    setDurationOnlySeconds(DEFAULT_DURATION_ONLY_SECONDS)
    setEntryDate(toDateInputValue(new Date()))
    setLocalError(null)
    setDurationParseError(null)
    setDurationLimitMessage(null)
    overlapAlert.clearOverlapAlert()
  }, [overlapAlert, variant])

  const resetAfterSave = useCallback(() => {
    reset()
    onClearMentions()
    onClearShareNotice()
  }, [reset, onClearMentions, onClearShareNotice])

  const applyTemplate = useCallback(
    (template: TimeEntryTemplate) => {
      setLocalError(null)
      setDurationParseError(null)
      setDurationLimitMessage(null)
      overlapAlert.clearOverlapAlert()
      onClearShareNotice()

      if (variant === 'duration') {
        const seconds = Math.max(
          1,
          Math.min(template.durationSeconds, MAX_MANUAL_DURATION_SECONDS),
        )
        setDurationOnlySeconds(seconds)
        setDurationInput(formatManualDurationInput(seconds))
        setEntryDate(toDateInputValue(new Date()))
        return
      }

      const next = createManualEntryFromTemplate(template)
      setManualEntry(next)
      setDurationInput(formatManualDurationInput(next.durationSeconds))
    },
    [overlapAlert, onClearShareNotice, variant],
  )

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

  const setStartFromDate = (parsed: Date) => {
    clearFeedback()
    const next = applyManualFieldChange(manualEntry, 'start', parsed)
    setManualEntry(next)
    setDurationInput(formatManualDurationInput(next.durationSeconds))
  }

  const setEndFromDate = (parsed: Date) => {
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

    if (variant === 'duration') {
      setDurationOnlySeconds(parsed)
      return
    }

    setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
  }

  const blurDuration = () => {
    const parsed = parseDurationInput(durationInput)
    if (durationInput.trim() && parsed === null) {
      setDurationParseError('Use 1:30 or 1:30:00')
      return
    }
    setDurationParseError(null)
    const seconds =
      variant === 'duration' ? durationOnlySeconds : manualEntry.durationSeconds
    setDurationInput(formatManualDurationInput(seconds))
  }

  const saveRangeEntry = async () => {
    setDurationLimitMessage(null)

    if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    await overlapAlert.saveOrShowOverlapAlert({
      onClearError: () => setLocalError(null),
      validationError: rangeValidation.error,
      onValidationError: setLocalError,
      save: async () => {
        const sharedNames = mentionedTeammates.map(
          (teammate) => teammate.displayName ?? teammate.email,
        )

        await addManualEntry({
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          isBillable: associations.isBillable ?? true,
          projectId: associations.projectId,
          projectTaskId: associations.projectTaskId,
          tagIds: associations.tagIds,
          ...(mentionedTeammates.length > 0
            ? { assigneeUserIds: mentionedTeammates.map((teammate) => teammate.id) }
            : {}),
        })

        resetAfterSave()
        if (sharedNames.length === 1) {
          onShared(`Shared with ${sharedNames[0]}. They will be notified to approve it.`)
        } else if (sharedNames.length > 1) {
          onShared(
            `Shared with ${sharedNames.length} teammates. They will be notified to approve it.`,
          )
        }
        onClearDescription()
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
          return
        }

        setLocalError(timeEntryApiErrorMessage(err, 'Could not save the manual entry.'))
      },
    })
  }

  const saveDurationEntry = async () => {
    setDurationLimitMessage(null)

    if (durationOnlySeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    const validationError = durationOnlyValidationError ?? durationParseError
    if (validationError) {
      setLocalError(validationError)
      return
    }

    const entryDateUtc = dateInputToUtcIso(entryDate)
    if (!entryDateUtc) {
      setLocalError('Enter a valid date.')
      return
    }

    setLocalError(null)

    try {
      await addDurationEntry({
        description: description.trim() || undefined,
        entryDateUtc,
        durationSeconds: durationOnlySeconds,
        isBillable: associations.isBillable ?? true,
        projectId: associations.projectId,
        projectTaskId: associations.projectTaskId,
        tagIds: associations.tagIds,
      })
      onClearDescription()
      reset()
    } catch (err) {
      if (isDurationLimitError(err)) {
        setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
        return
      }

      setLocalError(timeEntryApiErrorMessage(err, 'Could not save the duration entry.'))
    }
  }

  const saveEntry = async () => {
    // Belt-and-braces: the button is disabled when locked, but never fire a
    // save into a locked week even if a keyboard shortcut reaches here.
    if (weekLock.locked) return
    if (variant === 'duration') {
      await saveDurationEntry()
      return
    }
    await saveRangeEntry()
  }

  return {
    variant,
    weekLock,
    manualEntry,
    entryDate,
    setEntryDate,
    durationInput,
    durationParseError,
    durationLimitMessage,
    setDurationLimitMessage,
    endOrderError,
    blockingError,
    timeFieldState,
    durationFieldState,
    showManualFeedback,
    showBlockingNotice,
    isInitializing,
    isSavingManual,
    overlapAlert,
    setStart,
    setEnd,
    setStartFromDate,
    setEndFromDate,
    setDuration,
    blurDuration,
    clearFeedback,
    reset,
    applyTemplate,
    saveEntry,
  }
}
