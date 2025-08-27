'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamic imports for components that might have SSR issues
const WalletManager = dynamic(() => import('../components/wallet/WalletManager'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-800 h-10 w-24 rounded"></div>
})

const UserProfile = dynamic(() => import('../components/UserProfile'), {
  ssr: false
})

const UserSettings = dynamic(() => import('../components/UserSettings'), {
  ssr: false
})

const CustomizationModal = dynamic(() => import('@/components/CustomizationModalClean'), {
  ssr: false
})

const ServerBrowserModal = dynamic(() => import('../components/ServerBrowserModal'), {
  ssr: false
})

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
  
  // Enhanced iOS Mobile Detection State - MISSING FROM LANDING PAGE!
  const [isMobile, setIsMobile] = useState(false)
  const [showOrientationGate, setShowOrientationGate] = useState(false)
  const [pendingGameEntry, setPendingGameEntry] = useState(null)
  const [showMobileLobby, setShowMobileLobby] = useState(false)

  // Available regions for the dropdown with real-time ping measurement
  const availableRegions = [
    { id: 'US-East-1', name: 'US East (Virginia)', ping: null, endpoint: 'https://www.google.com/generate_204' },
    { id: 'US-West-1', name: 'US West (California)', ping: null, endpoint: 'https://www.google.com/generate_204' },
    { id: 'EU-Central-1', name: 'Europe (Frankfurt)', ping: null, endpoint: 'https://www.google.de/generate_204' },
    { id: 'Oceania-1', name: 'Oceania (Sydney)', ping: null, endpoint: 'https://www.google.com.au/generate_204' }
  ]

  const [regionPings, setRegionPings] = useState({})
  const [isLoadingPings, setIsLoadingPings] = useState(false)

  // Measure real-time ping to a server
  const measurePing = async (regionId, endpoint) => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return getEstimatedLatencyOffset(regionId)
    }
    
    try {
      const startTime = performance.now()
      
      // Try to ping the actual server endpoint first
      try {
        const response = await fetch(endpoint, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        })
        const endTime = performance.now()
        const ping = Math.round(endTime - startTime)
        return ping
      } catch (serverError) {
        // If server endpoint fails, fallback to measuring ping to our current server
        console.log(`❌ Cannot reach ${regionId} server, using fallback measurement`)
        const fallbackStartTime = performance.now()
        await fetch('/api/ping', { method: 'GET', cache: 'no-store' })
        const fallbackEndTime = performance.now()
        
        // Add estimated latency based on geographic distance
        const basePing = Math.round(fallbackEndTime - fallbackStartTime)
        const estimatedPing = basePing + getEstimatedLatencyOffset(regionId)
        return estimatedPing
      }
    } catch (error) {
      console.error(`❌ Failed to measure ping for ${regionId}:`, error)
      return getEstimatedLatencyOffset(regionId) // Fallback to estimated values
    }
  }

  // Get estimated latency offset based on geographic distance
  const getEstimatedLatencyOffset = (regionId) => {
    switch (regionId) {
      case 'US-East-1': return 27
      case 'US-West-1': return 42
      case 'EU-Central-1': return 89
      case 'Oceania-1': return 165 // Sydney is typically 150-180ms from most locations
      default: return 50
    }
  }

  // Measure ping to all regions
  const measureAllPings = async () => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return
    }
    
    if (isLoadingPings) return
    
    setIsLoadingPings(true)
    console.log('🌍 Measuring ping to all regions...')
    
    const pingPromises = availableRegions.map(async (region) => {
      const ping = await measurePing(region.id, region.endpoint)
      return { regionId: region.id, ping }
    })

    try {
      const results = await Promise.all(pingPromises)
      const newPings = {}
      
      results.forEach(({ regionId, ping }) => {
        newPings[regionId] = ping
        console.log(`📡 ${regionId}: ${ping}ms`)
      })
      
      setRegionPings(newPings)
      
      // Update current server ping if it's in the results
      if (newPings[currentServer]) {
        setCurrentPing(newPings[currentServer])
      }
    } catch (error) {
      console.error('❌ Failed to measure some pings:', error)
    } finally {
      setIsLoadingPings(false)
    }
  }

  // Measure pings on component mount and periodically
  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return
    }
    
    measureAllPings()
    
    // Refresh pings every 30 seconds
    const pingInterval = setInterval(measureAllPings, 30000)
    
    return () => clearInterval(pingInterval)
  }, [])

  // Region selection handler
  const handleRegionSelect = (regionId) => {
    setCurrentServer(regionId)
    
    // Use real-time ping if available, otherwise use estimated value
    const realPing = regionPings[regionId]
    const estimatedPing = getEstimatedLatencyOffset(regionId)
    const pingToUse = realPing !== undefined ? realPing : estimatedPing
    
    setCurrentPing(pingToUse)
    setShowRegionDropdown(false)
    
    console.log(`🌍 Region changed to: ${regionId} (${pingToUse}ms)`)
    
    // Re-measure ping for the selected region immediately
    measurePing(regionId, availableRegions.find(r => r.id === regionId)?.endpoint)
      .then(newPing => {
        setCurrentPing(newPing)
        setRegionPings(prev => ({ ...prev, [regionId]: newPing }))
        console.log(`📡 Updated ping for ${regionId}: ${newPing}ms`)
      })
      .catch(error => console.error(`❌ Failed to update ping for ${regionId}:`, error))
  }

  // Lobby management functions
  const createLobby = async (roomType = '$5') => {
    try {
      console.log('🏰 Creating lobby for room type:', roomType)
      
      const response = await fetch('/api/lobby/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.id || userProfile?.privyId,
          userName: displayName || 'Player',
          userBalance: userBalance,
          roomType
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setCurrentLobby(data.lobby)
        setLobbyMembers(data.lobby.members)
        console.log('✅ Lobby created successfully:', data.lobby.id)
        
        // Refresh lobby status
        fetchLobbyStatus()
      } else {
        console.error('❌ Failed to create lobby:', data.error)
        alert(`Failed to create lobby: ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Create lobby error:', error)
      alert('Failed to create lobby. Please try again.')
    }
  }

  const joinLobby = async (lobbyId) => {
    try {
      console.log('🚪 Joining lobby:', lobbyId)
      
      const response = await fetch('/api/lobby/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId,
          userId: userProfile?.id || userProfile?.privyId,
          userName: displayName || 'Player',
          userBalance: userBalance
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setCurrentLobby(data.lobby)
        setLobbyMembers(data.lobby.members)
        console.log('✅ Joined lobby successfully:', lobbyId)
        
        // Remove accepted invite from pending invites
        setLobbyInvites(prev => prev.filter(invite => invite.lobbyId !== lobbyId))
        
        // Refresh lobby status
        fetchLobbyStatus()
      } else {
        console.error('❌ Failed to join lobby:', data.error)
        alert(`Failed to join lobby: ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Join lobby error:', error)
      alert('Failed to join lobby. Please try again.')
    }
  }

  const inviteFriend = async (friendId, friendName) => {
    try {
      if (!currentLobby) {
        alert('Please create a lobby first')
        return
      }
      
      console.log('📧 Inviting friend to lobby:', friendId)
      
      const response = await fetch('/api/lobby/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId: currentLobby.id,
          fromUserId: userProfile?.id || userProfile?.privyId,
          fromUserName: displayName || 'Player',
          toUserId: friendId,
          roomType: currentLobby.roomType
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ Invite sent successfully:', data.invite.id)
        alert(`Invite sent to ${friendName}`)
      } else {
        console.error('❌ Failed to send invite:', data.error)
        alert(`Failed to send invite: ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Send invite error:', error)
      alert('Failed to send invite. Please try again.')
    }
  }

  const validateRoomAccess = async (roomType, memberIds) => {
    try {
      const response = await fetch(`/api/lobby/validate-room?roomType=${roomType}&memberIds=${memberIds.join(',')}`)
      const data = await response.json()
      
      if (response.ok) {
        return data
      } else {
        console.error('❌ Room validation failed:', data.error)
        return { canProceed: false, error: data.error }
      }
    } catch (error) {
      console.error('❌ Room validation error:', error)
      return { canProceed: false, error: 'Validation failed' }
    }
  }

  const fetchLobbyStatus = async () => {
    try {
      if (!userProfile?.id && !userProfile?.privyId) return
      
      const response = await fetch(`/api/lobby/status?userId=${userProfile?.id || userProfile?.privyId}`)
      const data = await response.json()
      
      if (response.ok) {
        setCurrentLobby(data.currentLobby)
        if (data.currentLobby) {
          setLobbyMembers(data.currentLobby.members)
        }
        setLobbyInvites(data.pendingInvites || [])
      }
    } catch (error) {
      console.error('❌ Fetch lobby status error:', error)
    }
  }

  const leaveLobby = async () => {
    try {
      if (!currentLobby) return
      
      // TODO: Add leave lobby API endpoint
      setCurrentLobby(null)
      setLobbyMembers([])
      console.log('👋 Left lobby')
    } catch (error) {
      console.error('❌ Leave lobby error:', error)
    }
  }

  // Fetch lobby status on component mount and when user changes
  useEffect(() => {
    if (userProfile && (userProfile.id || userProfile.privyId)) {
      fetchLobbyStatus()
    }
  }, [userProfile])
  
  const [showMobileRegionDropdown, setShowMobileRegionDropdown] = useState(false)
  const [showMobileFriendsLobby, setShowMobileFriendsLobby] = useState(false)

  // TEMPORARY: Force mobile mode for testing - REMOVE AFTER VERIFICATION
  const [forceMobileMode, setForceMobileMode] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState([])
  const [playerCustomization, setPlayerCustomization] = useState({
    skin: 'default_blue'
  })
  const [userBalance, setUserBalance] = useState(0) // Start at 0 for new accounts
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [socialInitialTab, setSocialInitialTab] = useState('leaderboard')
  const [friendsList, setFriendsList] = useState([])
  const [lobbyMembers, setLobbyMembers] = useState([])
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
  // Safe Privy authentication using context access
  const [isClient, setIsClient] = useState(false)
  const [privyReady, setPrivyReady] = useState(false)
  const [privyAuth, setPrivyAuth] = useState({
    login: () => console.log('Login not available yet'),
    ready: false,
    authenticated: false,
    user: null,
    logout: () => console.log('Logout not available yet')
  })

  // Initialize client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Access Privy through React Context after hydration
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const initializePrivy = async () => {
        try {
          // Wait for Privy provider to be ready
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Access Privy through the React context that's already provided
          // We'll use a more direct approach by accessing the provider
          
          // Try to access Privy from the window object or context
          let privyInstance = null
          
          // Check if Privy is available globally
          if (window.privy) {
            privyInstance = window.privy
            console.log('✅ Found Privy on window object')
          } else if (window.__PRIVY_CLIENT__) {
            privyInstance = window.__PRIVY_CLIENT__
            console.log('✅ Found Privy client on window object')
          } else {
            // Fallback: Import Privy and setup manual integration
            const { usePrivy } = await import('@privy-io/react-auth')
            console.log('✅ Imported Privy module successfully')
            
            // Since we can't use hooks in useEffect, we'll create a bridge
            // Set up a more sophisticated login mechanism
            setPrivyAuth(prev => ({
              ...prev,
              ready: true,
              login: async () => {
                console.log('🔑 Triggering manual Privy login integration...')
                
                try {
                  // Try to access the Privy provider directly through DOM
                  const privyElements = document.querySelectorAll('[data-privy-app-id]')
                  if (privyElements.length > 0) {
                    console.log('✅ Found Privy provider elements')
                    
                    // Trigger a custom event that the provider can listen to
                    const loginEvent = new CustomEvent('privy-manual-login', {
                      detail: { 
                        source: 'turfloot',
                        timestamp: Date.now(),
                        method: 'manual-trigger'
                      }
                    })
                    document.dispatchEvent(loginEvent)
                    
                    // Also try window-level event
                    if (window.dispatchEvent) {
                      window.dispatchEvent(loginEvent)
                    }
                    
                    console.log('✅ Privy login events dispatched')
                  } else {
                    console.log('⚠️ No Privy elements found - using fallback')
                    alert('Authentication system is initializing. Please try again in a moment.')
                  }
                } catch (error) {
                  console.error('❌ Manual login error:', error)
                  alert('Login temporarily unavailable. Please refresh and try again.')
                }
              }
            }))
            
            return
          }
          
          // If we found a Privy instance, use it
          if (privyInstance && typeof privyInstance.login === 'function') {
            setPrivyAuth({
              login: privyInstance.login.bind(privyInstance),
              ready: true,
              authenticated: privyInstance.authenticated || false,
              user: privyInstance.user || null,
              logout: privyInstance.logout?.bind(privyInstance) || (() => console.log('Logout not available'))
            })
            console.log('✅ Privy instance integrated successfully')
          }
          
        } catch (error) {
          console.warn('⚠️ Privy initialization error:', error)
          // Set ready anyway so the page can function
          setPrivyAuth(prev => ({ 
            ...prev, 
            ready: true,
            login: () => alert('Authentication is currently unavailable. Please refresh the page.')
          }))
        }
        
        setPrivyReady(true)
      }
      
      initializePrivy()
    }
  }, [isClient])

  const { login, ready, authenticated, user, logout } = privyAuth
  const router = useRouter()

  // Essential state declarations - moved to top to prevent hoisting issues
  const [pagesGenerated, setPagesGenerated] = useState(847)
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [showLobby, setShowLobby] = useState(false)

  // Close dropdown when clicking outside - moved here after state declarations
  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return
    }
    
    const handleClickOutside = (event) => {
      if (showRegionDropdown && !event.target.closest('.region-dropdown-container')) {
        setShowRegionDropdown(false)
      }
      if (showLobby && !event.target.closest('.lobby-dropdown-container')) {
        setShowLobby(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showRegionDropdown, showLobby])


  // Debug Privy state
  useEffect(() => {
    console.log('🔍 Privy Debug Info:', {
      ready: ready,
      authenticated: authenticated,
      user: user ? 'Present' : 'None',
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ? 'Set' : 'Missing'
    })
    
    if (process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      console.log('✅ Privy App ID configured:', process.env.NEXT_PUBLIC_PRIVY_APP_ID.substring(0, 10) + '...')
    } else {
      console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is missing!')
    }
  }, [ready, authenticated, user])

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
      
      // Realistic cash-out amounts based on lobby tiers ($1, $5, $20, $50, $100)
      const lobbyTiers = [
        { base: 1, multiplier: 0.5, max: 3 },     // $1 lobby: $0.50 - $3.00
        { base: 5, multiplier: 0.8, max: 12 },    // $5 lobby: $4.00 - $12.00  
        { base: 20, multiplier: 1.2, max: 45 },   // $20 lobby: $24.00 - $45.00
        { base: 50, multiplier: 1.5, max: 95 },   // $50 lobby: $75.00 - $95.00
        { base: 100, multiplier: 1.8, max: 185 }  // $100 lobby: $180.00 - $185.00
      ]
      
      const selectedTier = lobbyTiers[Math.floor(Math.random() * lobbyTiers.length)]
      const amount = Math.floor(
        (selectedTier.base * selectedTier.multiplier) + 
        (Math.random() * (selectedTier.max - (selectedTier.base * selectedTier.multiplier)))
      )
      
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

  // Load user's coin balance from database
  const loadUserBalance = async () => {
    try {
      const response = await fetch('/api/users/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo-user' // In real implementation, get from auth
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setUserBalance(result.balance || 0)
        console.log(`💰 Loaded user balance on landing page: ${result.balance || 0} coins`)
      }
    } catch (error) {
      console.error('❌ Error loading user balance:', error)
      // Keep default balance of 0 if API fails
    }
  }

  // Load player customization data
  useEffect(() => {
    const loadCustomization = () => {
      try {
        const saved = localStorage.getItem('turfloot_player_customization')
        if (saved) {
          const customizationData = JSON.parse(saved)
          setPlayerCustomization({
            skin: customizationData.skin || 'default_blue'
          })
          console.log('Lobby: Loaded player customization:', customizationData)
        }
      } catch (error) {
        console.error('Failed to load customization:', error)
        // Reset to defaults if there's an error
        setPlayerCustomization({
          skin: 'default_blue'
        })
      }
    }

    // Initial load
    loadCustomization()
    
    // Reload balance when customization modal opens to ensure fresh data
    if (showCustomization) {
      console.log('🎨 Customization modal opened - refreshing balance')
      loadUserBalance()
    }

    // Listen for customization changes from the modal
    const handleCustomizationChange = (event) => {
      console.log('Lobby: Customization changed:', event.detail)
      setPlayerCustomization({
        skin: event.detail.skin || 'default_blue'
      })
    }

    window.addEventListener('playerCustomizationChanged', handleCustomizationChange)

    return () => {
      window.removeEventListener('playerCustomizationChanged', handleCustomizationChange)
    }
  }, [showCustomization]) // Also reload when customization modal opens/closes

  // Load user balance when component mounts
  useEffect(() => {
    loadUserBalance()
    
    // Listen for mission completion events to update balance in real-time
    const handleMissionComplete = (event) => {
      const { rewardAmount, newBalance } = event.detail
      console.log(`🎯 Mission completed! Earned ${rewardAmount} coins. New balance: ${newBalance}`)
      setUserBalance(newBalance)
    }
    
    window.addEventListener('missionRewardEarned', handleMissionComplete)
    
    return () => {
      window.removeEventListener('missionRewardEarned', handleMissionComplete)
    }
  }, [])

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

  // BULLETPROOF iOS Mobile Detection - GUARANTEED TO WORK
  useEffect(() => {
    const detectMobileDevice = () => {
      // Simplified Mobile Detection
      const userAgent = navigator.userAgent
      const viewportWidth = window.innerWidth
      
      // Basic mobile detection
      const isMobileUserAgent = /Mobi|Android/i.test(userAgent)
      const isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isNarrowViewport = viewportWidth <= 768
      
      // Simple mobile detection
      const isMobileDevice = isMobileUserAgent || isTouchCapable || isNarrowViewport

      console.log('📱 Mobile Detection:', {
        viewportWidth,
        isMobile: isMobileDevice
      })

      setIsMobile(isMobileDevice)
    }
    
    // Run detection once
    detectMobileDevice()
    
    window.addEventListener('resize', detectMobileDevice)
    window.addEventListener('orientationchange', detectMobileDevice)
    
    return () => {
      window.removeEventListener('resize', detectMobileDevice)
      window.removeEventListener('orientationchange', detectMobileDevice)
    }
  }, [])

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
          
          // Process leaderboard data for display with null checks
          if (leaderboardData && leaderboardData.users && Array.isArray(leaderboardData.users)) {
            const processedLeaderboard = leaderboardData.users.slice(0, 3).map((user, index) => ({
              rank: index + 1,
              name: user.custom_name || user.email?.split('@')[0] || `Player${user.id?.slice(-4)}`,
              earnings: `$${(user.stats?.total_earnings || 0).toFixed(2)}`
            }))
            
            setLeaderboardData(processedLeaderboard)
          } else {
            console.log('⚠️ Invalid leaderboard data structure')
            setLeaderboardData([])
          }
        } else {
          console.log('⚠️ No leaderboard data available')
          setLeaderboardData([])
        }

        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json()
          console.log('👥 Friends data received:', friendsData)
          
          // Process friends data for display with null checks
          if (friendsData && friendsData.friends && Array.isArray(friendsData.friends)) {
            const processedFriends = friendsData.friends.slice(0, 3).map((friend) => ({
              id: friend.id,
              name: friend.custom_name || friend.email?.split('@')[0] || `Player${friend.id?.slice(-4)}`,
              status: friend.online_status || 'offline',
              wins: friend.stats?.games_won || 0
            }))
            
            setFriendsList(processedFriends)
          } else {
            console.log('⚠️ Invalid friends data structure')
            setFriendsList([])
          }
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
        setDisplayName('Preparing your turf...')
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



  const handleLoginClick = async () => {
    console.log('🔑 Login button clicked')
    console.log('🔍 State:', { ready, authenticated, user: !!user })
    
    if (authenticated) {
      console.log('✅ User already authenticated')
      return
    }
    
    if (!ready) {
      console.log('⏳ Privy not ready yet, waiting...')
      return
    }
    
    try {
      console.log('🚀 Triggering Privy login')
      await login()
      console.log('✅ Login initiated successfully')
    } catch (error) {
      console.error('❌ Login error:', error)
      alert('Authentication unavailable. Please try again.')
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
    
    // Check mobile orientation before game entry
    if (isMobile) {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const isCurrentlyLandscape = viewportWidth > viewportHeight
      
      if (!isCurrentlyLandscape) {
        console.log('📱 Mobile user in portrait mode - showing orientation gate')
        
        // Store the pending game entry details
        setPendingGameEntry({
          stake: selectedStake,
          mode: selectedStake === 'FREE' || selectedStake === 0 ? 'free' : 'cash',
          fee: selectedStake === 'FREE' || selectedStake === 0 ? 0 : parseInt(selectedStake.toString().replace('$', ''))
        })
        
        // Show orientation gate
        setShowOrientationGate(true)
        return
      }
    }
    
    // Proceed with normal game entry logic
    proceedToGame()
  }

  const proceedToGame = () => {
    const gameStake = pendingGameEntry?.stake || selectedStake
    const gameMode = pendingGameEntry?.mode || (selectedStake === 'FREE' || selectedStake === 0 ? 'free' : 'cash')
    const gameFee = pendingGameEntry?.fee || (selectedStake === 'FREE' || selectedStake === 0 ? 0 : parseInt(selectedStake.toString().replace('$', '')))
    
    console.log('🎮 Proceeding to game:', { gameStake, gameMode, gameFee })
    
    // For FREE games - route to Agario clone (with authentication)
    if (gameStake === 'FREE' || gameStake === 0) {
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
    const fee = gameFee
    const roomId = 'lobby'
    
    console.log('💰 Routing to cash game with auth:', { mode, fee, roomId })
    router.push(`/play?mode=${mode}&room=${roomId}&fee=${fee}`)
  }

  const handleOrientationReady = () => {
    console.log('✅ Mobile device ready in landscape - proceeding to game')
    setShowOrientationGate(false)
    proceedToGame()
    // Clear pending game entry
    setPendingGameEntry(null)
  }

  // Show loading state during initial client-side hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">TurfLoot</h1>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white relative flex flex-col bg-black" style={{ background: 'linear-gradient(to bottom right, rgb(0, 0, 0), rgb(17, 24, 39), rgb(0, 0, 0))' }}>
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

      {/* Top Navigation - Enhanced Mobile Layout */}
      <header className="sticky top-0 z-50 h-auto min-h-[64px] w-full backdrop-blur-sm bg-black/90 border-b border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-8 py-2 sm:py-0 sm:h-16">
          {/* Top Row on Mobile - Welcome message */}
          <div className="flex items-center space-x-4 w-full sm:w-auto mb-2 sm:mb-0">
            <span className="text-white text-base sm:text-lg font-semibold truncate">
              {authenticated && user 
                ? `Welcome, ${displayName || user.google?.name || user.email?.address || 'Player'}!` 
                : 'Welcome, Player!'
              }
            </span>
          </div>

          {/* Bottom Row on Mobile - Coins, Server, Actions */}
          <div className="flex items-center justify-between w-full sm:w-auto space-x-2 sm:space-x-3">
            {/* Coins Display - Redesigned */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg hover:bg-gray-700/80 transition-all duration-200 group">
              <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H11.5v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.65c.1 1.7 1.36 2.66 2.85 2.97V19h1.71v-1.69c1.48-.3 2.72-1.26 2.72-2.84 0-2.27-1.59-2.96-3.62-3.33z"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-yellow-400 font-medium leading-none">COINS</span>
                <span className="text-white font-bold text-sm leading-none">{userBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* Server Indicator - Redesigned with Region Dropdown */}
            <div className="relative region-dropdown-container">
              <button 
                onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg hover:bg-gray-700/80 transition-all duration-200 group cursor-pointer"
                title="Click to change region"
              >
                <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30 group-hover:bg-green-500/30 transition-all duration-200">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-green-400 font-medium text-xs leading-none hidden sm:inline group-hover:text-green-300 transition-colors duration-200">{currentServer}</span>
                  <span className="text-green-400 font-medium text-xs leading-none sm:hidden group-hover:text-green-300 transition-colors duration-200">
                    {currentServer.split('-')[0]}
                  </span>
                  {currentPing !== null && (
                    <span className="text-gray-400 text-xs leading-none group-hover:text-gray-300 transition-colors duration-200">
                      {currentPing}ms
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-3 h-3 text-gray-400 group-hover:text-gray-300 transition-all duration-200 ${showRegionDropdown ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* LOBBY BUTTON - Added right after region selector */}
              <button 
                onClick={() => {
                  console.log('🏰 Lobby button clicked!')
                  if (authenticated && user) {
                    setShowLobby(!showLobby)
                  } else {
                    alert('Please log in to use Party Lobby feature')
                  }
                }}
                className="absolute left-0 top-16 w-10 h-10 bg-orange-600 border border-orange-500 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center z-50"
                title="🏰 LOBBY BUTTON TEST"
              >
                <div className="text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </button>

              {/* Region Dropdown */}
              {showRegionDropdown && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-gray-800/95 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-700/50">
                    <h3 className="text-white font-bold text-sm">Select Region</h3>
                    <p className="text-gray-400 text-xs">Choose your preferred server region</p>
                  </div>
                  <div className="py-2">
                    {availableRegions.map((region) => {
                      const realPing = regionPings[region.id]
                      const estimatedPing = getEstimatedLatencyOffset(region.id)
                      const displayPing = realPing !== undefined ? realPing : estimatedPing
                      const isLoadingThisPing = isLoadingPings && realPing === undefined
                      
                      return (
                        <button
                          key={region.id}
                          onClick={() => handleRegionSelect(region.id)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-700/60 transition-all duration-200 flex items-center justify-between group ${
                            currentServer === region.id ? 'bg-green-500/20 border-l-4 border-green-500' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              currentServer === region.id ? 'bg-green-400' : 'bg-gray-500'
                            }`}></div>
                            <div>
                              <div className={`font-medium text-sm ${
                                currentServer === region.id ? 'text-green-400' : 'text-white group-hover:text-green-300'
                              }`}>
                                {region.id}
                              </div>
                              <div className="text-gray-400 text-xs">{region.name}</div>
                            </div>
                          </div>
                          <div className={`text-xs font-bold flex items-center space-x-1 ${
                            currentServer === region.id ? 'text-green-400' : 'text-gray-400 group-hover:text-green-300'
                          }`}>
                            {isLoadingThisPing ? (
                              <>
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                                <span>...</span>
                              </>
                            ) : (
                              <>
                                <span>{displayPing}ms</span>
                                {realPing !== undefined && (
                                  <div className="w-1 h-1 bg-green-400 rounded-full" title="Real-time ping"></div>
                                )}
                              </>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="p-3 border-t border-gray-700/50 bg-gray-800/60">
                    <button
                      onClick={() => setShowServerBrowser(true)}
                      className="w-full py-2 px-3 bg-gray-700/60 hover:bg-gray-600/80 rounded-lg text-gray-300 hover:text-white text-xs font-medium transition-all duration-200"
                    >
                      Advanced Server Browser
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Lobby Dropdown */}
            {showLobby && authenticated && user && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800/95 backdrop-blur-sm border border-orange-500/40 rounded-xl shadow-2xl z-50 overflow-hidden lobby-dropdown-container">
                <div className="p-4 border-b border-orange-500/30 bg-gradient-to-r from-orange-600/20 to-orange-700/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">Party Lobby</h3>
                      <p className="text-orange-200 text-xs">Invite friends and join paid rooms together</p>
                    </div>
                    <button 
                      onClick={() => setShowLobby(false)}
                      className="ml-auto w-6 h-6 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {!currentLobby ? (
                  /* Create/Join Lobby Section */
                  <div className="p-4 space-y-4">
                    {/* Pending Invites */}
                    {lobbyInvites.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>Pending Invites ({lobbyInvites.length})</span>
                        </h4>
                        {lobbyInvites.slice(0, 3).map((invite, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-sm">
                                {invite.fromUserName.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-white font-medium text-sm">{invite.fromUserName}</div>
                                <div className="text-gray-400 text-xs">{invite.roomType} room</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => joinLobby(invite.lobbyId)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => setLobbyInvites(prev => prev.filter((_, i) => i !== index))}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Create New Lobby */}
                    <button 
                      onClick={() => createLobby('$5')}
                      className="w-full p-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 rounded-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-white font-semibold">Create New Party</span>
                      </div>
                      <div className="text-orange-200 text-xs mt-1">Start a lobby and invite friends</div>
                    </button>

                    {/* Quick Play Options */}
                    <div className="space-y-2">
                      <h4 className="text-white font-semibold text-sm">Quick Play</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { amount: '$1', fee: 1, color: 'green' },
                          { amount: '$5', fee: 5, color: 'blue' },
                          { amount: '$20', fee: 20, color: 'purple' },
                          { amount: '$50', fee: 50, color: 'red' }
                        ].map((room) => (
                          <button 
                            key={room.amount}
                            onClick={() => {
                              if (userBalance >= room.fee) {
                                // Navigate to solo play - TODO: implement navigation
                                alert(`Starting ${room.amount} solo game!`)
                              } else {
                                alert(`Insufficient balance. You need ${room.amount} to play.`)
                              }
                            }}
                            disabled={userBalance < room.fee}
                            className={`p-3 ${
                              userBalance >= room.fee 
                                ? `bg-${room.color}-600/20 border border-${room.color}-500/40 hover:bg-${room.color}-600/30` 
                                : 'bg-gray-600/20 border border-gray-500/40 opacity-50 cursor-not-allowed'
                            } rounded-lg transition-all duration-200 group`}
                          >
                            <div className={`${
                              userBalance >= room.fee ? `text-${room.color}-400` : 'text-gray-500'
                            } font-bold text-sm`}>
                              {room.amount}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {userBalance >= room.fee ? 'Solo Play' : 'Insufficient funds'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active Lobby Section */
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold text-sm">Active Party</h4>
                      <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-medium">
                        {lobbyMembers.length} members
                      </div>
                    </div>

                    {/* Lobby Members */}
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {lobbyMembers.map((member, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded-lg">
                          <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-sm">
                            {member.userName.substring(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-medium text-sm">{member.userName}</div>
                            <div className="text-gray-400 text-xs">Balance: ${member.balance || 0}</div>
                          </div>
                          {member.isLeader && (
                            <div className="text-yellow-400 text-xs font-medium">Leader</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Invite Friends */}
                    <button 
                      onClick={() => {
                        // TODO: Open friends selection modal
                        alert('Friends invite feature coming soon!')
                      }}
                      className="w-full p-3 border border-orange-500/40 hover:bg-orange-500/10 text-orange-400 hover:text-orange-300 rounded-lg transition-all duration-200 text-sm font-medium"
                    >
                      + Invite Friends
                    </button>

                    {/* Room Selection */}
                    <div className="space-y-2">
                      <h4 className="text-white font-semibold text-sm">Select Room</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { amount: '$1', fee: 1, color: 'green' },
                          { amount: '$5', fee: 5, color: 'blue' },
                          { amount: '$20', fee: 20, color: 'purple' },
                          { amount: '$50', fee: 50, color: 'red' }
                        ].map((room) => {
                          const memberIds = lobbyMembers.map(m => m.userId)
                          return (
                            <button 
                              key={room.amount}
                              onClick={async () => {
                                const validation = await validateRoomAccess(room.amount, memberIds)
                                if (validation.canProceed) {
                                  alert(`All members can afford ${room.amount}. Starting game!`)
                                  // TODO: Start game with lobby
                                } else {
                                  const insufficient = validation.insufficientFunds?.map(m => m.username).join(', ')
                                  alert(`Cannot proceed: ${insufficient} cannot afford ${room.amount}`)
                                }
                              }}
                              className={`p-3 bg-${room.color}-600/20 border border-${room.color}-500/40 hover:bg-${room.color}-600/30 rounded-lg transition-all duration-200`}
                            >
                              <div className={`text-${room.color}-400 font-bold text-sm`}>{room.amount}</div>
                              <div className="text-gray-400 text-xs">Entry Fee</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Party Actions */}
                    <div className="flex space-x-2 pt-2 border-t border-gray-700/50">
                      <button 
                        onClick={leaveLobby}
                        className="flex-1 px-4 py-2 bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 text-sm font-medium"
                      >
                        Leave Party
                      </button>
                      <button 
                        onClick={async () => {
                          const memberIds = lobbyMembers.map(m => m.userId)
                          const validation = await validateRoomAccess(currentLobby.roomType, memberIds)
                          if (validation.canProceed) {
                            alert(`Starting ${currentLobby.roomType} game with ${lobbyMembers.length} players!`)
                            // TODO: Start game
                          } else {
                            const insufficient = validation.insufficientFunds?.map(m => m.username).join(', ')
                            alert(`Cannot start: ${insufficient} cannot afford ${currentLobby.roomType}`)
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 text-sm font-medium"
                      >
                        Start Game
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* PARTY LOBBY BUTTON - Added at top level navigation */}
            <div className="relative">
              <button 
                onClick={() => {
                  console.log('🏰 Desktop Lobby button clicked!')
                  if (authenticated && user) {
                    setShowLobby(!showLobby)
                  } else {
                    alert('Please log in to use Party Lobby feature and team up with friends!')
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-2 backdrop-blur-sm border rounded-xl shadow-lg transition-all duration-200 group cursor-pointer ${
                  authenticated && user 
                    ? 'bg-gradient-to-r from-orange-600/90 to-orange-700/90 border-orange-500/60 hover:from-orange-500/90 hover:to-orange-600/90'
                    : 'bg-gray-600/50 border-gray-500/50 hover:bg-gray-500/60'
                }`}
                title={authenticated && user ? "Party Lobby" : "Party Lobby (Login Required)"}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all duration-200 ${
                  authenticated && user
                    ? 'bg-orange-500/20 border-orange-500/30 group-hover:bg-orange-500/30'
                    : 'bg-gray-500/20 border-gray-500/30 group-hover:bg-gray-500/30'
                }`}>
                  <svg className={`w-4 h-4 transition-colors duration-200 ${
                    authenticated && user
                      ? 'text-orange-400 group-hover:text-orange-300'
                      : 'text-gray-400 group-hover:text-gray-300'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                
                <div className="flex flex-col">
                  <span className={`font-medium text-xs leading-none transition-colors duration-200 ${
                    authenticated && user
                      ? 'text-orange-400 group-hover:text-orange-300'
                      : 'text-gray-400 group-hover:text-gray-300'
                  }`}>
                    {authenticated && user ? 'Party' : 'Party'}
                  </span>
                  <span className="text-gray-400 text-xs leading-none">
                    {authenticated && user ? 'Lobby' : 'Login'}
                  </span>
                </div>
                
                {/* Active lobby indicator - only for authenticated users */}
                {authenticated && user && currentLobby && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full animate-pulse"></div>
                )}
                
                {/* Pending invites indicator - only for authenticated users */}
                {authenticated && user && lobbyInvites.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-gray-900 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {lobbyInvites.length}
                  </div>
                )}
                
                {/* Lock icon for non-authenticated users */}
                {!authenticated && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center space-x-2">
              {/* DEBUG: Always visible lobby button for testing */}
              <button 
                onClick={() => {
                  console.log('🏰 Lobby button clicked!')
                  if (authenticated && user) {
                    setShowLobby(!showLobby)
                  } else {
                    alert('Please log in to use Party Lobby feature')
                  }
                }}
                className="relative w-10 h-10 bg-orange-600/90 border border-orange-500/60 rounded-xl shadow-lg transition-all duration-200 group flex items-center justify-center"
                title="Party Lobby (Always Visible)"
                style={{ zIndex: 50 }}
              >
                <div className="text-orange-100 group-hover:text-white transition-colors duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </button>
              
              {/* Profile Button - Redesigned */}
              {authenticated && user ? (
                <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowProfile(true)}
                  className="w-10 h-10 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg hover:bg-gray-700/80 transition-all duration-200 group flex items-center justify-center"
                  title="Profile & Social"
                >
                  <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <svg className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </button>
                
                {/* LOBBY BUTTON - Added to main authenticated navigation */}
                <button 
                  onClick={() => {
                    console.log('🏰 Desktop Lobby button clicked!')
                    setShowLobby(!showLobby)
                  }}
                  className="relative w-10 h-10 bg-gradient-to-br from-orange-600/90 to-orange-700/90 backdrop-blur-sm border border-orange-500/60 rounded-xl shadow-lg hover:from-orange-500/90 hover:to-orange-600/90 transition-all duration-200 group flex items-center justify-center"
                  title="Party Lobby"
                >
                  <div className="text-orange-100 group-hover:text-white transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  
                  {/* Active lobby indicator */}
                  {currentLobby && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full animate-pulse"></div>
                  )}
                  
                  {/* Pending invites indicator */}
                  {lobbyInvites.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-gray-900 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {lobbyInvites.length}
                    </div>
                  )}
                </button>
                
                {/* Settings Button - Redesigned */}
                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-10 h-10 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg hover:bg-gray-700/80 transition-all duration-200 group flex items-center justify-center"
                  title="Settings"
                >
                  <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                    <svg className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>
                
                {/* Logout Button - Redesigned */}
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg hover:bg-gray-700/80 transition-all duration-200 group flex items-center space-x-2"
                  title="Logout"
                >
                  <div className="w-5 h-5 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
                    <svg className="w-3 h-3 text-red-400 group-hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="text-white text-sm font-medium hidden sm:inline">Logout</span>
                </button>
                </div>
              ) : (
              <div className="flex items-center space-x-2">
                {/* Lobby Button - Teaser for non-authenticated users */}
                <button 
                  onClick={() => {
                    alert('Please log in to use Party Lobby feature and team up with friends!')
                  }}
                  className="relative w-10 h-10 bg-gray-600/50 backdrop-blur-sm border border-gray-500/50 rounded-xl shadow-lg transition-all duration-200 group flex items-center justify-center opacity-60 cursor-pointer hover:opacity-80"
                  title="Party Lobby (Login Required)"
                >
                  <div className="text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  
                  {/* Lock icon overlay for non-authenticated users */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </button>
                
              {/* Login Button - Redesigned */}
              <button 
                onClick={handleLoginClick}
                disabled={!ready}
                className="px-6 py-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg hover:bg-gray-700/80 transition-all duration-200 group flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!ready ? 'Initializing authentication...' : 'Click to login with Privy'}
              >
                <div className="w-5 h-5 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                  <svg className="w-3 h-3 text-green-400 group-hover:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span className="text-white font-bold text-sm">
                  {!ready ? 'Loading...' : 'LOGIN'}
                </span>
              </button>
              </div>
            )}

            {/* Mobile-Only Lobby & Friends Button - Redesigned */}
            {isMobile && (
              <button 
                onClick={() => setShowMobileLobby(true)}
                className="w-10 h-10 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-xl shadow-lg hover:bg-gray-700/80 transition-all duration-200 group flex items-center justify-center"
                title="Lobby & Friends"
              >
                <div className="w-6 h-6 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                  <svg className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.196-2.121M9 12a4 4 0 100-8 4 4 0 000 8zm8 0a3 3 0 100-6 3 3 0 000 6zm-8 8a6 6 0 016-6h2a6 6 0 016 6v2H9v-2z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
      </header>

      {/* Skill Disclaimer Banner */}
      <div className="h-6 px-4 text-center flex items-center justify-center relative z-40 bg-gray-900/50 border-b border-gray-800">
        <span className="text-cyan-400 text-xs">⚠️ TurfLoot prizes are determined solely by player skill. Play responsibly.</span>
      </div>

      {/* Main Content - Enhanced Mobile Layout with Better Spacing */}
      <main className="flex-1 flex items-start justify-center pt-8 sm:pt-16 relative z-40 min-h-screen">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          
          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black tracking-tight mb-2 sm:mb-3">
              <span className="text-white">TURF</span>
              <span className="text-yellow-400">LOOT</span>
            </h1>
            <p className="text-gray-400 text-lg font-bold tracking-wide">
              SKILL-BASED GRID DOMINATION
            </p>
          </div>

          {/* Main Game Grid - Mobile: Flex Column with Order, Desktop: Grid */}
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-3 max-w-5xl mx-auto space-y-3 lg:space-y-0">
            
            {/* LEFT COLUMN - Leaderboard & Friends - Mobile: Order Last (Bottom) */}
            <div className="order-3 lg:order-1 col-span-12 lg:col-span-3 space-y-3">
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
                  className="w-full py-3 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-xl text-yellow-400 font-bold text-sm transition-all hover:scale-105"
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
                  className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-400 font-bold text-sm transition-all hover:scale-105"
                >
                  Add Friends
                </button>
              </div>
            </div>

            {/* CENTER COLUMN - Main Game Area - Mobile: Order First (Top) */}
            <div className="order-1 lg:order-2 col-span-12 lg:col-span-6 flex flex-col justify-center space-y-4">
              
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

              {/* User Name Display - Redesigned */}
              <div className="flex justify-center">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl px-8 py-5 border border-gray-700/50 flex items-center space-x-5 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
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
                        className="bg-gray-700/80 text-white text-lg font-medium px-5 py-3 rounded-xl border border-gray-600/50 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 min-w-[200px]"
                        maxLength={20}
                      />
                      <button
                        onClick={handleNameSave}
                        className="p-3 bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 rounded-xl text-green-400 font-bold transition-all duration-200 hover:scale-105 shadow-lg text-lg"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleNameCancel}
                        className="p-3 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded-xl text-red-400 font-bold transition-all duration-200 hover:scale-105 shadow-lg text-lg"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span 
                        className="text-white text-xl font-semibold cursor-pointer hover:text-cyan-400 transition-colors duration-200 group-hover:text-cyan-300 flex items-center space-x-2"
                        onClick={authenticated && user ? handleNameClick : () => setIsEditingName(true)}
                      >
                        {authenticated && user 
                          ? (displayName && displayName !== user.google?.name && displayName !== user.email?.address 
                              ? displayName 
                              : user.google?.name || user.email?.address || "Player")
                          : (displayName === "Loading..." || displayName === "Preparing your turf..."
                              ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                  <span className="text-cyan-400">Setting up your profile...</span>
                                </div>
                              )
                              : (displayName || "Click to set name")
                            )
                        }
                      </span>
                      <span className="text-gray-400 text-sm font-medium">
                        {authenticated && user 
                          ? "Click to edit" 
                          : (displayName === "Loading..." || displayName === "Preparing your turf..."
                              ? "Please wait" 
                              : "Choose your display name"
                            )
                        }
                      </span>
                    </div>
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

            {/* RIGHT COLUMN - Wallet & Customize - Mobile: Order Second (Middle) */}
            <div className="order-2 lg:order-3 col-span-12 lg:col-span-3 space-y-3">
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
                      playerCustomization.skin === 'default_blue' || playerCustomization.skin === 'classic_blue' ? 'bg-gradient-to-br from-cyan-300 via-blue-500 to-blue-600 shadow-blue-500/30' :
                      playerCustomization.skin === 'basic_red' ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-red-500/30' :
                      playerCustomization.skin === 'basic_green' ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-green-500/30' :
                      playerCustomization.skin === 'basic_yellow' ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-yellow-500/30' :
                      playerCustomization.skin === 'basic_purple' ? 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-purple-500/30' :
                      playerCustomization.skin === 'basic_orange' ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-orange-500/30' :
                      playerCustomization.skin === 'rainbow_hologram' ? 'bg-gradient-to-br from-red-400 via-purple-500 to-blue-500 shadow-purple-500/40 animate-pulse' :
                      playerCustomization.skin === 'chrome_steel' ? 'bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400 shadow-gray-500/40' :
                      playerCustomization.skin === 'matte_blue' ? 'bg-blue-600 shadow-blue-500/40' :
                      playerCustomization.skin === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/30' :
                      playerCustomization.skin === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/30' :
                      playerCustomization.skin === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/30' :
                      playerCustomization.skin === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/30' :
                      playerCustomization.skin === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/30' :
                      'bg-gradient-to-br from-cyan-300 via-blue-500 to-blue-600 shadow-blue-500/30'
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

      {/* Mobile Scroll Content - Additional sections for mobile scrolling */}
      <div className="lg:hidden relative z-40 px-6 pb-8 space-y-6">
        {/* Safe area padding for mobile */}
        <div className="h-16"></div>
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
          userBalance={userBalance}
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

      {/* Mobile-Only Lobby & Friends Modal */}
      {showMobileLobby && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileLobby(false)}>
          <div 
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-800 to-gray-900 rounded-t-2xl border-t border-gray-600/30 shadow-2xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
            </div>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">Lobby & Friends</h2>
              <button 
                onClick={() => setShowMobileLobby(false)}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all"
              >
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              
              {/* Lobby Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🎮</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Quick Play</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setShowMobileLobby(false)
                      router.push('/agario?mode=free&fee=0')
                    }}
                    className="flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-700/60 rounded-xl border border-gray-600/30 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-green-400 text-xl">🆓</span>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">Practice Mode</div>
                        <div className="text-gray-400 text-sm">Free • Learn the basics</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMobileLobby(false)
                      setShowServerBrowser(true)
                    }}
                    className="flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-700/60 rounded-xl border border-gray-600/30 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-400 text-xl">💰</span>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">Ranked Games</div>
                        <div className="text-gray-400 text-sm">Earn real money</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Friends Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">👥</span>
                    </div>
                    <h3 className="text-white font-bold text-lg">Friends</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setShowMobileLobby(false)
                      setSocialInitialTab('friends')
                      setShowProfile(true)
                    }}
                    className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors font-medium"
                  >
                    Manage
                  </button>
                </div>
                
                <div className="space-y-2">
                  {loadingFriends ? (
                    <div className="text-center py-6">
                      <div className="text-xl animate-spin mb-2">⏳</div>
                      <div className="text-gray-400 text-sm">Loading friends...</div>
                    </div>
                  ) : friendsList.length > 0 ? (
                    friendsList.slice(0, 4).map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between py-3 px-4 bg-gray-800/30 rounded-xl border border-gray-700/20">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: avatarColors[friend.id % avatarColors.length] }}
                          >
                            {friend.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{friend.name}</div>
                            <div className="text-gray-400 text-xs">
                              {friend.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                            </div>
                          </div>
                        </div>
                        {friend.status === 'online' && (
                          <button className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs font-medium transition-all">
                            Invite
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-2">👥</div>
                      <div className="text-gray-400 text-sm">No friends yet</div>
                      <div className="text-gray-500 text-xs mb-3">Add friends to play together!</div>
                      <button 
                        onClick={() => {
                          setShowMobileLobby(false)
                          setSocialInitialTab('friends')
                          setShowProfile(true)
                        }}
                        className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-all"
                      >
                        Add Friends
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📊</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Your Stats</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gray-800/40 rounded-lg border border-gray-600/30">
                    <div className="text-xl font-bold text-white">0</div>
                    <div className="text-gray-400 text-xs">Wins</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800/40 rounded-lg border border-gray-600/30">
                    <div className="text-xl font-bold text-green-400">$0</div>
                    <div className="text-gray-400 text-xs">Earned</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800/40 rounded-lg border border-gray-600/30">
                    <div className="text-xl font-bold text-cyan-400">#-</div>
                    <div className="text-gray-400 text-xs">Rank</div>
                  </div>
                </div>
              </div>

              {/* Bottom padding for safe area */}
              <div className="h-6"></div>
            </div>
          </div>
        </div>
      )}

      {/* Orientation Gate for Mobile Users */}
      {/* Temporarily disable OrientationGate to fix deployment */}
      {/*showOrientationGate && (
        <OrientationGate onLandscapeReady={handleOrientationReady} />
      )*/}
    </div>
  )
}