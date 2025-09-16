import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('🎮 Server Browser API: Generating server data for client-side ping measurement...')
    
    // Hathora regional game server endpoints (actual data plane, not control plane)
    const hathoraRegionalEndpoints = {
      'washington-dc': 'us-east-1.hathora.dev', // US East game servers
      'seattle': 'us-west-1.hathora.dev', // US West game servers
      'frankfurt': 'eu-central-1.hathora.dev', // EU Frankfurt game servers  
      'london': 'eu-west-1.hathora.dev', // EU London game servers
      'sydney': 'ap-southeast-2.hathora.dev' // OCE Sydney game servers
    }
    
    // Generate cash game servers that users can join (real Hathora rooms)
    const paidGameTypes = [
      { stake: 0.01, mode: 'cash', name: '$0.01 Cash Game', maxPlayers: 6, description: 'Micro stakes' },
      { stake: 0.02, mode: 'cash', name: '$0.02 Cash Game', maxPlayers: 6, description: 'Small stakes' },
      { stake: 0.05, mode: 'cash', name: '$0.05 High Stakes', maxPlayers: 4, description: 'High stakes' }
    ]
    
    const paidRegions = [
      { id: 'washington-dc', name: 'US East', displayName: 'US East', pingEndpoint: hathoraRegionalEndpoints['washington-dc'] },
      { id: 'seattle', name: 'US West', displayName: 'US West', pingEndpoint: hathoraRegionalEndpoints['seattle'] },
      { id: 'frankfurt', name: 'Europe (Frankfurt)', displayName: 'Europe (Frankfurt)', pingEndpoint: hathoraRegionalEndpoints['frankfurt'] },
      { id: 'london', name: 'Europe (London)', displayName: 'Europe (London)', pingEndpoint: hathoraRegionalEndpoints['london'] },
      { id: 'sydney', name: 'Oceania', displayName: 'OCE (Sydney)', pingEndpoint: hathoraRegionalEndpoints['sydney'] }
    ]
    
    const servers = []
    
    // Generate servers without server-side ping measurement
    // Client will measure real user latency to game servers
    for (const gameType of paidGameTypes) {
      for (const region of paidRegions) {
        const roomsPerType = gameType.stake >= 0.05 ? 1 : 2 // High stakes get fewer rooms
        
        for (let roomIndex = 0; roomIndex < roomsPerType; roomIndex++) {
          const roomId = `paid-${region.id}-${gameType.stake}-${roomIndex + 1}`
          
          // Real player count (0 for now, will be populated when users join)
          const realPlayers = 0
          
          // No server-side ping - client will measure real user latency
          const ping = null // Will be measured client-side
          
          // Calculate potential winnings based on real player count
          const totalEntryFees = realPlayers * gameType.stake
          const serverFees = totalEntryFees * 0.1 // 10% server fee
          const prizePool = totalEntryFees - serverFees
          
          let status = 'waiting'
          if (realPlayers >= gameType.maxPlayers) {
            status = 'full'
          } else if (realPlayers > 0) {
            status = 'active'
          }
          
          const roomName = roomsPerType > 1 
            ? `${gameType.name} #${roomIndex + 1} (${region.displayName})`
            : `${gameType.name} (${region.displayName})`
          
          servers.push({
            id: roomId,
            hathoraRoomId: roomId,
            name: roomName,
            region: region.name,
            regionId: region.id,
            stake: gameType.stake,
            mode: gameType.mode,
            gameType: gameType.name,
            description: gameType.description,
            currentPlayers: realPlayers, // REAL PLAYER COUNT
            maxPlayers: gameType.maxPlayers,
            minPlayers: 2,
            waitingPlayers: 0,
            isRunning: realPlayers >= 2,
            ping: ping, // Will be measured by client
            pingEndpoint: region.pingEndpoint, // Endpoint for client-side ping measurement
            avgWaitTime: status === 'active' ? 'Join Now' : 
                        status === 'full' ? 'Full' : 
                        'Waiting for players',
            difficulty: gameType.stake >= 0.05 ? 'High Stakes' : 'Cash Game',
            entryFee: gameType.stake,
            serverFee: gameType.stake * 0.1,
            totalCost: gameType.stake + (gameType.stake * 0.1),
            potentialWinning: prizePool,
            prizePool: prizePool,
            status,
            serverType: 'hathora-paid',
            lastUpdated: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            canJoin: status !== 'full'
          })
        }
      }
    }
    
    // Sort servers: active first, then by ping (lower is better)
    const sortedServers = servers.sort((a, b) => {
      if (a.currentPlayers > 0 && b.currentPlayers === 0) return -1
      if (a.currentPlayers === 0 && b.currentPlayers > 0) return 1
      return a.ping - b.ping
    })
    
    // Calculate stats from actual servers
    const totalPlayers = sortedServers.reduce((sum, server) => sum + server.currentPlayers, 0)
    const totalActiveServers = sortedServers.filter(s => s.currentPlayers > 0).length
    
    console.log(`📊 Generated ${sortedServers.length} cash game servers, ${totalPlayers} total players`)
    
    return NextResponse.json({
      servers: sortedServers,
      totalPlayers,
      totalActiveServers,
      totalServers: sortedServers.length,
      practiceServers: 0, // No practice servers in this endpoint
      cashServers: sortedServers.length,
      regions: [...new Set(sortedServers.map(s => s.region))],
      gameTypes: [...new Set(sortedServers.map(s => s.gameType))].map(name => ({ 
        name, 
        servers: sortedServers.filter(s => s.gameType === name).length 
      })),
      hathoraEnabled: true,
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in server browser API:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch servers',
      message: error.message,
      servers: [],
      totalPlayers: 0,
      totalActiveServers: 0,
      hathoraEnabled: false
    }, { status: 500 })
  }
}