import { describe, expect, it } from 'vitest'
import { ContentSection } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'
import { normalizeContentSection } from './contentSection'

describe('normalizeContentSection', () => {
  it.each([
    ['sobre', ContentSection.about],
    ['resultados', ContentSection.services],
    ['servicos', ContentSection.services],
    ['depoimentos', ContentSection.testimonials],
    ['testimonials', ContentSection.testimonials],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeContentSection(input)).toBe(expected)
  })

  it('rejects unknown sections with a controlled not-found error', () => {
    expect(() => normalizeContentSection('nao-existe')).toThrowError(AppError)
    expect(() => normalizeContentSection('nao-existe')).toThrow('Seção de conteúdo não encontrada')
  })
})
