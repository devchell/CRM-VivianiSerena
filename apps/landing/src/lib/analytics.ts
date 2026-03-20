'use client'

import { landingPublicEnv } from './public-env'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || null
const API_BASE_URL = landingPublicEnv.apiBaseUrl
const SESSION_STORAGE_KEY = 'vs_analytics_session_id'

export type WebVitalRating = 'good' | 'needs-improvement' | 'poor'

export interface WebVitalMetric {
  name: string
  value: number
  rating: WebVitalRating
  id: string
  navigationType: string
}

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY)
}

function setSessionId(value: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, value)
}

async function postAnalytics(path: string, payload: Record<string, unknown>) {
  try {
    const endpoint = typeof window === 'undefined'
      ? `${API_BASE_URL}/api/v1/analytics/${path}`
      : `/api/track/${path}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })

    if (!response.ok) {
      return null
    }

    return await response.json() as { success: boolean; data?: { sessionId?: string } }
  } catch {
    return null
  }
}

export function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  const result: Record<string, string> = {}

  keys.forEach((key) => {
    const value = params.get(key)
    if (value) result[key] = value
  })

  if (Object.keys(result).length > 0) {
    sessionStorage.setItem('utm_params', JSON.stringify(result))
    return result
  }

  const stored = sessionStorage.getItem('utm_params')
  return stored ? (JSON.parse(stored) as Record<string, string>) : {}
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || !GA_ID) return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(args)
}

export async function trackPageView(url: string) {
  gtag('config', GA_ID, { page_path: url })

  const payload = await postAnalytics('pageview', {
    page: url,
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    duration: 0,
    sessionId: getSessionId() ?? undefined,
    utmSource: getUtmParams().utm_source,
    utmMedium: getUtmParams().utm_medium,
    utmCampaign: getUtmParams().utm_campaign,
  })

  const sessionId = payload?.data?.sessionId
  if (sessionId) {
    setSessionId(sessionId)
  }
}

export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  gtag('event', eventName, {
    ...params,
    send_to: GA_ID ?? undefined,
  })

  void postAnalytics('event', {
    name: eventName,
    category: typeof params?.event_category === 'string' ? params.event_category : 'engagement',
    label: typeof params?.event_label === 'string' ? params.event_label : undefined,
    value: typeof params?.value === 'number' ? params.value : undefined,
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    sessionId: getSessionId() ?? undefined,
    payload: params ?? {},
  })
}

export function trackCTAClick(ctaName: string, location: string) {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
    page_section: location,
    event_category: 'engagement',
    event_label: ctaName,
  })
}

export function trackWhatsAppClick(source: string) {
  trackEvent('whatsapp_click', {
    source,
    event_category: 'engagement',
    event_label: 'whatsapp_redirect',
  })
}

export function trackLeadFormStart(step: number) {
  trackEvent('lead_form_start', {
    form_step: step,
    event_category: 'lead_generation',
  })
}

export function trackLeadFormStep(step: number, stepName: string) {
  trackEvent('lead_form_step', {
    form_step: step,
    step_name: stepName,
    event_category: 'lead_generation',
  })
}

export function trackLead(data: {
  name: string
  email?: string
  phone: string
  service?: string
  period?: string
  source?: string
}) {
  trackEvent('generate_lead', {
    event_category: 'lead_generation',
    event_label: data.service ?? 'general',
    lead_source: data.source ?? 'landing_page',
    has_email: Boolean(data.email),
    ...getUtmParams(),
  })
}

export function trackConversion(value?: number) {
  trackEvent('conversion', {
    event_category: 'conversion',
    event_label: 'avaliacao_agendada',
    value: value ?? 0,
    currency: 'BRL',
  })
}

export function trackScrollDepth(percent: number) {
  trackEvent('scroll_depth', {
    percent_scrolled: percent,
    event_category: 'engagement',
  })
}

export function trackResultsView(category: string) {
  trackEvent('results_view', {
    category,
    event_category: 'engagement',
  })
}

export function trackFaqOpen(question: string) {
  trackEvent('faq_open', {
    question,
    event_category: 'engagement',
  })
}

export function reportWebVital(metric: WebVitalMetric) {
  trackEvent('web_vitals', {
    event_category: 'Web Vitals',
    event_label: metric.id,
    metric_name: metric.name,
    metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_rating: metric.rating,
    non_interaction: true,
  })

  void fetch('/api/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...metric,
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      sessionId: getSessionId() ?? undefined,
      url: typeof window !== 'undefined' ? window.location.href : '',
    }),
    keepalive: true,
  }).catch(() => null)
}
