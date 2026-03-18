'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useInView } from '@/lib/hooks'

interface Depoimento {
  id: number
  nome: string
  cidade: string
  servico: string
  texto: string
  estrelas: number
  iniciais: string
}

const DEPOIMENTOS: Depoimento[] = [
  {
    id: 1,
    nome: 'Wanessa Luz',
    cidade: 'Santo André, SP',
    servico: 'Remoção de Sobrancelhas',
    texto: 'Me senti segura e acolhida desde a minha primeira conversa com Vivi. Estou muito satisfeita com o resultado. Ela cuida de cada detalhe durante todo o processo.',
    estrelas: 5,
    iniciais: 'WL',
  },
  {
    id: 2,
    nome: 'Fernanda Costa',
    cidade: 'São Paulo, SP',
    servico: 'Despigmentação Labial',
    texto: 'Depois de anos me sentindo presa a uma micropigmentação que não gostei, finalmente encontrei a Vivi. Em 4 sessões meus lábios voltaram ao natural. A tecnologia é impressionante e o atendimento é de outro nível.',
    estrelas: 5,
    iniciais: 'FC',
  },
  {
    id: 3,
    nome: 'Juliana Martins',
    cidade: 'Mauá, SP',
    servico: 'Remoção de Tatuagem',
    texto: 'Tinha uma tatuagem no punho que me arrependia há anos. A Vivi foi super honesta sobre o processo, o número de sessões e os resultados esperados. Já na terceira sessão o clareamento era visível. Recomendo demais!',
    estrelas: 5,
    iniciais: 'JM',
  },
  {
    id: 4,
    nome: 'Carla Rodrigues',
    cidade: 'São Caetano do Sul, SP',
    servico: 'Micropigmentação Capilar',
    texto: 'O espaço é lindo, limpo e acolhedor. A Viviani é uma profissional extremamente competente e cuidadosa. Minha micropigmentação capilar foi removida sem nenhum dano aos folículos. Superou todas minhas expectativas.',
    estrelas: 5,
    iniciais: 'CR',
  },
  {
    id: 5,
    nome: 'Amanda Souza',
    cidade: 'São Bernardo do Campo, SP',
    servico: 'Remoção de Sobrancelhas',
    texto: 'Procurei vários especialistas antes e nenhum me passou tanta confiança quanto a Vivi. O protocolo personalizado fez toda diferença. Minha pele reagiu muito bem e o resultado ficou incrível. Gratidão infinita!',
    estrelas: 5,
    iniciais: 'AS',
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} estrelas`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
      ))}
    </div>
  )
}

function TestimonialCard({ depoimento, featured }: { depoimento: Depoimento; featured?: boolean }) {
  return (
    <div
      className={`relative rounded-2xl border p-7 transition-all duration-300 ${
        featured
          ? 'bg-gradient-to-br from-rose-gold/10 to-blush border-rose-gold/40 shadow-xl'
          : 'bg-white border-stone-100 shadow-sm'
      }`}
      aria-label={`Depoimento de ${depoimento.nome}`}
    >
      {featured && (
        <div className="absolute -top-3 left-6 bg-rose-gold text-white text-xs font-semibold px-3 py-1 rounded-full">
          ★ Depoimento em destaque
        </div>
      )}

      <Quote className="w-7 h-7 text-rose-gold/30 mb-4" aria-hidden="true" />
      <StarRating count={depoimento.estrelas} />

      <p className="text-charcoal-600 leading-relaxed mt-3 mb-6 text-sm">
        &ldquo;{depoimento.texto}&rdquo;
      </p>

      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            featured ? 'bg-rose-gold text-white' : 'bg-blush text-rose-gold'
          }`}
          aria-hidden="true"
        >
          {depoimento.iniciais}
        </div>
        <div>
          <p className="font-semibold text-charcoal text-sm">{depoimento.nome}</p>
          <p className="text-charcoal-500 text-xs">{depoimento.cidade}</p>
          <p className="text-rose-gold text-xs font-medium mt-0.5">{depoimento.servico}</p>
        </div>
      </div>
    </div>
  )
}

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const { ref: headerRef, isInView } = useInView()
  const total = DEPOIMENTOS.length

  const goTo = (index: number) => {
    if (index === current) return
    setDirection(index > current ? 1 : -1)
    setCurrent(index)
  }

  const prev = () => {
    setDirection(-1)
    setCurrent(c => (c - 1 + total) % total)
  }

  const next = () => {
    setDirection(1)
    setCurrent(c => (c + 1) % total)
  }

  // Autoplay a cada 5s
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1)
      setCurrent(c => (c + 1) % total)
    }, 5000)
    return () => clearInterval(timer)
  }, [total])

  const prevIdx = (current - 1 + total) % total
  const currIdx = current
  const nextIdx = (current + 1) % total

  return (
    <section
      id="avaliacoes"
      className="section bg-white overflow-hidden"
      aria-labelledby="testimonials-heading"
    >
      <div className="container-main">

        {/* ── Cabeçalho ── */}
        <motion.div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-rose-gold text-sm font-semibold uppercase tracking-[0.2em]">
            Depoimentos
          </span>
          <h2 id="testimonials-heading" className="heading-lg text-charcoal mt-2 mb-4">
            O que dizem as clientes
          </h2>

          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              ))}
            </div>
            <span className="text-amber-800 text-sm font-semibold">4.9/5</span>
            <span className="text-amber-700 text-sm">— 127 avaliações verificadas</span>
          </div>
        </motion.div>

        {/* ── Carrossel ── */}
        <div
          className="relative"
          aria-roledescription="carrossel"
          aria-label="Depoimentos de clientes"
        >
          {/* Botão anterior */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-[#FAF7F2] transition-colors -translate-x-4"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft size={20} className="text-[#C9967A]" />
          </button>

          {/* 3 cards */}
          <div className="px-8 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={DEPOIMENTOS[currIdx].id}
                custom={direction}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: direction > 0 ? 56 : -56 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -56 : 56 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="hidden flex-1 md:block opacity-40 scale-[0.95]">
                  <TestimonialCard depoimento={DEPOIMENTOS[prevIdx]} />
                </div>

                <div className="flex-1 md:flex-[1.2]">
                  <TestimonialCard depoimento={DEPOIMENTOS[currIdx]} featured />
                </div>

                <div className="hidden flex-1 md:block opacity-40 scale-[0.95]">
                  <TestimonialCard depoimento={DEPOIMENTOS[nextIdx]} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Botão próximo */}
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-[#FAF7F2] transition-colors translate-x-4"
            aria-label="Próximo depoimento"
          >
            <ChevronRight size={20} className="text-[#C9967A]" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Navegação do carrossel">
            {DEPOIMENTOS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'bg-[#C9967A] w-6' : 'bg-[#C9967A]/30 w-2'
                }`}
                role="tab"
                aria-selected={i === current}
                aria-label={`Depoimento ${i + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

