export type SecurityChecklistContext = {
  httpsActive: boolean
  redisOk: boolean
  backupConfigured: boolean
  twoFactorConfigured: boolean
  hstsEnabled: boolean
  sslExpiryDays: number | null
}

export type SecurityChecklistItem = {
  id: string
  label: string
  ok: boolean
  warning?: boolean
  description: string
  daysLeft?: number
}

export function buildSecurityChecklist(context: SecurityChecklistContext): SecurityChecklistItem[] {
  const { httpsActive, redisOk, backupConfigured, twoFactorConfigured, hstsEnabled, sslExpiryDays } = context

  return [
    {
      id: 'https',
      label: 'HTTPS ativo',
      ok: httpsActive,
      description: httpsActive
        ? 'A requisição atual está protegida por TLS.'
        : 'Este ambiente ainda opera em HTTP; configure TLS antes de produção.',
    },
    {
      id: 'brute_force',
      label: 'Proteção contra força bruta',
      ok: true,
      description: 'Bloqueio automático após tentativas falhas consecutivas de login.',
    },
    {
      id: 'rate_limit',
      label: 'Rate limiting ativo',
      ok: redisOk,
      description: 'Rate limit e lockout dependem de Redis operacional.',
    },
    {
      id: 'backup',
      label: 'Backup configurado',
      ok: backupConfigured,
      description: backupConfigured
        ? 'Backup habilitado por ambiente.'
        : 'Sem confirmação automática de backup neste ambiente.',
    },
    {
      id: '2fa',
      label: 'Autenticação em 2 fatores',
      ok: twoFactorConfigured,
      description: twoFactorConfigured
        ? 'Há pelo menos um canal de entrega de OTP configurado.'
        : 'Configure SMTP ou Twilio antes de habilitar 2FA para usuários.',
    },
    {
      id: 'ssl_expiry',
      label: 'Certificado SSL',
      ok: httpsActive && sslExpiryDays !== null && sslExpiryDays > 14,
      warning: httpsActive && sslExpiryDays !== null && sslExpiryDays <= 30,
      description: !httpsActive
        ? 'Certificado não pode ser considerado ativo enquanto o ambiente opera em HTTP.'
        : sslExpiryDays === null
          ? 'Nenhuma validade de certificado foi informada pelo ambiente.'
          : `Certificado SSL ${sslExpiryDays > 14 ? `expira em ${sslExpiryDays} dias` : 'precisa de renovação urgente'}.`,
      ...(sslExpiryDays === null ? {} : { daysLeft: sslExpiryDays }),
    },
    {
      id: 'headers',
      label: 'Headers de segurança ativos',
      ok: true,
      description: hstsEnabled
        ? 'Helmet, HSTS e CSP estão ativos.'
        : 'Helmet e CSP estão ativos; HSTS será habilitado junto com TLS.',
    },
    {
      id: 'anomaly',
      label: 'Detecção básica de anomalias',
      ok: true,
      description: 'O backend aplica validações e detecção de padrões suspeitos, sem prometer um WAF completo.',
    },
  ]
}
