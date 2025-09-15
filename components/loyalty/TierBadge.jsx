'use client'

import { useState, useEffect } from 'react'

const TierBadge = ({ userIdentifier, size = 'small' }) => {
  const [tierData, setTierData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTierData = async () => {
      if (!userIdentifier) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/loyalty?userIdentifier=${userIdentifier}`)
        if (response.ok) {
          const data = await response.json()
          setTierData(data)
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
            setTierData(mockData)
          }
        }
      } catch (error) {
        console.error('Error fetching tier data:', error)
        // Default Bronze tier fallback
        setTierData({
          currentTier: 'BRONZE',
          feePercentage: 10,
          tierInfo: {
            name: 'Bronze',
            feePercentage: 10,
            color: '#CD7F32',
            icon: '🥉'
          }
        })
      }
      setLoading(false)
    }

    fetchTierData()
  }, [userIdentifier])

  if (loading || !tierData) {
    return size === 'large' ? (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg animate-pulse">
        <div className="w-5 h-5 bg-gray-600 rounded"></div>
        <div className="w-16 h-4 bg-gray-600 rounded"></div>
      </div>
    ) : (
      <div className="w-6 h-6 bg-gray-700 rounded-full animate-pulse"></div>
    )
  }

  const { currentTier, tierInfo, feePercentage } = tierData

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5', 
    large: 'text-base px-4 py-2'
  }

  const iconSizes = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-xl'
  }

  return (
    <div 
      className={`flex items-center gap-1.5 rounded-lg font-bold ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: `${tierInfo.color}20`,
        border: `1px solid ${tierInfo.color}60`,
        color: tierInfo.color
      }}
      title={`${tierInfo.name} Tier - ${feePercentage}% fees`}
    >
      <span className={iconSizes[size]}>{tierInfo.icon}</span>
      {size !== 'small' && (
        <span>{tierInfo.name}</span>
      )}
      {size === 'large' && (
        <span className="text-xs opacity-75">({feePercentage}%)</span>
      )}
    </div>
  )
}

export default TierBadge