// Debug script to test the WebSocket connection issue
// This script will help us identify where the room ID is getting converted to 'true'

const testHathoraRoomCreation = async () => {
  console.log('🔍 DEBUGGING WEBSOCKET CONNECTION ISSUE')
  console.log('='*50)
  
  try {
    // Step 1: Test direct Hathora client room creation
    console.log('Step 1: Testing direct Hathora room creation...')
    
    const { default: hathoraClient } = await import('./lib/hathoraClient.js')
    
    const isInitialized = await hathoraClient.initialize()
    if (!isInitialized) {
      throw new Error('Failed to initialize Hathora client')
    }
    
    console.log('✅ Hathora client initialized')
    
    // Create a test room
    const result = await hathoraClient.createPaidRoom(0.01, null, 'US-East-1')
    console.log('📊 Direct room creation result:', result)
    console.log('📊 Room ID type:', typeof result.roomId)
    console.log('📊 Room ID value:', result.roomId)
    
    // Step 2: Test initializeHathoraGame function
    console.log('\nStep 2: Testing initializeHathoraGame function...')
    
    const serverData = {
      regionId: 'US-East-1',
      region: 'US-East-1',
      entryFee: 0.01,
      name: 'Test Room',
      stake: 0.01
    }
    
    const initializeHathoraGame = async (serverData) => {
      console.log('🚀 Initializing 100% Hathora multiplayer game...')
      console.log('📊 Server details:', serverData)
      
      // Validate required server data
      if (!serverData.regionId && !serverData.region) {
        throw new Error('Server region is required for Hathora room creation')
      }
      
      if (!serverData.entryFee && serverData.entryFee !== 0) {
        throw new Error('Entry fee must be specified for multiplayer rooms')
      }
      
      // Import Hathora client
      const isInitialized = await hathoraClient.initialize()
      if (!isInitialized) {
        throw new Error('Failed to initialize Hathora client')
      }
      
      console.log('✅ Hathora client initialized successfully')
      
      // Create or join Hathora room with proper configuration
      const roomConfig = {
        region: serverData.regionId || serverData.region,
        entryFee: serverData.entryFee,
        maxPlayers: 8,
        gameMode: 'multiplayer',
        roomName: serverData.name || `TurfLoot Room`,
        isPublic: true
      }
      
      console.log('🏠 Creating Hathora room with config:', roomConfig)
      
      // Use the enhanced createPaidRoom method for all multiplayer games
      const result = await hathoraClient.createPaidRoom(
        roomConfig.entryFee,
        null, // userId - will use anonymous auth
        roomConfig.region
      )
      
      if (!result || !result.roomId) {
        throw new Error('Failed to create Hathora room - no room ID returned')
      }
      
      console.log('🎉 Hathora room created successfully!')
      console.log('🏠 Room ID:', result.roomId)
      console.log('🏠 Room ID type:', typeof result.roomId)
      console.log('🌍 Region:', result.region || roomConfig.region)
      console.log('💰 Entry Fee:', roomConfig.entryFee)
      
      const finalResult = {
        roomId: result.roomId,
        region: result.region || roomConfig.region,
        entryFee: roomConfig.entryFee,
        maxPlayers: roomConfig.maxPlayers,
        gameMode: 'hathora-multiplayer',
        isHathoraRoom: true,
        connectionInfo: result.connectionInfo || { host: 'hathora.dev', port: 443 }
      }
      
      console.log('📊 Final result:', finalResult)
      console.log('📊 Final result roomId type:', typeof finalResult.roomId)
      
      return finalResult
    }
    
    const hathoraResult = await initializeHathoraGame(serverData)
    
    console.log('\nStep 3: Testing URL parameter construction...')
    
    // Test URL parameter construction
    const queryParams = new URLSearchParams({
      roomId: hathoraResult.roomId,
      mode: 'hathora-multiplayer',
      multiplayer: 'hathora',
      server: 'hathora',
      region: hathoraResult.region,
      fee: hathoraResult.entryFee.toString(),
      name: serverData.name || 'Hathora Multiplayer',
      paid: hathoraResult.entryFee > 0 ? 'true' : 'false',
      hathoraRoom: hathoraResult.roomId,
      realHathoraRoom: 'true',
      maxPlayers: hathoraResult.maxPlayers.toString()
    })
    
    console.log('📊 Query parameters object:', Object.fromEntries(queryParams))
    console.log('📊 Query string:', queryParams.toString())
    
    // Test URL parameter parsing
    console.log('\nStep 4: Testing URL parameter parsing...')
    
    const testUrl = `/agario?${queryParams.toString()}`
    console.log('📊 Test URL:', testUrl)
    
    // Simulate URL parameter extraction
    const urlParams = new URLSearchParams(queryParams.toString())
    const roomId = urlParams.get('roomId')
    const hathoraRoom = urlParams.get('hathoraRoom')
    const realHathoraRoom = urlParams.get('realHathoraRoom') === 'true'
    
    console.log('📊 Extracted parameters:')
    console.log('  - roomId:', roomId, '(type:', typeof roomId, ')')
    console.log('  - hathoraRoom:', hathoraRoom, '(type:', typeof hathoraRoom, ')')
    console.log('  - realHathoraRoom:', realHathoraRoom, '(type:', typeof realHathoraRoom, ')')
    
    const actualRoomId = hathoraRoom || roomId
    console.log('  - actualRoomId:', actualRoomId, '(type:', typeof actualRoomId, ')')
    
    console.log('\n✅ DEBUG COMPLETE - All steps successful!')
    console.log('📊 FINAL DIAGNOSIS: Room ID should be:', actualRoomId)
    
  } catch (error) {
    console.error('❌ DEBUG FAILED:', error)
    console.error('Stack trace:', error.stack)
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testHathoraRoomCreation = testHathoraRoomCreation
}

export default testHathoraRoomCreation