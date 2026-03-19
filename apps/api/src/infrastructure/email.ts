import nodemailer from 'nodemailer'
import { logger } from '../lib/logger'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = `"${process.env.EMAIL_FROM_NAME || 'Viviani Serena'}" <${process.env.EMAIL_FROM || 'noreply@vivianicoaching.com'}>`
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@vivianiserena.com'
const WHATSAPP_NUMBER = '5511915751770'

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:Inter,sans-serif;background:#FAF7F2;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#C9967A,#b8806a);padding:32px;text-align:center}
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
  <div class="header"><h1>Viviani Serena</h1></div>
  <div class="body">${content}</div>
  <div class="footer"><p>Viviani Serena Coaching © ${new Date().getFullYear()} · Mooca & Santo André, São Paulo</p></div>
</div></body></html>`
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.SMTP_USER) {
    logger.warn('Email not sent — SMTP not configured', { to, subject })
    return false
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
    logger.info('Email sent', { to, subject })
    return true
  } catch (err) {
    logger.error('Email send failed:', err)
    return false
  }
}

export const emailService = {
  async sendOtp(params: { to: string; code: string; type: 'email' | 'login' }) {
    const isLogin = params.type === 'login'
    const content = `
      <span class="badge">${isLogin ? '🔐 Verificação de Login' : '✉️ Código de Verificação'}</span>
      <p>Use o código abaixo para concluir sua autenticação no CRM:</p>
      <div class="info-box" style="text-align:center;padding:24px;">
        <p style="font-size:32px;font-weight:700;letter-spacing:12px;color:#C9967A;margin:0;font-family:monospace">${params.code}</p>
      </div>
      <p style="font-size:13px;color:#666">Este código é válido por <strong>5 minutos</strong>. Não compartilhe com ninguém.</p>
      <p style="font-size:12px;color:#999">Se você não solicitou este código, ignore este e-mail.</p>
    `
    return send(params.to, 'Seu código de verificação — Viviani Serena CRM', baseTemplate('Código de Verificação', content))
  },


  async newLead(lead: { name: string; email: string; phone?: string; source: string }) {
    const content = `
      <span class="badge">🎯 Novo Lead</span>
      <p>Um novo lead chegou pelo <strong>${lead.source}</strong>.</p>
      <div class="info-box">
        <p><strong>Nome:</strong> ${lead.name}</p>
        <p><strong>E-mail:</strong> ${lead.email}</p>
        ${lead.phone ? `<p><strong>Telefone:</strong> ${lead.phone}</p>` : ''}
      </div>
      <p>Acesse o CRM para acompanhar e entrar em contato.</p>
    `
    return send(ADMIN_EMAIL, `Novo Lead: ${lead.name}`, baseTemplate('Novo Lead', content))
  },

  async appointmentConfirmation(params: {
    clientEmail: string
    clientName: string
    date: Date
    serviceType: string
  }) {
    const dateStr = params.date.toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
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
    return send(params.clientEmail, 'Seu agendamento foi confirmado ✨', baseTemplate('Agendamento Confirmado', content))
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
      ? params.modules.map(m => moduleLabels[m] ?? m).join(', ')
      : 'Acesso completo (Admin)'
    const profileLabel = (params.profile ?? params.role) === 'ADMIN'
      ? 'Administrador'
      : params.profile === 'MANAGER'
        ? 'Gestor'
        : params.profile === 'READONLY'
          ? 'Somente leitura'
          : 'Operador'
    const content = `
      <span class="badge">👋 Convite para o CRM</span>
      <p>Olá, <strong>${params.name}</strong>!</p>
      <p>Você foi adicionado ao <strong>CRM Viviani Serena</strong> como colaborador.</p>
      <div class="info-box">
        <p><strong>E-mail de acesso:</strong> ${params.to}</p>
        <p><strong>Senha temporária:</strong> <span style="font-family:monospace;font-size:16px;letter-spacing:2px;color:#C9967A">${params.tempPassword}</span></p>
        <p><strong>Perfil:</strong> ${profileLabel}</p>
        <p><strong>Módulos liberados:</strong> ${moduleList}</p>
      </div>
      <p>⚠️ <strong>Na primeira entrada, você deverá criar uma nova senha.</strong></p>
      <p>Acesse o CRM pelo link abaixo:</p>
      <a href="${params.crmUrl}/login" class="btn">Acessar o CRM</a>
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
      <span class="badge">📊 Relatório Semanal</span>
      <p>Período: <strong>${params.period}</strong></p>
      <div class="info-box">
        <p><strong>Receitas:</strong> ${fmt(params.income)}</p>
        <p><strong>Despesas:</strong> ${fmt(params.expenses)}</p>
        <p><strong>Lucro Líquido:</strong> ${fmt(params.profit)}</p>
        <p><strong>Novos Leads:</strong> ${params.leads}</p>
        <p><strong>Agendamentos:</strong> ${params.appointments}</p>
      </div>
    `
    return send(ADMIN_EMAIL, `Relatório Semanal — ${params.period}`, baseTemplate('Relatório Financeiro', content))
  },
}
