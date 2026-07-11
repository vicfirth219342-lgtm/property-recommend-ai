import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.suumo.jp' },
      { protocol: 'https', hostname: '**.athome.co.jp' },
      { protocol: 'https', hostname: '**.homes.co.jp' },
    ],
  },
  serverExternalPackages: ['playwright', 'playwright-extra', 'puppeteer-extra-plugin-stealth'],
}

export default nextConfig
