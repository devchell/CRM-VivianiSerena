'use client'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-XXXXXXXXXX'

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
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(args)
}

export function trackPageView(url: string) {
  gtag('config', GA_ID, { page_path: url })
}

export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  gtag('event', eventName, {
    ...params,
    send_to: GA_ID,
  })
}

export function trackCTAClick(ctaName: string, location: string) {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
    page_section: location,
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

export type WebVitalRating = 'good' | 'needs-improvement' | 'poor'

export interface WebVitalMetric {
  name: string
  value: number
  rating: WebVitalRating
  id: string
  navigationType: string
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
      url: typeof window !== 'undefined' ? window.location.href : '',
    }),
  }).catch(() => null)
}
