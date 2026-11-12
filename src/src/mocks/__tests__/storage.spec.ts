import { beforeEach, describe, expect, it } from 'vitest'
import { initAuth, mockUsers } from '../auth'
import {
  FileExistsError,
  MockAuthorizationError,
  deleteDocument,
  findByTags,
  listDocuments,
  resetMockData,
  uploadDocument,
} from '../storage'

const [anna, ben] = mockUsers as [(typeof mockUsers)[number], (typeof mockUsers)[number]]

async function signInAs(user: (typeof mockUsers)[number]) {
  sessionStorage.setItem('doclib.mock.user', user.id)
  await initAuth()
}

const uploader = { id: anna.id, name: anna.name }

describe('mock storage', () => {
  beforeEach(async () => {
    resetMockData()
    sessionStorage.clear()
    await signInAs(anna)
  })

  it('starts with the sample documents', async () => {
    const docs = await listDocuments()
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.map((d) => d.name)).toContain('q3-report.pdf')
  })

  it('requires a signed-in user', async () => {
    sessionStorage.clear()
    await initAuth()
    await expect(listDocuments()).rejects.toThrow('Not signed in')
  })

  it('stores uploads under the normalised name and keeps the original name', async () => {
    const file = new File(['hello'], 'My Notes.TXT', { type: 'text/plain' })
    const name = await uploadDocument(file, { tags: ['Notes'], uploader })
    expect(name).toBe('my notes.txt')

    const [doc] = await listDocuments('MY NO')
    expect(doc).toMatchObject({
      name: 'my notes.txt',
      originalName: 'My Notes.TXT',
      tags: ['notes'],
    })
  })

  it('rejects a name that differs only in case unless overwrite is set', async () => {
    const file = new File(['x'], 'q3-REPORT.pdf')
    await expect(uploadDocument(file, { tags: [], uploader })).rejects.toBeInstanceOf(
      FileExistsError,
    )
    await expect(uploadDocument(file, { tags: [], uploader, overwrite: true })).resolves.toBe(
      'q3-report.pdf',
    )
  })

  it('rejects more than 10 tags', async () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`)
    await expect(uploadDocument(new File(['x'], 'many.txt'), { tags, uploader })).rejects.toThrow(
      /at most 10 tags/,
    )
  })

  it('matches files that have all selected tags', async () => {
    expect([...(await findByTags(['finance']))].sort()).toEqual([
      'budget 2027.xlsx',
      'invoice 2026-0815.pdf',
      'q3-report.pdf',
    ])
    expect([...(await findByTags(['Finance', 'Q3']))]).toEqual(['q3-report.pdf'])
  })

  it('only lets admins delete', async () => {
    await expect(deleteDocument('q3-report.pdf')).rejects.toBeInstanceOf(MockAuthorizationError)

    await signInAs(ben)
    await deleteDocument('q3-report.pdf')
    expect((await listDocuments()).map((d) => d.name)).not.toContain('q3-report.pdf')
  })
})
