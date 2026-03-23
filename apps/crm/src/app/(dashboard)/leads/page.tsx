'use client'

import Link from 'next/link'
import { LeadsTable } from '@/components/leads/LeadsTable'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Leads</h1>
        <Link href="/leads/disparos" className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400">
          Abrir Disparos
        </Link>
      </div>
      <LeadsTable />
    </div>
  )
}
