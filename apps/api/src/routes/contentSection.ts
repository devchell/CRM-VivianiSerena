import { ContentSection } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'

const CONTENT_SECTION_ALIASES: Record<string, ContentSection> = {
  sobre: ContentSection.about,
  resultados: ContentSection.services,
  servicos: ContentSection.services,
  depoimentos: ContentSection.testimonials,
}

export function normalizeContentSection(section: string): ContentSection {
  const normalized = section.trim().toLowerCase()
  const resolved = CONTENT_SECTION_ALIASES[normalized] ?? normalized

  if (!Object.values(ContentSection).includes(resolved as ContentSection)) {
    throw new AppError(404, 'Seção de conteúdo não encontrada')
  }

  return resolved as ContentSection
}
