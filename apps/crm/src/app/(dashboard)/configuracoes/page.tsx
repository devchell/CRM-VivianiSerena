'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { toast } from 'sonner'
import { User, Lock, Palette, Save, Loader2, Eye, EyeOff, ShieldCheck, ShieldOff } from 'lucide-react'
import { useTheme } from 'next-themes'
import { crmPublicEnv } from '@/lib/public-env'

const API_URL = `${crmPublicEnv.apiBaseUrl}/api/v1`

interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  twoFactorEnabled: boolean
}

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40'
const labelClass = 'block text-xs font-medium text-charcoal-400 dark:text-charcoal-400 mb-1'

export default function ConfiguracoesPage() {
  const { accessToken, status, updateSession } = useAuth()
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'theme'>('profile')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Perfil
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  // Senha
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [savingPassword, setSavingPassword] = useState(false)

  // 2FA
  const [toggling2fa, setToggling2fa] = useState(false)
  const [twoFaPasswordModal, setTwoFaPasswordModal] = useState<{ open: boolean; action: boolean }>({ open: false, action: false })
  const [twoFaPassword, setTwoFaPassword] = useState('')

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  // ── Carregar perfil ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (!accessToken) { setLoadingProfile(false); return }
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then((data: { success: boolean; data: UserProfile }) => {
        if (data.success) {
          setProfile(data.data)
          setProfileForm({
            name: data.data.name ?? '',
            email: data.data.email,
            phone: data.data.phone ?? '',
          })
        }
      })
      .catch(() => toast.error('Erro ao carregar perfil'))
      .finally(() => setLoadingProfile(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, status])

  // ── Salvar perfil ────────────────────────────────────────────────────────
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
      const data = (await res.json()) as { success: boolean; data?: UserProfile; message?: string }
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Erro ao salvar')

      setProfile(prev => prev ? { ...prev, ...data.data } : null)

      // Sincroniza nome na session para atualizar sidebar
      if (data.data?.name) {
        await updateSession({ user: { name: data.data.name } })
      }

      toast.success('Perfil atualizado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Trocar senha ─────────────────────────────────────────────────────────
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
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new }),
      })
      const data = (await res.json()) as { success: boolean; message?: string }
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Erro ao alterar senha')
      toast.success('Senha alterada com sucesso!')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setSavingPassword(false)
    }
  }

  // ── Toggle 2FA ───────────────────────────────────────────────────────────
  const openTwoFaModal = (enable: boolean) => {
    setTwoFaPassword('')
    setTwoFaPasswordModal({ open: true, action: enable })
  }

  const handleToggle2fa = async () => {
    if (!twoFaPassword) { toast.error('Digite sua senha para confirmar'); return }
    setToggling2fa(true)
    try {
      const res = await fetch(`${API_URL}/auth/2fa/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ enable: twoFaPasswordModal.action, password: twoFaPassword }),
      })
      const data = (await res.json()) as { success: boolean; message?: string }
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Erro')
      setProfile(prev => prev ? { ...prev, twoFactorEnabled: twoFaPasswordModal.action } : null)
      toast.success(data.message ?? (twoFaPasswordModal.action ? '2FA ativado!' : '2FA desativado'))
      setTwoFaPasswordModal({ open: false, action: false })
      setTwoFaPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar 2FA')
    } finally {
      setToggling2fa(false)
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
        {/* Tabs nav */}
        <div className="lg:w-48 flex-shrink-0">
          <nav className="card-dark p-2 shadow-sm space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-rose-gold/10 text-rose-gold' : 'text-charcoal-400 dark:text-charcoal-400 hover:bg-blush dark:hover:bg-charcoal-700'}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card-dark shadow-sm">

          {/* ── ABA PERFIL ─────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="p-6 space-y-5">
              <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">
                Informações do Perfil
              </h2>

              <div>
                <label className={labelClass}>Nome</label>
                <input
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
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
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                />
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-1">
                  Usado para receber o código 2FA por SMS.
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

          {/* ── ABA SEGURANÇA ───────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="p-6 space-y-8">

              {/* Alterar senha */}
              <div className="space-y-4">
                <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">
                  Alterar Senha
                </h2>

                {([
                  { label: 'Senha atual', key: 'current' },
                  { label: 'Nova senha', key: 'new' },
                  { label: 'Confirmar nova senha', key: 'confirm' },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className={labelClass}>{f.label}</label>
                    <div className="relative">
                      <input
                        type={showPasswords[f.key] ? 'text' : 'password'}
                        value={passwordForm[f.key]}
                        onChange={e => setPasswordForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder="••••••••"
                        className={inputClass + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({ ...p, [f.key]: !p[f.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 transition-colors"
                      >
                        {showPasswords[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
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

              {/* 2FA */}
              <div className="space-y-4">
                <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">
                  Autenticação de 2 Fatores (2FA)
                </h2>

                <div className="rounded-xl border border-blush-200 dark:border-charcoal-700 p-4 flex items-start gap-4">
                  <div className={`mt-0.5 p-2 rounded-lg ${profile?.twoFactorEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-charcoal-100 dark:bg-charcoal-700'}`}>
                    {profile?.twoFactorEnabled
                      ? <ShieldCheck size={20} className="text-green-600 dark:text-green-400" />
                      : <ShieldOff size={20} className="text-charcoal-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal dark:text-charcoal-100">
                      {profile?.twoFactorEnabled ? '2FA Ativado' : '2FA Desativado'}
                    </p>
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5">
                      {profile?.twoFactorEnabled
                        ? 'Ao entrar, você receberá um código por e-mail e depois por SMS.'
                        : 'Ative para receber um código por e-mail e SMS a cada login.'}
                    </p>
                    {!profile?.phone && !profile?.twoFactorEnabled && (
                      <p className="text-xs text-amber-500 mt-1">⚠️ Cadastre um telefone na aba Perfil antes de ativar.</p>
                    )}
                  </div>
                  <button
                    onClick={() => openTwoFaModal(!profile?.twoFactorEnabled)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${profile?.twoFactorEnabled ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50' : 'bg-rose-gold/10 text-rose-gold hover:bg-rose-gold/20'}`}
                  >
                    {profile?.twoFactorEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA APARÊNCIA ──────────────────────────────────────────── */}
          {activeTab === 'theme' && (
            <div className="p-6 space-y-6">
              <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 pb-4 border-b border-blush-200 dark:border-charcoal-700">Aparência</h2>
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Escolha o tema da interface</p>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                {[
                  { value: 'light', label: 'Claro', desc: 'Interface clara com tons creme' },
                  { value: 'dark', label: 'Escuro', desc: 'Interface escura com acentos rose-gold' },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setTheme(t.value); toast.success(`Tema ${t.label} ativado`) }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${theme === t.value ? 'border-rose-gold bg-rose-gold/5' : 'border-blush-300 dark:border-charcoal-600 hover:border-rose-gold/50'}`}
                  >
                    <div className={`w-full h-16 rounded-lg mb-3 ${t.value === 'dark' ? 'bg-charcoal-900' : 'bg-cream'} border ${t.value === 'dark' ? 'border-charcoal-700' : 'border-blush-300'}`}>
                      <div className={`h-4 rounded-t-lg ${t.value === 'dark' ? 'bg-charcoal-800' : 'bg-white'}`} />
                    </div>
                    <p className="text-sm font-semibold text-charcoal dark:text-charcoal-100">{t.label}</p>
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de confirmação de senha para 2FA ─────────────────────────── */}
      {twoFaPasswordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100 mb-2">
              {twoFaPasswordModal.action ? 'Ativar 2FA' : 'Desativar 2FA'}
            </h3>
            <p className="text-sm text-charcoal-400 dark:text-charcoal-500 mb-4">
              Confirme sua senha para {twoFaPasswordModal.action ? 'ativar' : 'desativar'} a autenticação de 2 fatores.
            </p>
            <input
              type="password"
              value={twoFaPassword}
              onChange={e => setTwoFaPassword(e.target.value)}
              placeholder="Sua senha atual"
              className={inputClass + ' mb-4'}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleToggle2fa()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setTwoFaPasswordModal({ open: false, action: false }); setTwoFaPassword('') }}
                className="flex-1 py-2 rounded-lg border border-blush-300 dark:border-charcoal-600 text-sm text-charcoal-400 hover:bg-blush dark:hover:bg-charcoal-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggle2fa}
                disabled={toggling2fa || !twoFaPassword}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${twoFaPasswordModal.action ? 'bg-rose-gold text-white hover:bg-rose-gold/90' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {toggling2fa ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
