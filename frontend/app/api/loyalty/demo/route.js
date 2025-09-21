import { NextResponse } from 'next/server'
import loyaltySystem from '../../../../lib/loyaltySystem.js'

// Demo endpoint to test loyalty system without MongoDB
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, userStats, gameData } = body
    
    console.log(`🎯 Loyalty Demo: ${action}`)
    
    if (action === 'calculate_tier') {
      const currentTier = loyaltySystem.calculateUserTier(userStats)
      const feePercentage = loyaltySystem.getUserFeePercentage(userStats)
      const tierInfo = loyaltySystem.getTierInfo(currentTier)
      const progress = loyaltySystem.calculateTierProgress(userStats)
      
      return NextResponse.json({
        userStats,
        currentTier,
        feePercentage,
        tierInfo,
        progress,
        allTiers: loyaltySystem.getAllTiers()
      })
    }
    
    if (action === 'simulate_game') {
      // Simulate a game completion
      const updatedStats = loyaltySystem.updateUserLoyaltyStats(userStats, gameData)
      const oldTier = loyaltySystem.calculateUserTier(userStats)
      const newTier = loyaltySystem.calculateUserTier(updatedStats)
      const tierUpgrade = loyaltySystem.getTierUpgradeNotification(oldTier, newTier)
      const progress = loyaltySystem.calculateTierProgress(updatedStats)
      
      return NextResponse.json({
        success: true,
        oldStats: userStats,
        newStats: updatedStats,
        oldTier,
        newTier,
        tierUpgrade,
        progress,
        message: `Game completed! Stats updated: ${updatedStats.gamesPlayed} games, $${updatedStats.totalWagered.toFixed(2)} wagered`
      })
    }
    
    if (action === 'get_all_tiers') {
      return NextResponse.json({
        tiers: loyaltySystem.getAllTiers(),
        config: loyaltySystem.LOYALTY_CONFIG
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('❌ Error in loyalty demo:', error)
    return NextResponse.json(
      { error: 'Demo failed', message: error.message },
      { status: 500 }
    )
  }
}