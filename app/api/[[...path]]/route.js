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

// Room Management Handler Functions

// Get active servers/rooms
async function handleGetServers(request) {
  try {
    console.log('🌐 Fetching active rooms from database...')
    const database = await connectToDatabase()
    const roomsCollection = database.collection('active_rooms')
    
    // Get active rooms (created in last 24 hours and not ended)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeRooms = await roomsCollection.find({
      createdAt: { $gte: twentyFourHoursAgo },
      status: { $in: ['waiting', 'active'] },
      endedAt: { $exists: false }
    }).toArray()

    // Clean up old rooms (older than 24 hours or ended)
    await roomsCollection.deleteMany({
      $or: [
        { createdAt: { $lt: twentyFourHoursAgo } },
        { status: 'ended' },
        { endedAt: { $exists: true } }
      ]
    })

    // Transform rooms into server browser format
    const servers = activeRooms.map(room => ({
      id: room.roomId,
      name: room.name || `${room.creatorName}'s Game`,
      players: room.currentPlayers || 0,
      maxPlayers: room.maxPlayers || 8,
      gameType: room.gameType || 'Arena Battle',
      region: room.region || 'Global',
      entryFee: room.entryFee || 0,
      status: room.status,
      ping: room.region === 'US-East' ? 45 : 
            room.region === 'US-West' ? 78 : 
            room.region === 'Europe' ? 123 : 
            room.region === 'Asia-Pacific' ? 67 : 85,
      creatorWallet: room.creatorWallet,
      creatorName: room.creatorName,
      roomId: room.roomId,
      colyseusEndpoint: room.colyseusEndpoint || 'wss://au-syd-ab3eaf4e.colyseus.cloud',
      createdAt: room.createdAt,
      lastActivity: room.lastActivity || room.createdAt
    }))

    // Calculate stats
    const totalPlayers = servers.reduce((sum, server) => sum + server.players, 0)
    const activeServers = servers.filter(s => s.status === 'active').length
    const practiceServers = 0 // Practice servers are local only
    const cashServers = servers.filter(s => s.entryFee > 0).length

    const response = {
      servers: servers,
      totalPlayers: totalPlayers,
      totalActiveServers: activeServers,
      totalServers: servers.length,
      practiceServers: practiceServers,
      cashServers: cashServers,
      regions: ['US-East', 'US-West', 'Europe', 'Asia-Pacific', 'Global'],
      gameTypes: ['Arena Battle', 'Cash Game', 'Tournament'],
      timestamp: new Date().toISOString()
    }

    console.log(`✅ Returning ${servers.length} active rooms, ${totalPlayers} total players`)
    return NextResponse.json(response, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Error fetching servers:', error)
    
    // Return fallback data on error
    const fallbackResponse = {
      servers: [],
      totalPlayers: 0,
      totalActiveServers: 0,
      totalServers: 0,
      practiceServers: 0,
      cashServers: 0,
      regions: ['US-East', 'US-West', 'Europe', 'Asia-Pacific', 'Global'],
      gameTypes: ['Arena Battle', 'Cash Game', 'Tournament'],
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    }
    
    return NextResponse.json(fallbackResponse, { headers: corsHeaders })
  }
}

// Create a new room
async function handleCreateRoom(request) {
  try {
    const body = await request.json()
    console.log('🏗️ Creating new room:', body)

    const {
      name,
      gameType,
      region,
      entryFee,
      maxPlayers,
      creatorWallet,
      creatorName,
      privyUserId
    } = body

    // Validate required fields
    if (!creatorWallet || !creatorName) {
      return NextResponse.json(
        { error: 'Creator wallet and name are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const database = await connectToDatabase()
    const roomsCollection = database.collection('active_rooms')

    // Generate unique room ID
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create room document
    const newRoom = {
      roomId: roomId,
      name: name || `${creatorName}'s Game`,
      gameType: gameType || 'Arena Battle',
      region: region || 'Global',
      entryFee: entryFee || 0,
      maxPlayers: maxPlayers || 8,
      currentPlayers: 1, // Creator joins immediately
      status: 'waiting', // waiting, active, ended
      creatorWallet: creatorWallet,
      creatorName: creatorName,
      privyUserId: privyUserId,
      players: [
        {
          wallet: creatorWallet,
          name: creatorName,
          joinedAt: new Date()
        }
      ],
      createdAt: new Date(),
      lastActivity: new Date(),
      colyseusEndpoint: 'wss://au-syd-ab3eaf4e.colyseus.cloud'
    }

    // Insert room into database
    const result = await roomsCollection.insertOne(newRoom)
    console.log('✅ Room created successfully:', roomId)

    return NextResponse.json({
      success: true,
      roomId: roomId,
      room: newRoom,
      message: 'Room created successfully'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Join an existing room
async function handleJoinRoom(request) {
  try {
    const body = await request.json()
    console.log('🚪 Player joining room:', body)

    const {
      roomId,
      playerWallet,
      playerName,
      privyUserId
    } = body

    // Validate required fields
    if (!roomId || !playerWallet || !playerName) {
      return NextResponse.json(
        { error: 'Room ID, player wallet, and name are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const database = await connectToDatabase()
    const roomsCollection = database.collection('active_rooms')

    // Find the room
    const room = await roomsCollection.findOne({ roomId: roomId })
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if room is full
    if (room.currentPlayers >= room.maxPlayers) {
      return NextResponse.json(
        { error: 'Room is full' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if player is already in the room
    const existingPlayer = room.players.find(p => p.wallet === playerWallet)
    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Player already in room' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Add player to room
    const newPlayer = {
      wallet: playerWallet,
      name: playerName,
      privyUserId: privyUserId,
      joinedAt: new Date()
    }

    const updateResult = await roomsCollection.updateOne(
      { roomId: roomId },
      {
        $push: { players: newPlayer },
        $inc: { currentPlayers: 1 },
        $set: { lastActivity: new Date() }
      }
    )

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to join room' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Player joined room successfully:', playerName, 'in', roomId)

    return NextResponse.json({
      success: true,
      message: 'Joined room successfully',
      roomId: roomId,
      currentPlayers: room.currentPlayers + 1
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Error joining room:', error)
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Update room status
async function handleUpdateRoomStatus(request) {
  try {
    const body = await request.json()
    console.log('🔄 Updating room status:', body)

    const {
      roomId,
      status,
      currentPlayers,
      endedAt
    } = body

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const database = await connectToDatabase()
    const roomsCollection = database.collection('active_rooms')

    const updateData = {
      lastActivity: new Date()
    }

    if (status) updateData.status = status
    if (currentPlayers !== undefined) updateData.currentPlayers = currentPlayers
    if (endedAt) updateData.endedAt = new Date(endedAt)

    const result = await roomsCollection.updateOne(
      { roomId: roomId },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('✅ Room status updated:', roomId, updateData)

    return NextResponse.json({
      success: true,
      message: 'Room status updated',
      roomId: roomId
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Error updating room status:', error)
    return NextResponse.json(
      { error: 'Failed to update room status' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Game sessions handler (existing functionality)
async function handleGameSessions(request) {
  try {
    const body = await request.json()
    console.log('🎮 Game session tracking:', body.action, body)

    // Handle room activity tracking
    if (body.roomId) {
      try {
        const database = await connectToDatabase()
        const roomsCollection = database.collection('active_rooms')
        
        await roomsCollection.updateOne(
          { roomId: body.roomId },
          { 
            $set: { 
              lastActivity: new Date(),
              status: body.status || 'active'
            } 
          }
        )
        console.log('🔄 Updated activity for room', body.roomId)
      } catch (error) {
        console.error('⚠️ Failed to update room activity:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Session tracked',
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Error in game sessions:', error)
    return NextResponse.json(
      { error: 'Failed to track session' },
      { status: 500, headers: corsHeaders }
    )
  }
}