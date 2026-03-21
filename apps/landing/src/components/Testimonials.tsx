'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useInView } from '@/lib/hooks'

interface TestimonialItem {
  id: string
  name: string
  city: string
  service: string
  text: string
  stars: number
  source?: 'manual' | 'google' | 'artificial'
}

const ARTIFICIAL_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'artificial-1',
    name: 'Cliente satisfeita',
    city: 'Santo André, SP',
    service: 'Remoção de micropigmentação',
    text: 'Atendimento acolhedor, explicação clara do processo e muito cuidado em cada sessão.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-2',
    name: 'Paciente em acompanhamento',
    city: 'São Paulo, SP',
    service: 'Despigmentação labial',
    text: 'A experiência foi segura e transparente. As expectativas foram alinhadas desde a primeira avaliação.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-3',
    name: 'Caso de remoção',
    city: 'São Bernardo do Campo, SP',
    service: 'Remoção de tatuagem',
    text: 'O plano de tratamento ficou objetivo e o ambiente transmite bastante confiança durante todo o processo.',
    stars: 5,
    source: 'artificial',
  },
]

function getInitials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean)
  return tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() ?? '').join('') || 'VS'
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} estrelas`}>
      {Array.from({ length: count }).map((_, index) => (
        <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
      ))}
    </div>
  )
}

// ── Card base — neutro, sem estilo de destaque ─────────────────────────────────
function TestimonialCard({ item }: { item: TestimonialItem }) {
  const sourceLabel =
    item.source === 'google'
      ? 'Google'
      : item.source === 'artificial'
        ? 'Exemplo'
        : 'Depoimento'

  return (
    <div
      className="rounded-xl border border-stone-100 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
      aria-label={`Depoimento de ${item.name}`}
    >
      <Quote className="mb-4 h-6 w-6 text-rose-gold/25" aria-hidden="true" />

      <div className="flex items-center justify-between gap-3">
        <StarRating count={Math.max(1, Math.min(5, item.stars))} />
        <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-charcoal-500">
          {sourceLabel}
        </span>
      </div>

      <p className="mb-5 mt-3 text-sm leading-relaxed text-charcoal-600">
        &ldquo;{item.text}&rdquo;
      </p>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blush text-sm font-bold text-rose-gold">
          {getInitials(item.name)}
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">{item.name}</p>
          <p className="text-xs text-charcoal-500">{item.city}</p>
          <p className="mt-0.5 text-xs font-medium text-rose-gold">{item.service}</p>
        </div>
      </div>
    </div>
  )
}

// ── Posições do carrossel ─────────────────────────────────────────────────────
//
// Cada card tem position: absolute; left: 50%.
// O x do framer-motion é % da largura do próprio card.
// center:    x = -50%  → card centralizado
// left:      x = -145% → 1 card de distância à esquerda, parcialmente visível
// right:     x = +45%  → 1 card de distância à direita, parcialmente visível
// far-left/right: fora do campo de visão
//
type CardPos = 'center' | 'left' | 'right' | 'far-left' | 'far-right'

const CARD_VARIANTS: Record<CardPos, { x: string; scale: number; opacity: number; zIndex: number }> = {
  center:      { x: '-50%',  scale: 1,    opacity: 1,    zIndex: 3 },
  left:        { x: '-145%', scale: 0.85, opacity: 0.45, zIndex: 2 },
  right:       { x: '45%',   scale: 0.85, opacity: 0.45, zIndex: 2 },
  'far-left':  { x: '-250%', scale: 0.7,  opacity: 0,    zIndex: 1 },
  'far-right': { x: '150%',  scale: 0.7,  opacity: 0,    zIndex: 1 },
}

const SPRING: {
  type: 'spring'
  stiffness: number
  damping: number
  mass: number
} = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
  mass: 0.8,
}

function getCardPos(index: number, current: number, total: number): CardPos {
  const diff = (index - current + total) % total
  if (diff === 0) return 'center'
  if (diff === 1) return 'right'
  if (diff === total - 1) return 'left'
  return diff <= Math.floor(total / 2) ? 'far-right' : 'far-left'
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Testimonials(props: {
  manualItems: TestimonialItem[]
  googleItems: TestimonialItem[]
  publicReviewCount: number
  averageRating: number | null
  artificialEnabled: boolean
}) {
  const [current, setCurrent] = useState(0)
  const { ref: headerRef, isInView } = useInView()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const items = useMemo(() => {
    const merged = [...props.manualItems]
    if (props.googleItems.length > 0) merged.push(...props.googleItems)
    if (props.artificialEnabled) merged.push(...ARTIFICIAL_TESTIMONIALS)
    return merged.filter((item) => item.text)
  }, [props.artificialEnabled, props.googleItems, props.manualItems])

  const total = items.length

  useEffect(() => {
    setCurrent(0)
  }, [total])

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startAutoPlay = useCallback(() => {
    stopAutoPlay()
    if (total <= 1) return
    intervalRef.current = setInterval(() => {
      setCurrent((v) => (v + 1) % total)
    }, 2800)
  }, [total, stopAutoPlay])

  useEffect(() => {
    startAutoPlay()
    return stopAutoPlay
  }, [startAutoPlay, stopAutoPlay])

  if (total === 0) return null

  const goTo = (index: number) => {
    if (index === current) return
    setCurrent(index)
  }

  const prev = () => setCurrent((v) => (v - 1 + total) % total)
  const next = () => setCurrent((v) => (v + 1) % total)

  return (
    <section
      id="avaliacoes"
      className="section overflow-hidden bg-white"
      aria-labelledby="testimonials-heading"
    >
      <div className="container-main">
        {/* Cabeçalho */}
        <motion.div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-gold">
            Depoimentos
          </span>
          <h2 id="testimonials-heading" className="heading-lg mb-4 mt-2 text-charcoal">
            O que dizem as clientes
          </h2>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((index) => (
                <Star key={index} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              ))}
            </div>
            <span className="text-sm font-semibold text-amber-800">
              {props.publicReviewCount} avaliações públicas
            </span>
            <span className="text-sm text-amber-700">
              {props.averageRating
                ? `- nota média ${props.averageRating.toFixed(1)}`
                : '- depoimentos configurados no painel'}
            </span>
          </div>
        </motion.div>

        {/* Carrossel */}
        <div
          className="relative"
          onMouseEnter={stopAutoPlay}
          onMouseLeave={startAutoPlay}
          aria-roledescription="carrossel"
          aria-label="Depoimentos de clientes"
        >
          {/* Seta anterior */}
          {total > 1 ? (
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded bg-white shadow-md transition-colors hover:bg-[#FAF7F2]"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft size={20} className="text-[#C9967A]" />
            </button>
          ) : null}

          {/* Trilha do carrossel */}
          <div className="relative px-8 pt-4">
            {/*
              Ghost card: elemento invisível que define a altura do container
              para o card central atual sem interromper o fluxo de layout.
            */}
            <div className="pointer-events-none invisible" aria-hidden="true">
              <div className="mx-auto w-full max-w-sm md:max-w-md">
                <TestimonialCard item={items[current]} />
              </div>
            </div>

            {/* Cards animados */}
            {items.map((item, index) => {
              const pos = getCardPos(index, current, total)
              const isCenter = pos === 'center'

              return (
                <motion.div
                  key={item.id}
                  className="absolute top-4 w-full max-w-sm md:max-w-md"
                  style={{ left: '50%' }}
                  animate={CARD_VARIANTS[pos]}
                  transition={SPRING}
                  aria-hidden={!isCenter}
                >
                  {/* Wrapper relativo para o overlay de destaque */}
                  <div className="relative">
                    {/* Overlay rose-gold: apenas no card central */}
                    {isCenter && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl"
                        style={{
                          border: '2px solid rgba(201, 169, 110, 0.45)',
                          background: 'rgba(201, 169, 110, 0.06)',
                          zIndex: 1,
                        }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Badge "Destaque": apenas no card central */}
                    {isCenter && (
                      <span
                        className="absolute left-5 z-[2] rounded-full bg-[#C9A96E] px-3 py-0.5 text-[11px] font-semibold text-white"
                        style={{ top: '-12px' }}
                      >
                        Destaque
                      </span>
                    )}

                    <TestimonialCard item={item} />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Seta próxima */}
          {total > 1 ? (
            <button
              onClick={next}
              className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-4 -translate-y-1/2 items-center justify-center rounded bg-white shadow-md transition-colors hover:bg-[#FAF7F2]"
              aria-label="Próximo depoimento"
            >
              <ChevronRight size={20} className="text-[#C9967A]" />
            </button>
          ) : null}

          {/* Dots de navegação */}
          {total > 1 ? (
            <div
              className="mt-6 flex justify-center gap-2"
              role="tablist"
              aria-label="Navegação do carrossel"
            >
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => goTo(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === current ? 'w-6 bg-[#C9967A]' : 'w-2 bg-[#C9967A]/30'
                  }`}
                  role="tab"
                  aria-selected={index === current}
                  aria-label={`Depoimento ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
