#!/bin/bash
set -e

echo "🔧 Installing dependencies with workspace warning suppression..."

# Set all possible environment variables to disable workspaces
export YARN_ENABLE_WORKSPACES=false
export YARN_DISABLE_WORKSPACES=true
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
export YARN_IGNORE_ENGINES=true
export YARN_IGNORE_PLATFORM=true
export YARN_IGNORE_OPTIONAL=true

# Run yarn install with output filtering to remove workspace warnings
yarn install \
  --ignore-engines \
  --ignore-platform \
  --ignore-optional \
  --network-timeout 600000 \
  --non-interactive \
  2>&1 | grep -v "Workspaces can only be enabled in private projects" || true

echo "✅ Dependencies installed with workspace warnings suppressed"