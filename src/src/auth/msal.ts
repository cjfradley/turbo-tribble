import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser'
import { shallowRef } from 'vue'
import { config, scopes } from '@/config'

export const msal = new PublicClientApplication({
  auth: {
    clientId: config.clientId,
    authority: `https://login.microsoftonline.com/${config.tenantId}`,
    redirectUri: config.appUrl,
    postLogoutRedirectUri: config.appUrl,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
})

/** The signed-in account, or null. Reactive so the UI and router guard can follow it. */
export const account = shallowRef<AccountInfo | null>(null)

const RETURN_TO_KEY = 'doclib.returnTo'

/** Only same-site paths are accepted, so the value can't redirect to another site. */
function isSafePath(path: string | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//')
}

/**
 * Initialises MSAL and completes a pending sign-in redirect.
 * Returns the in-app path the user wanted before signing in, if any (FR-2.6).
 */
export async function initAuth(): Promise<string | null> {
  await msal.initialize()
  const result = await msal.handleRedirectPromise()

  const current = result?.account ?? msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null
  msal.setActiveAccount(current)
  account.value = current

  if (!result) return null
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  return isSafePath(returnTo) ? returnTo : null
}

export async function signIn(returnTo?: string): Promise<void> {
  if (isSafePath(returnTo ?? null)) sessionStorage.setItem(RETURN_TO_KEY, returnTo!)
  await msal.loginRedirect({
    scopes: [...scopes.graph],
    // Ask for Storage consent up front, so the first storage call doesn't need another redirect.
    extraScopesToConsent: [...scopes.storage],
  })
}

export async function signOut(): Promise<void> {
  await msal.logoutRedirect({ account: account.value })
}

/** Gets an access token silently, falling back to a redirect when interaction is required. */
export async function getAccessToken(requestScopes: readonly string[]): Promise<{
  token: string
  expiresOn: Date | null
}> {
  const active = account.value
  if (!active) throw new Error('Not signed in')
  try {
    const result = await msal.acquireTokenSilent({ scopes: [...requestScopes], account: active })
    return { token: result.accessToken, expiresOn: result.expiresOn }
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await msal.acquireTokenRedirect({ scopes: [...requestScopes], account: active })
    }
    throw error
  }
}

/** True if the signed-in user has the admin app role in their ID token (FR-1.6). UI only. */
export function isAdmin(user: AccountInfo | null = account.value): boolean {
  const roles = user?.idTokenClaims?.roles
  return Array.isArray(roles) && roles.includes(config.adminRole)
}
