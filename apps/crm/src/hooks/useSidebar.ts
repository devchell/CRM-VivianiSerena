'use client'

import { useState, useEffect, useCallback } from 'react'

/** Lê valor do localStorage com segurança (nunca lança erro). */
function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Grava valor no localStorage com segurança (nunca lança erro). */
function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage cheio, bloqueado ou indisponível — ignora silenciosamente
  }
}

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Restaurar estado salvo (apenas no client, após montagem)
  useEffect(() => {
    const saved = readStorage('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      writeStorage('sidebar-collapsed', String(next))
      return next
    })
  }, [])

  const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return { collapsed, toggle, mobileOpen, toggleMobile, closeMobile }
}
