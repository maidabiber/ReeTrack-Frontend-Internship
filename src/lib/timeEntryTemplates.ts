export function isDurationOnlyTemplate(template: {
  startTimeUtc: string | null
  endTimeUtc: string | null
}): boolean {
  return template.startTimeUtc === null && template.endTimeUtc === null
}
