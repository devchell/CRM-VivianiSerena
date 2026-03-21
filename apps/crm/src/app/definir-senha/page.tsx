import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DefinirSenhaClient } from './DefinirSenhaClient'

export default async function DefinirSenhaPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.mustChangePassword) {
    redirect('/dashboard')
  }

  return <DefinirSenhaClient />
}
