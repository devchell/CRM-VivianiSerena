'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Sparkles, Loader2, CheckCircle } from 'lucide-react'
import { crmPublicEnv } from '@/lib/public-env'

const API_URL = crmPublicEnv.apiBaseUrl

export function DefinirSenhaClient() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [form, setForm] = useState({ new: '', confirm: '' })
  const [show, setShow] = useState({ new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const accessToken = session?.accessToken ?? ''
  const mustChangePassword = Boolean(session?.user?.mustChangePassword)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }

    if (status === 'authenticated' && !mustChangePassword && !done) {
      router.replace('/dashboard')
    }
  }, [done, mustChangePassword, router, status])

  const strength = (() => {
    const password = form.new
    if (!password) return 0

    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    return score
  })()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (form.new !== form.confirm) {
      toast.error('As senhas não coincidem')
      return
    }

    if (form.new.length < 8) {
      toast.error('Mínimo de 8 caracteres')
      return
    }

    if (!accessToken) {
      toast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/set-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: form.new }),
      })

      const payload = await response.json() as { success: boolean; message?: string }

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Erro ao definir senha')
      }

      setDone(true)
      toast.success('Senha criada. Faça login com a nova senha.')
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao definir senha')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream-200 dark:bg-[#111110] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-rose-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!done && (status !== 'authenticated' || !mustChangePassword)) {
    return (
      <div className="min-h-screen bg-cream-200 dark:bg-[#111110] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-rose-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-[#111110] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-rose-gold/10 border border-rose-gold/20 mb-4">
            <Sparkles size={24} className="text-rose-gold" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">
            Criar sua senha
          </h1>
          <p className="text-charcoal-400 dark:text-charcoal-500 text-sm mt-2">
            Você recebeu uma senha temporária por e-mail.
            <br />
            Crie uma nova senha para continuar.
          </p>
        </div>

        <div className="card-dark shadow-xl p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <p className="font-heading text-lg font-semibold text-charcoal dark:text-charcoal-50">
                Senha criada
              </p>
              <p className="text-sm text-charcoal-400 mt-1">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-charcoal-400 dark:text-charcoal-300 mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input
                    type={show.new ? 'text' : 'password'}
                    value={form.new}
                    onChange={(event) => setForm((current) => ({ ...current, new: event.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((current) => ({ ...current, new: !current.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400"
                  >
                    {show.new ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.new && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            index <= strength
                              ? strength <= 1
                                ? 'bg-red-400'
                                : strength === 2
                                  ? 'bg-yellow-400'
                                  : strength === 3
                                    ? 'bg-blue-400'
                                    : 'bg-green-400'
                              : 'bg-charcoal-200 dark:bg-charcoal-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-charcoal-400">
                      {['', 'Fraca', 'Razoável', 'Boa', 'Forte'][strength]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-400 dark:text-charcoal-300 mb-1.5">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}
                    placeholder="Repita a senha"
                    required
                    className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40 ${
                      form.confirm && form.new !== form.confirm
                        ? 'border-red-400'
                        : 'border-blush-300 dark:border-charcoal-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((current) => ({ ...current, confirm: !current.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400"
                  >
                    {show.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.confirm && form.new !== form.confirm && (
                  <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || !accessToken || form.new !== form.confirm || form.new.length < 8}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-gold text-white rounded-md text-sm font-semibold hover:bg-rose-gold/90 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Criar senha e entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
