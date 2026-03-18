export const FINANCIAL_CATEGORIES = {
  income: [
    { value: 'coaching_revenue', label: 'Sessão Individual' },
    { value: 'workshop_revenue', label: 'Pacote de Sessões' },
    { value: 'mentoring_revenue', label: 'Avaliação / Consulta' },
    { value: 'other', label: 'Outros' },
  ],
  expense: [
    { value: 'office', label: 'Aluguel (Mooca / Santo André)' },
    { value: 'tools_software', label: 'Manutenção Laser / Equipamentos' },
    { value: 'other', label: 'Insumos' },
    { value: 'marketing', label: 'Marketing Digital' },
    { value: 'education', label: 'Cursos e Capacitação' },
    { value: 'taxes', label: 'Impostos MEI' },
    { value: 'tools_software', label: 'Software / Assinaturas' },
  ],
} as const

export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard:stats',
  ANALYTICS_30D: 'analytics:30d',
  FINANCIAL_SUMMARY: 'financial:summary',
  SECURITY_STATS: 'security:stats',
} as const

export const UPLOAD = {
  MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  ALLOWED_TYPES: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  DIR: process.env.UPLOAD_DIR || './uploads',
  THUMB_WIDTH: 400,
  FULL_WIDTH: 1200,
  BLUR_SIZE: 8,
} as const

export const BRUTE_FORCE = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
  WINDOW_MINUTES: 15,
} as const

export const BOT_USER_AGENTS = [
  'python-requests',
  'go-http-client',
  'curl/',
  'wget/',
  'scrapy',
  'nikto',
  'sqlmap',
  'nmap',
  'masscan',
] as const

export const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
  /(--|;|\/\*|\*\/)/,
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  /'(\s*)(OR|AND)(\s*)'.*='.*'/i,
] as const
