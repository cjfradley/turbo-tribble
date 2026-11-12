import { config } from '@/config'

/** Types and helpers shared by the real Teams service and its mock (src/mocks/graph.ts). */

export interface TeamRef {
  id: string
  name: string
}

export interface UploadMessage {
  teamId: string
  channelId: string
  blobName: string
  originalName: string
  uploaderName: string
}

/** Deep link that opens the files list filtered to one document (FR-2.6, FR-7.3). */
export function documentLink(blobName: string): string {
  return `${config.appUrl}/files?name=${encodeURIComponent(blobName)}`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

/** HTML body of the Teams message (FR-7.3). */
export function uploadMessageHtml(message: UploadMessage): string {
  const link = documentLink(message.blobName)
  return (
    `<p><b>${escapeHtml(message.originalName)}</b> was uploaded by ${escapeHtml(message.uploaderName)}.</p>` +
    `<p><a href="${escapeHtml(link)}">Open in Document Library</a></p>`
  )
}
