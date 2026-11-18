import { describe, expect, it } from 'vitest'
import { suggestFreeName, validateFile } from '../upload'

const file = (name: string, size = 10, type = '') => new File(['x'.repeat(size)], name, { type })

describe('validateFile', () => {
  const rules = { maxBytes: 100, accept: '' }

  it('allows any type when accept is empty', () => {
    expect(validateFile(file('a.exe'), rules)).toBeNull()
  })

  it('rejects empty and too-large files', () => {
    expect(validateFile(file('a.txt', 0), rules)).toBe('empty')
    expect(validateFile(file('a.txt', 101), rules)).toBe('too-large')
    expect(validateFile(file('a.txt', 100), rules)).toBeNull()
  })

  it('matches extensions, exact types and wildcards, ignoring case', () => {
    const limited = { maxBytes: 100, accept: '.pdf, application/msword ,image/*' }
    expect(validateFile(file('Report.PDF'), limited)).toBeNull()
    expect(validateFile(file('old.doc', 10, 'application/msword'), limited)).toBeNull()
    expect(validateFile(file('photo.heic', 10, 'image/heic'), limited)).toBeNull()
    expect(validateFile(file('notes.txt', 10, 'text/plain'), limited)).toBe('type-not-allowed')
  })
})

describe('suggestFreeName', () => {
  it('adds the first free number before the extension', () => {
    expect(suggestFreeName('Report.pdf', new Set(['report.pdf']))).toBe('Report (1).pdf')
    expect(suggestFreeName('Report.pdf', new Set(['report.pdf', 'report (1).pdf']))).toBe(
      'Report (2).pdf',
    )
  })

  it('handles names without an extension and dotfiles', () => {
    expect(suggestFreeName('README', new Set())).toBe('README (1)')
    expect(suggestFreeName('.env', new Set())).toBe('.env (1)')
  })
})
