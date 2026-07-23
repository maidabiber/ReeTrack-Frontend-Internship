import { useEffect, useMemo, useRef, useState } from 'react'
import { MentionDescriptionField } from './MentionDescriptionField'
import { TimeEntryTemplatesPanel } from './TimeEntryTemplatesPanel'
import {
  TimeEntryInput,
  type TimeEntryInputHandle,
  type TemplateSeed,
} from './TimeEntryInput'
import { isDurationOnlyTemplate } from '../../lib/timeEntryTemplates'
import {
  TimerModeInput,
  type TimerModeInputHandle,
} from './TimerModeInput'
import { Icon } from '../ui/Icon'
import type { TrackerMode } from './TrackerModeMenu'
import { PomodoroControls } from './PomodoroControls'
import { MetadataBubble } from '../ui/MetadataBubble'
import { ProjectTaskPicker } from '../pickers/ProjectTaskPicker'
import { TagMultiSelect } from '../pickers/TagMultiSelect'
import { usePomodoro } from '../../hooks/usePomodoro'
import { useTimer } from '../../hooks/useTimer'
import type { TimeEntryAssociations } from '../../types/timeEntry'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'

const TIMER_PANEL_CLASS = 'timer-panel'

function IconButton({
  name,
  title,
  active = false,
  pressed,
  onClick,
}: {
  name: 'projects' | 'tags' | 'billable'
  title: string
  active?: boolean
  pressed?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex size-control flex-shrink-0 items-center justify-center rounded-md border shadow-soft transition-colors ${
        active
          ? 'border-brand bg-brand text-white hover:bg-brand-deep'
          : 'border-navy/[0.06] bg-white text-navy/55 hover:border-brand/20 hover:text-navy'
      }`}
    >
      <Icon name={name} className="h-4 w-4" />
    </button>
  )
}

export function TrackerBar() {
  const {
    isRunning,
    isInitializing,
    isToggling,
    isSavingManual,
    draft,
    setDraftDescription,
    setDraftMentionedTeammates,
    setDraftProject,
    clearDraftProject,
    setDraftTags,
    removeDraftTag,
    setDraftBillable,
    applyDraftTemplate,
    clearDraft,
  } = useTimer()

  const pomodoro = usePomodoro()

  const [trackerMode, setTrackerMode] = useState<TrackerMode>('timer')
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateSeed, setTemplateSeed] = useState<TemplateSeed | null>(null)
  const templateNonceRef = useRef(0)

  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const [tagsPickerOpen, setTagsPickerOpen] = useState(false)

  const timerRef = useRef<TimerModeInputHandle>(null)
  const entryRef = useRef<TimeEntryInputHandle>(null)
  const projectButtonRef = useRef<HTMLDivElement>(null)
  const tagsButtonRef = useRef<HTMLDivElement>(null)

  const {
    description,
    mentionedTeammates,
    projectId,
    projectTaskId,
    projectName,
    projectColor,
    projectTaskName,
    tagIds,
    knownTags,
    isBillable,
  } = draft

  useEffect(() => {
    if (!tagsPickerOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (tagsButtonRef.current && !tagsButtonRef.current.contains(event.target as Node)) {
        setTagsPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [tagsPickerOpen])

  const clearShareNotice = () => setShareNotice(null)

  const clearTemplateSelection = () => {
    setSelectedTemplateId(null)
    setTemplateSeed(null)
  }

  const switchMode = (mode: TrackerMode) => {
    if ((mode === 'manual' || mode === 'duration' || mode === 'templates') && isRunning) {
      return
    }
    setTrackerMode(mode)
    clearShareNotice()
    if (mode !== 'templates') {
      clearTemplateSelection()
    }
  }

  const handleDescriptionEnter = () => {
    if (trackerMode === 'timer') {
      timerRef.current?.toggle()
      return
    }
    if (trackerMode === 'manual' || trackerMode === 'templates' || trackerMode === 'duration') {
      void entryRef.current?.saveEntry()
    }
  }

  const handleSelectTemplate = (template: TimeEntryTemplate) => {
    templateNonceRef.current += 1
    clearShareNotice()
    setSelectedTemplateId(template.id)
    setTemplateSeed({
      template,
      nonce: templateNonceRef.current,
    })
    applyDraftTemplate({
      description: template.description ?? '',
      projectId: template.projectId,
      projectTaskId: template.projectTaskId,
      projectName: template.projectName,
      projectColor: template.projectColor,
      projectTaskName: template.taskName,
      isBillable: template.isBillable,
    })
  }

  const handleClearDescriptionAndAssociations = () => {
    clearDraft()
    clearTemplateSelection()
  }

  const associations: TimeEntryAssociations = useMemo(
    () => ({
      projectId,
      projectTaskId,
      tagIds,
      isBillable,
    }),
    [projectId, projectTaskId, tagIds, isBillable],
  )

  const projectTaskLabel = projectName
    ? projectTaskName
      ? `${projectName} · ${projectTaskName}`
      : projectName
    : null

  const selectedTags = knownTags.filter((tag) => tagIds.includes(tag.id))

  const entryVariant =
    trackerMode === 'timer'
      ? null
      : trackerMode === 'duration' ||
          (trackerMode === 'templates' &&
            templateSeed != null &&
            isDurationOnlyTemplate(templateSeed.template))
        ? 'duration'
        : 'range'

  return (
    <>
      <div className={TIMER_PANEL_CLASS}>
        {trackerMode === 'duration' ? (
          <input
            className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-lg text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
            placeholder="What did you work on?"
            value={description}
            onChange={(event) => setDraftDescription(event.target.value)}
            disabled={isInitializing || isSavingManual}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleDescriptionEnter()
              }
            }}
          />
        ) : (
          <MentionDescriptionField
            className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-lg text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
            placeholder="What are you working on? Type @ to share with a teammate"
            value={description}
            onChange={setDraftDescription}
            selectedTeammates={mentionedTeammates}
            onMentionChange={setDraftMentionedTeammates}
            disabled={isInitializing || isToggling || isSavingManual}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleDescriptionEnter()
              }
            }}
          />
        )}

        {shareNotice ? (
          <div className="mx-6 mb-3 rounded-md bg-brand-tint px-3 py-2.5 text-sm text-navy">
            {shareNotice}
          </div>
        ) : null}

        <span aria-hidden="true" className="block h-px w-full bg-brand-gradient" />

        <div className="flex min-h-[5.5rem] flex-wrap items-center gap-x-2 gap-y-3 border-t border-navy/[0.06] bg-surface-muted/25 px-4 py-3.5">
          <div ref={projectButtonRef} className="relative">
            <IconButton
              name="projects"
              title="Project & task"
              active={Boolean(projectId) || projectPickerOpen}
              onClick={() => {
                setTagsPickerOpen(false)
                setProjectPickerOpen((v) => !v)
              }}
            />
            <ProjectTaskPicker
              key={projectPickerOpen ? 'open' : 'closed'}
              open={projectPickerOpen}
              onOpenChange={setProjectPickerOpen}
              projectId={projectId}
              projectTaskId={projectTaskId}
              onChange={(next) => {
                setDraftProject({
                  projectId: next.projectId,
                  projectTaskId: next.projectTaskId,
                  projectName: next.projectName ?? null,
                  projectColor: next.projectColor ?? null,
                  projectTaskName: next.taskName ?? null,
                })
              }}
            />
          </div>

          <div ref={tagsButtonRef} className="relative">
            <IconButton
              name="tags"
              title="Tags"
              active={tagIds.length > 0 || tagsPickerOpen}
              onClick={() => {
                setProjectPickerOpen(false)
                setTagsPickerOpen((v) => !v)
              }}
            />
            {tagsPickerOpen ? (
              <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-[min(100vw-2rem,18rem)]">
                <TagMultiSelect
                  variant="popover"
                  knownTags={knownTags}
                  selectedIds={tagIds}
                  onChange={(ids, tags) => {
                    setDraftTags(ids, tags)
                  }}
                />
              </div>
            ) : null}
          </div>

          <IconButton
            name="billable"
            title={isBillable ? 'Billable' : 'Non-billable'}
            active={isBillable}
            pressed={isBillable}
            onClick={() => setDraftBillable(!isBillable)}
          />

          {(projectTaskLabel || selectedTags.length > 0) && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {projectTaskLabel ? (
                <MetadataBubble
                  label={projectTaskLabel}
                  color={projectColor}
                  onRemove={clearDraftProject}
                />
              ) : null}
              {selectedTags.map((tag) => (
                <MetadataBubble
                  key={tag.id}
                  label={tag.name}
                  color={tag.color}
                  onRemove={() => removeDraftTag(tag.id)}
                />
              ))}
            </div>
          )}

          {trackerMode === 'timer' ? (
            <>
              <div className="mx-1 h-5.5 w-px flex-shrink-0 bg-navy/10" />
              <PomodoroControls
                enabled={pomodoro.prefs.enabled}
                workMinutes={pomodoro.prefs.workMinutes}
                breakMinutes={pomodoro.prefs.breakMinutes}
                onEnabledChange={pomodoro.setEnabled}
                onWorkMinutesChange={pomodoro.setWorkMinutes}
                onBreakMinutesChange={pomodoro.setBreakMinutes}
                disabled={isInitializing}
              />
            </>
          ) : null}

          <div className="flex-1" />

          {trackerMode === 'timer' ? (
            <TimerModeInput
              ref={timerRef}
              description={description}
              setDescription={setDraftDescription}
              mentionedTeammates={mentionedTeammates}
              setMentionedTeammates={setDraftMentionedTeammates}
              onShared={setShareNotice}
              onClearShareNotice={clearShareNotice}
              associations={associations}
              mode={trackerMode}
              onModeChange={switchMode}
            />
          ) : entryVariant ? (
            <TimeEntryInput
              key={entryVariant}
              ref={entryRef}
              variant={entryVariant}
              description={description}
              mentionedTeammates={mentionedTeammates}
              onShared={setShareNotice}
              onClearDescription={handleClearDescriptionAndAssociations}
              onClearMentions={() => setDraftMentionedTeammates([])}
              onClearShareNotice={clearShareNotice}
              associations={associations}
              mode={trackerMode}
              onModeChange={switchMode}
              modeMenuDisabled={isRunning}
              templateSeed={trackerMode === 'templates' ? templateSeed : null}
            />
          ) : null}
        </div>
      </div>

      {trackerMode === 'templates' ? (
        <div className="mt-3">
          <TimeEntryTemplatesPanel
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleSelectTemplate}
          />
        </div>
      ) : null}
    </>
  )
}
