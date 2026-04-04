import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // next-auth v5 beta tem incompatibilidade com React Strict Mode (double-render)
  reactStrictMode: false,
  output: 'standalone',
  transpilePackages: ['@viviani/ui', '@viviani/utils', '@viviani/types'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
