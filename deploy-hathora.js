#!/usr/bin/env node

// TurfLoot Hathora Deployment Script
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

console.log('🚀 TurfLoot Hathora Deployment Starting...')

// Check if Hathora CLI is installed
try {
  execSync('npx @hathora/cli --version', { stdio: 'ignore' })
  console.log('✅ Hathora CLI is available')
} catch (error) {
  console.log('📦 Installing Hathora CLI...')
  execSync('npm install -g @hathora/cli', { stdio: 'inherit' })
}

// Check for required environment variables
const requiredEnvVars = [
  'HATHORA_TOKEN',
  'NEXT_PUBLIC_HATHORA_APP_ID'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error('\nPlease set these variables and try again.')
  console.error('You can get these from your Hathora dashboard at https://console.hathora.dev')
  process.exit(1)
}

try {
  // Build the application for production
  console.log('🏗️ Building TurfLoot for production...')
  execSync('yarn build', { stdio: 'inherit' })
  
  // Create production optimized build
  console.log('📦 Creating Hathora deployment package...')
  
  // Deploy to Hathora
  console.log('🌍 Deploying to Hathora global servers...')
  execSync('npx @hathora/cli deploy --config hathora.yml', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      HATHORA_TOKEN: process.env.HATHORA_TOKEN
    }
  })
  
  console.log('✅ TurfLoot deployed successfully to Hathora!')
  console.log('🌍 Your game is now available globally!')
  
  // Get deployment info
  try {
    const appInfo = execSync('npx @hathora/cli app info', { 
      encoding: 'utf-8',
      env: {
        ...process.env,
        HATHORA_TOKEN: process.env.HATHORA_TOKEN
      }
    })
    console.log('\n📊 Deployment Info:')
    console.log(appInfo)
  } catch (infoError) {
    console.log('ℹ️ Could not fetch deployment info, but deployment was successful')
  }
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message)
  process.exit(1)
}

console.log('\n🎮 Next Steps:')
console.log('1. Update your .env file with the Hathora App ID')
console.log('2. Test your global multiplayer servers')
console.log('3. Monitor your game at https://console.hathora.dev')
console.log('\n🌍 Players worldwide can now join your TurfLoot servers!')