import type { NoteBlockSpec } from '../../../../types/customReport'
import { MAX_NOTE_LENGTH } from '../../../../lib/customReportSpec'

export function NoteBlockEditor({
  block,
  onChange,
}: {
  block: NoteBlockSpec
  onChange: (next: NoteBlockSpec) => void
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">
        Note · plain text, ## for headings
      </p>
      <textarea
        value={block.text}
        maxLength={MAX_NOTE_LENGTH}
        rows={5}
        onChange={(event) => onChange({ ...block, text: event.target.value })}
        placeholder="Add a note for this report…"
        className="mt-2 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-body leading-[1.5] text-navy outline-none focus:border-brand"
      />
      <p className="mt-1 text-right font-mono text-[10px] text-navy/35 tabular-nums">
        {block.text.length}/{MAX_NOTE_LENGTH}
      </p>
    </div>
  )
}
