'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import { useScroll, useTransform, LazyMotion, domAnimation, m } from 'framer-motion'
import { ChevronDown, Shield, Award, CheckCircle, Star, Zap } from 'lucide-react'
import { useCountUp, useInView } from '@/lib/hooks'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'

const WA_LINK = 'https://wa.link/e2g7ii'

// ─── Particle Canvas ─────────────────────────────────────────────────────────
// Sistema de partículas ultra-leve, 60fps garantido
interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  opacityDir: number
}

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    const particles: Particle[] = []
    const PARTICLE_COUNT = 35

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    // Inicializa partículas
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -Math.random() * 0.4 - 0.1,
        opacity: Math.random() * 0.4 + 0.1,
        opacityDir: Math.random() > 0.5 ? 1 : -1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.speedX
        p.y += p.speedY
        p.opacity += p.opacityDir * 0.003

        if (p.opacity > 0.5) p.opacityDir = -1
        if (p.opacity < 0.05) p.opacityDir = 1
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width }
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10

        ctx.save()
        ctx.globalAlpha = p.opacity
        // Partícula com brilho dourado suave
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, 'rgba(201, 150, 122, 0.9)')
        gradient.addColorStop(1, 'rgba(201, 150, 122, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
      animId = requestAnimationFrame(draw)
    }

    draw()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
    }
  }, [canvasRef])
}

// ─── Counter animado ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '+', label }: { target: number; suffix?: string; label: string }) {
  const { ref, isInView } = useInView()
  const { count, start } = useCountUp(target, 2000)

  useEffect(() => {
    if (isInView) start()
  }, [isInView, start])

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center">
      <div className="font-heading text-3xl lg:text-4xl font-bold text-white">
        {count.toLocaleString('pt-BR')}{suffix}
      </div>
      <div className="text-white/70 text-xs mt-0.5 font-medium">{label}</div>
    </div>
  )
}

// ─── Trust badges ─────────────────────────────────────────────────────────────
const TRUST_BADGES = [
  { icon: Shield, label: 'ANVISA Regulamentado' },
  { icon: Award, label: 'Biomédica em Formação' },
  { icon: CheckCircle, label: 'Certificação Internacional' },
  { icon: Zap, label: 'Q-Switched Nd:YAG' },
]

// ─── Hero principal ───────────────────────────────────────────────────────────
interface HeroProps {
  urgencyBadge?: { enabled: boolean; text?: string } | null
  title?: string
  subtitle?: string
  cta?: { text?: string; url?: string }
  whatsappNumber?: string
  whatsappMessage?: string
}

export function Hero({ urgencyBadge, title, subtitle, cta, whatsappNumber, whatsappMessage }: HeroProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Parallax suave
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '8%'])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  useParticles(canvasRef)

  useEffect(() => { setIsMounted(true) }, [])

  // Monta o link do WhatsApp com número e mensagem da API, ou cai no link fixo
  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}`
    : WA_LINK

  const handleWhatsApp = useCallback((source: string) => {
    trackWhatsAppClick(source)
    trackCTAClick('agendar_avaliacao_gratuita', source)
    window.open(waHref, '_blank', 'noopener,noreferrer')
  }, [waHref])

  const handleScrollToResults = useCallback(() => {
    trackCTAClick('ver_resultados', 'hero')
    const el = document.getElementById('servicos')
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  const handleScrollDown = useCallback(() => {
    const el = document.getElementById('sobre')
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  return (
    <LazyMotion features={domAnimation} strict>
      <section
        ref={containerRef}
        className="relative min-h-screen flex items-center overflow-hidden"
        aria-label="Seção principal - Remoção a Laser"
      >
        {/* ── Imagem de fundo com parallax ── */}
        <m.div
          className="absolute inset-0 z-0"
          style={{ y: imageY }}
        >
          <Image
            src="https://static.wixstatic.com/media/be8b61_9dfb57055aea4d4f9f4c8b5bfdbbea28~mv2.jpg"
            alt="Viviani Serena - Especialista em Remoção a Laser em Santo André e São Paulo"
            fill
            priority
            quality={85}
            className="object-cover object-center scale-105"
            sizes="100vw"
          />
        </m.div>

        {/* ── Overlay gradiente ── */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-charcoal/80 via-charcoal/55 to-charcoal/20 md:to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" aria-hidden="true" />

        {/* ── Canvas de partículas ── */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-20 pointer-events-none w-full h-full"
          aria-hidden="true"
        />

        {/* ── Conteúdo principal ── */}
        <m.div
          className="relative z-30 container-main w-full pt-24 pb-16 lg:pt-28"
          style={{ y: textY, opacity }}
        >
          <div className="max-w-3xl">
            {/* FOMO badge piscante — controlado pelo CRM (urgencyBadge undefined = API indisponível, mostra; false = desativado pelo admin) */}
            {isMounted && (urgencyBadge === undefined || urgencyBadge === null || urgencyBadge.enabled) && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-6"
              >
                <span
                  className="badge bg-rose-gold/90 text-white backdrop-blur-sm pulse-soft"
                  aria-label="Vagas limitadas"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
                  {urgencyBadge?.text ?? 'Últimas vagas desta semana'}
                </span>
              </m.div>
            )}

            {/* Headline principal */}
            <m.h1
              className="heading-xl text-white mb-6 text-balance leading-[1.1]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {title ? (
                title
              ) : (
                <>
                  Renovo a{' '}
                  <span className="relative inline-block">
                    <span className="text-gradient bg-gradient-to-r from-[#E8B49A] to-[#C9967A] bg-clip-text text-transparent">
                      originalidade
                    </span>
                    <svg
                      className="absolute -bottom-2 left-0 w-full"
                      viewBox="0 0 200 8"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M1 5.5C50 2 150 2 199 5.5" stroke="#C9967A" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </span>{' '}
                  da tua pele
                </>
              )}
            </m.h1>

            {/* Subheadline */}
            <m.p
              className="text-white/85 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl text-pretty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              {subtitle ?? (
                <>
                  Remoção a laser de{' '}
                  <strong className="text-white font-semibold">sobrancelhas micropigmentadas</strong>,{' '}
                  <strong className="text-white font-semibold">lábios</strong>,{' '}
                  <strong className="text-white font-semibold">eyeliner capilar</strong> e{' '}
                  <strong className="text-white font-semibold">tatuagens</strong>{' '}
                  em Santo André e São Paulo.
                </>
              )}
            </m.p>

            {/* CTAs */}
            <m.div
              className="flex flex-col sm:flex-row gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <button
                onClick={() => handleWhatsApp('hero_primary_cta')}
                data-analytics="cta-hero-primary"
                className="btn-primary text-base px-8 py-4 shadow-xl shadow-rose-gold/30 relative overflow-hidden group"
                aria-label="Agendar avaliação gratuita pelo WhatsApp"
              >
                <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" aria-hidden="true" />
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {cta?.text ?? 'Agendar Avaliação Gratuita'}
              </button>

              <button
                onClick={handleScrollToResults}
                data-analytics="cta-hero-secondary"
                className="btn-secondary text-base border-white/60 text-white hover:bg-white hover:text-charcoal"
                aria-label="Ver resultados e serviços"
              >
                Ver Resultados
                <Star size={16} aria-hidden="true" />
              </button>
            </m.div>

            {/* Trust badges */}
            <m.div
              className="flex flex-wrap gap-x-6 gap-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              role="list"
              aria-label="Certificações e credenciais"
            >
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <div key={label} className="trust-badge" role="listitem">
                  <Icon size={16} className="text-rose-gold flex-shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </m.div>
          </div>
        </m.div>

        {/* ── Badge flutuante: contador de clientes ── */}
        {isMounted && (
          <m.div
            className="absolute bottom-24 right-6 lg:right-16 z-30"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, type: 'spring', stiffness: 200 }}
          >
            <div className="glass rounded-2xl px-5 py-4 border border-white/30 shadow-xl shadow-black/20">
              <div className="flex items-center gap-4 divide-x divide-white/20">
                <AnimatedCounter target={0} suffix="" label="Clientes registradas" />
                <div className="pl-4">
                  <AnimatedCounter target={0} suffix="" label="Avaliações publicas" />
                </div>
              </div>
            </div>
          </m.div>
        )}

        {/* ── Scroll indicator ── */}
        <m.button
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 text-white/60 hover:text-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-md p-2"
          onClick={handleScrollDown}
          aria-label="Rolar para baixo"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [10, 0, 10] }}
          transition={{ opacity: { delay: 1.2, duration: 0.5 }, y: { delay: 1.5, duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }}
        >
          <span className="text-xs font-medium tracking-widest uppercase">Saiba mais</span>
          <ChevronDown size={22} aria-hidden="true" />
        </m.button>
      </section>
    </LazyMotion>
  )
}
