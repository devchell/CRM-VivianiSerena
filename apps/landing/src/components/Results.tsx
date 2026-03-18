'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider'
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useInView } from '@/lib/hooks'
import { trackCTAClick } from '@/lib/analytics'

type Category = 'Todos' | 'Sobrancelhas' | 'Tatuagens' | 'Lábios' | 'Capilar'

interface ResultItem {
  id: number
  category: Exclude<Category, 'Todos'>
  sessionInfo: string
  caption: string
  antes: string
  depois: string
}

const RESULTS: ResultItem[] = []

const CATEGORIES: Category[] = ['Todos', 'Sobrancelhas', 'Tatuagens', 'Lábios', 'Capilar']

// ─── Slider antes/depois ──────────────────────────────────────────────────────

function ComparisonSlider({
  item,
  category,
}: {
  item: ResultItem
  category?: string
}) {
  return (
    <div style={{ position: 'relative' }} className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-md">
      {/* Badge categoria */}
      {category && (
        <span className="absolute top-3 left-3 z-20 bg-rose-gold/90 text-white text-xs font-medium px-3 py-1 rounded-full pointer-events-none">
          {category}
        </span>
      )}

      <ReactCompareSlider
        itemOne={
          <ReactCompareSliderImage
            src={item.antes}
            alt="Antes"
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        }
        itemTwo={
          <ReactCompareSliderImage
            src={item.depois}
            alt="Depois"
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        }
        style={{ width: '100%', height: '100%' }}
      />

      {/* Labels fixas */}
      <span className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none z-10">
        Antes
      </span>
      <span className="absolute bottom-3 right-3 bg-[#C9967A]/90 text-white text-xs px-2 py-1 rounded pointer-events-none z-10">
        Depois
      </span>
    </div>
  )
}

// ─── Card individual ──────────────────────────────────────────────────────────

function ResultCard({
  item,
  index,
}: {
  item: ResultItem
  index: number
}) {
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
          <ComparisonSlider item={item} category={item.category} />
          <p className="text-center text-sm text-charcoal-400 mt-2">{item.sessionInfo}</p>
        </div>
      ) : (
        <div className="aspect-[4/3] rounded-2xl bg-blush animate-pulse" />
      )}
    </motion.div>
  )
}

// ─── Export principal ─────────────────────────────────────────────────────────

export default function Results() {
  const [activeCategory, setActiveCategory] = useState<Category>('Todos')
  const [showAll, setShowAll] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { ref: headerRef, isInView: headerInView } = useInView()
  const { ref: ctaRef, isInView: ctaInView } = useInView({ threshold: 0.2 })

  const filtered = activeCategory === 'Todos'
    ? RESULTS
    : RESULTS.filter((r) => r.category === activeCategory)

  const displayedItems = isMobile && !showAll ? filtered.slice(0, 3) : filtered

  return (
    <LazyMotion features={domAnimation}>
      <section
        id="resultados"
        className="section bg-cream"
        aria-labelledby="results-heading"
      >
        <div className="container-main">

          {/* ── Cabeçalho ── */}
          <motion.div
            ref={headerRef as React.RefObject<HTMLDivElement>}
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-rose-gold text-sm font-semibold uppercase tracking-[0.2em]">
              Transformações reais
            </span>
            <h2 id="results-heading" className="heading-lg text-charcoal mt-2 mb-4">
              Resultados que falam por si
            </h2>
            <p className="text-charcoal-500 max-w-xl mx-auto">
              Arraste o controle sobre cada imagem para comparar o antes e depois.
              Todos os resultados são de clientes atendidas por Viviani Serena.
            </p>
          </motion.div>

          {/* ── Filtros ── */}
          <div
            className="flex flex-wrap justify-center gap-2 mb-10"
            role="group"
            aria-label="Filtrar por categoria"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setShowAll(false) }}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-rose-gold text-white shadow-md scale-105'
                    : 'bg-white text-charcoal-600 border border-blush-300 hover:border-rose-gold hover:text-rose-gold'
                }`}
                aria-pressed={activeCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Grid de sliders ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {displayedItems.map((item, i) => (
                <ResultCard key={item.id} item={item} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Ver mais — mobile */}
          {isMobile && !showAll && filtered.length > 3 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAll(true)}
                className="btn-secondary text-sm px-6 py-3"
              >
                Ver mais resultados
              </button>
            </div>
          )}

          {/* ── CTA com foto da Viviani ── */}
          <motion.div
            ref={ctaRef as React.RefObject<HTMLDivElement>}
            className="mt-16 bg-white rounded-3xl overflow-hidden shadow-lg border border-blush-200"
            initial={{ opacity: 0, y: 40 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="grid md:grid-cols-2 items-stretch">

              {/* Foto da Viviani — espelho */}
              <div className="relative h-72 md:h-auto min-h-[280px]">
                <Image
                  src="https://static.wixstatic.com/media/be8b61_97f4d7a9d8ea4a59a06b26cb11a5d22d~mv2.jpg/v1/fill/w_600,h_900,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be8b61_97f4d7a9d8ea4a59a06b26cb11a5d22d~mv2.jpg"
                  alt="Viviani Serena — Especialista em remoção a laser"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Texto + CTA */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <span className="text-rose-gold text-xs font-semibold uppercase tracking-[0.2em] mb-3">
                  Avaliação gratuita
                </span>
                <h3 className="text-2xl md:text-3xl font-heading font-bold text-charcoal leading-snug">
                  Cada resultado é único
                </h3>
                <p className="text-charcoal-500 mt-4 leading-relaxed">
                  Cada pele é diferente e merece um cuidado personalizado.
                  Na avaliação gratuita, analiso seu caso específico e apresento
                  um plano de tratamento transparente — com expectativas reais
                  sobre sessões e resultados.
                </p>

                <blockquote className="mt-6 pl-4 border-l-2 border-rose-gold italic text-charcoal-500 text-sm leading-relaxed">
                  &ldquo;Me senti segura e acolhida desde a minha primeira conversa
                  com Vivi. Estou muito satisfeita com o resultado.&rdquo;
                  <span className="not-italic block mt-2 text-rose-gold font-semibold text-xs uppercase tracking-wide">
                    — Wanessa Luz
                  </span>
                </blockquote>

                <a
                  href="https://wa.link/e2g7ii"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackCTAClick('results_cta_viviani', 'results')}
                  className="inline-flex items-center gap-2.5 mt-8 bg-rose-gold text-white
                    px-8 py-3.5 rounded-xl font-semibold hover:bg-rose-gold-500
                    transition-all shadow-md hover:shadow-lg self-start"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.549 4.123 1.513 5.858L0 24l6.335-1.454A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.875 0-3.63-.5-5.147-1.379l-.369-.218-3.829.879.959-3.509-.24-.381A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
                  </svg>
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
