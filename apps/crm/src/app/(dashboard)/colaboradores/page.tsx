'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UserProfile } from '@viviani/types'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckSquare,
  Crown,
  Eye,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Send,
  Shield,
  Square,
  Trash2,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { crmPublicEnv } from '@/lib/public-env'
import {
  crmListBody,
  crmListCell,
  crmListHeaderCell,
  crmListRow,
  crmListShell,
  crmListTableHead,
  crmListToolbar,
} from '@/components/ui/listStyles'
import { EmptyState } from '@/components/ui/EmptyState'

const API_URL = crmPublicEnv.apiBaseUrl

type ModuleKey = 'dashboard' | 'leads' | 'agenda' | 'financeiro' | 'editar-site' | 'seguranca'
type CollaboratorTab = 'ACTIVE' | 'INACTIVE'

type Collaborator = {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: 'ADMIN' | 'MANAGER' | 'VIEWER'
  profile: UserProfile
  permissions: string[]
  allowedModules: ModuleKey[]
  photoUrl: string | null
  createdAt: string
  lastLogin: string | null
  mustChangePassword: boolean
  accountStatus: CollaboratorTab
}

type FormState = {
  name: string
  email: string
  phone: string
  profile: UserProfile
  allowedModules: ModuleKey[]
}

type ConfirmDeleteState = {
  id: string
  name: string | null
  email: string
  accountStatus: CollaboratorTab
} | null

type CollaboratorApiResponse = {
  success?: boolean
  message?: string
  data?: Collaborator
  meta?: {
    inviteEmailSent?: boolean
  }
}

const NON_ADMIN_MODULES: ModuleKey[] = ['dashboard', 'leads', 'agenda', 'financeiro']

const MODULES: Array<{
  key: ModuleKey
  label: string
  description: string
  profiles: UserProfile[]
}> = [
  { key: 'dashboard', label: 'Dashboard', description: 'Indicadores e visão geral', profiles: ['COLLABORATOR', 'VIEWER'] },
  { key: 'leads', label: 'Leads', description: 'Pipeline comercial e acompanhamento', profiles: ['COLLABORATOR', 'VIEWER'] },
  { key: 'agenda', label: 'Agenda', description: 'Agendamentos e calendário', profiles: ['COLLABORATOR', 'VIEWER'] },
  { key: 'financeiro', label: 'Financeiro', description: 'Lançamentos e relatórios', profiles: ['COLLABORATOR', 'VIEWER'] },
]

const PROFILE_META: Record<UserProfile, {
  label: string
  description: string
  icon: typeof Crown
  badge: string
}> = {
  ADMIN: {
    label: 'Admin',
    description: 'Acesso total ao CRM',
    icon: Crown,
    badge: 'text-amber-600 bg-amber-500/10',
  },
  COLLABORATOR: {
    label: 'Colaborador',
    description: 'Opera dashboard, leads, agenda e financeiro',
    icon: Users,
    badge: 'text-blue-500 bg-blue-500/10',
  },
  VIEWER: {
    label: 'Viewer',
    description: 'Consulta dashboard, leads, agenda e financeiro',
    icon: Eye,
    badge: 'text-emerald-500 bg-emerald-500/10',
  },
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  profile: 'COLLABORATOR',
  allowedModules: ['dashboard'],
}

function sanitizeModulesForProfile(profile: UserProfile, modules: ModuleKey[]): ModuleKey[] {
  if (profile === 'ADMIN') {
    return []
  }

  const allowed = new Set(NON_ADMIN_MODULES)
  const sanitized = modules.filter((module) => allowed.has(module))
  return sanitized.length > 0 ? [...new Set(sanitized)] : ['dashboard']
}

function ConfirmDeleteModal(props: {
  state: ConfirmDeleteState
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!props.state) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-md bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <UserX size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Remover colaborador</h3>
          <p className="text-sm text-[#888] mt-2">
            Tem certeza que deseja remover <strong className="text-slate-900 dark:text-slate-100">{props.state.name ?? 'este colaborador'}</strong>?
          </p>
          <p className="text-xs text-slate-400 mt-2">{props.state.email}</p>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-2.5 mb-5">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {props.state.accountStatus === 'ACTIVE'
              ? 'Este colaborador já acessou o sistema. A conta será removida do banco imediatamente.'
              : 'Esta conta ainda não foi ativada. O convite pendente e o cadastro serão removidos imediatamente.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={props.onClose}
            disabled={props.isLoading}
            className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={props.onConfirm}
            disabled={props.isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {props.isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ColaboradoresPage() {
  const { accessToken, hasPermission, updateSession, userId } = useAuth()
  const [users, setUsers] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Collaborator | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>(null)
  const [activeTab, setActiveTab] = useState<CollaboratorTab>('ACTIVE')

  const canManageUsers = hasPermission('users.manage')
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { data: Collaborator[] }
      setUsers(data.data ?? [])
    } catch {
      toast.error('Erro ao carregar colaboradores')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const activeUsers = useMemo(() => users.filter((user) => user.accountStatus === 'ACTIVE'), [users])
  const inactiveUsers = useMemo(() => users.filter((user) => user.accountStatus === 'INACTIVE'), [users])
  const visibleUsers = activeTab === 'ACTIVE' ? activeUsers : inactiveUsers

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.profile === 'ADMIN').length,
    collaborators: users.filter((user) => user.profile === 'COLLABORATOR').length,
    viewers: users.filter((user) => user.profile === 'VIEWER').length,
    active: activeUsers.length,
    inactive: inactiveUsers.length,
  }), [users, activeUsers.length, inactiveUsers.length])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(user: Collaborator) {
    setEditing(user)
    setForm({
      name: user.name ?? '',
      email: user.email,
      phone: user.phone ?? '',
      profile: user.profile,
      allowedModules: sanitizeModulesForProfile(user.profile, user.allowedModules),
    })
    setShowModal(true)
  }

  function setProfile(profile: UserProfile) {
    setForm((current) => ({
      ...current,
      profile,
      allowedModules: sanitizeModulesForProfile(profile, current.allowedModules),
    }))
  }

  function toggleModule(module: ModuleKey) {
    setForm((current) => {
      if (current.profile === 'ADMIN' || !NON_ADMIN_MODULES.includes(module)) {
        return current
      }

      const nextModules = current.allowedModules.includes(module)
        ? current.allowedModules.filter((item) => item !== module)
        : [...current.allowedModules, module]

      return {
        ...current,
        allowedModules: sanitizeModulesForProfile(current.profile, nextModules),
      }
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const allowedModules = form.profile === 'ADMIN'
        ? []
        : sanitizeModulesForProfile(form.profile, form.allowedModules)

      const payload = editing
        ? {
            name: form.name,
            email: editing.accountStatus === 'INACTIVE' ? form.email : undefined,
            phone: form.phone,
            profile: form.profile,
            allowedModules,
          }
        : {
            name: form.name,
            email: form.email,
            phone: form.phone,
            profile: form.profile,
            allowedModules,
          }

      const url = editing ? `${API_URL}/api/v1/users/${editing.id}` : `${API_URL}/api/v1/users`
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      })

      const data = await res.json() as CollaboratorApiResponse
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? 'Erro ao salvar colaborador')
      }

      if (editing) {
        toast.success('Colaborador atualizado')
      } else if (data.meta?.inviteEmailSent) {
        toast.success('Convite enviado por e-mail')
      } else {
        toast.warning('Colaborador criado, mas o e-mail falhou. Use o botão "Reenviar e-mail" na aba Inativos.')
        setActiveTab('INACTIVE')
      }

      setShowModal(false)
      await fetchUsers()

      if (editing?.id === userId) {
        await updateSession?.({
          user: {
            name: form.name,
            profile: form.profile,
            allowedModules,
          },
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar colaborador')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setActionKey(`delete:${id}`)
    try {
      const res = await fetch(`${API_URL}/api/v1/users/${id}`, {
        method: 'DELETE',
        headers,
      })

      if (!res.ok) throw new Error()

      toast.success('Colaborador removido')
      setUsers((current) => current.filter((user) => user.id !== id))
    } catch {
      toast.error('Erro ao remover colaborador')
    } finally {
      setActionKey(null)
      setConfirmDelete(null)
    }
  }

  async function handleResendInvite(user: Collaborator) {
    setActionKey(`invite:${user.id}`)
    try {
      const res = await fetch(`${API_URL}/api/v1/users/${user.id}/resend-invite`, {
        method: 'POST',
        headers,
      })
      const data = await res.json() as CollaboratorApiResponse

      if (!res.ok || !data.success) {
        throw new Error(data.message ?? 'Erro ao reenviar e-mail')
      }

      if (data.meta?.inviteEmailSent) {
        toast.success('E-mail reenviado com sucesso')
      } else {
        toast.warning('O e-mail falhou novamente. Revise o cadastro ou a configuração SMTP.')
      }

      await fetchUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao reenviar e-mail')
    } finally {
      setActionKey(null)
    }
  }

  if (!canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield size={40} className="text-slate-400 mb-3" />
        <p className="text-slate-400 text-sm">Acesso restrito a administradores.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">Colaboradores</h1>
          <p className="mt-1 text-sm text-slate-400">Perfis disponíveis: Admin, Colaborador e Viewer.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={16} />
          Adicionar colaborador
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Admins', value: stats.admins, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Colaboradores', value: stats.collaborators, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Viewers', value: stats.viewers, icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Ativos', value: stats.active, icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Inativos', value: stats.inactive, icon: Mail, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((item) => (
          <div key={item.label} className="card-dark p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-md ${item.bg} flex items-center justify-center flex-shrink-0`}>
              <item.icon size={18} className={item.color} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`${crmListToolbar} rounded-lg border border-slate-200/80 dark:border-slate-700`}>
        {([
          { key: 'ACTIVE', label: `Ativos (${stats.active})` },
          { key: 'INACTIVE', label: `Inativos (${stats.inactive})` },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={crmListShell}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : visibleUsers.length === 0 ? (
          <EmptyState message={activeTab === 'ACTIVE' ? 'Nenhum colaborador ativo encontrado.' : 'Nenhum colaborador inativo encontrado.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={crmListTableHead}>
                <tr>
                  {['Colaborador', 'Perfil', 'Módulos', activeTab === 'ACTIVE' ? 'Último acesso' : 'Status', ''].map((header) => (
                    <th key={header} className={crmListHeaderCell}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={crmListBody}>
                {visibleUsers.map((user) => {
                  const meta = PROFILE_META[user.profile]
                  const Icon = meta.icon
                  const isInviting = actionKey === `invite:${user.id}`
                  const isDeleting = actionKey === `delete:${user.id}`
                  const canEditEmail = user.accountStatus === 'INACTIVE'
                  const canDeleteUser = user.id !== userId

                  return (
                    <tr key={user.id} className={crmListRow}>
                      <td className={crmListCell}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.name ?? 'Sem nome'}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Mail size={10} />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone ? (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Phone size={10} />
                              {user.phone}
                            </div>
                          ) : null}
                          {canEditEmail ? (
                            <p className="text-[11px] text-orange-500 mt-1">Cadastro pendente. E-mail ainda pode ser alterado.</p>
                          ) : null}
                        </div>
                      </td>
                      <td className={crmListCell}>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
                          <Icon size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td className={crmListCell}>
                        {user.profile === 'ADMIN' ? (
                          <span className="text-xs text-slate-400">Todos</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {user.allowedModules.map((module) => (
                              <span key={module} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {MODULES.find((item) => item.key === module)?.label ?? module}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={crmListCell}>
                        <span className="text-xs text-slate-400">
                        {activeTab === 'ACTIVE'
                          ? new Date(user.lastLogin ?? '').toLocaleDateString('pt-BR')
                          : 'Aguardando primeiro acesso'}
                        </span>
                      </td>
                      <td className={crmListCell}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Editar colaborador"
                          >
                            <Pencil size={13} />
                          </button>
                          {user.accountStatus === 'INACTIVE' ? (
                            <button
                              onClick={() => void handleResendInvite(user)}
                              disabled={Boolean(actionKey)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                              title="Reenviar e-mail"
                            >
                              {isInviting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            </button>
                          ) : null}
                          {canDeleteUser ? (
                            <button
                              onClick={() => setConfirmDelete({
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                accountStatus: user.accountStatus,
                              })}
                              disabled={Boolean(actionKey)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                              title="Excluir colaborador"
                            >
                              {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        state={confirmDelete}
        isLoading={Boolean(actionKey?.startsWith('delete:'))}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete ? void handleDelete(confirmDelete.id) : undefined}
      />

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowModal(false)
          }}
        >
          <div className="card-dark w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {editing ? 'Editar colaborador' : 'Adicionar colaborador'}
                </h2>
                {!editing ? (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Se o e-mail falhar, o colaborador ficará em Inativos para ajuste e reenvio.
                  </p>
                ) : editing.accountStatus === 'INACTIVE' ? (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Conta inativa: todos os campos podem ser corrigidos antes do primeiro acesso.
                  </p>
                ) : null}
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nome completo *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">E-mail *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  disabled={Boolean(editing && editing.accountStatus === 'ACTIVE')}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Perfil *</label>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {(Object.keys(PROFILE_META) as UserProfile[]).map((profile) => {
                    const meta = PROFILE_META[profile]
                    const Icon = meta.icon
                    const selected = form.profile === profile

                    return (
                      <button
                        key={profile}
                        type="button"
                        onClick={() => setProfile(profile)}
                        className={`p-4 rounded-md border-2 text-left transition-all ${
                          selected
                            ? 'border-blue-400 bg-blue-500/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                        }`}
                      >
                        <Icon size={20} className="mb-2 opacity-70" />
                        <p className="text-sm font-semibold">{meta.label}</p>
                        <p className="text-xs opacity-70 mt-0.5">{meta.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {form.profile !== 'ADMIN' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Módulos liberados</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {MODULES.map((module) => {
                      const active = form.allowedModules.includes(module.key)

                      return (
                        <button
                          key={module.key}
                          type="button"
                          onClick={() => toggleModule(module.key)}
                          className={`flex items-start gap-2.5 px-3 py-3 rounded-md border text-left transition-all text-sm ${
                            active
                              ? 'border-blue-400 bg-blue-500/5 text-blue-600'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-300'
                          }`}
                        >
                          {active ? <CheckSquare size={15} className="flex-shrink-0 mt-0.5" /> : <Square size={15} className="flex-shrink-0 mt-0.5" />}
                          <span>
                            <strong className="block">{module.label}</strong>
                            <span className="text-xs opacity-70">{module.description}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm text-slate-500 dark:text-slate-400">
                {form.profile === 'ADMIN'
                  ? 'Admin recebe acesso total, incluindo Editar Site, Segurança e Colaboradores.'
                  : PROFILE_META[form.profile].description}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {editing ? 'Salvar alterações' : 'Criar colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
