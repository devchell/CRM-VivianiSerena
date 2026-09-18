import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FAF7F2', 50: '#FDFCFA', 100: '#FAF7F2', 200: '#F5EFE6', 300: '#EDE3D4' },
        'rose-gold': { DEFAULT: '#9B5E43', 400: '#9B5E43', 500: '#7D4833', 600: '#6E3F2C', 700: '#5A3225' },
        charcoal: { DEFAULT: '#2C2C2C', 400: '#787878', 500: '#505050', 600: '#3C3C3C', 700: '#2C2C2C' },
        blush: { DEFAULT: '#F2E8E4', 100: '#F7F1EE', 200: '#F2E8E4', 300: '#E8D5CE' },
        sage: { DEFAULT: '#8B9E8A', 400: '#8B9E8A', 500: '#6E836D' },
      },
      fontFamily: {
        heading: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        body: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.25s ease-out',
        'accordion-up': 'accordion-up 0.25s ease-in',
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}

export default config
