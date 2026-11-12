import type { AccountInfo } from '@azure/msal-browser'
import { shallowRef } from 'vue'
import { config } from '@/config'

/**
 * Mock replacement for src/auth/msal.ts (mock mode only).
 * Instead of signing in with Microsoft, you pick one of the sample users below.
 */

export interface MockUser {
  id: string
  name: string
  email: string
  admin: boolean
}

export const mockUsers: readonly MockUser[] = [
  { id: 'mock-user-anna', name: 'Anna Muster', email: 'anna@contoso.test', admin: false },
  { id: 'mock-user-ben', name: 'Ben Admin', email: 'ben@contoso.test', admin: true },
]

const USER_KEY = 'doclib.mock.user'

function toAccount(user: MockUser): AccountInfo {
  return {
    homeAccountId: `${user.id}.${config.tenantId}`,
    localAccountId: user.id,
    tenantId: config.tenantId,
    environment: 'login.microsoftonline.com',
    username: user.email,
    name: user.name,
    idTokenClaims: { roles: user.admin ? [config.adminRole] : [] },
  }
}

function storedUser(): MockUser | null {
  const id = sessionStorage.getItem(USER_KEY)
  return mockUsers.find((user) => user.id === id) ?? null
}

export const account = shallowRef<AccountInfo | null>(null)

function isSafePath(path: string | undefined | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//')
}

export async function initAuth(): Promise<string | null> {
  const user = storedUser()
  account.value = user ? toAccount(user) : null
  return null
}

/** Signs in as a sample user and goes back to the page the user wanted (mock mode only). */
export function signInAs(userId: string, returnTo?: string): void {
  sessionStorage.setItem(USER_KEY, userId)
  // A full reload mimics the real sign-in redirect and resets all app state.
  window.location.assign(isSafePath(returnTo) ? returnTo : '/files')
}

/** Without a user choice there's nothing to sign in as; the sign-in page shows the user picker. */
export async function signIn(returnTo?: string): Promise<void> {
  const first = mockUsers[0]
  if (first) signInAs(first.id, returnTo)
}

export async function signOut(): Promise<void> {
  sessionStorage.removeItem(USER_KEY)
  window.location.assign('/signin')
}

export async function getAccessToken(): Promise<{ token: string; expiresOn: Date | null }> {
  if (!account.value) throw new Error('Not signed in')
  return { token: 'mock-token', expiresOn: new Date(Date.now() + 60 * 60_000) }
}

export function isAdmin(user: AccountInfo | null = account.value): boolean {
  const roles = user?.idTokenClaims?.roles
  return Array.isArray(roles) && roles.includes(config.adminRole)
}
