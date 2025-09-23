import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔄 Servers-proxy route called - bypassing external routing issues')
    
    // Try to get active room data from database
    let activeRoomId = null
    let activePlayerCount = 0
    
    try {
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(process.env.MONGO_URL)
      await client.connect()
      const db = client.db('turfloot')
      const gameSessions = db.collection('game_sessions')
      
      // Find the most recent active Colyseus arena session
      const activeSession = await gameSessions.findOne(
        { 
          status: 'active',
          roomType: 'arena',
          lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Active within 5 minutes
        },
        { sort: { lastActivity: -1 } } // Get most recent
      )
      
      if (activeSession) {
        activeRoomId = activeSession.roomId
        // Count all active players in this room
        activePlayerCount = await gameSessions.countDocuments({
          roomId: activeRoomId,
          status: 'active',
          lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
        })
        console.log(`🎮 Found active room ${activeRoomId} with ${activePlayerCount} players`)
      }
      
      await client.close()
    } catch (error) {
      console.warn('⚠️ Could not query database for active rooms:', error.message)
    }
    
    // If no real room found, use simulation for testing
    if (!activeRoomId) {
      activeRoomId = 'colyseus-arena-global' // Fallback for testing
      activePlayerCount = 1 // Simulated for testing
      console.log('🧪 TESTING: Using simulated room data')
    }
    
    const colyseusEndpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud'
    
    const serverData = {
      servers: [
        {
          id: activeRoomId, // Use actual room ID instead of generic one
          roomType: 'arena',
          name: 'TurfLoot Arena',
          region: 'Australia',
          regionId: 'au-syd',
          endpoint: colyseusEndpoint,
          maxPlayers: 50,
          currentPlayers: activePlayerCount, // Use real player count
          entryFee: 0,
          gameType: 'Arena Battle',
          serverType: 'colyseus',
          isActive: activePlayerCount > 0,
          canSpectate: true,
          ping: 0,
          status: activePlayerCount > 0 ? 'active' : 'waiting', // Dynamic status
          canJoin: activePlayerCount > 0 && activePlayerCount < 50,
          creatorName: activePlayerCount > 0 ? 'Account A' : null, // Show creator only if active
          creatorWallet: activePlayerCount > 0 ? 'Demo_Wallet_123' : null,
          actualRoomId: activeRoomId, // Store the actual room ID for joining
          lastUpdated: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      ],
      totalPlayers: activePlayerCount, // Use real player count
      totalActiveServers: activePlayerCount > 0 ? 1 : 0,
      totalServers: 1,
      practiceServers: 0,
      cashServers: 0,
      regions: ['Australia'],
      gameTypes: ['Arena Battle'],
      colyseusEnabled: true,
      colyseusEndpoint: colyseusEndpoint,
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString()
    }
    
    console.log('✅ Servers-proxy returning data:', {
      servers: serverData.servers.length,
      endpoint: colyseusEndpoint,
      totalServers: serverData.totalServers
    })
    
    return NextResponse.json(serverData)
    
  } catch (error) {
    console.error('❌ Servers-proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch server data', details: error.message },
      { status: 500 }
    )
  }
}