'use client'

export interface FinancialColors {
  income: { bg: string; text: string; border: string; bar: string }
  expense: { bg: string; text: string; border: string; bar: string }
  profit: { bg: string; text: string; border: string; bar: string }
  neutral: { bg: string; text: string }
  area: { income: string; expense: string }
  pie: string[]
}

export function useFinancialColors(): FinancialColors {
  return {
    income: {
      bg: 'var(--fin-income-bg)',
      text: 'var(--fin-income-text)',
      border: 'var(--fin-income-border)',
      bar: 'var(--fin-income-bar)',
    },
    expense: {
      bg: 'var(--fin-expense-bg)',
      text: 'var(--fin-expense-text)',
      border: 'var(--fin-expense-border)',
      bar: 'var(--fin-expense-bar)',
    },
    profit: {
      bg: 'var(--fin-profit-bg)',
      text: 'var(--fin-profit-text)',
      border: 'var(--fin-profit-border)',
      bar: 'var(--fin-profit-bar)',
    },
    neutral: {
      bg: 'var(--fin-neutral-bg)',
      text: 'var(--fin-neutral-text)',
    },
    area: {
      income: 'var(--fin-area-income)',
      expense: 'var(--fin-area-expense)',
    },
    pie: [
      '#7acb8f', '#8ecae6', '#f6ad55', '#f28b82',
      '#a5d8ff', '#c2cedd', '#dfe7f1', '#f9d3b4',
    ],
  }
}
