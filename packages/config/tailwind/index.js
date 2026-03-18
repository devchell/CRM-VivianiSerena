/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAF7F2',
          50: '#FDFCFA',
          100: '#FAF7F2',
          200: '#F5EFE6',
          300: '#EDE3D4',
          400: '#E0D0B8',
          500: '#D0B99A',
        },
        'rose-gold': {
          DEFAULT: '#C9967A',
          50: '#F9F0EB',
          100: '#F2DDD3',
          200: '#E5BAA7',
          300: '#D9977B',
          400: '#C9967A',
          500: '#B5785A',
          600: '#9B5E43',
          700: '#7D4833',
        },
        charcoal: {
          DEFAULT: '#2C2C2C',
          50: '#F5F5F5',
          100: '#E8E8E8',
          200: '#D0D0D0',
          300: '#A8A8A8',
          400: '#787878',
          500: '#505050',
          600: '#3C3C3C',
          700: '#2C2C2C',
          800: '#1E1E1E',
          900: '#141414',
        },
        blush: {
          DEFAULT: '#F2E8E4',
          50: '#FBF8F7',
          100: '#F7F1EE',
          200: '#F2E8E4',
          300: '#E8D5CE',
          400: '#D9BBB1',
          500: '#C9A095',
        },
        sage: {
          DEFAULT: '#8B9E8A',
          50: '#F2F5F2',
          100: '#E4EBE4',
          200: '#C8D6C7',
          300: '#ABBCAA',
          400: '#8B9E8A',
          500: '#6E836D',
          600: '#556754',
          700: '#404E3F',
        },
      },
      fontFamily: {
        heading: ['var(--font-playfair)', ...defaultTheme.fontFamily.serif],
        body: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
