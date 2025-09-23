import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('🎮 Colyseus Server Browser API: Returning available Colyseus servers...')
    
    // Colyseus server configuration
    const colyseusEndpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud'
    
    // Create a single arena server entry for the server browser
    const arenaServer = {
      id: 'colyseus-arena-global',
      roomType: 'arena',
      name: 'TurfLoot Arena',
      region: 'Australia',
      regionId: 'au-syd',
      displayName: 'Global Arena',
      mode: 'multiplayer',
      gameType: 'Arena Battle',
      description: 'Real-time multiplayer arena with up to 50 players',
      maxPlayers: 50,
      minPlayers: 1,
      currentPlayers: 0, // Will be updated dynamically
      waitingPlayers: 0,
      isRunning: true,
      ping: null, // Will be measured client-side
      avgWaitTime: 'Join Now',
      difficulty: 'All Players',
      entryFee: 0,
      serverFee: 0,
      totalCost: 0,
      potentialWinning: 0,
      prizePool: 0,
      stake: 0,
      status: 'active',
      serverType: 'colyseus',
      endpoint: colyseusEndpoint,
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      canJoin: true
    }

    // Try to get real player count from game sessions database
    let realPlayers = 0
    try {
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(process.env.MONGO_URL)
      
      await client.connect()
      const db = client.db('turfloot')
      const gameSessions = db.collection('game_sessions')
      
      // Count active players in Colyseus arena (active within last 2 minutes)
      const activeSessionsCount = await gameSessions.countDocuments({
        roomId: 'colyseus-arena-global',
        status: 'active',
        lastActivity: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
      })
      
      realPlayers = activeSessionsCount
      console.log(`📊 Colyseus Arena: ${realPlayers} real players from database`)
      
      await client.close()
    } catch (error) {
      console.warn(`⚠️ Could not query database for Colyseus arena:`, error.message)
      realPlayers = 0
    }

    // TEMPORARY: Simulate an active room for testing JOIN functionality
    // Set this to 1 to test the JOIN button, set to 0 to test CREATE functionality
    const simulatedPlayers = 1
    realPlayers = Math.max(realPlayers, simulatedPlayers)
    
    console.log(`🧪 TESTING MODE: Using ${realPlayers} players (${simulatedPlayers} simulated + ${realPlayers - simulatedPlayers} real)`)

    // Update server with real player count
    arenaServer.currentPlayers = realPlayers
    arenaServer.status = realPlayers > 0 ? 'active' : 'waiting'
    arenaServer.avgWaitTime = realPlayers > 0 ? 'Join Now' : 'Waiting for players'
    
    // Add creator info for active rooms
    if (realPlayers > 0) {
      arenaServer.creatorName = 'Account A'
      arenaServer.creatorWallet = 'Demo_Wallet_123'
    }

    // Return single server array
    const servers = [arenaServer]
    
    console.log(`📊 Returning Colyseus arena server with ${realPlayers} players`)
    
    return NextResponse.json({
      servers: servers,
      totalPlayers: realPlayers,
      totalActiveServers: realPlayers > 0 ? 1 : 0,
      totalServers: 1,
      practiceServers: 0,
      cashServers: 0,
      regions: ['Global'],
      gameTypes: [{ 
        name: 'Arena Battle', 
        servers: 1 
      }],
      colyseusEnabled: true,
      colyseusEndpoint: colyseusEndpoint,
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in Colyseus server browser API:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Colyseus servers',
      message: error.message,
      servers: [],
      totalPlayers: 0,
      totalActiveServers: 0,
      colyseusEnabled: false
    }, { status: 500 })
  }
}