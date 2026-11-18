import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Run the store against the in-memory mock services (vitest doesn't apply the mock aliases).
vi.mock('@/auth/msal', () => import('@/mocks/auth'))
vi.mock('@/services/storage', () => import('@/mocks/storage'))

const { initAuth, mockUsers } = await import('@/mocks/auth')
const { listDocuments, resetMockData } = await import('@/mocks/storage')
const { useDocumentsStore } = await import('@/stores/documents')
const { useUploadsStore } = await import('@/stores/uploads')

const [anna, ben] = mockUsers as [(typeof mockUsers)[number], (typeof mockUsers)[number]]

async function setup(user = anna) {
  resetMockData()
  sessionStorage.setItem('doclib.mock.user', user.id)
  await initAuth()
  setActivePinia(createPinia())
  const documents = useDocumentsStore()
  await documents.load()
  return { documents, uploads: useUploadsStore() }
}

const file = (name: string, content = 'hello') => new File([content], name, { type: 'text/plain' })

describe('uploads store', () => {
  beforeEach(() => sessionStorage.clear())

  it('uploads with tags, progress and uploader, and adds the row to the list', async () => {
    const { documents, uploads } = await setup()
    uploads.add([file('Meeting Notes.TXT')])
    const [item] = uploads.items
    item!.tags = ['notes', 'meeting']

    await uploads.uploadAll()

    expect(item).toMatchObject({ status: 'done', loadedBytes: 5 })
    const doc = documents.items.find((d) => d.name === 'meeting notes.txt')
    expect(doc).toMatchObject({
      originalName: 'Meeting Notes.TXT',
      tags: ['meeting', 'notes'],
      uploaderId: anna.id,
      uploaderName: anna.name,
    })
  })

  it('writes tags that were changed while the file was uploading (FR-3.3)', async () => {
    const { uploads } = await setup()
    uploads.add([file('late-tags.txt')])
    const item = uploads.items[0]!

    const running = uploads.start(item.id)
    item.tags = ['added-later']
    await running

    const [stored] = await listDocuments('late-tags')
    expect(stored?.tags).toEqual(['added-later'])
  })

  it('rejects files that break the size rules (FR-3.6)', async () => {
    const { uploads } = await setup()
    uploads.add([new File([], 'empty.txt')])
    expect(uploads.items[0]).toMatchObject({ status: 'error', error: 'The file is empty.' })
  })

  it('treats names that differ only in case as a conflict (FR-3.5, FR-3.7)', async () => {
    const { uploads } = await setup()
    uploads.add([file('q3-REPORT.PDF')])
    await uploads.uploadAll()

    const item = uploads.items[0]!
    expect(item.status).toBe('conflict')
    expect(item.existing?.uploaderName).toBe('Ben Admin')
  })

  it('offers overwrite only to the original uploader and admins (FR-3.5)', async () => {
    // Q3-Report.pdf was uploaded by Ben; Invoice by Anna.
    let { uploads } = await setup(anna)
    uploads.add([file('Q3-Report.pdf'), file('Invoice 2026-0815.pdf')])
    await uploads.uploadAll()
    const [report, invoice] = uploads.items
    expect(uploads.canOverwrite(report!)).toBe(false)
    expect(uploads.canOverwrite(invoice!)).toBe(true)

    await uploads.overwrite(report!.id)
    expect(report!.status).toBe('conflict') // refused for Anna

    ;({ uploads } = await setup(ben))
    uploads.add([file('Invoice 2026-0815.pdf')])
    await uploads.uploadAll()
    const item = uploads.items[0]!
    expect(uploads.canOverwrite(item)).toBe(true)
    await uploads.overwrite(item.id)
    expect(item.status).toBe('done')
  })

  it('suggests a free name and uploads under it when renamed', async () => {
    const { documents, uploads } = await setup()
    uploads.add([file('Q3-Report.pdf')])
    await uploads.uploadAll()
    const item = uploads.items[0]!

    const suggestion = uploads.suggestName(item)
    expect(suggestion).toBe('Q3-Report (1).pdf')

    await uploads.rename(item.id, suggestion)
    expect(item).toMatchObject({ status: 'done', blobName: 'q3-report (1).pdf' })
    expect(documents.items.some((d) => d.name === 'q3-report (1).pdf')).toBe(true)
  })

  it('cancels a running upload', async () => {
    const { uploads } = await setup()
    uploads.add([file('big.txt')])
    const item = uploads.items[0]!

    const running = uploads.start(item.id)
    uploads.cancel(item.id)
    await running

    expect(item.status).toBe('cancelled')
    expect(await listDocuments('big')).toHaveLength(0)
  })

  it('clears finished rows but keeps pending ones', async () => {
    const { uploads } = await setup()
    uploads.add([file('a.txt'), file('b.txt')])
    await uploads.start(uploads.items[0]!.id)

    uploads.clearFinished()
    expect(uploads.items.map((i) => i.file.name)).toEqual(['b.txt'])
  })
})
