'use client'

import Link from 'next/link'
import { LeadsTable } from '@/components/leads/LeadsTable'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-blush-200 pb-4 dark:border-[#3a3835]">
        <h1 className="font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">Leads</h1>
        <Link href="/leads/disparos" className="rounded border border-blush-300 px-4 py-2 text-sm font-medium text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold dark:border-[#3a3835] dark:text-charcoal-300">
          Abrir Disparos
        </Link>
      </div>
      <LeadsTable />
    </div>
  )
}
