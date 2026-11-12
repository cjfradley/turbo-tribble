import type { AccessToken, TokenCredential } from '@azure/core-auth'
import { BlobServiceClient, RestError, type ContainerClient } from '@azure/storage-blob'
import { getAccessToken } from '@/auth/msal'
import { config, scopes } from '@/config'
import {
  contentDisposition,
  decodeMetadataValue,
  encodeMetadataValue,
  normaliseFileName,
  normaliseSearchText,
} from '@/utils/fileName'
import { indexTagsToTags, tagQuery, tagsToIndexTags } from '@/utils/tags'
import { FileExistsError, type DocumentItem, type UploadOptions } from './storageTypes'

export * from './storageTypes'

/**
 * Browser-side access to the document container (architecture.md, section 2).
 * Every call uses the signed-in user's Entra token; Azure enforces their storage role.
 */

/** Adapts MSAL to the TokenCredential interface the Storage SDK expects. */
const msalCredential: TokenCredential = {
  async getToken(): Promise<AccessToken> {
    const { token, expiresOn } = await getAccessToken(scopes.storage)
    return {
      token,
      expiresOnTimestamp: expiresOn?.getTime() ?? Date.now() + 5 * 60_000,
    }
  },
}

let containerClient: ContainerClient | undefined

function container(): ContainerClient {
  containerClient ??= new BlobServiceClient(config.storageUrl, msalCredential).getContainerClient(
    config.container,
  )
  return containerClient
}

/** Lists documents whose name starts with the (normalised) search text (FR-2, FR-5.2). */
export async function listDocuments(searchText = ''): Promise<DocumentItem[]> {
  const prefix = normaliseSearchText(searchText) || undefined
  const items: DocumentItem[] = []
  for await (const blob of container().listBlobsFlat({
    prefix,
    includeMetadata: true,
    includeTags: true,
  })) {
    const metadata = blob.metadata ?? {}
    items.push({
      name: blob.name,
      originalName: decodeMetadataValue(metadata.originalname) ?? blob.name,
      tags: indexTagsToTags(blob.tags),
      size: blob.properties.contentLength ?? 0,
      contentType: blob.properties.contentType ?? '',
      uploadedOn: blob.properties.createdOn,
      uploaderId: metadata.uploaderid,
      uploaderName: decodeMetadataValue(metadata.uploadername),
    })
  }
  return items
}

/** Names of documents that have *all* the given tags (FR-5.3, FR-5.4). */
export async function findByTags(tags: readonly string[]): Promise<Set<string>> {
  const names = new Set<string>()
  if (tags.length === 0) return names
  for await (const blob of container().findBlobsByTags(tagQuery(tags))) {
    names.add(blob.name)
  }
  return names
}

/**
 * Uploads a file under its normalised name (FR-3.7).
 * Throws FileExistsError if the name is taken and `overwrite` isn't set.
 */
export async function uploadDocument(file: File, options: UploadOptions): Promise<string> {
  const blobName = normaliseFileName(file.name)
  const blob = container().getBlockBlobClient(blobName)
  try {
    await blob.uploadData(file, {
      metadata: {
        // Metadata keys are case-insensitive and returned in lower case.
        originalname: encodeMetadataValue(file.name),
        uploaderid: options.uploader.id,
        uploadername: encodeMetadataValue(options.uploader.name),
      },
      tags: tagsToIndexTags(options.tags),
      blobHTTPHeaders: {
        blobContentType: file.type || 'application/octet-stream',
        blobContentDisposition: contentDisposition(file.name),
      },
      conditions: options.overwrite ? undefined : { ifNoneMatch: '*' },
      onProgress: (progress) => options.onProgress?.(progress.loadedBytes),
    })
  } catch (error) {
    if (error instanceof RestError && (error.statusCode === 409 || error.statusCode === 412)) {
      throw new FileExistsError(blobName)
    }
    throw error
  }
  return blobName
}

export async function setDocumentTags(blobName: string, tags: readonly string[]): Promise<void> {
  await container().getBlobClient(blobName).setTags(tagsToIndexTags(tags))
}

/** Admins only; Azure rejects the call for users without delete rights (FR-6). */
export async function deleteDocument(blobName: string): Promise<void> {
  await container().getBlobClient(blobName).delete()
}

/** Downloads a document with the user's token and saves it under its original name. */
export async function downloadDocument(item: DocumentItem): Promise<void> {
  const response = await container().getBlobClient(item.name).download()
  const body = await response.blobBody
  if (!body) throw new Error('Download returned no content')

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
