import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('🎮 Colyseus Server Browser API: Fetching available Colyseus rooms...')
    
    // Query our database for active Colyseus rooms and sessions
    let availableRooms = []
    let totalRealPlayers = 0
    
    try {
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(process.env.MONGO_URL)
      await client.connect()
      const db = client.db('turfloot')
      const sessionsCollection = db.collection('game-sessions')

      // Get active Colyseus sessions (last activity within 2 minutes) 
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      const activeSessions = await sessionsCollection.find({
        'session.lastActivity': { $gte: twoMinutesAgo },
        'session.mode': { $regex: /colyseus/i }
      }).toArray()
      
      totalRealPlayers = activeSessions.length
      console.log(`📊 Database shows ${totalRealPlayers} active Colyseus players`)
      
      // Group sessions by room ID to create room entries
      const roomsMap = new Map()
      
      activeSessions.forEach(session => {
        const roomId = session.roomId || session.session?.roomId || 'colyseus-arena-default'
        const region = session.session?.region || 'AU'
        const mode = session.session?.mode || 'colyseus-multiplayer'
        
        if (roomsMap.has(roomId)) {
          roomsMap.get(roomId).currentPlayers += 1
        } else {
          roomsMap.set(roomId, {
            id: roomId,
            name: roomsMap.size === 0 ? 'TurfLoot Arena' : `Arena Battle #${roomsMap.size + 1}`,
            serverType: 'colyseus',
            roomType: 'arena',
            region: region,
            mode: mode,
            currentPlayers: 1,
            maxPlayers: 50,
            status: 'active',
            avgWaitTime: 'Join Now',
            entryFee: 0,
            prizePool: 0,
            colyseusRoomId: roomId,
            colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
            joinable: true,
            lastActivity: session.session?.lastActivity || new Date(),
            // Legacy fields for compatibility
            regionId: 'au-syd',
            displayName: roomsMap.size === 0 ? 'Global Arena' : `Arena #${roomsMap.size + 1}`,
            gameType: 'Arena Battle',
            description: 'Real-time multiplayer arena with up to 50 players',
            minPlayers: 1,
            waitingPlayers: 0,
            isRunning: true,
            ping: null,
            difficulty: 'All Players',
            serverFee: 0,
            totalCost: 0,
            potentialWinning: 0,
            stake: 0,
            endpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
            lastUpdated: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            canJoin: true
          })
        }
      })
      
      availableRooms = Array.from(roomsMap.values())
      
      // Update status based on player count and capacity
      availableRooms.forEach(room => {
        room.avgWaitTime = room.currentPlayers < room.maxPlayers ? 'Join Now' : 'Full'
        room.joinable = room.currentPlayers < room.maxPlayers
        room.canJoin = room.currentPlayers < room.maxPlayers
        room.status = room.currentPlayers > 0 ? 'active' : 'waiting'
      })
      
      console.log(`📊 Found ${availableRooms.length} active Colyseus rooms from database`)
      
      await client.close()
      
    } catch (error) {
      console.warn(`⚠️ Could not query database for Colyseus rooms:`, error.message)
      totalRealPlayers = 0
    }

    // Create server entries for active rooms
    const servers = []
    
    if (availableRooms.length > 0) {
      // Show each active room as a separate server entry
      servers.push(...availableRooms)
    } else {
      // Show a default arena if no active rooms (allows creating new rooms)
      servers.push({
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
        currentPlayers: 0,
        waitingPlayers: 0,
        isRunning: true,
        ping: null,
        avgWaitTime: 'Join Now',
        difficulty: 'All Players',
        entryFee: 0,
        serverFee: 0,
        totalCost: 0,
        potentialWinning: 0,
        prizePool: 0,
        stake: 0,
        status: 'waiting',
        serverType: 'colyseus',
        endpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
        lastUpdated: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        canJoin: true,
        colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
        joinable: true
      })
    }
    
    console.log(`📊 Returning ${servers.length} Colyseus server(s) with ${totalRealPlayers} total players`)
    console.log(`🔍 Server details:`, servers.map(s => `${s.name} (${s.currentPlayers}/${s.maxPlayers})`))
    
    return NextResponse.json({
      servers: servers,
      totalPlayers: totalRealPlayers,
      totalActiveServers: servers.filter(s => s.status === 'active').length,
      totalServers: servers.length,
      practiceServers: 0,
      cashServers: 0,
      regions: ['Australia'],
      gameTypes: [{ 
        name: 'Arena Battle', 
        servers: servers.length 
      }],
      colyseusEnabled: true,
      colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
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