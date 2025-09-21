/** @type {import('next').NextConfig} */
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
    };
    return config;
  },
  
  // Environment variables for client-side
  env: {
    COLYSEUS_ENDPOINT: process.env.COLYSEUS_ENDPOINT || 'ws://localhost:2567',
  },
  
  // Allow WebSocket connections
  async rewrites() {
    return [
      {
        source: '/colyseus/:path*',
        destination: `${process.env.COLYSEUS_ENDPOINT || 'ws://localhost:2567'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;