import { PrismaClient, UserRole, ContentSection } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const WHATSAPP_NUMBER = '5511915751770'

async function main() {
  console.log('🌱 Starting baseline database seed (clean operational reset)...')

  // Limpa dados (ordem importa por FKs)
  await prisma.securityEvent.deleteMany()
  await prisma.session.deleteMany()
  await prisma.appointment.deleteMany()
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
      twoFactorEnabled: false,
      twoFactorEmailEnabled: false,
      twoFactorSmsEnabled: false,
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
      twoFactorEnabled: false,
      twoFactorEmailEnabled: false,
      twoFactorSmsEnabled: false,
    },
  })

  // ── Conteúdo demo (landing)
  const contentEntries = [
    { section: ContentSection.hero, key: 'title', value: { pt: 'Viviani Serena - Estética Avançada' } },
    { section: ContentSection.hero, key: 'subtitle', value: { pt: 'Resultados premium com tecnologia e acolhimento.' } },
    { section: ContentSection.contact, key: 'whatsapp', value: { number: WHATSAPP_NUMBER, message: 'Olá! Gostaria de saber mais.' } },
  ]
  for (const entry of contentEntries) {
    await prisma.content.upsert({
      where: { section_key: { section: entry.section, key: entry.key } },
      update: { value: entry.value as object, updatedBy: admin.id },
      create: { ...entry, updatedBy: admin.id },
    })
  }

  console.log('✅ Baseline seed completed. Operational domains reset to zero. Admin/Colaborador senhas: Teste123')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
