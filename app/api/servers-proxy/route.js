import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔄 Servers-proxy route called - returning persistent 24/7 room')
    
    const colyseusEndpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud'
    
    // Always show the persistent 24/7 room as available
    // This room uses the original working room name for compatibility
    const serverData = {
      servers: [
        {
          id: 'global-turfloot-arena', // Use original working room identifier
          roomType: 'arena',
          name: 'TurfLoot Arena 24/7',
          region: 'Australia',
          regionId: 'au-syd',
          endpoint: colyseusEndpoint,
          maxPlayers: 50,
          currentPlayers: 0, // Will be updated dynamically by Colyseus
          entryFee: 0,
          gameType: 'Arena Battle',
          serverType: 'colyseus',
          isActive: true, // Always active
          canSpectate: true,
          ping: 0,
          status: 'active', // Always active and ready
          canJoin: true, // Always joinable
          creatorName: 'TurfLoot', // Official room
          creatorWallet: 'Official',
          description: 'Open 24/7 multiplayer arena - join anytime!',
          isPersistent: true, // Mark as persistent room
          lastUpdated: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      ],
      totalPlayers: 0, // Will be updated by real connections
      totalActiveServers: 1, // Always 1 active room
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