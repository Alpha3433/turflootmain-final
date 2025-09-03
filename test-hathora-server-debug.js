#!/usr/bin/env node

// Debug script to test Hathora server SDK
import { HathoraCloud } from '@hathora/server-sdk'

const appId = 'app-d0e53e41-4d8f-4f33-91f7-87ab78b3fddb'
const token = 'hathora_org_st_iwsLrVZuxuUTGOeApCj0bd46TCx8ikPclkiRhgNGdL2q6EENG8_9e2231e2495ef4db79c5768c1df31eae'

console.log('🔧 Hathora Server SDK Debug Test')
console.log('==================================')
console.log('App ID:', appId)
console.log('Token:', token ? `${token.substring(0, 20)}...` : 'Not found')

async function testHathoraServer() {
  try {
    console.log('\n🚀 Initializing Hathora server SDK...')
    const hathora = new HathoraCloud({
      security: {
        hathoraDevToken: token,
      },
      appId: appId,
    })
    console.log('✅ Server SDK initialized successfully')
    
    console.log('\n📋 Getting app info...')
    const appInfo = await hathora.appsV1.getAppInfo()
    console.log('✅ App info retrieved!')
    console.log('App Name:', appInfo.appName)
    console.log('Created At:', appInfo.createdAt)
    
    console.log('\n🏠 Creating room via server SDK...')
    const roomResult = await hathora.roomsV2.createRoom({
      appId: appId,
      createRoomRequest: {
        region: 'washingtondc',
        roomConfig: JSON.stringify({
          gameMode: 'practice',
          maxPlayers: 50,
          roomName: 'Server SDK Test Room'
        })
      }
    })
    
    console.log('✅ Room created successfully!')
    console.log('Room ID:', roomResult.roomId)
    console.log('Status:', roomResult.status)
    
    console.log('\n📡 Getting connection info...')
    const connectionInfo = await hathora.roomsV2.getConnectionInfo({
      appId: appId,
      roomId: roomResult.roomId
    })
    
    console.log('✅ Connection info retrieved!')
    console.log('Host:', connectionInfo.host)
    console.log('Port:', connectionInfo.port)
    console.log('Transport Type:', connectionInfo.transportType)
    
    console.log('\n🎉 SUCCESS: Hathora process should now be visible in console!')
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    if (error.statusCode) {
      console.error('HTTP Status:', error.statusCode)
    }
    if (error.body) {
      console.error('Response body:', error.body)
    }
    console.error('Full error:', error)
  }
}

testHathoraServer()