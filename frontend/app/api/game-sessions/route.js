import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

// MongoDB connection helper
async function getDb() {
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  return { client, db: client.db('turfloot') }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, session, roomId, lastActivity } = body
    
    console.log(`🎮 Game session tracking: ${action}`, { roomId, session })
    
    const { client, db } = await getDb()
    const gameSessions = db.collection('game_sessions')
    
    if (action === 'join') {
      // Player joining a room
      if (!session || !session.roomId) {
        return NextResponse.json({ error: 'Missing session data' }, { status: 400 })
      }
      
      // Create or update session record
      const sessionDoc = {
        ...session,
        userId: 'anonymous', // TODO: Add real Privy user ID when available
        joinedAt: new Date(session.joinedAt),
        lastActivity: new Date(session.lastActivity),
        status: 'active'
      }
      
      // Upsert session (create if new, update if exists)
      await gameSessions.updateOne(
        { roomId: session.roomId, userId: sessionDoc.userId },
        { $set: sessionDoc },
        { upsert: true }
      )
      
      console.log(`✅ Player session recorded for room ${session.roomId}`)
      
    } else if (action === 'update') {
      // Player updating activity (heartbeat)
      if (!roomId || !lastActivity) {
        return NextResponse.json({ error: 'Missing roomId or lastActivity' }, { status: 400 })
      }
      
      // Update last activity timestamp
      await gameSessions.updateMany(
        { roomId, status: 'active' },
        { $set: { lastActivity: new Date(lastActivity) } }
      )
      
      console.log(`🔄 Updated activity for room ${roomId}`)
      
    } else if (action === 'leave') {
      // Player leaving a room
      if (!roomId) {
        return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })
      }
      
      // Mark session as inactive or remove it
      await gameSessions.updateMany(
        { roomId, status: 'active' },
        { $set: { status: 'left', leftAt: new Date() } }
      )
      
      console.log(`👋 Player left room ${roomId}`)
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    await client.close()
    
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