'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CalendarCheck, Microscope, RotateCcw, Zap } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: CalendarCheck,
    title: 'Avaliação Gratuita',
    subtitle: 'Presencial ou online',
    description:
      'Análise completa do pigmento, fototipo de pele, região tratada e histórico. Definimos juntas se o laser é o caminho ideal e quantas sessões serão necessárias.',
    highlight: 'Sem compromisso, sem taxa',
    color: 'from-rose-gold/10 to-blush',
  },
  {
    number: '02',
    icon: Microscope,
    title: 'Protocolo Personalizado',
    subtitle: 'Ciência aplicada ao seu caso',
    description:
      'Cada pigmento reage de forma diferente ao laser. Calibramos comprimento de onda, fluência e número de pulsos de acordo com sua pele e o pigmento utilizado.',
    highlight: 'Tratamento individualizado',
    color: 'from-sage/10 to-cream',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Sessão a Laser',
    subtitle: 'Tecnologia Q-Switched Nd:YAG',
    description:
      'O laser emite pulsos ultra-rápidos que fragmentam os pigmentos em micropartículas. O sistema imunológico elimina naturalmente os fragmentos nas semanas seguintes.',
    highlight: 'Procedimento seguro e rápido',
    color: 'from-rose-gold/10 to-blush',
  },
  {
    number: '04',
    icon: RotateCcw,
    title: 'Renovação',
    subtitle: 'Sua pele, original',
    description:
      'Com o protocolo completo, a pele recupera sua aparência natural. Acompanhamos cada etapa e ajustamos o protocolo conforme sua resposta ao tratamento.',
    highlight: 'Suporte pós-sessão incluso',
    color: 'from-sage/10 to-cream',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      id="como-funciona"
      ref={sectionRef}
      className="section bg-cream"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container-main">
        {/* Header */}
        <motion.div
          className="text-center mb-16 lg:mb-20"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label justify-center">
            <span className="w-6 h-px bg-rose-gold" aria-hidden="true" />
            Como Funciona
            <span className="w-6 h-px bg-rose-gold" aria-hidden="true" />
          </span>
          <h2 id="how-it-works-heading" className="heading-lg text-charcoal mb-4 text-balance">
            Da avaliação à{' '}
            <span className="text-rose-gold">renovação da sua pele</span>
          </h2>
          <p className="text-charcoal/60 max-w-2xl mx-auto text-lg text-pretty">
            Um processo claro, seguro e respaldado pela ciência — do primeiro contato ao resultado final.
          </p>
        </motion.div>

        {/* Steps grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 relative"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Linha conectora horizontal — apenas desktop */}
          <div
            className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-rose-gold/30 to-transparent"
            aria-hidden="true"
          />

          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.article
                key={step.number}
                variants={itemVariants}
                className="relative group"
              >
                <div className={`card p-6 h-full flex flex-col bg-gradient-to-br ${step.color} border-blush/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                  {/* Número + ícone */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="step-circle relative z-10 bg-white shadow-sm shadow-rose-gold/10 group-hover:bg-rose-gold group-hover:text-white transition-colors duration-300">
                      <span className="font-heading font-bold text-lg" aria-hidden="true">{step.number}</span>
                    </div>
                    <Icon
                      className="text-rose-gold/70 group-hover:text-rose-gold transition-colors duration-300"
                      size={24}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-charcoal text-xl mb-1">
                      {step.title}
                    </h3>
                    <p className="text-rose-gold text-xs font-semibold uppercase tracking-wider mb-3">
                      {step.subtitle}
                    </p>
                    <p className="text-charcoal/65 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Highlight badge */}
                  <div className="mt-5 pt-4 border-t border-blush">
                    <span className="badge bg-white text-rose-gold border border-rose-gold/20 text-xs">
                      ✓ {step.highlight}
                    </span>
                  </div>
                </div>

                {/* Seta entre steps — mobile/tablet */}
                {index < STEPS.length - 1 && (
                  <div
                    className="lg:hidden flex justify-center my-2 text-rose-gold/40"
                    aria-hidden="true"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 14l-6-6h12l-6 6z" />
                    </svg>
                  </div>
                )}
              </motion.article>
            )
          })}
        </motion.div>

        {/* Info técnica Q-Switched */}
        <motion.div
          className="mt-16 p-8 rounded-lg bg-charcoal text-white relative overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-rose-gold/5 blur-3xl" aria-hidden="true" />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="text-rose-gold" size={20} aria-hidden="true" />
                <h3 className="font-heading font-bold text-xl">Entenda o Q-Switched Nd:YAG</h3>
              </div>
              <p className="text-white/70 leading-relaxed text-sm">
                O laser Q-Switched emite pulsos de energia em nanossegundos — tão rápidos que o pigmento absorve a energia e se fragmenta antes que o calor se propague para os tecidos adjacentes. O resultado: remoção eficaz dos pigmentos com mínimo risco de cicatrizes ou alterações de cor na pele.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'Nd:YAG', label: 'Comprimento de onda' },
                { value: 'ns', label: 'Pulsos em nanossegundos' },
                { value: 'ANVISA', label: 'Equipamento aprovado' },
                { value: '100%', label: 'Seguro pele morena' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-3 rounded-md bg-white/5 border border-white/10">
                  <div className="font-heading text-xl font-bold text-rose-gold">{stat.value}</div>
                  <div className="text-white/50 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
