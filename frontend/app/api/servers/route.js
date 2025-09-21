import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('🎮 Colyseus Server Browser API: Fetching available Colyseus rooms...')
    
    // Query Colyseus Cloud for available rooms
    let availableRooms = []
    let totalRealPlayers = 0
    
    try {
      // Check if there are active rooms on Colyseus Cloud
      const colyseusResponse = await fetch(`https://au-syd-ab3eaf4e.colyseus.cloud/matchmake/arena`)
      if (colyseusResponse.ok) {
        const roomsData = await colyseusResponse.json()
        availableRooms = roomsData || []
        console.log(`📊 Found ${availableRooms.length} active Colyseus rooms`)
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch Colyseus rooms, showing generic arena:', error.message)
    }

    // Query database for accurate player count
    let realPlayers = 0
    try {
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(process.env.MONGO_URL)
      await client.connect()
      const db = client.db('turfloot')
      const sessionsCollection = db.collection('game-sessions')

      // Count active Colyseus sessions (last activity within 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      const activeSessionsCount = await sessionsCollection.countDocuments({
        'session.lastActivity': { $gte: twoMinutesAgo },
        'session.mode': { $regex: /colyseus/i }
      })
      
      realPlayers = activeSessionsCount
      totalRealPlayers = realPlayers
      console.log(`📊 Database shows ${realPlayers} active Colyseus players`)
      
      await client.close()
    } catch (error) {
      console.warn(`⚠️ Could not query database for Colyseus players:`, error.message)
      realPlayers = 0
    }

    // Create server entries for active rooms
    const servers = []
    
    if (availableRooms.length > 0) {
      // Show each active room as a separate server entry
      availableRooms.forEach((room, index) => {
        const playersInRoom = room.clients || 0
        const maxPlayers = room.maxClients || 50
        
        servers.push({
          id: room.roomId || `colyseus-arena-${index}`,
          name: `Arena Battle #${index + 1}`,
          serverType: 'colyseus',
          roomType: 'arena',
          region: 'AU',
          mode: 'colyseus-multiplayer',
          currentPlayers: playersInRoom,
          maxPlayers: maxPlayers,
          status: playersInRoom > 0 ? 'active' : 'waiting',
          avgWaitTime: playersInRoom < maxPlayers ? 'Join Now' : 'Full',
          entryFee: 0,
          prizePool: 0,
          colyseusRoomId: room.roomId,
          colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
          joinable: playersInRoom < maxPlayers
        })
      })
    } else {
      // Show a default arena if no active rooms (allows creating new rooms)
      servers.push({
        id: 'colyseus-arena-default',
        name: 'Arena Battle',
        serverType: 'colyseus',
        roomType: 'arena',
        region: 'AU', 
        mode: 'colyseus-multiplayer',
        currentPlayers: realPlayers,
        maxPlayers: 50,
        status: realPlayers > 0 ? 'active' : 'waiting',
        avgWaitTime: 'Join Now',
        entryFee: 0,
        prizePool: 0,
        colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
        joinable: true
      })
    }
    
    console.log(`📊 Returning ${servers.length} Colyseus server(s) with ${totalRealPlayers} total players`)
    
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