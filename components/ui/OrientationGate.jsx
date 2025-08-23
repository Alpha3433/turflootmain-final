'use client'

import { useState, useEffect } from 'react'

const OrientationGate = ({ onLandscapeReady }) => {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      const orientation = window.screen?.orientation?.angle ?? 0
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // Consider landscape if width > height or orientation angle indicates landscape
      const isCurrentlyLandscape = viewportWidth > viewportHeight || 
                                   orientation === 90 || orientation === 270
      
      setIsLandscape(isCurrentlyLandscape)
      
      // Automatically proceed when in landscape
      if (isCurrentlyLandscape && onLandscapeReady) {
        setTimeout(() => onLandscapeReady(), 1000) // Small delay for smooth transition
      }
    }

    checkOrientation()
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      // Small delay to allow orientation change to complete
      setTimeout(checkOrientation, 100)
    })
    
    window.addEventListener('resize', checkOrientation)

    return () => {
      window.removeEventListener('orientationchange', checkOrientation)
      window.removeEventListener('resize', checkOrientation)
    }
  }, [onLandscapeReady])

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-6">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black"></div>
        
        {/* Floating Game Elements */}
        <div className="absolute top-20 left-16 animate-float-slow">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-32 right-24 animate-float-slow" style={{ animationDelay: '1s' }}>
          <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-60"></div>
        </div>
        <div className="absolute bottom-32 left-32 animate-float-slow" style={{ animationDelay: '2s' }}>
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-60"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-sm mx-auto">
        
        {/* Brand Title - Centered at top */}
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            <span className="text-white">TURF</span>
            <span className="text-yellow-400">LOOT</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium">GRID DOMINATION</p>
        </div>

        {/* Simple Rotate Animation */}
        <div className="mb-8 flex justify-center">
          {isLandscape ? (
            <div className="text-6xl animate-bounce text-green-400">✅</div>
          ) : (
            <div className="relative">
              {/* Animated Rotate Icon */}
              <div className="text-6xl animate-spin text-yellow-400" style={{ animationDuration: '2s' }}>
                🔄
              </div>
              {/* Or simple phone turning animation */}
              <div className="absolute inset-0 text-4xl animate-pulse">
                📱
              </div>
            </div>
          )}
        </div>

        {/* Simple Message */}
        {isLandscape ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-green-400 mb-2">Ready to Play!</h2>
            <div className="animate-pulse">
              <div className="text-sm text-gray-400">Entering game...</div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-4">
              Rotate to landscape to play.
            </h2>
          </div>
        )}

        {/* Skip Option (Emergency bypass) */}
        {!isLandscape && (
          <div className="mt-12 pt-4 border-t border-gray-700/30">
            <button
              onClick={() => onLandscapeReady && onLandscapeReady()}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors underline"
            >
              Continue anyway (not recommended)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrientationGate