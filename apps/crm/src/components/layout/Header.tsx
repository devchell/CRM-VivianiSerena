'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const breadcrumbs: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/clientes': 'Clientes',
  '/leads/disparos': 'Disparos',
  '/agenda': 'Agenda',
  '/financeiro': 'Financeiro',
  '/editar-site': 'Editar Site',
  '/seguranca': 'Segurança',
  '/configuracoes': 'Configurações',
  '/colaboradores': 'Colaboradores',
  '/administracao': 'Administração',
}

interface HeaderProps {
  onMobileMenuClick?: () => void
}

export function Header({ onMobileMenuClick }: HeaderProps) {
  const pathname = usePathname() ?? ''
  const pageTitle = breadcrumbs[pathname] ?? 'CRM'

  return (
    <header className="px-6 h-14 flex items-center justify-between flex-shrink-0 border-b border-slate-200 dark:border-slate-800" style={{ background: 'var(--bg-surface)' }}>
      {/* Mobile hamburger */}
      {typeof onMobileMenuClick === 'function' && (
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">Viviani CRM</span>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Status Online */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="hidden text-sm text-[var(--text-secondary)] sm:block">Online</span>
        </div>

        {/* Notificações */}
        <NotificationBell />

        {/* Toggle tema */}
        <ThemeToggle />
      </div>
    </header>
  )
}
