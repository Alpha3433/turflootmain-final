'use client'

import { useState, useEffect } from 'react'

const LoyaltyProgressBar = ({ userIdentifier, variant = 'dashboard' }) => {
  const [loyaltyData, setLoyaltyData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      if (!userIdentifier) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/loyalty?userIdentifier=${userIdentifier}`)
        if (response.ok) {
          const data = await response.json()
          setLoyaltyData(data)
        } else {
          // Fallback to demo data when MongoDB is unavailable
          const mockResponse = await fetch('/api/loyalty/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'calculate_tier',
              userStats: { gamesPlayed: 25, totalWagered: 45.50 }
            })
          })
          if (mockResponse.ok) {
            const mockData = await mockResponse.json()
            setLoyaltyData(mockData)
          }
        }
      } catch (error) {
        console.error('Error fetching loyalty data:', error)
        // Default Bronze tier fallback
        setLoyaltyData({
          currentTier: 'BRONZE',
          tierInfo: {
            name: 'Bronze',
            feePercentage: 10,
            color: '#CD7F32',
            icon: '🥉'
          },
          progress: {
            currentTier: 'BRONZE',
            nextTier: 'SILVER',
            progress: {
              gamesProgress: { current: 25, required: 50, percentage: 50 },
              wageredProgress: { current: 45.50, required: 100, percentage: 45.5 }
            },
            isMaxTier: false
          },
          allTiers: {
            BRONZE: { name: 'Bronze', feePercentage: 10, icon: '🥉', color: '#CD7F32' },
            SILVER: { name: 'Silver', feePercentage: 9, icon: '🥈', color: '#C0C0C0' },
            GOLD: { name: 'Gold', feePercentage: 8, icon: '🥇', color: '#FFD700' }
          }
        })
      }
      setLoading(false)
    }

    fetchLoyaltyData()
  }, [userIdentifier])

  if (loading || !loyaltyData) {
    return (
      <div className="w-full bg-gray-700 rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-gray-600 rounded mb-2"></div>
        <div className="h-2 bg-gray-600 rounded"></div>
      </div>
    )
  }

  const { currentTier, progress, tierInfo, allTiers } = loyaltyData

  // Dashboard variant - full tier ladder
  if (variant === 'dashboard') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">Loyalty Tier Progress</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tierInfo.icon}</span>
            <span className="font-bold" style={{ color: tierInfo.color }}>
              {tierInfo.name}
            </span>
            <span className="text-sm text-gray-400">({tierInfo.feePercentage}% fees)</span>
          </div>
        </div>

        {/* Tier Ladder */}
        <div className="flex items-center justify-between mb-4">
          {Object.entries(allTiers).map(([tierKey, tier], index) => {
            const isActive = tierKey === currentTier
            const isPassed = Object.keys(allTiers).indexOf(currentTier) > index
            
            return (
              <div key={tierKey} className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    isActive ? 'border-white shadow-lg' : isPassed ? 'border-green-500' : 'border-gray-600'
                  }`}
                  style={{ 
                    backgroundColor: isActive || isPassed ? tier.color : 'transparent',
                    color: isActive || isPassed ? 'white' : tier.color
                  }}
                >
                  {tier.icon}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'text-white font-bold' : 'text-gray-400'}`}>
                  {tier.name}
                </span>
                <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {tier.feePercentage}%
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress Details */}
        {!progress.isMaxTier && progress.progress && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">Games Played</span>
                <span className="text-white">
                  {progress.progress.gamesProgress.current}/{progress.progress.gamesProgress.required}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress.gamesProgress.percentage}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">Total Wagered</span>
                <span className="text-white">
                  ${progress.progress.wageredProgress.current.toFixed(2)}/${progress.progress.wageredProgress.required}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress.wageredProgress.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {progress.isMaxTier && (
          <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
            <span className="text-yellow-400 font-bold">🏆 Maximum Tier Reached!</span>
            <p className="text-sm text-gray-300 mt-1">You're enjoying the lowest fees available</p>
          </div>
        )}
      </div>
    )
  }

  // Compact variant - for above Play Now button
  if (variant === 'compact') {
    if (progress.isMaxTier) {
      return (
        <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-yellow-400 text-lg">{tierInfo.icon}</span>
            <span className="text-yellow-400 font-bold">{tierInfo.name} Tier</span>
            <span className="text-sm text-gray-300">• {tierInfo.feePercentage}% fees</span>
          </div>
        </div>
      )
    }

    const nextTierInfo = allTiers[progress.nextTier]
    const gamesNeeded = progress.progress.gamesProgress.required - progress.progress.gamesProgress.current
    const wageredNeeded = progress.progress.wageredProgress.required - progress.progress.wageredProgress.current

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">
            Progress to {nextTierInfo.name}: 
            <span className="text-white ml-1">
              ${wageredNeeded.toFixed(2)} • {gamesNeeded} games
            </span>
          </span>
          <span className="text-xs" style={{ color: nextTierInfo.color }}>
            {nextTierInfo.icon} {nextTierInfo.feePercentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.min(
                progress.progress.gamesProgress.percentage, 
                progress.progress.wageredProgress.percentage
              )}%` 
            }}
          ></div>
        </div>
      </div>
    )
  }

  return null
}

export default LoyaltyProgressBar