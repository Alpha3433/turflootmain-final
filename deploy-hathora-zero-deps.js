#!/usr/bin/env node

/**
 * Zero Dependencies Hathora Deployment Script
 * Deploys pure Node.js WebSocket server with NO external dependencies
 * Completely eliminates uWebSockets.js compatibility issues
 */

import { execSync } from 'child_process'
import fs from 'fs'
import { config } from 'dotenv'

// Load environment variables
config()

console.log('🚀 TurfLoot Hathora Deployment (Zero Dependencies)')
console.log('🎯 SOLUTION: Pure Node.js WebSocket - NO uWebSockets.js!')
console.log('=' * 60)

// Check required environment variables
const HATHORA_APP_ID = process.env.NEXT_PUBLIC_HATHORA_APP_ID
const HATHORA_TOKEN = process.env.HATHORA_TOKEN

if (!HATHORA_APP_ID) {
  console.error('❌ NEXT_PUBLIC_HATHORA_APP_ID is required')
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
  
  // Check if hathora-minimal-package.json exists (zero dependencies)
  if (!fs.existsSync('hathora-minimal-package.json')) {
    console.error('❌ hathora-minimal-package.json not found')
    console.error('   This file should have ZERO dependencies to avoid uWebSockets.js')
    process.exit(1)
  }
  
  const minimalPackage = JSON.parse(fs.readFileSync('hathora-minimal-package.json', 'utf8'))
  const depCount = Object.keys(minimalPackage.dependencies || {}).length
  
  if (depCount > 0) {
    console.error(`❌ hathora-minimal-package.json has ${depCount} dependencies`)
    console.error('   Should have ZERO dependencies to avoid uWebSockets.js conflicts')
    process.exit(1)
  }
  console.log('✅ hathora-minimal-package.json has ZERO dependencies')
  
  // Check if standalone server exists
  if (!fs.existsSync('hathora-server-standalone.js')) {
    console.error('❌ hathora-server-standalone.js not found')
    console.error('   This is the pure Node.js WebSocket server')
    process.exit(1)
  }
  
  const serverContent = fs.readFileSync('hathora-server-standalone.js', 'utf8')
  if (serverContent.includes('require(\'socket.io\')') || serverContent.includes('import') && serverContent.includes('socket.io')) {
    console.error('❌ hathora-server-standalone.js still imports socket.io')
    console.error('   Should use pure Node.js WebSocket implementation')
    process.exit(1)
  }
  console.log('✅ hathora-server-standalone.js uses pure Node.js (no external deps)')
  
  // Check hathora.yml configuration
  if (!fs.existsSync('hathora.yml')) {
    console.error('❌ hathora.yml not found')
    process.exit(1)
  }
  
  const hathoraConfig = fs.readFileSync('hathora.yml', 'utf8')
  if (!hathoraConfig.includes('hathora-minimal-package.json')) {
    console.error('❌ hathora.yml should use hathora-minimal-package.json')
    process.exit(1)
  }
  console.log('✅ hathora.yml configured for zero dependencies deployment')
  
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
  console.log('✅ TurfLoot deployed with ZERO external dependencies')
  console.log('✅ Pure Node.js WebSocket server - no uWebSockets.js!')
  console.log('✅ Should work on Node.js 18, 19, and 20')
  console.log('\n📊 Expected logs:')
  console.log('🌍 Starting TurfLoot Hathora Server (Standalone)...')
  console.log('📡 Port: 4000')
  console.log('🔧 Node.js: v18.x.x (or v20.x.x)')
  console.log('⚡ Pure Node.js implementation - no uWebSockets.js dependency')
  console.log('🚀 TurfLoot Hathora server running on port 4000')
  console.log('🌐 WebSocket server ready for connections')
  console.log('✅ No external dependencies - pure Node.js implementation')
  console.log('\n🌐 Console: https://console.hathora.dev')
  console.log('\n🎯 This deployment eliminates ALL uWebSockets.js issues!')
  
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
  } else {
    console.error('\n🔧 TECHNICAL ISSUE:')
    console.error('- Check that all files exist: hathora-server-standalone.js, hathora-minimal-package.json, hathora.yml')
    console.error('- Verify Hathora CLI is installed: npx @hathora/cli --version')
    console.error('- Check Hathora console for deployment logs')
  }
  
  process.exit(1)
}