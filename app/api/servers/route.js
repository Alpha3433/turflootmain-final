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
      lastUpdated: null,
      timestamp: null,
      canJoin: true
    }

    // Define cash room templates with SOL room costs for testing ($0.02, $0.05)
    const cashRoomConfigs = [
      {
        stake: 0.02,
        idSuffix: '002',
        description: 'Entry level TurfLoot arena - $0.02 SOL room cost'
      },
      {
        stake: 0.05,
        idSuffix: '005',
        description: 'Mid stakes TurfLoot arena - $0.05 SOL room cost'
      }
    ]

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

    const timestamp = new Date().toISOString()

    // Refresh timestamp metadata now that we have accurate player counts
    arenaServer.lastUpdated = timestamp
    arenaServer.timestamp = timestamp

    // Build dedicated cash rooms for $0.02 and $0.05 SOL
    const cashRooms = cashRoomConfigs.map(config => ({
      id: `colyseus-cash-${config.idSuffix}-au`,
      roomType: 'cash',
      type: 'cash-room',
      name: `TurfLoot $${config.stake.toFixed(2)} Room - Australia`,
      region: 'Australia',
      regionId: 'au-syd',
      displayName: `$${config.stake.toFixed(2)} Cash Game`,
      mode: 'cash-game',
      gameType: 'Cash Game',
      description: config.description,
      maxPlayers: 50,
      minPlayers: 2,
      currentPlayers: 0,
      waitingPlayers: 0,
      isRunning: true,
      ping: null,
      avgWaitTime: 'Create Game',
      difficulty: 'All Players',
      entryFee: config.stake,
      serverFee: 0,
      totalCost: config.stake,
      potentialWinning: Number((config.stake * 2).toFixed(2)),
      prizePool: Number((config.stake * 2).toFixed(2)),
      stake: config.stake,
      status: 'waiting',
      serverType: 'colyseus',
      endpoint: colyseusEndpoint,
      hathoraRegion: 'ap-southeast-2',
      lastUpdated: timestamp,
      timestamp,
      canJoin: true,
      canSpectate: false
    }))

    // Return all available server templates (arena + cash rooms)
    const servers = [arenaServer, ...cashRooms]

    const totalPlayers = servers.reduce((sum, server) => sum + (server.currentPlayers || 0), 0)
    const totalActiveServers = servers.filter(server => (server.currentPlayers || 0) > 0).length
    const practiceServers = servers.filter(server => (server.entryFee || 0) === 0).length
    const cashServers = servers.filter(server => (server.entryFee || 0) > 0).length
    const regions = [...new Set(servers.map(server => server.region))]

    const gameTypes = [
      { name: 'Arena Battle', servers: practiceServers }
    ]

    if (cashServers > 0) {
      gameTypes.push({ name: 'Cash Game', servers: cashServers })
    }

    console.log(`📊 Returning ${servers.length} Colyseus rooms (${practiceServers} practice, ${cashServers} cash) with ${totalPlayers} total players`)

    return NextResponse.json({
      servers,
      totalPlayers,
      totalActiveServers,
      totalServers: servers.length,
      practiceServers,
      cashServers,
      regions,
      gameTypes,
      colyseusEnabled: true,
      colyseusEndpoint: colyseusEndpoint,
      lastUpdated: timestamp,
      timestamp
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