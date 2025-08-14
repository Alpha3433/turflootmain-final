'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import WalletManager from '../components/wallet/WalletManager'
import UserProfile from '../components/UserProfile'
import UserSettings from '../components/UserSettings'
import CustomizationModal from '@/components/customization/EnhancedCustomizationModal'
import ServerBrowserModal from '../components/ServerBrowserModal'
import { GameSettingsProvider } from '../components/providers/GameSettingsProvider'

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
  const [showCustomization, setShowCustomization] = useState(false)
  const [showServerBrowser, setShowServerBrowser] = useState(false)
  const [currentServer, setCurrentServer] = useState('US-East-1') // Default server
  const [currentPing, setCurrentPing] = useState(null) // Initialize as null to prevent hydration mismatch
  const [leaderboardData, setLeaderboardData] = useState([])
  const [playerCustomization, setPlayerCustomization] = useState({
    skin: 'default_blue',
    hat: null,
    trail: 'default_sparkle',
    face: 'normal_eyes'
  })
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [socialInitialTab, setSocialInitialTab] = useState('leaderboard')
  const [friendsList, setFriendsList] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  
  // Real-time cash-out notifications state
  const [cashOutNotifications, setCashOutNotifications] = useState([])
  
  // Mock data for notifications
  const mockPlayerNames = [
    'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Avery', 'Quinn',
    'Cameron', 'Blake', 'Sage', 'Phoenix', 'River', 'Skyler', 'Dakota', 'Emery',
    'Finley', 'Harper', 'Indigo', 'Justice', 'Kai', 'Lane', 'Marley', 'Nova'
  ]
  
  const mockCities = [
    'New York', 'Los Angeles', 'Chicago', 'Miami', 'Seattle', 'Austin', 'Denver',
    'Boston', 'San Francisco', 'Las Vegas', 'Atlanta', 'Portland', 'Nashville',
    'Phoenix', 'San Diego', 'Dallas', 'Houston', 'Philadelphia', 'Detroit',
    'Minneapolis', 'Tampa', 'Orlando', 'Charlotte', 'Raleigh', 'Louisville'
  ]
  
  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3',
    '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43', '#EE5A24', '#0ABDE3',
    '#10AC84', '#F79F1F', '#A3CB38', '#FDA7DF', '#D63031', '#74B9FF'
  ]
  
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

  // Helper function to format time elapsed
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    
    if (seconds < 60) {
      return `${seconds}s ago`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes}m ago`
    } else {
      const hours = Math.floor(seconds / 3600)
      return `${hours}h ago`
    }
  }

  // Real-time cash-out notifications effect
  useEffect(() => {
    // Helper function to generate a random notification
    const generateNotification = () => {
      const name = mockPlayerNames[Math.floor(Math.random() * mockPlayerNames.length)]
      const city = mockCities[Math.floor(Math.random() * mockCities.length)]
      const amount = Math.floor(Math.random() * 2500) + 100 // $100 - $2600
      const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]
      
      return {
        id: Date.now() + Math.random(),
        name,
        city,
        amount,
        color,
        timestamp: Date.now(),
        fadeOut: false
      }
    }

    // Seed initial notifications (3-4 notifications with different timestamps)
    const seedNotifications = []
    for (let i = 0; i < 4; i++) {
      const notification = generateNotification()
      notification.timestamp = Date.now() - (i * 15000) - Math.random() * 30000 // Random times in the past
      seedNotifications.push(notification)
    }
    setCashOutNotifications(seedNotifications)

    // Function to add new notification
    const addNotification = () => {
      const newNotification = generateNotification()
      
      setCashOutNotifications(prev => {
        let updated = [...prev, newNotification]
        
        // If we have more than 6, mark the oldest for fade-out
        if (updated.length > 6) {
          updated = updated.slice(-6) // Keep only the 6 most recent
        }
        
        return updated
      })
      
      // Set fade-out timer for this notification
      setTimeout(() => {
        setCashOutNotifications(prev => 
          prev.map(notif => 
            notif.id === newNotification.id 
              ? { ...notif, fadeOut: true }
              : notif
          )
        )
        
        // Remove after fade-out animation
        setTimeout(() => {
          setCashOutNotifications(prev => 
            prev.filter(notif => notif.id !== newNotification.id)
          )
        }, 500) // 500ms fade-out duration
      }, 5000) // Show for 5 seconds
    }

    // Start generating notifications every 15-25 seconds (less frequent)
    const generateNotifications = () => {
      const randomDelay = Math.random() * 10000 + 15000 // 15-25 seconds
      setTimeout(() => {
        addNotification()
        generateNotifications() // Schedule next notification
      }, randomDelay)
    }
    
    generateNotifications()
    
    // Set fade-out timers for seed notifications
    seedNotifications.forEach((notification, index) => {
      const remainingTime = Math.max(1000, 5000 - (Date.now() - notification.timestamp))
      setTimeout(() => {
        setCashOutNotifications(prev => 
          prev.map(notif => 
            notif.id === notification.id 
              ? { ...notif, fadeOut: true }
              : notif
          )
        )
        
        setTimeout(() => {
          setCashOutNotifications(prev => 
            prev.filter(notif => notif.id !== notification.id)
          )
        }, 500)
      }, remainingTime)
    })
    
    // Cleanup is not needed as this runs for the lifetime of the component
  }, [])

  // Load player customization data
  useEffect(() => {
    try {
      const saved = localStorage.getItem('turfloot_player_customization')
      if (saved) {
        const customizationData = JSON.parse(saved)
        setPlayerCustomization({
          skin: customizationData.skin || 'default_blue',
          hat: customizationData.hat || null,
          trail: customizationData.trail || 'default_sparkle',
          face: customizationData.face || 'normal_eyes'
        })
        console.log('Loaded player customization:', customizationData)
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
      // Reset to defaults if there's an error
      setPlayerCustomization({
        skin: 'default_blue',
        hat: null,
        trail: 'default_sparkle',
        face: 'normal_eyes'
      })
    }
  }, [showCustomization]) // Reload when customization modal closes

  // Update notification timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCashOutNotifications(prev => [...prev]) // Force re-render to update timestamps
    }, 30000)

    return () => clearInterval(interval)
  }, [])
  
  // Update ping periodically on client side only
  useEffect(() => {
    // Set initial ping on client side only
    setCurrentPing(Math.floor(Math.random() * 20) + 15)
    
    // Update ping every 10 seconds
    const pingInterval = setInterval(() => {
      setCurrentPing(Math.floor(Math.random() * 20) + 15)
    }, 10000)
    
    return () => clearInterval(pingInterval)
  }, [])
  useEffect(() => {
    const handleMouseMove = (e) => {
      const character = document.getElementById('player-character')
      const leftEye = document.getElementById('left-eye')
      const rightEye = document.getElementById('right-eye')
      
      if (!character || !leftEye || !rightEye) return
      
      const characterRect = character.getBoundingClientRect()
      const characterCenterX = characterRect.left + characterRect.width / 2
      const characterCenterY = characterRect.top + characterRect.height / 2
      
      const mouseX = e.clientX
      const mouseY = e.clientY
      
      // Calculate angle for eye movement
      const angle = Math.atan2(mouseY - characterCenterY, mouseX - characterCenterX)
      
      // Maximum eye movement distance (in pixels)
      const maxDistance = 3
      
      // Calculate eye positions
      const eyeX = Math.cos(angle) * maxDistance
      const eyeY = Math.sin(angle) * maxDistance
      
      // Apply transforms to eyes
      leftEye.style.transform = `translate(${eyeX}px, ${eyeY}px)`
      rightEye.style.transform = `translate(${eyeX}px, ${eyeY}px)`
    }
    
    // Add event listener
    window.addEventListener('mousemove', handleMouseMove)
    
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])
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
        // Fetch live player count, global winnings, leaderboard, and friends
        const [playersResponse, winningsResponse, leaderboardResponse, friendsResponse] = await Promise.all([
          fetch('/api/stats/live-players'),
          fetch('/api/stats/global-winnings'),
          fetch('/api/users/leaderboard'),
          fetch(`/api/friends/list?userId=${userProfile?.id || userProfile?.privyId || 'demo-user'}`)
        ])

        if (playersResponse.ok) {
          const playersData = await playersResponse.json()
          const newCount = playersData.count
          
          if (newCount !== livePlayerCount) {
            setPlayerCountPulse(true)
            setTimeout(() => setPlayerCountPulse(false), 1000)
          }
          
          setLivePlayerCount(newCount)
        }

        if (winningsResponse.ok) {
          const winningsData = await winningsResponse.json()
          const newWinnings = winningsData.total
          
          if (newWinnings !== globalWinnings) {
            setGlobalWinningsPulse(true)
            setTimeout(() => setGlobalWinningsPulse(false), 1000)
          }
          
          setGlobalWinnings(newWinnings)
        }

        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json()
          console.log('📊 Leaderboard data received:', leaderboardData)
          
          // Process leaderboard data for display
          const processedLeaderboard = leaderboardData.users.slice(0, 3).map((user, index) => ({
            rank: index + 1,
            name: user.custom_name || user.email?.split('@')[0] || `Player${user.id?.slice(-4)}`,
            earnings: `$${(user.stats?.total_earnings || 0).toFixed(2)}`
          }))
          
          setLeaderboardData(processedLeaderboard)
        } else {
          console.log('⚠️ No leaderboard data available')
          setLeaderboardData([])
        }

        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json()
          console.log('👥 Friends data received:', friendsData)
          
          // Process friends data for display
          const processedFriends = friendsData.friends.slice(0, 3).map((friend) => ({
            id: friend.id,
            name: friend.custom_name || friend.email?.split('@')[0] || `Player${friend.id?.slice(-4)}`,
            status: friend.online_status || 'offline',
            wins: friend.stats?.games_won || 0
          }))
          
          setFriendsList(processedFriends)
        } else {
          console.log('⚠️ No friends data available')
          setFriendsList([])
        }
      } catch (error) {
        console.error('Error loading statistics:', error)
        setLeaderboardData([])
        setFriendsList([])
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
        // If not found, use a temporary random-style name until user is created
        setDisplayName('Loading...')
        return
      }
      
      const userData = await response.json()
      console.log('👤 User profile loaded:', userData)
      
      // Set display name priority: custom_name > username (random) > fallback to "Player"
      if (userData.custom_name) {
        setDisplayName(userData.custom_name)
      } else if (userData.username && !userData.username.includes('@')) {
        setDisplayName(userData.username)
      } else {
        // Final fallback - should rarely be used since API assigns random usernames
        setDisplayName('Player')
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      // Fallback to generic name on error - no more email addresses
      setDisplayName('Player')
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
    console.log('🎮 handleJoinGame called, selectedStake:', selectedStake, 'authenticated:', authenticated, 'user:', !!user)
    
    // Require authentication for ALL games (both FREE and cash games)
    if (!authenticated || !user) {
      console.log('❌ User not authenticated - showing Privy login')
      setShowWelcome(false)
      // Trigger Privy login directly instead of showing our modal
      login()
      return
    }
    
    // For FREE games - route to Agario clone (with authentication)
    if (selectedStake === 'FREE' || selectedStake === 0) {
      console.log('🆓 Free game selected - using bots for testing')
      
      // Show confirmation dialog for bot practice
      const confirmed = window.confirm(
        '🤖 Free games use AI bots for instant practice and testing.\n\n' +
        'Perfect for learning game mechanics and trying strategies without waiting for other players.\n\n' +
        'Ready to practice against smart AI bots?'
      )
      
      console.log('🔍 Confirmation result:', confirmed)
      
      if (confirmed) {
        console.log('✅ User confirmed bot practice game - navigating to /agario')
        
        // Try router.push with fallback
        try {
          router.push('/agario?mode=free&fee=0')
          
          // Extra fallback for edge cases
          setTimeout(() => {
            if (window.location.pathname === '/') {
              console.log('🔄 Using window.location fallback')
              window.location.href = '/agario?mode=free&fee=0'
            }
          }, 2000)
          
        } catch (error) {
          console.error('❌ Router error:', error)
          window.location.href = '/agario?mode=free&fee=0'
        }
      } else {
        console.log('❌ User cancelled bot practice')
      }
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
    <div className="min-h-screen text-white relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(to bottom right, rgb(17, 24, 39), rgb(31, 41, 55), rgb(55, 65, 81))' }}>
      {/* Game-Inspired Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-10">
        
        {/* Floating Game Coins - Much Brighter */}
        <div className="absolute top-20 left-16 animate-float-coin z-20" style={{ animationDelay: '0s' }}>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200" style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' }}>
            <span className="text-black font-black text-lg drop-shadow-lg">$</span>
          </div>
        </div>
        
        <div className="absolute top-32 right-24 animate-float-coin z-20" style={{ animationDelay: '1.5s' }}>
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200" style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' }}>
            <span className="text-black font-black text-base drop-shadow-lg">$</span>
          </div>
        </div>
        
        <div className="absolute bottom-40 left-32 animate-float-coin z-20" style={{ animationDelay: '3s' }}>
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200" style={{ boxShadow: '0 0 25px rgba(255, 215, 0, 0.9)' }}>
            <span className="text-black font-black text-xl drop-shadow-lg">$</span>
          </div>
        </div>
        
        <div className="absolute top-1/2 right-1/4 animate-float-coin z-20" style={{ animationDelay: '2s' }}>
          <div className="w-11 h-11 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200" style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' }}>
            <span className="text-black font-black text-lg drop-shadow-lg">$</span>
          </div>
        </div>

        {/* More Floating Coins for Better Visibility */}
        <div className="absolute top-1/4 left-1/2 animate-float-coin z-20" style={{ animationDelay: '0.8s' }}>
          <div className="w-9 h-9 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-3 border-yellow-200" style={{ boxShadow: '0 0 18px rgba(255, 215, 0, 0.7)' }}>
            <span className="text-black font-black text-sm drop-shadow-lg">$</span>
          </div>
        </div>
        
        <div className="absolute bottom-1/4 right-1/3 animate-float-coin z-20" style={{ animationDelay: '2.3s' }}>
          <div className="w-13 h-13 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200" style={{ boxShadow: '0 0 22px rgba(255, 215, 0, 0.8)' }}>
            <span className="text-black font-black text-lg drop-shadow-lg">$</span>
          </div>
        </div>

        <div className="absolute top-16 left-1/4 animate-float-coin z-20" style={{ animationDelay: '4s' }}>
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-3 border-yellow-200" style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' }}>
            <span className="text-black font-black text-base drop-shadow-lg">$</span>
          </div>
        </div>

        {/* Animated Player Circles - Much Brighter */}
        <div className="absolute top-24 left-1/3 animate-player-drift z-20" style={{ animationDelay: '0.5s' }}>
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 via-cyan-300 to-cyan-500 rounded-full shadow-2xl border-4 border-cyan-200 flex items-center justify-center" style={{ boxShadow: '0 0 25px rgba(0, 255, 255, 0.8)' }}>
            <div className="w-3 h-3 bg-black rounded-full mr-1 opacity-90"></div>
            <div className="w-3 h-3 bg-black rounded-full opacity-90"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-100 rounded-full opacity-70 animate-ping"></div>
          </div>
        </div>
        
        <div className="absolute bottom-1/3 right-1/3 animate-player-drift z-20" style={{ animationDelay: '2.5s' }}>
          <div className="w-14 h-14 bg-gradient-to-br from-red-200 via-red-400 to-red-600 rounded-full shadow-2xl border-4 border-red-300 flex items-center justify-center" style={{ boxShadow: '0 0 25px rgba(255, 0, 0, 0.8)' }}>
            <div className="w-2.5 h-2.5 bg-black rounded-full mr-1 opacity-90"></div>
            <div className="w-2.5 h-2.5 bg-black rounded-full opacity-90"></div>
            <div className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-red-200 rounded-full opacity-70 animate-ping"></div>
          </div>
        </div>
        
        <div className="absolute top-1/3 right-20 animate-player-drift z-20" style={{ animationDelay: '4s' }}>
          <div className="w-18 h-18 bg-gradient-to-br from-green-100 via-green-300 to-green-500 rounded-full shadow-2xl border-4 border-green-200 flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(0, 255, 0, 0.8)' }}>
            <div className="w-3.5 h-3.5 bg-black rounded-full mr-1 opacity-90"></div>
            <div className="w-3.5 h-3.5 bg-black rounded-full opacity-90"></div>
            <div className="absolute -top-2 -right-2 w-4.5 h-4.5 bg-green-100 rounded-full opacity-70 animate-ping"></div>
          </div>
        </div>

        {/* Additional Player Circles for More Life */}
        <div className="absolute bottom-20 left-1/4 animate-player-drift z-20" style={{ animationDelay: '1.2s' }}>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-200 via-purple-400 to-purple-600 rounded-full shadow-2xl border-3 border-purple-300 flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(128, 0, 128, 0.8)' }}>
            <div className="w-2 h-2 bg-black rounded-full mr-1 opacity-90"></div>
            <div className="w-2 h-2 bg-black rounded-full opacity-90"></div>
          </div>
        </div>
        
        <div className="absolute top-16 left-1/2 animate-player-drift z-20" style={{ animationDelay: '3.7s' }}>
          <div className="w-13 h-13 bg-gradient-to-br from-orange-200 via-orange-400 to-orange-600 rounded-full shadow-2xl border-3 border-orange-300 flex items-center justify-center" style={{ boxShadow: '0 0 22px rgba(255, 165, 0, 0.8)' }}>
            <div className="w-2.5 h-2.5 bg-black rounded-full mr-1 opacity-90"></div>
            <div className="w-2.5 h-2.5 bg-black rounded-full opacity-90"></div>
          </div>
        </div>

        <div className="absolute bottom-1/2 left-20 animate-player-drift z-20" style={{ animationDelay: '5.2s' }}>
          <div className="w-11 h-11 bg-gradient-to-br from-pink-200 via-pink-400 to-pink-600 rounded-full shadow-2xl border-3 border-pink-300 flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(255, 192, 203, 0.8)' }}>
            <div className="w-2 h-2 bg-black rounded-full mr-1 opacity-90"></div>
            <div className="w-2 h-2 bg-black rounded-full opacity-90"></div>
          </div>
        </div>

        {/* Game Viruses (Spiky Obstacles) - Exact Game Match */}
        <div className="absolute top-16 right-1/3 z-20" style={{ animationDelay: '1s' }}>
          <div className="relative w-16 h-16">
            {/* Virus body with exact game gradient */}
            <div className="w-12 h-12 absolute top-2 left-2 rounded-full animate-virus-pulse" 
                 style={{ 
                   background: 'radial-gradient(circle at center, #00ff88 0%, #00cc66 70%, #009944 100%)', 
                   filter: 'drop-shadow(0 0 15px #00ff88)',
                   boxShadow: '2px 2px 8px rgba(0, 255, 136, 0.3)'
                 }}>
            </div>
            
            {/* Triangular spikes matching game positioning */}
            <div className="absolute top-0 left-1/2 w-0 h-0 transform -translate-x-1/2 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '4px solid transparent', 
                   borderRight: '4px solid transparent', 
                   borderBottom: '8px solid #00ff88',
                   filter: 'drop-shadow(0 0 3px #00ff88)'
                 }}>
            </div>
            
            <div className="absolute right-0 top-1/2 w-0 h-0 transform -translate-y-1/2 rotate-90 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '4px solid transparent', 
                   borderRight: '4px solid transparent', 
                   borderBottom: '8px solid #00ff88',
                   filter: 'drop-shadow(0 0 3px #00ff88)',
                   animationDelay: '0.2s'
                 }}>
            </div>
            
            <div className="absolute bottom-0 left-1/2 w-0 h-0 transform -translate-x-1/2 rotate-180 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '4px solid transparent', 
                   borderRight: '4px solid transparent', 
                   borderBottom: '8px solid #00ff88',
                   filter: 'drop-shadow(0 0 3px #00ff88)',
                   animationDelay: '0.4s'
                 }}>
            </div>
            
            <div className="absolute left-0 top-1/2 w-0 h-0 transform -translate-y-1/2 rotate-270 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '4px solid transparent', 
                   borderRight: '4px solid transparent', 
                   borderBottom: '8px solid #00ff88',
                   filter: 'drop-shadow(0 0 3px #00ff88)',
                   animationDelay: '0.6s'
                 }}>
            </div>
            
            {/* Additional inner spikes for game accuracy */}
            <div className="absolute top-1 right-3 w-0 h-0 transform rotate-45 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '3px solid transparent', 
                   borderRight: '3px solid transparent', 
                   borderBottom: '6px solid #00cc66',
                   filter: 'drop-shadow(0 0 2px #00ff88)',
                   animationDelay: '0.1s'
                 }}>
            </div>
            
            <div className="absolute bottom-1 left-3 w-0 h-0 transform rotate-225 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '3px solid transparent', 
                   borderRight: '3px solid transparent', 
                   borderBottom: '6px solid #00cc66',
                   filter: 'drop-shadow(0 0 2px #00ff88)',
                   animationDelay: '0.3s'
                 }}>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-20 right-20 z-20" style={{ animationDelay: '3.5s' }}>
          <div className="relative w-14 h-14">
            {/* Virus body with exact game gradient - smaller version */}
            <div className="w-10 h-10 absolute top-2 left-2 rounded-full animate-virus-pulse" 
                 style={{ 
                   background: 'radial-gradient(circle at center, #00ff88 0%, #00cc66 70%, #009944 100%)', 
                   filter: 'drop-shadow(0 0 12px #00ff88)',
                   boxShadow: '2px 2px 6px rgba(0, 255, 136, 0.3)'
                 }}>
            </div>
            
            {/* Triangular spikes - smaller version */}
            <div className="absolute top-0 left-1/2 w-0 h-0 transform -translate-x-1/2 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '3px solid transparent', 
                   borderRight: '3px solid transparent', 
                   borderBottom: '6px solid #00ff88',
                   filter: 'drop-shadow(0 0 2px #00ff88)'
                 }}>
            </div>
            
            <div className="absolute right-0 top-1/2 w-0 h-0 transform -translate-y-1/2 rotate-90 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '3px solid transparent', 
                   borderRight: '3px solid transparent', 
                   borderBottom: '6px solid #00ff88',
                   filter: 'drop-shadow(0 0 2px #00ff88)',
                   animationDelay: '0.25s'
                 }}>
            </div>
            
            <div className="absolute bottom-0 left-1/2 w-0 h-0 transform -translate-x-1/2 rotate-180 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '3px solid transparent', 
                   borderRight: '3px solid transparent', 
                   borderBottom: '6px solid #00ff88',
                   filter: 'drop-shadow(0 0 2px #00ff88)',
                   animationDelay: '0.5s'
                 }}>
            </div>
            
            <div className="absolute left-0 top-1/2 w-0 h-0 transform -translate-y-1/2 rotate-270 animate-virus-rotate" 
                 style={{ 
                   borderLeft: '3px solid transparent', 
                   borderRight: '3px solid transparent', 
                   borderBottom: '6px solid #00ff88',
                   filter: 'drop-shadow(0 0 2px #00ff88)',
                   animationDelay: '0.75s'
                 }}>
            </div>
          </div>
        </div>

        {/* Additional Virus Obstacles */}
        <div className="absolute top-1/2 left-16 animate-virus-pulse z-20" style={{ animationDelay: '2.8s' }}>
          <div className="relative w-11 h-11">
            <div className="w-11 h-11 bg-gradient-to-br from-green-200 via-green-400 to-green-600 rounded-full shadow-2xl border-3 border-green-300" style={{ boxShadow: '0 0 22px rgba(0, 255, 0, 0.7)' }}></div>
            <div className="absolute -top-1 left-1/2 w-2.5 h-3.5 bg-green-300 transform -translate-x-1/2"></div>
            <div className="absolute -right-1 top-1/2 w-3.5 h-2.5 bg-green-300 transform -translate-y-1/2"></div>
            <div className="absolute -bottom-1 left-1/2 w-2.5 h-3.5 bg-green-300 transform -translate-x-1/2"></div>
            <div className="absolute -left-1 top-1/2 w-3.5 h-2.5 bg-green-300 transform -translate-y-1/2"></div>
          </div>
        </div>

        <div className="absolute bottom-1/3 left-1/2 animate-virus-pulse z-20" style={{ animationDelay: '4.2s' }}>
          <div className="relative w-9 h-9">
            <div className="w-9 h-9 bg-gradient-to-br from-green-200 via-green-400 to-green-600 rounded-full shadow-2xl border-3 border-green-300" style={{ boxShadow: '0 0 18px rgba(0, 255, 0, 0.7)' }}></div>
            <div className="absolute -top-1 left-1/2 w-2 h-3 bg-green-300 transform -translate-x-1/2"></div>
            <div className="absolute -right-1 top-1/2 w-3 h-2 bg-green-300 transform -translate-y-1/2"></div>
            <div className="absolute -bottom-1 left-1/2 w-2 h-3 bg-green-300 transform -translate-x-1/2"></div>
            <div className="absolute -left-1 top-1/2 w-3 h-2 bg-green-300 transform -translate-y-1/2"></div>
          </div>
        </div>

        {/* Territory Grid Lines */}
        <div className="absolute inset-0 opacity-25">
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0, 245, 255, 0.6)" strokeWidth="1.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Enhanced Territory Grid Overlay */}
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="grid-bright" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 215, 0, 0.8)" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-bright)" />
          </svg>
        </div>

        {/* Capture Trail Effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-3">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70 animate-pulse-trail shadow-lg"></div>
        </div>
        
        <div className="absolute bottom-1/3 right-1/4 w-48 h-3" style={{ animationDelay: '2s' }}>
          <div className="w-full h-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent opacity-70 animate-pulse-trail shadow-lg"></div>
        </div>

        <div className="absolute top-1/2 left-1/3 w-56 h-2" style={{ animationDelay: '1.5s' }}>
          <div className="w-full h-full bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-60 animate-pulse-trail shadow-lg"></div>
        </div>
        
        <div className="absolute bottom-1/4 right-1/3 w-40 h-2" style={{ animationDelay: '3.2s' }}>
          <div className="w-full h-full bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60 animate-pulse-trail shadow-lg"></div>
        </div>

        {/* Minimap Corner Preview */}
        <div className="absolute top-16 right-16 w-24 h-24 bg-black/60 rounded-lg border border-cyan-400/30 p-2">
          <div className="relative w-full h-full bg-gray-900 rounded border border-gray-700">
            <div className="absolute top-1 left-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute inset-0 border border-red-400 rounded opacity-30"></div>
          </div>
        </div>

        {/* Floating UI Elements */}
        <div className="absolute top-1/3 left-8 animate-bounce-slow" style={{ animationDelay: '1s' }}>
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 border border-green-400/30">
            <div className="text-green-400 text-xs font-bold">+$250</div>
          </div>
        </div>
        
        <div className="absolute bottom-1/4 right-8 animate-bounce-slow" style={{ animationDelay: '3s' }}>
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 border border-yellow-400/30">
            <div className="text-yellow-400 text-xs font-bold">Streak: 5</div>
          </div>
        </div>

      </div>

      {/* Top Navigation - 64px height, sticky */}
      <header className="sticky top-0 z-50 h-16 w-full backdrop-blur-sm bg-black/80 border-b border-gray-800">
        <div className="flex justify-between items-center px-8 h-full">
          {/* Left side - Welcome message */}
          <div className="flex items-center space-x-4">
            <span className="text-white text-lg font-semibold">
              {authenticated && user 
                ? `Welcome, ${displayName || user.google?.name || user.email?.address || 'Player'}!` 
                : 'Welcome, Player!'
              }
            </span>
          </div>

          {/* Right side - Server Indicator and Navigation Icons */}
          <div className="flex items-center space-x-3">
            {/* Server Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800/60 border border-gray-700/50 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium text-sm">{currentServer}</span>
              {currentPing !== null && (
                <>
                  <span className="text-gray-400 text-xs">|</span>
                  <span className="text-gray-400 text-xs">
                    {currentPing}ms
                  </span>
                </>
              )}
            </div>
            
            {authenticated && user ? (
              <>
                <button 
                  onClick={() => setShowProfile(true)}
                  className="p-2.5 bg-gray-800/40 hover:bg-gray-700/60 rounded-lg border border-gray-700/50 transition-all duration-200 hover:border-gray-600/70 group"
                  title="Profile"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                  </svg>
                </button>
                
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2.5 bg-gray-800/40 hover:bg-gray-700/60 rounded-lg border border-gray-700/50 transition-all duration-200 hover:border-gray-600/70 group"
                  title="Settings"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="ml-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black rounded-lg font-medium transition-all duration-200 text-sm border border-yellow-500/30 hover:border-yellow-400/50"
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

      {/* Main Content - Maximally Optimized Layout */}
      <main className="flex-1 flex items-start justify-center pt-16 relative z-10">
        <div className="w-full max-w-7xl mx-auto px-6">
          
          {/* Hero Title */}
          <div className="text-center mb-4">
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-black tracking-tight mb-1">
              <span className="text-white">TURF</span>
              <span className="text-yellow-400">LOOT</span>
            </h1>
            <p className="text-gray-400 text-lg font-bold tracking-wide">
              SKILL-BASED GRID DOMINATION
            </p>
          </div>

          {/* Main Game Grid */}
          <div className="grid grid-cols-12 gap-3 max-w-5xl mx-auto">
            
            {/* LEFT COLUMN - Leaderboard & Friends */}
            <div className="col-span-12 lg:col-span-3 space-y-3">
              {/* Leaderboard */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">🏆</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Leaderboard</h3>
                  <div className="ml-auto">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Live</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {loadingLeaderboard ? (
                    <div className="text-center py-8">
                      <div className="text-2xl animate-spin mb-2">⏳</div>
                      <div className="text-gray-400 text-sm">Loading leaderboard...</div>
                    </div>
                  ) : leaderboardData.length > 0 ? (
                    leaderboardData.map((player) => (
                      <div key={player.rank} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-xl border border-gray-700/20">
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-black font-bold text-xs ${
                            player.rank === 1 ? 'bg-yellow-500' :
                            player.rank === 2 ? 'bg-gray-400' :
                            'bg-amber-600'
                          }`}>
                            {player.rank}
                          </span>
                          <span className="text-gray-300 font-medium">{player.name}</span>
                        </div>
                        <span className="text-green-400 font-bold text-sm">{player.earnings}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🏆</div>
                      <div className="text-gray-400 text-sm">No players yet</div>
                      <div className="text-gray-500 text-xs">Be the first to cash out and appear on the leaderboard!</div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    setSocialInitialTab('leaderboard')
                    setShowProfile(true)
                  }}
                  className="w-full mt-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 text-gray-300 font-medium transition-all hover:scale-105 text-sm"
                >
                  View Full Leaderboard
                </button>
              </div>

              {/* Friends */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 shadow-2xl h-[276px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-sm">👥</span>
                    </div>
                    <h3 className="text-white font-bold text-lg">Friends</h3>
                  </div>
                  <button className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">⟲ Refresh</button>
                </div>
                <div className="space-y-3">
                  {loadingFriends ? (
                    <div className="text-center py-4">
                      <div className="text-xl animate-spin mb-2">⏳</div>
                      <div className="text-gray-400 text-xs">Loading friends...</div>
                    </div>
                  ) : friendsList.length > 0 ? (
                    friendsList.map((friend) => (
                      <div key={friend.id} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-xl border border-gray-700/20">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            friend.status === 'online' ? 'bg-green-400' :
                            friend.status === 'playing' ? 'bg-yellow-400' :
                            'bg-gray-500'
                          }`}></div>
                          <span className="text-gray-300 font-medium text-sm">{friend.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 text-xs">{friend.wins} wins</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-3xl mb-2">👥</div>
                      <div className="text-gray-400 text-sm mb-1">No friends yet</div>
                      <div className="text-gray-500 text-xs">Add friends to see them here</div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    // Require authentication to add friends
                    if (!authenticated || !user) {
                      console.log('❌ User not authenticated for Add Friends - showing Privy login')
                      login()
                      return
                    }
                    
                    // Authenticated users can access friends functionality
                    setSocialInitialTab('friends')
                    setShowProfile(true)
                  }}
                  className="w-full mt-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 text-gray-300 font-medium transition-all hover:scale-105 text-sm"
                >
                  Add Friends
                </button>
              </div>
            </div>

            {/* CENTER COLUMN - Main Game Area */}
            <div className="col-span-12 lg:col-span-6 flex flex-col justify-center space-y-4">
              
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
                  {(selectedStake > 0 && selectedStake !== 'FREE') ? `JOIN GAME - $${selectedStake}` : '🤖 PRACTICE WITH BOTS'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-4">
                <button 
                  onClick={() => setShowServerBrowser(true)}
                  className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-2xl font-bold text-purple-400 transition-all hover:scale-105 text-sm"
                >
                  🌐 Server Browser
                </button>
                <button 
                  onClick={() => window.open('https://discord.gg/WbGTJPPTPs', '_blank')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white transition-all hover:scale-105 shadow-lg text-sm"
                >
                  🔗 Join Discord
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN - Wallet & Customize */}
            <div className="col-span-12 lg:col-span-3 space-y-3">
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
                    {/* Playable Character Circle with Dynamic Customization */}
                    <div className={`w-20 h-20 rounded-full player-character animate-breathe hover:animate-hover-bounce-loop transition-all duration-300 cursor-pointer shadow-lg border-2 border-cyan-300 flex items-center justify-center ${
                      playerCustomization.skin === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/30' :
                      playerCustomization.skin === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/30' :
                      playerCustomization.skin === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/30' :
                      playerCustomization.skin === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/30' :
                      playerCustomization.skin === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/30' :
                      'bg-cyan-400'
                    }`} id="player-character">
                      
                      {/* Dynamic Eyes based on equipped face */}
                      {playerCustomization.face === 'angry_eyes' ? (
                        <>
                          <div className="w-2 h-1.5 bg-black rounded-sm absolute top-5 left-6 transform rotate-12 transition-transform duration-150 ease-out" id="left-eye"></div>
                          <div className="w-2 h-1.5 bg-black rounded-sm absolute top-5 right-6 transform -rotate-12 transition-transform duration-150 ease-out" id="right-eye"></div>
                          <div className="w-4 h-1 bg-red-600 rounded absolute top-7 left-1/2 transform -translate-x-1/2"></div>
                        </>
                      ) : playerCustomization.face === 'wink_eyes' ? (
                        <>
                          <div className="w-2 h-0.5 bg-black rounded absolute top-6 left-6 transition-transform duration-150 ease-out" id="left-eye"></div>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-6 transition-transform duration-150 ease-out" id="right-eye"></div>
                          <div className="w-3 h-1 bg-pink-500 rounded-full absolute top-7 left-1/2 transform -translate-x-1/2"></div>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-6 transition-transform duration-150 ease-out" id="left-eye"></div>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-6 transition-transform duration-150 ease-out" id="right-eye"></div>
                        </>
                      )}
                      
                      {/* Legendary skin effects */}
                      {(playerCustomization.skin === 'golden_snake' || playerCustomization.skin === 'shadow_black') && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                        </>
                      )}
                    </div>

                    {/* Dynamic Hat Rendering */}
                    {playerCustomization.hat && (
                      <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${
                        playerCustomization.hat === 'crown_gold' ? 'w-8 h-6 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg border border-yellow-600' :
                        playerCustomization.hat === 'cap_baseball' ? 'w-10 h-4 bg-gradient-to-r from-red-600 to-red-500 rounded-full' :
                        playerCustomization.hat === 'helmet_space' ? 'w-14 h-8 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full border-2 border-blue-400' :
                        'w-6 h-4 bg-gray-600 rounded'
                      }`}>
                        {playerCustomization.hat === 'crown_gold' && (
                          <div className="flex justify-center">
                            <div className="w-1 h-2 bg-yellow-300 rounded-t-full mt-1"></div>
                          </div>
                        )}
                        {playerCustomization.hat === 'helmet_space' && (
                          <div className="absolute inset-2 bg-gradient-to-b from-blue-200/30 to-cyan-200/30 rounded-full"></div>
                        )}
                      </div>
                    )}

                    {/* Dynamic Trail Preview */}
                    {playerCustomization.trail && playerCustomization.trail !== 'default_sparkle' && (
                      <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        {playerCustomization.trail === 'rainbow_trail' ? (
                          <>
                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full opacity-70 animate-pulse"></div>
                            <div className="w-1 h-1 bg-yellow-400 rounded-full opacity-50 animate-pulse"></div>
                            <div className="w-0.5 h-0.5 bg-green-400 rounded-full opacity-30 animate-pulse"></div>
                          </>
                        ) : playerCustomization.trail === 'fire_trail' ? (
                          <>
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full opacity-70 animate-pulse"></div>
                            <div className="w-1 h-1 bg-red-500 rounded-full opacity-50 animate-pulse"></div>
                            <div className="w-0.5 h-0.5 bg-yellow-500 rounded-full opacity-30 animate-pulse"></div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs mb-3">Your Character</div>
                  <button 
                    onClick={() => {
                      if (!authenticated) {
                        login()
                      } else {
                        setShowCustomization(true)
                      }
                    }}
                    className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-400 font-medium transition-all hover:scale-105 text-sm"
                  >
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
        initialTab={socialInitialTab}
      />
      
      {/* Settings Modal */}
      <UserSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        user={userProfile}
      />

      {/* Customization Modal */}
      {showCustomization && (
        <CustomizationModal
          isOpen={showCustomization}
          onClose={() => setShowCustomization(false)}
          userBalance={walletBalance}
        />
      )}
      
      {/* Server Browser Modal */}
      {showServerBrowser && (
        <ServerBrowserModal
          isOpen={showServerBrowser}
          onClose={() => setShowServerBrowser(false)}
          onJoinLobby={(lobby) => {
            console.log('Joining lobby:', lobby)
            setShowServerBrowser(false)
            // Navigate to game with lobby parameters
            router.push(`/agario?roomId=${lobby.id}&mode=${lobby.mode}&fee=${lobby.entryFee}`)
          }}
        />
      )}
      
      {/* Real-time Cash-out Notifications Feed */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {cashOutNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-black/90 backdrop-blur-sm border border-green-400/30 rounded-lg p-3 max-w-sm shadow-2xl transition-all duration-500 ${
              notification.fadeOut ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'
            }`}
            style={{
              animation: notification.fadeOut ? '' : 'slideInFromRight 0.5s ease-out'
            }}
          >
            <div className="flex items-center space-x-3">
              {/* Player Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: notification.color }}
              >
                {notification.name.charAt(0).toUpperCase()}
              </div>
              
              {/* Notification Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-semibold text-sm truncate">
                    {notification.name}
                  </span>
                  <span className="text-green-400 font-bold text-sm">
                    ${notification.amount.toLocaleString()}
                  </span>
                </div>
                <div className="text-gray-300 text-xs">
                  cashed out instantly
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>📍 {notification.city}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(notification.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}