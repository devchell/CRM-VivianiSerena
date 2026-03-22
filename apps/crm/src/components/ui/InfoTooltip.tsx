'use client'

import { useState } from 'react'

interface InfoTooltipProps {
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function InfoTooltip({ text, position = 'top' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold text-charcoal-400 transition-colors hover:text-rose-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-1 dark:text-charcoal-300"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label={text}
        aria-describedby={visible ? 'info-tooltip' : undefined}
      >
        ⓘ
      </button>
      {visible && (
        <span
          id="info-tooltip"
          role="tooltip"
          className={`absolute z-50 w-64 rounded-md border border-[#3a3835] bg-[#1c1b1a] px-3 py-2 text-xs leading-relaxed text-charcoal-100 shadow-xl dark:border-[#3a3835] dark:bg-[#1c1b1a] ${positionClasses[position]}`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
