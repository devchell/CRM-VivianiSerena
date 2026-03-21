'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Palette,
  Save,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  User,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { crmPublicEnv } from '@/lib/public-env'

const API_URL = `${crmPublicEnv.apiBaseUrl}/api/v1`

interface SettingsUserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  twoFactorEnabled: boolean
  twoFactorEmailEnabled: boolean
  twoFactorSmsEnabled: boolean
}

type TwoFactorDraft = {
  enabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
}

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40'
const labelClass = 'block text-xs font-medium text-charcoal-400 dark:text-charcoal-400 mb-1'

function toTwoFactorDraft(profile: Pick<SettingsUserProfile, 'twoFactorEnabled' | 'twoFactorEmailEnabled' | 'twoFactorSmsEnabled'>): TwoFactorDraft {
  return {
    enabled: profile.twoFactorEnabled,
    emailEnabled: profile.twoFactorEmailEnabled,
    smsEnabled: profile.twoFactorSmsEnabled,
  }
}

export default function ConfiguracoesPage() {
  const { accessToken, status, updateSession } = useAuth()
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'theme'>('profile')
  const [profile, setProfile] = useState<SettingsUserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [savingPassword, setSavingPassword] = useState(false)

  const [twoFaDraft, setTwoFaDraft] = useState<TwoFactorDraft>({
    enabled: false,
    emailEnabled: false,
    smsEnabled: false,
  })
  const [savingTwoFa, setSavingTwoFa] = useState(false)
  const [twoFaPasswordModal, setTwoFaPasswordModal] = useState(false)
  const [twoFaPassword, setTwoFaPassword] = useState('')

  const headers = useMemo(() => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }), [accessToken])

  useEffect(() => {
    if (status === 'loading') return
    if (!accessToken) {
      setLoadingProfile(false)
      return
    }

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        const data = await response.json() as { success: boolean; data: SettingsUserProfile; message?: string }
        if (!response.ok || !data.success) {
          throw new Error(data.message ?? 'Erro ao carregar perfil')
        }

        setProfile(data.data)
        setProfileForm({
          name: data.data.name ?? '',
          email: data.data.email,
          phone: data.data.phone ?? '',
        })
        setTwoFaDraft(toTwoFactorDraft(data.data))
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar perfil')
      })
      .finally(() => setLoadingProfile(false))
  }, [accessToken, status])

  const hasTwoFaChanges = profile
    ? (
        profile.twoFactorEnabled !== twoFaDraft.enabled
        || profile.twoFactorEmailEnabled !== twoFaDraft.emailEnabled
        || profile.twoFactorSmsEnabled !== twoFaDraft.smsEnabled
      )
    : false

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const body: Record<string, string> = {}
      if (profileForm.name) body.name = profileForm.name
      if (profileForm.phone) body.phone = profileForm.phone

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json() as { success: boolean; data?: SettingsUserProfile; message?: string }

      if (!res.ok || !data.success) {
        throw new Error(data.message ?? 'Erro ao salvar')
      }

      setProfile((current) => current ? { ...current, ...data.data } : current)

      if (data.data?.name) {
        await updateSession({ user: { name: data.data.name } })
      }

      toast.success('Perfil atualizado com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('A nova senha e a confirmação não coincidem')
      return
    }

    if (passwordForm.new.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres')
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch(`${API_URL}/auth/password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      })
      const data = await res.json() as { success: boolean; message?: string }

      if (!res.ok || !data.success) {
        throw new Error(data.message ?? 'Erro ao alterar senha')
      }

      toast.success('Senha alterada com sucesso')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha')
    } finally {
      setSavingPassword(false)
    }
  }

  const toggleTwoFaEnabled = (enable: boolean) => {
    setTwoFaDraft((current) => {
      if (!enable) {
        return {
          enabled: false,
          emailEnabled: false,
          smsEnabled: false,
        }
      }

      const nextEmailEnabled = current.emailEnabled
      const nextSmsEnabled = current.smsEnabled || (!current.emailEnabled && !current.smsEnabled)

      if (nextSmsEnabled && !profileForm.phone.trim()) {
        toast.error('Cadastre um telefone antes de ativar o 2FA por celular')
        return current
      }

      return {
        enabled: true,
        emailEnabled: nextEmailEnabled,
        smsEnabled: nextSmsEnabled,
      }
    })
  }

  const toggleTwoFaChannel = (channel: 'email' | 'sms') => {
    setTwoFaDraft((current) => {
      if (channel === 'sms' && !profileForm.phone.trim()) {
        toast.error('Cadastre um telefone antes de usar 2FA por celular')
        return current
      }

      const next = {
        enabled: true,
        emailEnabled: channel === 'email' ? !current.emailEnabled : current.emailEnabled,
        smsEnabled: channel === 'sms' ? !current.smsEnabled : current.smsEnabled,
      }

      if (!next.emailEnabled && !next.smsEnabled) {
        return {
          enabled: false,
          emailEnabled: false,
          smsEnabled: false,
        }
      }

      return next
    })
  }

  const handleSaveTwoFa = async () => {
    if (!twoFaPassword) {
      toast.error('Digite sua senha para confirmar')
      return
    }

    setSavingTwoFa(true)
    try {
      const res = await fetch(`${API_URL}/auth/2fa/preferences`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          enabled: twoFaDraft.enabled,
          emailEnabled: twoFaDraft.emailEnabled,
          smsEnabled: twoFaDraft.smsEnabled,
          password: twoFaPassword,
        }),
      })
      const data = await res.json() as {
        success: boolean
        message?: string
        data?: Pick<SettingsUserProfile, 'twoFactorEnabled' | 'twoFactorEmailEnabled' | 'twoFactorSmsEnabled'>
      }

      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.message ?? 'Erro ao salvar o 2FA')
      }

      const updatedTwoFa = data.data
      setProfile((current) => current ? {
        ...current,
        twoFactorEnabled: updatedTwoFa.twoFactorEnabled,
        twoFactorEmailEnabled: updatedTwoFa.twoFactorEmailEnabled,
        twoFactorSmsEnabled: updatedTwoFa.twoFactorSmsEnabled,
      } : current)
      setTwoFaDraft({
        enabled: updatedTwoFa.twoFactorEnabled,
        emailEnabled: updatedTwoFa.twoFactorEmailEnabled,
        smsEnabled: updatedTwoFa.twoFactorSmsEnabled,
      })
      setTwoFaPassword('')
      setTwoFaPasswordModal(false)
      toast.success(data.message ?? '2FA atualizado com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar o 2FA')
    } finally {
      setSavingTwoFa(false)
    }
  }

  const tabs = [
    { key: 'profile', label: 'Perfil', icon: User },
    { key: 'security', label: 'Segurança', icon: Lock },
    { key: 'theme', label: 'Aparência', icon: Palette },
  ] as const

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-rose-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">Configurações</h1>
        <p className="text-charcoal-400 dark:text-charcoal-400 mt-1 text-sm">Gerencie sua conta e preferências</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-48 flex-shrink-0">
          <nav className="card-dark p-2 shadow-sm space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-rose-gold/10 text-rose-gold'
                      : 'text-charcoal-400 dark:text-charcoal-400 hover:bg-blush dark:hover:bg-charcoal-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex-1 card-dark shadow-sm">
          {activeTab === 'profile' && (
            <div className="p-6 space-y-5">
              <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">
                Informações do Perfil
              </h2>

              <div>
                <label className={labelClass}>Nome</label>
                <input
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Seu nome completo"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  value={profileForm.email}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-700 bg-blush/30 dark:bg-charcoal-800 text-charcoal-400 dark:text-charcoal-500 cursor-not-allowed"
                />
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-1">
                  Alterar o e-mail afeta o acesso ao sistema.
                </p>
              </div>

              <div>
                <label className={labelClass}>Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                />
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-1">
                  Necessário para usar o 2FA por celular.
                </p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2 bg-rose-gold text-white rounded-lg text-sm font-medium hover:bg-rose-gold/90 transition-colors disabled:opacity-60"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar Perfil
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">
                  Alterar Senha
                </h2>

                {([
                  { label: 'Senha atual', key: 'current' },
                  { label: 'Nova senha', key: 'new' },
                  { label: 'Confirmar nova senha', key: 'confirm' },
                ] as const).map((field) => (
                  <div key={field.key}>
                    <label className={labelClass}>{field.label}</label>
                    <div className="relative">
                      <input
                        type={showPasswords[field.key] ? 'text' : 'password'}
                        value={passwordForm[field.key]}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder="........"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((current) => ({ ...current, [field.key]: !current[field.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 transition-colors"
                      >
                        {showPasswords[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
                  className="flex items-center gap-2 px-5 py-2 bg-rose-gold text-white rounded-lg text-sm font-medium hover:bg-rose-gold/90 transition-colors disabled:opacity-60"
                >
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Alterar Senha
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">
                  Autenticação de 2 Fatores
                </h2>

                <div className="rounded-md border border-blush-200 dark:border-charcoal-700 p-4 flex items-start gap-4">
                  <div className={`mt-0.5 p-2 rounded ${twoFaDraft.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-charcoal-100 dark:bg-charcoal-700'}`}>
                    {twoFaDraft.enabled
                      ? <ShieldCheck size={20} className="text-green-600 dark:text-green-400" />
                      : <ShieldOff size={20} className="text-charcoal-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal dark:text-charcoal-100">
                      {twoFaDraft.enabled ? '2FA ativo' : '2FA desativado'}
                    </p>
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5">
                      O 2FA sempre começa desligado. Ao ativar, o celular fica marcado por padrão e você pode manter celular, e-mail ou ambos.
                    </p>
                    {!profileForm.phone.trim() && (
                      <p className="text-xs text-amber-500 mt-1">
                        Cadastre um telefone se quiser usar o 2FA por celular.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleTwoFaEnabled(!twoFaDraft.enabled)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      twoFaDraft.enabled
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                        : 'bg-rose-gold/10 text-rose-gold hover:bg-rose-gold/20'
                    }`}
                  >
                    {twoFaDraft.enabled ? 'Desligar' : 'Ativar'}
                  </button>
                </div>

                {twoFaDraft.enabled && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => toggleTwoFaChannel('sms')}
                      className={`flex items-start gap-3 rounded-md border p-4 text-left transition-colors ${
                        twoFaDraft.smsEnabled
                          ? 'border-rose-gold bg-rose-gold/5'
                          : 'border-blush-300 dark:border-charcoal-600'
                      }`}
                    >
                      <Smartphone size={18} className={twoFaDraft.smsEnabled ? 'text-rose-gold' : 'text-charcoal-400'} />
                      <span>
                        <strong className="block text-sm text-charcoal dark:text-charcoal-100">Celular</strong>
                        <span className="text-xs text-charcoal-400 dark:text-charcoal-500">
                          Recebe o código por SMS. Padrão ao ativar.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleTwoFaChannel('email')}
                      className={`flex items-start gap-3 rounded-md border p-4 text-left transition-colors ${
                        twoFaDraft.emailEnabled
                          ? 'border-rose-gold bg-rose-gold/5'
                          : 'border-blush-300 dark:border-charcoal-600'
                      }`}
                    >
                      <Mail size={18} className={twoFaDraft.emailEnabled ? 'text-rose-gold' : 'text-charcoal-400'} />
                      <span>
                        <strong className="block text-sm text-charcoal dark:text-charcoal-100">E-mail</strong>
                        <span className="text-xs text-charcoal-400 dark:text-charcoal-500">
                          Recebe o código pelo e-mail cadastrado.
                        </span>
                      </span>
                    </button>
                  </div>
                )}

                <div className="rounded-md border border-blush-200 dark:border-charcoal-700 bg-blush/40 dark:bg-charcoal-800/60 p-4 text-sm text-charcoal-500 dark:text-charcoal-400">
                  Se celular e e-mail ficarem desligados, o 2FA será desativado automaticamente.
                </div>

                <button
                  onClick={() => {
                    if (!hasTwoFaChanges) return
                    setTwoFaPassword('')
                    setTwoFaPasswordModal(true)
                  }}
                  disabled={!hasTwoFaChanges}
                  className="flex items-center gap-2 px-5 py-2 bg-rose-gold text-white rounded-lg text-sm font-medium hover:bg-rose-gold/90 transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  Salvar configuração do 2FA
                </button>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="p-6 space-y-6">
              <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">
                Aparencia
              </h2>
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Escolha o tema da interface</p>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                {[
                  { value: 'light', label: 'Claro', desc: 'Interface clara com tons creme' },
                  { value: 'dark', label: 'Escuro', desc: 'Interface escura com acentos rose-gold' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setTheme(item.value)
                      toast.success(`Tema ${item.label} ativado`)
                    }}
                    className={`p-4 rounded-md border-2 text-left transition-all ${
                      theme === item.value
                        ? 'border-rose-gold bg-rose-gold/5'
                        : 'border-blush-300 dark:border-charcoal-600 hover:border-rose-gold/50'
                    }`}
                  >
                    <div className={`w-full h-16 rounded mb-3 ${item.value === 'dark' ? 'bg-charcoal-900' : 'bg-cream'} border ${item.value === 'dark' ? 'border-charcoal-700' : 'border-blush-300'}`}>
                      <div className={`h-4 rounded-t ${item.value === 'dark' ? 'bg-charcoal-800' : 'bg-white'}`} />
                    </div>
                    <p className="text-sm font-semibold text-charcoal dark:text-charcoal-100">{item.label}</p>
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {twoFaPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 mb-2">
              Confirmar configuração do 2FA
            </h3>
            <p className="text-sm text-charcoal-400 dark:text-charcoal-500 mb-4">
              Digite sua senha atual para aplicar a configuração escolhida.
            </p>
            <input
              type="password"
              value={twoFaPassword}
              onChange={(event) => setTwoFaPassword(event.target.value)}
              placeholder="Sua senha atual"
              className={`${inputClass} mb-4`}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSaveTwoFa()
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setTwoFaPasswordModal(false)
                  setTwoFaPassword('')
                }}
                className="flex-1 py-2 rounded-lg border border-blush-300 dark:border-charcoal-600 text-sm text-charcoal-400 hover:bg-blush dark:hover:bg-charcoal-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSaveTwoFa()}
                disabled={savingTwoFa || !twoFaPassword}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 bg-rose-gold text-white hover:bg-rose-gold/90"
              >
                {savingTwoFa ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
