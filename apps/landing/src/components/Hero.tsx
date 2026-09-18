'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import { useReducedMotion, useScroll, useTransform, LazyMotion, domAnimation, m } from 'framer-motion'
import { ChevronDown, Shield, Award, CheckCircle, Zap } from 'lucide-react'
import { useCountUp, useInView } from '@/lib/hooks'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'
import { landingPublicEnv } from '@/lib/public-env'

const WA_LINK = 'https://wa.link/e2g7ii'
const API_URL = landingPublicEnv.apiBaseUrl
const DEFAULT_HERO_IMAGE = '/images/viviani/retrato.webp'
const HERO_BLUR_DATA_URL = 'data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAAAQBQCdASoYABAAPulgqE0pJaOiMAgBIB0JZQDA3dwBGttQg7oT3CNRWvg9eYa5MwgAAP7kThHWTjnJTLZsrS6xc5/e1cD7T5pDA6LdUgrJxTRG1Uml+VzPolitxF86Q0g02SGaKL2Gz0GWazXCzjWovemeSr7nYpnJMHQg3myF+p5ZlrMt8TgenhtLSGEAAAA='

function normalizeImageUrl(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:image/')) return trimmed

  if (trimmed.startsWith('/images/')) {
    return trimmed
  }

  if (trimmed.startsWith('/')) {
    return `${API_URL}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      return `${API_URL}${parsed.pathname}${parsed.search}`
    }

    if (parsed.hostname === 'static.wixstatic.com') {
      return ''
    }

    return trimmed
  } catch {
    return `${API_URL}/uploads/${trimmed.replace(/^\/+/, '')}`
  }
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
      <div className="text-white/90 text-xs mt-0.5 font-medium">{label}</div>
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
  backgroundImage?: string
  whatsappNumber?: string
  whatsappMessage?: string
  socialProof?: {
    enabled: boolean
    clientsRegistered: number
    publicReviews: number
  } | null
}

export function Hero({
  urgencyBadge,
  title,
  subtitle,
  cta,
  backgroundImage,
  whatsappNumber,
  whatsappMessage,
  socialProof,
}: HeroProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [hasHeroImageError, setHasHeroImageError] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] })
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '12%']
  )

  useEffect(() => { setIsMounted(true) }, [])
  useEffect(() => { setHasHeroImageError(false) }, [backgroundImage])

  // Monta o link do WhatsApp com número e mensagem da API, ou cai no link fixo
  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}`
    : WA_LINK
  const socialProofEnabled = socialProof?.enabled === true &&
    ((socialProof.clientsRegistered ?? 0) > 0 || (socialProof.publicReviews ?? 0) > 0)
  const clientsRegistered = socialProof?.clientsRegistered ?? 0
  const publicReviews = socialProof?.publicReviews ?? 0
  const normalizedHeroImage = normalizeImageUrl(backgroundImage)
  const heroBackgroundSrc = hasHeroImageError || !normalizedHeroImage
    ? DEFAULT_HERO_IMAGE
    : normalizedHeroImage

  const handleWhatsApp = useCallback((source: string) => {
    trackWhatsAppClick(source)
    trackCTAClick('agendar_avaliacao_gratuita', source)
    window.open(waHref, '_blank', 'noopener,noreferrer')
  }, [waHref])

  const handlePrimaryCta = useCallback(() => {
    const configuredUrl = cta?.url?.trim()
    const targetUrl = configuredUrl === '#agendamento' ? '#contato' : configuredUrl
    const isSafeUrl = Boolean(targetUrl) && /^(#|\/|https?:\/\/|mailto:|tel:)/i.test(targetUrl ?? '')

    if (!targetUrl || !isSafeUrl || targetUrl === WA_LINK) {
      handleWhatsApp('hero_primary_cta')
      return
    }

    trackCTAClick('agendar_avaliacao_gratuita', 'hero_primary_cta')
    if (/^https?:\/\//i.test(targetUrl)) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
      return
    }

    window.location.assign(targetUrl)
  }, [cta?.url, handleWhatsApp])

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
        {/* ── Imagem de fundo da composição original ── */}
        <m.div className="absolute inset-0 z-0" style={{ y: imageY }}>
          <Image
            src={heroBackgroundSrc}
            alt="Viviani Serena - Especialista em Remoção a Laser em Santo André e São Paulo"
            fill
            priority
            quality={78}
            placeholder="blur"
            blurDataURL={HERO_BLUR_DATA_URL}
            className="object-cover object-center scale-105"
            sizes="100vw"
            onError={() => setHasHeroImageError(true)}
          />
        </m.div>

        {/* ── Overlay gradiente ── */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-charcoal/80 via-charcoal/55 to-charcoal/20 md:to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" aria-hidden="true" />

        {/* ── Conteúdo principal ── */}
        <m.div
          className="relative z-30 container-main w-full pt-24 pb-16 lg:pt-28"
        >
          <div className="max-w-3xl">
            {/* Aviso de agenda somente quando configurado no painel */}
            {isMounted && urgencyBadge?.enabled === true && urgencyBadge.text?.trim() && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-6"
              >
                <span
                  className="badge bg-rose-gold/90 text-white backdrop-blur-sm"
                  aria-label="Informação da agenda"
                >
                  {urgencyBadge.text}
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
                    <span className="text-[#E8B49A]">
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
                  <strong className="text-white font-semibold">eyeliner</strong>,{' '}
                  <strong className="text-white font-semibold">micropigmentação capilar</strong> e{' '}
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
                onClick={handlePrimaryCta}
                data-analytics="cta-hero-primary"
                className="btn-primary text-base px-8 py-4"
                aria-label="Agendar avaliação gratuita pelo WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {cta?.text || 'Agendar Avaliação Gratuita'}
              </button>

              <button
                onClick={handleScrollToResults}
                data-analytics="cta-hero-secondary"
                className="btn-secondary text-base border-white/60 text-white hover:bg-white hover:text-charcoal"
                aria-label="Ver resultados e serviços"
              >
                Ver Resultados
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
        {isMounted && socialProofEnabled ? (
          <m.div
            className="absolute bottom-24 right-6 lg:right-16 z-30"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, type: 'spring', stiffness: 200 }}
          >
            <div className="rounded-lg border border-rose-gold/60 bg-charcoal/90 px-5 py-4 shadow-xl shadow-black/35 backdrop-blur-md">
              <div className="flex items-center gap-4">
                {clientsRegistered > 0 && (
                  <AnimatedCounter target={clientsRegistered} suffix="" label="Clientes registrados" />
                )}
                {clientsRegistered > 0 && publicReviews > 0 && (
                  <div className="h-10 w-px bg-white/20" aria-hidden="true" />
                )}
                {publicReviews > 0 && (
                  <AnimatedCounter target={publicReviews} suffix="" label="Avaliações públicas" />
                )}
              </div>
            </div>
          </m.div>
        ) : null}

        {/* ── Scroll indicator ── */}
        <m.button
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 text-white/60 hover:text-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-md p-2"
          onClick={handleScrollDown}
          aria-label="Rolar para baixo"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ opacity: { delay: 1.2, duration: 0.5 }, y: { delay: 1.2, duration: 0.5 } }}
        >
          <span className="text-xs font-medium tracking-widest uppercase">Saiba mais</span>
          <ChevronDown size={22} aria-hidden="true" />
        </m.button>
      </section>
    </LazyMotion>
  )
}
