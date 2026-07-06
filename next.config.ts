import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.suumo.jp' },
      { protocol: 'https', hostname: '**.athome.co.jp' },
      { protocol: 'https', hostname: '**.homes.co.jp' },
    ],
  },
  serverExternalPackages: ['playwright'],
}

export default nextConfig
