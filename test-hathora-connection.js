#!/usr/bin/env node

/**
 * Hathora Connection Test Script
 * Tests if the Hathora SDK integration is actually working
 */

import { HathoraClient } from '@hathora/client-sdk'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const HATHORA_APP_ID = process.env.NEXT_PUBLIC_HATHORA_APP_ID
const HATHORA_TOKEN = process.env.HATHORA_TOKEN

console.log('🧪 HATHORA CONNECTION TEST')
console.log('=' * 50)
console.log(`📱 App ID: ${HATHORA_APP_ID || 'NOT SET'}`)
console.log(`🔑 Token: ${HATHORA_TOKEN ? 'SET (' + HATHORA_TOKEN.substring(0, 20) + '...)' : 'NOT SET'}`)
console.log('=' * 50)

async function testHathoraConnection() {
  if (!HATHORA_APP_ID) {
    console.error('❌ NEXT_PUBLIC_HATHORA_APP_ID is not set')
    return false
  }

  if (!HATHORA_TOKEN) {
    console.error('❌ HATHORA_TOKEN is not set')
    return false
  }

  try {
    console.log('🔌 Initializing Hathora client...')
    const client = new HathoraClient(HATHORA_APP_ID)
    
    console.log('✅ Hathora client initialized successfully')
    
    // Test 1: Check if we can get available regions
    console.log('\n📍 Testing available regions...')
    try {
      const regions = await client.getRegions()
      console.log(`✅ Available regions (${regions.length}):`, regions.map(r => r.id).join(', '))
    } catch (error) {
      console.error('❌ Failed to get regions:', error.message)
      return false
    }

    // Test 2: Try to create a room
    console.log('\n🏠 Testing room creation...')
    try {
      const roomConfig = {
        visibility: 'public',
        region: 'washington-dc',
        roomConfig: {
          gameMode: 'practice',
          maxPlayers: 50,
          roomName: 'Test Global Multiplayer Room'
        }
      }

      console.log('📤 Creating room with config:', roomConfig)
      const roomId = await client.createRoom(roomConfig)
      console.log(`✅ Room created successfully: ${roomId}`)

      // Test 3: Get room info
      console.log('\n📋 Testing room info retrieval...')
      try {
        const roomInfo = await client.getRoomInfo(roomId)
        console.log(`✅ Room info retrieved:`, {
          roomId: roomInfo.roomId,
          host: roomInfo.host,
          port: roomInfo.port,
          region: roomInfo.region,
          status: roomInfo.status
        })

        // Test 4: Test connection URL
        console.log('\n🌐 Testing connection URL...')
        const connectionUrl = `wss://${roomInfo.host}:${roomInfo.port}`
        console.log(`✅ Connection URL would be: ${connectionUrl}`)

        // Test 5: Clean up - destroy the test room
        console.log('\n🧹 Cleaning up test room...')
        try {
          await client.destroyRoom(roomId)
          console.log(`✅ Test room destroyed successfully`)
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup test room:', cleanupError.message)
        }

        return true

      } catch (roomInfoError) {
        console.error('❌ Failed to get room info:', roomInfoError.message)
        return false
      }

    } catch (roomCreateError) {
      console.error('❌ Failed to create room:', roomCreateError.message)
      console.error('Full error:', roomCreateError)
      return false
    }

  } catch (initError) {
    console.error('❌ Failed to initialize Hathora client:', initError.message)
    console.error('Full error:', initError)
    return false
  }
}

async function testCurrentHathoraImplementation() {
  console.log('\n🔧 TESTING CURRENT IMPLEMENTATION')
  console.log('=' * 50)
  
  try {
    // Import our current Hathora client implementation
    const { hathoraClient } = await import('./lib/hathoraClient.js')
    
    console.log('📱 Testing our hathoraClient implementation...')
    
    // Test initialization
    const initialized = await hathoraClient.initialize()
    console.log(`🔧 Initialization result: ${initialized}`)
    
    if (initialized) {
      // Test connection to global multiplayer
      console.log('🌍 Testing connectToGame for global-practice-bots...')
      
      const gameConfig = {
        userId: 'test-user-123',
        roomId: 'global-practice-bots',
        socketOptions: {
          timeout: 5000
        }
      }
      
      const connectionResult = await hathoraClient.connectToGame(gameConfig)
      console.log('✅ Connection result:', {
        hasSocket: !!connectionResult.socket,
        serverInfo: connectionResult.serverInfo,
        roomId: connectionResult.roomId
      })
      
      // Clean up
      if (connectionResult.socket) {
        connectionResult.socket.disconnect()
        console.log('🧹 Test socket disconnected')
      }
      
      return true
    } else {
      console.error('❌ Our hathoraClient failed to initialize')
      return false
    }
    
  } catch (error) {
    console.error('❌ Error testing current implementation:', error.message)
    console.error('Full error:', error)
    return false
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting Hathora connection tests...\n')
  
  const sdkTest = await testHathoraConnection()
  const implTest = await testCurrentHathoraImplementation()
  
  console.log('\n📊 TEST RESULTS SUMMARY')
  console.log('=' * 50)
  console.log(`🧪 Direct Hathora SDK Test: ${sdkTest ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`🔧 Current Implementation Test: ${implTest ? '✅ PASS' : '❌ FAIL'}`)
  
  if (sdkTest && implTest) {
    console.log('\n🎉 ALL TESTS PASSED - Hathora integration is working!')
  } else if (sdkTest && !implTest) {
    console.log('\n⚠️ SDK works but implementation has issues')
  } else if (!sdkTest && implTest) {
    console.log('\n⚠️ Implementation works but SDK test failed (might be fallback)')
  } else {
    console.log('\n❌ BOTH TESTS FAILED - Hathora integration is not working')
  }
}

runAllTests().catch(error => {
  console.error('💥 Test script failed:', error)
  process.exit(1)
})