import { useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import { MentionDescriptionField } from '../components/time/MentionDescriptionField'
import { AddShareMembersModal } from '../components/time/AddShareMembersModal'
import { EntryParticipantAvatars, getEntryMembers } from '../components/time/EntryParticipantAvatars'
import { ReviewPendingEntryModal } from '../components/time/ReviewPendingEntryModal'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Pill } from '../components/ui/Pill'
import { EventCalendar } from '../components/calendar/EventCalendar'
import { useTimer } from '../hooks/useTimer'
import { useAuth } from '../hooks/useAuth'
import { formatDurationHms } from '../lib/formatDuration'
import { isPendingSharedWithCurrentUser, isSharedByCurrentUser, isShareableByCurrentUser } from '../lib/entryShare'
import {
  groupEntriesForDisplay,
  isAwaitingApprovalEntry,
  isInvitationEntry,
} from '../lib/displayEntries'
import {
  PENDING_ENTRY_AVATAR_RING_CLASS,
  PENDING_ENTRY_ROW_CLASS,
  TIME_ENTRY_ITEM_CLASS,
  TIME_ENTRY_LIST_CLASS,
  TIME_ENTRY_ROW_CLASS,
} from '../lib/pendingEntryStyles'
import type { Teammate } from '../lib/mention'
import { timeEntryApiErrorMessage } from '../api/timeEntries'
import type { TimeEntry } from '../types/timeEntry'
import {
  applyManualFieldChange,
  createDefaultManualEntry,
  createManualEntryFromTimeEntry,
  dateInputToUtcIso,
  entryDateToDateInputValue,
  formatEntryDate,
  formatManualDurationInput,
  MANUAL_ENTRY_MESSAGES,
  MAX_MANUAL_DURATION_SECONDS,
  parseDatetimeLocal,
  parseDurationInput,
  toDateInputValue,
  toDatetimeLocalValue,
  validateManualEntry,
  validateDurationOnlyEntry,
} from '../lib/manualEntry'

const DURATION_LIMIT_MESSAGE = 'Duration cannot exceed 24 hours. Please shorten the entry before saving.'
const DEFAULT_DURATION_ONLY_SECONDS = 60 * 60

const TIMER_PANEL_CLASS = 'timer-panel'
const TIMER_PANEL_OVERFLOW_CLASS = 'timer-panel overflow-hidden'

type TrackerMode = 'timer' | 'manual' | 'duration'

function isOverlapConflictError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false
  const message = timeEntryApiErrorMessage(error, '')
  return message.toLowerCase().includes('overlap')
}

function useOverlapConfirm() {
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

function formatOverlapMessage(message: string) {
  const match = message.match(/^This entry overlaps with:\s*(.+)\.\s*Save anyway\?$/i)
  if (!match) return message

  const labels = match[1]
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)

  if (labels.length === 0) return message

  return (
    <>
      This entry overlaps with:{' '}
      {labels.map((label, index) => (
        <span key={`${label}-${index}`}>
          {index > 0 ? ', ' : null}
          <strong className="font-semibold text-navy">{label}</strong>
        </span>
      ))}
      . Save anyway?
    </>
  )
}

function CenteredAlertModal({
  title,
  message,
  titleId,
  messageId,
  onDismiss,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  isSaving = false,
}: {
  title: string
  message: ReactNode
  titleId: string
  messageId: string
  onDismiss: () => void
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  isSaving?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-navy/45 p-4"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="w-[400px] max-w-full rounded-[20px] bg-white p-[26px] shadow-[0_24px_56px_rgba(31,43,77,0.22)]"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <div className="mb-5 flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-tint"
          >
            <Icon name="timer" className="h-[18px] w-[18px] text-yellow" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-base font-bold text-navy">
              {title}
            </h2>
            <p id={messageId} className="mt-2 text-[13px] leading-[1.55] text-navy/75">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {secondaryLabel ? (
            <button
              type="button"
              onClick={onDismiss}
              disabled={isSaving}
              className="flex-1 rounded-full border-[1.5px] border-navy bg-transparent py-2.5 font-display text-[13px] font-semibold text-navy disabled:opacity-60"
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrimary}
            disabled={isSaving}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function OverlapConfirmModal({
  message,
  isSaving = false,
  onCancel,
  onConfirm,
}: {
  message: string
  isSaving?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <CenteredAlertModal
      title="Time overlap"
      message={formatOverlapMessage(message)}
      titleId="overlap-confirm-title"
      messageId="overlap-confirm-message"
      onDismiss={onCancel}
      secondaryLabel="Cancel"
      primaryLabel="Save anyway"
      onPrimary={onConfirm}
      isSaving={isSaving}
    />
  )
}

function DurationLimitModal({ message, onDismiss }: { message: string; onDismiss: () => void }) {
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

function isDurationLimitError(error: unknown): boolean {
  const message = timeEntryApiErrorMessage(error, '')
  return message.toLowerCase().includes('24 hour')
}

/**
 * RT-270 / RT-23 / RT-24 / RT-28 — timer landing screen with one-click timer,
 * manual time entry, and entry editing.
 */
export default function TimerPage() {
  const [contentView, setContentView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface-muted/45">
      <div className="mx-auto w-full max-w-[1340px] px-10 py-8">
        <div className="mb-5">
          <TrackerBar />
        </div>

        <Toolbar contentView={contentView} onContentViewChange={setContentView} />

        <div className="mt-4">
          {contentView === 'list' ? <EntriesCard /> : <EventCalendar />}
        </div>
      </div>
    </div>
  )
}

function TrackerBar() {
  const {
    activeTimer,
    elapsedSeconds,
    isRunning,
    isInitializing,
    isToggling,
    isSavingManual,
    error,
    toggle,
    addManualEntry,
    addDurationEntry,
  } = useTimer()

  const [trackerMode, setTrackerMode] = useState<TrackerMode>('timer')
  const [description, setDescription] = useState('')
  const [manualEntry, setManualEntry] = useState(createDefaultManualEntry)
  const [durationInput, setDurationInput] = useState(formatManualDurationInput(manualEntry.durationSeconds))
  const [durationOnlySeconds, setDurationOnlySeconds] = useState(DEFAULT_DURATION_ONLY_SECONDS)
  const [durationOnlyInput, setDurationOnlyInput] = useState(
    formatManualDurationInput(DEFAULT_DURATION_ONLY_SECONDS),
  )
  const [durationOnlyDate, setDurationOnlyDate] = useState(() => toDateInputValue(new Date()))
  const [localError, setLocalError] = useState<string | null>(null)
  const [durationParseError, setDurationParseError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)
  const [mentionedTeammates, setMentionedTeammates] = useState<Teammate[]>([])
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  useEffect(() => {
    if (activeTimer?.description) {
      setDescription(activeTimer.description)
    } else if (!activeTimer && trackerMode === 'timer') {
      setDescription('')
    }
  }, [activeTimer, trackerMode])

  useEffect(() => {
    setDurationInput(formatManualDurationInput(manualEntry.durationSeconds))
  }, [manualEntry.durationSeconds])

  const validation = validateManualEntry(manualEntry, [], null)
  const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)

  const overlapConfirm = useOverlapConfirm()

  const handleToggle = async (confirmOverlap = false) => {
    const trimmedDescription = description.trim() || undefined

    if (!isRunning) {
      void toggle(trimmedDescription)
      return
    }

    const assigneeIds = mentionedTeammates.map((teammate) => teammate.id)
    if (assigneeIds.length === 0) {
      void toggle(trimmedDescription)
      return
    }

    await overlapConfirm.saveWithOverlapConfirm(confirmOverlap, {
      onClearError: () => setShareNotice(null),
      validationError: null,
      onValidationError: () => {},
      save: async (confirmedOverlap) => {
        const sharedNames = mentionedTeammates.map((teammate) => teammate.displayName ?? teammate.email)

        await toggle(trimmedDescription, {
          assigneeUserIds: assigneeIds,
          confirmOverlap: confirmedOverlap,
        })

        setMentionedTeammates([])
        setDescription('')
        if (sharedNames.length === 1) {
          setShareNotice(`Shared with ${sharedNames[0]}. They will be notified to approve it.`)
        } else if (sharedNames.length > 1) {
          setShareNotice(`Shared with ${sharedNames.length} teammates. They will be notified to approve it.`)
        }
      },
      onOtherError: () => {},
    })
  }

  const handleSaveDuration = async () => {
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

    const entryDateUtc = dateInputToUtcIso(durationOnlyDate)
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
      })
      setDescription('')
      setDurationOnlySeconds(DEFAULT_DURATION_ONLY_SECONDS)
      setDurationOnlyInput(formatManualDurationInput(DEFAULT_DURATION_ONLY_SECONDS))
      setDurationOnlyDate(toDateInputValue(new Date()))
    } catch (err) {
      if (isDurationLimitError(err)) {
        setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
        return
      }

      setLocalError(timeEntryApiErrorMessage(err, 'Could not save the duration entry.'))
    }
  }

  const resetManualEntryFields = () => {
    const defaults = createDefaultManualEntry()
    setManualEntry(defaults)
    setDurationInput(formatManualDurationInput(defaults.durationSeconds))
    setLocalError(null)
    setDurationParseError(null)
    setDurationLimitMessage(null)
    overlapConfirm.clearOverlapConfirm()
  }

  const resetManualForm = () => {
    resetManualEntryFields()
    setMentionedTeammates([])
    setShareNotice(null)
  }

  const clearManualFeedback = () => {
    setLocalError(null)
    setDurationParseError(null)
    setDurationLimitMessage(null)
    overlapConfirm.clearOverlapConfirm()
    setShareNotice(null)
  }

  const handleSaveManual = async (confirmOverlap = false) => {
    setDurationLimitMessage(null)

    if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    await overlapConfirm.saveWithOverlapConfirm(confirmOverlap, {
      onClearError: () => setLocalError(null),
      validationError: validation.error,
      onValidationError: setLocalError,
      save: async (confirmedOverlap) => {
        const sharedNames = mentionedTeammates.map((teammate) => teammate.displayName ?? teammate.email)

        await addManualEntry({
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          confirmOverlap: confirmedOverlap,
          ...(mentionedTeammates.length > 0
            ? { assigneeUserIds: mentionedTeammates.map((teammate) => teammate.id) }
            : {}),
        })

        resetManualForm()
        if (sharedNames.length === 1) {
          setShareNotice(`Shared with ${sharedNames[0]}. They will be notified to approve it.`)
        } else if (sharedNames.length > 1) {
          setShareNotice(`Shared with ${sharedNames.length} teammates. They will be notified to approve it.`)
        }
        if (trackerMode === 'manual') {
          setDescription('')
        }
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(
            timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE),
          )
          return
        }

        setLocalError(timeEntryApiErrorMessage(err, 'Could not save the manual entry.'))
      },
    })
  }

  const switchMode = (mode: TrackerMode) => {
    if ((mode === 'manual' || mode === 'duration') && isRunning) return
    setTrackerMode(mode)
    clearManualFeedback()
    if (mode === 'manual') {
      resetManualEntryFields()
    }
    if (mode === 'duration') {
      setDurationOnlySeconds(DEFAULT_DURATION_ONLY_SECONDS)
      setDurationOnlyInput(formatManualDurationInput(DEFAULT_DURATION_ONLY_SECONDS))
      setDurationOnlyDate(toDateInputValue(new Date()))
      setDurationParseError(null)
    }
  }

  const manualBlockingError =
    validation.error ?? durationParseError ?? (trackerMode === 'manual' ? localError : null)
  const durationBlockingError =
    durationOnlyValidationError ?? durationParseError ?? (trackerMode === 'duration' ? localError : null)
  const timerError = trackerMode === 'timer' ? error : null
  const endOrderError =
    manualEntry.end <= manualEntry.start ? MANUAL_ENTRY_MESSAGES.endBeforeStart : null
  const { overlapWarning, showOverlapConfirm, pendingOverlapConfirm } = overlapConfirm
  const timeFieldState: ManualFieldState = endOrderError ? 'error' : 'default'
  const durationFieldState: ManualFieldState = 'default'
  const showManualFeedback = Boolean(endOrderError)

  return (
    <div className={TIMER_PANEL_CLASS}>
      {trackerMode === 'duration' ? (
        <input
          className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-[16px] text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
          placeholder="What did you work on?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isInitializing || isSavingManual}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void handleSaveDuration()
            }
          }}
        />
      ) : (
        <MentionDescriptionField
          className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-[16px] text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
          placeholder="What are you working on? Type @ to share with a teammate"
          value={description}
          onChange={setDescription}
          selectedTeammates={mentionedTeammates}
          onMentionChange={setMentionedTeammates}
          disabled={isInitializing || isToggling || isSavingManual}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (trackerMode === 'timer') {
                handleToggle()
              } else {
                void handleSaveManual(pendingOverlapConfirm)
              }
            }
          }}
        />
      )}

      {shareNotice ? (
        <div className="mx-6 mb-3 rounded-[10px] bg-brand-tint px-3 py-2.5 text-[12.5px] text-navy">
          {shareNotice}
        </div>
      ) : null}

      <span aria-hidden="true" className="block h-px w-full bg-brand-gradient" />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-navy/[0.06] bg-surface-muted/25 px-4 py-3.5">
        <IconButton name="projects" title="Project" />
        <IconButton name="tags" title="Tags" />
        <IconButton name="billable" title="Billable" />

        <div className="mx-1 h-[22px] w-px flex-shrink-0 bg-navy/10" />

        <div className="flex flex-shrink-0 rounded-full border border-navy/[0.06] bg-white p-[3px] shadow-[0_2px_8px_rgba(20,29,51,0.06)]">
          <button
            type="button"
            onClick={() => switchMode('timer')}
            className={`rounded-full px-4 py-[7px] font-display text-xs font-semibold ${
              trackerMode === 'timer' ? 'bg-navy text-cream' : 'text-navy/55'
            }`}
          >
            Timer
          </button>
          <button
            type="button"
            onClick={() => switchMode('manual')}
            disabled={isRunning}
            title={isRunning ? 'Stop the running timer before adding a manual entry' : undefined}
            className={`rounded-full px-4 py-[7px] font-display text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              trackerMode === 'manual' ? 'bg-navy text-cream' : 'text-navy/55'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => switchMode('duration')}
            disabled={isRunning}
            title={isRunning ? 'Stop the running timer before adding a duration entry' : undefined}
            className={`rounded-full px-3.5 py-[7px] font-display text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              trackerMode === 'duration' ? 'bg-navy text-cream' : 'text-navy/55'
            }`}
          >
            Duration
          </button>
        </div>

        <div className="flex-1" />

        {trackerMode === 'timer' ? (
          <>
            {timerError ? (
              <span
                className="max-w-[180px] truncate text-right text-[11px] text-red"
                title={timerError}
                role="alert"
              >
                {timerError}
              </span>
            ) : null}

            <div className="flex min-w-[104px] items-center justify-end gap-2">
              {isRunning ? (
                <span
                  className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-brand"
                  title="Timer running"
                  aria-label="Timer running"
                />
              ) : null}
              <div
                className={`text-right font-mono text-[22px] font-light tracking-tight tabular-nums ${
                  isRunning ? 'text-brand' : 'text-navy'
                }`}
              >
                {formatDurationHms(elapsedSeconds)}
              </div>
            </div>

            <button
              type="button"
              aria-label={isRunning ? 'Stop timer' : 'Start timer'}
              aria-pressed={isRunning}
              disabled={isInitializing || isToggling}
              onClick={() => void handleToggle()}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                isRunning ? 'bg-navy hover:bg-navy/90' : 'bg-brand hover:bg-brand-deep'
              }`}
            >
              <Icon
                name={isRunning ? 'stop' : 'play'}
                className={isRunning ? 'h-[14px] w-[14px]' : 'h-[15px] w-[15px] translate-x-px'}
              />
            </button>
          </>
        ) : trackerMode === 'manual' ? (
          <div className="flex min-w-0 flex-col items-end gap-2">
            <div className="flex flex-wrap items-end justify-end gap-2">
              <ManualField
                label="Start"
                type="datetime-local"
                value={toDatetimeLocalValue(manualEntry.start)}
                onChange={(value) => {
                  const parsed = parseDatetimeLocal(value)
                  if (!parsed) return
                  clearManualFeedback()
                  setManualEntry((current) => applyManualFieldChange(current, 'start', parsed))
                }}
                fieldState={timeFieldState}
                disabled={isInitializing || isSavingManual}
              />
              <ManualField
                label="End"
                type="datetime-local"
                value={toDatetimeLocalValue(manualEntry.end)}
                onChange={(value) => {
                  const parsed = parseDatetimeLocal(value)
                  if (!parsed) return
                  clearManualFeedback()
                  setManualEntry((current) => applyManualFieldChange(current, 'end', parsed))
                }}
                fieldState={timeFieldState}
                disabled={isInitializing || isSavingManual}
              />
              <ManualField
                label="Duration"
                type="text"
                value={durationInput}
                onChange={(value) => {
                  setDurationInput(value)
                  setDurationParseError(null)
                  clearManualFeedback()
                  const parsed = parseDurationInput(value)
                  if (parsed === null) return
                  setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
                }}
                onBlur={() => {
                  const parsed = parseDurationInput(durationInput)
                  if (durationInput.trim() && parsed === null) {
                    setDurationParseError('Use 1:30 or 1:30:00')
                    return
                  }
                  setDurationParseError(null)
                  setDurationInput(formatManualDurationInput(manualEntry.durationSeconds))
                }}
                hint={durationParseError ?? undefined}
                fieldState={durationParseError ? 'error' : durationFieldState}
                className="w-[92px] font-mono"
                disabled={isInitializing || isSavingManual}
              />

              <button
                type="button"
                aria-label="Add manual entry"
                disabled={isInitializing || isSavingManual || Boolean(manualBlockingError)}
                onClick={() => void handleSaveManual(false)}
                className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="plus" className="h-[18px] w-[18px]" />
              </button>
            </div>

            {showManualFeedback ? (
              <div className="flex w-full min-w-[min(100%,320px)] max-w-[520px] flex-col gap-1.5">
                {endOrderError ? (
                  <ManualFormNotice variant="error" message={endOrderError} />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col items-end gap-2">
            <div className="flex flex-wrap items-end justify-end gap-2">
              <ManualField
                label="Date"
                type="date"
                value={durationOnlyDate}
                onChange={setDurationOnlyDate}
                className="w-[132px]"
                disabled={isInitializing || isSavingManual}
              />
              <ManualField
                label="Duration"
                type="text"
                value={durationOnlyInput}
                onChange={(value) => {
                  setDurationOnlyInput(value)
                  setDurationParseError(null)
                  clearManualFeedback()
                  const parsed = parseDurationInput(value)
                  if (parsed === null) return
                  setDurationOnlySeconds(parsed)
                }}
                onBlur={() => {
                  const parsed = parseDurationInput(durationOnlyInput)
                  if (durationOnlyInput.trim() && parsed === null) {
                    setDurationParseError('Use 1:30 or 1:30:00')
                    return
                  }
                  setDurationParseError(null)
                  setDurationOnlyInput(formatManualDurationInput(durationOnlySeconds))
                }}
                hint={durationParseError ?? undefined}
                fieldState={durationParseError ? 'error' : 'default'}
                className="w-[104px] font-mono"
                disabled={isInitializing || isSavingManual}
              />

              <button
                type="button"
                aria-label="Add duration entry"
                disabled={isInitializing || isSavingManual || Boolean(durationBlockingError)}
                onClick={() => void handleSaveDuration()}
                className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="plus" className="h-[18px] w-[18px]" />
              </button>
            </div>

            {durationBlockingError ? (
              <ManualFormNotice variant="error" message={durationBlockingError} />
            ) : null}
          </div>
        )}
      </div>

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}

      {showOverlapConfirm && overlapWarning ? (
        <OverlapConfirmModal
          message={overlapWarning}
          isSaving={trackerMode === 'timer' ? isToggling : isSavingManual}
          onCancel={overlapConfirm.clearOverlapConfirm}
          onConfirm={() => {
            if (trackerMode === 'timer') {
              void handleToggle(true)
            } else {
              void handleSaveManual(true)
            }
          }}
        />
      ) : null}
    </div>
  )
}

type ManualFieldState = 'default' | 'error' | 'warning'

const MANUAL_FIELD_STYLES: Record<ManualFieldState, string> = {
  default: 'border-navy/10 focus:border-brand/40',
  error: 'border-orange/30 bg-orange-tint/25 focus:border-orange/45',
  warning: 'border-yellow/35 bg-yellow-tint/40 focus:border-yellow/50',
}

function ManualFormNotice({
  variant,
  message,
}: {
  variant: 'error' | 'warning'
  message: string
}) {
  const styles = {
    error: 'border border-orange/15 bg-orange-tint/55',
    warning: 'border border-yellow/20 bg-yellow-tint/75',
  }[variant]

  const dotColor = {
    error: 'bg-orange',
    warning: 'bg-yellow',
  }[variant]

  return (
    <div
      className={`flex items-start gap-2.5 rounded-[10px] px-3 py-2 ${styles}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span
        aria-hidden="true"
        className={`mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotColor}`}
      />
      <p className="min-w-0 flex-1 text-[11px] leading-[1.45] text-navy/75">{message}</p>
    </div>
  )
}

function ManualField({
  label,
  type,
  value,
  onChange,
  onBlur,
  className = '',
  disabled,
  fieldState = 'default',
  hint,
}: {
  label: string
  type: 'datetime-local' | 'text' | 'date'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  disabled?: boolean
  fieldState?: ManualFieldState
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-display text-[10px] font-semibold uppercase tracking-wide text-navy/45">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={fieldState === 'error' ? true : undefined}
        className={`rounded-[10px] border bg-surface-muted px-2.5 py-1.5 text-[12px] text-navy outline-none transition-colors disabled:opacity-60 ${MANUAL_FIELD_STYLES[fieldState]} ${className}`}
      />
      {hint ? (
        <span className="text-[10px] leading-tight text-navy/50">{hint}</span>
      ) : null}
    </label>
  )
}

function IconButton({ name, title }: { name: 'projects' | 'tags' | 'billable'; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] border border-navy/[0.06] bg-white text-navy/55 shadow-[0_2px_8px_rgba(20,29,51,0.06)] transition-colors hover:border-brand/20 hover:text-navy"
    >
      <Icon name={name} className="h-4 w-4" />
    </button>
  )
}

function Toolbar({
  contentView,
  onContentViewChange,
}: {
  contentView: 'list' | 'calendar'
  onContentViewChange: (view: 'list' | 'calendar') => void
}) {
  const { entries } = useTimer()

  const todayTotalSeconds = entries.reduce((total, entry) => {
    if (!entry.startedAtUtc) return total
    const started = new Date(entry.startedAtUtc)
    const now = new Date()
    const isToday =
      started.getFullYear() === now.getFullYear() &&
      started.getMonth() === now.getMonth() &&
      started.getDate() === now.getDate()
    return isToday ? total + entry.durationSeconds : total
  }, 0)

  return (
    <div className="mb-1 flex w-full flex-wrap items-center gap-4">
      <div className="flex items-center gap-1.5 rounded-full border border-navy/[0.06] bg-white px-3.5 py-2 font-display text-[12.5px] font-bold text-navy shadow-[0_8px_22px_rgba(20,29,51,0.1)]">
        <Icon name="calendar" className="h-[13px] w-[13px] opacity-55" />
        All dates
      </div>

      <div className="flex items-center gap-[18px] text-xs text-navy/60">
        <span>
          TODAY TOTAL
          <b className="ml-[5px] font-mono text-[13px] font-normal tabular-nums text-navy">
            {formatDurationHms(todayTotalSeconds)}
          </b>
        </span>
      </div>
      <div className="flex items-center gap-[18px] text-xs text-navy/60">
        <span>
          WEEK TOTAL
          <b className="ml-[5px] font-mono text-[13px] font-normal tabular-nums text-navy">0:00:00</b>
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex rounded-full border border-navy/[0.06] bg-white p-[3px] shadow-[0_8px_22px_rgba(20,29,51,0.1)]">
        <button
          type="button"
          onClick={() => onContentViewChange('list')}
          className={`rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold ${
            contentView === 'list' ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          List view
        </button>
        <button
          type="button"
          onClick={() => onContentViewChange('calendar')}
          className={`rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold ${
            contentView === 'calendar' ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          Calendar
        </button>
        <button
          type="button"
          title="Coming soon"
          className="rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold text-navy/55"
        >
          Timesheet
        </button>
      </div>
    </div>
  )
}

function EntriesCard() {
  const { entries, isInitializing, refresh } = useTimer()
  const { user } = useAuth()
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null)
  const [shareEntry, setShareEntry] = useState<{
    entry: TimeEntry
    groupedEntries?: TimeEntry[]
  } | null>(null)

  const handleEntryClick = (entry: TimeEntry) => {
    if (user && isPendingSharedWithCurrentUser(entry, user.id)) {
      setReviewEntry(entry)
      return
    }

    if (entry.status === 'Confirmed') {
      if (user && isSharedByCurrentUser(entry, user.id)) {
        return
      }

      setEditingEntry(entry)
    }
  }

  const handleApproved = () => {
    setReviewEntry(null)
    void refresh()
  }

  if (isInitializing) {
    return (
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        <div className="px-5 py-16 text-center text-[13px] leading-[1.6] text-navy/50">
          Loading entries…
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        <div className="px-5 py-16 text-center text-[13px] leading-[1.6] text-navy/50">
          No time entries yet.
          <br />
          <br />
          Start the timer above, or add one manually, to see it here.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        <ul className={TIME_ENTRY_LIST_CLASS}>
          {(user ? groupEntriesForDisplay(entries, user.id) : entries.map((entry) => ({
            key: entry.id,
            entry,
            groupedEntries: [entry],
            isGroupedShare: false,
          }))).map((displayEntry) => {
            const { entry, groupedEntries } = displayEntry
            const isReviewable = user ? isPendingSharedWithCurrentUser(entry, user.id) : false
            const isInvitation = user ? isInvitationEntry(entry, user.id) : false
            const isAwaitingApproval = user ? isAwaitingApprovalEntry(entry, user.id) : false
            const isReadOnlyPending = entry.status === 'Pending' && !isReviewable
            const members = getEntryMembers(entry, {
              groupedEntries: displayEntry.isGroupedShare ? groupedEntries : undefined,
              excludeUserId: user?.id,
            })

            const isSubmitterConfirmedShare =
              user ? isSharedByCurrentUser(entry, user.id) && entry.status === 'Confirmed' : false
            const isPendingCard = isInvitation || isAwaitingApproval || isReadOnlyPending
            const canAddMembers = user ? isShareableByCurrentUser(entry, user.id) : false

            return (
              <li key={displayEntry.key} className={TIME_ENTRY_ITEM_CLASS}>
                <div
                  className={`flex w-full items-center gap-4 px-5 py-4 ${
                    isPendingCard
                      ? PENDING_ENTRY_ROW_CLASS
                      : TIME_ENTRY_ROW_CLASS
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleEntryClick(entry)}
                    disabled={isReadOnlyPending || isSubmitterConfirmedShare}
                    className={`flex min-w-0 flex-1 items-center gap-4 text-left disabled:cursor-default${
                      isSubmitterConfirmedShare ? '' : ''
                    }`}
                  >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-navy">
                      {entry.description?.trim() || 'No description'}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-navy/50">
                      {isInvitation ? <Pill label="Invitation" dotClassName="bg-brand" /> : null}
                      {isAwaitingApproval ? <Pill label="Pending" dotClassName="bg-brand/50" /> : null}
                      {(isInvitation || isAwaitingApproval) && (entry.mode === 'Manual' || entry.startedAtUtc) ? (
                        <span aria-hidden="true">·</span>
                      ) : null}
                      {entry.mode === 'Manual' ? <span>Manual</span> : null}
                      {entry.mode === 'DurationOnly' ? <span>Duration only</span> : null}
                      {(entry.mode === 'Manual' || entry.mode === 'DurationOnly') && entry.startedAtUtc ? (
                        <span aria-hidden="true">·</span>
                      ) : null}
                      {entry.startedAtUtc ? (
                        <span>
                          {entry.mode === 'DurationOnly'
                            ? formatEntryDate(entry.startedAtUtc)
                            : new Date(entry.startedAtUtc).toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {members.length > 0 ? (
                    <EntryParticipantAvatars
                      participants={members}
                      ringClassName={isPendingCard ? PENDING_ENTRY_AVATAR_RING_CLASS : 'ring-white'}
                    />
                  ) : null}
                  <div className="shrink-0 font-mono text-[14px] tabular-nums text-navy">
                    {formatDurationHms(entry.durationSeconds)}
                  </div>
                  {!isReadOnlyPending && !isSubmitterConfirmedShare ? (
                    <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-navy/30" />
                  ) : null}
                  </button>

                  {canAddMembers ? (
                    <button
                      type="button"
                      title="Share with a teammate"
                      aria-label="Share with a teammate"
                      onClick={() =>
                        setShareEntry({
                          entry,
                          groupedEntries: displayEntry.isGroupedShare ? groupedEntries : undefined,
                        })
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy/10 bg-white text-[18px] leading-none text-navy/55 transition-colors hover:border-brand/30 hover:bg-brand-tint hover:text-navy"
                    >
                      +
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {editingEntry ? (
        <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}

      {reviewEntry ? (
        <ReviewPendingEntryModal
          entry={reviewEntry}
          allPending={entries.filter((item) => item.status === 'Pending')}
          onClose={() => setReviewEntry(null)}
          onUpdated={(updated) => {
            void refresh()
            setReviewEntry(updated)
          }}
          onApproved={handleApproved}
        />
      ) : null}

      {shareEntry && user ? (
        <AddShareMembersModal
          entry={shareEntry.entry}
          groupedEntries={shareEntry.groupedEntries}
          currentUserId={user.id}
          onClose={() => setShareEntry(null)}
          onShared={() => void refresh()}
        />
      ) : null}
    </>
  )
}

function EditEntryModal({ entry, onClose }: { entry: TimeEntry; onClose: () => void }) {
  const isDurationOnly = entry.mode === 'DurationOnly'
  const { isSavingEdit, updateEntry } = useTimer()
  const [description, setDescription] = useState(entry.description ?? '')
  const [isBillable, setIsBillable] = useState(entry.isBillable)
  const [manualEntry, setManualEntry] = useState(() => createManualEntryFromTimeEntry(entry))
  const [durationInput, setDurationInput] = useState(() =>
    formatManualDurationInput(entry.durationSeconds),
  )
  const [durationOnlySeconds, setDurationOnlySeconds] = useState(entry.durationSeconds)
  const [durationOnlyInput, setDurationOnlyInput] = useState(() =>
    formatManualDurationInput(entry.durationSeconds),
  )
  const [durationOnlyDate, setDurationOnlyDate] = useState(() =>
    entryDateToDateInputValue(entry.startedAtUtc),
  )
  const [error, setError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)
  const [durationParseError, setDurationParseError] = useState<string | null>(null)

  useEffect(() => {
    setDurationInput(formatManualDurationInput(manualEntry.durationSeconds))
  }, [manualEntry.durationSeconds])

  const validation = validateManualEntry(manualEntry, [], null)
  const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)

  const overlapConfirm = useOverlapConfirm()
  const { overlapWarning, showOverlapConfirm } = overlapConfirm

  const endOrderError =
    manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = isDurationOnly
    ? durationOnlyValidationError ?? durationParseError ?? error
    : validation.error ?? error

  const handleSaveDurationOnly = async () => {
    setDurationLimitMessage(null)

    if (durationOnlySeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    const validationError = durationOnlyValidationError ?? durationParseError
    if (validationError) {
      setError(validationError)
      return
    }

    const entryDateUtc = dateInputToUtcIso(durationOnlyDate)
    if (!entryDateUtc) {
      setError('Enter a valid date.')
      return
    }

    setError(null)

    try {
      await updateEntry({
        id: entry.id,
        description: description.trim() || undefined,
        startedAtUtc: entryDateUtc,
        durationSeconds: durationOnlySeconds,
        isBillable,
      })
      onClose()
    } catch (err) {
      if (isDurationLimitError(err)) {
        setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
        return
      }

      if (err instanceof ApiError && err.status === 403) {
        setError(timeEntryApiErrorMessage(err, 'This entry cannot be edited.'))
        return
      }

      setError(timeEntryApiErrorMessage(err, 'Could not save changes.'))
    }
  }

  const handleSave = async (confirmOverlap = false) => {
    setDurationLimitMessage(null)

    if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    await overlapConfirm.saveWithOverlapConfirm(confirmOverlap, {
      onClearError: () => setError(null),
      validationError: validation.error,
      onValidationError: setError,
      save: async (confirmedOverlap) => {
        await updateEntry({
          id: entry.id,
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          isBillable,
          confirmOverlap: confirmedOverlap,
        })
        onClose()
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(
            timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE),
          )
          return
        }

        if (err instanceof ApiError && err.status === 403) {
          setError(timeEntryApiErrorMessage(err, 'This entry cannot be edited.'))
          return
        }

        setError(timeEntryApiErrorMessage(err, 'Could not save changes.'))
      },
    })
  }

  return (
    <>
      <Modal
        title="Edit time entry"
        subtitle={
          isDurationOnly
            ? 'Update description, duration, and billable status.'
            : 'Update description, times, and billable status.'
        }
        onClose={onClose}
      >
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">
          Description
        </label>
        <input
          className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand"
          placeholder="What did you work on?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSavingEdit}
        />
      </div>

      {isDurationOnly ? (
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditField
            label="Date"
            type="date"
            value={durationOnlyDate}
            onChange={setDurationOnlyDate}
            disabled={isSavingEdit}
          />
          <EditField
            label="Duration"
            type="text"
            value={durationOnlyInput}
            onChange={(value) => {
              setDurationOnlyInput(value)
              setDurationParseError(null)
              setDurationLimitMessage(null)
              const parsed = parseDurationInput(value)
              if (parsed === null) return
              setDurationOnlySeconds(parsed)
            }}
            onBlur={() => {
              const parsed = parseDurationInput(durationOnlyInput)
              if (durationOnlyInput.trim() && parsed === null) {
                setDurationParseError('Use 1:30 or 1:30:00')
                return
              }
              setDurationParseError(null)
              setDurationOnlyInput(formatManualDurationInput(durationOnlySeconds))
            }}
            className="font-mono tabular-nums"
            hasError={Boolean(durationParseError)}
            hint={durationParseError ?? undefined}
            disabled={isSavingEdit}
          />
        </div>
      ) : (
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <EditField
          label="Start"
          type="datetime-local"
          value={toDatetimeLocalValue(manualEntry.start)}
          onChange={(value) => {
            const parsed = parseDatetimeLocal(value)
            if (!parsed) return
            setDurationLimitMessage(null)
            overlapConfirm.clearOverlapConfirm()
            setManualEntry((current) => applyManualFieldChange(current, 'start', parsed))
          }}
          hasError={Boolean(endOrderError)}
          disabled={isSavingEdit}
        />
        <EditField
          label="End"
          type="datetime-local"
          value={toDatetimeLocalValue(manualEntry.end)}
          onChange={(value) => {
            const parsed = parseDatetimeLocal(value)
            if (!parsed) return
            setDurationLimitMessage(null)
            overlapConfirm.clearOverlapConfirm()
            setManualEntry((current) => applyManualFieldChange(current, 'end', parsed))
          }}
          hint={endOrderError ?? undefined}
          hasError={Boolean(endOrderError)}
          disabled={isSavingEdit}
        />
        <EditField
          label="Duration"
          type="text"
          value={durationInput}
          onChange={(value) => {
            setDurationInput(value)
            setDurationLimitMessage(null)
            overlapConfirm.clearOverlapConfirm()
            const parsed = parseDurationInput(value)
            if (parsed === null) return
            setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
          }}
          onBlur={() => {
            setDurationInput(formatManualDurationInput(manualEntry.durationSeconds))
          }}
          className="font-mono tabular-nums"
          disabled={isSavingEdit}
        />
      </div>
      )}

      <label className="mb-3 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={isBillable}
          onChange={(event) => setIsBillable(event.target.checked)}
          disabled={isSavingEdit}
          className="h-4 w-4 rounded border-navy/20 text-brand focus:ring-brand/30"
        />
        <span className="text-[13px] font-medium text-navy/80">Billable</span>
      </label>

      {blockingError ? (
        <div className="mb-3 rounded-[10px] bg-red-tint px-3 py-2.5 text-[12.5px] leading-[1.5] text-red">
          {blockingError}
        </div>
      ) : null}

      <div className="mt-[18px] flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border-[1.5px] border-navy bg-transparent py-2.5 font-display text-[13px] font-semibold text-navy"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSavingEdit || Boolean(blockingError)}
          onClick={() => void (isDurationOnly ? handleSaveDurationOnly() : handleSave(false))}
          className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingEdit ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      </Modal>

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}

      {showOverlapConfirm && overlapWarning && !isDurationOnly ? (
        <OverlapConfirmModal
          message={overlapWarning}
          isSaving={isSavingEdit}
          onCancel={overlapConfirm.clearOverlapConfirm}
          onConfirm={() => void handleSave(true)}
        />
      ) : null}
    </>
  )
}

function EditField({
  label,
  type,
  value,
  onChange,
  onBlur,
  className = '',
  disabled,
  hasError = false,
  hint,
}: {
  label: string
  type: 'datetime-local' | 'text' | 'date'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  disabled?: boolean
  hasError?: boolean
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[11.5px] font-semibold text-navy/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full rounded-[10px] border-[1.5px] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand disabled:opacity-60 ${
          hasError ? 'border-red/40' : 'border-navy/[0.08]'
        } ${className}`}
      />
      {hint ? <span className="text-[11px] leading-tight text-red">{hint}</span> : null}
    </label>
  )
}
