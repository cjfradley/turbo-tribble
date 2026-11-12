import { shallowRef } from 'vue'
import { account } from './auth'
import { uploadMessageHtml, type TeamRef, type UploadMessage } from '@/services/graphTypes'

export * from '@/services/graphTypes'

/**
 * Mock replacement for src/services/graph.ts (mock mode only).
 * Nothing is sent to Teams; posted messages are collected in `sentMessages`
 * and logged to the console so you can check their content and link.
 */

const teams: readonly (TeamRef & { channels: TeamRef[] })[] = [
  {
    id: 'mock-team-finance',
    name: 'Finance',
    channels: [
      { id: 'mock-channel-finance-general', name: 'General' },
      { id: 'mock-channel-finance-reports', name: 'Reports' },
    ],
  },
  {
    id: 'mock-team-hr',
    name: 'HR',
    channels: [
      { id: 'mock-channel-hr-general', name: 'General' },
      { id: 'mock-channel-hr-onboarding', name: 'Onboarding' },
    ],
  },
]

export interface SentMessage extends UploadMessage {
  teamName: string
  channelName: string
  html: string
  sentAt: Date
}

/** Messages "posted" in this session, newest first. */
export const sentMessages = shallowRef<SentMessage[]>([])

const delay = () => new Promise((resolve) => setTimeout(resolve, 200))

function requireSignIn(): void {
  if (!account.value) throw new Error('Not signed in')
}

export async function listJoinedTeams(): Promise<TeamRef[]> {
  requireSignIn()
  await delay()
  return teams.map(({ id, name }) => ({ id, name }))
}

export async function listChannels(teamId: string): Promise<TeamRef[]> {
  requireSignIn()
  await delay()
  const team = teams.find((t) => t.id === teamId)
  if (!team) throw new Error(`Team ${teamId} not found`)
  return team.channels.map((channel) => ({ ...channel }))
}

export async function postUploadMessage(message: UploadMessage): Promise<void> {
  requireSignIn()
  await delay()
  const team = teams.find((t) => t.id === message.teamId)
  const channel = team?.channels.find((c) => c.id === message.channelId)
  if (!team || !channel) throw new Error('Channel not found')

  const sent: SentMessage = {
    ...message,
    teamName: team.name,
    channelName: channel.name,
    html: uploadMessageHtml(message),
    sentAt: new Date(),
  }
  sentMessages.value = [sent, ...sentMessages.value]
  console.info(`[mock] Teams message to ${team.name} › ${channel.name}:\n${sent.html}`)
}
