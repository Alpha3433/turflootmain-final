import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

// MongoDB connection
let client
let db

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db()
    console.log('🔗 Connected to MongoDB for room management')
  }
  return db
}

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

    // Servers API endpoint - get active rooms
    if (route === 'servers' || route === 'servers-proxy') {
      return await handleGetServers(request)
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

    // Create room endpoint
    if (route === 'rooms/create') {
      return await handleCreateRoom(request)
    }
    
    // Join room endpoint
    if (route === 'rooms/join') {
      return await handleJoinRoom(request)
    }
    
    // Update room status endpoint
    if (route === 'rooms/status') {
      return await handleUpdateRoomStatus(request)
    }

    // Game sessions endpoint (existing)
    if (route === 'game-sessions') {
      return await handleGameSessions(request)
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