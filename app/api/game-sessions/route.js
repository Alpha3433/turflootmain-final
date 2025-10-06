import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { randomUUID } from 'crypto'

// MongoDB connection helper
async function getDb() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  return { client, db: client.db('turfloot') }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      action,
      session,
      roomId,
      lastActivity,
      sessionId: bodySessionId,
      userId: bodyUserId
    } = body

    console.log(`🎮 Game session tracking: ${action}`, { roomId, session, bodySessionId, bodyUserId })
    
    const { client, db } = await getDb()
    const gameSessions = db.collection('game_sessions')
    
    let resolvedSessionId = null
    let resolvedUserId = null

    if (action === 'join') {
      // Player joining a room
      const normalizedRoomId = session?.roomId || roomId

      if (!normalizedRoomId) {
        return NextResponse.json({ error: 'Missing session data' }, { status: 400 })
      }

      resolvedSessionId = typeof session.sessionId === 'string' && session.sessionId.trim()
        ? session.sessionId.trim()
        : (typeof bodySessionId === 'string' && bodySessionId.trim() ? bodySessionId.trim() : randomUUID())

      resolvedUserId = typeof session.userId === 'string' && session.userId.trim()
        ? session.userId.trim()
        : (typeof bodyUserId === 'string' && bodyUserId.trim() ? bodyUserId.trim() : resolvedSessionId)

      const now = new Date()
      const joinedAt = session.joinedAt ? new Date(session.joinedAt) : now
      const lastActivityAt = session.lastActivity ? new Date(session.lastActivity) : now

      const sessionDoc = {
        ...session,
        roomId: normalizedRoomId,
        sessionId: resolvedSessionId,
        userId: resolvedUserId,
        joinedAt,
        lastActivity: lastActivityAt,
        status: 'active'
      }

      await gameSessions.updateOne(
        { sessionId: resolvedSessionId },
        { $set: sessionDoc },
        { upsert: true }
      )

      console.log(`✅ Player session recorded for room ${normalizedRoomId} (sessionId=${resolvedSessionId})`)

    } else if (action === 'update') {
      // Player updating activity (heartbeat)
      resolvedSessionId = typeof bodySessionId === 'string' && bodySessionId.trim()
        ? bodySessionId.trim()
        : (typeof session?.sessionId === 'string' && session.sessionId.trim() ? session.sessionId.trim() : null)

      resolvedUserId = typeof bodyUserId === 'string' && bodyUserId.trim()
        ? bodyUserId.trim()
        : (typeof session?.userId === 'string' && session.userId.trim() ? session.userId.trim() : null)

      if (!roomId || !lastActivity) {
        return NextResponse.json({ error: 'Missing roomId or lastActivity' }, { status: 400 })
      }

      if (!resolvedSessionId && resolvedUserId) {
        const existing = await gameSessions.findOne({ roomId, userId: resolvedUserId, status: 'active' })
        if (existing) {
          resolvedSessionId = existing.sessionId
        }
      }

      if (!resolvedSessionId || !resolvedUserId) {
        return NextResponse.json({ error: 'Missing roomId, sessionId, userId, or lastActivity' }, { status: 400 })
      }

      await gameSessions.updateOne(
        { sessionId: resolvedSessionId, userId: resolvedUserId },
        { $set: { lastActivity: new Date(lastActivity), status: 'active', roomId } }
      )

      console.log(`🔄 Updated activity for room ${roomId} (sessionId=${resolvedSessionId})`)

    } else if (action === 'leave') {
      // Player leaving a room
      resolvedSessionId = typeof bodySessionId === 'string' && bodySessionId.trim()
        ? bodySessionId.trim()
        : (typeof session?.sessionId === 'string' && session.sessionId.trim() ? session.sessionId.trim() : null)

      resolvedUserId = typeof bodyUserId === 'string' && bodyUserId.trim()
        ? bodyUserId.trim()
        : (typeof session?.userId === 'string' && session.userId.trim() ? session.userId.trim() : null)

      if (!roomId) {
        return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })
      }

      if (!resolvedSessionId && resolvedUserId) {
        const existing = await gameSessions.findOne({ roomId, userId: resolvedUserId, status: 'active' })
        if (existing) {
          resolvedSessionId = existing.sessionId
        }
      }

      if (!resolvedSessionId || !resolvedUserId) {
        return NextResponse.json({ error: 'Missing roomId, sessionId, or userId' }, { status: 400 })
      }

      await gameSessions.updateOne(
        { sessionId: resolvedSessionId, userId: resolvedUserId, status: 'active' },
        { $set: { status: 'left', leftAt: new Date(), roomId } }
      )

      console.log(`👋 Player left room ${roomId} (sessionId=${resolvedSessionId})`)

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await client.close()

    return NextResponse.json({
      success: true,
      action,
      message: `Session ${action} completed successfully`,
      sessionId: resolvedSessionId,
      userId: resolvedUserId
    })
    
  } catch (error) {
    console.error('❌ Error in game-sessions API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    // Get active sessions for debugging/monitoring
    const { client, db } = await getDb()
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
        sessionId: session.sessionId,
        userId: session.userId,
        joinedAt: session.joinedAt,
        lastActivity: session.lastActivity,
        entryFee: session.entryFee,
        mode: session.mode,
        region: session.region
      })
    })
    
    await client.close()
    
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
  }
}