import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Viviani Serena CRM',
    short_name: 'VS CRM',
    description: 'Sistema de gestão — Viviani Serena',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#1C1C1C',
    theme_color: '#C9967A',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.svg?v=5',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.svg?v=5',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-192.svg?v=5', sizes: '192x192', type: 'image/svg+xml' }],
      },
      {
        name: 'Leads',
        url: '/leads',
        icons: [{ src: '/icons/icon-192.svg?v=5', sizes: '192x192', type: 'image/svg+xml' }],
      },
      {
        name: 'Financeiro',
        url: '/financeiro',
        icons: [{ src: '/icons/icon-192.svg?v=5', sizes: '192x192', type: 'image/svg+xml' }],
      },
    ],
  }
}
