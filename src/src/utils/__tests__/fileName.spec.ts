import { describe, expect, it } from 'vitest'
import {
  contentDisposition,
  decodeMetadataValue,
  encodeMetadataValue,
  normaliseFileName,
} from '../fileName'

describe('normaliseFileName', () => {
  it('lower-cases and trims', () => {
    expect(normaliseFileName('  Q3-Report.PDF ')).toBe('q3-report.pdf')
  })

  it('converts decomposed (macOS) characters to NFC', () => {
    const decomposed = 'Bericht_ä.pdf' // "a" + combining diaeresis
    expect(normaliseFileName(decomposed)).toBe('bericht_ä.pdf')
  })

  it('makes names that differ only in case collide', () => {
    expect(normaliseFileName('Report.pdf')).toBe(normaliseFileName('report.PDF'))
  })
})

describe('metadata encoding', () => {
  it('round-trips non-ASCII values as ASCII', () => {
    const encoded = encodeMetadataValue('Müller Bericht.pdf')
    expect(encoded).toMatch(/^[\x20-\x7e]+$/)
    expect(decodeMetadataValue(encoded)).toBe('Müller Bericht.pdf')
  })

  it('returns malformed values unchanged', () => {
    expect(decodeMetadataValue('100%')).toBe('100%')
  })
})

describe('contentDisposition', () => {
  it('uses the RFC 5987 filename* form', () => {
    expect(contentDisposition('Bericht ä.pdf')).toBe(
      "attachment; filename*=UTF-8''Bericht%20%C3%A4.pdf",
    )
  })
})
