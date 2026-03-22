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
  avatar?: string
  isHighlight?: boolean
  source?: 'manual' | 'google' | 'artificial'
}

// ── Banco de 20 depoimentos artificiais realistas ─────────────────────────────
const ARTIFICIAL_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'art-01',
    name: 'Camila Ferreira',
    city: 'Santo André, SP',
    service: 'Remoção de sobrancelha micropigmentada',
    stars: 5.0,
    text: 'Fiz a remoção das sobrancelhas que tinham ficado escuras demais. A Viviani foi extremamente cuidadosa, explicou cada etapa e o resultado superou minhas expectativas. Recomendo muito!',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-02',
    name: 'Beatriz Oliveira',
    city: 'São Bernardo do Campo, SP',
    service: 'Despigmentação labial',
    stars: 4.8,
    text: 'Sempre tive complexo com a cor dos meus lábios e finalmente resolvi tratar. O protocolo foi gentil, sem dor excessiva, e minha autoestima melhorou muito. Profissional incrível.',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-03',
    name: 'Juliana Santos',
    city: 'São Paulo, SP',
    service: 'Remoção de eyeliner micropigmentado',
    stars: 4.5,
    text: 'O eyeliner tinha ficado muito grosso e assimétrico. Depois de 4 sessões com a Viviani, sumiu completamente. Atendimento super profissional e ambiente aconchegante.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-04',
    name: 'Fernanda Costa',
    city: 'Mauá, SP',
    service: 'Remoção de tatuagem colorida',
    stars: 4.9,
    text: 'Tinha uma tatuagem no pulso que me incomodava há anos. A Viviani usou o laser Q-Switched e o resultado foi ótimo. Ela é honesta sobre o número de sessões necessárias, o que me passou muita confiança.',
    avatar: 'https://images.unsplash.com/photo-1489424731084-a3d5bc5f3d20?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-05',
    name: 'Mariana Alves',
    city: 'São Caetano do Sul, SP',
    service: 'Micropigmentação capilar (MSC)',
    stars: 3.8,
    text: 'Fiz o tratamento para reverter a micropigmentação capilar. Levou mais sessões do que eu esperava, mas a Viviani foi honesta sobre isso desde o início. O resultado foi satisfatório.',
    avatar: 'https://images.unsplash.com/photo-1517365830460-955ce3be0547?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-06',
    name: 'Ana Paula Lima',
    city: 'Santo André, SP',
    service: 'Remoção de sobrancelha micropigmentada',
    stars: 5.0,
    text: 'Melhor decisão que tomei! Minhas sobrancelhas estavam com um formato que eu odiava. Hoje estou com o rosto que sempre quis. A Viviani é paciente e muito técnica.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-07',
    name: 'Rafaela Monteiro',
    city: 'Diadema, SP',
    service: 'Remoção de tatuagem preta',
    stars: 4.3,
    text: 'Tratei uma tatuagem tribal no tornozelo. Processo demorou algumas sessões, mas ela sempre me orientou sobre os cuidados pós-sessão. Ficou muito bem, quase invisível.',
    avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-08',
    name: 'Priscila Rocha',
    city: 'São Paulo, SP',
    service: 'Despigmentação labial',
    stars: 4.7,
    text: 'Comecei o tratamento com ceticismo, mas os resultados me surpreenderam desde a primeira sessão. Ambiente limpo, profissional atenciosa e preço justo. Voltarei com certeza.',
    avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-09',
    name: 'Tatiane Barbosa',
    city: 'Ribeirão Pires, SP',
    service: 'Remoção de eyeliner micropigmentado',
    stars: 2.5,
    text: 'O resultado demorou mais do que eu esperava para aparecer e precisei de mais sessões. A profissional é atenciosa, mas esperava resultados mais rápidos para o meu caso.',
    avatar: 'https://images.unsplash.com/photo-1541823778819-1b9be26b3ef0?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-10',
    name: 'Luciana Pereira',
    city: 'São Paulo, SP',
    service: 'Remoção de sobrancelha micropigmentada',
    stars: 5.0,
    text: 'Fiz a remoção completa de sobrancelhas que tinham ficado com cor avermelhada. Em 5 sessões, o resultado foi perfeito. A Viviani explica tudo com muita clareza e segurança.',
    avatar: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-11',
    name: 'Daniela Souza',
    city: 'Santo André, SP',
    service: 'Micropigmentação capilar (MSC)',
    stars: 4.6,
    text: 'Tinha feito MSC há 3 anos e queria remover. A Viviani foi super honesta sobre o processo e quanto tempo levaria. Hoje estou muito feliz com meu couro cabeludo natural de volta.',
    avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-12',
    name: 'Carolina Nunes',
    city: 'Guarulhos, SP',
    service: 'Remoção de tatuagem colorida',
    stars: 4.2,
    text: 'Tatuagem no ombro com várias cores. A Viviani foi transparente que cores vibrantes levam mais sessões. Já estou na 6ª sessão e o progresso é visível. Ótimo trabalho!',
    avatar: 'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-13',
    name: 'Vanessa Cardoso',
    city: 'São Bernardo do Campo, SP',
    service: 'Despigmentação labial',
    stars: 4.9,
    text: 'Resultado surpreendente já nas primeiras sessões. Minha autoestima melhorou demais. A Viviani é cuidadosa, explica os protocolos pós-sessão detalhadamente e está sempre disponível para tirar dúvidas.',
    avatar: 'https://images.unsplash.com/photo-1524504388515-9a95c0c6e537?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-14',
    name: 'Isabela Mendes',
    city: 'Mogi das Cruzes, SP',
    service: 'Remoção de tatuagem preta',
    stars: 3.4,
    text: 'Atendimento bom e profissional capacitada. Minha tatuagem era muito densa e o processo está sendo mais longo. Ela sempre é honesta sobre as expectativas, o que é muito importante.',
    avatar: 'https://images.unsplash.com/photo-1536085680664-4d0b04b68b86?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-15',
    name: 'Renata Pinto',
    city: 'São Paulo, SP',
    service: 'Remoção de sobrancelha micropigmentada',
    stars: 5.0,
    text: 'Vim com sobrancelhas muito escuras e mal desenhadas feitas por outra profissional. A Viviani removeu tudo com muito cuidado e precisão. Agora posso fazer novamente do jeito certo.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-16',
    name: 'Simone Araújo',
    city: 'Santo André, SP',
    service: 'Remoção de eyeliner micropigmentado',
    stars: 4.7,
    text: 'Tinha eyeliner inferior que envelheceu mal. Após 3 sessões, ficou quase imperceptível. Profissional delicada, ambiente impecável e resultado muito acima do que esperava.',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-17',
    name: 'Monique Ferreira',
    city: 'Osasco, SP',
    service: 'Remoção de tatuagem colorida',
    stars: 4.1,
    text: 'Tratei uma tatuagem grande na costela. A Viviani foi muito honesta: disse que levaria bastante sessões por ser colorida e extensa. Já estou vendo resultados ótimos após 5 sessões.',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-18',
    name: 'Thais Rodrigues',
    city: 'São Paulo, SP',
    service: 'Despigmentação labial',
    stars: 4.8,
    text: 'Sempre tive insegurança com meus lábios. A Viviani me recebeu com muito acolhimento, explicou o processo com clareza e os resultados foram chegando gradualmente. Estou muito satisfeita!',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-19',
    name: 'Gabriela Teixeira',
    city: 'São Caetano do Sul, SP',
    service: 'Micropigmentação capilar (MSC)',
    stars: 3.9,
    text: 'Decidi remover a MSC após mudança de estilo. Processo mais longo do que imaginei, mas a Viviani foi sempre transparente sobre isso. O resultado está ficando ótimo sessão a sessão.',
    avatar: 'https://images.unsplash.com/photo-1489424731084-a3d5bc5f3d20?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
  {
    id: 'art-20',
    name: 'Letícia Carvalho',
    city: 'Santo André, SP',
    service: 'Remoção de sobrancelha micropigmentada',
    stars: 5.0,
    text: 'Atendimento impecável do início ao fim. A Viviani é apaixonada pelo que faz e isso reflete no resultado. Minhas sobrancelhas estão completamente removidas e já posso refazer do jeito que sempre quis.',
    avatar: 'https://images.unsplash.com/photo-1517365830460-955ce3be0547?w=96&h=96&fit=crop&crop=face',
    source: 'artificial',
  },
]

// ── Highlight helpers ─────────────────────────────────────────────────────────

/** Garante que no máximo 1 item tem isHighlight=true */
function sanitizeHighlights(items: TestimonialItem[]): TestimonialItem[] {
  let found = false
  return items.map(t => {
    if (t.isHighlight && !found) { found = true; return t }
    return { ...t, isHighlight: false }
  })
}

/** Se nenhum artificial tiver isHighlight, elege 1 aleatório */
function selectRandomHighlight(items: TestimonialItem[]): TestimonialItem[] {
  if (items.length === 0 || items.some(t => t.isHighlight)) return items
  const idx = Math.floor(Math.random() * items.length)
  return items.map((t, i) => ({ ...t, isHighlight: i === idx }))
}

function getInitials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean)
  return tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() ?? '').join('') || 'VS'
}

// ── StarRating com suporte a nota decimal e meia estrela ──────────────────────
function StarRating({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, rating))
  const full = Math.floor(clamped)
  const partial = Math.round((clamped - full) * 10) / 10

  return (
    <div className="flex items-center gap-1" aria-label={`${clamped.toFixed(1)} estrelas`}>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) {
            return <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          }
          if (i === full && partial > 0) {
            return (
              <span key={i} className="relative inline-block h-4 w-4" aria-hidden="true">
                <Star className="h-4 w-4 fill-amber-200 text-amber-200" />
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${partial * 100}%` }}
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </span>
              </span>
            )
          }
          return <Star key={i} className="h-4 w-4 fill-amber-200 text-amber-200" aria-hidden="true" />
        })}
      </div>
      <span className="text-[11px] font-semibold text-amber-700">{clamped.toFixed(1)}</span>
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
        <StarRating rating={item.stars} />
        <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-charcoal-500">
          {sourceLabel}
        </span>
      </div>

      <p className="mb-5 mt-3 text-sm leading-relaxed text-charcoal-600">
        &ldquo;{item.text}&rdquo;
      </p>

      <div className="flex items-center gap-3">
        {item.avatar ? (
          <img
            src={item.avatar}
            alt={item.name}
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blush text-sm font-bold text-rose-gold">
            {getInitials(item.name)}
          </div>
        )}
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

    // Teleporta para o lado correto quando o card cruzaria de esquerda→direita
    // ou direita→esquerda (elimina o efeito "rolar de volta")
    if (LEFT_SIDE.includes(prev) && RIGHT_SIDE.includes(pos)) {
      controls.set(CARD_VARIANTS['far-right'])
    } else if (RIGHT_SIDE.includes(prev) && LEFT_SIDE.includes(pos)) {
      controls.set(CARD_VARIANTS['far-left'])
    }

    void controls.start({ ...CARD_VARIANTS[pos], transition: SPRING })
  }, [pos, controls])

  const showHighlight = isCenter && Boolean(item.isHighlight)

  return (
    <motion.div
      className="absolute top-4 w-full max-w-sm md:max-w-md"
      style={{ left: '50%' }}
      initial={CARD_VARIANTS[pos]}
      animate={controls}
      aria-hidden={!isCenter}
    >
      <div className="relative">
        {/* Overlay dourado: apenas no card marcado como destaque quando centralizado */}
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
      // Elege 1 artificial aleatório como destaque (muda a cada reload)
      const artificials = selectRandomHighlight(ARTIFICIAL_TESTIMONIALS.slice(0, count))
      merged.push(...artificials)
    }
    const filtered = merged.filter((item) => item.text)
    if (filtered.length === 0) return []

    // Garante no máximo 1 destaque; se nenhum tiver, marca o primeiro
    const sanitized = sanitizeHighlights(
      filtered.some(t => t.isHighlight)
        ? filtered
        : filtered.map((t, i) => ({ ...t, isHighlight: i === 0 }))
    )

    // Move o item destacado para a frente (posição 0) para iniciar no destaque
    const hIdx = sanitized.findIndex(t => t.isHighlight)
    if (hIdx > 0) {
      const h = sanitized[hIdx]
      return [h, ...sanitized.filter((_, i) => i !== hIdx)]
    }
    return sanitized
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
