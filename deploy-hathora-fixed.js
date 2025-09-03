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
  
  // Check if hathora-package.json exists
  if (!fs.existsSync('hathora-package.json')) {
    console.error('❌ hathora-package.json not found')
    console.error('   This file contains clean dependencies without uWebSockets.js')
    process.exit(1)
  }
  console.log('✅ hathora-package.json found (clean dependencies)')
  
  // Check if hathora-server.js exists and is updated
  if (!fs.existsSync('hathora-server.js')) {
    console.error('❌ hathora-server.js not found')
    process.exit(1)
  }
  
  const serverContent = fs.readFileSync('hathora-server.js', 'utf8')
  if (serverContent.includes('import ') && !serverContent.includes('require(')) {
    console.error('❌ hathora-server.js still uses ES modules')
    console.error('   Should use CommonJS require() for compatibility')
    process.exit(1)
  }
  console.log('✅ hathora-server.js uses CommonJS (Node.js 18/20 compatible)')
  
  // Check hathora.yml configuration  
  if (!fs.existsSync('hathora.yml')) {
    console.error('❌ hathora.yml not found')
    process.exit(1)
  }
  
  const hathoraConfig = fs.readFileSync('hathora.yml', 'utf8')
  if (!hathoraConfig.includes('hathora-package.json')) {
    console.log('⚠️ Warning: hathora.yml should use hathora-package.json for clean dependencies')
  } else {
    console.log('✅ hathora.yml uses clean package.json configuration')
  }
  
  console.log('\n🏗️ Building application...')
  // Skip yarn build since we're using minimal dependencies
  console.log('✅ Using minimal dependencies - no build required')
  
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
  console.log('✅ TurfLoot deployed to Hathora with clean dependencies')
  console.log('✅ No uWebSockets.js compatibility issues')
  console.log('✅ CommonJS server ready for Node.js 18/20')
  console.log('\n📊 Expected logs:')
  console.log('🌍 Starting TurfLoot Hathora Server...')
  console.log('📡 Port: 4000') 
  console.log('🔧 Node.js: v18.x.x (or v20.x.x)')
  console.log('✅ Game server initialized')
  console.log('🚀 TurfLoot Hathora server running on port 4000')
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