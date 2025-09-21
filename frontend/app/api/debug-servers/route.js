import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export async function GET() {
  try {
    const client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    
    const db = client.db('turfloot')
    const sessionsCollection = db.collection('game_sessions')
    
    // Get all sessions for debugging
    const allSessions = await sessionsCollection.find({}).toArray()
    console.log('📊 Total sessions in database:', allSessions.length)
    
    // Get active Colyseus sessions (last activity within 2 minutes) 
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    console.log('🕐 Looking for sessions newer than:', twoMinutesAgo.toISOString())
    
    const activeSessions = await sessionsCollection.find({
      'lastActivity': { $gte: twoMinutesAgo },
      'mode': { $regex: /colyseus/i }
    }).toArray()
    
    console.log('🔍 Database query found:', activeSessions.length, 'sessions')
    console.log('📝 Active sessions:', activeSessions.map(s => ({
      roomId: s.roomId,
      lastActivity: s.lastActivity,
      mode: s.mode,
      region: s.region,
      userId: s.userId
    })))
    
    await client.close()
    
    return NextResponse.json({
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      sessions: activeSessions,
      twoMinutesAgo: twoMinutesAgo.toISOString()
    })
    
  } catch (error) {
    console.error('❌ Debug API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}