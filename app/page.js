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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 via-transparent to-orange-500/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Top Navigation - Flush to top */}
      <header className="relative z-10 flex justify-between items-center px-8 py-6 backdrop-blur-sm bg-black/20 border-b border-gray-700/30">
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

        {/* Right side - Navigation */}
        <div className="flex items-center space-x-4">
          {authenticated && user ? (
            <>
              <button className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              
              <button className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              <button className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              <button 
                onClick={handleLogout}
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black rounded-xl font-bold transition-all hover:scale-105 shadow-lg"
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              onClick={handleLoginClick}
              disabled={!ready}
              className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black rounded-xl font-bold transition-all hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {ready ? 'Login' : 'Loading...'}
            </button>
          )}
        </div>
      </header>

      {/* Skill Disclaimer Banner - Below nav, reduced height */}
      <div className="bg-[#14F195]/10 border-b border-[#14F195]/20 px-4 py-1.5 text-center text-xs relative z-10">
        <span className="text-[#14F195]">⚠️</span> TurfLoot prizes are determined solely by player skill. Play responsibly.
      </div>

      {/* Main Grid Container - 12 column system */}
      <main className="relative z-10 w-full max-w-[1200px] mx-auto px-4 py-8">
        {/* Desktop: 12-column grid, Tablet: 6-column, Mobile: 1-column */}
        <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-6">
          
          {/* LEFT STACK - Columns 1-4 on desktop */}
          <div className="md:col-span-3 xl:col-span-4 space-y-6">
            {/* Leaderboard Card */}
            <div className="bg-black/40 backdrop-blur-md rounded-[24px] p-6 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-sm">🏆</span>
                </div>
                <h3 className="text-white font-bold text-lg">Leaderboard</h3>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((rank) => (
                  <div key={rank} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-xl border border-gray-600/20">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-bold text-xs">
                        {rank}
                      </span>
                      <span className="text-gray-300 font-medium">Player {rank}</span>
                    </div>
                    <span className="text-green-400 font-bold">$0.00</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-600/30 text-gray-300 font-medium transition-all hover:scale-105">
                View Full Leaderboard
              </button>
            </div>

            {/* Friends Card */}
            <div className="bg-black/40 backdrop-blur-md rounded-[24px] p-6 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">👥</span>
                </div>
                <h3 className="text-white font-bold text-lg">Friends</h3>
              </div>
              <div className="text-center py-8">
                <div className="text-5xl font-black text-gray-600 mb-3">0</div>
                <div className="text-gray-400 text-base mb-4">No friends... add some!</div>
                <button className="px-5 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 font-bold transition-all hover:scale-105">
                  Add Friends
                </button>
              </div>
            </div>
          </div>

          {/* CENTER HERO - Columns 5-8 on desktop, full width on tablet */}
          <div className="md:col-span-6 xl:col-span-4 order-first md:order-none xl:order-none">
            <div className="text-center space-y-6">
              {/* Hero Title */}
              <div className="mb-8">
                <h1 className="text-4xl md:text-6xl xl:text-7xl font-black tracking-tight mb-3">
                  <span className="text-white">TURF</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600">LOOT</span>
                </h1>
                <p className="text-gray-300 text-lg md:text-xl xl:text-2xl font-bold tracking-wide mb-2">
                  SKILL-BASED TERRITORY GAME
                </p>
                <div className="text-yellow-400 text-sm md:text-base font-medium">
                  ⚡ Real-time • 🏆 Skill-based • 💎 Blockchain verified
                </div>
              </div>

              {/* Live Stats with pulse animation TODO: Add pulse-live class trigger on data update */}
              <div className="flex justify-center space-x-4 md:space-x-8 mb-6">
                <div className="pulse-live text-center bg-black/40 backdrop-blur-md px-4 md:px-6 py-4 rounded-[24px] border border-gray-700/50 shadow-2xl">
                  <div className="text-2xl md:text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-1">
                    {livePlayerCount}
                  </div>
                  <div className="text-gray-400 text-xs md:text-base font-medium">Players in Game</div>
                </div>
                <div className="pulse-live text-center bg-black/40 backdrop-blur-md px-4 md:px-6 py-4 rounded-[24px] border border-gray-700/50 shadow-2xl">
                  <div className="text-2xl md:text-4xl font-black bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent mb-1">
                    ${globalWinnings.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs md:text-base font-medium">Global Player Winnings</div>
                </div>
              </div>

              {/* Name Input */}
              <div className="flex justify-center mb-6">
                <div className="w-full max-w-md bg-black/40 backdrop-blur-md rounded-[24px] p-4 border border-gray-700/50 flex items-center justify-between shadow-2xl">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-base font-bold text-black">
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
                          className="bg-gray-800/60 text-white text-base font-medium px-3 py-2 rounded-xl border border-gray-600/50 focus:border-yellow-400/50 focus:outline-none flex-1"
                          maxLength={20}
                        />
                        <button
                          onClick={handleNameSave}
                          className="p-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-400 font-bold transition-all"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleNameCancel}
                          className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-red-400 font-bold transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span 
                        className={`text-gray-300 text-base font-medium flex-1 ${
                          authenticated && user ? 'cursor-pointer hover:text-white hover:bg-gray-700/30 px-2 py-1 rounded-xl transition-all' : ''
                        }`}
                        onClick={handleNameClick}
                      >
                        {authenticated && user 
                          ? (displayName && displayName !== user.google?.name && displayName !== user.email?.address 
                              ? displayName 
                              : "Enter your name")
                          : "Login to set your name"
                        }
                      </span>
                    )}
                  </div>
                  
                  {!isEditingName && (
                    <button 
                      className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all"
                      onClick={handleNameClick}
                    >
                      <span className="text-base">✏️</span>
                    </button>
                  )}
                </div>
              </div>

              {/* POT & CTA Module */}
              <div className="space-y-4">
                {/* Stake Selector - flex row with 16px gap */}
                <div className="flex justify-center space-x-4 mb-4">
                  {[1, 5, 20].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedBet(amount)}
                      className={`px-6 py-3 rounded-[24px] font-bold text-lg md:text-xl transition-all duration-300 hover:scale-105 shadow-2xl ${
                        selectedBet === amount
                          ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black'
                          : 'bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 text-white border border-gray-600/50'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                {/* JOIN GAME Button - 100% width, 56px height */}
                <div className="hidden md:block">
                  <button className="w-full h-14 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black rounded-[24px] font-black text-xl md:text-2xl shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-3">
                    <span className="text-2xl md:text-3xl">▶</span>
                    <span>JOIN GAME</span>
                  </button>
                </div>

                {/* Game Options */}
                <div className="flex justify-center space-x-4">
                  <button className="px-6 py-3 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-[24px] text-base font-bold border border-gray-600/50 transition-all hover:scale-105">
                    Quick Match
                  </button>
                  <button className="px-6 py-3 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-[24px] text-base font-bold border border-gray-600/50 transition-all hover:scale-105">
                    Browse Lobbies
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT STACK - Columns 9-12 on desktop */}
          <div className="md:col-span-3 xl:col-span-4 space-y-6">
            {/* Wallet Card */}
            <div className="bg-black/40 backdrop-blur-md rounded-[24px] p-6 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-cyan-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">💳</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Wallet</h3>
                </div>
                <div className="flex space-x-3 text-xs">
                  <button className="text-gray-400 hover:text-cyan-400 transition-colors">Copy Address</button>
                  <button className="text-gray-400 hover:text-cyan-400 transition-colors">Refresh Balance</button>
                </div>
              </div>
              
              <div className="text-center py-6">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
                  $0.00
                </div>
                <div className="text-gray-400 text-base mb-6">SOL Balance</div>
                
                <div className="space-y-3">
                  <button className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-400 font-bold text-base transition-all hover:scale-105">
                    Add Funds
                  </button>
                  <button className="w-full py-3 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-xl text-orange-400 font-bold text-base transition-all hover:scale-105">
                    Cash Out
                  </button>
                </div>
              </div>
            </div>

            {/* Customize Card */}
            <div className="bg-black/40 backdrop-blur-md rounded-[24px] p-6 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🎨</span>
                </div>
                <h3 className="text-white font-bold text-lg">Customize</h3>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <div className="w-12 h-12 bg-white rounded-full relative">
                    <div className="absolute top-2 left-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-1.5 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
                <button className="px-5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-400 font-bold transition-all hover:scale-105">
                  Change Appearance
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar - In grid flow */}
        <div className="flex justify-center space-x-4 mt-8">
          <button className="px-6 py-3 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-[24px] text-base font-bold border border-gray-600/50 transition-all hover:scale-105">
            Daily Crate
          </button>
          <button className="px-6 py-3 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-[24px] text-base font-bold border border-gray-600/50 transition-all hover:scale-105">
            Affiliate Program
          </button>
          <button className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-[24px] font-bold flex items-center space-x-2 transition-all hover:scale-105 shadow-lg">
            <span className="text-lg">🔗</span>
            <span>Join Discord</span>
          </button>
        </div>
      </main>

      {/* Mobile Fixed Bottom CTA - Only show on mobile when hidden in main content */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-black/90 backdrop-blur-md border-t border-gray-700/50 px-4 flex items-center">
        <button className="w-full h-12 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black rounded-[24px] font-black text-lg shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
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