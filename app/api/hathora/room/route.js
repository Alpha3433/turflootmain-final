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

    // TEMPORARY: Mock room creation for immediate testing
    // TODO: Fix real Hathora SDK integration once parameter structure is resolved
    console.log('⚠️ Using mock room creation for testing - real SDK integration needs parameter fixes')
    
    // Generate a realistic room ID format
    const mockRoomId = `${gameMode}-${region || 'auto'}-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`
    
    // Mock connection info (replace with real Hathora endpoints later)
    const mockConnectionInfo = {
      host: 'localhost', // Will be replaced with real Hathora host
      port: 3001,        // Will be replaced with real Hathora port
      roomId: mockRoomId
    }
    
    // Mock player token (replace with real Hathora token later)
    const mockPlayerToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
    
    console.log(`✅ Mock room created: ${mockRoomId}`)
    console.log(`✅ Mock connection: ${mockConnectionInfo.host}:${mockConnectionInfo.port}`)
    console.log(`✅ Mock token generated`)

    // Return mock room information to client (same format as real implementation)
    const roomInfo = {
      success: true,
      roomId: mockRoomId,
      host: mockConnectionInfo.host,
      port: mockConnectionInfo.port,
      region: region || 'auto',
      gameMode,
      maxPlayers,
      stakeAmount,
      playerToken: mockPlayerToken,
      isHathoraRoom: true,
      isMockRoom: true, // Flag to indicate this is mock data
      timestamp: new Date().toISOString()
    }

    console.log(`🎉 Mock room info prepared for client:`, {
      roomId: roomInfo.roomId,
      host: roomInfo.host,
      port: roomInfo.port,
      hasToken: !!roomInfo.playerToken,
      isMock: true
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