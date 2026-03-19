import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { About } from '@/components/About'
import { HowItWorks } from '@/components/HowItWorks'
import { Services } from '@/components/Services'
import { LeadFormSection } from '@/components/LeadFormSection'
import Results from '@/components/Results'
import Testimonials from '@/components/Testimonials'
import TrustSection from '@/components/TrustSection'
import FAQ from '@/components/FAQ'
import LocationSection from '@/components/LocationSection'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import FloatingCTA from '@/components/FloatingCTA'
import { landingServerEnv } from '@/lib/server-env'

const API_URL = landingServerEnv.apiBaseUrl

type ContentStore = Record<string, Record<string, unknown>>

async function getAllContent(): Promise<ContentStore> {
  try {
    // cache: 'no-store' → desativa o Data Cache e o Full Route Cache do Next.js,
    // garantindo que cada requisição busque dados frescos da API do CRM.
    const res = await fetch(`${API_URL}/api/v1/content`, { cache: 'no-store' })
    if (!res.ok) return {}
    const data = await res.json() as { success: boolean; data: ContentStore }
    return data.data ?? {}
  } catch {
    return {}
  }
}

function str(v: unknown, subkey?: string): string | undefined {
  if (!v || typeof v !== 'object') return undefined
  const obj = v as Record<string, unknown>
  if (subkey) return obj[subkey] ? String(obj[subkey]) : undefined
  if ('pt' in obj) return String(obj.pt)
  if ('text' in obj) return String(obj.text)
  if ('value' in obj) return String(obj.value)
  return undefined
}

export default async function HomePage() {
  const content = await getAllContent()

  // Urgency badge
  const badgeRaw = content.hero?.urgency_badge as { enabled?: boolean; text?: string } | undefined
  const urgencyBadge = badgeRaw
    ? { enabled: badgeRaw.enabled !== false, text: badgeRaw.text }
    : undefined

  // Hero
  const heroTitle = str(content.hero?.title)
  const heroSubtitle = str(content.hero?.subtitle)
  const ctaRaw = content.hero?.cta_primary as { text?: string; url?: string } | undefined
  const heroCta = ctaRaw ? { text: ctaRaw.text, url: ctaRaw.url } : undefined

  // WhatsApp (número puro: 5511915751770)
  const waRaw = content.contact?.whatsapp as { number?: string; message?: string } | undefined
  const whatsappNumber = waRaw?.number
  const whatsappMessage = waRaw?.message

  // About bio
  const aboutBio = str(content.about?.bio)

  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero
          urgencyBadge={urgencyBadge}
          title={heroTitle}
          subtitle={heroSubtitle}
          cta={heroCta}
          whatsappNumber={whatsappNumber}
          whatsappMessage={whatsappMessage}
        />
        <About bio={aboutBio} whatsappNumber={whatsappNumber} />
        <HowItWorks />
        <Services />
        <Results />
        <Testimonials />
        <TrustSection />
        <LeadFormSection />
        <FAQ whatsappNumber={whatsappNumber} />
        <LocationSection />
        <FinalCTA />
      </main>
      <Footer whatsappNumber={whatsappNumber} />
      <FloatingCTA whatsappNumber={whatsappNumber} whatsappMessage={whatsappMessage} />
    </>
  )
}
