import { account, isAdmin } from './auth'
import { normaliseFileName, normaliseSearchText } from '@/utils/fileName'
import { MAX_TAGS, normaliseTag } from '@/utils/tags'
import { FileExistsError, type DocumentItem, type UploadOptions } from '@/services/storageTypes'

export * from '@/services/storageTypes'

/**
 * Mock replacement for src/services/storage.ts (mock mode only).
 *
 * Keeps documents in memory and saves their details to localStorage, so uploads
 * survive a reload. File contents are only kept in memory; after a reload,
 * downloads return a placeholder text file.
 *
 * It applies the same rules Azure would: normalised names, "file exists" on
 * conflicts, at most 10 tags, AND-only tag search, and delete for admins only.
 */

const STORE_KEY = 'doclib.mock.documents'
const LATENCY_MS = 250

/** Error shaped like the Storage SDK's RestError for a forbidden request. */
export class MockAuthorizationError extends Error {
  readonly statusCode = 403
  readonly code = 'AuthorizationPermissionMismatch'
  constructor() {
    super('This request is not authorized to perform this operation using this permission.')
    this.name = 'RestError'
  }
}

interface StoredDocument extends Omit<DocumentItem, 'uploadedOn'> {
  uploadedOn: string
}

const day = 24 * 60 * 60_000
const seed: StoredDocument[] = [
  sample(
    'Q3-Report.pdf',
    ['finance', 'q3', 'report'],
    482_113,
    'application/pdf',
    'mock-user-ben',
    'Ben Admin',
    2,
  ),
  sample(
    'Invoice 2026-0815.pdf',
    ['finance', 'invoice'],
    96_420,
    'application/pdf',
    'mock-user-anna',
    'Anna Muster',
    5,
  ),
  sample(
    'Onboarding Guide.docx',
    ['hr', 'onboarding'],
    1_245_870,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mock-user-anna',
    'Anna Muster',
    12,
  ),
  sample(
    'Budget 2027.xlsx',
    ['finance', 'budget', 'draft'],
    58_002,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'mock-user-ben',
    'Ben Admin',
    1,
  ),
  sample(
    'Bericht Zürich.pdf',
    ['report', 'zurich'],
    233_771,
    'application/pdf',
    'mock-user-anna',
    'Anna Muster',
    20,
  ),
]

function sample(
  originalName: string,
  tags: string[],
  size: number,
  contentType: string,
  uploaderId: string,
  uploaderName: string,
  daysAgo: number,
): StoredDocument {
  return {
    name: normaliseFileName(originalName),
    originalName,
    tags: [...tags].sort(),
    size,
    contentType,
    uploadedOn: new Date(Date.now() - daysAgo * day).toISOString(),
    uploaderId,
    uploaderName,
  }
}

const contents = new Map<string, Blob>()

function load(): Map<string, StoredDocument> {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const list: StoredDocument[] = raw ? JSON.parse(raw) : seed
    return new Map(list.map((doc) => [doc.name, doc]))
  } catch {
    return new Map(seed.map((doc) => [doc.name, doc]))
  }
}

function save(docs: Map<string, StoredDocument>): void {
  localStorage.setItem(STORE_KEY, JSON.stringify([...docs.values()]))
}

function toItem(doc: StoredDocument): DocumentItem {
  return { ...doc, tags: [...doc.tags], uploadedOn: new Date(doc.uploadedOn) }
}

const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

function requireSignIn(): void {
  if (!account.value) throw new Error('Not signed in')
}

function checkTags(tags: readonly string[]): string[] {
  const normalised = [...new Set(tags.map(normaliseTag))].sort()
  if (normalised.length > MAX_TAGS) {
    throw new Error(`A blob can have at most ${MAX_TAGS} tags (InvalidTag)`)
  }
  return normalised
}

/** Clears all mock documents and restores the sample data. */
export function resetMockData(): void {
  localStorage.removeItem(STORE_KEY)
  contents.clear()
}

export async function listDocuments(searchText = ''): Promise<DocumentItem[]> {
  requireSignIn()
  await delay()
  const prefix = normaliseSearchText(searchText)
  return [...load().values()]
    .filter((doc) => doc.name.startsWith(prefix))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toItem)
}

export async function findByTags(tags: readonly string[]): Promise<Set<string>> {
  requireSignIn()
  await delay()
  const wanted = tags.map(normaliseTag)
  const names = new Set<string>()
  if (wanted.length === 0) return names
  for (const doc of load().values()) {
    if (wanted.every((tag) => doc.tags.includes(tag))) names.add(doc.name)
  }
  return names
}

export async function uploadDocument(file: File, options: UploadOptions): Promise<string> {
  requireSignIn()
  const blobName = normaliseFileName(file.name)
  const tags = checkTags(options.tags)
  const docs = load()
  if (docs.has(blobName) && !options.overwrite) throw new FileExistsError(blobName)

  // Simulated upload progress in 5 steps.
  for (let step = 1; step <= 5; step++) {
    await delay(150)
    options.onProgress?.(Math.round((file.size * step) / 5))
  }

  docs.set(blobName, {
    name: blobName,
    originalName: file.name,
    tags,
    size: file.size,
    contentType: file.type || 'application/octet-stream',
    uploadedOn: new Date().toISOString(),
    uploaderId: options.uploader.id,
    uploaderName: options.uploader.name,
  })
  contents.set(blobName, file)
  save(docs)
  return blobName
}

export async function setDocumentTags(blobName: string, tags: readonly string[]): Promise<void> {
  requireSignIn()
  await delay()
  const docs = load()
  const doc = docs.get(blobName)
  if (!doc) throw new Error(`The specified blob "${blobName}" does not exist`)
  doc.tags = checkTags(tags)
  save(docs)
}

/** Like Azure in Phase 1: only the Document Admin role may delete. */
export async function deleteDocument(blobName: string): Promise<void> {
  requireSignIn()
  await delay()
  if (!isAdmin()) throw new MockAuthorizationError()
  const docs = load()
  if (!docs.delete(blobName)) throw new Error(`The specified blob "${blobName}" does not exist`)
  contents.delete(blobName)
  save(docs)
}

export async function downloadDocument(item: DocumentItem): Promise<void> {
  requireSignIn()
  await delay()
  const body =
    contents.get(item.name) ??
    new Blob([`Mock content for "${item.originalName}".\n`], { type: 'text/plain' })

  const url = URL.createObjectURL(body)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = item.originalName
    link.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
