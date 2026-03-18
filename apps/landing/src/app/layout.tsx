import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://vivianicoaching.com'),
  title: {
    default: 'Viviani Serena | Remoção a Laser de Micropigmentação em Santo André e SP',
    template: '%s | Viviani Serena',
  },
  description:
    'Especialista em remoção a laser de sobrancelhas micropigmentadas, lábios, eyeliner, capilar e tatuagens em Santo André e São Paulo. Tecnologia Q-Switched Nd:YAG. Avaliação gratuita!',
  keywords: [
    'remoção micropigmentação',
    'laser sobrancelha',
    'remoção tatuagem laser',
    'despigmentação laser',
    'Santo André',
    'São Paulo ABC',
    'Q-Switched Nd:YAG',
    'micropigmentação sobrancelha removida',
    'remoção eyeliner laser',
    'remoção labial laser',
  ],
  authors: [{ name: 'Viviani Serena' }],
  creator: 'Viviani Serena',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://vivianicoaching.com',
    siteName: 'Viviani Serena',
    title: 'Remoção a Laser de Micropigmentação | Viviani Serena',
    description:
      'Especialista em remoção a laser de sobrancelhas micropigmentadas, lábios, capilar e tatuagens. Santo André e São Paulo. Avaliação gratuita!',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Viviani Serena - Especialista em Remoção a Laser em Santo André',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Remoção a Laser de Micropigmentação | Viviani Serena',
    description: 'Especialista em remoção a laser em Santo André e São Paulo. Avaliação gratuita!',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://vivianicoaching.com',
    languages: {
      'pt-BR': 'https://vivianicoaching.com',
    },
  },
  manifest: '/manifest.json',
  verification: {
    google: 'google-site-verification-placeholder',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://vivianicoaching.com',
  name: 'Viviani Serena — Remoção a Laser',
  description:
    'Especialista em remoção a laser de micropigmentação de sobrancelhas, lábios, eyeliner, capilar e tatuagens em Santo André e São Paulo.',
  url: 'https://vivianicoaching.com',
  telephone: '+5511999999999',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Santo André',
    addressRegion: 'SP',
    addressCountry: 'BR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -23.6568,
    longitude: -46.5249,
  },
  areaServed: [
    { '@type': 'City', name: 'Santo André' },
    { '@type': 'City', name: 'São Paulo' },
    { '@type': 'City', name: 'São Bernardo do Campo' },
    { '@type': 'City', name: 'São Caetano do Sul' },
  ],
  priceRange: '$$',
  openingHours: ['Mo-Fr 09:00-18:00', 'Sa 09:00-14:00'],
  image: 'https://static.wixstatic.com/media/be8b61_9dfb57055aea4d4f9f4c8b5bfdbbea28~mv2.jpg',
  sameAs: ['https://www.instagram.com/vivini.serena/', 'https://wa.link/e2g7ii'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Serviços de Remoção a Laser',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Remoção de Sobrancelhas Micropigmentadas',
          description: 'Remoção a laser Q-Switched de sobrancelhas micropigmentadas',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Remoção de Micropigmentação Labial',
          description: 'Remoção a laser de micropigmentação de lábios e eyeliner',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Remoção de Micropigmentação Capilar',
          description: 'Remoção a laser de micropigmentação capilar',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Remoção de Tatuagens',
          description: 'Remoção a laser de tatuagens coloridas e preta',
        },
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Analytics 4 - substitua G-XXXXXXXXXX pelo ID real */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX', { page_path: window.location.pathname });
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-cream font-body text-charcoal antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-rose-gold focus:text-white focus:rounded-md focus:outline-none"
        >
          Pular para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  )
}
