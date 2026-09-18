'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetchJson, buildAuthHeaders } from '@/lib/api-client'
import { useAuth } from '@/lib/useAuth'

interface LeadDispatchEditorProps {
  status: string
  label: string
  leadsCount: number
  onDispatch: (subject: string, body: string) => Promise<void>
}

interface TemplateData {
  id: string
  status: string
  channel: string
  subject: string | null
  body: string
  updatedAt: string
}

export function LeadDispatchEditor({ status, label, leadsCount, onDispatch }: LeadDispatchEditorProps) {
  const { accessToken } = useAuth()
  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dispatching, setDispatching] = useState(false)

  const loadTemplate = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const data = await apiFetchJson<{ success: true; data: TemplateData | null }>(
        `/api/v1/templates/lead/${status}/email`,
        { headers: buildAuthHeaders(accessToken) }
      )
      if (data.success && data.data) {
        setSubject(data.data.subject ?? '')
        setEmailBody(data.data.body ?? '')
      } else {
        setSubject('')
        setEmailBody('')
      }
    } catch (error) {
      console.warn('[dispatches] Não foi possível carregar o modelo da mensagem.', error)
      toast.error('Erro ao carregar a mensagem salva.')
    } finally {
      setLoading(false)
    }
  }, [status, accessToken])

  useEffect(() => {
    void loadTemplate()
  }, [loadTemplate])

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    try {
      await apiFetchJson(`/api/v1/templates/lead/${status}/email`, {
        method: 'PUT',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({ subject, body: emailBody }),
      })
      toast.success('Mensagem salva!')
    } catch {
      toast.error('Erro ao salvar mensagem.')
    } finally {
      setSaving(false)
    }
  }

  const handleDispatch = async () => {
    if (leadsCount === 0) return
    setDispatching(true)
    try {
      await onDispatch(subject, emailBody)
    } finally {
      setDispatching(false)
    }
  }

  const variables = [
    { key: '{nome}', desc: 'Nome do lead' },
    { key: '{email}', desc: 'E-mail do lead' },
    { key: '{telefone}', desc: 'Telefone do lead' },
    { key: '{servico}', desc: 'Serviço de interesse' },
    { key: '{data}', desc: 'Data de hoje' },
    { key: '{origem}', desc: 'Canal de origem' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>
            {label} — {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
            Mensagem enviada para leads com status &quot;{label}&quot;
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', color: 'var(--muted-foreground)' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Carregando mensagem...</span>
        </div>
      ) : (
        <>
          {/* Subject — email only */}
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto do e-mail"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-input)',
              fontSize: 13, color: 'var(--foreground)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Body textarea */}
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="<p>Olá {nome},</p>\n<p>Sua mensagem aqui...</p>"
            style={{
              width: '100%',
              minHeight: 340,
              fontFamily: '"Fira Code", "Consolas", monospace',
              fontSize: 13,
              lineHeight: 1.6,
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              color: 'var(--foreground)',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />

          {/* Variables legend */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--panel)', fontSize: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Variáveis disponíveis:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
              {variables.map((v) => (
                <span key={v.key} style={{ color: 'var(--muted-foreground)' }}>
                  <code style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{v.key}</code> — {v.desc}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-secondary"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 6, fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Salvar mensagem
            </button>
            <button
              type="button"
              onClick={() => void handleDispatch()}
              disabled={leadsCount === 0 || dispatching}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 6, fontSize: 13,
                background: leadsCount > 0 && !dispatching ? 'var(--primary)' : 'var(--muted)',
                color: leadsCount > 0 ? '#fff' : 'var(--muted-foreground)',
                border: 'none',
                cursor: leadsCount > 0 && !dispatching ? 'pointer' : 'not-allowed',
                opacity: leadsCount > 0 ? 1 : 0.5,
              }}
            >
              {dispatching ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Send size={14} />
              )}
              Disparar para {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

