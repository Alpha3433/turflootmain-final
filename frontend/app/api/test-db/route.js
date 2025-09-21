import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export async function GET() {
  try {
    const client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    const db = client.db('turfloot')
    const collection = db.collection('game_sessions')
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const now = new Date()
    
    const allSessions = await collection.find({}).toArray()
    const recentSessions = await collection.find({
      'lastActivity': { $gte: tenMinutesAgo }
    }).toArray()
    
    await client.close()
    
    return NextResponse.json({
      tenMinutesAgo: tenMinutesAgo.toISOString(),
      now: now.toISOString(),
      totalSessions: allSessions.length,
      recentSessions: recentSessions.length,
      sampleSessions: allSessions.slice(0, 3).map(s => ({
        roomId: s.roomId,
        lastActivity: s.lastActivity,
        mode: s.mode
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}