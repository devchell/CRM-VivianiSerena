import { PrismaClient, UserRole, ContentSection } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const WHATSAPP_NUMBER = '5511915751770'

function readSeedPassword(name: string): string {
  const password = process.env[name]?.trim()
  if (!password || password.length < 12) {
    throw new Error(`[seed] ${name} must be set with at least 12 characters`)
  }
  return password
}

async function main() {
  const adminPassword = readSeedPassword('SEED_ADMIN_PASSWORD')
  const collaboratorPassword = readSeedPassword('SEED_COLLABORATOR_PASSWORD')

  console.log('Starting idempotent baseline seed without deleting existing data...')

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vivianiserena.com' },
    update: {
      username: 'viviani',
      name: 'Viviani Serena',
      role: UserRole.ADMIN,
      allowedModules: [],
    },
    create: {
      name: 'Viviani Serena',
      email: 'admin@vivianiserena.com',
      username: 'viviani',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: UserRole.ADMIN,
      allowedModules: [],
      mustChangePassword: true,
      twoFactorEnabled: false,
      twoFactorEmailEnabled: false,
      twoFactorSmsEnabled: false,
    },
  })

  await prisma.user.upsert({
    where: { email: 'colaborador@vivianiserena.com' },
    update: {
      name: 'Colaborador Viviani',
      role: UserRole.VIEWER,
      allowedModules: ['dashboard', 'leads', 'financeiro'],
    },
    create: {
      name: 'Colaborador Viviani',
      email: 'colaborador@vivianiserena.com',
      passwordHash: await bcrypt.hash(collaboratorPassword, 12),
      role: UserRole.VIEWER,
      allowedModules: ['dashboard', 'leads', 'financeiro'],
      mustChangePassword: true,
      twoFactorEnabled: false,
      twoFactorEmailEnabled: false,
      twoFactorSmsEnabled: false,
    },
  })

  const contentEntries = [
    {
      section: ContentSection.hero,
      key: 'title',
      value: { pt: 'Viviani Serena - Estética Avançada' },
    },
    {
      section: ContentSection.hero,
      key: 'subtitle',
      value: { pt: 'Resultados premium com tecnologia e acolhimento.' },
    },
    {
      section: ContentSection.contact,
      key: 'whatsapp',
      value: { number: WHATSAPP_NUMBER, message: 'Olá! Gostaria de saber mais.' },
    },
  ]

  for (const entry of contentEntries) {
    await prisma.content.upsert({
      where: { section_key: { section: entry.section, key: entry.key } },
      update: { value: entry.value, updatedBy: admin.id },
      create: { ...entry, updatedBy: admin.id },
    })
  }

  console.log('Baseline seed completed. Existing operational data was preserved.')
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
