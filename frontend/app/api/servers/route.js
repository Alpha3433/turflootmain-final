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
      const sessionsCollection = db.collection('game_sessions')

      // Get active Colyseus sessions (last activity within 2 minutes) 
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      console.log('🕐 Looking for sessions newer than:', twoMinutesAgo.toISOString())
      
      const activeSessions = await sessionsCollection.find({
        'lastActivity': { $gte: twoMinutesAgo },
        'mode': { $regex: /colyseus/i }
      }).toArray()
      
      console.log('🔍 Database query found:', activeSessions.length, 'sessions')
      console.log('📝 Sample sessions:', activeSessions.slice(0, 2).map(s => ({
        roomId: s.roomId,
        lastActivity: s.lastActivity,
        mode: s.mode,
        region: s.region
      })))
      
      totalRealPlayers = activeSessions.length
      console.log(`📊 Database shows ${totalRealPlayers} active Colyseus players`)
      
      // Group sessions by room ID to create room entries
      const roomsMap = new Map()
      
      activeSessions.forEach(session => {
        const roomId = session.roomId || 'colyseus-arena-default'
        const region = session.region || 'AU'
        const mode = session.mode || 'colyseus-multiplayer'
        
        if (roomsMap.has(roomId)) {
          roomsMap.get(roomId).currentPlayers += 1
        } else {
          roomsMap.set(roomId, {
            id: roomId,
            name: `Arena Battle ${roomsMap.size > 0 ? `#${roomsMap.size + 1}` : ''}`,
            serverType: 'colyseus',
            roomType: 'arena',
            region: region,
            mode: mode,
            currentPlayers: 1,
            maxPlayers: 50,
            status: 'active',
            avgWaitTime: 'Join Now',
            entryFee: session.entryFee || 0,
            prizePool: 0,
            colyseusRoomId: roomId,
            colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
            joinable: true,
            lastActivity: session.lastActivity || new Date()
          })
        }
      })
      
      availableRooms = Array.from(roomsMap.values())
      
      // Update status based on player count and capacity
      availableRooms.forEach(room => {
        room.avgWaitTime = room.currentPlayers < room.maxPlayers ? 'Join Now' : 'Full'
        room.joinable = room.currentPlayers < room.maxPlayers
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
        id: 'colyseus-arena-default',
        name: 'Arena Battle',
        serverType: 'colyseus',
        roomType: 'arena',
        region: 'AU', 
        mode: 'colyseus-multiplayer',
        currentPlayers: 0,
        maxPlayers: 50,
        status: 'waiting',
        avgWaitTime: 'Join Now',
        entryFee: 0,
        prizePool: 0,
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
      regions: ['AU'],
      gameTypes: [{ 
        name: 'Arena Battle', 
        servers: servers.length 
      }],
      colyseusEnabled: true,
      colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud'
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