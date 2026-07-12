/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api → backend FastAPI en desarrollo. Puerto configurable (BACKEND_PORT)
  // para que los e2e puedan apuntar al backend aislado en 8001 sin tocar la demo en 8000.
  async rewrites() {
    const backendPort = process.env.BACKEND_PORT || 8000
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${backendPort}/api/:path*`,
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
