'use client'

import { motion } from 'framer-motion'
import { useInView } from '@/lib/hooks'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'

export default function FinalCTA() {
  const { ref, isInView } = useInView({ threshold: 0.3 })

  const scrollToForm = () => {
    document.getElementById('avaliacao')?.scrollIntoView({ behavior: 'smooth' })
    trackCTAClick('final_cta_form', 'final_cta')
  }

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden py-28 md:py-36"
      aria-labelledby="final-cta-heading"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #7D4833 0%, #C9967A 40%, #E8B4A0 70%, #F2E8E4 100%)',
        }}
        aria-hidden="true"
      />

      {/* Decorative orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white/10 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 container-main text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          {/* Urgency badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" aria-hidden="true" />
            <span className="text-white text-sm font-medium">Vagas limitadas esta semana</span>
          </div>

          {/* Headline */}
          <h2
            id="final-cta-heading"
            className="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-6 leading-tight"
          >
            Inicie seu novo ciclo hoje
          </h2>

          <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Cada pele conta uma história. Deixe-me ajudá-la a escrever o próximo capítulo — com cuidado, ciência e liberdade.
          </p>

          {/* Triple CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            {/* WhatsApp */}
            <a
              href="https://wa.link/e2g7ii"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackWhatsAppClick('final_cta')
                trackCTAClick('final_cta_whatsapp', 'final_cta')
              }}
              className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
              aria-label="Agendar avaliação pelo WhatsApp"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Agendar pelo WhatsApp
            </a>

            {/* Form */}
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 bg-white/90 hover:bg-white text-charcoal font-semibold px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
            >
              Preencher formulário
            </button>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/viviani.serena/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCTAClick('final_cta_instagram', 'final_cta')}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-0.5 w-full sm:w-auto justify-center backdrop-blur-sm"
              aria-label="Ver perfil no Instagram"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              @vivianiserena
            </a>
          </div>

          {/* Micro-copy */}
          <p className="text-white/60 text-sm">
            Avaliação gratuita, sem compromisso. Resposta em até 24h.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
