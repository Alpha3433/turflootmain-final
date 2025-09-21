import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export async function GET() {
  try {
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    
    const db = client.db('turfloot')
    const sessionsCollection = db.collection('game_sessions')
    
    // Get active Colyseus sessions (last activity within 10 minutes) 
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const activeSessions = await sessionsCollection.find({
      'lastActivity': { $gte: tenMinutesAgo },
      'mode': { $regex: /colyseus/i },
      'roomId': { $ne: 'colyseus-arena' } // Exclude default room template
    }).toArray()
    
    // Group sessions by room ID to count players
    const roomsMap = new Map()
    
    activeSessions.forEach(session => {
      const roomId = session.roomId
      if (roomId && roomId !== 'colyseus-arena') {
        if (roomsMap.has(roomId)) {
          roomsMap.get(roomId).currentPlayers += 1
        } else {
          roomsMap.set(roomId, {
            id: roomId,
            name: `Active Arena Room`,
            serverType: 'colyseus',
            roomType: 'arena', 
            region: session.region || 'AU',
            mode: session.mode || 'colyseus-multiplayer',
            currentPlayers: 1,
            maxPlayers: 50,
            status: 'active',
            avgWaitTime: 'Join Now',
            entryFee: session.entryFee || 0,
            prizePool: 0,
            colyseusRoomId: roomId,
            colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
            joinable: true,
            lastActivity: session.lastActivity
          })
        }
      }
    })
    
    const availableRooms = Array.from(roomsMap.values())
    const totalPlayers = availableRooms.reduce((sum, room) => sum + room.currentPlayers, 0)
    
    // Always include the default template room for creating new rooms
    const defaultRoom = {
      id: 'colyseus-arena-default',
      name: 'Arena Battle',
      serverType: 'colyseus',
      roomType: 'arena',
      region: 'AU',
      mode: 'colyseus-multiplayer',
      currentPlayers: 0,
      maxPlayers: 50,
      status: 'template',
      avgWaitTime: 'Create New',
      entryFee: 0,
      prizePool: 0,
      colyseusRoomId: 'colyseus-arena',
      colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
      joinable: false
    }
    
    await client.close()
    
    return NextResponse.json({
      servers: [...availableRooms, defaultRoom],
      totalPlayers: totalPlayers,
      totalActiveServers: availableRooms.length,
      totalServers: availableRooms.length + 1,
      practiceServers: 0,
      paidServers: 0,
      lastUpdated: new Date().toISOString()
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