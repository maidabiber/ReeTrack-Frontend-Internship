import { forwardRef, useImperativeHandle } from 'react'
import { Icon } from '../ui/Icon'
import { ManualField, ManualFormNotice } from './ManualField'
import {
  DurationLimitModal,
  OverlapConfirmModal,
} from './overlapConfirm'
import { useManualEntryForm } from '../../hooks/useManualEntryForm'
import type { Teammate } from '../../lib/mention'
import { toDatetimeLocalValue } from '../../lib/manualEntry'

export type ManualModeInputHandle = {
  saveEntry: (confirmOverlap?: boolean) => Promise<void>
  pendingOverlapConfirm: boolean
}

type ManualModeInputProps = {
  description: string
  mentionedTeammates: Teammate[]
  onShared: (notice: string) => void
  onClearDescription: () => void
  onClearMentions: () => void
  onClearShareNotice: () => void
}

export const ManualModeInput = forwardRef<ManualModeInputHandle, ManualModeInputProps>(
  function ManualModeInput(
    {
      description,
      mentionedTeammates,
      onShared,
      onClearDescription,
      onClearMentions,
      onClearShareNotice,
    },
    ref,
  ) {
    const form = useManualEntryForm({
      description,
      mentionedTeammates,
      onShared,
      onClearDescription,
      onClearMentions,
      onClearShareNotice,
    })

    useImperativeHandle(
      ref,
      () => ({
        saveEntry: form.saveEntry,
        pendingOverlapConfirm: form.overlapConfirm.pendingOverlapConfirm,
      }),
      [form.saveEntry, form.overlapConfirm.pendingOverlapConfirm],
    )

    const { overlapWarning, showOverlapConfirm, clearOverlapConfirm } = form.overlapConfirm

    return (
      <>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <div className="flex flex-wrap items-end justify-end gap-2">
            <ManualField
              label="Start"
              type="datetime-local"
              value={toDatetimeLocalValue(form.manualEntry.start)}
              onChange={form.setStart}
              fieldState={form.timeFieldState}
              disabled={form.isInitializing || form.isSavingManual}
            />
            <ManualField
              label="End"
              type="datetime-local"
              value={toDatetimeLocalValue(form.manualEntry.end)}
              onChange={form.setEnd}
              fieldState={form.timeFieldState}
              disabled={form.isInitializing || form.isSavingManual}
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
              disabled={form.isInitializing || form.isSavingManual}
            />

            <button
              type="button"
              aria-label="Add manual entry"
              disabled={form.isInitializing || form.isSavingManual || Boolean(form.blockingError)}
              onClick={() => void form.saveEntry(false)}
              className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="plus" className="size-icon-md" />
            </button>
          </div>

          {form.showManualFeedback ? (
            <div className="flex w-full min-w-[min(100%,var(--width-manual-feedback-min))] max-w-manual-feedback flex-col gap-1.5">
              {form.endOrderError ? (
                <ManualFormNotice variant="error" message={form.endOrderError} />
              ) : null}
            </div>
          ) : null}
        </div>

        {form.durationLimitMessage ? (
          <DurationLimitModal
            message={form.durationLimitMessage}
            onDismiss={() => form.setDurationLimitMessage(null)}
          />
        ) : null}

        {showOverlapConfirm && overlapWarning ? (
          <OverlapConfirmModal
            message={overlapWarning}
            isSaving={form.isSavingManual}
            onCancel={clearOverlapConfirm}
            onConfirm={() => void form.saveEntry(true)}
          />
        ) : null}
      </>
    )
  },
)
