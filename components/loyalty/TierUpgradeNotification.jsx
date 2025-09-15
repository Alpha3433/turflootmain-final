'use client'

import { useState, useEffect } from 'react'

const TierUpgradeNotification = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 8000)
      
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      if (onClose) onClose()
    }, 300)
  }

  if (!notification || !isVisible) return null

  // Tier upgrade notification
  if (notification.tierUpgrade?.isUpgrade) {
    const { tierUpgrade } = notification
    
    return (
      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
        <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 border-2 border-yellow-400 rounded-lg p-4 max-w-sm shadow-2xl">
          <button 
            onClick={handleClose}
            className="absolute top-2 right-2 text-yellow-300 hover:text-white text-xl font-bold"
          >
            ×
          </button>
          
          <div className="text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-yellow-200 mb-2">
              Tier Upgrade!
            </h3>
            <p className="text-yellow-300 mb-3">
              Congratulations! You've been promoted to{' '}
              <span className="font-bold" style={{ color: tierUpgrade.newTierInfo.color }}>
                {tierUpgrade.newTierInfo.name}
              </span> tier!
            </p>
            
            <div className="bg-yellow-800/50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">{tierUpgrade.newTierInfo.icon}</span>
                <span className="font-bold text-white">
                  {tierUpgrade.newTierInfo.name} Benefits
                </span>
              </div>
              <ul className="text-sm text-yellow-200 space-y-1">
                {tierUpgrade.newTierInfo.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="text-sm text-yellow-300 font-medium">
              🎯 {tierUpgrade.feeSavings}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular progress notification
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-sm shadow-lg">
        <button 
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg font-bold"
        >
          ×
        </button>
        
        <div className="pr-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500">📈</span>
            <span className="font-medium text-white">Progress Update</span>
          </div>
          
          {notification.progress && !notification.progress.isMaxTier && (
            <div className="text-sm text-gray-300">
              <div>
                Games: {notification.userStats.gamesPlayed}/{notification.progress.progress.gamesProgress.required}
              </div>
              <div>
                Wagered: ${notification.userStats.totalWagered.toFixed(2)}/${notification.progress.progress.wageredProgress.required}
              </div>
              
              {notification.progress.nextTier && (
                <div className="mt-2 text-xs text-gray-400">
                  Keep playing to reach {notification.progress.nextTier} tier!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TierUpgradeNotification