'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useInView } from '@/lib/hooks'

interface TestimonialItem {
  id: string
  name: string
  city: string
  service: string
  text: string
  stars: number
  isHighlight?: boolean
  source?: 'manual' | 'google'
}

function getInitials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean)
  return tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() ?? '').join('') || 'VS'
}

function sanitizeHighlights(items: TestimonialItem[]) {
  let found = false
  return items.map((item) => {
    if (item.isHighlight && !found) {
      found = true
      return item
    }
    return { ...item, isHighlight: false }
  })
}

function Rating({ value }: { value: number }) {
  const rating = Math.max(0, Math.min(5, value))

  return (
    <div className="flex items-center gap-2" aria-label={`Nota ${rating.toFixed(1)} de 5`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-500">Nota</span>
      <span className="text-sm font-semibold text-rose-gold">{rating.toFixed(1)} / 5</span>
    </div>
  )
}

function TestimonialCard({ item }: { item: TestimonialItem }) {
  return (
    <div
      className="flex min-h-[280px] flex-col rounded-xl p-6"
      style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}
      aria-label={`Depoimento de ${item.name}`}
    >
      <Quote className="mb-4 h-6 w-6 text-rose-gold/25" aria-hidden="true" />
      <Rating value={item.stars} />

      <p className="mt-3 flex-1 text-sm leading-relaxed text-charcoal-600">
        &ldquo;{item.text}&rdquo;
      </p>

      <div className="mt-auto flex items-center gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blush text-sm font-bold text-rose-gold"
          aria-hidden="true"
        >
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

type CardPos = 'center' | 'left' | 'right' | 'far-left' | 'far-right'

const CARD_VARIANTS: Record<CardPos, { x: string; scale: number; opacity: number; zIndex: number }> = {
  center: { x: '-50%', scale: 1, opacity: 1, zIndex: 3 },
  left: { x: '-145%', scale: 0.85, opacity: 0.2, zIndex: 2 },
  right: { x: '45%', scale: 0.85, opacity: 0.2, zIndex: 2 },
  'far-left': { x: '-250%', scale: 0.7, opacity: 0, zIndex: 1 },
  'far-right': { x: '150%', scale: 0.7, opacity: 0, zIndex: 1 },
}

const LEFT_SIDE: CardPos[] = ['left', 'far-left']
const RIGHT_SIDE: CardPos[] = ['right', 'far-right']

const SPRING = {
  type: 'spring' as const,
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

function CarouselCard({ item, pos, isCenter }: { item: TestimonialItem; pos: CardPos; isCenter: boolean }) {
  const controls = useAnimationControls()
  const previousPosition = useRef<CardPos>(pos)
  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    const previous = previousPosition.current
    previousPosition.current = pos
    if (previous === pos) return

    if (LEFT_SIDE.includes(previous) && RIGHT_SIDE.includes(pos)) {
      controls.set(CARD_VARIANTS['far-right'])
    } else if (RIGHT_SIDE.includes(previous) && LEFT_SIDE.includes(pos)) {
      controls.set(CARD_VARIANTS['far-left'])
    }

    void controls.start({ ...CARD_VARIANTS[pos], transition: SPRING })
  }, [pos, controls])

  const showHighlight = Boolean(item.isHighlight)

  return (
    <motion.div
      className="absolute top-4 w-full max-w-sm md:max-w-md"
      style={{ left: '50%' }}
      initial={CARD_VARIANTS[pos]}
      animate={controls}
      aria-hidden={!isCenter}
    >
      <div className="relative">
        {showHighlight && (
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
        {showHighlight && (
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
}

export default function Testimonials(props: {
  manualItems: TestimonialItem[]
  googleItems: TestimonialItem[]
  publicReviewCount: number
  averageRating: number | null
}) {
  const [current, setCurrent] = useState(0)
  const { ref: headerRef, isInView } = useInView()
  const prefersReducedMotion = useReducedMotion()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const items = useMemo(() => {
    const merged = [...props.manualItems, ...props.googleItems]
    const filtered = merged.filter((item) => item.text.trim())
    const sanitized = sanitizeHighlights(filtered)
    const highlightIndex = sanitized.findIndex((item) => item.isHighlight)

    if (highlightIndex > 0) {
      const highlight = sanitized[highlightIndex]
      return [highlight, ...sanitized.filter((_, index) => index !== highlightIndex)]
    }

    return sanitized
  }, [props.googleItems, props.manualItems])

  const computedTotal = items.length
  const computedAverage = computedTotal > 0
    ? Math.round((items.reduce((sum, item) => sum + item.stars, 0) / computedTotal) * 10) / 10
    : null
  const reviewCount = props.publicReviewCount > 0 ? props.publicReviewCount : computedTotal
  const averageRating = props.averageRating ?? computedAverage
  const total = computedTotal

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
    if (prefersReducedMotion || total <= 1) return
    intervalRef.current = setInterval(() => {
      setCurrent((value) => (value + 1) % total)
    }, 2800)
  }, [prefersReducedMotion, total, stopAutoPlay])

  useEffect(() => {
    startAutoPlay()
    return stopAutoPlay
  }, [startAutoPlay, stopAutoPlay])

  if (total === 0) return null

  const goTo = (index: number) => {
    if (index === current) return
    setCurrent(index)
  }

  const previous = () => setCurrent((value) => (value - 1 + total) % total)
  const next = () => setCurrent((value) => (value + 1) % total)

  return (
    <section id="avaliacoes" className="section overflow-hidden bg-white" aria-labelledby="testimonials-heading">
      <div className="container-main">
        <motion.div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-gold">Depoimentos</span>
          <h2 id="testimonials-heading" className="heading-lg mb-4 mt-2 text-charcoal">O que dizem as clientes</h2>
          <div className="inline-flex items-center gap-2 rounded-full border border-blush bg-cream px-4 py-2">
            <span className="text-sm font-semibold text-charcoal">
              {reviewCount} {reviewCount === 1 ? 'avaliação publicada' : 'avaliações publicadas'}
            </span>
            {averageRating !== null && (
              <span className="border-l border-blush pl-2 text-sm text-charcoal-500">
                Nota média {averageRating.toFixed(1)} / 5
              </span>
            )}
          </div>
        </motion.div>

        <div
          className="relative"
          onMouseEnter={stopAutoPlay}
          onMouseLeave={startAutoPlay}
          aria-roledescription="carrossel"
          aria-label="Depoimentos de clientes"
        >
          {total > 1 ? (
            <button
              onClick={previous}
              className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded bg-white shadow-md transition-colors hover:bg-cream"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft size={20} className="text-rose-gold" />
            </button>
          ) : null}

          <div className="relative min-h-[420px] overflow-hidden px-8 pt-4">
            <div className="pointer-events-none invisible" aria-hidden="true">
              <div className="mx-auto w-full max-w-sm md:max-w-md">
                <TestimonialCard item={items[current]} />
              </div>
            </div>

            {items.map((item, index) => (
              <CarouselCard
                key={item.id}
                item={item}
                pos={getCardPos(index, current, total)}
                isCenter={index === current}
              />
            ))}
          </div>

          {total > 1 ? (
            <button
              onClick={next}
              className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-4 -translate-y-1/2 items-center justify-center rounded bg-white shadow-md transition-colors hover:bg-cream"
              aria-label="Próximo depoimento"
            >
              <ChevronRight size={20} className="text-rose-gold" />
            </button>
          ) : null}

          {total > 1 ? (
            <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Navegação do carrossel">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => goTo(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === current ? 'w-6 bg-rose-gold' : 'w-2 bg-rose-gold/30'}`}
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
