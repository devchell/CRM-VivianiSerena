'use client'

import { useState, useRef } from 'react'

interface InfoTooltipProps {
  title: string
  description?: string
}

export function InfoTooltip({ title, description }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [flipLeft, setFlipLeft] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  function handleShow() {
    setVisible(true)
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setFlipLeft(rect.left > window.innerWidth / 2)
    }
  }

  return (
    <span
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={handleShow}
        onMouseLeave={() => setVisible(false)}
        onFocus={handleShow}
        onBlur={() => setVisible(false)}
        aria-label={`Info: ${title}`}
        style={{
          width: 15,
          height: 15,
          borderRadius: '50%',
          border: '1px solid currentColor',
          background: 'transparent',
          color: 'var(--muted-foreground, #8A8078)',
          fontSize: 9,
          fontWeight: 700,
          cursor: 'help',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: visible ? 1 : 0.35,
          transition: 'opacity 0.15s ease',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        i
      </button>

      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: '100%',
            ...(flipLeft ? { right: 0 } : { left: 0 }),
            marginTop: 4,
            background: '#1A1A18',
            color: '#F0EDE8',
            borderRadius: 6,
            padding: '8px 10px',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
            minWidth: 160,
            maxWidth: 220,
            whiteSpace: 'normal',
          }}
        >
          <span style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: description ? 3 : 0 }}>
            {title}
          </span>
          {description && (
            <span style={{ display: 'block', fontSize: 11, lineHeight: 1.5, opacity: 0.8 }}>
              {description}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
