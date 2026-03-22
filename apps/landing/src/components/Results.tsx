'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider'
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useInView } from '@/lib/hooks'
import { trackCTAClick } from '@/lib/analytics'
import { landingPublicEnv } from '@/lib/public-env'

const API_URL = landingPublicEnv.apiBaseUrl

interface ResultItem {
  id: string
  category: string
  title: string
  text: string
  beforeImage: string
  afterImage: string
}

function normalizeImageUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:image/')) return trimmed

  if (trimmed.startsWith('/')) {
    return `${API_URL}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      return `${API_URL}${parsed.pathname}${parsed.search}`
    }

    return trimmed
  } catch {
    return `${API_URL}/uploads/${trimmed.replace(/^\/+/, '')}`
  }
}

function ComparisonSlider({ item }: { item: ResultItem }) {
  const beforeImage = normalizeImageUrl(item.beforeImage)
  const afterImage = normalizeImageUrl(item.afterImage)

  return (
    <div style={{ position: 'relative' }} className="w-full aspect-[4/3] overflow-hidden rounded-lg shadow-md">
      {item.category ? (
        <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-rose-gold/90 px-3 py-1 text-xs font-medium text-white">
          {item.category}
        </span>
      ) : null}

      <ReactCompareSlider
        itemOne={<ReactCompareSliderImage src={beforeImage} alt="Antes" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />}
        itemTwo={<ReactCompareSliderImage src={afterImage} alt="Depois" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />}
        style={{ width: '100%', height: '100%' }}
      />

      <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded bg-black/60 px-2 py-1 text-xs text-white">
        Antes
      </span>
      <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded bg-[#C9967A]/90 px-2 py-1 text-xs text-white">
        Depois
      </span>
    </div>
  )
}

function ResultCard({ item, index }: { item: ResultItem; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 })

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07 }}
    >
      {isInView ? (
        <div className="cursor-default select-none">
          <ComparisonSlider item={item} />
          <div className="mt-3 text-center">
            <p className="text-sm font-semibold text-charcoal">{item.title}</p>
            {item.text ? <p className="mt-1 text-sm text-charcoal-400">{item.text}</p> : null}
          </div>
        </div>
      ) : (
        <div className="aspect-[4/3] animate-pulse rounded-lg bg-blush" />
      )}
    </motion.div>
  )
}

export default function Results({ items, vivianiPhotoUrl }: { items: ResultItem[]; vivianiPhotoUrl?: string }) {
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [showAll, setShowAll] = useState(false)
  const [hasCtaImageError, setHasCtaImageError] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { ref: headerRef, isInView: headerInView } = useInView()
  const { ref: ctaRef, isInView: ctaInView } = useInView({ threshold: 0.2 })

  useEffect(() => {
    setHasCtaImageError(false)
  }, [vivianiPhotoUrl])

  const categories = ['Todos', ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))]
  const filtered = activeCategory === 'Todos'
    ? items
    : items.filter((item) => item.category === activeCategory)
  const displayedItems = isMobile && !showAll ? filtered.slice(0, 3) : filtered
  const normalizedVivianiPhoto = vivianiPhotoUrl ? normalizeImageUrl(vivianiPhotoUrl) : ''
  const hasVivianiPhoto = Boolean(normalizedVivianiPhoto) && !hasCtaImageError

  const hasItems = items.length > 0

  return (
    <LazyMotion features={domAnimation}>
      <section id="resultados" className="section bg-cream" aria-labelledby="results-heading">
        <div className="container-main">
          {/* Galeria: só renderiza se houver resultados cadastrados */}
          {hasItems && (
            <>
              <motion.div
                ref={headerRef as React.RefObject<HTMLDivElement>}
                className="mb-12 text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={headerInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6 }}
              >
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-gold">
                  Transformações reais
                </span>
                <h2 id="results-heading" className="heading-lg mt-2 mb-4 text-charcoal">
                  Resultados que falam por si
                </h2>
                <p className="mx-auto max-w-xl text-charcoal-500">
                  Arraste o controle sobre cada imagem para comparar o antes e o depois.
                </p>
              </motion.div>

              {categories.length > 1 ? (
                <div className="mb-10 flex flex-wrap justify-center gap-2" role="group" aria-label="Filtrar por categoria">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => { setActiveCategory(category); setShowAll(false) }}
                      className={`rounded px-5 py-2 text-sm font-medium transition-all duration-200 ${
                        activeCategory === category
                          ? 'scale-105 bg-rose-gold text-white shadow-md'
                          : 'border border-blush-300 bg-white text-charcoal-600 hover:border-rose-gold hover:text-rose-gold'
                      }`}
                      aria-pressed={activeCategory === category}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {displayedItems.map((item, index) => (
                    <ResultCard key={item.id} item={item} index={index} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {isMobile && !showAll && filtered.length > 3 ? (
                <div className="mt-6 text-center">
                  <button onClick={() => setShowAll(true)} className="btn-secondary px-6 py-3 text-sm">
                    Ver mais resultados
                  </button>
                </div>
              ) : null}
            </>
          )}

          {/* CTA "Cada resultado é único" — sempre visível */}
          <motion.div
            ref={ctaRef as React.RefObject<HTMLDivElement>}
            className={`overflow-hidden rounded-lg border border-blush-200 bg-white shadow-lg ${hasItems ? 'mt-16' : ''}`}
            initial={{ opacity: 0, y: 40 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className={hasVivianiPhoto ? 'grid items-stretch md:grid-cols-2' : ''}>
              {hasVivianiPhoto && (
                <div className="relative h-72 min-h-[280px] md:h-auto">
                  <Image
                    src={normalizedVivianiPhoto}
                    alt="Viviani Serena - Especialista em remoção a laser"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onError={() => setHasCtaImageError(true)}
                  />
                </div>
              )}

              <div className="flex flex-col justify-center p-8 md:p-12">
                <span className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-rose-gold">
                  Avaliação gratuita
                </span>
                <h3 className="font-heading text-2xl font-bold leading-snug text-charcoal md:text-3xl">
                  Cada resultado é único
                </h3>
                <p className="mt-4 leading-relaxed text-charcoal-500">
                  Cada pele é diferente e merece um cuidado personalizado. Na avaliação gratuita, analiso seu caso
                  específico e apresento um plano de tratamento transparente.
                </p>

                <a
                  href="https://wa.link/e2g7ii"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackCTAClick('results_cta_viviani', 'results')}
                  className="mt-8 inline-flex items-center gap-2.5 self-start rounded-md bg-rose-gold px-8 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-rose-gold-500 hover:shadow-lg"
                >
                  Agendar Avaliação Gratuita
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </LazyMotion>
  )
}
