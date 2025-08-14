#!/bin/bash

# Production Build Script for TurfLoot
set -e

echo "🚀 Starting TurfLoot production build..."

# Set production environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf build.log

# Install dependencies with exact versions
echo "📦 Installing dependencies..."
npm ci --production=false --silent

# Run the build
echo "🔨 Building application..."
NODE_OPTIONS='--max-old-space-size=4096' npm run build

echo "✅ Build completed successfully!"

# Verify build output
if [ -d ".next" ]; then
    echo "✅ Build output found in .next directory"
    ls -la .next/
else
    echo "❌ Build output not found!"
    exit 1
fi

echo "🎉 TurfLoot is ready for production deployment!"