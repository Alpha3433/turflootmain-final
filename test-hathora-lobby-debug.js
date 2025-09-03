#!/usr/bin/env node

// Debug script to test Hathora lobby creation
import { HathoraClient } from '@hathora/client-sdk'

const appId = 'app-d0e53e41-4d8f-4f33-91f7-87ab78b3fddb'

console.log('🔧 Hathora Lobby Debug Test')
console.log('============================')
console.log('App ID:', appId)

async function testHathoraLobby() {
  try {
    console.log('\n🚀 Initializing Hathora client...')
    const client = new HathoraClient(appId)
    console.log('✅ Client initialized successfully')
    
    console.log('\n🏠 Creating lobby...')
    const lobbyConfig = {
      visibility: 'public',
      region: 'washingtondc',
      roomConfig: {
        gameMode: 'practice',
        maxPlayers: 50,
        roomName: 'Test Lobby',
        isGlobalRoom: true
      }
    }
    
    console.log('Lobby config:', JSON.stringify(lobbyConfig, null, 2))
    
    const lobbyId = await client.createLobby(lobbyConfig, 'test-user-lobby-123')
    console.log('✅ Lobby created successfully!')
    console.log('Lobby ID:', lobbyId)
    
    console.log('\n📡 Getting lobby info...')
    const connectionInfo = await client.getLobbyInfo(lobbyId)
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
      console.error('Response body:', JSON.stringify(error.body, null, 2))
    }
    console.error('Full error:', error)
  }
}

testHathoraLobby()