'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Phone } from 'lucide-react'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'
import { useActiveSection } from '@/hooks/useActiveSection'

const ALL_NAV_LINKS = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#como-funciona', label: 'Como Funciona' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#avaliacoes', label: 'Avaliações' },
  { href: '#resultados-clientes', label: 'Resultados' },
  { href: '#contato', label: 'Contato' },
]

const WA_LINK = 'https://wa.link/e2g7ii'

export function Navbar({ hasTestimonials = true, hasClientResults = false }: { hasTestimonials?: boolean; hasClientResults?: boolean }) {
  const NAV_LINKS = ALL_NAV_LINKS.filter((link) => {
    if (link.href === '#avaliacoes') return hasTestimonials
    if (link.href === '#resultados-clientes') return hasClientResults
    return true
  })
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const activeSection = useActiveSection(['sobre', 'como-funciona', 'servicos', 'avaliacoes', 'resultados-clientes', 'contato'])

  // Detecta scroll para aplicar glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fecha menu ao redimensionar
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setIsMenuOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleNavClick = useCallback((href: string, label: string) => {
    setIsMenuOpen(false)
    trackCTAClick(`nav_${label}`, 'navbar')
    // Smooth scroll manual para controle total
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  const handleWhatsApp = useCallback(() => {
    trackWhatsAppClick('navbar')
    trackCTAClick('agendar_avaliacao', 'navbar')
    window.open(WA_LINK, '_blank', 'noopener,noreferrer')
  }, [])

  return (
    <>
      <header
        role="banner"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'navbar-landing'
            : 'bg-transparent'
        }`}
      >
        <div className="container-main">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <a
              href="#"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2 rounded-md"
              aria-label="Viviani Serena - Ir ao topo"
            >
              <img src="/images/brand/logo-icon.svg?v=2" alt="" width={48} height={36} className="h-9 w-12 shrink-0 object-contain" />
              <span className={`font-heading font-bold text-xl transition-colors duration-300 ${
                isScrolled ? 'text-charcoal' : 'text-white'
              }`}>
                Viviani <span className="text-rose-gold">Serena</span>
              </span>
            </a>

            {/* Desktop nav */}
            <nav role="navigation" aria-label="Menu principal" className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map(link => {
                const id = link.href.replace('#', '')
                const isActive = activeSection === id
                return (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href, link.label)}
                    className={`relative text-sm font-medium transition-colors duration-200 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2 rounded-sm ${
                      isScrolled
                        ? isActive ? 'text-rose-gold' : 'text-charcoal hover:text-rose-gold'
                        : isActive ? 'text-rose-gold' : 'text-white/90 hover:text-white'
                    }`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-rose-gold rounded-full"
                      />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* CTA desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={handleWhatsApp}
                data-analytics="cta-navbar-whatsapp"
                className="btn-primary text-sm px-6 py-3 relative overflow-hidden group"
                aria-label="Agendar avaliação gratuita pelo WhatsApp"
              >
                {/* Pulse ring */}
                <span className="absolute inset-0 rounded-full border-2 border-rose-gold/40 animate-ping opacity-0 group-hover:opacity-100" aria-hidden="true" />
                <Phone size={16} aria-hidden="true" />
                Agendar Avaliação Gratuita
              </button>
            </div>

            {/* Mobile hamburguer */}
            <AnimatePresence initial={false}>
              {!isMenuOpen && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`lg:hidden p-2 rounded-lg transition-colors ${
                    isScrolled ? 'text-charcoal hover:bg-blush' : 'text-white hover:bg-white/10'
                  }`}
                  onClick={() => setIsMenuOpen(true)}
                  aria-label="Abrir menu"
                  aria-expanded={false}
                  aria-controls="mobile-menu"
                >
                  <Menu size={24} aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.nav
              role="navigation"
              aria-label="Menu mobile"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 35 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[min(320px,85vw)] flex flex-col lg:hidden" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-xl)' }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-6" style={{ boxShadow: '0 1px 0 var(--border-subtle)' }}>
                <span className="font-heading font-bold text-lg text-charcoal">
                  Viviani <span className="text-rose-gold">Serena</span>
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg text-charcoal hover:bg-blush"
                  aria-label="Fechar menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Links */}
              <div className="flex-1 p-6 space-y-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.button
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => handleNavClick(link.href, link.label)}
                    className="w-full text-left px-4 py-3 rounded-md text-charcoal hover:bg-blush hover:text-rose-gold font-medium transition-colors"
                  >
                    {link.label}
                  </motion.button>
                ))}
              </div>

              {/* CTA mobile */}
              <div className="p-6" style={{ boxShadow: '0 -1px 0 var(--border-subtle)' }}>
                <button
                  onClick={handleWhatsApp}
                  className="btn-primary w-full"
                  aria-label="Agendar avaliação gratuita"
                >
                  <Phone size={18} aria-hidden="true" />
                  Agendar Avaliação Gratuita
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
