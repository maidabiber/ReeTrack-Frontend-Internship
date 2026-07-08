/**
 * Strip HTML tags from Google Calendar-style descriptions into plain text.
 * Block tags and <br> become newlines; entities are decoded via the DOM.
 */
export function stripHtmlToText(input: string): string {
  const withBreaks = input
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, '\n')
    .replace(/<\s*\/?\s*(p|div|li|h[1-6]|tr|blockquote)(\s[^>]*)?>/gi, '\n')

  const doc = new DOMParser().parseFromString(withBreaks, 'text/html')
  const text = doc.body.textContent ?? ''

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
