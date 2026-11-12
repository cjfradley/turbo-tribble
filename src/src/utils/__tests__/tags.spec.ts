import { describe, expect, it } from 'vitest'
import { MAX_TAGS, indexTagsToTags, tagQuery, tagsToIndexTags, validateTag } from '../tags'

describe('validateTag', () => {
  it('accepts allowed characters after normalising', () => {
    expect(validateTag('  Invoice Q3 ')).toBeNull()
    expect(validateTag('project:alpha/v1.2_x+y=z-1')).toBeNull()
  })

  it('rejects characters Blob Index Tags do not allow', () => {
    expect(validateTag('r&d')).toBe('invalid-characters')
    expect(validateTag('bericht-ä')).toBe('invalid-characters')
  })

  it('rejects empty, too long and duplicate tags', () => {
    expect(validateTag('   ')).toBe('empty')
    expect(validateTag('a'.repeat(129))).toBe('too-long')
    expect(validateTag('Invoice', ['invoice'])).toBe('duplicate')
  })

  it('rejects an 11th tag', () => {
    const ten = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`)
    expect(validateTag('extra', ten)).toBe('too-many')
  })
})

describe('index tag mapping', () => {
  it('stores labels as keys with a fixed value and reads them back sorted', () => {
    const indexTags = tagsToIndexTags(['Q3', 'invoice'])
    expect(indexTags).toEqual({ q3: '1', invoice: '1' })
    expect(indexTagsToTags(indexTags)).toEqual(['invoice', 'q3'])
  })

  it('builds an AND query', () => {
    expect(tagQuery(['Invoice', 'q3'])).toBe(`"invoice" = '1' AND "q3" = '1'`)
  })
})
