import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.ADMIN_RESET_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_RESET_PASSWORD ?? 'change-this-before-use'
const CRM_URL = process.env.CRM_URL ?? 'https://crm.example.com'

async function main() {
  console.log('\nViviani Serena CRM - reset de senha administrativa\n')

  if (ADMIN_PASSWORD === 'change-this-before-use') {
    throw new Error('Set ADMIN_RESET_PASSWORD before running reset-password.ts')
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, twoFactorEnabled: false },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      twoFactorEnabled: false,
    },
  })

  console.log('Admin user configured successfully.')
  console.log(`Email: ${ADMIN_EMAIL}`)
  console.log(`CRM URL: ${CRM_URL}`)
}

main()
  .catch((error) => {
    console.error('Reset failed:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
