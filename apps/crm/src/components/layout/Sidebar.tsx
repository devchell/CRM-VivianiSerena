'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { AppPermission, CrmModule } from '@viviani/types'
import {
  LayoutDashboard, Users, Calendar, DollarSign,
  Paintbrush, Shield, Settings, UserCheck, LogOut,
  PanelLeftClose, Menu, Sparkles,
  Send, Building2,
} from 'lucide-react'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/lib/useAuth'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  module?: string
  permission?: string
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, module: 'dashboard',   exact: true },
  { href: '/leads',        label: 'Leads',        icon: Users,           module: 'leads',        exact: true },
  { href: '/leads/disparos', label: 'Disparos',   icon: Send,            permission: 'leads.broadcast', exact: true },
  { href: '/agenda',       label: 'Agenda',       icon: Calendar,        module: 'agenda',       exact: true },
  { href: '/financeiro',   label: 'Financeiro',   icon: DollarSign,      module: 'financeiro',   exact: true },
  { href: '/editar-site',  label: 'Editar Site',  icon: Paintbrush,      module: 'editar-site',  exact: true },
  { href: '/seguranca',    label: 'Segurança',    icon: Shield,          module: 'seguranca',    exact: true },
  { href: '/colaboradores',label: 'Colaboradores',icon: UserCheck,       permission: 'users.manage', exact: true },
  { href: '/administracao',label: 'Administração',icon: Building2,       permission: 'users.manage', exact: true },
]

function getRoleLabel(profile: string | null, isAdmin: boolean) {
  if (isAdmin || profile === 'ADMIN') return 'Administrador'
  if (profile === 'COLLABORATOR') return 'Colaborador'
  return 'Viewer'
}

function NavItemRow({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={href} prefetch onClick={onClick}>
      <div
        title={collapsed ? label : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: '9px 10px',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 150ms ease, color 150ms ease',
          color: active ? 'var(--sidebar-text-active)' : hovered ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
          background: active
            ? 'var(--sidebar-active-bg)'
            : hovered
              ? 'rgba(255,255,255,0.06)'
              : 'transparent',
          boxShadow: active ? 'inset 3px 0 0 var(--accent-cta, #F5C518)' : 'none',
          fontWeight: active ? 500 : 400,
          fontSize: 14,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon size={17} style={{ flexShrink: 0, opacity: active ? 1 : hovered ? 0.9 : 0.65 }} />
        {!collapsed && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        )}
      </div>
    </Link>
  )
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

  const sidebarStyle: React.CSSProperties = {
    background: 'var(--sidebar-bg)',
    borderRight: '1px solid var(--sidebar-border)',
    color: 'var(--sidebar-text)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  }

  const navContent = (
    <>
      {/* Header / Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 60,
          padding: collapsed ? '0 12px' : '0 12px 0 14px',
          flexShrink: 0,
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              color: '#EFF6FF',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            aria-label="Expandir menu"
          >
            <Sparkles size={18} strokeWidth={2.5} />
          </button>
        ) : (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} strokeWidth={2.5} style={{ color: '#EFF6FF', flexShrink: 0 }} />
              <span style={{
                color: 'var(--sidebar-logo)',
                fontWeight: 600,
                fontSize: 16,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                letterSpacing: '-0.01em',
              }}>
                Viviani Serena
              </span>
            </div>
            <button
              onClick={toggle}
              style={{
                marginLeft: 'auto',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--sidebar-text)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 150ms ease, color 150ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--sidebar-text)'
              }}
              aria-label="Recolher menu"
            >
              <PanelLeftClose size={16} />
            </button>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {visibleItems.map(({ href, label, icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || (pathname?.startsWith(href + '/') ?? false)
          return (
            <NavItemRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={active}
              collapsed={collapsed}
              onClick={closeMobile}
            />
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--sidebar-border)' }}>
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 10 }}>
            <Link href="/configuracoes" title={`${userName} - ${roleLabel} - Configurações`}>
              <div style={{
                width: 34, height: 34,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}>
                <Settings size={15} style={{ color: 'var(--sidebar-text)' }} />
              </div>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sair"
              style={{
                width: 34, height: 34,
                borderRadius: 8,
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
            >
              <LogOut size={15} style={{ color: 'var(--sidebar-text)' }} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
            <Link href="/configuracoes" style={{ flexShrink: 0 }} title="Configurações">
              <div style={{
                width: 34, height: 34,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}>
                <Settings size={15} style={{ color: 'var(--sidebar-text)' }} />
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--sidebar-text-active)', fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                {userName || 'Usuário'}
              </p>
              <p style={{ color: 'var(--sidebar-text)', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                {roleLabel}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sair"
              style={{
                flexShrink: 0,
                width: 34, height: 34,
                borderRadius: 8,
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={15} style={{ color: '#94A3B8' }} />
            </button>
          </div>
        )}
      </div>
    </>
  )

  const width = collapsed ? 60 : 240

  return (
    <>
      <aside
        style={{ ...sidebarStyle, width, minWidth: width }}
        className="h-screen hidden lg:flex flex-col transition-[width] duration-300 ease-in-out"
      >
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col"
            style={{ ...sidebarStyle, width: 272 }}
          >
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
      className="lg:hidden p-2 rounded-lg transition-colors"
      style={{ color: 'var(--text-tertiary)' }}
      aria-label="Abrir menu"
    >
      <Menu size={20} />
    </button>
  )
}
