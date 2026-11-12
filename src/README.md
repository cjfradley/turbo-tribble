# Document Library – Web Client

Vue 3 + TypeScript frontend for the Document Library (Phase 1: frontend-only, no backend API).
Requirements and design: [`../docs/requirements.md`](../docs/requirements.md),
[`../docs/architecture.md`](../docs/architecture.md), [`../docs/hosting.md`](../docs/hosting.md).

## Stack

- Vue 3 (Composition API), Vite, TypeScript
- Vue Router, Pinia
- MSAL (`@azure/msal-browser`) for Microsoft 365 sign-in
- `@azure/storage-blob` for documents, `@microsoft/microsoft-graph-client` for Teams
- Fluent UI Web Components (`@fluentui/web-components`) with the Fluent 2 light theme
- Vitest, ESLint + Oxlint, Prettier

## Getting started

```sh
cp .env.example .env.local   # fill in tenant, client ID, storage account, container
npm install
npm run dev                  # http://localhost:5173
```

`http://localhost:5173` must be registered as a **SPA** redirect URI on the Entra app registration,
and allowed in the storage account's CORS rules.

> **npm 10 note:** `npm install` with npm 10.9 can fail with
> `Cannot read properties of null (reading 'edgesOut')` (an npm peer-dependency bug).
> Use npm 11 (`npx npm@11 install`) or Node 24, which ships with npm 11.

## Mock mode (no Microsoft 365 or Azure needed)

```sh
npm install
npm run dev:mock             # http://localhost:5173
```

Sign-in, Blob Storage and Teams are replaced by in-browser fakes from `src/mocks/`:

- **Sign-in:** pick a sample user, *Anna Muster* (user) or *Ben Admin* (admin).
- **Storage:** sample documents, with your uploads and changes saved in `localStorage`. The same
  rules as Azure apply: lower-cased names, "file already exists" on conflicts, at most 10 tags,
  "all of these tags" search, and only admins can delete. File contents are kept in memory only, so
  after a reload, downloads return a placeholder text file.
- **Teams:** two sample teams with channels. Nothing is sent; the banner and the browser console
  show the message that would have been posted.

Use **Reset sample data** in the yellow banner to start over.

How it works: with `VITE_MOCK=true` (set in `.env.mock`), the dev server swaps
`@/auth/msal`, `@/services/storage` and `@/services/graph` for the files in `src/mocks/` (see
`vite.config.ts`). App code is unchanged. `src/mocks/typecheck.ts` makes `npm run type-check` fail
if a mock no longer matches its real module. Builds never apply mock mode: `__MOCK_MODE__` is
compiled to `false`, so no mock code ends up in `dist/`.

## End-to-end tests

```sh
npx playwright install chromium   # once
npm run test:e2e                  # starts the app in mock mode on port 5199 and runs e2e/
npx playwright test --ui          # interactive runner, handy while writing tests
```

Tests live in `e2e/`, with shared helpers in `e2e/fixtures.ts`. Each test starts signed out with
fresh sample data.

**Finding Fluent buttons:** use `button(page, 'Text')` from the fixtures, not
`getByRole('button')`. Fluent sets roles through `ElementInternals`. Chrome's accessibility tree,
which screen readers use, shows them as buttons, but Playwright's role engine can't read them.

These tests prove the app works against the mocks. Whether real Azure permissions, CORS and Graph
scopes work can only be checked on staging.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with hot reload |
| `npm run dev:mock` | Dev server in mock mode (no M365 / Azure) |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run test:unit` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against mock mode |
| `npm run lint` | Oxlint + ESLint (with auto-fix) |
| `npm run format` | Prettier |

## Structure

```
src/
  auth/         MSAL setup, sign-in/out, token helper, useAuth() composable
  services/     storage.ts (Blob Storage), graph.ts (Teams via Microsoft Graph)
  stores/       Pinia stores (documents list + search)
  utils/        file name normalisation (FR-3.7), tag rules (FR-4), with tests
  views/        SignInView, FilesView
  mocks/        mock mode: fake auth, storage and Teams + sample-user picker and banner
  components/   AppHeader
  fluent.ts     registers the Fluent UI Web Components in use + theme
  config.ts     typed VITE_* settings and token scopes
public/
  staticwebapp.config.json   SPA fallback so deep links like /files?name=… work
```

## Notes

- **Fluent components** are native custom elements. Register each one you use in `src/fluent.ts`.
  Use native `slot="…"` attributes on them, not Vue's `v-slot` (the ESLint rule that rewrites
  these is turned off).
- **Phase 1 status:** sign-in, the files list, search and download are wired up. Upload, tag
  editing, admin delete and the Teams channel picker have service functions in `src/services/`,
  but no UI yet.
