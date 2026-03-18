// Domain entities — pure TypeScript interfaces, zero external dependencies

export interface LeadEntity {
  id: string
  name: string
  email: string
  phone?: string
  source: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  notes?: string
  createdAt: Date
  convertedAt?: Date
}

export interface AppointmentEntity {
  id: string
  leadId: string
  googleEventId?: string
  date: Date
  serviceType: string
  status: string
  notes?: string
  createdAt: Date
}

export interface FinancialEntity {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  date: Date
  recurring: boolean
  tags: string[]
}

export interface ContentEntity {
  id: string
  section: string
  key: string
  value: Record<string, unknown>
  updatedAt: Date
  updatedBy: string
}

export interface SecurityEventEntity {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  sourceIp?: string
  details: Record<string, unknown>
  resolved: boolean
  timestamp: Date
}

export interface PageviewData {
  sessionId: string
  page: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  userAgent?: string
  ip?: string
  duration?: number
}

export interface AnalyticsEventData {
  name: string
  category: string
  label?: string
  value?: number
  page?: string
  sessionId?: string
}

export interface GoogleCalendarSlot {
  start: Date
  end: Date
  available: boolean
}
