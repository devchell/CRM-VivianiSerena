import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import './globals.css'
import { PageTracker } from '@/components/PageTracker'
import WhatsAppButton from '@/components/WhatsAppButton'
import { SITE_URL } from '@/lib/site-url'

const WHATSAPP_NUMBER = '5511915751770'
const INSTAGRAM_URL = 'https://www.instagram.com/vivini.serena/'
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    url: SITE_URL,
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
    canonical: SITE_URL,
    languages: {
      'pt-BR': SITE_URL,
    },
  },
  manifest: '/manifest.json',
  verification: googleSiteVerification ? { google: googleSiteVerification } : undefined,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': SITE_URL,
  name: 'Viviani Serena — Remoção a Laser',
  description:
    'Especialista em remoção a laser de micropigmentação de sobrancelhas, lábios, eyeliner, capilar e tatuagens em Santo André e São Paulo.',
  url: SITE_URL,
  telephone: `+${WHATSAPP_NUMBER}`,
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
  image: `${SITE_URL}/images/viviani/retrato.webp`,
  sameAs: [INSTAGRAM_URL, 'https://wa.link/e2g7ii'],
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

const jsonLdScript = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim() || null

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript }}
        />
        {gaId ? <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" /> : null}
        {gaId ? (
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { page_path: window.location.pathname });
            `}
          </Script>
        ) : null}
      </head>
      <body className="min-h-screen bg-cream font-body text-charcoal antialiased">
        <Suspense fallback={null}>
          <PageTracker />
        </Suspense>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-rose-gold focus:text-white focus:rounded-md focus:outline-none"
        >
          Pular para o conteúdo principal
        </a>
        {children}
        <WhatsAppButton />
      </body>
    </html>
  )
}
