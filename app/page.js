'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import WalletManager from '../components/wallet/WalletManager'
import UserProfile from '../components/UserProfile'
import UserSettings from '../components/UserSettings'

export default function Home() {
  const [userProfile, setUserProfile] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [customName, setCustomName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [livePlayerCount, setLivePlayerCount] = useState(0)
  const [globalWinnings, setGlobalWinnings] = useState(0)
  const [playerCountPulse, setPlayerCountPulse] = useState(false)
  const [globalWinningsPulse, setGlobalWinningsPulse] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [selectedStake, setSelectedStake] = useState('FREE')
  const [isTestUser, setIsTestUser] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Get Privy hooks
  const { login, ready, authenticated, user, logout } = usePrivy()
  const router = useRouter()

  // Check for new authentication and show welcome message
  useEffect(() => {
    console.log('🔍 Auth effect triggered:', { authenticated, user, ready, hasShownWelcome })
    
    if (authenticated && user && !hasShownWelcome) {
      console.log('🎉 User authenticated:', user)
      console.log('🔑 User ID:', user.id)
      console.log('📧 User email:', user.email?.address)
      console.log('🌐 User google:', user.google?.name)
      
      // Create JWT token for game authentication
      createAuthToken(user)
      
      setShowWelcome(true)
      setHasShownWelcome(true)
      setUserProfile(user)
      
      // Load user's custom name if it exists
      loadUserProfile(user.id)
    } else if (authenticated && user) {
      // User is authenticated but welcome was already shown, just load profile
      console.log('👤 User already authenticated, loading profile')
      
      // Ensure auth token exists for game
      createAuthToken(user)
      
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

  // Check for test user authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const testAuth = localStorage.getItem('test_user_authenticated')
      const testSession = localStorage.getItem('test_user_session')
      
      if (testAuth === 'true' && testSession) {
        setIsTestUser(true)
        console.log('🧪 Test user detected')
        
        // Parse test user data
        try {
          const userData = JSON.parse(testSession)
          setDisplayName(userData.username || 'TestPlayer')
          console.log('🧪 Test user data loaded:', userData)
        } catch (error) {
          console.error('Error parsing test user data:', error)
        }
      }
    }
  }, [])

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

  const createAuthToken = async (privyUser) => {
    try {
      console.log('🔑 Creating auth token for user:', privyUser.id)
      
      // Check if token already exists and is still valid
      const existingToken = localStorage.getItem('auth_token')
      if (existingToken) {
        console.log('🔑 Auth token already exists, checking validity...')
        
        // Try to decode the existing token to check if it's still valid
        try {
          const payload = JSON.parse(atob(existingToken.split('.')[1]))
          if (payload.exp && payload.exp > Date.now() / 1000) {
            console.log('🔑 Existing auth token is still valid')
            return
          } else {
            console.log('🔑 Existing auth token expired, creating new one...')
          }
        } catch (e) {
          console.log('🔑 Existing auth token invalid, creating new one...')
        }
      }

      // Call Privy authentication endpoint to get JWT token
      console.log('🔑 Calling Privy auth endpoint...')
      const response = await fetch('/api/auth/privy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privy_user: privyUser
        })
      })

      console.log('🔑 Privy auth response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('🔑 Privy auth response data:', {
          success: data.success,
          hasToken: !!data.token,
          hasUser: !!data.user,
          tokenLength: data.token?.length
        })
        
        if (data.token) {
          // Store JWT token for game authentication
          localStorage.setItem('auth_token', data.token)
          console.log('✅ Auth token created and stored successfully')
          
          // Debug: Decode token to verify content
          try {
            const payload = JSON.parse(atob(data.token.split('.')[1]))
            console.log('🔍 Token payload:', {
              userId: payload.userId,
              privyId: payload.privyId,
              email: payload.email,
              username: payload.username,
              exp: payload.exp,
              expiresAt: new Date(payload.exp * 1000)
            })
          } catch (e) {
            console.log('🔍 Could not decode token for debugging:', e.message)
          }
        } else {
          console.error('❌ No token received from auth endpoint:', data)
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to create auth token:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Error creating auth token:', error)
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
    
    // Clear auth token for game
    localStorage.removeItem('auth_token')
    
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

    // For non-authenticated users, just set the display name locally
    if (!authenticated || !user) {
      setDisplayName(customName.trim())
      setIsEditingName(false)
      console.log('✅ Name set locally for non-authenticated user:', customName.trim())
      return
    }

    try {
      console.log('💾 Saving custom name:', customName.trim())
      console.log('🔑 User info:', { 
        userId: user.id, 
        privyId: user.id, 
        email: user.email?.address,
        userType: typeof user,
        userKeys: Object.keys(user || {})
      })

      const requestData = {
        userId: user.id,
        customName: customName.trim(),
        privyId: user.id,
        email: user.email?.address || null
      }
      console.log('📤 Request data:', requestData)

      // Try the API request with improved error handling
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
        console.error('❌ Response status:', response.status)
        console.error('❌ Response statusText:', response.statusText)
        
        // Handle specific error cases
        if (response.status === 500) {
          console.error('❌ Server error - this might be a deployment/gateway issue')
          // For 500 errors, still update locally as a fallback
          setDisplayName(customName.trim())
          setIsEditingName(false)
          alert(`Name updated locally to "${customName.trim()}". There was a server issue saving it permanently, but your change will be visible during this session.`)
          return
        } else if (response.status === 400) {
          try {
            const errorData = JSON.parse(errorText)
            alert(`Invalid request: ${errorData.error || errorText}`)
          } catch {
            alert(`Bad request: ${errorText}`)
          }
        } else if (response.status >= 502 && response.status <= 504) {
          // Gateway/proxy errors - common with external URLs
          console.error('❌ Gateway/proxy error - using local fallback')
          setDisplayName(customName.trim())
          setIsEditingName(false)
          alert(`Name updated locally to "${customName.trim()}". Connection issues prevented saving to server, but your change is active for this session.`)
          return
        } else {
          try {
            const errorData = JSON.parse(errorText)
            alert(`Failed to update name: ${errorData.error || errorText}. Please try again.`)
          } catch {
            alert(`Failed to update name (HTTP ${response.status}): ${errorText}. Please try again.`)
          }
        }
        return
      }
      
      const responseData = await response.json()
      console.log('📡 API Response data:', responseData)

      if (responseData && responseData.success) {
        setDisplayName(customName.trim())
        setIsEditingName(false)
        console.log('✅ Name updated successfully via API')
        // Show success message
        alert(`✅ Name successfully updated to "${customName.trim()}"!`)
      } else {
        console.error('❌ API returned success=false:', responseData)
        // Even if API says it failed, try the local update as fallback
        setDisplayName(customName.trim())
        setIsEditingName(false)
        alert(`Name updated locally to "${customName.trim()}". Server response was unclear, but your change is active.`)
      }
    } catch (error) {
      console.error('❌ Network error updating name:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      // For any network errors, fall back to local update
      setDisplayName(customName.trim())
      setIsEditingName(false)
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert(`Network error occurred, but name updated locally to "${customName.trim()}". Please check your internet connection. Your change is active for this session.`)
      } else if (error.name === 'SyntaxError') {
        alert(`Server response error, but name updated locally to "${customName.trim()}". Your change is active for this session.`)
      } else {
        alert(`Connection issue occurred, but name updated locally to "${customName.trim()}". Your change is active for this session.`)
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

  const handleJoinGame = () => {
    console.log('🎮 Join game clicked:', { 
      authenticated, 
      selectedStake, 
      user: !!user 
    })
    
    // For FREE games - route to Agario clone (regardless of auth status)
    if (selectedStake === 'FREE' || selectedStake === 0) {
      console.log('🆓 Routing to Agario game')
      router.push('/agario')
      return
    }
    
    // For cash games - require authentication
    if (!authenticated || !user) {
      console.log('❌ User not authenticated for cash game')
      setShowWelcome(false)
      setShowLoginModal(true)
      return
    }
    
    // For cash games, use the original complex game with authentication
    const mode = 'cash'
    const fee = parseInt(selectedStake.toString().replace('$', ''))
    const roomId = 'lobby'
    
    console.log('💰 Routing to cash game with auth:', { mode, fee, roomId })
    router.push(`/play?mode=${mode}&room=${roomId}&fee=${fee}`)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Paper.io Inspired Background */}
      <div className="absolute inset-0 pointer-events-none paper-bg-grid">
        
        {/* Animated Territory Patches */}
        <div className="absolute top-20 left-16 w-32 h-24 animate-territory-expand">
          <svg width="128" height="96" viewBox="0 0 128 96" className="opacity-30">
            <polygon 
              points="10,10 118,10 118,86 10,86" 
              fill="rgba(0, 245, 255, 0.2)"
              stroke="rgba(0, 245, 255, 0.6)"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="absolute bottom-32 right-20 w-40 h-28 animate-territory-expand" style={{ animationDelay: '1s' }}>
          <svg width="160" height="112" viewBox="0 0 160 112" className="opacity-30">
            <polygon 
              points="20,20 140,20 140,92 20,92" 
              fill="rgba(255, 215, 0, 0.2)"
              stroke="rgba(255, 215, 0, 0.6)"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Capture Lines Animation */}
        <div className="absolute top-1/3 left-1/4 w-48 h-32">
          <svg width="192" height="128" viewBox="0 0 192 128" className="opacity-40">
            <path
              d="M10 64 Q50 30, 90 64 T170 64"
              fill="none"
              stroke="rgba(0, 245, 255, 0.8)"
              strokeWidth="3"
              strokeDasharray="5,5"
              className="animate-capture-line"
            />
          </svg>
        </div>

        <div className="absolute bottom-1/3 right-1/4 w-56 h-36" style={{ animationDelay: '1.5s' }}>
          <svg width="224" height="144" viewBox="0 0 224 144" className="opacity-40">
            <path
              d="M20 72 Q80 40, 120 72 T200 72"
              fill="none"
              stroke="rgba(255, 215, 0, 0.8)"
              strokeWidth="3"
              strokeDasharray="5,5"
              className="animate-capture-line"
            />
          </svg>
        </div>

        {/* Paper.io Style Territory Dots */}
        <div className="absolute top-1/4 right-1/3 animate-grid-pulse">
          <div className="w-4 h-4 bg-cyan-400 rounded-sm opacity-60 border border-cyan-300"></div>
        </div>
        <div className="absolute bottom-1/4 left-1/3 animate-grid-pulse" style={{ animationDelay: '2s' }}>
          <div className="w-4 h-4 bg-yellow-400 rounded-sm opacity-60 border border-yellow-300"></div>
        </div>
        <div className="absolute top-1/2 left-1/5 animate-paper-drift">
          <div className="w-3 h-3 bg-green-400 rounded-sm opacity-50 border border-green-300"></div>
        </div>
        <div className="absolute top-2/3 right-1/5 animate-paper-drift" style={{ animationDelay: '3s' }}>
          <div className="w-3 h-3 bg-purple-400 rounded-sm opacity-50 border border-purple-300"></div>
        </div>

        {/* Large Background Territory Shapes */}
        <div className="absolute top-10 right-10 w-64 h-48 animate-grid-pulse" style={{ animationDelay: '0.5s' }}>
          <svg width="256" height="192" viewBox="0 0 256 192" className="opacity-10">
            <polygon 
              points="30,30 226,30 226,162 30,162" 
              fill="rgba(0, 245, 255, 0.1)"
              stroke="rgba(0, 245, 255, 0.2)"
              strokeWidth="1"
            />
          </svg>
        </div>

        <div className="absolute bottom-10 left-10 w-72 h-40 animate-grid-pulse" style={{ animationDelay: '2.5s' }}>
          <svg width="288" height="160" viewBox="0 0 288 160" className="opacity-10">
            <polygon 
              points="40,40 248,40 248,120 40,120" 
              fill="rgba(255, 215, 0, 0.1)"
              stroke="rgba(255, 215, 0, 0.2)"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Moving Grid Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="w-8 h-8 absolute top-16 left-32 bg-cyan-500/20 border border-cyan-400/40 animate-paper-drift"></div>
          <div className="w-6 h-6 absolute top-24 right-40 bg-yellow-500/20 border border-yellow-400/40 animate-paper-drift" style={{ animationDelay: '1s' }}></div>
          <div className="w-7 h-7 absolute bottom-20 left-24 bg-green-500/20 border border-green-400/40 animate-paper-drift" style={{ animationDelay: '2s' }}></div>
          <div className="w-5 h-5 absolute bottom-32 right-32 bg-purple-500/20 border border-purple-400/40 animate-paper-drift" style={{ animationDelay: '1.5s' }}></div>
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
                
                <button 
                  onClick={() => setShowProfile(true)}
                  className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 transition-all hover:scale-105 group"
                  title="Profile"
                >
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 transition-all hover:scale-105 group"
                  title="Settings"
                >
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
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl h-[200px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-sm">👥</span>
                    </div>
                    <h3 className="text-white font-bold text-lg">Friends</h3>
                  </div>
                  <button className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">⟲ Refresh</button>
                </div>
                <div className="text-center pt-4 pb-10">
                  <div className="text-3xl font-black text-gray-600 mb-1">0</div>
                  <div className="text-gray-400 text-xs mb-1">playing</div>
                  <div className="text-gray-500 text-xs mb-3">No friends - add some!</div>
                  <button className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 font-bold text-xs transition-all hover:scale-105">
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
                    {(authenticated && user) || isTestUser ? (
                      displayName?.charAt(0)?.toUpperCase() || 
                      user?.google?.name?.charAt(0)?.toUpperCase() || 
                      user?.email?.address?.charAt(0)?.toUpperCase() || 
                      'T'
                    ) : (
                      displayName?.charAt(0)?.toUpperCase() || '?'
                    )}
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
                        className="text-white text-lg font-medium cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={authenticated && user ? handleNameClick : () => setIsEditingName(true)}
                      >
                        {authenticated && user 
                          ? (displayName && displayName !== user.google?.name && displayName !== user.email?.address 
                              ? displayName 
                              : user.google?.name || user.email?.address || "Player")
                          : (displayName || "Click to set name")
                        }
                      </span>
                      
                      <button 
                        className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                        onClick={authenticated && user ? handleNameClick : () => setIsEditingName(true)}
                      >
                        <span className="text-sm">✏️</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stakes */}
              <div className="flex justify-center space-x-3">
                <button 
                  onClick={() => setSelectedStake('FREE')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    selectedStake === 'FREE' 
                      ? 'bg-cyan-400 text-black border-2 border-cyan-300' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  FREE
                </button>
                <button 
                  onClick={() => setSelectedStake(1)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    selectedStake === 1 
                      ? 'bg-yellow-400 text-black border-2 border-yellow-300' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  $1
                </button>
                <button 
                  onClick={() => setSelectedStake(5)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    selectedStake === 5 
                      ? 'bg-yellow-400 text-black border-2 border-yellow-300' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  $5
                </button>
                <button 
                  onClick={() => setSelectedStake(20)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    selectedStake === 20 
                      ? 'bg-yellow-400 text-black border-2 border-yellow-300' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  $20
                </button>
              </div>

              {/* JOIN GAME Button */}
              <div className="flex justify-center">
                <button 
                  onClick={handleJoinGame}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-black py-6 px-16 rounded-2xl text-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-2 border-cyan-300"
                >
                  {(selectedStake > 0 && selectedStake !== 'FREE') ? `JOIN GAME - $${selectedStake}` : 'JOIN FREE GAME'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-6">
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

            {/* RIGHT COLUMN - Wallet & Customize */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* Wallet Panel */}
              <div className="glass-card rounded-2xl p-4 border border-cyan-400/20 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-6 h-6 bg-cyan-400 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-black">💰</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Wallet</h3>
                </div>
                
                <WalletManager onBalanceUpdate={(balance) => setWalletBalance(balance.balance)} />
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
                    {/* Playable Character Circle */}
                    <div className="w-20 h-20 bg-cyan-400 rounded-full player-character animate-breathe hover:animate-hover-bounce transition-all duration-300 cursor-pointer shadow-lg border-2 border-cyan-300 flex items-center justify-center">
                      <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-6"></div>
                      <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-6"></div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs mb-3">Your Character</div>
                  <button className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-400 font-medium transition-all hover:scale-105 text-sm">
                    Change Appearance
                  </button>
                </div>
              </div>
            </div>
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
      
      {/* Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
        user={userProfile}
      />
      
      {/* Settings Modal */}
      <UserSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        user={userProfile}
      />
    </div>
  )
}