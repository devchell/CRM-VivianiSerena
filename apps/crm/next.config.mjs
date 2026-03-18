/** @type {import('next').NextConfig} */
const nextConfig = {
  // next-auth v5 beta tem incompatibilidade com React Strict Mode (double-render)
  reactStrictMode: false,
  transpilePackages: ['@viviani/ui', '@viviani/utils', '@viviani/types'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
