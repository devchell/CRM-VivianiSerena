import { PrismaClient, UserRole, ContentSection, LeadSource, SecurityEventSeverity } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting DEMO database seed (full reset)...')

  // Limpa dados (ordem importa por FKs)
  await prisma.securityEvent.deleteMany()
  await prisma.financial.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.content.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()

  // ── Usuários demo
  const admin = await prisma.user.create({
    data: {
      name: 'Viviani Serene',
      email: 'admin@vivianiserena.com',
      passwordHash: await bcrypt.hash('Teste123', 12),
      role: UserRole.ADMIN,
      allowedModules: [],
      mustChangePassword: false,
    },
  })

  await prisma.user.create({
    data: {
      name: 'João Vitor',
      email: 'colaborador@vivianiserena.com',
      passwordHash: await bcrypt.hash('Teste123', 12),
      role: UserRole.VIEWER,
      allowedModules: ['dashboard', 'leads', 'financeiro'],
      mustChangePassword: false,
    },
  })

  // ── Conteúdo demo (landing)
  const contentEntries = [
    { section: ContentSection.hero, key: 'title', value: { pt: 'Viviani Serena - Estética Avançada' } },
    { section: ContentSection.hero, key: 'subtitle', value: { pt: 'Resultados premium com tecnologia e acolhimento.' } },
    { section: ContentSection.contact, key: 'whatsapp', value: { number: '5511999999999', message: 'Olá! Gostaria de saber mais.' } },
  ]
  for (const entry of contentEntries) {
    await prisma.content.upsert({
      where: { section_key: { section: entry.section, key: entry.key } },
      update: { value: entry.value as object, updatedBy: admin.id },
      create: { ...entry, updatedBy: admin.id },
    })
  }

  // ── Leads demo
  const leads = [
    { name: 'Ana Paula', email: 'ana.paula@email.com', phone: '11991234567', source: LeadSource.instagram, status: 'new', notes: 'Quer sessão de limpeza de pele.' },
    { name: 'Carlos Lima', email: 'carlos.lima@email.com', phone: '11987654321', source: LeadSource.google_ads, status: 'contacted', notes: 'Interessado em depilação a laser.' },
    { name: 'Marina Duarte', email: 'marina.duarte@email.com', phone: '11988887777', source: LeadSource.referral, status: 'converted', convertedAt: new Date(), notes: 'Fechou pacote combo.' },
    { name: 'Rafaela Gomes', email: 'rafaela.gomes@email.com', phone: '11977776666', source: LeadSource.whatsapp, status: 'qualified', notes: 'Agendada avaliação.' },
  ]
  for (const lead of leads) await prisma.lead.create({ data: lead })

  // ── Finanças demo
  const sampleTransactions = [
    { type: 'income', category: 'coaching_revenue', amount: 850, description: 'Sessão premium facial', date: new Date() },
    { type: 'income', category: 'workshop_revenue', amount: 2850, description: 'Pacote 5 sessões laser', date: new Date(Date.now() - 2 * 86400000) },
    { type: 'expense', category: 'marketing', amount: 650, description: 'Ads Instagram', date: new Date(Date.now() - 3 * 86400000) },
    { type: 'expense', category: 'office', amount: 3200, description: 'Aluguel Clínica', date: new Date(Date.now() - 5 * 86400000) },
    { type: 'expense', category: 'taxes', amount: 210, description: 'Impostos MEI', date: new Date(Date.now() - 6 * 86400000) },
  ]
  for (const tx of sampleTransactions) await prisma.financial.create({ data: tx })

  // ── Eventos de segurança demo
  const securityEvents = [
    { type: 'FAILED_LOGIN_ATTEMPT', severity: SecurityEventSeverity.medium, sourceIp: '201.22.33.44', details: { attempts: 3 }, resolved: true },
    { type: 'BOT_DETECTED', severity: SecurityEventSeverity.low, sourceIp: '45.32.10.55', details: { path: '/api/v1/leads' }, resolved: false },
  ]
  for (const event of securityEvents) await prisma.securityEvent.create({ data: event })

  console.log('✅ Demo seed completed. Admin/Colaborador senhas: Teste123')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
