export interface Teammate {
  id: string
  email: string
  displayName: string | null
}

export function teammateLabel(teammate: Teammate): string {
  return teammate.displayName?.trim() || teammate.email
}

export function filterTeammates(teammates: Teammate[], query: string): Teammate[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return teammates

  return teammates.filter((teammate) => {
    const label = teammateLabel(teammate).toLowerCase()
    return label.includes(normalized) || teammate.email.toLowerCase().includes(normalized)
  })
}

export function findMentionQuery(description: string, cursorIndex: number): string | null {
  const beforeCursor = description.slice(0, cursorIndex)
  const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/)
  return match ? match[1] : null
}

export function applyMentionSelection(
  description: string,
  cursorIndex: number,
): { description: string; cursorIndex: number } {
  const beforeCursor = description.slice(0, cursorIndex)
  const afterCursor = description.slice(cursorIndex)
  const mentionStart = beforeCursor.lastIndexOf('@')
  if (mentionStart < 0) {
    return { description, cursorIndex }
  }

  const beforeMention = description.slice(0, mentionStart).replace(/\s$/, '')
  const trimmedAfter = afterCursor.replace(/^\s+/, '')
  const nextDescription = beforeMention && trimmedAfter
    ? `${beforeMention} ${trimmedAfter}`
    : beforeMention || trimmedAfter

  return { description: nextDescription, cursorIndex: mentionStart }
}
