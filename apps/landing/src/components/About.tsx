'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { CheckCircle2, Award, Microscope, Heart } from 'lucide-react'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'
import { landingPublicEnv } from '@/lib/public-env'

const WA_LINK = 'https://wa.link/e2g7ii'
const API_URL = landingPublicEnv.apiBaseUrl

function normalizeImageUrl(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:image/')) return trimmed

  if (trimmed.startsWith('/')) {
    return `${API_URL}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      return `${API_URL}${parsed.pathname}${parsed.search}`
    }

    return trimmed
  } catch {
    return `${API_URL}/uploads/${trimmed.replace(/^\/+/, '')}`
  }
}

const HIGHLIGHTS = [
  {
    icon: Microscope,
    title: 'Tecnologia Q-Switched Nd:YAG',
    desc: 'Laser de alta precisão aprovado pela ANVISA, capaz de fragmentar pigmentos sem danificar a pele ao redor.',
  },
  {
    icon: Award,
    title: 'Biomédica em Formação',
    desc: 'Formação técnico-científica sólida aliada a certificações internacionais em despigmentação a laser.',
  },
  {
    icon: Heart,
    title: 'Protocolo Humanizado',
    desc: 'Cada tratamento é individualizado: seu histórico, tipo de pele e expectativas guiam cada sessão.',
  },
]

const ACHIEVEMENTS = [
  'Base operacional reiniciada para novos registros',
  'Especialização em pigmentos de micropigmentação',
  'Protocolos adaptados a todos os fototipos de pele',
  'Atendimento em Santo André e São Paulo',
  'Equipamentos com registro ANVISA e INMETRO',
  'Suporte pós-sessão incluído em todos os protocolos',
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

interface AboutProps {
  bio?: string
  photoUrl?: string
  whatsappNumber?: string
}

export function About({ bio, photoUrl, whatsappNumber }: AboutProps = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })
  const aboutPhotoSrc = normalizeImageUrl(photoUrl)

  const waHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : WA_LINK

  const handleWhatsApp = () => {
    trackWhatsAppClick('about_section')
    trackCTAClick('saiba_mais_about', 'sobre')
    window.open(waHref, '_blank', 'noopener,noreferrer')
  }

  return (
    <section
      id="sobre"
      ref={sectionRef}
      className="section bg-white"
      aria-labelledby="about-heading"
    >
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* ── Coluna esquerda: imagem + destaque flutuante ── */}
          <motion.div
            className="relative"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            {/* Decoração de fundo */}
            <div
              className="absolute -top-8 -left-8 w-72 h-72 rounded-full bg-blush/60 blur-3xl -z-10"
              aria-hidden="true"
            />

            {/* Foto principal */}
            <motion.div
              variants={itemVariants}
              className="relative rounded-lg overflow-hidden aspect-[4/5] bg-blush shadow-2xl shadow-charcoal/10"
            >
              {/* Placeholder elegante enquanto a foto real não é fornecida */}
              {aboutPhotoSrc ? (
                <Image
                  src={aboutPhotoSrc}
                  alt="Foto de Viviani Serena"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40rem"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blush via-cream to-blush">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 rounded-full bg-rose-gold/20 flex items-center justify-center mx-auto mb-4">
                      <span className="font-heading text-5xl font-bold text-rose-gold">VS</span>
                    </div>
                    <p className="text-charcoal/50 text-sm">Imagem em definição</p>
                  </div>
                </div>
              )}

              {/* Overlay gradiente na base da imagem */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-charcoal/40 to-transparent" aria-hidden="true" />
            </motion.div>

            {/* Badge flutuante: experiência */}
            <motion.div
              variants={itemVariants}
              className="absolute -bottom-6 -right-4 lg:-right-8 glass rounded-lg px-6 py-5 border border-blush shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-rose-gold flex items-center justify-center flex-shrink-0">
                  <Award className="text-white" size={22} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-heading text-2xl font-bold text-charcoal leading-none">10+</p>
                  <p className="text-charcoal/60 text-sm mt-0.5">Anos de experiência</p>
                </div>
              </div>
            </motion.div>

            {/* Badge flutuante: ANVISA */}
            <motion.div
              variants={itemVariants}
              className="absolute -top-4 -right-4 lg:right-4 glass rounded-md px-4 py-3 border border-blush shadow-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sage animate-pulse" aria-hidden="true" />
                <span className="text-xs font-semibold text-charcoal">ANVISA Regulamentado</span>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Coluna direita: texto ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            <motion.span variants={itemVariants} className="section-label">
              <span className="divider-rose inline-block w-6 h-px bg-rose-gold" aria-hidden="true" />
              Sobre Mim
            </motion.span>

            <motion.h2
              id="about-heading"
              variants={itemVariants}
              className="heading-lg text-charcoal mb-6 text-balance"
            >
              A ciência a serviço da{' '}
              <span className="text-rose-gold">renovação da pele</span>
            </motion.h2>

            <motion.div variants={itemVariants} className="space-y-4 text-charcoal/70 leading-relaxed mb-8">
              {bio ? (
                <div
                  className="prose prose-rose max-w-none text-charcoal/80 dark:prose-invert prose-p:mb-3"
                  dangerouslySetInnerHTML={{ __html: bio }}
                />
              ) : (
                <>
                  <p>
                    Sou Viviani Serena, especialista em despigmentação a laser com foco em{' '}
                    <strong className="text-charcoal font-semibold">sobrancelhas micropigmentadas</strong>,{' '}
                    <strong className="text-charcoal font-semibold">lábios</strong>,{' '}
                    <strong className="text-charcoal font-semibold">eyeliner</strong>,{' '}
                    <strong className="text-charcoal font-semibold">micropigmentação capilar</strong> e{' '}
                    <strong className="text-charcoal font-semibold">tatuagens</strong>.
                  </p>
                  <p>
                    Atuo em Santo André e São Paulo utilizando tecnologia Q-Switched Nd:YAG — laser de pulso ultra-curto que fragmenta os pigmentos sem agredir os tecidos ao redor, garantindo resultados seguros em todos os fototipos de pele.
                  </p>
                  <p>
                    Meu trabalho é devolver a você a liberdade de escolher como deseja ser vista. Cada sessão é conduzida com rigor técnico-científico, cuidado genuíno e respeito pela sua história.
                  </p>
                </>
              )}
            </motion.div>

            {/* Lista de conquistas */}
            <motion.ul
              variants={containerVariants}
              className="space-y-2.5 mb-8"
              aria-label="Diferenciais da Viviani Serena"
            >
              {ACHIEVEMENTS.map(achievement => (
                <motion.li
                  key={achievement}
                  variants={itemVariants}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2
                    className="text-sage flex-shrink-0 mt-0.5"
                    size={18}
                    aria-hidden="true"
                  />
                  <span className="text-charcoal/80 text-sm">{achievement}</span>
                </motion.li>
              ))}
            </motion.ul>

            {/* Highlight cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
              {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="card p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <Icon className="text-rose-gold mb-3" size={22} aria-hidden="true" />
                  <h3 className="font-semibold text-charcoal text-sm mb-1">{title}</h3>
                  <p className="text-charcoal/60 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div variants={itemVariants}>
              <button
                onClick={handleWhatsApp}
                data-analytics="cta-about-whatsapp"
                className="btn-primary"
                aria-label="Conversar com Viviani Serena pelo WhatsApp"
              >
                Conversar no WhatsApp
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
