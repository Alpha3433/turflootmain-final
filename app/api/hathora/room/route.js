// Server-side Hathora room creation API
import { NextResponse } from 'next/server'
import { HathoraCloud } from '@hathora/cloud-sdk-typescript'

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

    // Initialize Hathora SDK client with authentication
    const hathora = new HathoraCloud({
      appId: appId,
      hathoraDevToken: developerToken,
    })

    // Map our regions to Hathora regions
    const regionMap = {
      'US-East-1': 'Washington_DC',
      'US-West-1': 'Seattle', 
      'US-West-2': 'Seattle',
      'Europe': 'London',
      'EU-West-1': 'London',
      'EU-Central-1': 'Frankfurt',
      'Asia': 'Singapore',
      'Oceania': 'Sydney',
      'AP-Southeast-1': 'Singapore',
      'AP-Southeast-2': 'Sydney'
    }

    const hathoraRegion = regionMap[region] || 'Seattle'
    console.log(`🌍 Mapping region ${region} to Hathora region: ${hathoraRegion}`)
    console.log(`🔍 Debug - original region: "${region}", mapped region: "${hathoraRegion}", type: ${typeof hathoraRegion}`)

    // Step 1: Create anonymous player authentication
    console.log('🔐 Creating anonymous player authentication...')
    const authResponse = await hathora.authV1.loginAnonymous()
    
    const playerToken = authResponse.token
    if (!playerToken) {
      throw new Error('Failed to get player token from anonymous login')
    }
    console.log('✅ Player token created successfully')

    // Step 2: Create the room using roomsV2
    console.log(`🏠 Creating room in region: ${hathoraRegion}`)
    console.log(`🔍 Debug - about to call createRoom with region: "${hathoraRegion}"`)
    const roomResponse = await hathora.roomsV2.createRoom({
      createRoomParams: {
        region: hathoraRegion
      }
    })

    const roomId = roomResponse.roomId
    if (!roomId) {
      throw new Error('Failed to get room ID from room creation')
    }
    console.log(`✅ Room created successfully with ID: ${roomId}`)

    // Step 3: Get connection info for the room
    console.log('🔗 Getting connection info for room...')
    
    const connectionInfo = await hathora.roomsV2.getConnectionInfo({
      roomId,
      playerToken
    })

    const connectionData = connectionInfo
    if (!connectionData?.host || !connectionData?.port) {
      throw new Error('Failed to get connection info from Hathora')
    }

    console.log('✅ Connection info retrieved successfully')

    // Return real room information to client
    const roomInfo = {
      success: true,
      roomId: roomId,
      host: connectionData.host,
      port: connectionData.port,
      region: region || hathoraRegion,
      gameMode,
      maxPlayers,
      stakeAmount,
      playerToken: playerToken,
      isHathoraRoom: true,
      isMockRoom: false, // This is real Hathora data
      timestamp: new Date().toISOString()
    }

    console.log(`🎉 Real Hathora room info prepared for client:`, {
      roomId: roomInfo.roomId,
      host: roomInfo.host,
      port: roomInfo.port,
      hasToken: !!roomInfo.playerToken,
      isMock: false
    })

    return NextResponse.json(roomInfo, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Server-side room creation failed:', error)
    
    // Enhanced error logging for debugging
    if (error.response) {
      console.error('❌ Hathora API error response:', error.response.status, error.response.data)
    }
    if (error.request) {
      console.error('❌ Hathora API request failed:', error.request)
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create Hathora room',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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