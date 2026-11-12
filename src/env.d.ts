/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Entra ID tenant (directory) ID. */
  readonly VITE_TENANT_ID: string
  /** Client (application) ID of the SPA app registration. */
  readonly VITE_CLIENT_ID: string
  /** Blob service URL, e.g. https://stdoclibprod.blob.core.windows.net */
  readonly VITE_STORAGE_URL: string
  /** Blob container that holds the documents. */
  readonly VITE_CONTAINER: string
  /** Public URL of the app, used for the sign-in redirect and Teams deep links. */
  readonly VITE_APP_URL: string
  /** Name of the Entra app role that marks admins. Defaults to DocLibrary.Admin. */
  readonly VITE_ADMIN_ROLE?: string
  /** "true" runs the dev server with fake sign-in, storage and Teams (src/mocks/). */
  readonly VITE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** True only on the dev server with VITE_MOCK=true (set by vite.config.ts). */
declare const __MOCK_MODE__: boolean
