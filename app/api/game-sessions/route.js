import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

// MongoDB connection helper
async function getDb() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  return { client, db: client.db('turfloot') }
}

const generateAnonymousId = () => `anonymous_${Math.random().toString(36).slice(2, 11)}`

function resolveIdentifiers(source = {}, { allowGenerate = false } = {}) {
  const data = source?.session && typeof source.session === 'object'
    ? { ...source.session, ...source }
    : { ...source }

  const playerSessionId = data.playerSessionId || data.sessionId || data.colyseusSessionId || null
  const privyUserId = data.privyUserId || null
  let userId = data.userId || privyUserId || null
  const basePlayerIdentifier = data.playerIdentifier || data.identifier || null

  if (!userId && basePlayerIdentifier) {
    userId = basePlayerIdentifier
  }
  if (!userId && playerSessionId) {
    userId = playerSessionId
  }
  if (!userId && allowGenerate) {
    userId = generateAnonymousId()
  }

  const playerIdentifier = basePlayerIdentifier || userId || playerSessionId || null
  const uniqueIdentifier = playerSessionId || userId || playerIdentifier || null

  return {
    userId,
    privyUserId,
    playerIdentifier,
    playerSessionId,
    uniqueIdentifier
  }
}

function buildPlayerFilter(roomId, identifiers, { includeStatus = false } = {}) {
  if (!roomId) {
    throw new Error('Missing roomId')
  }

  const filter = { roomId }

  if (includeStatus) {
    filter.status = 'active'
  }

  if (identifiers.playerSessionId) {
    filter.playerSessionId = identifiers.playerSessionId
  } else if (identifiers.userId) {
    filter.userId = identifiers.userId
  } else if (identifiers.playerIdentifier) {
    filter.playerIdentifier = identifiers.playerIdentifier
  } else if (identifiers.uniqueIdentifier) {
    filter.uniqueIdentifier = identifiers.uniqueIdentifier
  } else {
    throw new Error('Missing player identifier')
  }

  return filter
}

export async function POST(request) {
  let client
  try {
    const body = await request.json()
    const { action, session, roomId, lastActivity } = body

    console.log(`🎮 Game session tracking: ${action}`, { roomId, session })

    const dbConnection = await getDb()
    client = dbConnection.client
    const db = dbConnection.db
    const gameSessions = db.collection('game_sessions')

    if (action === 'join') {
      // Player joining a room
      if (!session || !session.roomId) {
        return NextResponse.json({ error: 'Missing session data' }, { status: 400 })
      }

      // Create or update session record
      const identifiers = resolveIdentifiers(session, { allowGenerate: true })
      const sessionDoc = {
        ...session,
        userId: identifiers.userId,
        playerIdentifier: identifiers.playerIdentifier,
        playerSessionId: identifiers.playerSessionId,
        uniqueIdentifier: identifiers.uniqueIdentifier,
        status: 'active',
        joinedAt: session?.joinedAt ? new Date(session.joinedAt) : new Date(),
        lastActivity: session?.lastActivity ? new Date(session.lastActivity) : new Date()
      }

      if (identifiers.playerSessionId && !sessionDoc.colyseusSessionId) {
        sessionDoc.colyseusSessionId = identifiers.playerSessionId
      }

      const filter = buildPlayerFilter(session.roomId, identifiers)

      // Upsert session (create if new, update if exists)
      await gameSessions.updateOne(
        filter,
        { $set: sessionDoc },
        { upsert: true }
      )

      console.log(`✅ Player session recorded for room ${session.roomId}`)

    } else if (action === 'update') {
      // Player updating activity (heartbeat)
      if (!roomId || !lastActivity) {
        return NextResponse.json({ error: 'Missing roomId or lastActivity' }, { status: 400 })
      }

      let filter
      try {
        const identifiers = resolveIdentifiers(body)
        filter = buildPlayerFilter(roomId, identifiers, { includeStatus: true })
      } catch (identifierError) {
        return NextResponse.json({ error: identifierError.message }, { status: 400 })
      }

      // Update last activity timestamp for a single player session
      const updateResult = await gameSessions.updateOne(
        filter,
        { $set: { lastActivity: new Date(lastActivity) } }
      )

      if (updateResult.matchedCount === 0) {
        console.warn('⚠️ No matching session found for heartbeat update', { filter })
      }

      console.log(`🔄 Updated activity for room ${roomId}`)

    } else if (action === 'leave') {
      // Player leaving a room
      if (!roomId) {
        return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })
      }

      let leaveFilter
      try {
        const identifiers = resolveIdentifiers(body)
        leaveFilter = buildPlayerFilter(roomId, identifiers, { includeStatus: true })
      } catch (identifierError) {
        return NextResponse.json({ error: identifierError.message }, { status: 400 })
      }

      const leaveUpdate = {
        $set: {
          status: 'left',
          leftAt: new Date(),
          lastActivity: body?.lastActivity ? new Date(body.lastActivity) : new Date()
        }
      }

      const updateResult = await gameSessions.updateOne(leaveFilter, leaveUpdate)

      if (updateResult.matchedCount === 0) {
        console.warn('⚠️ No matching active session found to mark as left. Attempting targeted cleanup.', { leaveFilter })
        const deleteFilter = buildPlayerFilter(roomId, resolveIdentifiers(body), { includeStatus: false })
        const deleteResult = await gameSessions.deleteOne(deleteFilter)
        if (deleteResult.deletedCount > 0) {
          console.log('🗑️ Removed stale session document for departing player', { deleteFilter })
        }
      }

      console.log(`👋 Player left room ${roomId}`)

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      message: `Session ${action} completed successfully`
    })
    
  } catch (error) {
    console.error('❌ Error in game-sessions API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

export async function GET(request) {
  let client
  try {
    // Get active sessions for debugging/monitoring
    const dbConnection = await getDb()
    client = dbConnection.client
    const db = dbConnection.db
    const gameSessions = db.collection('game_sessions')

    // Get sessions active within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const activeSessions = await gameSessions.find({
      status: 'active',
      lastActivity: { $gte: fiveMinutesAgo }
    }).toArray()
    
    // Group sessions by room for easier viewing
    const sessionsByRoom = {}
    activeSessions.forEach(session => {
      if (!sessionsByRoom[session.roomId]) {
        sessionsByRoom[session.roomId] = []
      }
      sessionsByRoom[session.roomId].push({
        userId: session.userId,
        joinedAt: session.joinedAt,
        lastActivity: session.lastActivity,
        entryFee: session.entryFee,
        mode: session.mode,
        region: session.region
      })
    })
    
    return NextResponse.json({
      totalActiveSessions: activeSessions.length,
      sessionsByRoom,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error getting game sessions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}
