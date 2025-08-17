#!/bin/bash
set -e

echo "🔧 Starting Kaniko-optimized build process..."

# Set environment variables to suppress warnings
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
export YARN_IGNORE_ENGINES=true  
export YARN_IGNORE_PLATFORM=true
export YARN_IGNORE_OPTIONAL=true
export NODE_OPTIONS="--max-old-space-size=4096"

# Run yarn install with maximum warning suppression
echo "📦 Installing dependencies with warning suppression..."
yarn install --ignore-engines --ignore-platform --ignore-optional --network-timeout 600000 --frozen-lockfile --silent --production=false 2>/dev/null || true

# Run build
echo "🏗️ Building application..."
yarn build

echo "✅ Build completed successfully!"