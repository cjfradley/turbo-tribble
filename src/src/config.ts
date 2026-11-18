/**
 * Mock mode: fake sign-in, storage and Teams, so the app runs without an M365 tenant.
 * Only possible on the dev server; production builds always evaluate this to `false`,
 * so the mock code is never bundled (see vite.config.ts and src/mocks/).
 */
export const isMockMode = __MOCK_MODE__

function required(name: keyof ImportMetaEnv, mockDefault: string): string {
  const value = import.meta.env[name]
  if (value) return value
  if (isMockMode) return mockDefault
  throw new Error(`Missing environment variable ${name}. See .env.example.`)
}

export const config = {
  tenantId: required('VITE_TENANT_ID', 'mock-tenant'),
  clientId: required('VITE_CLIENT_ID', 'mock-client'),
  storageUrl: required('VITE_STORAGE_URL', 'https://mock.blob.core.windows.net'),
  container: required('VITE_CONTAINER', 'documents'),
  appUrl: required('VITE_APP_URL', window.location.origin).replace(/\/$/, ''),
  adminRole: import.meta.env.VITE_ADMIN_ROLE || 'DocLibrary.Admin',
  /** Upload limits (FR-3.6). The values are still TBD, so they're set per environment. */
  upload: {
    maxBytes: Number(import.meta.env.VITE_MAX_FILE_MB || 100) * 1024 ** 2,
    accept: import.meta.env.VITE_ALLOWED_TYPES || '',
  },
} as const

/** Delegated scopes. Storage and Graph are separate resources, so tokens are requested separately. */
export const scopes = {
  graph: ['User.Read', 'Team.ReadBasic.All', 'Channel.ReadBasic.All', 'ChannelMessage.Send'],
  storage: ['https://storage.azure.com/user_impersonation'],
} as const
