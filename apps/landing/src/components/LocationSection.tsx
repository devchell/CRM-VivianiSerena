'use client'

import { motion } from 'framer-motion'
import { MapPin, Phone, Clock, ExternalLink } from 'lucide-react'
import { useInView } from '@/lib/hooks'
import { trackCTAClick } from '@/lib/analytics'

interface Location {
  id: string
  name: string
  city: string
  address: string
  mapUrl: string
  hours: string
  highlight?: string
}

const LOCATIONS: Location[] = [
  {
    id: 'mooca',
    name: 'Espaço Mooca',
    city: 'São Paulo — Parque da Mooca',
    address: 'Av. Paes de Barros, 3399, Sala 51\nParque da Mooca — São Paulo, SP',
    mapUrl: 'https://www.google.com/maps/search/Av.+Paes+de+Barros+3399+Sala+51+Parque+da+Mooca+São+Paulo',
    hours: 'Seg–Sex: 9h–18h | Sáb: 9h–14h',
    highlight: 'Próximo ao Metrô Bresser-Mooca',
  },
  {
    id: 'santo-andre',
    name: 'Espaço Santo André',
    city: 'Santo André — Jardim',
    address: 'R. das Esmeraldas, 606, Sala 72\nJardim — Santo André, SP',
    mapUrl: 'https://www.google.com/maps/search/Rua+das+Esmeraldas+606+Sala+72+Santo+André+SP',
    hours: 'Seg–Sex: 9h–18h | Sáb: 9h–14h',
    highlight: 'Fácil acesso e estacionamento',
  },
]

export default function LocationSection() {
  const { ref: headerRef, isInView } = useInView()

  return (
    <section
      id="localizacao"
      className="section bg-white"
      aria-labelledby="location-heading"
    >
      <div className="container-main">
        {/* Header */}
        <motion.div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-rose-gold text-sm font-semibold uppercase tracking-[0.2em]">
            Onde Estamos
          </span>
          <h2 id="location-heading" className="heading-lg text-charcoal mt-2 mb-4">
            Dois espaços para atender você
          </h2>
          <p className="text-charcoal-500 max-w-xl mx-auto">
            Ambiente acolhedor, privativo e pensado para o seu conforto em São Paulo e no Grande ABC.
          </p>
        </motion.div>

        {/* Location cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {LOCATIONS.map((loc, i) => (
            <motion.div
              key={loc.id}
              className="card p-8 hover:shadow-xl transition-shadow duration-300 group"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-blush rounded-md flex items-center justify-center mb-5 group-hover:bg-rose-gold transition-colors duration-300">
                <MapPin className="w-5 h-5 text-rose-gold group-hover:text-white transition-colors duration-300" aria-hidden="true" />
              </div>

              <h3 className="font-heading text-xl font-bold text-charcoal mb-1">{loc.name}</h3>
              <p className="text-rose-gold text-sm font-medium mb-4">{loc.city}</p>

              {/* Address */}
              <address className="not-italic text-charcoal-600 text-sm leading-relaxed mb-4 whitespace-pre-line">
                {loc.address}
              </address>

              {/* Hours */}
              <div className="flex items-center gap-2 text-charcoal-500 text-sm mb-3">
                <Clock className="w-4 h-4 flex-shrink-0 text-rose-gold" aria-hidden="true" />
                <span>{loc.hours}</span>
              </div>

              {/* Highlight */}
              {loc.highlight && (
                <div className="flex items-center gap-2 text-sage text-sm mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage flex-shrink-0" aria-hidden="true" />
                  <span>{loc.highlight}</span>
                </div>
              )}

              {/* Maps button */}
              <a
                href={loc.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCTAClick('google_maps', loc.id)}
                className="inline-flex items-center gap-2 btn-secondary text-sm w-full justify-center group-hover:bg-rose-gold group-hover:text-white group-hover:border-rose-gold transition-all duration-300"
                aria-label={`Ver ${loc.name} no Google Maps`}
              >
                <MapPin className="w-4 h-4" aria-hidden="true" />
                Ver no Google Maps
                <ExternalLink className="w-3 h-3 opacity-60" aria-hidden="true" />
              </a>
            </motion.div>
          ))}
        </div>

        {/* Phone */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a
            href="tel:+5511915751770"
            className="inline-flex items-center gap-3 text-charcoal hover:text-rose-gold transition-colors group"
            onClick={() => trackCTAClick('phone_click', 'location')}
          >
            <div className="w-10 h-10 bg-blush rounded-md flex items-center justify-center group-hover:bg-rose-gold transition-colors">
              <Phone className="w-4 h-4 text-rose-gold group-hover:text-white transition-colors" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold">(11) 91575-1770</span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
