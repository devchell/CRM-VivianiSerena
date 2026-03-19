'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { crmPublicEnv } from '@/lib/public-env'

const RAW_API_URL = crmPublicEnv.apiBaseUrl
const API_URL = RAW_API_URL.endsWith('/api/v1')
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/+$/, '')}/api/v1`

type Step = 'credentials' | 'email-otp' | 'sms-otp'
type TwoFactorChannel = 'email' | 'sms'

interface TwoFactorState {
  twoFactorToken: string
  requiredChannels: TwoFactorChannel[]
  maskedEmail?: string
  maskedPhone?: string
}

interface TwoFactorResponseData {
  requiresTwoFactor?: boolean
  twoFactorToken?: string
  requiredChannels?: TwoFactorChannel[]
  nextStep?: TwoFactorChannel
  maskedEmail?: string
  maskedPhone?: string
  sessionToken?: string
}

const inputClass = 'w-full px-4 py-3 text-sm rounded-xl border border-blush-300 bg-white text-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-rose-gold/30 focus:border-rose-gold/40 transition-colors'
const otpInputClass = 'w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-blush-300 bg-white text-charcoal placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-rose-gold/30 focus:border-rose-gold/40 transition-colors'

function getStepForChannel(channel: TwoFactorChannel): Step {
  return channel === 'email' ? 'email-otp' : 'sms-otp'
}

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('credentials')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFa, setTwoFa] = useState<TwoFactorState | null>(null)
  const [emailCode, setEmailCode] = useState('')
  const [smsCode, setSmsCode] = useState('')

  useEffect(() => {
    ['/dashboard', '/leads', '/agenda', '/financeiro', '/editar-site', '/seguranca', '/colaboradores'].forEach((route) => {
      router.prefetch(route)
    })
  }, [router])

  const stepSequence = useMemo(() => {
    if (!twoFa) {
      return ['credentials'] as Step[]
    }

    return [
      'credentials',
      ...twoFa.requiredChannels.map((channel) => getStepForChannel(channel)),
    ]
  }, [twoFa])

  const completeSignIn = async (sessionToken?: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      ...(sessionToken ? { twoFactorSessionToken: sessionToken } : {}),
      redirect: false,
    })

    if (result?.error) {
      throw new Error('Erro ao criar sessao. Tente novamente.')
    }

    const session = await getSession()
    const mustChangePassword = Boolean(session?.user?.mustChangePassword)

    router.replace(mustChangePassword ? '/definir-senha' : '/dashboard')
  }

  const applyTwoFactorResult = async (data: TwoFactorResponseData) => {
    if (data.sessionToken) {
      await completeSignIn(data.sessionToken)
      return
    }

    if (!data.nextStep) {
      throw new Error('Resposta invalida do 2FA.')
    }

    setTwoFa((current) => current ? {
      ...current,
      ...(data.maskedEmail ? { maskedEmail: data.maskedEmail } : {}),
      ...(data.maskedPhone ? { maskedPhone: data.maskedPhone } : {}),
    } : current)
    setStep(getStepForChannel(data.nextStep))
  }

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email || password.length < 8) {
      setError('Preencha o e-mail e a senha (min. 8 caracteres)')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json() as {
        success: boolean
        data?: TwoFactorResponseData
        message?: string
      }

      if (!res.ok || !data.success) {
        setError(data.message ?? 'Credenciais invalidas.')
        return
      }

      if (data.data?.requiresTwoFactor && data.data.twoFactorToken && data.data.nextStep && data.data.requiredChannels) {
        setTwoFa({
          twoFactorToken: data.data.twoFactorToken,
          requiredChannels: data.data.requiredChannels,
          maskedEmail: data.data.maskedEmail,
          maskedPhone: data.data.maskedPhone,
        })
        setEmailCode('')
        setSmsCode('')
        setStep(getStepForChannel(data.data.nextStep))
        return
      }

      await completeSignIn()
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Erro de conexão. Verifique se a API está rodando.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailOtp = async (event: React.FormEvent) => {
    event.preventDefault()

    if (emailCode.length !== 6 || !twoFa) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/2fa/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorToken: twoFa.twoFactorToken, code: emailCode }),
      })
      const data = await res.json() as {
        success: boolean
        data?: TwoFactorResponseData
        message?: string
      }

      if (!res.ok || !data.success || !data.data) {
        setError(data.message ?? 'Código inválido ou expirado.')
        return
      }

      await applyTwoFactorResult(data.data)
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Erro de conexão.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSmsOtp = async (event: React.FormEvent) => {
    event.preventDefault()

    if (smsCode.length !== 6 || !twoFa) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/2fa/verify-sms-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorToken: twoFa.twoFactorToken, code: smsCode }),
      })
      const data = await res.json() as {
        success: boolean
        data?: TwoFactorResponseData
        message?: string
      }

      if (!res.ok || !data.success || !data.data) {
        setError(data.message ?? 'Código inválido ou expirado.')
        return
      }

      await applyTwoFactorResult(data.data)
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Erro de conexão.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetTwoFactorFlow = () => {
    setStep('credentials')
    setTwoFa(null)
    setEmailCode('')
    setSmsCode('')
    setError('')
  }

  const stepConfig = {
    credentials: {
      icon: Lock,
      title: 'Entrar no CRM',
      subtitle: 'Acesso restrito a administradores',
    },
    'email-otp': {
      icon: Mail,
      title: 'Verificação por E-mail',
      subtitle: `Código enviado para ${twoFa?.maskedEmail ?? ''}`,
    },
    'sms-otp': {
      icon: Smartphone,
      title: 'Verificação por Celular',
      subtitle: `Código enviado para ${twoFa?.maskedPhone ?? 'seu celular'}`,
    },
  } satisfies Record<Step, { icon: typeof Lock; title: string; subtitle: string }>

  const current = stepConfig[step]
  const CurrentIcon = current.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4 relative overflow-hidden">
      <div className="absolute top-16 -left-24 w-64 h-64 bg-rose-gold/15 rounded-full blur-3xl" />
      <div className="absolute bottom-10 -right-20 w-72 h-72 bg-rose-gold/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm border border-rose-gold/20 mb-4">
            <Sparkles size={24} className="text-rose-gold" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-charcoal">
            Viviani <span className="text-rose-gold-600">Serena</span>
          </h1>
          <p className="text-charcoal-500 text-sm mt-1">Sistema de Gestão</p>
        </div>

        {step !== 'credentials' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {stepSequence.map((sequenceStep, index) => {
              const currentIndex = stepSequence.indexOf(step)
              const isCurrent = sequenceStep === step
              const isDone = index < currentIndex

              return (
                <div
                  key={`${sequenceStep}-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? 'w-8 bg-rose-gold'
                      : isDone
                        ? 'w-4 bg-rose-gold/60'
                        : 'w-4 bg-charcoal-600'
                  }`}
                />
              )
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-blush-200 rounded-2xl shadow-xl p-8"
          >
            <div className="mb-6">
              <div className="w-10 h-10 bg-rose-gold/10 rounded-xl flex items-center justify-center mb-4">
                <CurrentIcon size={18} className="text-rose-gold" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-charcoal">{current.title}</h2>
              <p className="text-charcoal-500 text-sm mt-1">{current.subtitle}</p>
            </div>

            {step === 'credentials' && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@vivianiserena.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="........"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((currentState) => !currentState)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-500 hover:text-charcoal-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-gold text-white font-medium text-sm hover:bg-rose-gold/90 disabled:opacity-60 transition-colors mt-2"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {isLoading ? 'Verificando...' : 'Entrar'}
                </button>
              </form>
            )}

            {step === 'email-otp' && (
              <form onSubmit={handleEmailOtp} className="space-y-4">
                <p className="text-xs text-charcoal-400">Digite o código de 6 dígitos enviado para o e-mail acima.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={otpInputClass}
                  autoFocus
                />
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={emailCode.length !== 6 || isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-gold text-white font-medium text-sm hover:bg-rose-gold/90 disabled:opacity-60 transition-colors"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {isLoading ? 'Verificando...' : 'Confirmar Código'}
                </button>
                <button
                  type="button"
                  onClick={resetTwoFactorFlow}
                  className="w-full flex items-center justify-center gap-2 py-2 text-charcoal-400 text-sm hover:text-charcoal-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              </form>
            )}

            {step === 'sms-otp' && (
              <form onSubmit={handleSmsOtp} className="space-y-4">
                <p className="text-xs text-charcoal-400">Digite o código de 6 dígitos enviado para o celular acima.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={smsCode}
                  onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={otpInputClass}
                  autoFocus
                />
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={smsCode.length !== 6 || isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-gold text-white font-medium text-sm hover:bg-rose-gold/90 disabled:opacity-60 transition-colors"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
                  {isLoading ? 'Verificando...' : 'Confirmar Código'}
                </button>
                <button
                  type="button"
                  onClick={resetTwoFactorFlow}
                  className="w-full flex items-center justify-center gap-2 py-2 text-charcoal-400 text-sm hover:text-charcoal-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-charcoal-600 mt-6">
          Viviani Serena CRM (c) {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
      <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-500">{message}</p>
    </div>
  )
}
