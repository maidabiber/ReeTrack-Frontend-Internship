import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { Icon } from '../ui/Icon'
import { ManualField, ManualFormNotice } from './ManualField'
import { DurationLimitModal } from './durationLimitModal'
import { OverlapAlertModal } from './overlapAlert'
import {
  useTimeEntryForm,
  type TimeEntryFormVariant,
} from '../../hooks/useTimeEntryForm'
import type { Teammate } from '../../lib/mention'
import type { TimeEntryAssociations } from '../../types/timeEntry'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'
import { toDatetimeLocalValue } from '../../lib/manualEntry'
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

    useImperativeHandle(
      ref,
      () => ({
        saveEntry: form.saveEntry,
      }),
      [form.saveEntry],
    )

    const { overlapWarning, showOverlapAlert, clearOverlapAlert } = form.overlapAlert
    const isBusy = form.isInitializing || form.isSavingManual

    return (
      <>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <div className="flex flex-wrap items-end justify-end gap-2">
            {variant === 'range' ? (
              <>
                <ManualField
                  label="Start"
                  type="datetime-local"
                  value={toDatetimeLocalValue(form.manualEntry.start)}
                  onChange={form.setStart}
                  fieldState={form.timeFieldState}
                  disabled={isBusy}
                />
                <ManualField
                  label="End"
                  type="datetime-local"
                  value={toDatetimeLocalValue(form.manualEntry.end)}
                  onChange={form.setEnd}
                  fieldState={form.timeFieldState}
                  disabled={isBusy}
                />
                <ManualField
                  label="Duration"
                  type="text"
                  value={form.durationInput}
                  onChange={form.setDuration}
                  onBlur={form.blurDuration}
                  hint={form.durationParseError ?? undefined}
                  fieldState={form.durationParseError ? 'error' : form.durationFieldState}
                  className="w-manual-time font-mono"
                  disabled={isBusy}
                />
              </>
            ) : (
              <>
                <ManualField
                  label="Date"
                  type="date"
                  value={form.entryDate}
                  onChange={form.setEntryDate}
                  className="w-duration-date"
                  disabled={isBusy}
                />
                <ManualField
                  label="Duration"
                  type="text"
                  value={form.durationInput}
                  onChange={form.setDuration}
                  onBlur={form.blurDuration}
                  hint={form.durationParseError ?? undefined}
                  fieldState={form.durationParseError ? 'error' : 'default'}
                  className="w-duration-value font-mono"
                  disabled={isBusy}
                />
              </>
            )}

            <div className="mb-0.5 flex flex-shrink-0 rounded-full bg-brand text-white shadow-soft">
              <button
                type="button"
                aria-label={variant === 'range' ? 'Add manual entry' : 'Add duration entry'}
                disabled={isBusy || Boolean(form.blockingError)}
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
          </div>

          {form.showManualFeedback ? (
            <div className="flex w-full min-w-[min(100%,var(--width-manual-feedback-min))] max-w-manual-feedback flex-col gap-1.5">
              {form.endOrderError ? (
                <ManualFormNotice variant="error" message={form.endOrderError} />
              ) : null}
            </div>
          ) : null}

          {form.showBlockingNotice && form.blockingError ? (
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
