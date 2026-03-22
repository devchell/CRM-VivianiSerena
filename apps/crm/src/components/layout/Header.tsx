'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const breadcrumbs: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/leads/disparos': 'Disparos',
  '/agenda': 'Agenda',
  '/financeiro': 'Financeiro',
  '/editar-site': 'Editar Site',
  '/seguranca': 'Segurança',
  '/configuracoes': 'Configurações',
  '/colaboradores': 'Colaboradores',
}

interface HeaderProps {
  onMobileMenuClick?: () => void
}

export function Header({ onMobileMenuClick }: HeaderProps) {
  const pathname = usePathname() ?? ''
  const pageTitle = breadcrumbs[pathname] ?? 'CRM'

  return (
    <header className="px-6 h-16 flex items-center justify-between flex-shrink-0" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Mobile hamburger */}
      {typeof onMobileMenuClick === 'function' && (
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg text-charcoal-400 hover:bg-blush dark:hover:bg-[#252423] transition-colors mr-1"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-charcoal-400 dark:text-charcoal-300">Viviani CRM</span>
        <span className="text-charcoal-300 dark:text-charcoal-600">/</span>
        <span className="text-sm font-semibold text-charcoal dark:text-charcoal-100">{pageTitle}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Status Online */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-[#666] hidden sm:block">Online</span>
        </div>

        {/* Notificações */}
        <NotificationBell />

        {/* Toggle tema */}
        <ThemeToggle />
      </div>
    </header>
  )
}
