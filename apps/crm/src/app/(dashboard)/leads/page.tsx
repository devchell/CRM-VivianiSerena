'use client'

import Link from 'next/link'
import { LeadsTable } from '@/components/leads/LeadsTable'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-blush-200 bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.16),_transparent_38%),linear-gradient(135deg,#fffdfb_0%,#fff7f1_52%,#fffdfb_100%)] px-6 py-6 shadow-[0_28px_80px_-42px_rgba(97,73,54,0.35)] dark:border-charcoal-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.18),_transparent_34%),linear-gradient(135deg,#171412_0%,#1e1a17_52%,#161311_100%)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-gold">Pipeline comercial</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
              Leads organizados com leitura rapida e status mais claros.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">
              A tela foi refinada para priorizar triagem, atualizacao de status e visao de origem sem ruido visual.
            </p>
          </div>
          <Link href="/leads/disparos" className="rounded-2xl border border-blush-300 px-4 py-3 text-sm font-medium text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold dark:border-charcoal-600 dark:text-charcoal-300">
            Abrir Disparos
          </Link>
        </div>
      </div>
      <LeadsTable />
    </div>
  )
}
