'use client'

import { ChevronUp, MapPin, Phone, Mail } from 'lucide-react'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'

const NAV_LINKS = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Como Funciona', href: '#como-funciona' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'Avaliações', href: '#avaliacoes' },
  { label: 'Localização', href: '#localizacao' },
  { label: 'FAQ', href: '#faq' },
]

const LEGAL_LINKS = [
  { label: 'Política de Privacidade', href: '/privacidade' },
  { label: 'Termos de Uso', href: '/termos' },
]

interface FooterProps {
  whatsappNumber?: string
}

export default function Footer({ whatsappNumber }: FooterProps = {}) {
  const waHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : 'https://wa.link/e2g7ii'

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    trackCTAClick('scroll_to_top', 'footer')
  }

  const handleNavClick = (href: string, label: string) => {
    const id = href.replace('#', '')
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    trackCTAClick(`footer_nav_${label.toLowerCase().replace(' ', '_')}`, 'footer')
  }

  return (
    <footer className="bg-charcoal text-white/90" aria-label="Rodapé">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #C9967A, #7D4833)',
                  clipPath: 'polygon(50% 0%, 80% 20%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 20%)',
                }}
                aria-hidden="true"
              />
              <div>
                <span className="font-heading font-bold text-white text-base leading-none block">Viviani</span>
                <span className="text-[#d6a082] text-xs tracking-widest uppercase leading-none">Serena</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-white/75 mb-5">
              Especialista em despigmentação a laser. Devolvendo à pele a liberdade de ser original.
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              {/* WhatsApp */}
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { trackWhatsAppClick('footer'); trackCTAClick('footer_whatsapp', 'footer') }}
                className="w-9 h-9 bg-white/10 hover:bg-[#25D366] rounded flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/vivini.serena/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCTAClick('footer_instagram', 'footer')}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center transition-colors"
                aria-label="Instagram @vivini.serena"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Navegação</h3>
            <nav aria-label="Links do rodapé">
              <ul className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link.href, link.label)}
                      className="text-white/60 hover:text-rose-gold transition-colors text-sm text-left"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Locations */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Espaços</h3>
            <div className="space-y-4 text-sm text-white/75">
              <div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-white font-medium">Mooca — São Paulo</p>
                    <address className="not-italic text-xs leading-relaxed mt-0.5">
                      Av. Paes de Barros, 3399, Sala 51<br />
                      Parque da Mooca — SP
                    </address>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-white font-medium">Santo André</p>
                    <address className="not-italic text-xs leading-relaxed mt-0.5">
                      R. das Esmeraldas, 606, Sala 72<br />
                      Jardim — Santo André, SP
                    </address>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contato</h3>
            <div className="space-y-3 text-sm">
              <a
                href="https://wa.me/5511915751770"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/75 hover:text-rose-gold transition-colors"
                onClick={() => trackCTAClick('footer_phone', 'footer')}
              >
                <Phone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                (11) 91575-1770
              </a>
              <a
                href="mailto:contato@vivianiserena.com"
                className="flex items-center gap-2 text-white/75 hover:text-rose-gold transition-colors"
                onClick={() => trackCTAClick('footer_email', 'footer')}
              >
                <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                contato@vivianiserena.com
              </a>
            </div>

            {/* Back to top */}
            <button
              onClick={scrollToTop}
              className="mt-6 inline-flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors group"
              aria-label="Voltar ao topo da página"
            >
              <div className="w-7 h-7 border border-white/20 rounded flex items-center justify-center group-hover:border-white/60 transition-colors">
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              Voltar ao topo
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <div>
            <p>© {new Date().getFullYear()} Viviani Serena. Todos os direitos reservados.</p>
          </div>
          <div className="flex gap-4">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
