import type { ReactNode } from 'react'
import type { Tag } from '../../types/tag'
import { ProjectPicker } from '../pickers/ProjectPicker'
import { TagMultiSelect } from '../pickers/TagMultiSelect'
import { SearchSelect } from '../ui/SearchSelect'
import type { useEntryAssociations } from '../../hooks/useEntryAssociations'

type Associations = ReturnType<typeof useEntryAssociations>

/**
 * Shared field body for the create and edit time entry modals: description, a
 * caller-supplied time grid (start/end/duration or date/duration), project /
 * task pickers, tags, billable toggle, and the blocking-error banner. Each
 * modal keeps its own title, save action, and footer buttons.
 */
export function TimeEntryFields({
  description,
  onDescriptionChange,
  timeFields,
  associations,
  knownTags,
  disabled,
  error,
}: {
  description: string
  onDescriptionChange: (value: string) => void
  /** The time grid for this modal (start/end/duration, or date/duration). */
  timeFields: ReactNode
  associations: Associations
  knownTags: Pick<Tag, 'id' | 'name' | 'color'>[]
  disabled: boolean
  error: string | null
}) {
  return (
    <>
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
          Description
        </label>
        <input
          className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
          placeholder="What did you work on?"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          disabled={disabled}
        />
      </div>

      {timeFields}

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-label font-semibold text-navy/70">Project</span>
          <ProjectPicker
            value={associations.projectId}
            onChange={associations.handleProjectChange}
            allowClear
            disabled={disabled}
            placeholder="No project"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-label font-semibold text-navy/70">Task</span>
          <SearchSelect
            ariaLabel="Task"
            options={associations.taskOptions}
            value={associations.projectTaskId}
            onChange={associations.setProjectTaskId}
            placeholder={associations.projectId ? 'No task' : 'Select a project first'}
            searchPlaceholder="Search tasks…"
            allowClear
            disabled={disabled || !associations.projectId}
          />
        </label>
      </div>

      <div className="mb-3">
        <span className="mb-1.5 block font-display text-label font-semibold text-navy/70">
          Tags
        </span>
        <TagMultiSelect
          knownTags={knownTags}
          selectedIds={associations.tagIds}
          onChange={(ids) => associations.setTagIds(ids)}
          disabled={disabled}
        />
      </div>

      <label className="mb-3 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={associations.isBillable}
          onChange={(event) => associations.setIsBillable(event.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-navy/20 text-brand focus:ring-brand/30"
        />
        <span className="text-md font-medium text-navy/80">Billable</span>
      </label>

      {error ? (
        <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm leading-[1.5] text-red">
          {error}
        </div>
      ) : null}
    </>
  )
}
