#!/bin/bash
set -e

echo "🚀 Starting production-ready Kaniko build with Yarn 4.x..."

# Ensure corepack is enabled for correct Yarn version
corepack enable

# Verify we're using the correct Yarn version
YARN_VERSION=$(yarn --version)
echo "✅ Using Yarn version: $YARN_VERSION"

if [[ "$YARN_VERSION" != "4.3.1" ]]; then
    echo "❌ ERROR: Expected Yarn 4.3.1, got $YARN_VERSION"
    echo "Run 'corepack enable' to fix this issue"
    exit 1
fi

# Set environment variables for clean builds
export NODE_OPTIONS="--max-old-space-size=4096"
export YARN_ENABLE_WORKSPACES=false

echo "📦 Installing dependencies with Yarn 4.x..."

# Use Yarn 4.x syntax (no more --ignore-engines, --ignore-platform flags)
yarn install --immutable

echo "🏗️ Building application..."
yarn build

echo "✅ Build completed successfully!"
echo ""
echo "🐳 Ready for Kaniko deployment with:"
echo "   - Yarn 4.3.1 (correct version)"
echo "   - Clean dependency resolution"
echo "   - No engine/workspace warnings"
echo "   - Proper lockfile handling"