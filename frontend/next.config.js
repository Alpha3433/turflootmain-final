/** @type {import('next').NextConfig} */
const rawColyseusEndpoint =
  process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT ||
  process.env.COLYSEUS_ENDPOINT ||
  'ws://localhost:2567'

const normalizeEndpointForRewrite = (endpoint) => {
  if (!endpoint) {
    return 'http://localhost:2567'
  }

  const trimmed = endpoint.replace(/\/$/, '')

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^ws/i, 'http')
  }

  return `http://${trimmed}`
}

const nextConfig = {
  // Optimize for static export if needed (Vercel/Netlify deployment)
  output: 'standalone',

  // Handle WebSocket connections for Colyseus
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
    }
    return config
  },

  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_COLYSEUS_ENDPOINT: rawColyseusEndpoint,
  },

  // Allow WebSocket connections by proxying through HTTP(S)
  async rewrites() {
    const destination = `${normalizeEndpointForRewrite(rawColyseusEndpoint)}/:path*`

    return [
      {
        source: '/colyseus/:path*',
        destination,
      },
    ]
  },
}

module.exports = nextConfig
