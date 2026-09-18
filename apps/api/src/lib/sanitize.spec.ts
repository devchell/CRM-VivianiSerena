import { describe, expect, it } from 'vitest'
import { sanitizeRichContentValue, sanitizeRichHtml } from './sanitize'

describe('sanitizeRichHtml', () => {
  it('keeps the editor allowlist and removes executable markup', () => {
    const sanitized = sanitizeRichHtml('<p>Texto <strong>válido</strong></p><script>alert(1)</script><img src=x>')

    expect(sanitized).toBe('<p>Texto <strong>válido</strong></p>')
  })

  it('removes unsafe link protocols and protocol-relative URLs', () => {
    const sanitized = sanitizeRichHtml('<a href="javascript:alert(1)">Perigoso</a><a href="//example.com">Também não</a>')

    expect(sanitized).toBe('<a>Perigoso</a><a>Também não</a>')
  })
})

describe('sanitizeRichContentValue', () => {
  it('sanitizes nested rich content without changing non-string values', () => {
    expect(sanitizeRichContentValue({ pt: '<p>Seguro</p><script>bad()</script>', enabled: true }))
      .toEqual({ pt: '<p>Seguro</p>', enabled: true })
  })
})
