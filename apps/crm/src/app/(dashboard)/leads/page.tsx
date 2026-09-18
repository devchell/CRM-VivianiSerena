'use client'

import Link from 'next/link'
import { LeadsTable } from '@/components/leads/LeadsTable'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h1 className="font-heading text-xl font-semibold text-[var(--text-primary)]">Leads</h1>
        <Link href="/leads/disparos" className="rounded border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--ring)] hover:text-[var(--primary)]">
          Abrir Disparos
        </Link>
      </div>
      <LeadsTable />
    </div>
  )
}
