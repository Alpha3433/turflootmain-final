import { NextResponse } from 'next/server'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Cache-Control': 'no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Frame-Options': 'ALLOWALL',
  'Content-Security-Policy': 'frame-ancestors *;',
  'X-API-Gateway': 'TurfLoot-NextJS',
  'X-External-Access': 'Enhanced'
}

export async function GET(request, { params }) {
  const { path } = params
  const route = path?.join('/') || ''
  
  console.log('🚀 GET HANDLER CALLED - PATH:', route)
  console.error('🚨 CATCH-ALL ROUTE DEBUG: Route =', route)
  
  try {
    // Root API endpoint
    if (!path || path.length === 0) {
      return NextResponse.json(
        { 
          message: 'TurfLoot API v2.0',
          service: 'turfloot-api',
          status: 'operational',
          features: ['auth', 'blockchain', 'multiplayer'],
          timestamp: new Date().toISOString()
        }, 
        { headers: corsHeaders }
      )
    }

    // Servers endpoint for Colyseus server browser
    if (route === 'servers') {
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

          // Get active Colyseus sessions (last activity within 10 minutes) 
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
          console.log(`🔍 Querying for sessions active since: ${tenMinutesAgo}`)
          
          const activeSessions = await sessionsCollection.find({
            'lastActivity': { $gte: tenMinutesAgo },
            'mode': { $regex: /colyseus/i },
            'status': 'active'
          }).toArray()
          
          console.log(`🔍 Query found ${activeSessions.length} active sessions:`, activeSessions.map(s => ({
            roomId: s.roomId,
            userId: s.userId,
            mode: s.mode,
            lastActivity: s.lastActivity,
            status: s.status
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
                lastActivity: session.lastActivity || new Date(),
                canJoin: true
              })
            }
          })
          
          availableRooms = Array.from(roomsMap.values())
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
        
        return NextResponse.json({
          servers: servers,
          totalPlayers: totalRealPlayers,
          totalActiveServers: servers.filter(s => s.status === 'active').length,
          totalServers: servers.length,
          practiceServers: 0,
          cashServers: 0,
          colyseusEnabled: true,
          colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud',
          lastUpdated: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Error in Colyseus server browser API:', error)
        return NextResponse.json({ 
          error: 'Failed to fetch Colyseus servers',
          message: error.message,
          servers: [],
          totalPlayers: 0,
          totalActiveServers: 0,
          colyseusEnabled: false
        }, { status: 500, headers: corsHeaders })
      }
    }

    // Default route for unknown paths
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
    
  } catch (error) {
    console.error('GET handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request, { params }) {
  const { path } = params
  const route = path?.join('/') || ''
  
  console.log('🚀 POST HANDLER CALLED - PATH:', route)
  
  let body = {}
  try {
    body = await request.json()
  } catch (e) {
    console.log('No JSON body provided')
  }

  try {
    // Hathora room creation endpoint
    if (route === 'hathora/create-room') {
      try {
        const { gameMode = 'practice', region, maxPlayers = 50, stakeAmount = 0 } = body
        
        console.log(`🚀 Creating Hathora room with gameMode: ${gameMode}, region: ${region}, stakeAmount: ${stakeAmount}`)
        
        // Call the working /api/hathora/room endpoint directly to avoid circular dependency
        const roomResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/hathora/room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameMode,
            region,
            maxPlayers,
            stakeAmount
          })
        })
        
        if (!roomResponse.ok) {
          const errorData = await roomResponse.json()
          throw new Error(`Hathora room creation failed: ${errorData.error || roomResponse.statusText}`)
        }
        
        const roomData = await roomResponse.json()
        
        if (!roomData.success) {
          throw new Error(`Hathora room creation failed: ${roomData.error}`)
        }
        
        console.log(`✅ Created Hathora room: ${roomData.roomId}`)
        
        return NextResponse.json({
          success: true,
          roomId: roomData.roomId,
          gameMode: roomData.gameMode,
          region: roomData.region,
          maxPlayers: roomData.maxPlayers,
          stakeAmount: roomData.stakeAmount,
          host: roomData.host,
          port: roomData.port,
          playerToken: roomData.playerToken,
          isHathoraRoom: true,
          isMockRoom: false,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Error creating Hathora room:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to create Hathora room',
          message: error.message,
          timestamp: new Date().toISOString()
        }, { status: 500, headers: corsHeaders })
      }
    }

    // Default route for unknown paths
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
    
  } catch (error) {
    console.error('POST handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}