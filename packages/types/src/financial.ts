export type TransactionType = 'income' | 'expense'

export type FinancialCategory =
  | 'coaching_revenue'
  | 'workshop_revenue'
  | 'mentoring_revenue'
  | 'marketing'
  | 'tools_software'
  | 'education'
  | 'office'
  | 'taxes'
  | 'other'

export const FINANCIAL_CATEGORY_LABELS: Record<FinancialCategory, string> = {
  coaching_revenue: 'Sessao individual',
  workshop_revenue: 'Pacotes e workshops',
  mentoring_revenue: 'Avaliacao e consultoria',
  marketing: 'Marketing',
  tools_software: 'Ferramentas e software',
  education: 'Educacao',
  office: 'Estrutura e espaco',
  taxes: 'Impostos',
  other: 'Outros',
}

export const FINANCIAL_CATEGORIES_BY_TYPE: Record<
  TransactionType,
  ReadonlyArray<{ value: FinancialCategory; label: string }>
> = {
  income: [
    { value: 'coaching_revenue', label: FINANCIAL_CATEGORY_LABELS.coaching_revenue },
    { value: 'workshop_revenue', label: FINANCIAL_CATEGORY_LABELS.workshop_revenue },
    { value: 'mentoring_revenue', label: FINANCIAL_CATEGORY_LABELS.mentoring_revenue },
    { value: 'other', label: FINANCIAL_CATEGORY_LABELS.other },
  ],
  expense: [
    { value: 'office', label: FINANCIAL_CATEGORY_LABELS.office },
    { value: 'tools_software', label: FINANCIAL_CATEGORY_LABELS.tools_software },
    { value: 'marketing', label: FINANCIAL_CATEGORY_LABELS.marketing },
    { value: 'education', label: FINANCIAL_CATEGORY_LABELS.education },
    { value: 'taxes', label: FINANCIAL_CATEGORY_LABELS.taxes },
    { value: 'other', label: FINANCIAL_CATEGORY_LABELS.other },
  ],
}

export interface Financial {
  id: string
  type: TransactionType
  category: FinancialCategory
  amount: number
  description: string
  date: Date
  recurring: boolean
  tags: string[]
}

export interface CreateFinancialDto {
  type: TransactionType
  category: FinancialCategory
  amount: number
  description: string
  date: Date
  recurring?: boolean
  tags?: string[]
}

export interface FinancialSummary {
  income: number
  expenses: number
  profit: number
  previousIncome: number
  previousExpenses: number
  previousProfit: number
  averageTicket: number
  convertedLeadsInPeriod: number
  categories: typeof FINANCIAL_CATEGORIES_BY_TYPE
}

export interface FinancialChartPoint {
  label: string
  bucketStart: string
  income: number
  expenses: number
  profit: number
}

export interface FinancialCharts {
  monthly: FinancialChartPoint[]
  expensesByCategory: Array<{ category: FinancialCategory; label: string; amount: number }>
}
