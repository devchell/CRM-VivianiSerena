export type ContentSection =
  | 'hero'
  | 'about'
  | 'services'
  | 'testimonials'
  | 'faq'
  | 'contact'
  | 'footer'
  | 'seo'

export interface Content {
  id: string
  section: ContentSection
  key: string
  value: Record<string, unknown>
  updatedAt: Date
  updatedBy: string
}

export interface UpdateContentDto {
  value: Record<string, unknown>
}
