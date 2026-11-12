import { Client } from '@microsoft/microsoft-graph-client'
import type { Channel, Team } from '@microsoft/microsoft-graph-types'
import { getAccessToken } from '@/auth/msal'
import { scopes } from '@/config'
import { uploadMessageHtml, type TeamRef, type UploadMessage } from './graphTypes'

export * from './graphTypes'

/** Microsoft Graph calls for the Teams notification (FR-7). Delegated, as the signed-in user. */

let client: Client | undefined

function graph(): Client {
  client ??= Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => (await getAccessToken(scopes.graph)).token,
    },
  })
  return client
}

export async function listJoinedTeams(): Promise<TeamRef[]> {
  const response: { value: Team[] } = await graph()
    .api('/me/joinedTeams')
    .select('id,displayName')
    .get()
  return response.value.map((team) => ({ id: team.id ?? '', name: team.displayName ?? '' }))
}

export async function listChannels(teamId: string): Promise<TeamRef[]> {
  const response: { value: Channel[] } = await graph()
    .api(`/teams/${encodeURIComponent(teamId)}/channels`)
    .select('id,displayName')
    .get()
  return response.value.map((channel) => ({
    id: channel.id ?? '',
    name: channel.displayName ?? '',
  }))
}

/** Posts the upload message to a channel (FR-7.3, FR-7.4). */
export async function postUploadMessage(message: UploadMessage): Promise<void> {
  await graph()
    .api(
      `/teams/${encodeURIComponent(message.teamId)}/channels/${encodeURIComponent(message.channelId)}/messages`,
    )
    .post({ body: { contentType: 'html', content: uploadMessageHtml(message) } })
}
