'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
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

      const payload = (await response.json()) as { success: boolean; message?: string }

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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    )
  }

  if (!done && (status !== 'authenticated' || !mustChangePassword)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--accent-subtle)]">
            <img src="/brand/logo-icon.png?v=6" alt="" width={44} height={34} className="h-9 w-12 object-contain" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
            Criar sua senha
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Você recebeu uma senha temporária do administrador.
            <br />
            Crie uma nova senha para continuar.
          </p>
        </div>

        <div className="card-dark p-8 shadow-xl">
          {done ? (
            <div className="py-4 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-[var(--success)]" />
              <p className="font-heading text-lg font-semibold text-[var(--text-primary)]">
                Senha criada
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                  />
                  <input
                    type={show.new ? 'text' : 'password'}
                    value={form.new}
                    onChange={event =>
                      setForm(current => ({ ...current, new: event.target.value }))
                    }
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="input-base w-full py-2.5 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(current => ({ ...current, new: !current.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                  >
                    {show.new ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.new && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(index => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            index <= strength
                              ? strength <= 1
                                ? 'bg-[var(--danger)]'
                                : strength === 2
                                  ? 'bg-[var(--warning)]'
                                  : strength === 3
                                    ? 'bg-[var(--info)]'
                                    : 'bg-[var(--success)]'
                              : 'bg-[var(--border)]'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {['', 'Fraca', 'Razoável', 'Boa', 'Forte'][strength]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                  />
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={event =>
                      setForm(current => ({ ...current, confirm: event.target.value }))
                    }
                    placeholder="Repita a senha"
                    required
                    className={`input-base w-full py-2.5 pl-9 pr-10 ${
                      form.confirm && form.new !== form.confirm
                        ? 'border-[var(--danger)]'
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(current => ({ ...current, confirm: !current.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                  >
                    {show.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.confirm && form.new !== form.confirm && (
                  <p className="mt-1 text-xs text-[var(--danger)]">As senhas não coincidem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  saving || !accessToken || form.new !== form.confirm || form.new.length < 8
                }
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Criar senha e entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
