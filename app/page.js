'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

export default function Home() {
  const [userProfile, setUserProfile] = useState(null)
  const [selectedBet, setSelectedBet] = useState(5)
  const [showWelcome, setShowWelcome] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [customName, setCustomName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [livePlayerCount, setLivePlayerCount] = useState(0)
  const [globalWinnings, setGlobalWinnings] = useState(0)
  const [playerCountPulse, setPlayerCountPulse] = useState(false)
  const [globalWinningsPulse, setGlobalWinningsPulse] = useState(false)
  
  // Get Privy hooks
  const { login, ready, authenticated, user, logout } = usePrivy()

  // Check for new authentication and show welcome message
  useEffect(() => {
    console.log('🔍 Auth effect triggered:', { authenticated, user, ready, hasShownWelcome })
    
    if (authenticated && user && !hasShownWelcome) {
      console.log('🎉 User authenticated:', user)
      console.log('🔑 User ID:', user.id)
      console.log('📧 User email:', user.email?.address)
      console.log('🌐 User google:', user.google?.name)
      
      setShowWelcome(true)
      setHasShownWelcome(true)
      setUserProfile(user)
      
      // Load user's custom name if it exists
      loadUserProfile(user.id)
    } else if (authenticated && user) {
      // User is authenticated but welcome was already shown, just load profile
      console.log('👤 User already authenticated, loading profile')
      setUserProfile(user)
      loadUserProfile(user.id)
    }
  }, [authenticated, user, hasShownWelcome, ready])

  // Debug effect for authentication changes
  useEffect(() => {
    console.log('🔄 Authentication state changed:', { 
      ready, 
      authenticated, 
      userId: user?.id, 
      email: user?.email?.address,
      displayName 
    })
  }, [ready, authenticated, user, displayName])

  // Fetch live statistics
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        // Fetch live player count
        const playerResponse = await fetch('/api/stats/live-players')
        if (playerResponse.ok) {
          const playerData = await playerResponse.json()
          const newPlayerCount = playerData.count || 0
          
          // Trigger pulse animation if count changed
          if (newPlayerCount !== livePlayerCount) {
            setPlayerCountPulse(true)
            setTimeout(() => setPlayerCountPulse(false), 1000)
          }
          
          setLivePlayerCount(newPlayerCount)
        }

        // Fetch global winnings
        const winningsResponse = await fetch('/api/stats/global-winnings')
        if (winningsResponse.ok) {
          const winningsData = await winningsResponse.json()
          const newGlobalWinnings = winningsData.total || 0
          
          // Trigger pulse animation if winnings changed
          if (newGlobalWinnings !== globalWinnings) {
            setGlobalWinningsPulse(true)
            setTimeout(() => setGlobalWinningsPulse(false), 1000)
          }
          
          setGlobalWinnings(newGlobalWinnings)
        }
      } catch (error) {
        console.log('📊 Stats fetch failed (using defaults):', error.message)
        // Keep default values of 0
      }
    }

    fetchLiveStats()
    
    // Update every 30 seconds
    const interval = setInterval(fetchLiveStats, 30000)
    return () => clearInterval(interval)
  }, [livePlayerCount, globalWinnings])

  const loadUserProfile = async (userId) => {
    try {
      console.log('🔍 Loading user profile for userId:', userId)
      
      // First try to get user by userId, then by privy ID
      let response = await fetch(`/api/users/${userId}`)
      
      if (!response.ok) {
        console.log('🔍 User not found by userId, trying with privy ID')
        // If not found, the user might not exist yet, use default name
        const defaultName = user?.google?.name || user?.email?.address || 'Player'
        setDisplayName(defaultName)
        return
      }
      
      const userData = await response.json()
      console.log('👤 User profile loaded:', userData)
      
      // Set display name from user data
      if (userData.custom_name) {
        setDisplayName(userData.custom_name)
      } else if (userData.username) {
        setDisplayName(userData.username)
      } else {
        // Fallback to Google name or email
        const fallbackName = user?.google?.name || user?.email?.address || 'Player'
        setDisplayName(fallbackName)
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      // Fallback to Google name or email on error
      const fallbackName = user?.google?.name || user?.email?.address || 'Player'
      setDisplayName(fallbackName)
    }
  }

  const handleLoginClick = () => {
    console.log('🔑 Login button clicked')
    if (ready && !authenticated) {
      console.log('🚀 Triggering Privy login')
      login()
    }
  }

  const handleLogout = () => {
    console.log('🔐 Logout clicked')
    logout()
    setUserProfile(null)
    setDisplayName('')
    setShowWelcome(false)
    setHasShownWelcome(false)
  }

  const closeWelcome = () => {
    setShowWelcome(false)
  }

  const handleNameClick = () => {
    if (authenticated && user) {
      setIsEditingName(true)
      setCustomName(displayName && displayName !== user.google?.name && displayName !== user.email?.address ? displayName : '')
    }
  }

  const handleNameSave = async () => {
    if (!customName.trim()) {
      alert('Please enter a name')
      return
    }

    if (!authenticated || !user) {
      alert('You must be logged in to update your name')
      return
    }

    try {
      console.log('💾 Saving custom name:', customName.trim())
      console.log('🔑 User info:', { userId: user.id, privyId: user.id, email: user.email?.address })

      const requestData = {
        userId: user.id,
        customName: customName.trim(),
        privyId: user.id
      }
      console.log('📤 Request data:', requestData)

      const response = await fetch('/api/users/profile/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })
      
      console.log('📡 API Response status:', response.status)
      console.log('📡 API Response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error response:', errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          alert(`Failed to update name: ${errorData.error || errorText}. Please try again.`)
        } catch {
          alert(`Failed to update name (HTTP ${response.status}): ${errorText}. Please try again.`)
        }
        return
      }
      
      const responseData = await response.json()
      console.log('📡 API Response data:', responseData)

      if (responseData.success) {
        setDisplayName(customName.trim())
        setIsEditingName(false)
        console.log('✅ Name updated successfully')
      } else {
        console.error('❌ API returned success=false:', responseData)
        alert(`Failed to update name: ${responseData.error || 'Unknown error'}. Please try again.`)
      }
    } catch (error) {
      console.error('❌ Network error updating name:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('Network error: Unable to connect to server. Please check your internet connection and try again.')
      } else if (error.name === 'SyntaxError') {
        alert('Server response error. Please try refreshing the page and try again.')  
      } else {
        alert(`Network error updating name: ${error.message}. Please check your connection and try again.`)
      }
    }
  }

  const handleNameCancel = () => {
    setIsEditingName(false)
    setCustomName('')
  }

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      handleNameCancel()
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Animated Snake Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Left Snake */}
        <div className="absolute top-20 left-10 animate-snake-float animate-snake-glow">
          <svg width="120" height="200" viewBox="0 0 120 200" className="opacity-80">
            <path
              d="M20 20 Q60 60 80 100 Q100 140 60 180"
              fill="none"
              stroke="#00F5FF"
              strokeWidth="25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="20" r="15" fill="#00F5FF" />
            <circle cx="15" cy="15" r="3" fill="black" />
            <circle cx="25" cy="15" r="3" fill="black" />
          </svg>
        </div>

        {/* Bottom Right Snake */}
        <div className="absolute bottom-32 right-16 animate-snake-float animate-snake-glow" style={{ animationDelay: '1s' }}>
          <svg width="150" height="180" viewBox="0 0 150 180" className="opacity-80">
            <path
              d="M130 160 Q90 120 70 80 Q50 40 90 20"
              fill="none"
              stroke="#00F5FF"
              strokeWidth="30"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="130" cy="160" r="18" fill="#00F5FF" />
            <circle cx="125" cy="155" r="4" fill="black" />
            <circle cx="135" cy="155" r="4" fill="black" />
          </svg>
        </div>

        {/* Small Snake Elements */}
        <div className="absolute top-1/3 right-1/4 animate-snake-breathe">
          <div className="w-8 h-8 bg-cyan-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-snake-drift" style={{ animationDelay: '0.5s' }}>
          <div className="w-6 h-6 bg-cyan-300 rounded-full opacity-40"></div>
        </div>
        
        {/* Additional floating elements for enhanced DAMNBRUH aesthetic */}
        <div className="absolute top-1/4 left-1/3 animate-snake-breathe" style={{ animationDelay: '2s' }}>
          <div className="w-4 h-4 bg-yellow-400 rounded-full opacity-50"></div>
        </div>
        <div className="absolute bottom-1/4 right-1/3 animate-snake-drift" style={{ animationDelay: '3s' }}>
          <div className="w-5 h-5 bg-green-400 rounded-full opacity-60"></div>
        </div>
      </div>

      {/* Top Navigation - 64px height, sticky */}
      <header className="sticky top-0 z-50 h-16 w-full backdrop-blur-sm bg-black/80 border-b border-gray-800">
        <div className="flex justify-between items-center px-8 h-full">
          {/* Left side - Welcome with icon */}
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">🎮</span>
            </div>
            <span className="text-white text-lg font-semibold">
              {authenticated && user 
                ? `Welcome, ${displayName || user.google?.name || user.email?.address || 'Player'}!` 
                : 'Welcome, Player!'
              }
            </span>
          </div>

          {/* Right side - Navigation Icons */}
          <div className="flex items-center space-x-4">
            {authenticated && user ? (
              <>
                <button className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 transition-all hover:scale-105 group">
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
                
                <button className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 transition-all hover:scale-105 group">
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                
                <button className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 transition-all hover:scale-105 group">
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black rounded-lg font-bold transition-all hover:scale-105 shadow-lg text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={handleLoginClick}
                disabled={!ready}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black rounded-lg font-bold transition-all hover:scale-105 shadow-lg disabled:opacity-50 text-sm"
              >
                {ready ? 'Login' : 'Loading...'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Skill Disclaimer Banner */}
      <div className="h-6 px-4 text-center flex items-center justify-center relative z-40 bg-gray-900/50 border-b border-gray-800">
        <span className="text-cyan-400 text-xs">⚠️ TurfLoot prizes are determined solely by player skill. Play responsibly.</span>
      </div>

      {/* Main Content - Vertically Centered */}
      <main className="flex-1 flex items-center justify-center py-8 relative z-10">
        <div className="w-full max-w-7xl mx-auto px-6">
          
          {/* Hero Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tight mb-3">
              <span className="text-white">TURF</span>
              <span className="text-yellow-400">LOOT</span>
            </h1>
            <p className="text-gray-400 text-xl font-bold tracking-wide">
              SKILL-BASED TERRITORY GAME
            </p>
          </div>

          {/* Main Game Grid */}
          <div className="grid grid-cols-12 gap-6 max-w-6xl mx-auto">
            
            {/* LEFT COLUMN - Leaderboard & Friends */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* Leaderboard */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">🏆</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Leaderboard</h3>
                  <div className="ml-auto">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Live</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: 'aj', earnings: '$1,821.23' },
                    { rank: 2, name: 'Enten', earnings: '$1,403.84' },
                    { rank: 3, name: 'hotbar', earnings: '$1,240.07' }
                  ].map((player) => (
                    <div key={player.rank} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-xl border border-gray-700/20">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-xs">
                          {player.rank}
                        </span>
                        <span className="text-gray-300 font-medium">{player.name}</span>
                      </div>
                      <span className="text-green-400 font-bold text-sm">{player.earnings}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 text-gray-300 font-medium transition-all hover:scale-105 text-sm">
                  View Full Leaderboard
                </button>
              </div>

              {/* Friends */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-sm">👥</span>
                    </div>
                    <h3 className="text-white font-bold text-lg">Friends</h3>
                  </div>
                  <button className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">⟲ Refresh</button>
                </div>
                <div className="text-center py-6">
                  <div className="text-4xl font-black text-gray-600 mb-3">0</div>
                  <div className="text-gray-500 text-sm mb-4">0 playing</div>
                  <div className="text-gray-500 text-xs mb-4">No friends... add some!</div>
                  <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 text-gray-300 font-medium transition-all hover:scale-105 text-sm">
                    Add Friends
                  </button>
                </div>
              </div>
            </div>

            {/* CENTER COLUMN - Main Game Area */}
            <div className="col-span-12 lg:col-span-6 flex flex-col justify-center space-y-8">
              
              {/* Live Stats */}
              <div className="flex justify-center space-x-12">
                <div className="text-center">
                  <div className={`text-4xl font-black text-yellow-400 mb-1 transition-all duration-300 ${
                    playerCountPulse ? 'pulse-live' : ''
                  }`}>
                    {livePlayerCount}
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Players in Game</div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-black text-yellow-400 mb-1 transition-all duration-300 ${
                    globalWinningsPulse ? 'pulse-live' : ''
                  }`}>
                    ${globalWinnings.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Global Player Winnings</div>
                </div>
              </div>

              {/* User Name Display */}
              <div className="flex justify-center">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl px-6 py-4 border border-gray-700/50 flex items-center space-x-4 shadow-lg">
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-xl font-bold text-black">
                    {authenticated && user ? (
                      displayName?.charAt(0)?.toUpperCase() || 
                      user.google?.name?.charAt(0)?.toUpperCase() || 
                      user.email?.address?.charAt(0)?.toUpperCase() || 
                      '?'
                    ) : '?'}
                  </div>
                  
                  {isEditingName ? (
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={handleNameKeyPress}
                        placeholder="Enter your name"
                        autoFocus
                        className="bg-gray-700/60 text-white text-lg font-medium px-4 py-2 rounded-xl border border-gray-600/50 focus:border-cyan-400/50 focus:outline-none"
                        maxLength={20}
                      />
                      <button
                        onClick={handleNameSave}
                        className="p-2 bg-green-600/30 hover:bg-green-600/40 border border-green-500/50 rounded-lg text-green-400 font-bold transition-all"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleNameCancel}
                        className="p-2 bg-red-600/30 hover:bg-red-600/40 border border-red-500/50 rounded-lg text-red-400 font-bold transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className={`text-white text-lg font-medium ${
                          authenticated && user ? 'cursor-pointer hover:text-cyan-400 transition-colors' : ''
                        }`}
                        onClick={handleNameClick}
                      >
                        {authenticated && user 
                          ? (displayName && displayName !== user.google?.name && displayName !== user.email?.address 
                              ? displayName 
                              : user.google?.name || user.email?.address || "Player")
                          : "wewae"
                        }
                      </span>
                      
                      {authenticated && user && (
                        <button 
                          className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                          onClick={handleNameClick}
                        >
                          <span className="text-sm">✏️</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Stake Selector */}
              <div className="flex justify-center space-x-4">
                {[1, 5, 20].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedBet(amount)}
                    className={`px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 shadow-xl min-w-[80px] ${
                      selectedBet === amount
                        ? 'bg-yellow-500 text-black border-2 border-yellow-400'
                        : 'bg-gray-800 hover:bg-gray-700 text-white border-2 border-gray-600'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* JOIN GAME Button */}
              <div className="flex justify-center">
                <button className="w-full max-w-md bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-300 text-black px-8 py-6 rounded-2xl font-black text-2xl shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-3">
                  <span className="text-3xl">▶</span>
                  <span>JOIN GAME</span>
                </button>
              </div>

              {/* Game Options */}
              <div className="flex justify-center space-x-4">
                <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-2xl font-medium border border-gray-600 transition-all hover:scale-105 text-white">
                  ⚡ EU
                </button>
                <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-2xl font-medium border border-gray-600 transition-all hover:scale-105 text-white">
                  🌍 Browse Lobbies
                </button>
              </div>

              {/* Live Stats */}
              <div className="flex justify-center space-x-12">
                <div className="text-center">
                  <div className={`text-4xl font-black text-yellow-400 mb-1 transition-all duration-300 ${
                    playerCountPulse ? 'pulse-live' : ''
                  }`}>
                    {livePlayerCount}
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Players in Game</div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-black text-yellow-400 mb-1 transition-all duration-300 ${
                    globalWinningsPulse ? 'pulse-live' : ''
                  }`}>
                    ${globalWinnings.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Global Player Winnings</div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Wallet & Customize */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* Wallet */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-sm">💳</span>
                    </div>
                    <h3 className="text-white font-bold text-lg">Wallet</h3>
                  </div>
                  <div className="flex space-x-2 text-xs">
                    <button className="text-cyan-400 hover:text-cyan-300 transition-colors">📋 Copy Address</button>
                    <button className="text-cyan-400 hover:text-cyan-300 transition-colors">⟲ Refresh Balance</button>
                  </div>
                </div>
                
                <div className="text-center py-4">
                  <div className="text-3xl font-black text-white mb-2">$0.00</div>
                  <div className="text-gray-400 text-sm mb-6">0.0000 SOL</div>
                  
                  <div className="space-y-3">
                    <button className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-400 font-bold text-sm transition-all hover:scale-105">
                      Add Funds
                    </button>
                    <button className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 font-bold text-sm transition-all hover:scale-105">
                      Cash Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Customize */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🎨</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Customize</h3>
                </div>
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    {/* Snake Avatar */}
                    <svg width="80" height="80" viewBox="0 0 80 80" className="opacity-90">
                      <path
                        d="M15 40 Q30 25 50 35 Q65 45 55 60 Q45 70 30 60"
                        fill="none"
                        stroke="#00F5FF"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="15" cy="40" r="8" fill="#00F5FF" />
                      <circle cx="12" cy="37" r="2" fill="black" />
                      <circle cx="18" cy="37" r="2" fill="black" />
                    </svg>
                  </div>
                  <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 text-gray-300 font-medium transition-all hover:scale-105 text-sm">
                    Change Appearance
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex justify-center space-x-4 mt-12">
            <button className="px-6 py-3 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-2xl font-bold text-yellow-400 transition-all hover:scale-105 text-sm">
              🎁 Daily Crate
            </button>
            <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-2xl font-medium border border-gray-600 transition-all hover:scale-105 text-white text-sm">
              👥 Affiliate
            </button>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white transition-all hover:scale-105 shadow-lg text-sm">
              🔗 Join Discord
            </button>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-gray-900/95 backdrop-blur-md border-t border-gray-700 px-4 flex items-center">
        <button className="w-full h-12 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-300 text-black rounded-2xl font-black text-lg shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
          <span className="text-xl">▶</span>
          <span>JOIN GAME</span>
        </button>
      </div>

      {/* Welcome Message Popup */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-[24px] p-8 max-w-md w-full mx-4 border border-yellow-500/30 shadow-2xl">
            <button 
              onClick={closeWelcome}
              className="absolute top-4 right-4 p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all hover:scale-110"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">Welcome to TurfLoot!</h3>
              <p className="text-gray-300 text-base mb-6">
                You're now ready to compete in skill-based territory battles and earn real SOL rewards!
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <span className="text-gray-300">Set your custom player name</span>
                </div>
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <span className="text-gray-300">Choose your stake amount</span>
                </div>
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <span className="text-gray-300">Join a game and start earning</span>
                </div>
              </div>
              
              <button 
                onClick={closeWelcome}
                className="w-full mt-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black rounded-xl font-bold transition-all hover:scale-105"
              >
                Let's Play! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}