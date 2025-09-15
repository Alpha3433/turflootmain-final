// TurfLoot Loyalty System
// Dynamic fee reduction based on play activity

// Loyalty tier configuration - easily adjustable
const LOYALTY_CONFIG = {
  tiers: {
    BRONZE: {
      name: 'Bronze',
      feePercentage: 10,
      minGamesPlayed: 0,
      minTotalWagered: 0,
      color: '#CD7F32',
      icon: '🥉',
      benefits: ['Standard gameplay', '10% server fee']
    },
    SILVER: {
      name: 'Silver', 
      feePercentage: 9,
      minGamesPlayed: 50,
      minTotalWagered: 100,
      color: '#C0C0C0',
      icon: '🥈',
      benefits: ['Reduced fees', '9% server fee', 'Priority matching']
    },
    GOLD: {
      name: 'Gold',
      feePercentage: 8, 
      minGamesPlayed: 250,
      minTotalWagered: 500,
      color: '#FFD700',
      icon: '🥇',
      benefits: ['Lowest fees', '8% server fee', 'VIP support', 'Exclusive tournaments']
    }
  },
  
  // Monthly reset configuration
  monthlyReset: {
    enabled: true,
    carryoverPerks: {
      GOLD: 'SILVER',    // Gold users start next month at Silver
      SILVER: 'BRONZE',  // Silver users start next month at Bronze  
      BRONZE: 'BRONZE'   // Bronze users stay at Bronze
    }
  }
}

// Get user's current loyalty tier based on stats
export function calculateUserTier(userStats) {
  const { gamesPlayed = 0, totalWagered = 0 } = userStats
  
  // Check Gold tier first (highest requirements)
  if (gamesPlayed >= LOYALTY_CONFIG.tiers.GOLD.minGamesPlayed && 
      totalWagered >= LOYALTY_CONFIG.tiers.GOLD.minTotalWagered) {
    return 'GOLD'
  }
  
  // Check Silver tier
  if (gamesPlayed >= LOYALTY_CONFIG.tiers.SILVER.minGamesPlayed && 
      totalWagered >= LOYALTY_CONFIG.tiers.SILVER.minTotalWagered) {
    return 'SILVER'
  }
  
  // Default to Bronze
  return 'BRONZE'
}

// Get fee percentage for user's current tier
export function getUserFeePercentage(userStats) {
  const tier = calculateUserTier(userStats)
  return LOYALTY_CONFIG.tiers[tier].feePercentage
}

// Get tier information
export function getTierInfo(tierName) {
  return LOYALTY_CONFIG.tiers[tierName] || LOYALTY_CONFIG.tiers.BRONZE
}

// Get all tier configurations
export function getAllTiers() {
  return LOYALTY_CONFIG.tiers
}

// Calculate progress to next tier
export function calculateTierProgress(userStats) {
  const { gamesPlayed = 0, totalWagered = 0 } = userStats
  const currentTier = calculateUserTier(userStats)
  
  let nextTier = null
  let progressData = null
  
  if (currentTier === 'BRONZE') {
    nextTier = 'SILVER'
    const silverConfig = LOYALTY_CONFIG.tiers.SILVER
    progressData = {
      gamesProgress: {
        current: gamesPlayed,
        required: silverConfig.minGamesPlayed,
        percentage: Math.min(100, (gamesPlayed / silverConfig.minGamesPlayed) * 100)
      },
      wageredProgress: {
        current: totalWagered,
        required: silverConfig.minTotalWagered,
        percentage: Math.min(100, (totalWagered / silverConfig.minTotalWagered) * 100)
      }
    }
  } else if (currentTier === 'SILVER') {
    nextTier = 'GOLD'
    const goldConfig = LOYALTY_CONFIG.tiers.GOLD
    progressData = {
      gamesProgress: {
        current: gamesPlayed,
        required: goldConfig.minGamesPlayed,
        percentage: Math.min(100, (gamesPlayed / goldConfig.minGamesPlayed) * 100)
      },
      wageredProgress: {
        current: totalWagered,
        required: goldConfig.minTotalWagered,
        percentage: Math.min(100, (totalWagered / goldConfig.minTotalWagered) * 100)
      }
    }
  }
  
  return {
    currentTier,
    nextTier,
    progress: progressData,
    isMaxTier: currentTier === 'GOLD'
  }
}

// Update user loyalty stats after a game
export function updateUserLoyaltyStats(currentStats, gameData) {
  const { stake = 0, gameResult = null } = gameData
  
  return {
    ...currentStats,
    gamesPlayed: (currentStats.gamesPlayed || 0) + 1,
    totalWagered: (currentStats.totalWagered || 0) + stake,
    lastGameDate: new Date().toISOString(),
    // Track monthly stats for reset logic
    monthlyStats: {
      ...currentStats.monthlyStats,
      gamesThisMonth: (currentStats.monthlyStats?.gamesThisMonth || 0) + 1,
      wageredThisMonth: (currentStats.monthlyStats?.wageredThisMonth || 0) + stake,
      month: new Date().getMonth(),
      year: new Date().getFullYear()
    }
  }
}

// Check if monthly reset is needed
export function shouldResetMonthlyStats(userStats) {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  if (!userStats.monthlyStats) return true
  
  return userStats.monthlyStats.month !== currentMonth || 
         userStats.monthlyStats.year !== currentYear
}

// Perform monthly reset with carryover perks
export function performMonthlyReset(userStats) {
  const currentTier = calculateUserTier(userStats)
  const carryoverTier = LOYALTY_CONFIG.monthlyReset.carryoverPerks[currentTier]
  
  // Calculate base stats for carryover tier
  let baseStats = { gamesPlayed: 0, totalWagered: 0 }
  
  if (carryoverTier === 'SILVER') {
    baseStats = {
      gamesPlayed: LOYALTY_CONFIG.tiers.SILVER.minGamesPlayed,
      totalWagered: LOYALTY_CONFIG.tiers.SILVER.minTotalWagered
    }
  } else if (carryoverTier === 'GOLD') {
    baseStats = {
      gamesPlayed: LOYALTY_CONFIG.tiers.GOLD.minGamesPlayed, 
      totalWagered: LOYALTY_CONFIG.tiers.GOLD.minTotalWagered
    }
  }
  
  return {
    ...userStats,
    gamesPlayed: baseStats.gamesPlayed,
    totalWagered: baseStats.totalWagered,
    previousTier: currentTier,
    carryoverTier: carryoverTier,
    lastReset: new Date().toISOString(),
    monthlyStats: {
      gamesThisMonth: 0,
      wageredThisMonth: 0,
      month: new Date().getMonth(),
      year: new Date().getFullYear()
    }
  }
}

// Get tier upgrade notification data
export function getTierUpgradeNotification(oldTier, newTier) {
  const newTierInfo = getTierInfo(newTier)
  
  return {
    isUpgrade: newTier !== oldTier,
    oldTier,
    newTier,
    newFeePercentage: newTierInfo.feePercentage,
    newTierInfo,
    message: `🎉 Congratulations! You've been promoted to ${newTierInfo.name} tier!`,
    benefits: newTierInfo.benefits,
    feeSavings: `Server fees reduced to ${newTierInfo.feePercentage}%!`
  }
}

export default {
  LOYALTY_CONFIG,
  calculateUserTier,
  getUserFeePercentage,
  getTierInfo,
  getAllTiers,
  calculateTierProgress,
  updateUserLoyaltyStats,
  shouldResetMonthlyStats,
  performMonthlyReset,
  getTierUpgradeNotification
}