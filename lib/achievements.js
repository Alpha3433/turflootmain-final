// TurfLoot Achievement System
// Core logic for achievements, seasons, cosmetics, and progression

// Season Management
export function getCurrentSeason() {
  const startDate = new Date('2025-01-01') // Season 1 start
  const seasonLength = 90 * 24 * 60 * 60 * 1000 // 3 months in milliseconds
  const now = new Date()
  
  const seasonNumber = Math.floor((now - startDate) / seasonLength) + 1
  const currentSeasonStart = new Date(startDate.getTime() + (seasonNumber - 1) * seasonLength)
  const currentSeasonEnd = new Date(currentSeasonStart.getTime() + seasonLength)
  
  return {
    id: `season-${seasonNumber}`,
    number: seasonNumber,
    name: `Season ${seasonNumber}`,
    startDate: currentSeasonStart,
    endDate: currentSeasonEnd,
    daysRemaining: Math.ceil((currentSeasonEnd - now) / (24 * 60 * 60 * 1000))
  }
}

// Achievement Definitions
export function getAchievementDefinitions() {
  return [
    // Persistence Achievements (Steady AP)
    {
      id: 'daily-streak-7',
      name: 'Week Warrior',
      description: 'Play 7 days in a row',
      category: 'persistence',
      ap: 100,
      icon: '🔥',
      tier: 'bronze',
      requirement: { type: 'daily_streak', value: 7 }
    },
    {
      id: 'daily-streak-14',
      name: 'Fortnight Fighter',
      description: 'Play 14 days in a row',
      category: 'persistence',
      ap: 200,
      icon: '🔥',
      tier: 'silver',
      requirement: { type: 'daily_streak', value: 14 }
    },
    {
      id: 'daily-streak-30',
      name: 'Monthly Master',
      description: 'Play 30 days in a row',
      category: 'persistence',
      ap: 400,
      icon: '🔥',
      tier: 'gold',
      requirement: { type: 'daily_streak', value: 30 }
    },
    {
      id: 'matches-10',
      name: 'Getting Started',
      description: 'Play 10 matches',
      category: 'persistence',
      ap: 50,
      icon: '🎮',
      tier: 'bronze',
      requirement: { type: 'games_played', value: 10 }
    },
    {
      id: 'matches-50',
      name: 'Regular Player',
      description: 'Play 50 matches',
      category: 'persistence',
      ap: 150,
      icon: '🎮',
      tier: 'silver',
      requirement: { type: 'games_played', value: 50 }
    },
    {
      id: 'matches-100',
      name: 'Dedicated Gamer',
      description: 'Play 100 matches',
      category: 'persistence',
      ap: 200,
      icon: '🎮',
      tier: 'gold',
      requirement: { type: 'games_played', value: 100 }
    },
    {
      id: 'survival-10min',
      name: 'Survivor',
      description: 'Survive for 10 minutes total across all matches',
      category: 'persistence',
      ap: 100,
      icon: '⏰',
      tier: 'bronze',
      requirement: { type: 'total_survival_time', value: 600 } // 10 minutes in seconds
    },
    {
      id: 'survival-30min',
      name: 'Endurance Expert',
      description: 'Survive for 30 minutes total across all matches',
      category: 'persistence',
      ap: 200,
      icon: '⏰',
      tier: 'silver',
      requirement: { type: 'total_survival_time', value: 1800 } // 30 minutes
    },
    {
      id: 'survival-60min',
      name: 'Time Lord',
      description: 'Survive for 60 minutes total across all matches',
      category: 'persistence',
      ap: 300,
      icon: '⏰',
      tier: 'gold',
      requirement: { type: 'total_survival_time', value: 3600 } // 60 minutes
    },

    // Combat Achievements
    {
      id: 'first-kill',
      name: 'First Blood',
      description: 'Get your first elimination',
      category: 'combat',
      ap: 25,
      icon: '⚔️',
      tier: 'bronze',
      requirement: { type: 'total_eliminations', value: 1 }
    },
    {
      id: 'eliminations-10',
      name: 'Eliminator',
      description: 'Get 10 total eliminations',
      category: 'combat',
      ap: 75,
      icon: '⚔️',
      tier: 'bronze',
      requirement: { type: 'total_eliminations', value: 10 }
    },
    {
      id: 'eliminations-50',
      name: 'Deadly',
      description: 'Get 50 total eliminations',
      category: 'combat',
      ap: 150,
      icon: '⚔️',
      tier: 'silver',
      requirement: { type: 'total_eliminations', value: 50 }
    },
    {
      id: 'eliminations-100',
      name: 'Assassin',
      description: 'Get 100 total eliminations',
      category: 'combat',
      ap: 250,
      icon: '⚔️',
      tier: 'gold',
      requirement: { type: 'total_eliminations', value: 100 }
    },

    // Earnings Achievements
    {
      id: 'first-cashout',
      name: 'First Payday',
      description: 'Successfully cash out for the first time',
      category: 'earnings',
      ap: 50,
      icon: '💰',
      tier: 'bronze',
      requirement: { type: 'games_won', value: 1 }
    },
    {
      id: 'earnings-100',
      name: 'Hundred Club',
      description: 'Earn $100 total',
      category: 'earnings',
      ap: 100,
      icon: '💰',
      tier: 'bronze',
      requirement: { type: 'total_earnings', value: 100 }
    },
    {
      id: 'earnings-500',
      name: 'Big Earner',
      description: 'Earn $500 total',
      category: 'earnings',
      ap: 200,
      icon: '💰',
      tier: 'silver',
      requirement: { type: 'total_earnings', value: 500 }
    },
    {
      id: 'earnings-1000',
      name: 'High Roller',
      description: 'Earn $1000 total',
      category: 'earnings',
      ap: 300,
      icon: '💰',
      tier: 'gold',
      requirement: { type: 'total_earnings', value: 1000 }
    },

    // Win Rate Achievements
    {
      id: 'win-rate-25',
      name: 'Quarter Winner',
      description: 'Achieve 25% win rate (minimum 20 games)',
      category: 'skill',
      ap: 150,
      icon: '🏆',
      tier: 'silver',
      requirement: { type: 'win_rate', value: 25, minGames: 20 }
    },
    {
      id: 'win-rate-50',
      name: 'Half Champion',
      description: 'Achieve 50% win rate (minimum 30 games)',
      category: 'skill',
      ap: 250,
      icon: '🏆',
      tier: 'gold',
      requirement: { type: 'win_rate', value: 50, minGames: 30 }
    },
    {
      id: 'win-rate-75',
      name: 'Elite Player',
      description: 'Achieve 75% win rate (minimum 40 games)',
      category: 'skill',
      ap: 400,
      icon: '🏆',
      tier: 'prestige',
      requirement: { type: 'win_rate', value: 75, minGames: 40 }
    }
  ]
}

// Cosmetic Definitions with Tier System
export function getCosmeticDefinitions() {
  return [
    // Bronze Tier (100-300 AP)
    {
      id: 'trail-basic-red',
      name: 'Red Trail',
      description: 'Basic red movement trail',
      type: 'trail',
      tier: 'bronze',
      cost: 100,
      icon: '🔴',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE1IiBmaWxsPSIjZmYwMDAwIi8+PC9zdmc+'
    },
    {
      id: 'trail-basic-blue',
      name: 'Blue Trail',
      description: 'Basic blue movement trail',
      type: 'trail',
      tier: 'bronze',
      cost: 100,
      icon: '🔵',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE1IiBmaWxsPSIjMDA3N2ZmIi8+PC9zdmc+'
    },
    {
      id: 'skin-basic-camo',
      name: 'Camo Pattern',
      description: 'Military camouflage player skin',
      type: 'skin',
      tier: 'bronze',
      cost: 150,
      icon: '🌿',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE1IiBmaWxsPSIjMzM2NjMzIi8+PC9zdmc+'
    },
    {
      id: 'nameplate-bronze',
      name: 'Bronze Nameplate',
      description: 'Bronze border around your name',
      type: 'nameplate',
      tier: 'bronze',
      cost: 200,
      icon: '🥉',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxyZWN0IHdpZHRoPSIzNSIgaGVpZ2h0PSIyMCIgeD0iMi41IiB5PSIxMCIgZmlsbD0iI2NkN2YzMiIvPjwvc3ZnPg=='
    },

    // Silver Tier (400-800 AP)
    {
      id: 'trail-animated-rainbow',
      name: 'Rainbow Trail',
      description: 'Animated rainbow movement trail',
      type: 'trail',
      tier: 'silver',
      cost: 400,
      icon: '🌈',
      animated: true,
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE1IiBmaWxsPSJ1cmwoI3JhaW5ib3cpIi8+PGRlZnM+PC9kZWZzPjwvc3ZnPg=='
    },
    {
      id: 'hat-crown',
      name: 'Crown',
      description: 'Royal crown accessory',
      type: 'hat',
      tier: 'silver',
      cost: 500,
      icon: '👑',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+👑PC90ZXh0Pjwvc3ZnPg=='
    },
    {
      id: 'victory-animation-fireworks',
      name: 'Fireworks Victory',
      description: 'Fireworks animation on cash out',
      type: 'victory',
      tier: 'silver',
      cost: 600,
      icon: '🎆',
      animated: true,
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+🎆PC90ZXh0Pjwvc3ZnPg=='
    },
    {
      id: 'skin-rare-galaxy',
      name: 'Galaxy Skin',
      description: 'Rare galaxy pattern skin',
      type: 'skin',
      tier: 'silver',
      cost: 700,
      icon: '🌌',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE1IiBmaWxsPSIjNDQzN2ZmIi8+PC9zdmc+'
    },

    // Gold Tier (900-1500 AP)
    {
      id: 'skin-premium-flame',
      name: 'Flame Skin',
      description: 'Premium animated flame skin',
      type: 'skin',
      tier: 'gold',
      cost: 1000,
      icon: '🔥',
      animated: true,
      premium: true,
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE1IiBmaWxsPSIjZmY0NDAwIi8+PC9zdmc+'
    },
    {
      id: 'kill-sound-thunder',
      name: 'Thunder Kill Sound',
      description: 'Exclusive thunder sound on eliminations',
      type: 'sound',
      tier: 'gold',
      cost: 1200,
      icon: '⚡',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+⚡PC90ZXh0Pjwvc3ZnPg=='
    },
    {
      id: 'cashout-animation-gold-shower',
      name: 'Gold Shower Cash Out',
      description: 'Unique gold shower animation on cash out',
      type: 'cashout',
      tier: 'gold',
      cost: 1500,
      icon: '💫',
      animated: true,
      unique: true,
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+💫PC90ZXh0Pjwvc3ZnPg=='
    },

    // Prestige Tier (2000+ AP)
    {
      id: 'title-season-legend',
      name: 'Season Legend',
      description: 'Exclusive seasonal title and leaderboard flair',
      type: 'title',
      tier: 'prestige',
      cost: 2000,
      icon: '⭐',
      exclusive: true,
      seasonal: true,
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+⭐PC90ZXh0Pjwvc3ZnPg=='
    }
  ]
}

// Calculate user progress on achievements
export async function calculateAchievementProgress(userId, userData) {
  const achievements = getAchievementDefinitions()
  const stats = userData?.stats || {}
  const completedAchievements = userData?.achievements?.completedAchievements || []
  
  const progress = {}
  
  for (const achievement of achievements) {
    const req = achievement.requirement
    let currentValue = 0
    let isCompleted = completedAchievements.includes(achievement.id)
    
    // Calculate current progress based on requirement type
    switch (req.type) {
      case 'daily_streak':
        currentValue = userData?.achievements?.dailyStreak || 0
        break
      case 'games_played':
        currentValue = stats.games_played || 0
        break
      case 'total_survival_time':
        currentValue = stats.total_play_time || 0
        break
      case 'total_eliminations':
        currentValue = stats.total_eliminations || 0
        break
      case 'games_won':
        currentValue = stats.games_won || 0
        break
      case 'total_earnings':
        currentValue = stats.total_earnings || 0
        break
      case 'win_rate':
        if (stats.games_played >= (req.minGames || 0)) {
          currentValue = stats.win_rate || 0
        }
        break
    }
    
    // Check if achievement should be completed
    if (!isCompleted && currentValue >= req.value) {
      isCompleted = true
      // Award AP (this would need to be handled in the API call)
    }
    
    progress[achievement.id] = {
      current: currentValue,
      required: req.value,
      percentage: Math.min(100, Math.floor((currentValue / req.value) * 100)),
      completed: isCompleted,
      canClaim: !isCompleted && currentValue >= req.value
    }
  }
  
  return progress
}

// Generate daily challenges
export function generateDailyChallenge() {
  const challenges = [
    {
      id: 'daily-survivor',
      name: 'Daily Survivor',
      description: 'Survive for 3 minutes in a single match',
      ap: 75,
      icon: '⏱️',
      requirement: { type: 'single_game_survival', value: 180 }
    },
    {
      id: 'daily-eliminator',
      name: 'Daily Eliminator',
      description: 'Get 5 eliminations in a single match',
      ap: 100,
      icon: '⚔️',
      requirement: { type: 'single_game_kills', value: 5 }
    },
    {
      id: 'daily-winner',
      name: 'Daily Winner',
      description: 'Successfully cash out once',
      ap: 100,
      icon: '💰',
      requirement: { type: 'daily_cashout', value: 1 }
    },
    {
      id: 'daily-streak',
      name: 'Daily Streak',
      description: 'Play 3 matches without dying early (survive > 1 min)',
      ap: 125,
      icon: '🔥',
      requirement: { type: 'survival_streak', value: 3 }
    }
  ]
  
  // Return a random challenge for the day
  const today = new Date().toDateString()
  const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  const challengeIndex = seed % challenges.length
  
  return {
    ...challenges[challengeIndex],
    date: today,
    expiresIn: getTimeUntilMidnight()
  }
}

// Helper function to get time until midnight
function getTimeUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0) // Next midnight
  
  const msUntilMidnight = midnight - now
  const hoursUntilMidnight = Math.floor(msUntilMidnight / (1000 * 60 * 60))
  const minutesUntilMidnight = Math.floor((msUntilMidnight % (1000 * 60 * 60)) / (1000 * 60))
  
  return `${hoursUntilMidnight}h ${minutesUntilMidnight}m`
}

// Calculate AP requirements for tiers
export function getTierRequirements() {
  return {
    bronze: { min: 0, max: 799, name: 'Bronze', color: '#cd7f32' },
    silver: { min: 800, max: 1999, name: 'Silver', color: '#c0c0c0' },
    gold: { min: 2000, max: 3999, name: 'Gold', color: '#ffd700' },
    prestige: { min: 4000, max: Infinity, name: 'Prestige', color: '#9d4edd' }
  }
}

// Get user's current tier
export function getUserTier(totalAP) {
  const tiers = getTierRequirements()
  
  for (const [tierName, tier] of Object.entries(tiers)) {
    if (totalAP >= tier.min && totalAP <= tier.max) {
      return {
        name: tierName,
        displayName: tier.name,
        color: tier.color,
        progress: tierName === 'prestige' ? 100 : Math.floor(((totalAP - tier.min) / (tier.max - tier.min + 1)) * 100),
        nextTier: tierName === 'prestige' ? null : Object.keys(tiers)[Object.keys(tiers).indexOf(tierName) + 1]
      }
    }
  }
  
  return tiers.bronze
}