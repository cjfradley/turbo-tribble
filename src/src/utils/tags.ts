/** Tag rules from FR-4 and the Blob Index Tag limits (hosting.md, section 2.2). */
export const MAX_TAGS = 10
export const MAX_TAG_LENGTH = 128

/** Fixed value stored for every tag: tags are plain labels kept as index tag keys. */
export const TAG_VALUE = '1'

const ALLOWED = /^[a-z0-9 +\-./:=_]+$/

export function normaliseTag(tag: string): string {
  return tag.trim().toLowerCase()
}

export type TagError = 'empty' | 'too-long' | 'invalid-characters' | 'duplicate' | 'too-many'

/** Returns why a tag can't be added to `existing`, or null if it's valid. */
export function validateTag(tag: string, existing: readonly string[] = []): TagError | null {
  const normalised = normaliseTag(tag)
  if (!normalised) return 'empty'
  if (normalised.length > MAX_TAG_LENGTH) return 'too-long'
  if (!ALLOWED.test(normalised)) return 'invalid-characters'
  if (existing.includes(normalised)) return 'duplicate'
  if (existing.length >= MAX_TAGS) return 'too-many'
  return null
}

export function tagsToIndexTags(tags: readonly string[]): Record<string, string> {
  return Object.fromEntries(tags.map((tag) => [normaliseTag(tag), TAG_VALUE]))
}

export function indexTagsToTags(indexTags: Record<string, string> | undefined): string[] {
  return Object.keys(indexTags ?? {}).sort()
}

/** Find Blobs by Tags expression that matches files having *all* tags (AND only). */
export function tagQuery(tags: readonly string[]): string {
  return tags
    .map((tag) => `"${normaliseTag(tag).replace(/"/g, '')}" = '${TAG_VALUE}'`)
    .join(' AND ')
}
