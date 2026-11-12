/** Types shared by the real storage service and its mock (src/mocks/storage.ts). */

export interface DocumentItem {
  /** Blob name: the normalised file name (FR-3.7). Used for deep links. */
  name: string
  /** File name as uploaded, for display, downloads and Teams messages. */
  originalName: string
  tags: string[]
  size: number
  contentType: string
  uploadedOn: Date | undefined
  uploaderId: string | undefined
  uploaderName: string | undefined
}

export interface Uploader {
  id: string
  name: string
}

export interface UploadOptions {
  tags: readonly string[]
  uploader: Uploader
  /** Replace an existing file with the same normalised name (FR-3.5). */
  overwrite?: boolean
  onProgress?: (loadedBytes: number) => void
}

export class FileExistsError extends Error {
  constructor(readonly blobName: string) {
    super(`A file named "${blobName}" already exists`)
    this.name = 'FileExistsError'
  }
}
