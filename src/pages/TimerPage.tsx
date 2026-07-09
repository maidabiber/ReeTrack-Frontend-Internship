import { useEffect, useState } from 'react'
import { MentionDescriptionField } from '../components/time/MentionDescriptionField'
import { AddShareMembersModal } from '../components/time/AddShareMembersModal'
import { EditEntryModal } from '../components/time/EditEntryModal'
import { EntryParticipantAvatars, getEntryMembers } from '../components/time/EntryParticipantAvatars'
import { ReviewPendingEntryModal } from '../components/time/ReviewPendingEntryModal'
import {
  DURATION_LIMIT_MESSAGE,
  DurationLimitModal,
  isDurationLimitError,
  OverlapConfirmModal,
  useOverlapConfirm,
} from '../components/time/overlapConfirm'
import { Icon } from '../components/ui/Icon'
import { Pill } from '../components/ui/Pill'
import { EventCalendar } from '../components/calendar/EventCalendar'
import { endOfWeek, startOfWeek } from '../components/calendar/dateUtils'
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
  dateInputToUtcIso,
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

const DEFAULT_DURATION_ONLY_SECONDS = 60 * 60

const TIMER_PANEL_CLASS = 'timer-panel'
const TIMER_PANEL_OVERFLOW_CLASS = 'timer-panel overflow-hidden'

type TrackerMode = 'timer' | 'manual' | 'duration'

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
  const { entries, activeTimer, elapsedSeconds } = useTimer()

  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  const todayTotalSeconds = entries.reduce((total, entry) => {
    if (!entry.startedAtUtc) return total
    const started = new Date(entry.startedAtUtc)
    const isToday =
      started.getFullYear() === now.getFullYear() &&
      started.getMonth() === now.getMonth() &&
      started.getDate() === now.getDate()
    return isToday ? total + entry.durationSeconds : total
  }, 0)

  const weekTotalSeconds = entries.reduce((total, entry) => {
    if (!entry.startedAtUtc) return total
    const started = new Date(entry.startedAtUtc)
    if (started >= weekStart && started <= weekEnd) {
      return total + entry.durationSeconds
    }
    return total
  }, 0)

  let displayWeekTotalSeconds = weekTotalSeconds
  if (activeTimer?.startedAtUtc) {
    const started = new Date(activeTimer.startedAtUtc)
    if (started >= weekStart && started <= weekEnd) {
      displayWeekTotalSeconds += elapsedSeconds
    }
  }

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
          <b className="ml-[5px] font-mono text-[13px] font-normal tabular-nums text-navy">
            {formatDurationHms(displayWeekTotalSeconds)}
          </b>
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
