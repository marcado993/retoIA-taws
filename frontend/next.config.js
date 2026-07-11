/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api → backend FastAPI en desarrollo
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',

      },
    ]
  },
  // Permitir imágenes externas (logos de ETFs)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
    ],
  },
}

module.exports = nextConfig
