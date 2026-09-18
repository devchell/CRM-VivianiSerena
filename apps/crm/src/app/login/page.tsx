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
  Circle,
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

const inputClass =
  'input-base w-full px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors'
const otpInputClass =
  'input-base w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors'

function getStepForChannel(channel: TwoFactorChannel): Step {
  return channel === 'email' ? 'email-otp' : 'sms-otp'
}

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('credentials')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [twoFa, setTwoFa] = useState<TwoFactorState | null>(null)
  const [emailCode, setEmailCode] = useState('')
  const [smsCode, setSmsCode] = useState('')

  useEffect(() => {
    ;[
      '/dashboard',
      '/leads',
      '/leads/disparos',
      '/agenda',
      '/financeiro',
      '/editar-site',
      '/seguranca',
      '/colaboradores',
    ].forEach(route => {
      router.prefetch(route)
    })
    fetch(`${RAW_API_URL}/health/ready`, { method: 'GET', cache: 'no-store' }).catch(
      (error: unknown) => {
        console.warn('API readiness check failed', error)
      }
    )
  }, [router])

  const stepSequence = useMemo(() => {
    if (!twoFa) {
      return ['credentials'] as Step[]
    }

    return ['credentials', ...twoFa.requiredChannels.map(channel => getStepForChannel(channel))]
  }, [twoFa])

  const completeSignIn = async (sessionToken?: string) => {
    const result = await signIn('credentials', {
      identifier,
      password,
      ...(sessionToken ? { twoFactorSessionToken: sessionToken } : {}),
      redirect: false,
    })

    if (result?.error) {
      throw new Error('Erro ao criar sessão. Tente novamente.')
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
      throw new Error('Resposta inválida do 2FA.')
    }

    setTwoFa(current =>
      current
        ? {
            ...current,
            ...(data.maskedEmail ? { maskedEmail: data.maskedEmail } : {}),
            ...(data.maskedPhone ? { maskedPhone: data.maskedPhone } : {}),
          }
        : current
    )
    setStep(getStepForChannel(data.nextStep))
  }

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!identifier.trim() || password.length < 8) {
      setError('Preencha o usuário ou e-mail e a senha (min. 8 caracteres)')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = (await res.json()) as {
        success: boolean
        data?: TwoFactorResponseData
        message?: string
        error?: string
      }

      if (!res.ok || !data.success) {
        setError(data.message ?? data.error ?? (res.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' : 'Credenciais inválidas.'))
        return
      }

      if (
        data.data?.requiresTwoFactor &&
        data.data.twoFactorToken &&
        data.data.nextStep &&
        data.data.requiredChannels
      ) {
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
      setError(
        responseError instanceof Error
          ? responseError.message
          : 'Erro de conexão. Verifique se a API está rodando.'
      )
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
      const data = (await res.json()) as {
        success: boolean
        data?: TwoFactorResponseData
        message?: string
        error?: string
      }

      if (!res.ok || !data.success || !data.data) {
        setError(data.message ?? data.error ?? 'Código inválido ou expirado.')
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
      const data = (await res.json()) as {
        success: boolean
        data?: TwoFactorResponseData
        message?: string
        error?: string
      }

      if (!res.ok || !data.success || !data.data) {
        setError(data.message ?? data.error ?? 'Código inválido ou expirado.')
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
    <main className="crm-auth-shell flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="crm-auth-mark mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl">
            <Circle size={24} strokeWidth={2.5} />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
            Viviani <span className="text-[var(--accent-rose)]">Serena</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Sistema de Gestão
          </p>
        </div>

        {step !== 'credentials' && (
          <div className="mb-6 flex items-center justify-center gap-2">
            {stepSequence.map((sequenceStep, index) => {
              const currentIndex = stepSequence.indexOf(step)
              const isCurrent = sequenceStep === step
              const isDone = index < currentIndex

              return (
                <div
                  key={`${sequenceStep}-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                        ? 'w-8 bg-[var(--primary)]'
                      : isDone
                        ? 'w-4 bg-[var(--primary)]'
                        : 'w-4 bg-[var(--border-medium)]'
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
            className="crm-auth-card rounded-xl p-8"
          >
            <div className="mb-6">
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent-subtle)]"
              >
                <CurrentIcon size={18} className="text-[var(--accent-rose)]" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
                {current.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {current.subtitle}
              </p>
            </div>

            {step === 'credentials' && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                    Usuário ou e-mail
                  </label>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    value={identifier}
                    onChange={event => setIdentifier(event.target.value)}
                    placeholder="Usuário"
                    autoComplete="username"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="Senha"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(currentState => !currentState)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-500"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {isLoading ? 'Verificando...' : 'Entrar'}
                </button>
              </form>
            )}

            {step === 'email-otp' && (
              <form onSubmit={handleEmailOtp} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Digite o código de 6 dígitos enviado para o e-mail acima.
                </p>
                <input
                  id="email-code"
                  aria-label="Código de verificação por e-mail"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailCode}
                  onChange={event =>
                    setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  className={otpInputClass}
                  autoFocus
                />
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={emailCode.length !== 6 || isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {isLoading ? 'Verificando...' : 'Confirmar Código'}
                </button>
                <button
                  type="button"
                  onClick={resetTwoFactorFlow}
                  className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              </form>
            )}

            {step === 'sms-otp' && (
              <form onSubmit={handleSmsOtp} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Digite o código de 6 dígitos enviado para o celular acima.
                </p>
                <input
                  id="sms-code"
                  aria-label="Código de verificação por celular"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={smsCode}
                  onChange={event => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={otpInputClass}
                  autoFocus
                />
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={smsCode.length !== 6 || isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Smartphone size={16} />
                  )}
                  {isLoading ? 'Verificando...' : 'Confirmar Código'}
                </button>
                <button
                  type="button"
                  onClick={resetTwoFactorFlow}
                  className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          Viviani Serena CRM (c) {new Date().getFullYear()}
        </p>
      </motion.div>
    </main>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
      <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
      <p className="text-sm text-red-500">{message}</p>
    </div>
  )
}
