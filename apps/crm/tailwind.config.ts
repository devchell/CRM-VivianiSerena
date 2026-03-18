import type { Config } from 'tailwindcss'
import baseConfig from '@viviani/config/tailwind'

const config: Config = {
  ...baseConfig,
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
}

export default config
