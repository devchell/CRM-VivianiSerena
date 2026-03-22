'use client'

import { useRef, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'

const WA_BASE = 'https://wa.me/5511915751770?text='

const SERVICES = [
  {
    id: 'sobrancelhas',
    emoji: '✦',
    title: 'Sobrancelhas',
    subtitle: 'Micropigmentação & Microblading',
    description:
      'Remoção completa ou parcial de sobrancelhas micropigmentadas e microblading. Ideal para correção de formato, cor ou para quem quer recomeçar do zero.',
    badge: 'A partir de 3 sessões',
    details: [
      'Pigmentos de todas as marcas e cores',
      'Preservação dos fios naturais',
      'Protocolos para pele oleosa e sensível',
    ],
    waMessage: 'Olá Viviani! Gostaria de saber mais sobre remoção a laser de sobrancelhas micropigmentadas.',
    color: 'hover:border-rose-gold/40',
    accentBg: 'bg-rose-gold/8',
  },
  {
    id: 'labios',
    emoji: '◆',
    title: 'Lábios & Eyeliner',
    subtitle: 'Micropigmentação labial e eyeliner',
    description:
      'Remoção de aquarela labial, blush labial e eyeliner micropigmentado. Procedimento delicado que exige precisão e experiência com a mucosa labial.',
    badge: 'A partir de 4 sessões',
    details: [
      'Técnica especializada para mucosa',
      'Recuperação de bordas naturais',
      'Protocolo pós laser incluso',
    ],
    waMessage: 'Olá Viviani! Tenho interesse em remover micropigmentação de lábios/eyeliner a laser.',
    color: 'hover:border-sage/40',
    accentBg: 'bg-sage/8',
  },
  {
    id: 'capilar',
    emoji: '◉',
    title: 'Capilar',
    subtitle: 'Micropigmentação capilar (MSC)',
    description:
      'Remoção de micropigmentação capilar (scalp micropigmentation) para quem deseja reverter o procedimento ou ajustar pontos específicos do couro cabeludo.',
    badge: 'A partir de 5 sessões',
    details: [
      'Área craniana e hairline',
      'Sem danos ao folículo capilar',
      'Clareia progressivamente',
    ],
    waMessage: 'Olá Viviani! Gostaria de remover micropigmentação capilar a laser. Pode me ajudar?',
    color: 'hover:border-rose-gold/40',
    accentBg: 'bg-rose-gold/8',
  },
  {
    id: 'tatuagens',
    emoji: '★',
    title: 'Tatuagens',
    subtitle: 'Remoção total ou parcial',
    description:
      'Remoção a laser de tatuagens coloridas, pretas e cinzas. Atendemos tatuagens artísticas, tribais e tatuagens amadoras com protocolos adaptados a cada tipo de tinta.',
    badge: 'A partir de 6 sessões',
    details: [
      'Tintas coloridas e pigmentos escuros',
      'Remoção total ou clareamento para cobertura',
      'Estimativa de sessões na avaliação',
    ],
    waMessage: 'Olá Viviani! Gostaria de remover ou clarear uma tatuagem. Podemos conversar?',
    color: 'hover:border-sage/40',
    accentBg: 'bg-sage/8',
  },
]

// Hook 3D hover effect
function use3DHover() {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -6
    const rotateY = ((x - centerX) / centerX) * 6
    card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`
  }, [])

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
  }, [])

  return { handleMouseMove, handleMouseLeave }
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

function ServiceCard({ service }: { service: typeof SERVICES[0] }) {
  const { handleMouseMove, handleMouseLeave } = use3DHover()

  const handleCTA = () => {
    trackWhatsAppClick(`services_${service.id}`)
    trackCTAClick(`servico_${service.id}`, 'services')
    const url = `${WA_BASE}${encodeURIComponent(service.waMessage)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.div
      variants={cardVariants}
      className="perspective"
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`card preserve-3d p-7 h-full flex flex-col border-2 border-transparent transition-all duration-300 will-change-transform ${service.color} hover:shadow-xl hover:shadow-charcoal/8`}
        style={{ transition: 'box-shadow 0.3s ease, border-color 0.3s ease' }}
      >
        {/* Header do card */}
        <div className="flex items-start justify-between mb-5">
          <div className={`w-14 h-14 rounded-md ${service.accentBg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-rose-gold text-2xl font-bold" aria-hidden="true">{service.emoji}</span>
          </div>
          <span className="badge bg-blush text-rose-gold border border-rose-gold/20 text-xs">
            {service.badge}
          </span>
        </div>

        {/* Títulos */}
        <h3 className="font-heading font-bold text-charcoal text-xl mb-1">{service.title}</h3>
        <p className="text-rose-gold text-xs font-semibold uppercase tracking-wider mb-4">
          {service.subtitle}
        </p>

        {/* Descrição */}
        <p className="text-charcoal/65 text-sm leading-relaxed mb-5 flex-1">
          {service.description}
        </p>

        {/* Lista de detalhes */}
        <ul className="space-y-2 mb-6" aria-label={`Detalhes do serviço ${service.title}`}>
          {service.details.map(detail => (
            <li key={detail} className="flex items-start gap-2 text-sm text-charcoal/70">
              <span className="text-sage font-bold mt-0.5 flex-shrink-0">✓</span>
              {detail}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleCTA}
          data-analytics={`cta-service-${service.id}`}
          className="btn-secondary text-sm py-3 w-full mt-auto"
          aria-label={`Saber mais sobre remoção de ${service.title}`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Tirar Dúvidas no WhatsApp
        </button>
      </div>
    </motion.div>
  )
}

export function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      id="servicos"
      ref={sectionRef}
      className="section bg-white"
      aria-labelledby="services-heading"
    >
      <div className="container-main">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label justify-center">
            <span className="w-6 h-px bg-rose-gold" aria-hidden="true" />
            Serviços
            <span className="w-6 h-px bg-rose-gold" aria-hidden="true" />
          </span>
          <h2 id="services-heading" className="heading-lg text-charcoal mb-4 text-balance">
            O que posso remover{' '}
            <span className="text-rose-gold">para você</span>
          </h2>
          <p className="text-charcoal/60 max-w-2xl mx-auto text-lg">
            Cada tipo de pigmento e região exige um protocolo específico. Conheça os serviços e saiba qual é o ideal para o seu caso.
          </p>
        </motion.div>

        {/* Grid de cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {SERVICES.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </motion.div>

        {/* CTA central */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-charcoal/50 text-sm mb-4">
            Não encontrou o seu caso? Entre em contato — avaliamos cada situação individualmente.
          </p>
          <button
            onClick={() => {
              trackCTAClick('avaliacao_gratuita_services', 'services')
              trackWhatsAppClick('services_cta_bottom')
              window.open('https://wa.link/e2g7ii', '_blank', 'noopener,noreferrer')
            }}
            data-analytics="cta-services-bottom"
            className="btn-primary"
          >
            Agendar Avaliação Gratuita
          </button>
        </motion.div>
      </div>
    </section>
  )
}
