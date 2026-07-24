/**
 * Triggers a browser download from a Blob via a temporary object-URL anchor.
 *
 * The anchor has to be in the document and the object URL has to outlive the click:
 * Firefox ignores a click on a detached anchor, and both Firefox and Safari abort the
 * download when the URL is revoked synchronously afterwards.
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
