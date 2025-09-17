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
        
        // Import and initialize Hathora client
        const hathoraClientModule = await import('@/lib/hathoraClient')
        const hathoraClient = hathoraClientModule.default
        
        // Initialize the client
        const initialized = await hathoraClient.initialize()
        if (!initialized) {
          throw new Error('Failed to initialize Hathora client')
        }
        
        console.log('✅ Hathora client initialized successfully')
        
        // Create actual Hathora room process
        let roomId
        if (stakeAmount > 0) {
          // Create paid room - now returns just room ID string
          roomId = await hathoraClient.createPaidRoom(stakeAmount, null, region)
        } else {
          // Create practice room - now returns just room ID string
          roomId = await hathoraClient.createOrJoinRoom(null, gameMode)
        }
        
        if (!roomId || typeof roomId !== 'string') {
          throw new Error('Failed to create Hathora room - invalid room ID returned')
        }
        
        console.log(`✅ Created Hathora room: ${roomId}`)
        
        return NextResponse.json({
          success: true,
          roomId: roomId,
          gameMode: gameMode,
          region: region || 'default',
          maxPlayers: maxPlayers,
          stakeAmount: stakeAmount,
          isHathoraRoom: true,
          connectionInfo: roomResult.connectionInfo || null, // Include connection info if available
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