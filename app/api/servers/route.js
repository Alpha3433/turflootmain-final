import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('🎮 Single Seattle Server API: Returning the dedicated Seattle server...')
    
    // Fixed Seattle server configuration using the provided connection info
    const seattleServer = {
      id: 'seattle-main-server',
      hathoraRoomId: 'cb88bc37-ecec-4688-8966-4d3d438a3242', // ProcessId from user
      appId: 'app-ad240461-f9c1-4c9b-9846-8b9cbcaa1298',
      deploymentId: 'dep-7cc6db21-9d5e-4086-b5d8-984f1f1e2ddb',
      buildId: 'bld-30739381-fd81-462f-97d7-377979f6918f',
      connectionHost: 'mpl7ff.edge.hathora.dev',
      connectionPort: 50283,
      name: 'TurfLoot Seattle Server',
      region: 'US West',
      regionId: 'seattle',
      displayName: 'Seattle',
      hathoraRegion: 'us-west-2',
      mode: 'multiplayer',
      gameType: 'Main Server',
      description: 'Official TurfLoot Multiplayer Server',
      maxPlayers: 50, // Adjust as needed
      minPlayers: 1,
      stake: 0, // Free to play
      entryFee: 0,
      serverFee: 0,
      totalCost: 0,
      difficulty: 'All Players',
      serverType: 'hathora-dedicated',
      pingEndpoint: 'ec2.us-west-2.amazonaws.com', // For client-side ping measurement
      ping: null, // Will be measured client-side
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      canJoin: true,
      isRunning: true
    }

    // Query REAL player count from active game sessions in database
    let realPlayers = 0
    try {
      // Connect to MongoDB to get real active game sessions
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(process.env.MONGO_URL)
      
      await client.connect()
      const db = client.db('turfloot')
      const gameSessions = db.collection('game_sessions')
      
      // Count active players in the Seattle server (active within last 2 minutes)
      const activeSessionsCount = await gameSessions.countDocuments({
        roomId: seattleServer.id,
        status: 'active',
        lastActivity: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // Active within last 2 minutes
      })
      
      realPlayers = activeSessionsCount
      console.log(`📊 Seattle Server: ${realPlayers} real players from database`)
      
      await client.close()
    } catch (error) {
      console.warn(`⚠️ Could not query database for Seattle server:`, error.message)
      realPlayers = 0 // Fallback to 0 if database query fails
    }

    // Update server with real player count
    seattleServer.currentPlayers = realPlayers
    seattleServer.waitingPlayers = 0
    seattleServer.status = realPlayers > 0 ? 'active' : 'waiting'
    seattleServer.avgWaitTime = realPlayers > 0 ? 'Join Now' : 'Waiting for players'
    seattleServer.potentialWinning = 0 // No cash prizes on main server
    seattleServer.prizePool = 0

    // Return single server array
    const servers = [seattleServer]
    
    console.log(`📊 Returning single Seattle server with ${realPlayers} players`)
    
    return NextResponse.json({
      servers: servers,
      totalPlayers: realPlayers,
      totalActiveServers: realPlayers > 0 ? 1 : 0,
      totalServers: 1,
      practiceServers: 0,
      cashServers: 0,
      regions: ['US West'],
      gameTypes: [{ 
        name: 'Main Server', 
        servers: 1 
      }],
      hathoraEnabled: true,
      seattleServerInfo: {
        host: seattleServer.connectionHost,
        port: seattleServer.connectionPort,
        processId: seattleServer.hathoraRoomId,
        appId: seattleServer.appId
      },
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in Seattle server API:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Seattle server',
      message: error.message,
      servers: [],
      totalPlayers: 0,
      totalActiveServers: 0,
      hathoraEnabled: false
    }, { status: 500 })
  }
}