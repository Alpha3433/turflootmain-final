#!/bin/bash
set -e

echo "🔧 Starting deployment-ready build process with maximum warning suppression..."

# Set ALL possible environment variables to suppress warnings
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

# Disable npm funding messages and warnings
export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false

echo "📦 Installing dependencies with comprehensive warning suppression..."

# Run yarn install with maximum warning suppression and filtering
yarn install \
  --ignore-engines \
  --ignore-platform \
  --ignore-optional \
  --network-timeout 600000 \
  --non-interactive \
  2>&1 | grep -v -E "(warning|Warning|bare|bs58|react@|react-dom@|Workspaces|workspace)" || true

echo "🏗️ Building application..."
yarn build

echo "✅ Build completed successfully with warning suppression!"