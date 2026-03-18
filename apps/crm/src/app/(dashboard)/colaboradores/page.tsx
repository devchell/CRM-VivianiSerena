'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { toast } from 'sonner'
import {
  UserPlus, Pencil, Trash2, X, Loader2, Shield, Users,
  CheckSquare, Square, Crown, Eye, Mail, Phone, UserX, AlertTriangle,
} from 'lucide-react'
import { crmPublicEnv } from '@/lib/public-env'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  colaboradorName: string
  isLoading?: boolean
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, colaboradorName, isLoading }: ConfirmDeleteModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="bg-white dark:bg-[#1e1e1e] border border-blush-200 dark:border-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
        style={{ animation: 'scaleIn 0.2s ease' }}>
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <UserX size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal dark:text-[#e5e5e5]">Remover Colaborador</h3>
          <p className="text-sm text-[#888] mt-2">
            Tem certeza que deseja remover <strong className="text-charcoal dark:text-[#e5e5e5]">{colaboradorName}</strong>?
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-2.5 mb-5">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">O colaborador perderá acesso imediato ao sistema.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-blush dark:bg-[#2a2a2a] hover:bg-blush-200 dark:hover:bg-[#333] text-charcoal dark:text-[#e5e5e5] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}

const API_URL = crmPublicEnv.apiBaseUrl

const MODULES = [
  { key: 'dashboard',   label: 'Dashboard',    icon: '📊' },
  { key: 'leads',       label: 'Leads',        icon: '👥' },
  { key: 'agenda',      label: 'Agenda',       icon: '📅' },
  { key: 'financeiro',  label: 'Financeiro',   icon: '💰' },
  { key: 'editar-site', label: 'Editar Site',  icon: '✏️' },
  { key: 'seguranca',   label: 'Segurança',    icon: '🛡️' },
]

interface Collaborator {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: 'ADMIN' | 'VIEWER'
  allowedModules: string[]
  photoUrl: string | null
  createdAt: string
  lastLogin: string | null
  mustChangePassword: boolean
}

interface FormState {
  name: string
  email: string
  phone: string
  role: 'ADMIN' | 'VIEWER'
  allowedModules: string[]
}

const EMPTY_FORM: FormState = {
  name: '', email: '', phone: '', role: 'VIEWER', allowedModules: ['dashboard'],
}

export default function ColaboradoresPage() {
  const { accessToken, isAdmin, updateSession } = useAuth()
  const [users, setUsers] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Collaborator | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string | null } | null>(null)

  const hdrs = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) throw new Error()
      const data = await res.json() as { data: Collaborator[] }
      setUsers(data.data)
    } catch { toast.error('Erro ao carregar colaboradores') } finally { setLoading(false) }
  }, [accessToken])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (u: Collaborator) => {
    setEditing(u)
    setForm({ name: u.name ?? '', email: u.email, phone: u.phone ?? '', role: u.role, allowedModules: Array.isArray(u.allowedModules) ? u.allowedModules : [] })
    setShowModal(true)
  }

  const toggleModule = (key: string) => {
    setForm(f => ({
      ...f,
      allowedModules: (Array.isArray(f.allowedModules) ? f.allowedModules : []).includes(key)
        ? f.allowedModules.filter(m => m !== key)
        : [...(Array.isArray(f.allowedModules) ? f.allowedModules : []), key],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editing
        ? `${API_URL}/api/v1/users/${editing.id}`
        : `${API_URL}/api/v1/users`
      const method = editing ? 'PATCH' : 'POST'
      const body = editing
        ? { name: form.name, phone: form.phone, role: form.role, allowedModules: form.role === 'ADMIN' ? [] : form.allowedModules }
        : form

      const res = await fetch(url, { method, headers: hdrs, body: JSON.stringify(body) })
      const data = await res.json() as { success: boolean; message?: string }
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Erro')

      toast.success(editing ? 'Colaborador atualizado!' : 'Convite enviado por e-mail!')
      setShowModal(false)
      fetchUsers()
      if (editing) {
        await updateSession?.({
          user: {
            name: form.name,
            role: form.role,
            allowedModules: form.allowedModules,
          },
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`${API_URL}/api/v1/users/${id}`, { method: 'DELETE', headers: hdrs })
      if (!res.ok) throw new Error()
      toast.success('Colaborador removido')
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch { toast.error('Erro ao remover') } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield size={40} className="text-charcoal-300 mb-3" />
        <p className="text-charcoal-400 text-sm">Acesso restrito a administradores.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">Colaboradores</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie quem tem acesso ao CRM e quais módulos pode ver</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-rose-gold text-white rounded-lg text-sm font-medium hover:bg-rose-gold/90 transition-colors">
          <UserPlus size={16} /> Adicionar Colaborador
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: users.length, icon: Users, color: 'text-rose-gold', bg: 'bg-rose-gold/10' },
          { label: 'Admins', value: users.filter(u => u.role === 'ADMIN').length, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Acesso Limitado', value: users.filter(u => u.role === 'VIEWER').length, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        ].map(s => (
          <div key={s.label} className="card-dark p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-xs text-charcoal-400">{s.label}</p>
              <p className="text-xl font-bold font-heading text-charcoal dark:text-charcoal-50">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-rose-gold" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={36} className="text-charcoal-300 mb-3" />
            <p className="text-charcoal-400 text-sm">Nenhum colaborador cadastrado.</p>
            <button onClick={openCreate} className="mt-3 text-rose-gold text-sm hover:underline">+ Adicionar o primeiro</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-blush-100 dark:border-charcoal-700">
                <tr>
                  {['Colaborador', 'Perfil', 'Módulos', 'Último acesso', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-charcoal-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-blush-50 dark:divide-charcoal-700/40">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-blush-50 dark:hover:bg-charcoal-700/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-charcoal dark:text-charcoal-100 truncate">{u.name ?? '—'}</p>
                          <div className="flex items-center gap-1 text-xs text-charcoal-400">
                            <Mail size={10} /> <span className="truncate">{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1 text-xs text-charcoal-400">
                              <Phone size={10} /> {u.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'text-amber-600 bg-amber-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                        {u.role === 'ADMIN' ? <><Crown size={10} /> Admin</> : <><Eye size={10} /> Limitado</>}
                      </span>
                      {u.mustChangePassword && (
                        <span className="ml-1 inline-flex text-xs text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                          Aguardando 1º login
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'ADMIN' ? (
                        <span className="text-xs text-charcoal-400">Todos</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(Array.isArray(u.allowedModules) ? u.allowedModules : []).length === 0
                            ? <span className="text-xs text-charcoal-400">Nenhum</span>
                            : (Array.isArray(u.allowedModules) ? u.allowedModules : []).map(m => (
                              <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-charcoal-400">
                                {MODULES.find(mod => mod.key === m)?.label ?? m}
                              </span>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-charcoal-400">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pt-BR') : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 transition-opacity">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-gold hover:bg-rose-gold/10 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete({ id: u.id, name: u.name })} disabled={deleting === u.id} className="p-1.5 rounded-lg text-charcoal-400 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50">
                          {deleting === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        colaboradorName={confirmDelete?.name ?? 'este colaborador'}
        isLoading={!!deleting}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="card-dark w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-blush-200 dark:border-charcoal-700 sticky top-0 bg-white dark:bg-charcoal-800 z-10">
              <div>
                <h2 className="font-heading text-lg font-semibold text-charcoal dark:text-charcoal-50">
                  {editing ? 'Editar Colaborador' : 'Adicionar Colaborador'}
                </h2>
                {!editing && <p className="text-xs text-charcoal-400 mt-0.5">A senha será enviada por e-mail automaticamente.</p>}
              </div>
              <button onClick={() => setShowModal(false)} className="text-charcoal-400 hover:text-charcoal dark:hover:text-charcoal-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium text-charcoal-400 mb-1">Nome Completo *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-charcoal-400 mb-1">E-mail *</label>
                <input required type="email" value={form.email} disabled={!!editing}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="colaborador@email.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40 disabled:opacity-60 disabled:cursor-not-allowed" />
                {!editing && <p className="text-xs text-charcoal-400 mt-1">A senha temporária será enviada para este e-mail.</p>}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-medium text-charcoal-400 mb-1">Número / WhatsApp</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40" />
              </div>

              {/* Tipo de acesso */}
              <div>
                <label className="block text-xs font-medium text-charcoal-400 mb-2">Tipo de Acesso *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'ADMIN', label: 'Admin', desc: 'Acesso total ao CRM', icon: Crown, color: 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                    { value: 'VIEWER', label: 'Limitado', desc: 'Acesso aos módulos selecionados', icon: Eye, color: 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, role: opt.value as 'ADMIN' | 'VIEWER' }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${form.role === opt.value ? opt.color : 'border-blush-300 dark:border-charcoal-600 hover:border-rose-gold/30'}`}>
                      <opt.icon size={20} className="mb-2 opacity-70" />
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Módulos (só para limitado) */}
              {form.role === 'VIEWER' && (
                <div>
                  <label className="block text-xs font-medium text-charcoal-400 mb-2">
                    Módulos disponíveis
                    <span className="ml-1 text-charcoal-300">(Configurações está incluído por padrão)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODULES.map(mod => {
                      const active = Array.isArray(form.allowedModules) && form.allowedModules.includes(mod.key)
                      return (
                        <button key={mod.key} type="button" onClick={() => toggleModule(mod.key)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all text-sm ${active ? 'border-rose-gold bg-rose-gold/5 text-rose-gold' : 'border-blush-300 dark:border-charcoal-600 text-charcoal-400 hover:border-rose-gold/30'}`}>
                          {active ? <CheckSquare size={15} className="flex-shrink-0" /> : <Square size={15} className="flex-shrink-0" />}
                          <span>{mod.icon} {mod.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-blush-300 dark:border-charcoal-600 text-charcoal-400 text-sm hover:bg-blush dark:hover:bg-charcoal-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-gold text-white text-sm font-semibold hover:bg-rose-gold/90 transition-colors disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editing ? 'Salvar alterações' : 'Criar e enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
