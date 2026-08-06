import { useCallback, useState } from 'react'
import { Icon } from '../ui/Icon'
import type { OverlapEntry } from '../../api/timeEntries'
import type { TimeEntry } from '../../types/timeEntry'
import type { CalendarEvent } from '../calendar/types'
import { formatTime } from '../calendar/dateUtils'
import { apiErrorMessage } from '../../api/client'
import { useTimer } from '../../hooks/useTimer'
import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { MAX_MANUAL_DURATION_SECONDS } from '../../lib/manualEntry'
import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/timeEntryErrors'
import { DurationLimitModal } from './durationLimitModal'
import { OverlapAlertModal } from './overlapAlert'
import { OverlapDayPreview } from './OverlapDayPreview'

function formatOverlapLead(message: string | null) {
  if (message) {
    const match = message.trim().match(/^This entry overlaps with:\s*(.+)\.?$/i)
    if (match) {
      const labels = match[1]
        .replace(/\.$/, '')
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean)

      if (labels.length > 0) {
        return (
          <>
            This entry overlaps with:{' '}
            {labels.map((label, index) => (
              <span key={`${label}-${index}`}>
                {index > 0 ? ', ' : null}
                <strong className="font-semibold text-navy">{label}</strong>
              </span>
            ))}
            .
          </>
        )
      }
    }

    return message
  }

  return 'This entry overlaps with an existing time entry.'
}

export function TimerOverlapResolveModal({
  entry,
  overlapMessage,
  suggestedClipEndedAtUtc,
  overlappingEntries,
  dayEntries,
  onEdit,
  onDismiss,
}: {
  entry: TimeEntry
  overlapMessage: string | null
  suggestedClipEndedAtUtc: string | null
  overlappingEntries: OverlapEntry[]
  dayEntries: TimeEntry[]
  onEdit: () => void
  onDismiss: () => void
}) {
  const { updateEntry } = useTimer()
  const {
    overlapWarning,
    showOverlapAlert,
    clearOverlapAlert,
    saveOrShowOverlapAlert,
  } = useOverlapAlert()
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)

  const leaveWarning = suggestedClipEndedAtUtc
    ? `If you leave this page, this entry will be clipped to end at ${formatTime(new Date(suggestedClipEndedAtUtc))} and saved.`
    : 'If you leave this page, this entry cannot be clipped to a valid range and will be deleted.'

  const handleEventMove = useCallback(
    async (event: CalendarEvent, newStart: Date, newEnd: Date) => {
      if (event.id !== `te-${entry.id}`) return

      if (
        newStart.getTime() === event.start.getTime() &&
        newEnd.getTime() === event.end.getTime()
      ) {
        return
      }

      const durationSeconds = Math.round((newEnd.getTime() - newStart.getTime()) / 1000)
      if (durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
        setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
        return
      }

      await saveOrShowOverlapAlert({
        validationError: null,
        onValidationError: () => undefined,
        save: async () => {
          await updateEntry(entry.id, {
            description: entry.description ?? undefined,
            startedAtUtc: newStart.toISOString(),
            endedAtUtc: newEnd.toISOString(),
            isBillable: entry.isBillable,
            projectId: entry.projectId,
            projectTaskId: entry.projectTaskId,
            tagIds: entry.tags.map((tag) => tag.id),
          })
          clearOverlapAlert()
        },
        onOtherError: (err) => {
          if (isDurationLimitError(err)) {
            setDurationLimitMessage(apiErrorMessage(err, DURATION_LIMIT_MESSAGE))
          }
        },
      })
    },
    [clearOverlapAlert, entry, saveOrShowOverlapAlert, updateEntry],
  )

  return (
    <>
      <div
        className="fixed inset-0 z-110 flex items-center justify-center bg-navy/45 p-4"
        onClick={onDismiss}
        role="presentation"
      >
        <div
          className="w-[560px] max-w-full rounded-3xl bg-white p-modal shadow-modal"
          onClick={(event) => event.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="timer-overlap-title"
          aria-describedby="timer-overlap-message"
        >
          <div className="mb-4 flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-tint"
            >
              <Icon name="timer" className="h-[18px] w-[18px] text-yellow" />
            </span>
            <div className="min-w-0">
              <h2 id="timer-overlap-title" className="font-display text-base font-bold text-navy">
                Time overlap
              </h2>
              <p id="timer-overlap-message" className="mt-2 text-body leading-[1.55] text-navy/75">
                {formatOverlapLead(overlapMessage)} {leaveWarning} You can
                drag or resize the highlighted entry below to fix it.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <OverlapDayPreview
              stoppedEntry={entry}
              overlappingEntries={overlappingEntries}
              dayEntries={dayEntries}
              onEventMove={handleEventMove}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
            >
              Got it
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              Edit entry
            </button>
          </div>
        </div>
      </div>

      {showOverlapAlert && overlapWarning ? (
        <OverlapAlertModal message={overlapWarning} onDismiss={clearOverlapAlert} />
      ) : null}

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}
    </>
  )
}
