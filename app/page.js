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
          setLivePlayerCount(playerData.count || 0)
        }

        // Fetch global winnings
        const winningsResponse = await fetch('/api/stats/global-winnings')
        if (winningsResponse.ok) {
          const winningsData = await winningsResponse.json()
          setGlobalWinnings(winningsData.total || 0)
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
  }, [])

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
      
      // Set display name from custom name or fallback to default
      if (userData.custom_name) {
        console.log('✅ Found custom name:', userData.custom_name)
        setDisplayName(userData.custom_name)
      } else {
        const defaultName = user?.google?.name || user?.email?.address || 'Player'
        console.log('🔄 No custom name, using default:', defaultName)
        setDisplayName(defaultName)
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      // Fallback if profile loading fails
      const defaultName = user?.google?.name || user?.email?.address || 'Player'
      console.log('🔄 Error fallback, using default:', defaultName)
      setDisplayName(defaultName)
    }
  }

  // Handle direct Privy login when button is clicked
  const handleLoginClick = () => {
    console.log('🔍 Starting direct Privy login...')
    
    // Call Privy's login directly - this will show the interface
    login().then(() => {
      console.log('✅ Privy login interface opened')
    }).catch((error) => {
      console.error('❌ Privy login error:', error)
      alert('Login failed. Please try again.')
    })
  }

  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData)
    setUserProfile(userData)
  }

  const closeWelcome = () => {
    setShowWelcome(false)
  }

  const handleLetsPlay = () => {
    setShowWelcome(false)
  }

  const handleLogout = () => {
    logout()
    setUserProfile(null)
    setHasShownWelcome(false)
    setDisplayName('')
    setCustomName('')
  }

  const handleNameClick = () => {
    if (!authenticated || !user) {
      alert('Please log in first to set your custom name.')
      handleLoginClick() // Automatically trigger login
      return
    }
    setIsEditingName(true)
    setCustomName(displayName || '')
  }

  const handleNameSave = async () => {
    if (!customName.trim()) {
      alert('Please enter a name before saving.')
      return
    }

    if (!user || !user.id) {
      alert('Authentication error. Please log in again.')
      return
    }

    try {
      console.log('💾 Saving custom name:', customName)
      console.log('👤 User data:', user)
      console.log('🔑 User ID:', user.id)
      
      const requestBody = {
        userId: user.id,
        customName: customName.trim(),
        privyId: user.id
      }
      
      console.log('📡 Making API request with body:', requestBody)
      
      // Make API call to update user profile
      const response = await fetch('/api/users/profile/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated grid pattern */}
        <div className="h-full w-full opacity-15" style={{
          backgroundImage: `
            linear-gradient(rgba(250,204,21,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(250,204,21,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}></div>
        
        {/* Floating orbs for atmosphere */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-yellow-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Compact Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4">
        {/* Left side - Welcome message */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 via-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-5 h-5 bg-white rounded-full relative">
                <div className="absolute top-1 left-1 w-1 h-1 bg-black rounded-full"></div>
              </div>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <span className="text-white text-lg font-semibold">
            {authenticated && user 
              ? `Welcome, ${displayName || user.google?.name || user.email?.address || 'Player'}!` 
              : 'Welcome, bruh!'
            }
          </span>
        </div>

        {/* Center - Logo/Branding Only */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-white font-bold text-sm">TURFLOOT</div>
          </div>
        </div>

        {/* Right side - Login button or User Navigation */}
        <div className="flex items-center space-x-3">
          {authenticated && user ? (
            // Authenticated user navigation
            <>
              {/* Profile Icon */}
              <button className="p-2.5 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              {/* Settings Icon */}
              <button className="p-2.5 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Sound Icon */}
              <button className="p-2.5 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              
              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 backdrop-blur-md rounded-xl border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium transition-all hover:scale-105"
              >
                Logout
              </button>
            </>
          ) : (
            // Login button for non-authenticated users
            <button 
              onClick={handleLoginClick}
              disabled={!ready}
              className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 shadow-xl hover:scale-105"
            >
              <span className="relative">{ready ? 'Login' : 'Loading...'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Compact Main Content */}
      <div className="relative z-10 flex flex-col" style={{height: 'calc(100vh - 100px)'}}>
        
        {/* Enhanced Title Section */}
        <div className="text-center mb-4">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black tracking-tight mb-2">
              <span className="text-white drop-shadow-xl">TURF</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600">LOOT</span>
            </h1>
          </div>
          <p className="text-gray-300 text-2xl font-bold tracking-wide mt-2 mb-3">
            SKILL-BASED TERRITORY GAME
          </p>
          <div className="text-yellow-400 text-lg font-medium mt-2">
            ⚡ Real-time • 🏆 Skill-based • 💎 Blockchain verified
          </div>
        </div>

        {/* Compact Main Interface */}
        <div className="flex-1 flex justify-center px-4 min-h-0">
          <div className="grid grid-cols-12 gap-4 max-w-7xl w-full h-full">
            
            {/* Live Stats Section - Full Width */}
            <div className="col-span-12 mb-4">
              <div className="flex justify-center space-x-8">
                <div className="text-center bg-black/40 backdrop-blur-md px-6 py-4 rounded-xl border border-gray-700/50">
                  <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    {livePlayerCount}
                  </div>
                  <div className="text-gray-400 text-sm font-medium mt-1">Players in Game</div>
                </div>
                <div className="text-center bg-black/40 backdrop-blur-md px-6 py-4 rounded-xl border border-gray-700/50">
                  <div className="text-3xl font-black bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">
                    ${globalWinnings.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm font-medium mt-1">Global Player Winnings</div>
                </div>
              </div>
              
              {/* Compact Login Box - Positioned under live stats */}
              <div className="flex justify-center mt-4">
                <div className="w-80 bg-black/40 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-black">
                      {authenticated && user ? (
                        displayName?.charAt(0)?.toUpperCase() || 
                        user.google?.name?.charAt(0)?.toUpperCase() || 
                        user.email?.address?.charAt(0)?.toUpperCase() || 
                        '?'
                      ) : '?'}
                    </div>
                    
                    {isEditingName ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          onKeyDown={handleNameKeyPress}
                          placeholder="Enter your name"
                          autoFocus
                          className="bg-gray-800/60 text-white text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-600/50 focus:border-yellow-400/50 focus:outline-none flex-1"
                          maxLength={20}
                        />
                        <button
                          onClick={handleNameSave}
                          className="p-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 text-xs font-bold transition-all"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleNameCancel}
                          className="p-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span 
                        className={`text-gray-300 text-sm font-medium flex-1 ${
                          authenticated && user ? 'cursor-pointer hover:text-white hover:bg-gray-700/30 px-2 py-1 rounded transition-all' : ''
                        }`}
                        onClick={handleNameClick}
                      >
                        {authenticated && user 
                          ? (displayName && displayName !== user.google?.name && displayName !== user.email?.address 
                              ? displayName 
                              : "Enter your Name!")
                          : "Login to set your name"
                        }
                      </span>
                    )}
                  </div>
                  
                  {!isEditingName && (
                    <button 
                      className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                      onClick={handleNameClick}
                    >
                      <span className="text-sm">✏️</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Left Panel - Perfect Top Alignment with Players in Game Box */}
            <div className="col-span-3 space-y-3 -mt-80">
              {/* Maximum upward positioning to exactly align with very top of Players in Game box */}
              
              {/* Compact Leaderboard */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[180px]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">🏆</div>
                  <h3 className="text-white font-bold text-sm">Leaderboard</h3>
                </div>
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">
                    🎯 No games played yet
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Start playing to see rankings!
                  </div>
                </div>
              </div>

              {/* Compact Friends Panel */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[180px]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">👥</div>
                  <h3 className="text-white font-bold text-sm">Friends</h3>
                </div>
                <div className="text-center py-3">
                  <div className="text-3xl font-bold text-gray-600 mb-2">0</div>
                  <div className="text-gray-400 text-xs mb-2">No friends... add some!</div>
                  <button className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium">
                    Invite Friends
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Center Panel - Game Controls */}
            <div className="col-span-6 flex flex-col justify-center space-y-2">

              {/* Compact Betting Options */}
              <div className="flex justify-center space-x-4">
                {[1, 5, 20].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedBet(amount)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 ${
                      selectedBet === amount
                        ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black shadow-xl shadow-orange-500/25'
                        : 'bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 text-white border border-gray-600/50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Large Join Game Button */}
              <div className="text-center">
                <button className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-8 py-3 rounded-2xl font-black text-lg shadow-2xl transition-all duration-300 hover:scale-105 flex items-center space-x-3 mx-auto">
                  <span className="text-xl">▶</span>
                  <span className="relative">JOIN GAME</span>
                </button>
              </div>

              {/* Compact Game Options */}
              <div className="flex justify-center space-x-4">
                <button className="px-4 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl text-sm font-bold border border-gray-600/50 transition-all hover:scale-105">
                  UB
                </button>
                <button className="px-4 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl text-sm font-bold border border-gray-600/50 transition-all hover:scale-105">
                  Browse Lobbies
                </button>
              </div>
            </div>

            {/* Compact Right Panel - Perfect Top Alignment with Players in Game Box */}
            <div className="col-span-3 space-y-3 h-full -mt-80">
              {/* Exact alignment with very top of Players in Game box */}
              
              {/* Compact Wallet */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[58%]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">💳</div>
                    <h3 className="text-white font-bold text-sm">Wallet</h3>
                  </div>
                  <div className="flex space-x-2 text-xs">
                    <button className="text-gray-400 hover:text-cyan-400">Copy</button>
                    <span className="text-gray-600">•</span>
                    <button className="text-gray-400 hover:text-cyan-400">Refresh</button>
                  </div>
                </div>
                
                <div className="text-center py-4">
                  <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                    $0.00
                  </div>
                  <div className="text-gray-400 text-xs mb-4">SOL Balance</div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 text-xs font-bold">
                      Add Funds
                    </button>
                    <button className="flex-1 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg text-orange-400 text-xs font-bold">
                      Cash Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact Customize */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[38%]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">🎨</div>
                  <h3 className="text-white font-bold text-sm">Customize</h3>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg">
                    <div className="w-12 h-12 bg-white rounded-full relative">
                      <div className="absolute top-2 left-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium">
                    Change Look
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discord Button */}
      <div className="absolute bottom-2 left-2">
        <button className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all hover:scale-105">
          <span className="text-sm">🔗</span>
          <span>Discord</span>
        </button>
      </div>

      {/* Welcome Message Popup */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-yellow-500/30 shadow-2xl">
            {/* Close button */}
            <button 
              onClick={closeWelcome}
              className="absolute top-4 right-4 p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all hover:scale-110"
            >
              <svg className="w-5 h-5 text-gray-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Welcome content */}
            <div className="text-center">
              {/* Celebration icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                <span className="text-4xl">🎉</span>
              </div>
              
              {/* Welcome message */}
              <h2 className="text-3xl font-black text-white mb-2">
                Welcome to 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 ml-2">
                  TURFLOOT
                </span>
                !
              </h2>
              
              <p className="text-gray-300 text-lg mb-6">
                Hey {user?.google?.name || user?.email?.address || 'Player'}! 🚀
              </p>
              
              <div className="bg-black/30 rounded-xl p-4 mb-6 border border-gray-600/30">
                <p className="text-gray-200 text-sm mb-3">
                  You're all set to dominate the turf! Here's what you can do:
                </p>
                <ul className="text-left text-sm text-gray-300 space-y-2">
                  <li className="flex items-center space-x-2">
                    <span className="text-yellow-400">⚡</span>
                    <span>Join real-time multiplayer battles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">💎</span>
                    <span>Win SOL by capturing territory</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-blue-400">🎨</span>
                    <span>Customize your character skin</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-purple-400">👥</span>
                    <span>Invite friends and climb leaderboards</span>
                  </li>
                </ul>
              </div>
              
              {/* Action button */}
              <div className="space-y-3">
                <button 
                  onClick={handleLetsPlay}
                  className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 shadow-xl"
                >
                  Let's Play! 🎮
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
