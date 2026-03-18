'use client'

import { LeadsTable } from '@/components/leads/LeadsTable'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">Leads</h1>
        <p className="text-charcoal-400 dark:text-charcoal-400 mt-1 text-sm">Gerencie seus potenciais clientes</p>
      </div>
      <LeadsTable />
    </div>
  )
}
