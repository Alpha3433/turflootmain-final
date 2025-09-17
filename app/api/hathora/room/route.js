// Server-side Hathora room creation API
import { NextResponse } from 'next/server'
import { RoomV2Api, PlayerAuthApi } from '@hathora/cloud-sdk-typescript'

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { gameMode = 'practice', region, maxPlayers = 8, stakeAmount = 0 } = body

    // Validate environment variables
    const appId = process.env.NEXT_PUBLIC_HATHORA_APP_ID
    const developerToken = process.env.HATHORA_DEVELOPER_TOKEN

    if (!appId || !developerToken) {
      console.error('❌ Missing Hathora environment variables')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Hathora not configured properly',
          details: 'Missing NEXT_PUBLIC_HATHORA_APP_ID or HATHORA_DEVELOPER_TOKEN'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log(`🚀 Creating Hathora room server-side: ${gameMode} mode, region: ${region}`)

    // Initialize RoomV2Api with developer token (server-side only)
    const roomClient = new RoomV2Api()
    const playerAuthClient = new PlayerAuthApi()

    // Step 1: Create the room
    console.log('📡 Creating room with RoomV2Api...')
    let roomResponse
    
    try {
      const createRoomConfig = region ? { region } : {}
      
      roomResponse = await roomClient.createRoom(
        appId,
        createRoomConfig,
        undefined, // Let Hathora generate room ID
        {
          headers: {
            'Authorization': `Bearer ${developerToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!roomResponse || !roomResponse.roomId) {
        throw new Error('Invalid room response from Hathora')
      }
      
      console.log(`✅ Room created: ${roomResponse.roomId}`)
      
    } catch (roomError) {
      console.error('❌ Room creation failed:', roomError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create Hathora room',
          details: roomError.message
        },
        { status: 500, headers: corsHeaders }
      )
    }

    // Step 2: Get connection info for the room
    console.log('📡 Getting connection info...')
    let connectionInfo
    
    try {
      connectionInfo = await roomClient.getConnectionInfo(appId, roomResponse.roomId)
      
      if (!connectionInfo || !connectionInfo.host || !connectionInfo.port) {
        throw new Error('Invalid connection info from Hathora')
      }
      
      console.log(`✅ Connection info retrieved: ${connectionInfo.host}:${connectionInfo.port}`)
      
    } catch (connectionError) {
      console.error('❌ Failed to get connection info:', connectionError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get room connection info',
          details: connectionError.message
        },
        { status: 500, headers: corsHeaders }
      )
    }

    // Step 3: Generate player authentication token
    console.log('🔐 Generating player authentication token...')
    let playerToken
    
    try {
      const authResponse = await playerAuthClient.loginAnonymous(appId)
      
      if (!authResponse || !authResponse.token) {
        throw new Error('Invalid auth response from Hathora')
      }
      
      playerToken = authResponse.token
      console.log(`✅ Player token generated successfully`)
      
    } catch (authError) {
      console.error('❌ Failed to generate player token:', authError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate player authentication',
          details: authError.message
        },
        { status: 500, headers: corsHeaders }
      )
    }

    // Step 4: Return complete room information to client
    const roomInfo = {
      success: true,
      roomId: roomResponse.roomId,
      host: connectionInfo.host,
      port: connectionInfo.port,
      region: region || 'auto',
      gameMode,
      maxPlayers,
      stakeAmount,
      playerToken, // Real token for WebSocket authentication
      isHathoraRoom: true,
      timestamp: new Date().toISOString()
    }

    console.log(`🎉 Complete room info prepared for client:`, {
      roomId: roomInfo.roomId,
      host: roomInfo.host,
      port: roomInfo.port,
      hasToken: !!roomInfo.playerToken
    })

    return NextResponse.json(roomInfo, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Server-side room creation failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Hathora room creation API',
      endpoints: {
        'POST /api/hathora/room': 'Create new Hathora room with connection info and player token'
      }
    },
    { headers: corsHeaders }
  )
}