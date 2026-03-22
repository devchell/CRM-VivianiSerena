'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
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
  {
    id: 'artificial-4',
    name: 'Resultado surpreendente',
    city: 'São Caetano do Sul, SP',
    service: 'Remoção de micropigmentação',
    text: 'Já fiz três sessões e a diferença é visível. Profissionalismo do início ao fim.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-5',
    name: 'Muito bem orientada',
    city: 'Diadema, SP',
    service: 'Avaliação de pele',
    text: 'Fui bem orientada sobre cada etapa antes de começar. Isso fez toda a diferença na minha decisão.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-6',
    name: 'Recomendo com certeza',
    city: 'São Paulo, SP',
    service: 'Remoção a laser',
    text: 'Ambiente limpo, profissional capacitada e resultado gradual como prometido. Recomendo.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-7',
    name: 'Superou as expectativas',
    city: 'Mauá, SP',
    service: 'Despigmentação labial',
    text: 'Não esperava resultado tão bom logo nas primeiras sessões. Fiquei muito feliz com o acompanhamento.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-8',
    name: 'Processo tranquilo',
    city: 'Guarulhos, SP',
    service: 'Remoção de micropigmentação',
    text: 'O procedimento foi mais tranquilo do que imaginei. Cada dúvida foi respondida com paciência.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-9',
    name: 'Ótimo suporte',
    city: 'São Bernardo do Campo, SP',
    service: 'Remoção a laser',
    text: 'Além do tratamento em si, o suporte entre as sessões é muito atencioso. Me senti amparada.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-10',
    name: 'Indicação de amiga',
    city: 'Osasco, SP',
    service: 'Avaliação de pele',
    text: 'Vim por indicação de uma amiga e entendi o motivo. Atendimento cuidadoso e sem pressão.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-11',
    name: 'Resultado gradual e seguro',
    city: 'Santo André, SP',
    service: 'Remoção de tatuagem',
    text: 'O resultado vem chegando com segurança e no ritmo certo. Nada apressado.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-12',
    name: 'Sentiu-se acolhida',
    city: 'São Paulo, SP',
    service: 'Despigmentação labial',
    text: 'O ambiente e a postura profissional me fizeram sentir acolhida desde a recepção.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-13',
    name: 'Clareza no diagnóstico',
    city: 'ABC Paulista, SP',
    service: 'Avaliação de pele',
    text: 'Apreciei muito a clareza no diagnóstico inicial. Saí da consulta sabendo exatamente o que esperar.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-14',
    name: 'Sem arrependimentos',
    city: 'São Paulo, SP',
    service: 'Remoção de micropigmentação',
    text: 'Tomei a decisão certa. Já na segunda sessão o resultado era perceptível e o cuidado foi impecável.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-15',
    name: 'Profissional dedicada',
    city: 'Ribeirão Pires, SP',
    service: 'Remoção a laser',
    text: 'A dedicação da profissional em cada sessão mostra o quanto ela se importa com o resultado.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-16',
    name: 'Boa comunicação',
    city: 'São Caetano do Sul, SP',
    service: 'Remoção de micropigmentação',
    text: 'Sempre recebi retorno rápido nas mensagens e orientações claras entre as sessões.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-17',
    name: 'Cuidado com a pele',
    city: 'São Paulo, SP',
    service: 'Remoção de tatuagem',
    text: 'O protocolo de cuidados pós-sessão é detalhado e fez diferença na recuperação da minha pele.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-18',
    name: 'Experiência positiva',
    city: 'Mogi das Cruzes, SP',
    service: 'Avaliação de pele',
    text: 'Desde a avaliação inicial até o acompanhamento, a experiência foi completamente positiva.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-19',
    name: 'Vale cada sessão',
    city: 'Barueri, SP',
    service: 'Despigmentação labial',
    text: 'Os resultados são consistentes e a evolução entre as sessões é nítida. Vale cada visita.',
    stars: 5,
    source: 'artificial',
  },
  {
    id: 'artificial-20',
    name: 'Indicaria para todas',
    city: 'São Paulo, SP',
    service: 'Remoção de micropigmentação',
    text: 'Indicaria para qualquer pessoa que queira fazer remoção com segurança e resultado real.',
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
  center:      { x: '-50%',  scale: 1,    opacity: 1,   zIndex: 3 },
  left:        { x: '-145%', scale: 0.85, opacity: 0.2, zIndex: 2 },
  right:       { x: '45%',   scale: 0.85, opacity: 0.2, zIndex: 2 },
  'far-left':  { x: '-250%', scale: 0.7,  opacity: 0,   zIndex: 1 },
  'far-right': { x: '150%',  scale: 0.7,  opacity: 0,   zIndex: 1 },
}

const LEFT_SIDE: CardPos[] = ['left', 'far-left']
const RIGHT_SIDE: CardPos[] = ['right', 'far-right']

// ── Card animado com teleporte para carrossel infinito ─────────────────────────
function CarouselCard({ item, pos, isCenter }: { item: TestimonialItem; pos: CardPos; isCenter: boolean }) {
  const controls = useAnimationControls()
  const prevPosRef = useRef<CardPos>(pos)
  const isMountedRef = useRef(false)

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }

    const prev = prevPosRef.current
    prevPosRef.current = pos

    if (prev === pos) return

    // Quando um card precisa cruzar de um lado visível para o outro, teleportamos
    // para a posição "far" correta (opacity 0) antes de animar, garantindo que
    // o movimento seja sempre na mesma direção (sem "rolar de volta").
    if (LEFT_SIDE.includes(prev) && RIGHT_SIDE.includes(pos)) {
      controls.set(CARD_VARIANTS['far-right'])
    } else if (RIGHT_SIDE.includes(prev) && LEFT_SIDE.includes(pos)) {
      controls.set(CARD_VARIANTS['far-left'])
    }

    void controls.start({ ...CARD_VARIANTS[pos], transition: SPRING })
  }, [pos, controls])

  return (
    <motion.div
      className="absolute top-4 w-full max-w-sm md:max-w-md"
      style={{ left: '50%' }}
      initial={CARD_VARIANTS[pos]}
      animate={controls}
      aria-hidden={!isCenter}
    >
      <div className="relative">
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
  artificialCount?: number
}) {
  const [current, setCurrent] = useState(0)
  const { ref: headerRef, isInView } = useInView()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const items = useMemo(() => {
    const merged = [...props.manualItems]
    if (props.googleItems.length > 0) merged.push(...props.googleItems)
    if (props.artificialEnabled) {
      const count = Math.min(20, Math.max(1, props.artificialCount ?? 3))
      merged.push(...ARTIFICIAL_TESTIMONIALS.slice(0, count))
    }
    return merged.filter((item) => item.text)
  }, [props.artificialEnabled, props.artificialCount, props.googleItems, props.manualItems])

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
              return (
                <CarouselCard
                  key={item.id}
                  item={item}
                  pos={pos}
                  isCenter={pos === 'center'}
                />
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
