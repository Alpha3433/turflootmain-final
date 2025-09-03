#!/usr/bin/env node

// Debug script to test Hathora room creation
import { HathoraClient } from '@hathora/client-sdk'

const appId = process.env.NEXT_PUBLIC_HATHORA_APP_ID
const token = process.env.HATHORA_TOKEN

console.log('🔧 Hathora Debug Test')
console.log('=====================')
console.log('App ID:', appId)
console.log('Token:', token ? `${token.substring(0, 20)}...` : 'Not found')

if (!appId) {
  console.error('❌ NEXT_PUBLIC_HATHORA_APP_ID not found')
  process.exit(1)
}

if (!token) {
  console.error('❌ HATHORA_TOKEN not found')
  process.exit(1)
}

async function testHathoraRoom() {
  try {
    console.log('\n🚀 Initializing Hathora client...')
    const client = new HathoraClient(appId)
    console.log('✅ Client initialized successfully')
    
    console.log('\n🏠 Creating room...')
    const roomConfig = {
      visibility: 'public',
      region: 'washingtondc',
      roomConfig: {
        gameMode: 'practice',
        maxPlayers: 50,
        roomName: 'Test Room',
        isGlobalRoom: true
      }
    }
    
    console.log('Room config:', JSON.stringify(roomConfig, null, 2))
    
    const roomId = await client.createRoom(roomConfig, 'test-user-123')
    console.log('✅ Room created successfully!')
    console.log('Room ID:', roomId)
    
    console.log('\n📡 Getting room info...')
    const connectionInfo = await client.getRoomInfo(roomId)
    console.log('✅ Connection info retrieved!')
    console.log('Host:', connectionInfo.host)
    console.log('Port:', connectionInfo.port)
    console.log('Region:', connectionInfo.region)
    
    console.log('\n🎉 SUCCESS: Hathora process should now be visible in console!')
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    if (error.status) {
      console.error('HTTP Status:', error.status)
    }
    if (error.body) {
      console.error('Response body:', error.body)
    }
    console.error('Full error:', error)
  }
}

testHathoraRoom()