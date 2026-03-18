'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="crm-theme">
        {children}
      </NextThemesProvider>
    </SessionProvider>
  )
}
