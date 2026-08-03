import { useEffect, useRef, useState } from 'react'
import { MentionDescriptionField } from './MentionDescriptionField'
import { TimeEntryTemplatesPanel } from './TimeEntryTemplatesPanel'
import { TimeEntrySuggestionsPanel } from './TimeEntrySuggestionsPanel'
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
import { useEntryDraft } from '../../hooks/useEntryDraft'
import type { TimeEntryAssociations } from '../../types/timeEntry'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'
import { SmartParseButton } from './SmartParseButton'
import { SmartParseDescriptionField } from './SmartParseDescriptionField'
import { parseSmartTimeEntry } from '../../api/smartTimeParse'
import { apiErrorMessage } from '../../api/client'
import { createSmartParseSeed, resolveSmartParseVariant } from '../../lib/smartTimeParse'
import { resolveSmartParseAssociations } from '../../lib/resolveSmartParseAssociations'
import type { SmartParseSeed } from '../../types/smartTimeParse'

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
    activeTimer,
    isRunning,
    isInitializing,
    isToggling,
    isSavingManual,
    start,
  } = useTimer()

  const {
    draft,
    setDescription,
    setMentionedTeammates,
    setProject,
    clearProject,
    setTags,
    removeTag,
    setBillable,
    applyTemplate,
    reset: clearDraft,
  } = useEntryDraft(activeTimer)

  const pomodoro = usePomodoro()

  const [trackerMode, setTrackerMode] = useState<TrackerMode>('timer')
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateSeed, setTemplateSeed] = useState<TemplateSeed | null>(null)
  const templateNonceRef = useRef(0)

  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const [tagsPickerOpen, setTagsPickerOpen] = useState(false)
  const [isSmartParseMode, setIsSmartParseMode] = useState(false)
  const [smartParseText, setSmartParseText] = useState('')
  const [isParsingSmartEntry, setIsParsingSmartEntry] = useState(false)
  const [smartParseError, setSmartParseError] = useState<string | null>(null)
  const [smartParseSeed, setSmartParseSeed] = useState<SmartParseSeed | null>(null)
  const [pendingSmartParseSave, setPendingSmartParseSave] = useState(false)
  const smartParseNonceRef = useRef(0)

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

  useDismissOnOutside(tagsButtonRef, tagsPickerOpen, () => setTagsPickerOpen(false))

  const clearShareNotice = () => setShareNotice(null)

  const clearPendingSmartParseSave = () => {
    setPendingSmartParseSave(false)
    setSmartParseSeed(null)
  }

  const exitSmartParseMode = () => {
    setIsSmartParseMode(false)
    setSmartParseText('')
    setSmartParseError(null)
  }

  const toggleSmartParseMode = () => {
    if (isSmartParseMode) {
      exitSmartParseMode()
      return
    }

    clearShareNotice()
    clearTemplateSelection()
    setSmartParseError(null)
    setSmartParseText(description)
    setIsSmartParseMode(true)
  }

  const handleSmartParseSubmit = async () => {
    const text = smartParseText.trim()
    if (!text || isParsingSmartEntry) return

    const wasPendingSave = pendingSmartParseSave
    const existingSeed = smartParseSeed

    setIsParsingSmartEntry(true)
    setSmartParseError(null)

    try {
      const parsed = await parseSmartTimeEntry(text)
      const resolved = await resolveSmartParseAssociations(parsed)

      setDescription(parsed.description)
      setMentionedTeammates([])

      if (resolved.projectId) {
        setProject({
          projectId: resolved.projectId,
          projectTaskId: resolved.projectTaskId,
          projectName: resolved.projectName,
          projectColor: resolved.projectColor,
          projectTaskName: resolved.projectTaskName,
        })
      } else if (!wasPendingSave) {
        setProject({
          projectId: resolved.projectId,
          projectTaskId: resolved.projectTaskId,
          projectName: resolved.projectName,
          projectColor: resolved.projectColor,
          projectTaskName: resolved.projectTaskName,
        })
      }

      if (wasPendingSave) {
        const mergedTagIds = [...new Set([...tagIds, ...resolved.tagIds])]
        const mergedKnownTags = [...knownTags]
        for (const tag of resolved.knownTags) {
          if (!mergedKnownTags.some((known) => known.id === tag.id)) {
            mergedKnownTags.push(tag)
          }
        }
        setTags(mergedTagIds, mergedKnownTags)
        setBillable(isBillable || resolved.isBillable)
      } else {
        setTags(resolved.tagIds, resolved.knownTags)
        setBillable(resolved.isBillable)
      }

      const newEntryVariant = resolveSmartParseVariant(parsed)
      if (newEntryVariant) {
        smartParseNonceRef.current += 1
        const seed = createSmartParseSeed(parsed, smartParseNonceRef.current)
        if (seed) setSmartParseSeed(seed)
        setTrackerMode('duration')
      } else if (!wasPendingSave || !existingSeed) {
        setSmartParseSeed(null)
        setTrackerMode('timer')
      }

      exitSmartParseMode()
      setPendingSmartParseSave(true)
    } catch (error) {
      setSmartParseError(apiErrorMessage(error, 'Could not parse that description.'))
    } finally {
      setIsParsingSmartEntry(false)
    }
  }

  const clearTemplateSelection = () => {
    setSelectedTemplateId(null)
    setTemplateSeed(null)
  }

  const switchMode = (mode: TrackerMode) => {
    if ((mode === 'manual' || mode === 'duration') && isRunning) {
      return
    }
    setTrackerMode(mode)
    clearShareNotice()
    exitSmartParseMode()
    clearPendingSmartParseSave()
    clearTemplateSelection()
  }

  const dismissPendingSmartParse = () => {
    clearPendingSmartParseSave()
    clearDraft()
    clearTemplateSelection()
    clearShareNotice()
    setTrackerMode('timer')
  }

  const associations: TimeEntryAssociations = {
    projectId,
    projectTaskId,
    tagIds,
    isBillable,
  }

  useEffect(() => {
    if (!pendingSmartParseSave) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearPendingSmartParseSave()
        clearDraft()
        clearTemplateSelection()
        clearShareNotice()
        setTrackerMode('timer')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pendingSmartParseSave, clearDraft])

  const handlePendingSmartParseSave = async () => {
    if (!smartParseSeed && trackerMode === 'timer') {
      try {
        await start({ description: description.trim() || undefined, ...associations })
        clearPendingSmartParseSave()
      } catch {
        // TimerContext surfaces the error.
      }
      return
    }

    await entryRef.current?.saveEntry()
  }

  const handleDescriptionEnter = () => {
    if (pendingSmartParseSave) {
      return
    }
    if (trackerMode === 'timer') {
      timerRef.current?.toggle()
      return
    }
    if (trackerMode === 'manual' || trackerMode === 'duration') {
      void entryRef.current?.saveEntry()
    }
  }

  const handleSelectTemplate = (template: TimeEntryTemplate) => {
    if (isRunning) return

    templateNonceRef.current += 1
    clearShareNotice()
    exitSmartParseMode()
    clearPendingSmartParseSave()
    setSelectedTemplateId(template.id)
    setTemplateSeed({
      template,
      nonce: templateNonceRef.current,
    })
    applyTemplate({
      description: template.description ?? '',
      projectId: template.projectId,
      projectTaskId: template.projectTaskId,
      projectName: template.projectName,
      projectColor: template.projectColor,
      projectTaskName: template.taskName,
      tagIds: template.tags.map((tag) => tag.id),
      knownTags: template.tags,
      isBillable: template.isBillable,
    })
    setTrackerMode(isDurationOnlyTemplate(template) ? 'duration' : 'manual')
  }

  const handleClearDescriptionAndAssociations = () => {
    clearDraft()
    clearTemplateSelection()
    clearPendingSmartParseSave()
  }

  const projectTaskLabel = projectName
    ? projectTaskName
      ? `${projectName} · ${projectTaskName}`
      : projectName
    : null

  const selectedTags = knownTags.filter((tag) => tagIds.includes(tag.id))

  const entryVariant =
    trackerMode === 'timer' ? null : trackerMode === 'duration' ? 'duration' : 'range'

  const descriptionDisabled = isInitializing || isToggling || isSavingManual

  const inSmartParseFlow = isSmartParseMode || pendingSmartParseSave
  const smartParseInputVariant =
    pendingSmartParseSave && entryVariant ? entryVariant : 'duration'
  const showSmartParseTimeFields = pendingSmartParseSave && Boolean(entryVariant)
  const saveDisabled =
    isSmartParseMode || descriptionDisabled || isSavingManual || isRunning

  return (
    <>
      <div className={TIMER_PANEL_CLASS}>
        {isSmartParseMode ? (
          <SmartParseDescriptionField
            value={smartParseText}
            onChange={setSmartParseText}
            onSubmit={() => void handleSmartParseSubmit()}
            onExit={exitSmartParseMode}
            disabled={descriptionDisabled}
            isParsing={isParsingSmartEntry}
            error={smartParseError}
          />
        ) : (
          <div className="flex items-start gap-3 px-6 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              {trackerMode === 'duration' ? (
                <input
                  className="w-full border-none bg-transparent p-0 font-sans text-lg text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
                  placeholder="What did you work on?"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={descriptionDisabled}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleDescriptionEnter()
                    }
                  }}
                />
              ) : (
                <MentionDescriptionField
                  className="w-full border-none bg-transparent p-0 font-sans text-lg text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
                  placeholder="What are you working on? Type @ to share with a teammate"
                  value={description}
                  onChange={setDescription}
                  selectedTeammates={mentionedTeammates}
                  onMentionChange={setMentionedTeammates}
                  disabled={descriptionDisabled}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleDescriptionEnter()
                    }
                  }}
                />
              )}
            </div>

            <SmartParseButton
              disabled={descriptionDisabled}
              onClick={toggleSmartParseMode}
              className="mt-1"
            />
          </div>
        )}

        {shareNotice ? (
          <div className="mx-6 mb-3 rounded-md bg-brand-tint px-3 py-2.5 text-sm text-navy">
            {shareNotice}
          </div>
        ) : null}

        <span aria-hidden="true" className="block h-px w-full bg-brand-gradient" />

        <div className="flex min-h-[5.5rem] flex-wrap items-center gap-x-2 gap-y-3 border-t border-navy/[0.06] bg-surface-muted/25 px-6 py-3.5">
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
                setProject({
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
                    setTags(ids, tags)
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
            onClick={() => setBillable(!isBillable)}
          />

          {(projectTaskLabel ||
            selectedTags.length > 0 ||
            showSmartParseTimeFields) && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {projectTaskLabel ? (
                <MetadataBubble
                  label={projectTaskLabel}
                  color={projectColor}
                  onRemove={clearProject}
                />
              ) : null}
              {selectedTags.map((tag) => (
                <MetadataBubble
                  key={tag.id}
                  label={tag.name}
                  color={tag.color}
                  onRemove={() => removeTag(tag.id)}
                />
              ))}
              {showSmartParseTimeFields ? (
                <TimeEntryInput
                  key={`smart-parse-${smartParseInputVariant}-${smartParseSeed?.nonce ?? 'draft'}`}
                  ref={pendingSmartParseSave ? entryRef : undefined}
                  variant={smartParseInputVariant}
                  description={description}
                  mentionedTeammates={mentionedTeammates}
                  onShared={setShareNotice}
                  onClearDescription={handleClearDescriptionAndAssociations}
                  onClearMentions={() => setMentionedTeammates([])}
                  onClearShareNotice={clearShareNotice}
                  associations={associations}
                  mode={trackerMode}
                  onModeChange={switchMode}
                  modeMenuDisabled={isRunning}
                  smartParseSeed={smartParseSeed}
                  hideActions
                  fieldsDisabled={isSmartParseMode}
                  layout="inline"
                />
              ) : null}
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

          <div className="flex flex-wrap items-center justify-end gap-2">
            {inSmartParseFlow ? (
              <>
                {pendingSmartParseSave ? (
                  <button
                    type="button"
                    onClick={dismissPendingSmartParse}
                    disabled={isSavingManual || isToggling}
                    className="flex size-9 flex-shrink-0 items-center justify-center rounded-full border border-navy/[0.06] bg-white text-navy/40 shadow-soft transition-colors hover:bg-surface-muted hover:text-navy/70 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Discard parsed entry"
                  >
                    <Icon name="x" className="size-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={saveDisabled}
                  onClick={() => void handlePendingSmartParseSave()}
                  className="flex h-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient px-5 text-sm font-semibold text-white shadow-soft transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingManual || isToggling ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : trackerMode === 'timer' ? (
              <TimerModeInput
                ref={timerRef}
                description={description}
                setDescription={setDescription}
                mentionedTeammates={mentionedTeammates}
                setMentionedTeammates={setMentionedTeammates}
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
                onClearMentions={() => setMentionedTeammates([])}
                onClearShareNotice={clearShareNotice}
                associations={associations}
                mode={trackerMode}
                onModeChange={switchMode}
                modeMenuDisabled={isRunning}
                templateSeed={templateSeed}
                smartParseSeed={smartParseSeed}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <TimeEntrySuggestionsPanel
          selectedTemplateId={selectedTemplateId}
          onSelectSuggestion={handleSelectTemplate}
        />
        <TimeEntryTemplatesPanel
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
    </>
  )
}
