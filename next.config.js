const path = require('path')
const fs = require('fs')

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
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
    // Disable Critters to avoid Kaniko/webpack css optimization issues during prod builds
    optimizeCss: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    // Explicitly expose environment variables to the frontend
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_TESTING_MODE: process.env.NEXT_PUBLIC_TESTING_MODE,
    NEXT_PUBLIC_MOCK_WALLET_BALANCE: process.env.NEXT_PUBLIC_MOCK_WALLET_BALANCE,
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
      };
    }

    // Handle specific module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@walletconnect/jsonrpc-ws-connection': false,
      'rpc-websockets': false,
      'require-addon': false,
      'bare-os': false,
    };

    // Handle missing files and modules
    config.module.rules.push({
      test: /\.mjs$/,
      type: 'javascript/auto',
    });

    // Ignore problematic modules during build
    config.externals = [
      ...(config.externals || []),
      {
        'require-addon': 'commonjs require-addon',
        'bare-os': 'commonjs bare-os',
        'critters': 'critters',
      },
    ];

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