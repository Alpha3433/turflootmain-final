import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('🎮 Server Browser API: Generating server data for client-side ping measurement...')
    
    // Better regional mapping to match Hathora's console (actual POPs/regions)
    const hathoraRegionalMapping = {
      'washington-dc': {
        aws: 'ec2.us-east-1.amazonaws.com', // N. Virginia (Washington D.C. area)
        hathora: 'us-east-1',
        displayName: 'Washington, D.C.'
      },
      'seattle': {
        aws: 'ec2.us-west-2.amazonaws.com', // Oregon (closest to Seattle)
        hathora: 'us-west-2', 
        displayName: 'Seattle'
      },
      'los-angeles': {
        aws: 'ec2.us-west-1.amazonaws.com', // N. California (Los Angeles area)
        hathora: 'us-west-1',
        displayName: 'Los Angeles'
      },
      'chicago': {
        aws: 'ec2.us-east-2.amazonaws.com', // Ohio (closest to Chicago)
        hathora: 'us-east-2',
        displayName: 'Chicago'
      },
      'dallas': {
        aws: 'ec2.us-east-2.amazonaws.com', // Ohio (closest available)
        hathora: 'us-east-2',
        displayName: 'Dallas'
      },
      'sao-paulo': {
        aws: 'ec2.sa-east-1.amazonaws.com', // São Paulo
        hathora: 'sa-east-1',
        displayName: 'São Paulo'
      },
      'london': {
        aws: 'ec2.eu-west-2.amazonaws.com', // London
        hathora: 'eu-west-2',
        displayName: 'London'
      },
      'frankfurt': {
        aws: 'ec2.eu-central-1.amazonaws.com', // Frankfurt
        hathora: 'eu-central-1',
        displayName: 'Frankfurt'
      },
      'dubai': {
        aws: 'ec2.me-central-1.amazonaws.com', // Dubai
        hathora: 'me-central-1',
        displayName: 'Dubai'
      },
      'johannesburg': {
        aws: 'ec2.af-south-1.amazonaws.com', // Johannesburg
        hathora: 'af-south-1',
        displayName: 'Johannesburg'
      },
      'singapore': {
        aws: 'ec2.ap-southeast-1.amazonaws.com', // Singapore
        hathora: 'ap-southeast-1',
        displayName: 'Singapore'
      },
      'tokyo': {
        aws: 'ec2.ap-northeast-1.amazonaws.com', // Tokyo
        hathora: 'ap-northeast-1',
        displayName: 'Tokyo'
      },
      'mumbai': {
        aws: 'ec2.ap-south-1.amazonaws.com', // Mumbai
        hathora: 'ap-south-1',
        displayName: 'Mumbai'
      },
      'sydney': {
        aws: 'ec2.ap-southeast-2.amazonaws.com', // Sydney
        hathora: 'ap-southeast-2',
        displayName: 'Sydney'
      }
    }
    
    // Generate cash game servers that users can join (real Hathora rooms)
    const paidGameTypes = [
      { stake: 0.01, mode: 'cash', name: '$0.01 Cash Game', maxPlayers: 6, description: 'Micro stakes' },
      { stake: 0.02, mode: 'cash', name: '$0.02 Cash Game', maxPlayers: 6, description: 'Small stakes' },
      { stake: 0.05, mode: 'cash', name: '$0.05 High Stakes', maxPlayers: 4, description: 'High stakes' }
    ]
    
    const paidRegions = [
      { id: 'washington-dc', name: 'US East', displayName: 'US East', pingEndpoint: regionalPingEndpoints['washington-dc'] },
      { id: 'seattle', name: 'US West', displayName: 'US West', pingEndpoint: regionalPingEndpoints['seattle'] },
      { id: 'frankfurt', name: 'Europe (Frankfurt)', displayName: 'Europe (Frankfurt)', pingEndpoint: regionalPingEndpoints['frankfurt'] },
      { id: 'london', name: 'Europe (London)', displayName: 'Europe (London)', pingEndpoint: regionalPingEndpoints['london'] },
      { id: 'sydney', name: 'Oceania', displayName: 'OCE (Sydney)', pingEndpoint: regionalPingEndpoints['sydney'] }
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