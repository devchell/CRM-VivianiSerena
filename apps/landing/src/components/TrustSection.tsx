'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useCountUp, useInView } from '@/lib/hooks'

interface Stat {
  value: number
  suffix: string
  label: string
}

type TrustStats = {
  completedAppointments: number
  convertedCases: number
}

function AnimatedStat({ stat, start }: { stat: Stat; start: boolean }) {
  const { count } = useCountUp(stat.value, 2000, start)
  const visibleCount = start ? count : stat.value
  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-0.5">
        <span className="font-heading text-4xl font-bold leading-none text-rose-gold md:text-5xl">
          {visibleCount}
        </span>
        <span className="mb-0.5 text-2xl font-bold leading-tight text-rose-gold md:text-3xl">
          {stat.suffix}
        </span>
      </div>
      <p className="mt-1 text-sm text-charcoal-500">{stat.label}</p>
    </div>
  )
}

export default function TrustSection({
  stats,
}: {
  stats?: TrustStats | null
}) {
  const { ref: sectionRef, isInView } = useInView({ threshold: 0.3 })
  const { ref: headerRef, isInView: headerInView } = useInView()

  const statList: Stat[] = [
    { value: stats?.completedAppointments ?? 0, suffix: '', label: 'Agendamentos concluídos' },
    { value: stats?.convertedCases ?? 0, suffix: '', label: 'Casos convertidos' },
  ]

  return (
    <section id="autoridade" className="section relative overflow-hidden bg-charcoal text-white" aria-labelledby="trust-heading">
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-rose-gold/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-rose-gold/5 blur-3xl" aria-hidden="true" />

      <div className="container-main relative z-10">
        <motion.div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-gold">
            Confiança &amp; Autoridade
          </span>
          <h2 id="trust-heading" className="heading-lg mt-2 mb-6 text-white">
            Ciência, segurança e resultados
          </h2>
        </motion.div>

        <div
          ref={sectionRef as React.RefObject<HTMLDivElement>}
          className="mb-20 grid grid-cols-2 gap-8 md:grid-cols-2"
          aria-label="Estatísticas"
        >
          {statList.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <AnimatedStat stat={stat} start={isInView} />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mx-auto mb-16 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="mx-auto mb-6 h-0.5 w-12 bg-rose-gold" />
          <blockquote className="font-heading text-xl italic leading-relaxed text-cream-100 md:text-2xl">
            &ldquo;A pele guarda histórias. O meu trabalho é devolver a ela a liberdade de contar a história que você escolheu.&rdquo;
          </blockquote>
          <cite className="mt-4 block text-sm font-semibold not-italic text-rose-gold">
            - Viviani Serena, Especialista em Despigmentação a Laser
          </cite>
          <div className="mx-auto mt-6 h-0.5 w-12 bg-rose-gold" />
        </motion.div>

        <motion.div
          className="mb-12 flex flex-wrap items-center justify-center gap-8"
          initial={{ opacity: 0 }}
          animate={headerInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          aria-label="Certificações e regulamentações"
        >
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-white">ANVISA</p>
              <p className="text-xs text-white/60">Equipamento regulamentado</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-white">INMETRO</p>
              <p className="text-xs text-white/60">Certificação técnica</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-rose-gold/30" aria-hidden="true">
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
              <p className="text-sm font-bold leading-none text-white">Europan</p>
              <p className="text-xs text-white/60">Certificação internacional</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
