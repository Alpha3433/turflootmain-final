const path = require('path')
const fs = require('fs')

// Disable telemetry and analytics
process.env.NEXT_TELEMETRY_DISABLED = '1'
process.env.DISABLE_OPENCOLLECTIVE = 'true'

// Load environment variables from .env file explicitly
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').config({ path: envPath })
  if (envConfig.error) {
    console.warn('Warning: Could not load .env file:', envConfig.error)
  } else {
    console.log('✅ Loaded environment variables from .env file')
  }
}

const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  images: {
    unoptimized: true,
    domains: [],
    dangerouslyAllowSVG: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
    optimizeCss: false,
    outputFileTracingRoot: undefined,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  distDir: '.next',
  trailingSlash: false,
  env: {
    // Explicitly expose environment variables to the frontend
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_TESTING_MODE: process.env.NEXT_PUBLIC_TESTING_MODE,
    NEXT_PUBLIC_MOCK_WALLET_BALANCE: process.env.NEXT_PUBLIC_MOCK_WALLET_BALANCE,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  },
  webpack(config, { dev, isServer }) {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        sideEffects: false,
      };
    }

    // Handle WebSocket dependencies for production builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        ws: false,
        child_process: false,
        'require-addon': false,
        'bare-os': false,
        // Additional fallbacks for WalletConnect
        'node:crypto': false,
        'node:http': false,
        'node:https': false,
        'node:net': false,
        'node:tls': false,
        'node:url': false,
        'node:zlib': false,
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:stream': false,
      };
    }

    // Handle specific module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@walletconnect/jsonrpc-ws-connection': false,
      // Fix WalletConnect nested dependency issues
      '@walletconnect/universal-provider': path.resolve(__dirname, 'node_modules/@walletconnect/universal-provider/dist/index.umd.js'),
      '@walletconnect/ethereum-provider': path.resolve(__dirname, 'node_modules/@walletconnect/ethereum-provider/dist/index.umd.js'),
      'rpc-websockets': false,
      'require-addon': false,
      'bare-os': false,
      // Additional aliases for problematic modules
      'lokijs': false,
      'pouchdb-browser': false,
      'react-native': false,
    };

    // Handle missing files and modules
    config.module.rules.push({
      test: /\.mjs$/,
      type: 'javascript/auto',
    });

    // Ignore problematic modules during build to prevent them from being bundled
    config.externals = [
      ...(config.externals || []),
      // Only externalize for server-side, not client-side
      ...(isServer ? [
        {
          'require-addon': 'commonjs require-addon',
          'bare-os': 'commonjs bare-os',
          'critters': 'critters',
        }
      ] : []),
    ];

    // Remove the problematic custom plugin
    // config.plugins.push(...)

    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;