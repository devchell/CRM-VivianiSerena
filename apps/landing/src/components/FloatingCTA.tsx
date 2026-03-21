'use client'

import type { MouseEvent as ReactMouseEvent } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { trackCTAClick, trackWhatsAppClick } from '@/lib/analytics'

const DEFAULT_WA_LINK = 'https://wa.link/e2g7ii'

// Exit intent modal content
function ExitIntentModal({ onClose, waLink }: { onClose: () => void; waLink: string }) {
  // Focus trap
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = modalRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', trap)
    first?.focus()
    return () => document.removeEventListener('keydown', trap)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
    >
      <motion.div
        ref={modalRef}
        className="relative w-full max-w-sm bg-white rounded-lg overflow-hidden shadow-2xl"
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        {/* Header gradient */}
        <div
          className="h-2"
          style={{ background: 'linear-gradient(90deg, #C9967A, #7D4833)' }}
          aria-hidden="true"
        />

        <div className="p-7">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-stone-600" />
          </button>

          {/* Icon */}
          <div className="w-14 h-14 bg-blush rounded flex items-center justify-center mb-4" aria-hidden="true">
            <span className="text-2xl" role="img" aria-hidden="true">✨</span>
          </div>

          <h2 id="exit-modal-title" className="font-heading text-2xl font-bold text-charcoal mb-2">
            Espera! Antes de ir...
          </h2>
          <p className="text-charcoal-500 text-sm mb-6">
            Que tal uma avaliação <strong className="text-rose-gold">totalmente gratuita</strong> para descobrir como podemos transformar a sua pele?
          </p>

          <div className="space-y-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackWhatsAppClick('exit_intent_modal')
                trackCTAClick('exit_intent_whatsapp', 'exit_intent')
                onClose()
              }}
              className="flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold py-3.5 px-6 rounded transition-colors w-full"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Quero minha avaliação gratuita
            </a>

            <button
              onClick={onClose}
              className="w-full text-charcoal-400 text-sm hover:text-charcoal-600 transition-colors py-2"
            >
              Não, obrigada
            </button>
          </div>

          <p className="text-center text-xs text-charcoal-300 mt-4">
            Avaliação gratuita · Sem compromisso
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface FloatingCTAProps {
  whatsappNumber?: string
  whatsappMessage?: string
}

export default function FloatingCTA({ whatsappNumber, whatsappMessage }: FloatingCTAProps = {}) {
  const [visible, setVisible] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const exitIntentShown = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const waLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}`
    : DEFAULT_WA_LINK

  // Show after 3s OR after 30% scroll
  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), 3000)

    const onScroll = () => {
      const percent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      if (percent >= 30) {
        setVisible(true)
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Exit intent detection
  useEffect(() => {
    const onMouseLeave = (e: globalThis.MouseEvent) => {
      if (e.clientY > 0 || exitIntentShown.current) return
      exitIntentShown.current = true
      setShowModal(true)
    }
    document.addEventListener('mouseleave', onMouseLeave)
    return () => document.removeEventListener('mouseleave', onMouseLeave)
  }, [])

  const closeModal = useCallback(() => setShowModal(false), [])

  return (
    <>
      {/* Floating WhatsApp button */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed bottom-6 right-6 z-40"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackWhatsAppClick('floating_button')
                trackCTAClick('floating_whatsapp', 'floating')
              }}
              className="relative flex items-center justify-center w-14 h-14 group"
              style={{ display: 'block', width: 56, height: 56 }}
              aria-label="Falar no WhatsApp"
            >
              {/* Pulse rings */}
              <span
                className="wa-ring-1 absolute inset-0 rounded-full"
                style={{ background: 'rgba(37,211,102,0.4)' }}
                aria-hidden="true"
              />
              <span
                className="wa-ring-2 absolute inset-0 rounded-full"
                style={{ background: 'rgba(37,211,102,0.4)' }}
                aria-hidden="true"
              />

              {/* Button circle */}
              <span
                className="absolute inset-0 rounded-full bg-[#25D366] flex items-center justify-center transition-transform duration-200 ease-in-out group-hover:scale-[1.08]"
                style={{
                  boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
                  border: '2px solid rgba(255,255,255,0.6)',
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 28, height: 28, fill: 'white', flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </span>

              {/* Tooltip */}
              <span
                className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-[#1a1a1a] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg"
                style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8 }}
              >
                Falar no WhatsApp
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent"
                  style={{ borderLeftColor: '#1a1a1a' }}
                  aria-hidden="true"
                />
              </span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit intent modal */}
      <AnimatePresence>
        {showModal && <ExitIntentModal onClose={closeModal} waLink={waLink} />}
      </AnimatePresence>
    </>
  )
}
