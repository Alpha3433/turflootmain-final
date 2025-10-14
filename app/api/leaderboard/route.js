import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../lib/mongodb.js'

// GET /api/leaderboard - Get top earners from paid arenas
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 10
    
    console.log(`🏆 Fetching top ${limit} earners from paid arenas...`)
    
    const { db } = await connectToDatabase()
    const eliminationEarningsCollection = db.collection('elimination_earnings')
    
    // Get top earners sorted by total winnings from eliminations
    const topEarners = await eliminationEarningsCollection
      .find({})
      .sort({ totalEarnings: -1 })
      .limit(limit)
      .toArray()
    
    console.log(`✅ Found ${topEarners.length} top earners`)
    
    return NextResponse.json({
      success: true,
      leaderboard: topEarners.map((user, index) => ({
        rank: index + 1,
        name: user.playerName || 'Anonymous',
        userIdentifier: user.userIdentifier,
        totalEarnings: user.totalEarnings || 0,
        totalEliminations: user.totalEliminations || 0,
        gamesPlayed: user.gamesPlayed || 0,
        lastActive: user.lastActive
      }))
    })
    
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/leaderboard - Update user's elimination earnings
export async function POST(request) {
  try {
    const body = await request.json()
    const { userIdentifier, playerName, earningsAdded, eliminationsAdded } = body
    
    if (!userIdentifier) {
      return NextResponse.json({ error: 'User identifier required' }, { status: 400 })
    }
    
    console.log(`💰 Updating elimination earnings for ${playerName}: +$${earningsAdded}`)
    
    const { db } = await connectToDatabase()
    const eliminationEarningsCollection = db.collection('elimination_earnings')
    
    // Update or create user earnings record
    const result = await eliminationEarningsCollection.updateOne(
      { userIdentifier },
      {
        $set: {
          playerName: playerName || 'Anonymous',
          lastActive: new Date()
        },
        $inc: {
          totalEarnings: earningsAdded || 0,
          totalEliminations: eliminationsAdded || 0,
          gamesPlayed: 1
        }
      },
      { upsert: true }
    )
    
    // Get updated record
    const updatedUser = await eliminationEarningsCollection.findOne({ userIdentifier })
    
    console.log(`✅ Earnings updated: ${updatedUser.playerName} now has $${updatedUser.totalEarnings.toFixed(2)}`)
    
    return NextResponse.json({
      success: true,
      user: {
        playerName: updatedUser.playerName,
        totalEarnings: updatedUser.totalEarnings,
        totalEliminations: updatedUser.totalEliminations,
        gamesPlayed: updatedUser.gamesPlayed
      }
    })
    
  } catch (error) {
    console.error('❌ Error updating elimination earnings:', error)
    return NextResponse.json(
      { error: 'Failed to update elimination earnings', message: error.message },
      { status: 500 }
    )
  }
}
