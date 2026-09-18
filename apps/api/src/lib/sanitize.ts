import sanitizeHtml from 'sanitize-html'

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a', 'blockquote', 'br', 'em', 'h2', 'h3', 'li', 'ol', 'p', 'strong', 'u', 'ul',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
}

export function sanitizeRichHtml(value: string): string {
  return sanitizeHtml(value, RICH_TEXT_OPTIONS)
}

export function sanitizeRichContentValue(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeRichHtml(value)
  if (Array.isArray(value)) return value.map(sanitizeRichContentValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeRichContentValue(nestedValue)])
    )
  }
  return value
}
