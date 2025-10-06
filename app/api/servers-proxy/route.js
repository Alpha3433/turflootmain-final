import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔄 Servers-proxy route called - returning persistent 24/7 room')
    
    const colyseusEndpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud'
    
    // Always show the persistent 24/7 room as available
    // This room uses the original working room name for compatibility
    const now = new Date().toISOString()

    const serverData = {
      servers: [
        {
          id: 'global-turfloot-arena', // Use original working room identifier
          roomType: 'arena',
          name: 'Turfloot $1 Room - Australia',
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
          lastUpdated: now,
          timestamp: now
        },
        {
          id: 'turfloot-au-5',
          roomType: 'arena',
          name: 'Turfloot $5 Room - Australia',
          region: 'Australia',
          regionId: 'au-syd',
          endpoint: colyseusEndpoint,
          maxPlayers: 50,
          currentPlayers: 0,
          entryFee: 5,
          gameType: 'Arena Battle',
          serverType: 'colyseus',
          isActive: true,
          canSpectate: true,
          ping: 0,
          status: 'active',
          canJoin: true,
          creatorName: 'TurfLoot',
          creatorWallet: 'Official',
          description: 'Competitive $5 entry arena for Australian players.',
          isPersistent: true,
          lastUpdated: now,
          timestamp: now
        },
        {
          id: 'turfloot-au-20',
          roomType: 'arena',
          name: 'Turfloot $20 Room - Australia',
          region: 'Australia',
          regionId: 'au-syd',
          endpoint: colyseusEndpoint,
          maxPlayers: 50,
          currentPlayers: 0,
          entryFee: 20,
          gameType: 'Arena Battle',
          serverType: 'colyseus',
          isActive: true,
          canSpectate: true,
          ping: 0,
          status: 'active',
          canJoin: true,
          creatorName: 'TurfLoot',
          creatorWallet: 'Official',
          description: 'High-stakes $20 arena for Australian competitors.',
          isPersistent: true,
          lastUpdated: now,
          timestamp: now
        }
      ],
      totalPlayers: 0, // Will be updated by real connections
      totalActiveServers: 3, // Always 3 active rooms
      totalServers: 3,
      practiceServers: 1,
      cashServers: 2,
      regions: ['Australia'],
      gameTypes: ['Arena Battle'],
      colyseusEnabled: true,
      colyseusEndpoint: colyseusEndpoint,
      lastUpdated: now,
      timestamp: now
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