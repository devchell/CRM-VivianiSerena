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
type SiteSummary = {
  socialProof: {
    enabled: boolean
    baseClients: number
    basePublicReviews: number
    actualLeads: number
    clientsRegistered: number
    publicReviews: number
    averageRating: number | null
  }
  trust: {
    clientsRegistered: number
    publicReviews: number
    completedAppointments: number
    convertedCases: number
  }
  googleBusiness: {
    enabled: boolean
    linkedLocations: Array<{
      accountName: string
      accountId: string
      accountLabel: string
      locationName: string
      locationId: string
      title: string
      address: string
    }>
    reviewCount: number
    averageRating: number | null
    reviews: Array<{
      id: string
      rating: number
      comment: string
      reviewerName: string
      reviewerPhotoUrl: string | null
      updateTime: string | null
      createTime: string | null
      locationTitle: string
      locationId: string
    }>
  }
}

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

async function getSiteSummary(): Promise<SiteSummary | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/content/site-summary`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { success: boolean; data: SiteSummary }
    return data.data
  } catch {
    return null
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

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asAssetUrl(value: unknown) {
  if (typeof value === 'string') return value

  const objectValue = asObject(value)
  return asString(objectValue.url)
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export default async function HomePage() {
  const [content, siteSummary] = await Promise.all([getAllContent(), getSiteSummary()])

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
  const heroBackgroundImage = asAssetUrl(content.hero?.background_image)

  // WhatsApp (número puro: 5511915751770)
  const waRaw = content.contact?.whatsapp as { number?: string; message?: string } | undefined
  const whatsappNumber = waRaw?.number
  const whatsappMessage = waRaw?.message

  // About bio
  const aboutBio = str(content.about?.bio)
  const resultsVivianiPhoto = asAssetUrl(content.services?.viviani_photo)
  const resultsItems = asArray<Record<string, unknown>>(content.services?.results_items).map((item, index) => ({
    id: asString(item.id, `result-${index}`),
    title: asString(item.title),
    text: asString(item.text),
    category: asString(item.category, 'Outros'),
    beforeImage: asString(item.beforeImage),
    afterImage: asString(item.afterImage),
  })).filter((item) => item.beforeImage && item.afterImage)

  const testimonialDisplay = asObject(content.testimonials?.display_options)
  const manualTestimonials = asArray<Record<string, unknown>>(content.testimonials?.manual_items).map((item, index) => ({
    id: asString(item.id, `manual-${index}`),
    name: asString(item.name, 'Cliente'),
    city: asString(item.city),
    service: asString(item.service),
    text: asString(item.text),
    stars: asNumber(item.stars, 5),
    source: 'manual' as const,
  })).filter((item) => item.text)

  const googleTestimonials = (siteSummary?.googleBusiness.reviews ?? []).map((review) => ({
    id: review.id,
    name: review.reviewerName,
    city: review.locationTitle,
    service: 'Avaliação Google',
    text: review.comment,
    stars: review.rating,
    source: 'google' as const,
  }))

  const showArtificialTestimonials = Boolean(testimonialDisplay.artificialEnabled)
  const showGoogleTestimonials = Boolean(testimonialDisplay.googleEnabled)
  const testimonialPublicReviews = siteSummary?.socialProof.publicReviews ?? 0
  const testimonialAverageRating = siteSummary?.socialProof.averageRating ?? null

  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero
          urgencyBadge={urgencyBadge}
          title={heroTitle}
          subtitle={heroSubtitle}
          cta={heroCta}
          backgroundImage={heroBackgroundImage}
          whatsappNumber={whatsappNumber}
          whatsappMessage={whatsappMessage}
          socialProof={siteSummary?.socialProof}
        />
        <About bio={aboutBio} whatsappNumber={whatsappNumber} />
        <HowItWorks />
        <Services />
        <Results items={resultsItems} vivianiPhotoUrl={resultsVivianiPhoto} />
        <Testimonials
          manualItems={manualTestimonials}
          googleItems={showGoogleTestimonials ? googleTestimonials : []}
          publicReviewCount={testimonialPublicReviews}
          averageRating={testimonialAverageRating}
          artificialEnabled={showArtificialTestimonials}
        />
        <TrustSection stats={siteSummary?.trust} />
        <LeadFormSection socialProof={siteSummary?.socialProof} />
        <FAQ whatsappNumber={whatsappNumber} />
        <LocationSection />
        <FinalCTA />
      </main>
      <Footer whatsappNumber={whatsappNumber} />
      <FloatingCTA whatsappNumber={whatsappNumber} whatsappMessage={whatsappMessage} />
    </>
  )
}
