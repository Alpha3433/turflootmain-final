#!/usr/bin/env node

/**
 * Deploy Node.js 20 Compatible Hathora Server
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, copyFileSync } from 'fs'

console.log('🚀 Deploying Node.js 20 Compatible Hathora Server')
console.log('==================================================')

try {
  // Step 1: Copy the Node.js 20 compatible server
  console.log('📁 Copying Node.js 20 compatible server...')
  copyFileSync('./hathora-server-node20.js', './hathora-server.js')
  console.log('✅ Server file copied')

  // Step 2: Copy the compatible package.json
  console.log('📦 Setting up package.json...')
  copyFileSync('./hathora-node20-package.json', './package.json')
  console.log('✅ Package.json updated')

  // Step 3: Deploy to Hathora
  console.log('🌍 Deploying to Hathora...')
  
  const deployCommand = 'hathora deploy --app-id app-d0e53e41-4d8f-4f33-91f7-87ab78b3fddb'
  
  console.log(`Running: ${deployCommand}`)
  
  const output = execSync(deployCommand, { 
    encoding: 'utf-8',
    stdio: 'pipe'
  })
  
  console.log('📤 Deploy output:')
  console.log(output)
  
  console.log('🎉 SUCCESS: Node.js 20 compatible server deployed!')
  console.log('✅ Your Hathora processes should now start without uWebSockets.js errors')
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message)
  
  if (error.stdout) {
    console.log('📤 Deploy stdout:')
    console.log(error.stdout.toString())
  }
  
  if (error.stderr) {
    console.error('📥 Deploy stderr:')
    console.error(error.stderr.toString())
  }
  
  process.exit(1)
}