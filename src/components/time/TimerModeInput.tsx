import { forwardRef, useCallback, useImperativeHandle } from 'react'
import { Icon } from '../ui/Icon'
import { TrackerModeMenu, type TrackerMode } from './TrackerModeMenu'
import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { OverlapAlertModal } from './overlapAlert'
import { formatDurationHms } from '../../lib/formatDuration'
import { useTimer } from '../../hooks/useTimer'
import { useWeekLock } from '../../hooks/useWeekLock'
import { WeekLockIcon } from '../timesheet/WeekLockBanner'
import type { Teammate } from '../../lib/mention'
import type { TimeEntryAssociations } from '../../types/timeEntry'

export type TimerModeInputHandle = {
  toggle: () => void
}

type TimerModeInputProps = {
  description: string
  setDescription: (value: string) => void
  mentionedTeammates: Teammate[]
  setMentionedTeammates: (teammates: Teammate[]) => void
  onShared: (notice: string) => void
  onClearShareNotice: () => void
  associations: TimeEntryAssociations
  mode: TrackerMode
  onModeChange: (mode: TrackerMode) => void
}

export const TimerModeInput = forwardRef<TimerModeInputHandle, TimerModeInputProps>(
  function TimerModeInput(
    {
      description,
      setDescription,
      mentionedTeammates,
      setMentionedTeammates,
      onShared,
      onClearShareNotice,
      associations,
      mode,
      onModeChange,
    },
    ref,
  ) {
    const {
      elapsedSeconds,
      isRunning,
      isInitializing,
      isToggling,
      error,
      toggle,
    } = useTimer()
    const {
      overlapWarning,
      showOverlapAlert,
      clearOverlapAlert,
      saveOrShowOverlapAlert,
    } = useOverlapAlert()
    const weekLock = useWeekLock(new Date())

    const handleToggle = useCallback(async () => {
      const trimmedDescription = description.trim() || undefined

      if (!isRunning) {
        void toggle(trimmedDescription, { associations })
        return
      }

      const assigneeIds = mentionedTeammates.map((teammate) => teammate.id)
      if (assigneeIds.length === 0) {
        void toggle(trimmedDescription, { associations })
        return
      }

      await saveOrShowOverlapAlert({
        onClearError: onClearShareNotice,
        validationError: null,
        onValidationError: () => {},
        save: async () => {
          const sharedNames = mentionedTeammates.map(
            (teammate) => teammate.displayName ?? teammate.email,
          )

          await toggle(trimmedDescription, {
            assigneeUserIds: assigneeIds,
              associations,
          })

          setMentionedTeammates([])
          setDescription('')
          if (sharedNames.length === 1) {
            onShared(`Shared with ${sharedNames[0]}. They will be notified to approve it.`)
          } else if (sharedNames.length > 1) {
            onShared(
              `Shared with ${sharedNames.length} teammates. They will be notified to approve it.`,
            )
          }
        },
        onOtherError: () => {},
      })
    }, [
        associations,
      description,
      isRunning,
      mentionedTeammates,
      onClearShareNotice,
      onShared,
      saveOrShowOverlapAlert,
      setDescription,
      setMentionedTeammates,
      toggle,
    ])

    useImperativeHandle(
      ref,
      () => ({
        toggle: () => {
          void handleToggle()
        },
      }),
      [handleToggle],
    )

    const primaryTone = isRunning
      ? 'bg-navy hover:bg-navy/90'
      : 'bg-brand hover:bg-brand-deep'
    const busy = isInitializing || isToggling
    // Starting a timer logs into the current week; block it when that week's
    // timesheet is locked. A timer already running can still be stopped.
    const startBlocked = weekLock.locked && !isRunning

    return (
      <>
        {!startBlocked && error ? (
          <span
            className="max-w-error-hint truncate text-right text-micro text-red"
            title={error}
            role="alert"
          >
            {error}
          </span>
        ) : null}

        <div className="flex min-w-timer-cluster items-center justify-end gap-2.5">
          {isRunning ? (
            <span
              className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-brand"
              title="Timer running"
              aria-label="Timer running"
            />
          ) : null}
          <div
            className={`font-mono text-timer font-light tracking-tight tabular-nums ${
              isRunning ? 'text-brand' : 'text-navy'
            }`}
          >
            {formatDurationHms(elapsedSeconds)}
          </div>
        </div>

        {startBlocked ? <WeekLockIcon status={weekLock.status} /> : null}

        <div className={`flex flex-shrink-0 text-white shadow-soft ${primaryTone} rounded-full`}>
          <button
            type="button"
            aria-label={isRunning ? 'Stop timer' : 'Start timer'}
            aria-pressed={isRunning}
            disabled={busy || startBlocked}
            onClick={() => void handleToggle()}
            className="flex h-11 w-11 items-center justify-center rounded-l-full transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon
              name={isRunning ? 'stop' : 'play'}
              className={isRunning ? 'size-3.5' : 'size-icon-play translate-x-px'}
            />
          </button>
          <span aria-hidden="true" className="my-2 w-px flex-shrink-0 bg-white/25" />
          <TrackerModeMenu
            mode={mode}
            onModeChange={onModeChange}
            disabled={isRunning || busy}
            buttonClassName="flex h-11 w-9 items-center justify-center rounded-r-full transition-colors hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {showOverlapAlert && overlapWarning ? (
          <OverlapAlertModal
            message={overlapWarning}
            onDismiss={clearOverlapAlert}
          />
        ) : null}
      </>
    )
  },
)
