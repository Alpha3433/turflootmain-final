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
        
        {/* Game Logo */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">
            <span className="text-white">TURF</span>
            <span className="text-yellow-400">LOOT</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium">GRID DOMINATION</p>
        </div>

        {/* Phone Rotation Animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Phone Frame */}
            <div className={`w-16 h-24 border-4 border-gray-600 rounded-lg bg-gray-800 transition-all duration-1000 ${
              isLandscape ? 'rotate-90 border-green-400' : 'animate-pulse'
            }`}>
              {/* Screen */}
              <div className={`w-full h-full rounded-sm m-0.5 transition-all duration-1000 ${
                isLandscape ? 'bg-green-400' : 'bg-gray-700'
              }`}>
                {/* Game simulation on screen */}
                <div className="relative w-full h-full overflow-hidden rounded-sm">
                  <div className="absolute top-2 left-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Rotation Arrow */}
            {!isLandscape && (
              <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
                <div className="animate-bounce">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {isLandscape ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-xl font-bold text-green-400 mb-2">Perfect!</h2>
              <p className="text-gray-300 text-sm mb-4">Your device is ready for gameplay</p>
            </div>
            <div className="animate-pulse">
              <div className="text-sm text-gray-400">Entering game...</div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <div className="text-4xl mb-3">📱➡️📱</div>
              <h2 className="text-xl font-bold text-white mb-3">Rotate Your Device</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                For the best gaming experience, please rotate your device to 
                <span className="text-yellow-400 font-semibold"> landscape mode</span>
              </p>
            </div>

            {/* Feature Benefits */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/30">
              <div className="text-xs text-gray-400 mb-2">Why landscape?</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">🎮</span>
                  <span className="text-gray-300">Better controls</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">👀</span>
                  <span className="text-gray-300">More game area</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">📊</span>
                  <span className="text-gray-300">Full HUD access</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400">⚡</span>
                  <span className="text-gray-300">Smooth gameplay</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skip Option (Emergency bypass) */}
        {!isLandscape && (
          <div className="mt-8 pt-4 border-t border-gray-700/30">
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