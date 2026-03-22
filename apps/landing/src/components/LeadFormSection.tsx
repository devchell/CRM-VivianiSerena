'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, CheckCircle, ChevronRight, Clock, Mail, Phone, User } from 'lucide-react'
import {
  getAnalyticsSessionId,
  getUtmParams,
  trackConversion,
  trackLead,
  trackLeadFormStart,
  trackLeadFormStep,
  trackWhatsAppClick,
} from '@/lib/analytics'
import { landingPublicEnv } from '@/lib/public-env'

const WA_LINK = 'https://wa.link/e2g7ii'
const API_BASE_URL = landingPublicEnv.apiBaseUrl

const step1Schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(80),
  email: z.string().email('Informe um e-mail válido').max(120),
  phone: z.string().min(10, 'Telefone inválido').max(20).regex(/^[\d\s()+-]+$/, 'Formato inválido'),
})

const step2Schema = z.object({
  service: z.enum(['sobrancelhas', 'labios_eyeliner', 'capilar', 'tatuagens', 'nao_sei'], {
    required_error: 'Selecione um serviço',
  }),
})

const step3Schema = z.object({
  period: z.enum(['manha', 'tarde', 'qualquer'], {
    required_error: 'Selecione um período',
  }),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>
type SocialProofSummary = {
  enabled: boolean
  clientsRegistered: number
  publicReviews: number
  averageRating: number | null
}

const SERVICE_OPTIONS = [
  { value: 'sobrancelhas', label: 'Sobrancelhas micropigmentadas', emoji: 'S' },
  { value: 'labios_eyeliner', label: 'Lábios / Eyeliner', emoji: 'L' },
  { value: 'capilar', label: 'Micropigmentação capilar', emoji: 'C' },
  { value: 'tatuagens', label: 'Tatuagens', emoji: 'T' },
  { value: 'nao_sei', label: 'Não sei ao certo', emoji: '?' },
] as const

const PERIOD_OPTIONS = [
  { value: 'manha', label: 'Manhã', sub: '9h às 12h' },
  { value: 'tarde', label: 'Tarde', sub: '13h às 18h' },
  { value: 'qualquer', label: 'Qualquer horário', sub: 'Sem preferência' },
] as const

function mapUtmSourceToLeadSource(utmSource?: string) {
  const normalized = utmSource?.toLowerCase().trim()

  switch (normalized) {
    case 'instagram':
      return 'instagram'
    case 'facebook':
      return 'facebook'
    case 'google':
    case 'google_ads':
    case 'gads':
      return 'google_ads'
    case 'whatsapp':
      return 'whatsapp'
    default:
      return 'organic'
  }
}

function ProgressBar({ step }: { step: number }) {
  const percent = (step / 3) * 100

  return (
    <div className="mb-8" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
      <div className="mb-2 flex justify-between text-xs text-charcoal/50">
        <span>Passo {step} de 3</span>
        <span>{Math.round(percent)}% concluído</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-blush">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-rose-gold to-[#B5785A]"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function Step1({ onNext }: { onNext: (data: Step1Data) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  })

  useEffect(() => {
    trackLeadFormStart(1)
  }, [])

  const fields = [
    { id: 'name', label: 'Seu nome completo', type: 'text', autoComplete: 'name', icon: User, placeholder: 'Maria Silva' },
    { id: 'email', label: 'Seu melhor e-mail', type: 'email', autoComplete: 'email', icon: Mail, placeholder: 'maria@email.com' },
    { id: 'phone', label: 'WhatsApp / Celular', type: 'tel', autoComplete: 'tel', icon: Phone, placeholder: '(11) 99999-9999' },
  ] as const

  return (
    <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
      <div className="mb-2 flex items-center gap-3">
        <div className="step-circle h-10 w-10 border-rose-gold bg-rose-gold text-base text-white">
          <User size={18} />
        </div>
        <h3 className="font-heading text-xl font-bold text-charcoal">Vamos nos conhecer?</h3>
      </div>
      <p className="mb-6 pl-[3.25rem] text-sm text-charcoal/60">
        Preencha seus dados para eu entrar em contato e organizar sua avaliação gratuita.
      </p>

      <form onSubmit={handleSubmit((data) => {
        trackLeadFormStep(1, 'dados_pessoais')
        onNext(data)
      })} className="space-y-4" noValidate>
        {fields.map((field) => {
          const Icon = field.icon
          const error = errors[field.id]
          return (
            <div key={field.id}>
              <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-charcoal">
                {field.label} <span className="text-rose-gold">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/35">
                  <Icon size={16} />
                </span>
                <input
                  id={field.id}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  className={`h-12 w-full rounded-md pl-11 pr-4 text-charcoal placeholder:text-charcoal/40 transition-all ${
                    error ? 'ring-2 ring-red-400' : 'focus-visible:ring-2 focus-visible:ring-rose-gold'
                  }`}
                  style={{ background: 'var(--bg-input)', boxShadow: 'var(--shadow-inset)', outline: 'none' }}
                  {...register(field.id)}
                />
              </div>
              {error ? <p className="mt-1.5 text-xs text-red-500">{error.message}</p> : null}
            </div>
          )
        })}

        <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full">
          Continuar
          <ChevronRight size={18} />
        </button>
      </form>
    </motion.div>
  )
}

function Step2({ onNext, onBack }: { onNext: (data: Step2Data) => void; onBack: () => void }) {
  const { watch, setValue, handleSubmit, formState: { errors } } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  })
  const selected = watch('service')

  useEffect(() => {
    trackLeadFormStep(2, 'servico')
  }, [])

  return (
    <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
      <div className="mb-2 flex items-center gap-3">
        <div className="step-circle h-10 w-10 border-rose-gold bg-rose-gold text-base text-white">
          <span className="text-sm font-bold">2</span>
        </div>
        <h3 className="font-heading text-xl font-bold text-charcoal">Qual região deseja tratar?</h3>
      </div>
      <p className="mb-6 pl-[3.25rem] text-sm text-charcoal/60">Selecione a opção que melhor descreve seu caso.</p>

      <form onSubmit={handleSubmit((data) => {
        trackLeadFormStep(2, data.service)
        onNext(data)
      })} noValidate>
        <div className="mb-6 space-y-2">
          {SERVICE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('service', option.value, { shouldValidate: true })}
              className="flex w-full items-center gap-3 rounded-md px-4 py-3.5 text-left transition-all"
              style={{
                background: selected === option.value ? 'rgba(201,150,122,0.06)' : 'var(--bg-input)',
                boxShadow: selected === option.value
                  ? 'var(--shadow-inset), 0 0 0 2px var(--accent)'
                  : 'var(--shadow-inset)',
                color: selected === option.value ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded bg-cream text-sm font-semibold text-rose-gold">
                {option.emoji}
              </span>
              <span className="text-sm font-medium">{option.label}</span>
              {selected === option.value ? <CheckCircle className="ml-auto text-rose-gold" size={18} /> : null}
            </button>
          ))}
        </div>

        {errors.service ? <p className="mb-4 text-xs text-red-500">{errors.service.message}</p> : null}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="btn-ghost flex-shrink-0 px-4">
            <ArrowLeft size={18} />
          </button>
          <button type="submit" className="btn-primary flex-1">
            Continuar
            <ChevronRight size={18} />
          </button>
        </div>
      </form>
    </motion.div>
  )
}

function Step3({
  onSubmit,
  onBack,
  isLoading,
}: {
  onSubmit: (data: Step3Data) => void
  onBack: () => void
  isLoading: boolean
}) {
  const { watch, setValue, handleSubmit, formState: { errors } } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
  })
  const selected = watch('period')

  useEffect(() => {
    trackLeadFormStep(3, 'horario')
  }, [])

  return (
    <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
      <div className="mb-2 flex items-center gap-3">
        <div className="step-circle h-10 w-10 border-rose-gold bg-rose-gold text-base text-white">
          <Clock size={18} />
        </div>
        <h3 className="font-heading text-xl font-bold text-charcoal">Qual é o melhor horário?</h3>
      </div>
      <p className="mb-6 pl-[3.25rem] text-sm text-charcoal/60">
        Vou entrar em contato para confirmar um horário que funcione para você.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('period', option.value, { shouldValidate: true })}
              className="flex flex-col items-center gap-1 rounded-md px-2 py-4 text-center transition-all"
              style={{
                background: selected === option.value ? 'rgba(201,150,122,0.06)' : 'var(--bg-input)',
                boxShadow: selected === option.value
                  ? 'var(--shadow-inset), 0 0 0 2px var(--accent)'
                  : 'var(--shadow-inset)',
                color: selected === option.value ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-xs text-charcoal/50">{option.sub}</span>
            </button>
          ))}
        </div>

        {errors.period ? <p className="mb-4 text-xs text-red-500">{errors.period.message}</p> : null}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} disabled={isLoading} className="btn-ghost flex-shrink-0 px-4">
            <ArrowLeft size={18} />
          </button>
          <button type="submit" disabled={isLoading} className="btn-primary flex-1">
            {isLoading ? 'Enviando...' : 'Solicitar Avaliação Gratuita'}
            {!isLoading ? <CheckCircle size={18} /> : null}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

function SuccessScreen({ name }: { name: string }) {
  const firstName = name.split(' ')[0]

  function handleWhatsApp() {
    trackWhatsAppClick('lead_form_success')
    window.open(WA_LINK, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="py-4 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded bg-sage/15">
        <CheckCircle className="text-sage" size={40} />
      </div>
      <h3 className="mb-3 font-heading text-2xl font-bold text-charcoal">Recebido, {firstName}!</h3>
      <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-charcoal/65">
        Vou analisar seu caso e entrar em contato em até <strong className="text-charcoal">24 horas</strong>.
      </p>
      <button onClick={handleWhatsApp} className="btn-primary mx-auto" aria-label="Falar pelo WhatsApp">
        Falar no WhatsApp agora
      </button>
    </motion.div>
  )
}

export function LeadFormSection({ socialProof }: { socialProof?: SocialProofSummary | null }) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data>>({})
  const sectionRef = useRef<HTMLElement>(null)
  const proofEnabled = socialProof?.enabled !== false
  const clientsRegistered = socialProof?.clientsRegistered ?? 0
  const publicReviews = socialProof?.publicReviews ?? 0
  const averageRating = socialProof?.averageRating ?? 5

  const handleStep1 = useCallback((data: Step1Data) => {
    setFormData((previous) => ({ ...previous, ...data }))
    setStep(2)
  }, [])

  const handleStep2 = useCallback((data: Step2Data) => {
    setFormData((previous) => ({ ...previous, ...data }))
    setStep(3)
  }, [])

  const handleStep3 = useCallback(async (data: Step3Data) => {
    const finalData = { ...formData, ...data }
    const utm = getUtmParams()

    setIsLoading(true)
    try {
      trackLead({
        name: finalData.name ?? '',
        email: finalData.email ?? '',
        phone: finalData.phone ?? '',
        service: finalData.service,
        period: finalData.period,
        source: 'landing_form',
      })

      await fetch(`${API_BASE_URL}/api/v1/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalData.name,
          email: finalData.email,
          phone: finalData.phone,
          source: mapUtmSourceToLeadSource(utm.utm_source),
          utmSource: utm.utm_source ?? 'landing_form',
          utmMedium: utm.utm_medium,
          utmCampaign: utm.utm_campaign,
          capturePage: typeof window !== 'undefined' ? window.location.pathname : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
          sessionId: getAnalyticsSessionId() ?? undefined,
          notes: `Serviço: ${finalData.service ?? 'nao_informado'} | Período: ${finalData.period ?? 'nao_informado'}`,
          website: '',
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload?.error ?? 'Não foi possível enviar seus dados.')
        }
      })

      trackConversion()
      setIsSuccess(true)
    } catch {
      window.open(WA_LINK, '_blank', 'noopener,noreferrer')
    } finally {
      setIsLoading(false)
    }
  }, [formData])

  return (
    <section id="contato" ref={sectionRef} className="section bg-cream" aria-labelledby="contact-heading">
      <div className="container-main">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
            <span className="section-label">
              <span className="h-px w-6 bg-rose-gold" aria-hidden="true" />
              Avaliação Gratuita
            </span>
            <h2 id="contact-heading" className="heading-lg mb-6 text-balance text-charcoal">
              De o primeiro passo para <span className="text-rose-gold">renovar sua pele</span>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-charcoal/65">
              A avaliação é gratuita, sem compromisso, e pode ser feita presencialmente em Santo André ou por videochamada.
            </p>

            <ul className="mb-8 space-y-4">
              {[
                'Diagnóstico do seu pigmento e fototipo de pele',
                'Estimativa de sessões e investimento necessário',
                'Protocolo personalizado para o seu caso',
                'Possibilidade de seguir pelo WhatsApp após a avaliação',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 flex-shrink-0 text-rose-gold" size={18} />
                  <span className="text-sm text-charcoal/75">{item}</span>
                </li>
              ))}
            </ul>

            {proofEnabled ? (
              <div className="rounded-md p-4" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2" aria-hidden="true">
                    {['VS', 'LG', 'GL'].map((initials) => (
                      <div key={initials} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-rose-gold text-xs font-bold text-white">
                        {initials}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-yellow-400" aria-label={`${averageRating} estrelas`}>
                      {'*'.repeat(Math.max(1, Math.round(averageRating)))}
                    </div>
                    <p className="mt-0.5 text-xs text-charcoal/60">
                      Prova social configurada no painel
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-cream px-3 py-3">
                    <p className="text-lg font-bold text-charcoal">{clientsRegistered}</p>
                    <p className="mt-1 text-xs text-charcoal/60">Clientes registrados</p>
                  </div>
                  <div className="rounded-lg bg-cream px-3 py-3">
                    <p className="text-lg font-bold text-charcoal">{publicReviews}</p>
                    <p className="mt-1 text-xs text-charcoal/60">Avaliações públicas</p>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div className="card p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-charcoal">
                  {isSuccess ? 'Solicitação enviada!' : 'Solicitar Avaliação Gratuita'}
                </h3>
                {!isSuccess ? (
                  <span className="badge border border-rose-gold/20 bg-rose-gold/10 text-xs text-rose-gold">
                    Gratuita
                  </span>
                ) : null}
              </div>

              {!isSuccess ? <ProgressBar step={step} /> : null}

              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <SuccessScreen key="success" name={formData.name ?? 'você'} />
                ) : step === 1 ? (
                  <Step1 key="step1" onNext={handleStep1} />
                ) : step === 2 ? (
                  <Step2 key="step2" onNext={handleStep2} onBack={() => setStep(1)} />
                ) : (
                  <Step3 key="step3" onSubmit={handleStep3} onBack={() => setStep(2)} isLoading={isLoading} />
                )}
              </AnimatePresence>

              {!isSuccess ? (
                <p className="mt-6 text-center text-xs text-charcoal/40">
                  Seus dados são confidenciais e usados apenas para contato.
                </p>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
