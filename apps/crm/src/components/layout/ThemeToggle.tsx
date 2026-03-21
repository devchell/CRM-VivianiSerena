'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg text-charcoal-400 hover:bg-blush dark:hover:bg-[#252423] transition-colors"
      aria-label="Alternar tema"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
