import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import { Icon } from '../ui/Icon'
import { WeekLockIcon } from '../timesheet/WeekLockBanner'
import { ManualField, ManualFormNotice } from './ManualField'
import { ManualDateTimeFields } from './ManualDateTimeFields'
import { DurationLimitModal } from './durationLimitModal'
import { OverlapAlertModal } from './overlapAlert'
import {
  useTimeEntryForm,
  type TimeEntryFormVariant,
} from '../../hooks/useTimeEntryForm'
import type { Teammate } from '../../lib/mention'
import type { TimeEntryAssociations } from '../../types/timeEntry'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'
import type { SmartParseSeed } from '../../types/smartTimeParse'
import { dateToCalendarDate } from '../../lib/calendarDate'
import { parseDateInput, toDateInputValue } from '../../lib/manualEntry'
import { DatePickerField } from '../ui/date-picker/DatePickerField'
import { TrackerModeMenu, type TrackerMode } from './TrackerModeMenu'

export type TimeEntryInputHandle = {
  saveEntry: () => Promise<void>
}

export type TemplateSeed = {
  template: TimeEntryTemplate
  nonce: number
}

type TimeEntryInputProps = {
  variant: TimeEntryFormVariant
  description: string
  mentionedTeammates: Teammate[]
  onShared: (notice: string) => void
  onClearDescription: () => void
  onClearMentions: () => void
  onClearShareNotice: () => void
  associations: TimeEntryAssociations
  mode: TrackerMode
  onModeChange: (mode: TrackerMode) => void
  modeMenuDisabled?: boolean
  /** When set/updated, prefills fields from the template for the active variant. */
  templateSeed?: TemplateSeed | null
  /** When set/updated, prefills fields from an AI smart-parse result. */
  smartParseSeed?: SmartParseSeed | null
  /** Hides the add + mode menu cluster (e.g. while confirming an AI parse). */
  hideActions?: boolean
  /** Disables time fields without hiding them (e.g. before an AI parse completes). */
  fieldsDisabled?: boolean
  /** Inline chip-row layout without field labels (smart parse confirm). */
  layout?: 'default' | 'inline'
}

export const TimeEntryInput = forwardRef<TimeEntryInputHandle, TimeEntryInputProps>(
  function TimeEntryInput(
    {
      variant,
      description,
      mentionedTeammates,
      onShared,
      onClearDescription,
      onClearMentions,
      onClearShareNotice,
      associations,
      mode,
      onModeChange,
      modeMenuDisabled = false,
      templateSeed = null,
      smartParseSeed = null,
      hideActions = false,
      fieldsDisabled = false,
      layout = 'default',
    },
    ref,
  ) {
    const form = useTimeEntryForm({
      variant,
      description,
      mentionedTeammates,
      onShared,
      onClearDescription,
      onClearMentions,
      onClearShareNotice,
      associations,
    })

    useEffect(() => {
      if (!templateSeed) return
      form.applyTemplate(templateSeed.template)
      // Only re-run when the parent issues a new select (new seed object / nonce).
      // eslint-disable-next-line react-hooks/exhaustive-deps -- applyTemplate identity is unstable
    }, [templateSeed, variant])

    useEffect(() => {
      if (!smartParseSeed) return
      form.applySmartParse(smartParseSeed)
      // Only re-run when the parent issues a new parse (new seed object / nonce).
      // eslint-disable-next-line react-hooks/exhaustive-deps -- applySmartParse identity is unstable
    }, [smartParseSeed, variant])

    useImperativeHandle(
      ref,
      () => ({
        saveEntry: form.saveEntry,
      }),
      [form.saveEntry],
    )

    const { overlapWarning, showOverlapAlert, clearOverlapAlert } = form.overlapAlert
    const isBusy = form.isInitializing || form.isSavingManual
    const fieldsAreDisabled = isBusy || fieldsDisabled
    const isInline = layout === 'inline'

    const durationEntryDate = useMemo(() => {
      const parsed = parseDateInput(form.entryDate)
      return parsed ? dateToCalendarDate(parsed) : dateToCalendarDate(new Date())
    }, [form.entryDate])

    const timeFields =
      variant === 'range' ? (
        <>
          <ManualDateTimeFields
            label="Start"
            hideLabel
            compact
            value={form.manualEntry.start}
            onChange={(date) => form.setStartFromDate(date)}
            fieldState={form.timeFieldState}
            disabled={fieldsAreDisabled}
          />
          <ManualDateTimeFields
            label="End"
            hideLabel
            compact
            value={form.manualEntry.end}
            onChange={(date) => form.setEndFromDate(date)}
            fieldState={form.timeFieldState}
            disabled={fieldsAreDisabled}
          />
        </>
      ) : (
        <div className={isInline ? 'flex flex-wrap items-center gap-1.5' : 'flex items-center gap-2'}>
          <DatePickerField
            label="Date"
            hideLabel
            compact
            value={durationEntryDate}
            onChange={(nextDate) =>
              form.setEntryDate(
                toDateInputValue(
                  new Date(nextDate.year, nextDate.month - 1, nextDate.day),
                ),
              )
            }
            disabled={fieldsAreDisabled}
          />
          <ManualField
            label="Duration"
            hideLabel
            variant="tracker"
            type="text"
            value={form.durationInput}
            onChange={form.setDuration}
            onBlur={form.blurDuration}
            fieldState={form.durationParseError ? 'error' : 'default'}
            className="w-[4.75rem] font-medium tabular-nums"
            disabled={fieldsAreDisabled}
          />
        </div>
      )

    return (
      <>
        <div
          className={
            isInline
              ? 'flex min-w-0 flex-wrap items-center gap-1.5'
              : 'flex min-w-0 flex-col items-end gap-2'
          }
        >
          <div
            className={
              isInline
                ? 'flex flex-wrap items-center gap-1.5'
                : 'flex flex-wrap items-center justify-end gap-2'
            }
          >
            {timeFields}

            {!hideActions ? (
              <>
                {form.weekLock.locked ? (
                  <span className="mb-0.5 flex h-11 items-center">
                    <WeekLockIcon status={form.weekLock.status} />
                  </span>
                ) : null}

                <div className="mb-0.5 flex flex-shrink-0 rounded-full bg-brand text-white shadow-soft">
                  <button
                    type="button"
                    aria-label={variant === 'range' ? 'Add manual entry' : 'Add duration entry'}
                    disabled={isBusy || Boolean(form.blockingError) || form.weekLock.locked}
                    onClick={() => void form.saveEntry()}
                    className="flex h-11 w-11 items-center justify-center rounded-l-full bg-brand transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Icon name="plus" className="size-icon-md" />
                  </button>
                  <span aria-hidden="true" className="my-2 w-px flex-shrink-0 bg-white/25" />
                  <TrackerModeMenu
                    mode={mode}
                    onModeChange={onModeChange}
                    disabled={modeMenuDisabled || isBusy}
                    buttonClassName="flex h-11 w-9 items-center justify-center rounded-r-full bg-brand transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </>
            ) : null}
          </div>

          {!isInline && form.showManualFeedback ? (
            <div className="flex w-full min-w-[min(100%,var(--width-manual-feedback-min))] max-w-manual-feedback flex-col gap-1.5">
              {form.endOrderError ? (
                <ManualFormNotice variant="error" message={form.endOrderError} />
              ) : null}
            </div>
          ) : null}

          {!isInline && form.showBlockingNotice && form.blockingError ? (
            <ManualFormNotice variant="error" message={form.blockingError} />
          ) : null}
        </div>

        {form.durationLimitMessage ? (
          <DurationLimitModal
            message={form.durationLimitMessage}
            onDismiss={() => form.setDurationLimitMessage(null)}
          />
        ) : null}

        {variant === 'range' && showOverlapAlert && overlapWarning ? (
          <OverlapAlertModal
            message={overlapWarning}
            onDismiss={clearOverlapAlert}
          />
        ) : null}
      </>
    )
  },
)
