#!/bin/bash
set -e

echo "🔍 Running CI sanity checks..."

# 1) No mixed lockfiles
if [ -f package-lock.json ]; then
    echo "❌ Do not commit package-lock.json when using Yarn"
    exit 1
fi

# 2) If workspaces are declared, root must be private
node -e "const p=require('./package.json'); if(p.workspaces && !p.private){console.error('❌ Root must be private when using workspaces'); process.exit(1)}"

echo "✅ All sanity checks passed"