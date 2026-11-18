import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuth } from '@/auth/useAuth'
import { config } from '@/config'
import {
  FileExistsError,
  setDocumentTags,
  uploadDocument,
  type DocumentItem,
} from '@/services/storage'
import { useDocumentsStore } from '@/stores/documents'
import { normaliseFileName } from '@/utils/fileName'
import { normaliseTag } from '@/utils/tags'
import { suggestFreeName, validateFile, type FileError } from '@/utils/upload'

export type UploadStatus = 'pending' | 'conflict' | 'uploading' | 'done' | 'error' | 'cancelled'

export interface UploadItem {
  id: string
  file: File
  /** Normalised name the file will be stored under (FR-3.7). */
  blobName: string
  /** Tags to store with the file; editable before and during the upload (FR-3.3). */
  tags: string[]
  loadedBytes: number
  status: UploadStatus
  error?: string
  /** The document with the same name, when status is 'conflict' (FR-3.5). */
  existing?: DocumentItem
}

/** How many files upload at the same time. */
const PARALLEL_UPLOADS = 3

const fileErrorMessages: Record<FileError, string> = {
  empty: 'The file is empty.',
  'too-large': `The file is larger than ${Math.round(config.upload.maxBytes / 1024 ** 2)} MB.`,
  'type-not-allowed': "This file type isn't allowed.",
}

const sameTags = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((tag) => b.includes(tag))

/**
 * Upload queue (FR-3): one row per file with its tags, progress and status.
 * Name conflicts stop a file until the user picks overwrite, rename or cancel.
 */
export const useUploadsStore = defineStore('uploads', () => {
  const items = ref<UploadItem[]>([])
  /** Last status change, for the screen-reader live region. */
  const announcement = ref('')

  const documents = useDocumentsStore()
  const auth = useAuth()
  const controllers = new Map<string, AbortController>()

  /** Items are reactive proxies; always look them up by id so changes are tracked. */
  const find = (id: string) => items.value.find((item) => item.id === id)

  function add(files: Iterable<File>): void {
    for (const file of files) {
      const invalid = validateFile(file, config.upload)
      items.value.push({
        id: crypto.randomUUID(),
        file,
        blobName: normaliseFileName(file.name),
        tags: [],
        loadedBytes: 0,
        status: invalid ? 'error' : 'pending',
        error: invalid ? fileErrorMessages[invalid] : undefined,
      })
      if (invalid) announcement.value = `${file.name}: ${fileErrorMessages[invalid]}`
    }
  }

  const pending = computed(() => items.value.filter((item) => item.status === 'pending'))
  const conflicts = computed(() => items.value.filter((item) => item.status === 'conflict'))
  const hasFinished = computed(() =>
    items.value.some((item) => ['done', 'error', 'cancelled'].includes(item.status)),
  )

  /** Uploads every pending file, a few at a time. */
  async function uploadAll(): Promise<void> {
    const queue = pending.value.map((item) => item.id)
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) await start(id)
    }
    await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker))
  }

  /** Uploads one file. Without `overwrite`, a name that's taken moves it to 'conflict'. */
  async function start(id: string, overwrite = false): Promise<void> {
    const item = find(id)
    if (!item || (item.status !== 'pending' && !(overwrite && item.status === 'conflict'))) return

    // Ask before sending any bytes when the loaded list already has this name.
    const existing = documents.items.find((doc) => doc.name === item.blobName)
    if (existing && !overwrite) return markConflict(item, existing)

    const controller = new AbortController()
    controllers.set(id, controller)
    const tagsAtStart = [...item.tags]
    Object.assign(item, { status: 'uploading', loadedBytes: 0, error: undefined })

    try {
      await uploadDocument(item.file, {
        tags: tagsAtStart,
        uploader: { id: auth.userId.value, name: auth.displayName.value },
        overwrite,
        onProgress: (loaded) => (item.loadedBytes = loaded),
        abortSignal: controller.signal,
      })
      // Tags changed while the file was uploading are written afterwards (FR-3.3).
      if (!sameTags(item.tags, tagsAtStart)) await setDocumentTags(item.blobName, item.tags)

      item.status = 'done'
      item.loadedBytes = item.file.size
      announcement.value = `${item.file.name} uploaded.`
      documents.upsert({
        name: item.blobName,
        originalName: item.file.name,
        tags: item.tags.map(normaliseTag).sort(),
        size: item.file.size,
        contentType: item.file.type || 'application/octet-stream',
        uploadedOn: new Date(),
        uploaderId: auth.userId.value,
        uploaderName: auth.displayName.value,
      })
    } catch (error) {
      if (controller.signal.aborted) {
        item.status = 'cancelled'
        announcement.value = `${item.file.name}: upload cancelled.`
      } else if (error instanceof FileExistsError) {
        // Someone uploaded the same name after the list was loaded: reload to see who.
        await documents.load()
        markConflict(
          item,
          documents.items.find((doc) => doc.name === item.blobName),
        )
      } else {
        item.status = 'error'
        item.error = error instanceof Error ? error.message : String(error)
        announcement.value = `${item.file.name}: upload failed.`
      }
    } finally {
      controllers.delete(id)
    }
  }

  function markConflict(item: UploadItem, existing: DocumentItem | undefined): void {
    item.status = 'conflict'
    item.existing = existing
    announcement.value = `A file named ${item.file.name} already exists.`
  }

  /**
   * FR-3.5: only the original uploader and admins are offered "overwrite".
   * This is a UI rule only; Azure lets any contributor overwrite (NFR-8).
   */
  function canOverwrite(item: UploadItem): boolean {
    return auth.isAdmin.value || (!!item.existing && item.existing.uploaderId === auth.userId.value)
  }

  function overwrite(id: string): Promise<void> {
    const item = find(id)
    if (!item || item.status !== 'conflict' || !canOverwrite(item)) return Promise.resolve()
    return start(id, true)
  }

  /** A free name to offer in the rename field. */
  function suggestName(item: UploadItem): string {
    const taken = new Set([
      ...documents.items.map((doc) => doc.name),
      ...items.value.filter((other) => other.id !== item.id).map((other) => other.blobName),
    ])
    return suggestFreeName(item.file.name, taken)
  }

  /** Renames the file and tries again; a name that's also taken shows the conflict again. */
  function rename(id: string, newName: string): Promise<void> {
    const item = find(id)
    const name = newName.trim()
    if (!item || item.status !== 'conflict' || !name) return Promise.resolve()
    item.file = new File([item.file], name, {
      type: item.file.type,
      lastModified: item.file.lastModified,
    })
    item.blobName = normaliseFileName(name)
    item.existing = undefined
    item.status = 'pending'
    return start(id)
  }

  function cancel(id: string): void {
    const item = find(id)
    if (!item) return
    if (item.status === 'uploading') controllers.get(id)?.abort()
    else if (item.status === 'pending' || item.status === 'conflict') item.status = 'cancelled'
  }

  function remove(id: string): void {
    if (find(id)?.status === 'uploading') return
    items.value = items.value.filter((item) => item.id !== id)
  }

  function clearFinished(): void {
    items.value = items.value.filter(
      (item) => !['done', 'error', 'cancelled'].includes(item.status),
    )
  }

  return {
    items,
    announcement,
    pending,
    conflicts,
    hasFinished,
    add,
    uploadAll,
    start,
    canOverwrite,
    overwrite,
    suggestName,
    rename,
    cancel,
    remove,
    clearFinished,
  }
})

// Without this, a hot reload keeps the old store instance (and its old functions).
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useUploadsStore, import.meta.hot))
