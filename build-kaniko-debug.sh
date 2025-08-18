#!/bin/bash
set -e

echo "🔍 DIAGNOSTIC: Starting Kaniko debug build process..."

# Check local environment first
echo "=== LOCAL ENVIRONMENT CHECK ==="
echo "Yarn version: $(yarn --version)"
echo "Node version: $(node --version)"
echo "Current directory: $(pwd)"
echo "Yarn lockfile exists: $(test -f yarn.lock && echo 'YES' || echo 'NO')"
echo "Yarn directory exists: $(test -d .yarn && echo 'YES' || echo 'NO')"

if [ -f yarn.lock ]; then
    echo "Lockfile size: $(wc -l < yarn.lock) lines"
    echo "Lockfile first 10 lines:"
    head -10 yarn.lock
fi

echo ""
echo "=== YARN CONFIGURATION ==="
yarn config list || true

echo ""
echo "=== PACKAGE.JSON PACKAGEMANAGER ==="
grep -A1 -B1 "packageManager" package.json || echo "No packageManager field found"

echo ""
echo "🐳 Building with diagnostic Dockerfile..."

# Build using the debug Dockerfile
docker build -f Dockerfile.debug -t turfloot-debug:latest . 2>&1 | tee kaniko-debug.log

echo ""
echo "✅ Debug build completed. Check kaniko-debug.log for detailed output."
echo ""
echo "🔍 Key things to look for in the log:"
echo "1. Yarn version mismatch (should be 4.3.1, not 1.22.22)"
echo "2. Missing yarn.lock file"
echo "3. Workspace warnings despite disable attempts"
echo "4. Engine validation errors for require-addon and bare-os"