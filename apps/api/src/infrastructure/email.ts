import nodemailer from 'nodemailer'
import { logger } from '../lib/logger'
import { getActiveEmailSettings } from './emailSettings'
import { prisma } from '../lib/prisma'
import { sanitizeRichHtml } from '../lib/sanitize'
import { maskEmail } from '../lib/redact'

const WHATSAPP_NUMBER = '5511915751770'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderRichText(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:Inter,sans-serif;background:#FAF7F2;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .header{background:#2C2C2C;padding:32px;text-align:center;border-bottom:4px solid #C9967A}
  .header h1{color:#fff;margin:0;font-size:24px;font-family:'Playfair Display',serif}
  .body{padding:32px}
  .body p{color:#2C2C2C;line-height:1.6;margin:0 0 16px}
  .footer{background:#F2E8E4;padding:20px 32px;text-align:center}
  .footer p{color:#8B9E8A;font-size:12px;margin:0}
  .badge{display:inline-block;background:#F2E8E4;color:#C9967A;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px}
  .btn{display:inline-block;background:#C9967A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px}
  .info-box{background:#FAF7F2;border-left:4px solid #C9967A;padding:16px;border-radius:0 8px 8px 0;margin:16px 0}
</style></head>
<body><div class="wrapper">
  <div class="header"><h1>${escapeHtml(title)}</h1></div>
  <div class="body">${content}</div>
  <div class="footer"><p>Viviani Serena Coaching © ${new Date().getFullYear()} · Mooca & Santo André, São Paulo</p></div>
</div></body></html>`
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const settings = await getActiveEmailSettings()

  if (!settings.configured || !settings.host || !settings.user || !settings.password || !settings.from) {
    logger.warn('Email not sent - SMTP not configured', { to: maskEmail(to), subjectLength: subject.length, source: settings.source })
    return false
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.password,
      },
    })

    await transporter.sendMail({
      from: `"${settings.fromName || 'Viviani Serena'}" <${settings.from}>`,
      to,
      subject: subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 160),
      html,
    })

    logger.info('Email sent', { to: maskEmail(to), subjectLength: subject.length, source: settings.source })
    return true
  } catch (err) {
    logger.error('Email send failed', {
      error: err instanceof Error ? err.message : String(err),
      to: maskEmail(to),
      source: settings.source,
    })
    return false
  }
}

async function sendAdminEmail(subject: string, html: string) {
  const settings = await getActiveEmailSettings()

  if (!settings.adminEmail) {
    logger.warn('Email not sent - admin email missing', { subject })
    return false
  }

  return send(settings.adminEmail, subject, html)
}

export const emailService = {
  async sendTestEmail(to: string) {
    const content = `
      <span class="badge">Teste de configuração</span>
      <p>Este é um e-mail de teste do CRM Viviani Serena.</p>
      <p>Se você recebeu esta mensagem, o servidor SMTP está configurado e o envio está funcionando.</p>
    `
    return send(to, 'Teste de e-mail — Viviani Serena CRM', baseTemplate('Teste de e-mail', content))
  },

  async sendOtp(params: { to: string; code: string; type: 'email' | 'login' }) {
    const customTemplate = await prisma.autoTemplate.findUnique({
      where: { templateId: 'auth_2fa' },
    })
    const isLogin = params.type === 'login'
    let html: string
    if (customTemplate?.emailHtml) {
      html = sanitizeRichHtml(customTemplate.emailHtml)
        .replace(/\{codigo\}/g, params.code)
        .replace(/\{code\}/g, params.code)
    } else {
      const content = `
        <span class="badge">${isLogin ? 'Verificação de Login' : 'Código de Verificação'}</span>
        <p>Use o código abaixo para concluir sua autenticação no CRM:</p>
        <div class="info-box" style="text-align:center;padding:24px;">
          <p style="font-size:32px;font-weight:700;letter-spacing:12px;color:#C9967A;margin:0;font-family:monospace">${params.code}</p>
        </div>
        <p style="font-size:13px;color:#666">Este código é válido por <strong>5 minutos</strong>. Não compartilhe com ninguém.</p>
        <p style="font-size:12px;color:#999">Se você não solicitou este código, ignore este e-mail.</p>
      `
      html = baseTemplate('Código de Verificação', content)
    }
    return send(params.to, 'Seu código de verificação - Viviani Serena CRM', html)
  },

  async newLead(lead: { name: string; email: string; phone?: string; source: string }) {
    const name = escapeHtml(lead.name)
    const email = escapeHtml(lead.email)
    const phone = lead.phone ? escapeHtml(lead.phone) : ''
    const source = escapeHtml(lead.source)
    const content = `
      <span class="badge">Novo lead</span>
      <p>Um novo lead chegou pelo <strong>${source}</strong>.</p>
      <div class="info-box">
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        ${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ''}
      </div>
      <p>Acesse o CRM para acompanhar e entrar em contato.</p>
    `
    return sendAdminEmail(`Novo Lead: ${lead.name}`, baseTemplate('Novo Lead', content))
  },

  async appointmentConfirmation(params: {
    clientEmail: string
    clientName: string
    date: Date
    serviceType: string
  }) {
    const customTemplate = await prisma.autoTemplate.findUnique({
      where: { templateId: 'appointment_confirmation' },
    })
    const dateStr = params.date.toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    let html: string
    if (customTemplate?.emailHtml) {
      html = sanitizeRichHtml(customTemplate.emailHtml)
        .replace(/\{nome\}/g, escapeHtml(params.clientName))
        .replace(/\{servico\}/g, escapeHtml(params.serviceType))
        .replace(/\{data\}/g, escapeHtml(dateStr))
    } else {
      const content = `
        <p>Olá, <strong>${params.clientName}</strong>!</p>
        <p>Seu agendamento foi confirmado com sucesso.</p>
        <div class="info-box">
          <p><strong>Serviço:</strong> ${params.serviceType}</p>
          <p><strong>Data:</strong> ${dateStr}</p>
        </div>
        <p>Se precisar reagendar, entre em contato conosco com antecedência de 24 horas.</p>
        <a href="https://wa.me/${WHATSAPP_NUMBER}" class="btn">Falar no WhatsApp</a>
      `
      html = baseTemplate('Agendamento Confirmado', content)
    }
    return send(params.clientEmail, 'Seu agendamento foi confirmado', html)
  },

  async sendCollaboratorInvite(params: {
    to: string
    name: string
    tempPassword: string
    crmUrl: string
    role: string
    profile?: string
    modules: string[]
  }) {
    const moduleLabels: Record<string, string> = {
      dashboard: 'Dashboard', leads: 'Leads', agenda: 'Agenda',
      financeiro: 'Financeiro', 'editar-site': 'Editar Site', seguranca: 'Segurança',
    }
    const moduleList = params.modules.length
      ? params.modules.map(m => escapeHtml(moduleLabels[m] ?? m)).join(', ')
      : 'Acesso completo (Admin)'
    const profileLabel = (params.profile ?? params.role) === 'ADMIN'
      ? 'Administrador'
      : params.profile === 'COLLABORATOR'
        ? 'Colaborador'
        : 'Viewer'
    const content = `
      <span class="badge">Convite para o CRM</span>
      <p>Olá, <strong>${escapeHtml(params.name)}</strong>!</p>
      <p>Você foi adicionado ao <strong>CRM Viviani Serena</strong> como colaborador.</p>
      <div class="info-box">
        <p><strong>E-mail de acesso:</strong> ${escapeHtml(params.to)}</p>
        <p><strong>Senha temporária:</strong> <span style="font-family:monospace;font-size:16px;letter-spacing:2px;color:#C9967A">${escapeHtml(params.tempPassword)}</span></p>
        <p><strong>Perfil:</strong> ${escapeHtml(profileLabel)}</p>
        <p><strong>Módulos liberados:</strong> ${moduleList}</p>
      </div>
      <p><strong>Na primeira entrada, você deverá criar uma nova senha.</strong></p>
      <p>Acesse o CRM pelo link abaixo:</p>
      <a href="${escapeHtml(params.crmUrl)}/login" class="btn">Acessar o CRM</a>
      <p style="font-size:12px;color:#999;margin-top:24px">Por segurança, esta senha temporária deve ser trocada imediatamente após o primeiro login.</p>
    `
    return send(params.to, 'Você foi convidado para o CRM Viviani Serena', baseTemplate('Convite CRM', content))
  },

  async weeklyFinancialReport(params: {
    period: string
    income: number
    expenses: number
    profit: number
    leads: number
    appointments: number
  }) {
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const content = `
      <span class="badge">Relatório semanal</span>
      <p>Período: <strong>${params.period}</strong></p>
      <div class="info-box">
        <p><strong>Receitas:</strong> ${fmt(params.income)}</p>
        <p><strong>Despesas:</strong> ${fmt(params.expenses)}</p>
        <p><strong>Lucro Líquido:</strong> ${fmt(params.profit)}</p>
        <p><strong>Novos Leads:</strong> ${params.leads}</p>
        <p><strong>Agendamentos:</strong> ${params.appointments}</p>
      </div>
    `
    return sendAdminEmail(`Relatório Semanal - ${params.period}`, baseTemplate('Relatório Financeiro', content))
  },

  async sendCampaignMessage(params: {
    to: string
    subject: string
    title: string
    body: string
  }) {
    const sanitizedBody = sanitizeRichHtml(params.body)
    const isHtml = /<[a-z][\s\S]*>/i.test(sanitizedBody)
    if (isHtml) {
      return send(params.to, params.subject, sanitizedBody)
    }
    const content = `
      <span class="badge">Comunicado</span>
      ${renderRichText(params.body)}
    `
    return send(params.to, params.subject, baseTemplate(params.title, content))
  },
}
