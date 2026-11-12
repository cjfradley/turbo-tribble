/**
 * File name normalisation (FR-3.7).
 *
 * Blob names are case-sensitive and prefix search matches exact case, so every
 * blob is stored under a normalised name and search text is normalised the same
 * way. The name the user uploaded is kept in metadata for display.
 */
export function normaliseFileName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase()
}

/** Normalises search text so it can be used as a blob prefix (FR-5.2). */
export const normaliseSearchText = normaliseFileName

/** Blob metadata only accepts ASCII, so free text is URL-encoded before storing. */
export function encodeMetadataValue(value: string): string {
  return encodeURIComponent(value)
}

export function decodeMetadataValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Content-Disposition header so downloads are saved under the original name. */
export function contentDisposition(originalName: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`
}
