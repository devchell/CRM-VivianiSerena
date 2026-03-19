'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import type { AppPermission, CrmModule } from '@viviani/types'
import {
  LayoutDashboard, Users, Calendar, DollarSign,
  Paintbrush, Shield, Settings, UserCheck, LogOut,
  PanelLeftClose, Menu, Sparkles,
} from 'lucide-react'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/lib/useAuth'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  module?: string
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/leads', label: 'Leads', icon: Users, module: 'leads' },
  { href: '/agenda', label: 'Agenda', icon: Calendar, module: 'agenda' },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign, module: 'financeiro' },
  { href: '/editar-site', label: 'Editar Site', icon: Paintbrush, module: 'editar-site' },
  { href: '/seguranca', label: 'Seguranca', icon: Shield, module: 'seguranca' },
  { href: '/colaboradores', label: 'Colaboradores', icon: UserCheck, permission: 'users.manage' },
  { href: '/administracao', label: 'Administracao', icon: Settings, permission: 'users.manage' },
]

function getRoleLabel(profile: string | null, isAdmin: boolean) {
  if (isAdmin || profile === 'ADMIN') return 'Administrador'
  if (profile === 'COLLABORATOR') return 'Colaborador'
  return 'Viewer'
}

function Sidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { isAdmin, userName, profile, canAccessModule, hasPermission } = useAuth()

  const roleLabel = getRoleLabel(profile, isAdmin)

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.permission) return hasPermission(item.permission as AppPermission)
      if (item.module) return canAccessModule(item.module as CrmModule)
      return true
    })
  }, [canAccessModule, hasPermission])

  useEffect(() => {
    NAV_ITEMS.forEach((item) => router.prefetch(item.href))
  }, [router])

  const navContent = (
    <>
      <div className="flex items-center h-16 px-3 border-b border-[#e7e1d9] bg-white dark:bg-[#141414] dark:border-charcoal-800 flex-shrink-0 transition-colors duration-200">
        {collapsed ? (
          <button
            onClick={toggle}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[#c58b62] dark:text-[#d8b898] hover:bg-[#f0e8de] dark:hover:bg-[#272421] transition-all duration-200 hover:scale-[1.04] active:scale-[0.98]"
            aria-label="Expandir menu"
          >
            <Sparkles size={20} />
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-1 py-1.5">
            <Sparkles size={20} className="text-[#c58b62] dark:text-[#d8b898]" />
            <span className="text-[#c58b62] dark:text-[#d8b898] font-heading font-semibold text-lg whitespace-nowrap overflow-hidden select-none">
              Viviani Serena
            </span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggle}
            className="ml-auto w-9 h-9 flex items-center justify-center rounded-lg text-[#9c8c7a] hover:text-[#6b5b4b] hover:bg-[#f0e8de] dark:text-[#c6b29b] dark:hover:text-white dark:hover:bg-[#272421] transition-colors flex-shrink-0"
            aria-label="Recolher menu"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 bg-white dark:bg-[#0f0f0f] transition-opacity duration-200 ease-out">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (pathname?.startsWith(href + '/') ?? false)
          const collapsedClasses = collapsed ? 'justify-center gap-0' : 'gap-3'
          const hoverShift = collapsed ? '' : 'hover:translate-x-1'

          return (
            <Link key={href} href={href} prefetch onClick={closeMobile}>
              <div
                title={collapsed ? label : undefined}
                className={[
                  'flex items-center px-2.5 py-2.5 rounded-lg cursor-pointer whitespace-nowrap border border-transparent transition-all duration-200',
                  collapsedClasses,
                  active
                    ? 'bg-[#f7efe6] text-[#c58b62] border-[#f1e3d6] dark:bg-[#2a2622] dark:text-[#e4c9a6] dark:border-[#3a332c] shadow-[0_8px_20px_-15px_rgba(0,0,0,0.4)]'
                    : `text-[#85786a] hover:text-[#c58b62] hover:bg-[#f7efe6] dark:text-[#b3a18f] dark:hover:text-[#e4c9a6] dark:hover:bg-[#2a2622] ${hoverShift}`,
                ].join(' ')}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium overflow-hidden text-ellipsis transition-opacity duration-200 ease-out">
                    {label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[#e7e1d9] dark:border-charcoal-800 bg-white dark:bg-[#0f0f0f] flex-shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 p-3">
            <Link href="/configuracoes" title={`${userName} - ${roleLabel} - Configurações`}>
              <div className="w-9 h-9 rounded-lg bg-[#f7efe6] hover:bg-[#f1e3d6] border border-[#eadfd2] dark:bg-[#2a2622] dark:hover:bg-[#322c26] dark:border-[#3a332c] flex items-center justify-center transition-colors group">
                <Settings size={16} className="text-[#9c8c7a] dark:text-[#d8b898] group-hover:text-[#c58b62] transition-colors" />
              </div>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sair"
              className="w-9 h-9 rounded-lg hover:bg-[#f7efe6] dark:hover:bg-[#322c26] flex items-center justify-center transition-colors group"
            >
              <LogOut size={15} className="text-[#9c8c7a] dark:text-[#d8b898] group-hover:text-[#e06d5c] transition-colors" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3">
            <Link href="/configuracoes" className="flex-shrink-0" title="Configurações">
              <div className="w-9 h-9 rounded-lg bg-[#f7efe6] hover:bg-[#f1e3d6] border border-[#eadfd2] dark:bg-[#2a2622] dark:hover:bg-[#322c26] dark:border-[#3a332c] flex items-center justify-center transition-colors group">
                <Settings size={16} className="text-[#9c8c7a] dark:text-[#d8b898] group-hover:text-[#c58b62] transition-colors" />
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[#56493d] dark:text-[#e6d7c6] text-sm font-semibold truncate leading-tight">{userName || 'Usuário'}</p>
              <p className="text-[#9c8c7a] dark:text-[#c6b29b] text-[11px] truncate leading-tight">{roleLabel}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sair"
              className="flex-shrink-0 w-9 h-9 rounded-lg hover:bg-[#f7efe6] dark:hover:bg-[#322c26] flex items-center justify-center transition-colors group"
            >
              <LogOut size={15} className="text-[#9c8c7a] dark:text-[#d8b898] group-hover:text-[#e06d5c] transition-colors" />
            </button>
          </div>
        )}
      </div>
    </>
  )

  const width = collapsed ? 72 : 240

  return (
    <>
      <aside
        style={{ width, minWidth: width }}
        className="h-screen hidden lg:flex flex-col bg-white dark:bg-[#0f0f0f] border-r border-[#e7e1d9] dark:border-charcoal-800 shadow-sm transition-[width] duration-300 ease-in-out"
      >
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#0f0f0f] border-r border-[#e7e1d9] dark:border-charcoal-800 shadow-xl flex flex-col">
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}

export { Sidebar }
export default Sidebar

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg text-[#9c8c7a] hover:bg-[#f7efe6] transition-colors"
      aria-label="Abrir menu"
    >
      <Menu size={20} />
    </button>
  )
}
