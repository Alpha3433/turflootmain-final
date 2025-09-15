import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import loyaltySystem from '@/lib/loyaltySystem'

// GET /api/loyalty - Get user's loyalty stats and tier info
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdentifier = searchParams.get('userIdentifier')
    
    if (!userIdentifier) {
      return NextResponse.json({ error: 'User identifier required' }, { status: 400 })
    }
    
    console.log(`🎯 Loyalty GET request for user: ${userIdentifier}`)
    
    const { db } = await connectToDatabase()
    const loyaltyCollection = db.collection('user_loyalty')
    
    // Get user's loyalty stats
    let userLoyalty = await loyaltyCollection.findOne({ userIdentifier })
    
    // Initialize if user doesn't exist
    if (!userLoyalty) {
      userLoyalty = {
        userIdentifier,
        gamesPlayed: 0,
        totalWagered: 0,
        tier: 'BRONZE',
        createdAt: new Date(),
        monthlyStats: {
          gamesThisMonth: 0,
          wageredThisMonth: 0,
          month: new Date().getMonth(),
          year: new Date().getFullYear()
        }
      }
      
      await loyaltyCollection.insertOne(userLoyalty)
      console.log(`🆕 Created new loyalty profile for user: ${userIdentifier}`)
    }
    
    // Check if monthly reset is needed
    if (loyaltySystem.shouldResetMonthlyStats(userLoyalty)) {
      console.log(`📅 Performing monthly reset for user: ${userIdentifier}`)
      userLoyalty = loyaltySystem.performMonthlyReset(userLoyalty)
      
      await loyaltyCollection.updateOne(
        { userIdentifier },
        { $set: userLoyalty }
      )
    }
    
    // Calculate current tier and progress
    const currentTier = loyaltySystem.calculateUserTier(userLoyalty)
    const feePercentage = loyaltySystem.getUserFeePercentage(userLoyalty)
    const tierInfo = loyaltySystem.getTierInfo(currentTier)
    const progress = loyaltySystem.calculateTierProgress(userLoyalty)
    const allTiers = loyaltySystem.getAllTiers()
    
    const response = {
      userStats: {
        gamesPlayed: userLoyalty.gamesPlayed || 0,
        totalWagered: userLoyalty.totalWagered || 0,
        monthlyStats: userLoyalty.monthlyStats
      },
      currentTier,
      feePercentage,
      tierInfo,
      progress,
      allTiers,
      lastUpdated: new Date().toISOString()
    }
    
    console.log(`✅ Loyalty data retrieved for ${userIdentifier}: ${currentTier} tier (${feePercentage}% fees)`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error fetching loyalty data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loyalty data', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/loyalty - Update loyalty stats after a game
export async function POST(request) {
  try {
    const body = await request.json()
    const { userIdentifier, gameData } = body
    
    if (!userIdentifier || !gameData) {
      return NextResponse.json({ error: 'User identifier and game data required' }, { status: 400 })
    }
    
    console.log(`🎯 Loyalty POST request - updating stats for ${userIdentifier}:`, gameData)
    
    const { db } = await connectToDatabase()
    const loyaltyCollection = db.collection('user_loyalty')
    
    // Get current user loyalty data
    let userLoyalty = await loyaltyCollection.findOne({ userIdentifier })
    
    if (!userLoyalty) {
      // Create new loyalty profile
      userLoyalty = {
        userIdentifier,
        gamesPlayed: 0,
        totalWagered: 0,
        createdAt: new Date(),
        monthlyStats: {
          gamesThisMonth: 0,
          wageredThisMonth: 0,
          month: new Date().getMonth(),
          year: new Date().getFullYear()
        }
      }
    }
    
    // Track old tier for upgrade detection
    const oldTier = loyaltySystem.calculateUserTier(userLoyalty)
    
    // Update loyalty stats
    const updatedStats = loyaltySystem.updateUserLoyaltyStats(userLoyalty, gameData)
    updatedStats.lastUpdated = new Date()
    
    // Calculate new tier
    const newTier = loyaltySystem.calculateUserTier(updatedStats)
    const newFeePercentage = loyaltySystem.getUserFeePercentage(updatedStats)
    
    // Save updated stats
    await loyaltyCollection.updateOne(
      { userIdentifier },
      { $set: updatedStats },
      { upsert: true }
    )
    
    // Check for tier upgrade
    const tierUpgrade = loyaltySystem.getTierUpgradeNotification(oldTier, newTier)
    const progress = loyaltySystem.calculateTierProgress(updatedStats)
    
    const response = {
      success: true,
      userStats: {
        gamesPlayed: updatedStats.gamesPlayed,
        totalWagered: updatedStats.totalWagered,
        monthlyStats: updatedStats.monthlyStats
      },
      oldTier,
      newTier,
      feePercentage: newFeePercentage,
      tierUpgrade,
      progress,
      message: `Stats updated: ${updatedStats.gamesPlayed} games, $${updatedStats.totalWagered.toFixed(2)} wagered`
    }
    
    console.log(`✅ Loyalty stats updated for ${userIdentifier}: ${oldTier} → ${newTier} (${newFeePercentage}% fees)`)
    
    if (tierUpgrade.isUpgrade) {
      console.log(`🎉 TIER UPGRADE! ${userIdentifier} promoted from ${oldTier} to ${newTier}`)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error updating loyalty stats:', error)
    return NextResponse.json(
      { error: 'Failed to update loyalty stats', message: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/loyalty - Admin endpoint to update loyalty config
export async function PUT(request) {
  try {
    const body = await request.json()
    const { action, config } = body
    
    if (action === 'update_config') {
      // In a production system, this would update the config in database
      // For now, we'll just return the current config
      console.log('🔧 Loyalty config update requested:', config)
      
      return NextResponse.json({
        success: true,
        message: 'Config update requested (not implemented in demo)',
        currentConfig: loyaltySystem.LOYALTY_CONFIG
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('❌ Error updating loyalty config:', error)
    return NextResponse.json(
      { error: 'Failed to update loyalty config', message: error.message },
      { status: 500 }
    )
  }
}