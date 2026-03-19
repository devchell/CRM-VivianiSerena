'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
    city: 'Santo Andre, SP',
    service: 'Remocao de micropigmentacao',
    text: 'Atendimento acolhedor, explicacao clara do processo e muito cuidado em cada sessao.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-2',
    name: 'Paciente em acompanhamento',
    city: 'Sao Paulo, SP',
    service: 'Despigmentacao labial',
    text: 'A experiencia foi segura e transparente. As expectativas foram alinhadas desde a primeira avaliacao.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-3',
    name: 'Caso de remocao',
    city: 'Sao Bernardo do Campo, SP',
    service: 'Remocao de tatuagem',
    text: 'O plano de tratamento ficou objetivo e o ambiente transmite bastante confianca durante todo o processo.',
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

function TestimonialCard({ item, featured }: { item: TestimonialItem; featured?: boolean }) {
  const sourceLabel = item.source === 'google'
    ? 'Google'
    : item.source === 'artificial'
      ? 'Exemplo'
      : 'Depoimento'

  return (
    <div
      className={`relative rounded-2xl border p-7 transition-all duration-300 ${
        featured
          ? 'border-rose-gold/40 bg-gradient-to-br from-rose-gold/10 to-blush shadow-xl'
          : 'border-stone-100 bg-white shadow-sm'
      }`}
      aria-label={`Depoimento de ${item.name}`}
    >
      {featured ? (
        <div className="absolute -top-3 left-6 rounded-full bg-rose-gold px-3 py-1 text-xs font-semibold text-white">
          Destaque
        </div>
      ) : null}

      <Quote className="mb-4 h-7 w-7 text-rose-gold/30" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <StarRating count={Math.max(1, Math.min(5, item.stars))} />
        <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-charcoal-500">
          {sourceLabel}
        </span>
      </div>

      <p className="mt-3 mb-6 text-sm leading-relaxed text-charcoal-600">
        &ldquo;{item.text}&rdquo;
      </p>

      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${featured ? 'bg-rose-gold text-white' : 'bg-blush text-rose-gold'}`}>
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

export default function Testimonials(props: {
  manualItems: TestimonialItem[]
  googleItems: TestimonialItem[]
  publicReviewCount: number
  averageRating: number | null
  artificialEnabled: boolean
}) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const { ref: headerRef, isInView } = useInView()

  const items = useMemo(() => {
    const merged = [...props.manualItems]
    if (props.googleItems.length > 0) {
      merged.push(...props.googleItems)
    }
    if (props.artificialEnabled) {
      merged.push(...ARTIFICIAL_TESTIMONIALS)
    }

    return merged.filter((item) => item.text)
  }, [props.artificialEnabled, props.googleItems, props.manualItems])

  const total = items.length

  useEffect(() => {
    setCurrent(0)
  }, [total])

  useEffect(() => {
    if (total <= 1) return undefined
    const timer = setInterval(() => {
      setDirection(1)
      setCurrent((value) => (value + 1) % total)
    }, 5000)
    return () => clearInterval(timer)
  }, [total])

  if (total === 0) {
    return null
  }

  const goTo = (index: number) => {
    if (index === current) return
    setDirection(index > current ? 1 : -1)
    setCurrent(index)
  }

  const prev = () => {
    setDirection(-1)
    setCurrent((value) => (value - 1 + total) % total)
  }

  const next = () => {
    setDirection(1)
    setCurrent((value) => (value + 1) % total)
  }

  const prevIdx = (current - 1 + total) % total
  const nextIdx = (current + 1) % total

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
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-gold">
            Depoimentos
          </span>
          <h2 id="testimonials-heading" className="heading-lg mt-2 mb-4 text-charcoal">
            O que dizem as clientes
          </h2>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((index) => (
                <Star key={index} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              ))}
            </div>
            <span className="text-sm font-semibold text-amber-800">
              {props.publicReviewCount} avaliacoes publicas
            </span>
            <span className="text-sm text-amber-700">
              {props.averageRating ? `- nota media ${props.averageRating.toFixed(1)}` : '- depoimentos configurados no painel'}
            </span>
          </div>
        </motion.div>

        <div className="relative" aria-roledescription="carrossel" aria-label="Depoimentos de clientes">
          {total > 1 ? (
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-[#FAF7F2]"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft size={20} className="text-[#C9967A]" />
            </button>
          ) : null}

          <div className="overflow-hidden px-8">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={items[current].id}
                custom={direction}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: direction > 0 ? 36 : -36, scale: 0.985, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: direction > 0 ? -36 : 36, scale: 0.985, filter: 'blur(4px)' }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                {total > 1 ? (
                  <div className="hidden flex-1 scale-[0.95] opacity-40 md:block">
                    <TestimonialCard item={items[prevIdx]} />
                  </div>
                ) : null}

                <div className="flex-1 md:flex-[1.2]">
                  <TestimonialCard item={items[current]} featured />
                </div>

                {total > 1 ? (
                  <div className="hidden flex-1 scale-[0.95] opacity-40 md:block">
                    <TestimonialCard item={items[nextIdx]} />
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          {total > 1 ? (
            <button
              onClick={next}
              className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-[#FAF7F2]"
              aria-label="Proximo depoimento"
            >
              <ChevronRight size={20} className="text-[#C9967A]" />
            </button>
          ) : null}

          {total > 1 ? (
            <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Navegacao do carrossel">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => goTo(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === current ? 'w-6 bg-[#C9967A]' : 'w-2 bg-[#C9967A]/30'}`}
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
