'use client'

import { useEffect, useRef, useState } from 'react'

export interface SiteColors {
  primaryColor:    string
  secondaryColor:  string
  accentLine:      string
  bgPage:          string
  bgCard:          string
  bgSection:       string
  textPrimary:     string
  textSecondary:   string
  textAccent:      string
  btnPrimaryBg:    string
  btnPrimaryText:  string
  btnOutlineBorder:string
}

export const SITE_COLORS_DEFAULTS: SiteColors = {
  primaryColor:    '#C9A96E',
  secondaryColor:  '#2D7A5F',
  accentLine:      '#C9A96E',
  bgPage:          '#F5F0E8',
  bgCard:          '#FFFFFF',
  bgSection:       '#FDFCF9',
  textPrimary:     '#2D2D2D',
  textSecondary:   '#6B6560',
  textAccent:      '#C9A96E',
  btnPrimaryBg:    '#C9A96E',
  btnPrimaryText:  '#FFFFFF',
  btnOutlineBorder:'#C9A96E',
}

interface ColorField {
  key: keyof SiteColors
  label: string
}

interface ColorGroup {
  id: string
  label: string
  description: string
  colors: ColorField[]
}

const COLOR_GROUPS: ColorGroup[] = [
  {
    id: 'identity',
    label: 'Identidade',
    description: 'Cores principais do site',
    colors: [
      { key: 'primaryColor',   label: 'Cor principal' },
      { key: 'secondaryColor', label: 'Cor secundária' },
      { key: 'accentLine',     label: 'Linha decorativa' },
    ],
  },
  {
    id: 'backgrounds',
    label: 'Fundos',
    description: 'Cores de fundo das seções',
    colors: [
      { key: 'bgPage',    label: 'Fundo da página' },
      { key: 'bgCard',    label: 'Fundo dos cards' },
      { key: 'bgSection', label: 'Seções alternadas' },
    ],
  },
  {
    id: 'texts',
    label: 'Textos',
    description: 'Cores dos textos do site',
    colors: [
      { key: 'textPrimary',   label: 'Texto principal' },
      { key: 'textSecondary', label: 'Texto secundário' },
      { key: 'textAccent',    label: 'Texto em destaque' },
    ],
  },
  {
    id: 'buttons',
    label: 'Botões',
    description: 'Cores dos botões de ação',
    colors: [
      { key: 'btnPrimaryBg',    label: 'Fundo do botão' },
      { key: 'btnPrimaryText',  label: 'Texto do botão' },
      { key: 'btnOutlineBorder',label: 'Borda outline' },
    ],
  },
]

function ColorPickerPopover({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: value,
          border: '2px solid var(--border)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title={value}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 36,
            zIndex: 50,
            background: 'var(--card)',
            borderRadius: 10,
            padding: 14,
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            minWidth: 180,
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              height: 100,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6,
              padding: 0,
            }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v)
            }}
            maxLength={7}
            style={{
              width: '100%',
              marginTop: 8,
              fontSize: 12,
              textAlign: 'center',
              padding: '4px 8px',
              fontFamily: 'monospace',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--bg-input)',
              color: 'var(--foreground)',
            }}
            placeholder="#000000"
          />
        </div>
      )}
    </div>
  )
}

export function ColorEditor({
  colors,
  onChange,
}: {
  colors: Partial<SiteColors>
  onChange: (colors: Partial<SiteColors>) => void
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  const getValue = (key: keyof SiteColors) =>
    colors[key] ?? SITE_COLORS_DEFAULTS[key]

  const handleReset = () => {
    onChange({ ...SITE_COLORS_DEFAULTS })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {COLOR_GROUPS.map((group) => (
        <div
          key={group.id}
          style={{
            background: 'var(--card)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() =>
              setOpenGroup(openGroup === group.id ? null : group.id)
            }
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--foreground)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {group.colors.map((c) => (
                  <div
                    key={c.key}
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: getValue(c.key),
                      border: '1.5px solid var(--border)',
                    }}
                  />
                ))}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{group.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                  {group.description}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 14,
                color: 'var(--muted-foreground)',
                transform: openGroup === group.id ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
                display: 'inline-block',
              }}
            >
              ›
            </span>
          </button>

          {openGroup === group.id && (
            <div
              style={{
                padding: '2px 14px 12px',
                borderTop: '1px solid var(--border)',
              }}
            >
              {group.colors.map((field) => (
                <div
                  key={field.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '0.5px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                  >
                    {field.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code
                      style={{
                        fontSize: 11,
                        color: 'var(--muted-foreground)',
                        background: 'var(--panel)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                      }}
                    >
                      {getValue(field.key)}
                    </code>
                    <ColorPickerPopover
                      value={getValue(field.key)}
                      onChange={(v) => onChange({ ...colors, [field.key]: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleReset}
        style={{
          marginTop: 4,
          padding: '7px 12px',
          fontSize: 12,
          color: 'var(--muted-foreground)',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--panel)'
          e.currentTarget.style.color = 'var(--foreground)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--muted-foreground)'
        }}
      >
        Restaurar padrões
      </button>
    </div>
  )
}
