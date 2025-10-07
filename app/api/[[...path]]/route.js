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

const ROOM_TIERS = {
  1: { entryFee: 100, bounty: 90, platformFee: 10 },
  5: { entryFee: 500, bounty: 450, platformFee: 50 },
  20: { entryFee: 2000, bounty: 1800, platformFee: 200 }
}

const PLATFORM_WALLET = '0x6657C1E107e9963EBbFc9Dfe510054238f7E8251'
const DAMAGE_ATTRIBUTION_WINDOW = 10_000
const CASHOUT_FEE_PERCENT = 10

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
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      body = await request.json()
    } catch (error) {
      console.log('No JSON body provided or failed to parse JSON:', error?.message || error)
      body = {}
    }
  }

  try {
    // Hathora room creation endpoint
    if (route === 'hathora/create-room') {
      try {
        const { gameMode = 'practice', region, maxPlayers = 50, stakeAmount = 0 } = body || {}
        
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
      return await handleCreateRoom(body)
    }

    // Join room endpoint
    if (route === 'rooms/join') {
      if (body && (body.roomTier !== undefined || body.matchId)) {
        return await handlePaidRoomJoin(body)
      }
      return await handleJoinRoom(body)
    }

    // Update room status endpoint
    if (route === 'rooms/status') {
      return await handleUpdateRoomStatus(body)
    }

    // Game sessions endpoint (existing)
    if (route === 'game-sessions') {
      return await handleGameSessions(body)
    }

    if (route === 'users/add-mission-reward') {
      return await handleAddMissionReward(body)
    }

    if (route === 'rooms/tiers') {
      return await handleGetRoomTiers(body)
    }

    if (route === 'rooms/damage') {
      return await handleRecordDamage(body)
    }

    if (route === 'rooms/eliminate') {
      return await handleProcessElimination(body)
    }

    if (route === 'rooms/cashout') {
      return await handleProcessCashout(body)
    }

    if (route === 'rooms/match') {
      return await handleGetMatchStatus(body)
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
async function handleCreateRoom(body = {}) {
  try {
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
async function handleJoinRoom(body = {}) {
  try {
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
async function handleUpdateRoomStatus(body = {}) {
  try {
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
async function handleGameSessions(body = {}) {
  try {
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

async function handleAddMissionReward(body = {}) {
  const { userId, missionType, rewardAmount, missionDescription, completedAt } = body || {}

  if (!userId || !missionType || rewardAmount === undefined) {
    return NextResponse.json(
      { error: 'userId, missionType, and rewardAmount are required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const database = await connectToDatabase()
    const usersCollection = database.collection('users')
    const now = new Date()

    const missionRecord = {
      id: uuidv4(),
      type: missionType,
      reward: rewardAmount,
      description: missionDescription,
      completedAt: completedAt ? new Date(completedAt) : now,
      createdAt: now
    }

    await usersCollection.updateOne(
      { userId },
      {
        $inc: { balance: rewardAmount },
        $push: { missionHistory: missionRecord },
        $setOnInsert: { createdAt: now },
        $set: { updatedAt: now }
      },
      { upsert: true }
    )

    const updatedUser = await usersCollection.findOne({ userId })
    const newBalance = updatedUser?.balance ?? rewardAmount

    console.log(`✅ Mission reward added for ${userId}: ${rewardAmount} (new balance: ${newBalance})`)

    return NextResponse.json(
      {
        success: true,
        message: 'Mission reward added successfully',
        rewardAmount,
        newBalance,
        missionType,
        description: missionDescription
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error adding mission reward:', error)
    return NextResponse.json(
      { error: 'Failed to add mission reward' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handlePaidRoomJoin(body = {}) {
  const { userId, roomTier, matchId } = body || {}
  const normalizedTier = Number(roomTier)

  if (!userId || !matchId || Number.isNaN(normalizedTier)) {
    return NextResponse.json(
      { error: 'userId, roomTier, and matchId are required' },
      { status: 400, headers: corsHeaders }
    )
  }

  const tierConfig = ROOM_TIERS[normalizedTier]
  if (!tierConfig) {
    return NextResponse.json(
      { error: 'Invalid room tier. Must be 1, 5, or 20' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const database = await connectToDatabase()
    const usersCollection = database.collection('users')
    const matchesCollection = database.collection('paid_matches')

    const [user, match] = await Promise.all([
      usersCollection.findOne({ userId }),
      matchesCollection.findOne({ matchId })
    ])

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    if (match && match.players && match.players[userId] && match.players[userId].status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Player already joined this match' },
        { status: 400, headers: corsHeaders }
      )
    }

    const currentBalance = user.balance || 0
    if (currentBalance < tierConfig.entryFee) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          requiredBalance: tierConfig.entryFee,
          currentBalance,
          tier: {
            entry: tierConfig.entryFee,
            bounty: tierConfig.bounty,
            platformFee: tierConfig.platformFee
          }
        },
        { status: 400, headers: corsHeaders }
      )
    }

    const now = new Date()

    await usersCollection.updateOne(
      { userId },
      {
        $inc: { balance: -tierConfig.entryFee },
        $set: { updatedAt: now }
      }
    )

    const playerRecord = {
      userId,
      status: 'ACTIVE',
      bountyEscrow: tierConfig.bounty,
      joinedAt: now,
      lastDamageTime: null,
      lastDamageBy: null,
      matchEarnings: 0
    }

    if (!match) {
      const newMatch = {
        matchId,
        roomTier: normalizedTier,
        status: 'ACTIVE',
        players: { [userId]: playerRecord },
        playerIds: [userId],
        rolloverPot: 0,
        platformFeesCollected: tierConfig.platformFee,
        totalEntryFees: tierConfig.entryFee,
        totalBounty: tierConfig.bounty,
        createdAt: now,
        updatedAt: now
      }

      await matchesCollection.insertOne(newMatch)
    } else {
      const updates = {
        $set: {
          [`players.${userId}`]: playerRecord,
          updatedAt: now,
          roomTier: match.roomTier || normalizedTier,
          status: match.status || 'ACTIVE'
        },
        $addToSet: { playerIds: userId },
        $inc: {
          platformFeesCollected: tierConfig.platformFee,
          totalEntryFees: tierConfig.entryFee,
          totalBounty: tierConfig.bounty
        }
      }

      if (!match.roomTier) {
        updates.$set.roomTier = normalizedTier
      }

      if (!match.status) {
        updates.$set.status = 'ACTIVE'
      }

      await matchesCollection.updateOne({ matchId }, updates)
    }

    console.log(
      `💰 User ${userId} joined $${normalizedTier} room. Entry fee deducted: $${tierConfig.entryFee / 100}, bounty escrow: $${tierConfig.bounty / 100}`
    )
    console.log(`🏦 Platform fee of $${tierConfig.platformFee / 100} earmarked for ${PLATFORM_WALLET}`)

    return NextResponse.json(
      {
        success: true,
        message: `Successfully joined $${normalizedTier} room`,
        matchId,
        playerBounty: tierConfig.bounty,
        platformFee: tierConfig.platformFee,
        remainingBalance: currentBalance - tierConfig.entryFee
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error joining paid room:', error)
    return NextResponse.json(
      { error: 'Failed to join paid room' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleRecordDamage(body = {}) {
  const { matchId, victimUserId, attackerUserId } = body || {}

  if (!matchId || !victimUserId || !attackerUserId) {
    return NextResponse.json(
      { error: 'matchId, victimUserId, and attackerUserId are required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const database = await connectToDatabase()
    const matchesCollection = database.collection('paid_matches')
    const match = await matchesCollection.findOne({ matchId })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const victim = match.players?.[victimUserId]
    const attacker = match.players?.[attackerUserId]

    if (!victim || victim.status !== 'ACTIVE' || !attacker || attacker.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Invalid victim or attacker' },
        { status: 400, headers: corsHeaders }
      )
    }

    await matchesCollection.updateOne(
      { matchId },
      {
        $set: {
          [`players.${victimUserId}.lastDamageTime`]: new Date(),
          [`players.${victimUserId}.lastDamageBy`]: attackerUserId,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json(
      { success: true, message: 'Damage attribution recorded' },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error recording damage:', error)
    return NextResponse.json(
      { error: 'Failed to record damage' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleProcessElimination(body = {}) {
  const { matchId, victimUserId, killerUserId, eliminationType } = body || {}

  if (!matchId || !victimUserId) {
    return NextResponse.json(
      { error: 'matchId and victimUserId are required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const database = await connectToDatabase()
    const matchesCollection = database.collection('paid_matches')
    const usersCollection = database.collection('users')

    const match = await matchesCollection.findOne({ matchId })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const victim = match.players?.[victimUserId]

    if (!victim || victim.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Victim not found or not active in match' },
        { status: 400, headers: corsHeaders }
      )
    }

    const now = new Date()
    let bountyTransfer = victim.bountyEscrow || 0
    let rolloverAddition = 0
    let killerPayout = 0

    const killer = killerUserId ? match.players?.[killerUserId] : null
    const lastDamageTime = victim.lastDamageTime ? new Date(victim.lastDamageTime) : null
    const withinWindow = lastDamageTime ? now - lastDamageTime <= DAMAGE_ATTRIBUTION_WINDOW : false
    const killerMatchesAttribution = victim.lastDamageBy && victim.lastDamageBy === killerUserId
    const validKiller = killer && killer.status === 'ACTIVE' && withinWindow && killerMatchesAttribution

    if (validKiller) {
      killerPayout = bountyTransfer + (match.rolloverPot || 0)
      await usersCollection.updateOne(
        { userId: killerUserId },
        {
          $inc: { balance: killerPayout },
          $set: { updatedAt: now }
        },
        { upsert: true }
      )

      await matchesCollection.updateOne(
        { matchId },
        {
          $inc: { [`players.${killerUserId}.matchEarnings`]: killerPayout },
          $set: {
            rolloverPot: 0,
            [`players.${victimUserId}.status`]: 'ELIMINATED',
            [`players.${victimUserId}.eliminatedAt`]: now,
            [`players.${victimUserId}.eliminatedBy`]: killerUserId,
            [`players.${victimUserId}.eliminationType`]: eliminationType || 'KILL',
            [`players.${victimUserId}.bountyEscrow`]: 0,
            updatedAt: now
          }
        }
      )

      console.log(
        `⚔️ ${killerUserId} eliminated ${victimUserId}, earned $${(killerPayout / 100).toFixed(2)} (bounty: $${(bountyTransfer / 100).toFixed(2)}, rollover: $${((match.rolloverPot || 0) / 100).toFixed(2)})`
      )
    } else {
      rolloverAddition = bountyTransfer

      await matchesCollection.updateOne(
        { matchId },
        {
          $inc: { rolloverPot: rolloverAddition },
          $set: {
            [`players.${victimUserId}.status`]: 'ELIMINATED',
            [`players.${victimUserId}.eliminatedAt`]: now,
            [`players.${victimUserId}.eliminatedBy`]: killerUserId || null,
            [`players.${victimUserId}.eliminationType`]: eliminationType || 'SUICIDE',
            [`players.${victimUserId}.bountyEscrow`]: 0,
            updatedAt: now
          }
        }
      )

      console.log(
        `💀 ${victimUserId} eliminated with no credited killer. $${(bountyTransfer / 100).toFixed(2)} added to rollover pot.`
      )
    }

    let updatedMatch = await matchesCollection.findOne({ matchId })

    if (updatedMatch) {
      const activePlayers = Object.values(updatedMatch.players || {}).filter(player => player.status === 'ACTIVE').length
      if (activePlayers <= 1 && updatedMatch.status !== 'SETTLED') {
        await matchesCollection.updateOne(
          { matchId },
          {
            $set: {
              status: 'SETTLED',
              settledAt: now,
              updatedAt: now
            }
          }
        )
        updatedMatch = await matchesCollection.findOne({ matchId })
        console.log(`🏁 Match ${matchId} settled with ${activePlayers} active players remaining`)
      }
    }

    const responseMatch = updatedMatch || match

    return NextResponse.json(
      {
        success: true,
        bountyTransferred: bountyTransfer,
        rolloverPot: responseMatch.rolloverPot,
        killerEarnings: killerPayout,
        matchStatus: responseMatch.status || 'ACTIVE'
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error processing elimination:', error)
    return NextResponse.json(
      { error: 'Failed to process elimination' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleProcessCashout(body = {}) {
  const { matchId, userId } = body || {}

  if (!matchId || !userId) {
    return NextResponse.json(
      { error: 'matchId and userId are required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const database = await connectToDatabase()
    const matchesCollection = database.collection('paid_matches')
    const usersCollection = database.collection('users')

    const match = await matchesCollection.findOne({ matchId })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const player = match.players?.[userId]

    if (!player || player.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Player not found or not active in match' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!player.matchEarnings || player.matchEarnings <= 0) {
      return NextResponse.json(
        { error: 'No earnings to cash out' },
        { status: 400, headers: corsHeaders }
      )
    }

    const grossEarnings = player.matchEarnings
    const cashoutFee = Math.floor(grossEarnings * CASHOUT_FEE_PERCENT / 100)
    const netEarnings = grossEarnings - cashoutFee
    const now = new Date()

    await usersCollection.updateOne(
      { userId },
      {
        $inc: { balance: netEarnings },
        $set: { updatedAt: now }
      },
      { upsert: true }
    )

    await matchesCollection.updateOne(
      { matchId },
      {
        $set: {
          [`players.${userId}.status`]: 'LEFT',
          [`players.${userId}.cashedOutAt`]: now,
          [`players.${userId}.cashoutFee`]: cashoutFee,
          [`players.${userId}.netCashout`]: netEarnings,
          updatedAt: now
        },
        $inc: { platformFeesCollected: cashoutFee }
      }
    )

    let updatedMatch = await matchesCollection.findOne({ matchId })
    if (updatedMatch) {
      const activePlayers = Object.values(updatedMatch.players || {}).filter(player => player.status === 'ACTIVE').length
      if (activePlayers <= 1 && updatedMatch.status !== 'SETTLED') {
        await matchesCollection.updateOne(
          { matchId },
          {
            $set: {
              status: 'SETTLED',
              settledAt: now,
              updatedAt: now
            }
          }
        )
        updatedMatch = await matchesCollection.findOne({ matchId })
      }
    }

    console.log(
      `💰 ${userId} cashed out $${(netEarnings / 100).toFixed(2)} (fee: $${(cashoutFee / 100).toFixed(2)}) from match ${matchId}`
    )
    console.log(`🏦 Cashout fee of $${(cashoutFee / 100).toFixed(2)} to be sent to ${PLATFORM_WALLET}`)

    return NextResponse.json(
      {
        success: true,
        grossEarnings,
        cashoutFee,
        netEarnings,
        message: `Successfully cashed out $${(netEarnings / 100).toFixed(2)}`
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error processing cashout:', error)
    return NextResponse.json(
      { error: 'Failed to process cashout' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleGetMatchStatus(body = {}) {
  const { matchId } = body || {}

  if (!matchId) {
    return NextResponse.json(
      { error: 'matchId is required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const database = await connectToDatabase()
    const matchesCollection = database.collection('paid_matches')
    const match = await matchesCollection.findOne({ matchId })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const activePlayers = Object.values(match.players || {}).filter(player => player.status === 'ACTIVE').length
    const totalBounty = Object.values(match.players || {}).reduce((sum, player) => sum + (player.bountyEscrow || 0), 0)
    const totalEarnings = Object.values(match.players || {}).reduce((sum, player) => sum + (player.matchEarnings || 0), 0)

    return NextResponse.json(
      {
        success: true,
        match: {
          matchId: match.matchId,
          status: match.status,
          roomTier: match.roomTier,
          activePlayers,
          rolloverPot: match.rolloverPot || 0,
          platformFeesCollected: match.platformFeesCollected || 0,
          totalBounty,
          totalEarnings,
          createdAt: match.createdAt,
          players: match.players
        }
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error getting match status:', error)
    return NextResponse.json(
      { error: 'Failed to get match status' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleGetRoomTiers(body = {}) {
  const { userId } = body || {}

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const database = await connectToDatabase()
    const usersCollection = database.collection('users')
    const user = await usersCollection.findOne({ userId })
    const userBalance = user?.balance || 0

    const tiers = Object.entries(ROOM_TIERS).map(([tier, config]) => ({
      tier: Number(tier),
      entryFee: config.entryFee,
      entryFeeDisplay: `$${(config.entryFee / 100).toFixed(2)}`,
      bounty: config.bounty,
      bountyDisplay: `$${(config.bounty / 100).toFixed(2)}`,
      platformFee: config.platformFee,
      platformFeeDisplay: `$${(config.platformFee / 100).toFixed(2)}`,
      affordable: userBalance >= config.entryFee,
      description: `$${tier} → $${(config.bounty / 100).toFixed(2)} bounty, $${(config.platformFee / 100).toFixed(2)} fee`
    }))

    return NextResponse.json(
      {
        success: true,
        userBalance,
        userBalanceDisplay: `$${(userBalance / 100).toFixed(2)}`,
        tiers,
        platformWallet: PLATFORM_WALLET
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error getting room tiers:', error)
    return NextResponse.json(
      { error: 'Failed to get room tiers' },
      { status: 500, headers: corsHeaders }
    )
  }
}
