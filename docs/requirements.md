# Requirements: Document Library Client

## 1. Overview

A web frontend that lets signed-in Microsoft 365 users browse, search, upload and tag documents stored in Azure Blob Storage. Admins can also delete documents. After an upload, the user can post a message to a Microsoft Teams channel they choose.

Delivery is split into two phases. This document defines **Phase 1** in detail; Phase 2 items are listed in section 9.

Phase 1 is a **frontend-only** app: the browser talks to Blob Storage and Microsoft Graph directly with the user's own sign-in, and there's no backend API. Rules that need a server to enforce them (users deleting only their own files, protected overwrites) move to Phase 2, when a small backend API is added (section 9.1).

This approach is justified by the prerequisite of the brief, defining the already existing m356 Accounts and the existing Azure licence.
Also the requested 'low cost' requirement can be fullfilled by using existing infrastructure, azure blob storage and m356 account logins.
There is no need for major app updates, only when new functionality is added or azure api's are changed.

## 2. Scope (Phase 1)

**In scope**
- Microsoft 365 sign-in
- A single blob container
- Listing, searching and downloading documents
- Uploading documents
- Tagging documents (up to 10 tags per file)
- Deleting documents (admins only)
- Recovering deleted or overwritten files (soft delete and blob versioning, restored by an admin in the Azure portal)
- Teams channel notification after an upload

**Out of scope (Phase 1)**
- Backend API, and the server-enforced rules that depend on it (Phase 2)
- Users deleting their own files (Phase 2, needs the backend API)
- Roles and permissions beyond "user" and "admin" (Phase 2)
- Restricting who can see which documents (Phase 2)
- Version history in the UI (Phase 2; versions are kept from Phase 1 on)
- Multiple containers (Phase 2)
- Full-text or substring search
- Editing documents in place or previewing them in the browser
- Folder hierarchies and moving or renaming files
- Mobile apps

## 3. Users & Roles

| Role | Description | Storage role |
|------|-------------|--------------|
| User | Any authenticated member of the M365 tenant. Can view, search, download, upload and tag every document. Can't delete. | Custom role **Document Contributor** (read, write, tags; no delete) |
| Admin | Everything a user can do, plus delete any document. Shown admin actions through the Entra ID app role `DocLibrary.Admin` in their token. | Custom role **Document Admin** (Document Contributor plus delete) |

In Phase 1 the app role only controls what the UI shows. What a user can actually do is set by their **storage role**, which Azure enforces on every request. Admins need both the app role and the Document Admin storage role, ideally through the same Entra group.

## 4. Functional Requirements

### 4.1 Authentication
- **FR-1.1** Users sign in with their Microsoft 365 (Entra ID) account using MSAL (`@azure/msal-browser`).
- **FR-1.2** Unauthenticated users cannot reach any page except the sign-in page.
- **FR-1.3** The app gets tokens for the scopes it needs (Azure Storage, Microsoft Graph) and refreshes them silently.
- **FR-1.4** The signed-in user's name and avatar are shown in the header, along with a sign-out button.
- **FR-1.5** Only users from the configured tenant can sign in (single-tenant app registration).
- **FR-1.6** The app reads the user's roles from the ID token to decide whether to show admin actions.

### 4.2 Document Listing
- **FR-2.1** Show every document in the configured container in a table or list. Every user sees every document.
- **FR-2.2** Each row shows the file name (the original name from FR-3.7), tags, size, uploader, upload date and content type.
- **FR-2.3** The list can be sorted by name, date and size.
- **FR-2.4** Large containers are paginated or lazy-loaded.
- **FR-2.5** Clicking a document downloads it or opens it in a new tab.
- **FR-2.6** The list supports a deep link (e.g. `/files?name=<file name>`) that opens the app with the list already filtered to that file. A user who isn't signed in is sent to sign-in first, then back to the filtered list.
- **FR-2.7** If the linked file no longer exists, the app shows a "file not found" message and offers to clear the filter.

### 4.3 Upload
- **FR-3.1** Users can upload one or more files with a file picker or by drag and drop.
- **FR-3.2** Each file shows its upload progress.
- **FR-3.3** Before or during upload, the user can add tags (see 4.4).
- **FR-3.4** The uploader is stored as blob metadata: their Entra object ID (`uploaderId`) and display name (`uploaderName`). In Phase 1 the browser writes these, so they're for display only and aren't used to grant any rights. The file name as the user uploaded it is stored as `originalName` (see FR-3.7).
- **FR-3.5** If a file with the same name already exists, the user is asked to choose: overwrite, rename, or cancel. The UI only offers "overwrite" to the original uploader and to admins. This is a UI rule only: Azure doesn't enforce it, because any user who can upload can also overwrite. The earlier version is kept through blob versioning (FR-6.4) and an admin can restore it.
- **FR-3.6** Maximum file size and allowed file types are configurable. *(Values TBD.)*
- **FR-3.7** Before upload, the browser normalises the file name, and the normalised name becomes the blob name:
  - converted to lower case (`Q3-Report.PDF` → `q3-report.pdf`)
  - converted to Unicode NFC, so accented characters are stored the same way whichever OS the file came from (macOS often uses a different form)
  - trimmed of surrounding whitespace

  This makes name search case-insensitive (FR-5.2). The original name is kept in the `originalName` metadata field (URL-encoded, because metadata only accepts ASCII). It's shown in the list, used as the download file name, and used in the Teams message. The name conflict check (FR-3.5) compares normalised names, so `Report.pdf` and `report.pdf` count as the same file.

### 4.4 Tagging
- **FR-4.1** A file can have between zero and **10** tags.
- **FR-4.2** Tags can be added at upload time and edited later.
- **FR-4.3** While typing a tag, existing tags are suggested.
- **FR-4.4** Tags are stored as **Azure Blob Index Tags** so they can be searched on the server. Each tag is stored as a key (the tag label, up to 128 characters) with a fixed value. Only letters, digits, space and `+ - . / : = _` are allowed (see [hosting.md](hosting.md#22-limits-that-matter-for-this-project)).
- **FR-4.5** Tags are case-insensitive and trimmed of surrounding whitespace.
- **FR-4.6** The UI stops the user from adding an 11th tag and explains why.

### 4.5 Search
- **FR-5.1** A single search box matches against file names and tags.
- **FR-5.2** File name search matches the start of the name (blob prefix listing) and also filters the already-loaded list on the client. The search text is normalised the same way as file names (FR-3.7), so the search is case-insensitive.
- **FR-5.3** Tag search uses the Blob Index `Find Blobs by Tags` API.
- **FR-5.4** Users can filter by one or more tags (tag chips or facets).
- **FR-5.5** Results update as the user types (debounced).

### 4.6 Delete & Recovery
- **FR-6.1** Only admins can delete documents. Users don't see a delete button.
- **FR-6.2** Azure enforces this: the Document Contributor storage role has no delete permission, so a user can't delete files even outside the app.
- **FR-6.3** Deletion asks for confirmation.
- **FR-6.4** Blob soft delete (14-day retention) and blob versioning are turned on. An admin can restore a deleted file, or an overwritten file's earlier version, in the Azure portal.
- **FR-6.5** Users who need a file removed ask an admin. Users deleting their own files comes in Phase 2 (section 9.1).

### 4.7 Teams Notification
- **FR-7.1** After an upload, the user can choose a Teams team and channel to notify.
- **FR-7.2** The channel picker lists only the teams and channels the user belongs to (Graph: `/me/joinedTeams`, `/teams/{id}/channels`).
- **FR-7.3** The message contains:
  - the document title, which is the original file name (FR-3.7)
  - a link to the app that opens the files list already filtered to this file (the deep link in FR-2.6)
  - the uploader's display name
- **FR-7.4** The message is posted as the signed-in user through Graph `POST /teams/{id}/channels/{id}/messages` (delegated `ChannelMessage.Send`).
- **FR-7.5** The link doesn't contain any storage token. Recipients sign in to the app with their M365 account to see and download the file, so the link never expires and doesn't work for anyone outside the tenant.
- **FR-7.6** Sending a notification is optional; the user can skip it.
- **FR-7.7** The app remembers the last channel used and selects it by default next time.
- **FR-7.8** The user is told whether the message was sent or failed.

## 5. Non-Functional Requirements

| ID | Area | Requirement |
|----|------|-------------|
| NFR-1 | Security | No storage account keys or SAS tokens are kept in the frontend. All storage access uses the signed-in user's Entra token. |
| NFR-2 | Security | CORS on the storage account is limited to the app's origins. |
| NFR-3 | Usability | The layout works on desktop and tablet. |
| NFR-4 | Accessibility | Meets WCAG 2.1 AA. |
| NFR-5 | Performance | The list's first page loads in under 2 seconds for containers with up to 10k blobs. |
| NFR-6 | Observability | Client errors are logged (e.g. to Application Insights). |
| NFR-7 | Config | Tenant ID, client ID, storage account, container and the app's public URL (used to build Teams links) are set through environment variables. |
| NFR-8 | Security | Permissions are enforced by Azure storage roles (section 3), not just by the UI. Known Phase 1 limitations: any user can overwrite any file, and the uploader metadata can be changed by users. Versioning (FR-6.4) and storage logs (NFR-11) reduce the impact. Phase 2 removes both limitations (section 9.1). |
| NFR-9 | Cost | Phase 1 build effort stays within about **9 person-days** (see 5.1). |
| NFR-10 | Cost | Azure running cost stays under **CHF 20/month** at the baseline usage in 5.2. Only free tiers or the cheapest paid tier of each service are used unless a requirement needs more. |
| NFR-11 | Auditability | Storage diagnostic logs record who uploaded, overwrote or deleted each file, kept for at least 90 days. |

### 5.1 Build Cost Estimate (Phase 1)

Estimated for one full-stack developer who knows Vue and Azure.

| Work package | Person-days |
|--------------|------------:|
| Azure & Entra setup (app registration, app roles, custom storage roles, storage, Static Web Apps, CI/CD) | 0.5 |
| App shell & authentication (MSAL, protected routes, header) | 0.5 |
| Document listing (sorting, paging, deep link, "file not found") | 0.5 |
| Upload (multi-file, drag and drop, progress, name conflicts), Tagging (add/edit, suggestions, 10-tag limit) | 0.5 |
| Search (name prefix, client-side filter, tag search, facets) | 1 |
| Teams integration (channel picker, message, remembered channel) | 0.5 |
| Non-functional work (accessibility, responsive layout, logging) | 1 |
| Testing & QA (unit, integration, user acceptance support) | 1.5 |
| Documentation & handover | 1.5 |
| **Subtotal** | **7.5** |
| Contingency (20%) | 1.5 |
| **Total** | **9** |

At a rate of **$960/day**, that's about **$8,640**.

### 5.2 Running Cost Estimate (Phase 1)

**Baseline assumptions:** 30 users, 3,000 files, 15 GB stored, an average of 5 tags per file, and about 6,000 storage operations per month. File count, storage and operations are assumed to scale with the number of users (about 100 files and 0.5 GB per user). Prices are Azure list prices in **CHF** for the **Switzerland North** (Zurich) region, taken from the Azure Retail Prices API in November 2026, excluding VAT. Static Web Apps isn't offered in a Swiss region; its price is the same in every European region (see [hosting.md](hosting.md#16-hosting-cost)).

| Service | Tier | Est. monthly cost |
|---------|------|------------------:|
| Blob Storage – capacity | Hot, LRS, CHF 0.0179/GB × 15 GB | CHF 0.27 |
| Blob Storage – operations | Reads CHF 0.0036, writes/lists CHF 0.0448 per 10,000 | < CHF 0.05 |
| Blob Index Tags | ~15,000 tags × CHF 0.0356 per 10,000 | CHF 0.05 |
| Soft delete & versioning | Kept versions and deleted files, billed as capacity | < CHF 0.10 |
| Storage diagnostic logs | A few MB per month to Log Analytics (first 5 GB free) | CHF 0 |
| Static Web Apps | Standard (CHF 7.47/app; includes 100 GB bandwidth) | CHF 7.47 |
| Application Insights | First 5 GB/month of logs free | CHF 0 |
| Microsoft Graph / Teams | Delegated calls are included in M365 licences | CHF 0 |
| **Total (production)** | | **≈ CHF 8/month** |

The staging environment runs on the Static Web Apps **Free** plan with its own small storage account, and adds **< CHF 0.20/month** (see [hosting.md](hosting.md#13-environments)).

**Notes**
- Production could also run on the Free plan, bringing the total to under **CHF 1/month**. The Free plan has no SLA, so Standard is recommended for production.
- At this scale the cost is almost entirely the fixed CHF 7.47 Static Web Apps fee. Usage-based costs stay under CHF 1/month until storage passes about 50 GB.
- Storage cost grows linearly: each extra 100 GB adds about CHF 1.80/month. Versioning adds to this when files are overwritten often; a lifecycle rule can delete versions older than e.g. 90 days.
- Downloads are free up to 100 GB/month across the subscription, then CHF 0.0722/GB.
- Assigning the admin app role to a **group** (rather than to individuals) needs Entra ID P1. That's included in M365 Business Premium and E3/E5, but costs extra on lower plans. Storage role assignments to groups don't need P1.
- Not included: M365 user licences, and any Azure support plan.

## 6. Architecture (Phase 1)

Phase 1 has no backend. Everything runs in the browser:

- **Frontend (SPA):** sign-in, listing, search, download, upload, tagging, admin delete, and the Teams channel picker.
- **Blob Storage:** called directly from the browser with the user's Entra token. Azure checks the user's storage role (section 3) on every request.
- **Microsoft Graph:** called directly from the browser for the channel list and the Teams message.

Static Web Apps only serves the built app; it runs no code.

**What this means for security:** permissions are only as fine-grained as the storage roles. Azure stops users from deleting, but it can't tell "your file" from "someone else's file". As a result, any user can overwrite any file, and the uploader metadata can be changed. Versioning, soft delete and storage logs make every change recoverable and traceable. The backend API in Phase 2 adds per-file rules (section 9.1).

## 7. Proposed Tech Stack (draft)

- **Frontend:** Vue 3 (Composition API) + TypeScript (Vite)
- **Routing & state:** Vue Router (route guards for sign-in and the deep link) and Pinia
- **Auth:** MSAL.js (`@azure/msal-browser`), wrapped in a small Vue plugin and composable. There is no official MSAL package for Vue, but Microsoft publishes a Vue 3 sample to follow.
- **Storage:** `@azure/storage-blob` SDK
- **Teams / Graph:** `@microsoft/microsoft-graph-client`
- **UI:** Fluent UI Web Components (`@fluentui/web-components`), to match the M365 look. These work in Vue, but there is no Vue-native Fluent library.
- **Hosting:** Azure Static Web Apps (no API)

## 8. Azure / M365 Setup Prerequisites

- An Entra ID app registration (SPA redirect URI) with:
  - delegated permissions: `User.Read`, `Team.ReadBasic.All`, `Channel.ReadBasic.All`, `ChannelMessage.Send`, `https://storage.azure.com/user_impersonation`
  - an app role `DocLibrary.Admin`, assigned to admin users or groups
- A storage account with:
  - one private container
  - Blob Index Tags
  - CORS for the app's origins
  - blob soft delete (14 days) and blob versioning
  - diagnostic logs sent to a Log Analytics workspace
- Two custom storage roles, assigned on the storage account (see [architecture.md](architecture.md#31-storage-roles)):
  - **Document Contributor** for all users (e.g. an "All employees" group)
  - **Document Admin** for the admin group
- Admin consent for the Graph permissions

## 9. Phase 2 (planned)

- **Backend API** (section 9.1)
- Roles and permissions, including limiting which documents a user can see (needs the backend API)
- Version history in the UI (versions are already kept from Phase 1)
- Several containers the user can pick from
- More than 10 tags per file (would need a separate metadata store)

### 9.1 Backend API

A small backend (Azure Functions, linked to Static Web Apps) that handles every change to storage. Users would then get read-only storage access, so the rules below can't be bypassed.

**What it adds**
- Users can delete the files they uploaded; admins can delete any file. The API checks `uploaderId` or the admin role.
- Overwrites are enforced on the server, so only the uploader or an admin can replace a file.
- The uploader is recorded by the server, so `uploaderId` and `uploaderName` can be trusted.
- Uploads use a short-lived SAS from the API that only allows creating that one file.
- It's the foundation for per-document permissions (who can see what).

**What changes**
- **Storage roles:** users go back to read-only (a custom **Document Reader** role: read, tags read, filter). The API's managed identity gets write, tag and delete rights.
- **Hosting:** Static Web Apps **Standard** is required for linking a Function App, including for staging. Staging therefore moves from Free to Standard, adding about **CHF 7.50/month**. The Function App itself stays within its free grant (< CHF 0.30/month for its own storage).
- **CI/CD:** a second workflow builds and deploys the Function App.
- **Requirements:** FR-3.5 and FR-6 become server-enforced, and NFR-8's Phase 1 limitations are removed.

The architecture is described in [architecture.md](architecture.md#4-phase-2-backend-api), and its hosting in [hosting.md](hosting.md#4-phase-2-hosting-the-backend-api).

## 10. Open Questions

1. **File limits:** What maximum file size and which file types are allowed?
2. **Admin assignment:** Who are the admins, and will they be managed through an Entra group?
