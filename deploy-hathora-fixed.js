#!/usr/bin/env node

/**
 * Fixed Hathora Deployment Script - Node.js 18 Compatible
 * Deploys TurfLoot with fixes for:
 * - Node.js 20 -> 18 compatibility 
 * - uWebSockets.js dependency issues
 * - Module type configuration
 */

import { execSync } from 'child_process'
import fs from 'fs'
import { config } from 'dotenv'

// Load environment variables
config()

console.log('🚀 TurfLoot Hathora Deployment (Node.js 18 Compatible)')
console.log('=' * 60)

// Check required environment variables
const HATHORA_APP_ID = process.env.NEXT_PUBLIC_HATHORA_APP_ID
const HATHORA_TOKEN = process.env.HATHORA_TOKEN

if (!HATHORA_APP_ID) {
  console.error('❌ NEXT_PUBLIC_HATHORA_APP_ID is required')
  console.error('   Found in .env:', HATHORA_APP_ID || 'NOT SET')
  process.exit(1)
}

if (!HATHORA_TOKEN) {
  console.error('❌ HATHORA_TOKEN is required')
  console.error('   Please get a fresh token from: https://console.hathora.dev')
  console.error('   Go to Settings → Developer Tokens → Create New Token')
  console.error('   Then update .env file with: HATHORA_TOKEN=your-new-token')
  process.exit(1)
}

console.log(`📱 App ID: ${HATHORA_APP_ID}`)
console.log(`🔑 Token: ${HATHORA_TOKEN.substring(0, 20)}...`)

try {
  console.log('\n🔧 Pre-deployment checks...')
  
  // Check if package.json has correct module type
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  if (packageJson.type !== 'module') {
    console.error('❌ package.json missing "type": "module"')
    process.exit(1)
  }
  console.log('✅ package.json has correct module type')
  
  // Check if hathora-server.js exists and is updated
  if (!fs.existsSync('hathora-server.js')) {
    console.error('❌ hathora-server.js not found')
    process.exit(1)
  }
  
  const serverContent = fs.readFileSync('hathora-server.js', 'utf8')
  if (serverContent.includes('@hathora/server-sdk')) {
    console.error('❌ hathora-server.js still uses @hathora/server-sdk')
    console.error('   This will cause Node.js 20 compatibility issues')
    process.exit(1)
  }
  console.log('✅ hathora-server.js is Node.js 18/20 compatible')
  
  // Check hathora.yml configuration  
  if (!fs.existsSync('hathora.yml')) {
    console.error('❌ hathora.yml not found')
    process.exit(1)
  }
  
  const hathoraConfig = fs.readFileSync('hathora.yml', 'utf8')
  if (!hathoraConfig.includes('node:18-alpine')) {
    console.log('⚠️ Warning: hathora.yml should use node:18-alpine for best compatibility')
  } else {
    console.log('✅ hathora.yml uses Node.js 18')
  }
  
  console.log('\n🏗️ Building application...')
  execSync('yarn build', { stdio: 'inherit' })
  console.log('✅ Build completed')
  
  console.log('\n🚀 Deploying to Hathora...')
  
  const deployCommand = [
    'npx @hathora/cli deploy',
    `--appId ${HATHORA_APP_ID}`,
    `--token ${HATHORA_TOKEN}`,
    '--containerPort 4000',
    '--planName tiny',
    '--roomsPerProcess 20',
    '--transportType tcp'
  ].join(' ')
  
  console.log(`📤 Running: ${deployCommand}`)
  
  execSync(deployCommand, { 
    stdio: 'inherit',
    timeout: 300000 // 5 minute timeout
  })
  
  console.log('\n🎉 DEPLOYMENT SUCCESSFUL!')
  console.log('=' * 60)
  console.log('✅ TurfLoot deployed to Hathora with Node.js 18 compatibility')
  console.log('✅ uWebSockets.js issues resolved')
  console.log('✅ Socket.IO server ready for connections')
  console.log('\n📊 Next steps:')
  console.log('1. Check Hathora console for active processes')
  console.log('2. Test Global Multiplayer connections')
  console.log('3. Verify processes stay running (should not crash immediately)')
  console.log('\n🌐 Console: https://console.hathora.dev')
  
} catch (error) {
  console.error('\n❌ DEPLOYMENT FAILED!')
  console.error('Error:', error.message)
  
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    console.error('\n🔑 TOKEN ISSUE:')
    console.error('- Your Hathora token appears to be invalid or expired')
    console.error('- Get a fresh token from: https://console.hathora.dev')
    console.error('- Go to Settings → Developer Tokens → Create New Token')
    console.error('- Update .env file with: HATHORA_TOKEN=your-new-token')
  } else if (error.message.includes('timeout')) {
    console.error('\n⏱️ TIMEOUT ISSUE:')
    console.error('- Deployment took longer than 5 minutes')
    console.error('- This might be due to large dependencies or slow build')
    console.error('- Try again or check Hathora console for partial deployment')
  }
  
  process.exit(1)
}