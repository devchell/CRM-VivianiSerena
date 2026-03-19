'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useInView, useCountUp } from '@/lib/hooks'

interface Stat {
  value: number
  suffix: string
  label: string
}

const STATS: Stat[] = [
  { value: 0, suffix: '', label: 'clientes registradas' },
  { value: 0, suffix: '', label: 'avaliações publicas' },
  { value: 0, suffix: '', label: 'agendamentos concluidos' },
  { value: 0, suffix: '', label: 'casos convertidos' },
]

const LOGOS = [
  {
    src: 'https://static.wixstatic.com/media/be8b61_e40ffe7813494f6c9a3246a4852c92a8~mv2.png',
    alt: 'Europan — Certificação Internacional',
    width: 120,
    height: 48,
  },
]

void LOGOS

function AnimatedStat({ stat, start }: { stat: Stat; start: boolean }) {
  const { count } = useCountUp(stat.value, 2000, start)
  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-0.5">
        <span className="text-4xl md:text-5xl font-bold font-heading text-rose-gold leading-none">
          {count}
        </span>
        <span className="text-2xl md:text-3xl font-bold text-rose-gold leading-tight mb-0.5">
          {stat.suffix}
        </span>
      </div>
      <p className="text-charcoal-500 text-sm mt-1">{stat.label}</p>
    </div>
  )
}

export default function TrustSection() {
  const { ref: sectionRef, isInView } = useInView({ threshold: 0.3 })
  const { ref: headerRef, isInView: headerInView } = useInView()

  return (
    <section
      id="autoridade"
      className="section bg-charcoal text-white overflow-hidden relative"
      aria-labelledby="trust-heading"
    >
      {/* Decorative background shapes */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-rose-gold/5 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-rose-gold/5 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="container-main relative z-10">
        {/* Header */}
        <motion.div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-rose-gold text-sm font-semibold uppercase tracking-[0.2em]">
            Confiança &amp; Autoridade
          </span>
          <h2 id="trust-heading" className="heading-lg text-white mt-2 mb-6">
            Ciência, segurança e resultados
          </h2>
        </motion.div>

        {/* Animated stats */}
        <div
          ref={sectionRef as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
          aria-label="Estatísticas"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <AnimatedStat stat={stat} start={isInView} />
            </motion.div>
          ))}
        </div>

        {/* Poetic quote */}
        <motion.div
          className="max-w-2xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="w-12 h-0.5 bg-rose-gold mx-auto mb-6" />
          <blockquote className="font-heading text-xl md:text-2xl text-cream-100 leading-relaxed italic">
            &ldquo;A pele guarda histórias. O meu trabalho é devolver a ela a liberdade de contar a história que você escolheu — não a que ficou marcada sem querer.&rdquo;
          </blockquote>
          <cite className="block mt-4 text-rose-gold text-sm font-semibold not-italic">
            — Viviani Serena, Especialista em Despigmentação a Laser
          </cite>
          <div className="w-12 h-0.5 bg-rose-gold mx-auto mt-6" />
        </motion.div>

        {/* Certifications row */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-8 mb-12"
          initial={{ opacity: 0 }}
          animate={headerInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          aria-label="Certificações e regulamentações"
        >
          {/* ANVISA Badge */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">ANVISA</p>
              <p className="text-white/60 text-xs">Equipamento Regulamentado</p>
            </div>
          </div>

          {/* INMETRO Badge */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">INMETRO</p>
              <p className="text-white/60 text-xs">Certificação Técnica</p>
            </div>
          </div>

          {/* Europan Badge */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
            <div className="w-8 h-8 rounded-full bg-rose-gold/30 flex items-center justify-center flex-shrink-0 overflow-hidden" aria-hidden="true">
              <Image
                src="https://static.wixstatic.com/media/be8b61_e40ffe7813494f6c9a3246a4852c92a8~mv2.png"
                alt=""
                width={32}
                height={32}
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">Europan</p>
              <p className="text-white/60 text-xs">Certificação Internacional</p>
            </div>
          </div>

          {/* Q-Switched Badge */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-purple-400 fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">Q-Switched Nd:YAG</p>
              <p className="text-white/60 text-xs">Tecnologia de Ponta</p>
            </div>
          </div>
        </motion.div>

        {/* Locations */}
        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          aria-label="Localizações"
        >
          {[
            { city: 'São Paulo — Mooca', address: 'Av. Paes de Barros, 3399, Sala 51 — Parque da Mooca' },
            { city: 'Santo André', address: 'R. das Esmeraldas, 606, Sala 72 — Jardim' },
          ].map((loc) => (
            <div key={loc.city} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
              <div className="w-8 h-8 bg-rose-gold/20 rounded-full flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-rose-gold fill-none stroke-current stroke-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-sm">{loc.city}</p>
              <p className="text-white/60 text-xs mt-1">{loc.address}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
