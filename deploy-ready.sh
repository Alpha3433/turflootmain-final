#!/bin/bash
set -e

echo "🔧 Pre-deployment setup with comprehensive warning elimination..."

# Set ALL environment variables to suppress warnings
export YARN_ENABLE_WORKSPACES=false
export YARN_DISABLE_WORKSPACES=true
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
export YARN_IGNORE_ENGINES=true
export YARN_IGNORE_PLATFORM=true
export YARN_IGNORE_OPTIONAL=true
export YARN_SILENT=true
export NODE_OPTIONS="--max-old-space-size=4096"
export DISABLE_OPENCOLLECTIVE=true
export ADBLOCK=true
export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false

# Clean any existing build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Install dependencies with comprehensive filtering
echo "📦 Installing dependencies with maximum warning suppression..."
yarn install \
  --ignore-engines \
  --ignore-platform \
  --ignore-optional \
  --network-timeout 600000 \
  --non-interactive \
  --frozen-lockfile \
  2>&1 | grep -v -E "(warning|Warning|bare|bs58@|react@\^16|react@\^17|react-dom@\^16|react-dom@\^17|Workspaces|workspace|engine.*bare)" || true

# Verify installation
if [ ! -d "node_modules" ]; then
  echo "❌ Node modules installation failed"
  exit 1
fi

# Build the application
echo "🏗️ Building application with optimized settings..."
NODE_ENV=production yarn build

echo "✅ Pre-deployment setup completed successfully!"