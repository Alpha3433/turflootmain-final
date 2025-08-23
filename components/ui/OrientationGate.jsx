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
        setTimeout(() => onLandscapeReady(), 800) // Smoother transition
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-6 overflow-hidden">
      {/* Modern Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-40 w-28 h-28 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 text-center max-w-sm mx-auto">
        
        {/* Modern Brand Display */}
        <div className="mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 backdrop-blur-sm border border-white/10 rounded-2xl mb-6">
            <div className="text-2xl">🎮</div>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            TURFLOOT
          </h1>
          <p className="text-yellow-400/80 text-sm font-semibold tracking-wider uppercase">Grid Domination</p>
        </div>

        {/* Modern Animation Section */}
        <div className="mb-12 flex justify-center">
          {isLandscape ? (
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-ping opacity-30"></div>
            </div>
          ) : (
            <div className="relative">
              {/* Modern Phone Icon with Rotation Effect */}
              <div className="relative w-16 h-24 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl border-2 border-gray-600 shadow-2xl transform transition-transform duration-1000 hover:rotate-90">
                  <div className="absolute inset-2 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center">
                    <div className="text-xs text-cyan-400 animate-pulse">🔄</div>
                  </div>
                </div>
              </div>
              
              {/* Rotation Indicator */}
              <div className="mt-6 flex items-center justify-center space-x-3">
                <div className="w-8 h-5 bg-gradient-to-r from-gray-600 to-gray-700 rounded-sm border border-gray-500 flex items-center justify-center">
                  <div className="text-xs">📱</div>
                </div>
                <div className="text-yellow-400 animate-bounce text-xl">→</div>
                <div className="w-5 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-sm border border-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <div className="text-xs">📱</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modern Status Message */}
        {isLandscape ? (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-400/20 rounded-full px-6 py-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold text-sm">Ready to Play</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-gray-400 text-sm">Launching game experience...</p>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Rotate to Landscape
            </h2>
            <p className="text-gray-400 text-base leading-relaxed max-w-xs mx-auto">
              Turn your device sideways for the optimal gaming experience
            </p>
            
            {/* Modern Progress Indicator */}
            <div className="flex items-center justify-center space-x-1 mt-8">
              <div className="w-2 h-2 bg-yellow-400/60 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-yellow-400/40 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-2 h-2 bg-yellow-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrientationGate