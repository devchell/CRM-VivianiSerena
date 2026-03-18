export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export const LEAD_STATUSES: readonly LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const

export type LeadSource =
  | 'organic'
  | 'instagram'
  | 'facebook'
  | 'google_ads'
  | 'referral'
  | 'whatsapp'
  | 'other'

export const LEAD_SOURCES: readonly LeadSource[] = [
  'organic',
  'instagram',
  'facebook',
  'google_ads',
  'referral',
  'whatsapp',
  'other',
] as const

export const CRM_MODULES = [
  'dashboard',
  'leads',
  'agenda',
  'financeiro',
  'editar-site',
  'seguranca',
] as const

export type CrmModule = (typeof CRM_MODULES)[number]

export interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  source: LeadSource
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  status: LeadStatus
  notes?: string
  createdAt: Date
  convertedAt?: Date
}

export interface CreateLeadDto {
  name: string
  email: string
  phone?: string
  source: LeadSource
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  notes?: string
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  status?: LeadStatus
  convertedAt?: Date
}

export type ServiceType =
  | 'coaching_individual'
  | 'coaching_group'
  | 'workshop'
  | 'mentoring'
  | 'consultation'

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface Appointment {
  id: string
  leadId: string
  googleEventId?: string
  date: Date
  serviceType: ServiceType
  status: AppointmentStatus
  notes?: string
}

export interface AppointmentListItem {
  id: string
  leadId: string
  leadName: string
  leadEmail: string
  leadPhone?: string | null
  startTime: string
  endTime: string
  serviceType: ServiceType
  status: AppointmentStatus
  notes?: string | null
}

export interface CreateAppointmentDto {
  leadId: string
  date: string
  serviceType: ServiceType
  notes?: string
  duration?: number
}
