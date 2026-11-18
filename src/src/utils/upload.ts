/** Upload rules: file size and type limits (FR-3.6) and rename suggestions (FR-3.5). */
import { normaliseFileName } from './fileName'

export interface UploadRules {
  maxBytes: number
  /** Comma-separated like an <input accept>: ".pdf", "application/pdf", "image/*". Empty allows all. */
  accept: string
}

export type FileError = 'empty' | 'too-large' | 'type-not-allowed'

/** Returns why a file can't be uploaded, or null if it's allowed. */
export function validateFile(file: File, rules: UploadRules): FileError | null {
  if (file.size === 0) return 'empty'
  if (file.size > rules.maxBytes) return 'too-large'
  if (!matchesAccept(file, rules.accept)) return 'type-not-allowed'
  return null
}

function matchesAccept(file: File, accept: string): boolean {
  const entries = accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  if (entries.length === 0) return true

  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return entries.some((entry) => {
    if (entry.startsWith('.')) return name.endsWith(entry)
    if (entry.endsWith('/*')) return type.startsWith(entry.slice(0, -1))
    return type === entry
  })
}

/**
 * Suggests a name that isn't taken: "Report.pdf" → "Report (1).pdf", "Report (2).pdf", ...
 * `taken` holds normalised blob names, so the check ignores case like the conflict check does.
 */
export function suggestFreeName(originalName: string, taken: ReadonlySet<string>): string {
  const dot = originalName.lastIndexOf('.')
  const hasExtension = dot > 0
  const base = hasExtension ? originalName.slice(0, dot) : originalName
  const extension = hasExtension ? originalName.slice(dot) : ''
  for (let n = 1; ; n++) {
    const candidate = `${base} (${n})${extension}`
    if (!taken.has(normaliseFileName(candidate))) return candidate
  }
}
