import { forwardRef, useCallback, useImperativeHandle } from 'react'
import { Icon } from '../ui/Icon'
import { OverlapConfirmModal } from './overlapConfirm'
import { useOverlapConfirm } from '../../hooks/useOverlapConfirm'
import { formatDurationHms } from '../../lib/formatDuration'
import { useTimer } from '../../hooks/useTimer'
import type { Teammate } from '../../lib/mention'

export type TimerModeInputHandle = {
  toggle: (confirmOverlap?: boolean) => void
}

type TimerModeInputProps = {
  description: string
  setDescription: (value: string) => void
  mentionedTeammates: Teammate[]
  setMentionedTeammates: (teammates: Teammate[]) => void
  onShared: (notice: string) => void
  onClearShareNotice: () => void
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
      showOverlapConfirm,
      clearOverlapConfirm,
      saveWithOverlapConfirm,
    } = useOverlapConfirm()

    const handleToggle = useCallback(
      async (confirmOverlap = false) => {
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

        await saveWithOverlapConfirm(confirmOverlap, {
          onClearError: onClearShareNotice,
          validationError: null,
          onValidationError: () => {},
          save: async (confirmedOverlap) => {
            const sharedNames = mentionedTeammates.map(
              (teammate) => teammate.displayName ?? teammate.email,
            )

            await toggle(trimmedDescription, {
              assigneeUserIds: assigneeIds,
              confirmOverlap: confirmedOverlap,
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
      },
      [
        description,
        isRunning,
        mentionedTeammates,
        onClearShareNotice,
        onShared,
        saveWithOverlapConfirm,
        setDescription,
        setMentionedTeammates,
        toggle,
      ],
    )

    useImperativeHandle(
      ref,
      () => ({
        toggle: (confirmOverlap = false) => {
          void handleToggle(confirmOverlap)
        },
      }),
      [handleToggle],
    )

    return (
      <>
        {error ? (
          <span
            className="max-w-error-hint truncate text-right text-micro text-red"
            title={error}
            role="alert"
          >
            {error}
          </span>
        ) : null}

        <div className="flex min-w-timer-cluster items-center justify-end gap-2">
          {isRunning ? (
            <span
              className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-brand"
              title="Timer running"
              aria-label="Timer running"
            />
          ) : null}
          <div
            className={`text-right font-mono text-timer font-light tracking-tight tabular-nums ${
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
            className={isRunning ? 'size-3.5' : 'size-icon-play translate-x-px'}
          />
        </button>

        {showOverlapConfirm && overlapWarning ? (
          <OverlapConfirmModal
            message={overlapWarning}
            isSaving={isToggling}
            onCancel={clearOverlapConfirm}
            onConfirm={() => void handleToggle(true)}
          />
        ) : null}
      </>
    )
  },
)
