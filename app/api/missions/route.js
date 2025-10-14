import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../lib/mongodb.js'

// GET /api/missions - Get user's mission progress
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdentifier = searchParams.get('userIdentifier')
    
    if (!userIdentifier) {
      return NextResponse.json({ error: 'User identifier required' }, { status: 400 })
    }
    
    console.log(`📋 Fetching missions for user: ${userIdentifier}`)
    
    const { db } = await connectToDatabase()
    const missionsCollection = db.collection('user_missions')
    
    // Get user's mission data
    const userMissions = await missionsCollection.findOne({ userIdentifier })
    
    if (!userMissions) {
      return NextResponse.json({
        success: true,
        completedMissions: [],
        coinBalance: 0
      })
    }
    
    return NextResponse.json({
      success: true,
      completedMissions: userMissions.completedMissions || [],
      coinBalance: userMissions.coinBalance || 0,
      lastUpdated: userMissions.lastUpdated
    })
    
  } catch (error) {
    console.error('❌ Error fetching missions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch missions', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/missions - Complete a mission and award coins
export async function POST(request) {
  try {
    const body = await request.json()
    const { userIdentifier, missionId, missionType, coinsAwarded } = body
    
    if (!userIdentifier || !missionId) {
      return NextResponse.json({ error: 'User identifier and mission ID required' }, { status: 400 })
    }
    
    console.log(`🎯 Mission completed: ${missionId} by ${userIdentifier} | Coins: ${coinsAwarded}`)
    
    const { db } = await connectToDatabase()
    const missionsCollection = db.collection('user_missions')
    
    // Update user missions - add to completed list and add coins
    const result = await missionsCollection.updateOne(
      { userIdentifier },
      {
        $addToSet: { 
          completedMissions: missionId 
        },
        $inc: { 
          coinBalance: coinsAwarded || 0 
        },
        $set: {
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    )
    
    // Get updated data
    const updatedMissions = await missionsCollection.findOne({ userIdentifier })
    
    console.log(`✅ Mission saved: ${missionId} | New coin balance: ${updatedMissions.coinBalance}`)
    
    return NextResponse.json({
      success: true,
      completedMissions: updatedMissions.completedMissions || [],
      coinBalance: updatedMissions.coinBalance || 0,
      coinsAwarded: coinsAwarded || 0
    })
    
  } catch (error) {
    console.error('❌ Error completing mission:', error)
    return NextResponse.json(
      { error: 'Failed to complete mission', message: error.message },
      { status: 500 }
    )
  }
}
