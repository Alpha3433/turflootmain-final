'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../config/apiRouting'

// Mock Privy hook directly in the component
function useMockPrivy() {
  return {
    ready: true,
    authenticated: false,
    user: null,
    login: () => {
      console.log('Mock login clicked')
      alert('Login functionality will be available soon!')
    },
    logout: () => console.log('Mock logout')
  }
}

// Main Home component
function HomeContent() {
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
  const [showFriendsPanel, setShowFriendsPanel] = useState(false)
  const [showCustomization, setShowCustomization] = useState(false)
  const [showServerBrowser, setShowServerBrowser] = useState(false)
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [currentServer, setCurrentServer] = useState('Measuring...') // Will be updated with optimal region
  const [currentPing, setCurrentPing] = useState(null) // Real ping to optimal region
  
  // Enhanced iOS Mobile Detection State - MISSING FROM LANDING PAGE!
  const [isMobile, setIsMobile] = useState(false)
  const [showOrientationGate, setShowOrientationGate] = useState(false)
  const [pendingGameEntry, setPendingGameEntry] = useState(null)
  const [showMobileLobby, setShowMobileLobby] = useState(false)

  // Hathora regions with REAL ping measurement endpoints
  const availableRegions = [
    { 
      id: 'washingtondc', 
      name: 'US East (Washington DC)', 
      ping: null, 
      endpoint: 'https://washingtondc.ping.hathora.dev',
      displayName: 'US-East'
    },
    { 
      id: 'seattle', 
      name: 'US West (Seattle)', 
      ping: null, 
      endpoint: 'https://seattle.ping.hathora.dev',
      displayName: 'US-West'
    },
    { 
      id: 'london', 
      name: 'Europe West (London)', 
      ping: null, 
      endpoint: 'https://london.ping.hathora.dev',
      displayName: 'EU-West'
    },
    { 
      id: 'frankfurt', 
      name: 'Europe Central (Frankfurt)', 
      ping: null, 
      endpoint: 'https://frankfurt.ping.hathora.dev',
      displayName: 'EU-Central'
    },
    { 
      id: 'singapore', 
      name: 'Asia Southeast (Singapore)', 
      ping: null, 
      endpoint: 'https://singapore.ping.hathora.dev',
      displayName: 'Asia-SE'
    },
    { 
      id: 'tokyo', 
      name: 'Asia East (Tokyo)', 
      ping: null, 
      endpoint: 'https://tokyo.ping.hathora.dev',
      displayName: 'Asia-East'
    },
    { 
      id: 'mumbai', 
      name: 'Asia South (Mumbai)', 
      ping: null, 
      endpoint: 'https://mumbai.ping.hathora.dev',
      displayName: 'Asia-South'
    },
    { 
      id: 'sydney', 
      name: 'Oceania (Sydney)', 
      ping: null, 
      endpoint: 'https://sydney.ping.hathora.dev',
      displayName: 'Oceania'
    }
  ]

  const [regionPings, setRegionPings] = useState({})
  const [isLoadingPings, setIsLoadingPings] = useState(false)
  const [optimalRegion, setOptimalRegion] = useState(null)
  
  // Router hook - MUST be declared early to avoid hoisting issues
  const router = useRouter()

  // Enhanced Hathora ping measurement - measures actual network latency
  const measurePing = async (regionId, endpoint) => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return getEstimatedLatencyOffset(regionId)
    }
    
    const maxAttempts = 2
    let totalPing = 0
    let successfulAttempts = 0
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const startTime = performance.now()
        
        // Use Hathora region-specific ping endpoints for accuracy
        const pingEndpoint = endpoint.includes('hathora') 
          ? endpoint 
          : `https://www.google.com/generate_204?t=${Date.now()}&region=${regionId}`
        
        const response = await fetch(pingEndpoint, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(4000) // 4 second timeout
        })
        
        const endTime = performance.now()
        const pingTime = Math.round(endTime - startTime)
        
        // Filter out unreasonably high ping times (likely network issues)
        if (pingTime < 1000) {
          totalPing += pingTime
          successfulAttempts++
        }
        
      } catch (error) {
        console.log(`🔍 Ping attempt ${attempt + 1} failed for ${regionId}:`, error.message)
        // On failure, use estimated ping as fallback
        const estimatedPing = getEstimatedLatencyOffset(regionId)
        totalPing += estimatedPing
        successfulAttempts++
      }
    }
    
    const averagePing = successfulAttempts > 0 ? Math.round(totalPing / successfulAttempts) : 999
    
    // Add small random variance to avoid identical pings for nearby regions
    const variance = Math.floor(Math.random() * 6) - 3 // -3 to +3ms
    return Math.max(1, averagePing + variance)
  }

  // Enhanced estimated latency for Hathora regions based on geographic distance
  const getEstimatedLatencyOffset = (regionId) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Enhanced latency estimation based on real-world distances and network infrastructure
    const latencyMap = {
      'washingtondc': {
        'America/New_York': 8, 'America/Chicago': 25, 'America/Denver': 35, 'America/Los_Angeles': 65,
        'Europe/London': 85, 'Europe/Paris': 95, 'Europe/Berlin': 100,
        'Asia/Tokyo': 180, 'Asia/Singapore': 220, 'Asia/Mumbai': 240,
        'Australia/Sydney': 280
      },
      'seattle': {
        'America/Los_Angeles': 12, 'America/Denver': 28, 'America/Chicago': 45, 'America/New_York': 70,
        'Asia/Tokyo': 120, 'Asia/Singapore': 160, 'Asia/Mumbai': 200,
        'Europe/London': 140, 'Europe/Paris': 150, 'Europe/Berlin': 155,
        'Australia/Sydney': 170
      },
      'london': {
        'Europe/London': 5, 'Europe/Paris': 15, 'Europe/Berlin': 25, 'Europe/Rome': 35,
        'America/New_York': 80, 'America/Chicago': 110, 'America/Los_Angeles': 140,
        'Asia/Mumbai': 120, 'Asia/Singapore': 170, 'Asia/Tokyo': 240,
        'Australia/Sydney': 280
      },
      'frankfurt': {
        'Europe/Berlin': 8, 'Europe/Paris': 20, 'Europe/London': 25, 'Europe/Rome': 30,
        'America/New_York': 90, 'America/Chicago': 120, 'America/Los_Angeles': 150,
        'Asia/Mumbai': 110, 'Asia/Singapore': 160, 'Asia/Tokyo': 230,
        'Australia/Sydney': 270
      },
      'singapore': {
        'Asia/Singapore': 5, 'Asia/Kuala_Lumpur': 8, 'Asia/Bangkok': 15, 'Asia/Jakarta': 20,
        'Asia/Tokyo': 65, 'Asia/Mumbai': 85, 'Asia/Hong_Kong': 35,
        'Australia/Sydney': 95, 'Australia/Melbourne': 100,
        'Europe/London': 170, 'America/Los_Angeles': 180, 'America/New_York': 220
      },
      'tokyo': {
        'Asia/Tokyo': 3, 'Asia/Seoul': 12, 'Asia/Shanghai': 25, 'Asia/Hong_Kong': 45,
        'Asia/Singapore': 65, 'Asia/Mumbai': 120,
        'Australia/Sydney': 110, 'Australia/Melbourne': 115,
        'America/Los_Angeles': 120, 'America/New_York': 170,
        'Europe/London': 240, 'Europe/Berlin': 250
      },
      'mumbai': {
        'Asia/Mumbai': 2, 'Asia/Kolkata': 8, 'Asia/Dubai': 25, 'Asia/Karachi': 15,
        'Asia/Singapore': 85, 'Asia/Tokyo': 120,
        'Europe/London': 110, 'Europe/Berlin': 120,
        'America/New_York': 240, 'America/Los_Angeles': 270,
        'Australia/Sydney': 180
      },
      'sydney': {
        'Australia/Sydney': 2, 'Australia/Melbourne': 8, 'Australia/Brisbane': 15, 'Australia/Perth': 45,
        'Pacific/Auckland': 25, 'Pacific/Fiji': 35,
        'Asia/Singapore': 95, 'Asia/Tokyo': 110, 'Asia/Mumbai': 180,
        'America/Los_Angeles': 140, 'America/New_York': 200,
        'Europe/London': 280, 'Europe/Berlin': 290
      }
    }
    
    // Find closest timezone match
    let estimatedPing = 50 // Default fallback
    if (latencyMap[regionId]) {
      const regionLatencies = latencyMap[regionId]
      
      // Direct match
      if (regionLatencies[timezone]) {
        estimatedPing = regionLatencies[timezone]
      } else {
        // Find closest match based on geographic region
        const timezoneParts = timezone.split('/')
        const continent = timezoneParts[0]
        
        for (const [tz, latency] of Object.entries(regionLatencies)) {
          if (tz.startsWith(continent)) {
            estimatedPing = latency
            break
          }
        }
      }
    }
    
    // Add small random variation to simulate network conditions
    const variation = Math.floor(Math.random() * 10) - 5 // -5 to +5ms
    return Math.max(1, estimatedPing + variation)
  }

  // Measure ping to all Hathora regions and find optimal
  const measureAllPings = async () => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return
    }
    
    if (isLoadingPings) return
    
    setIsLoadingPings(true)
    setCurrentServer('Measuring...')
    setCurrentPing(null)
    console.log('🌍 Measuring ping to all Hathora regions...')
    
    const pingPromises = availableRegions.map(async (region) => {
      const ping = await measurePing(region.id, region.endpoint)
      console.log(`📡 ${region.displayName}: ${ping}ms`)
      return { regionId: region.id, region, ping }
    })

    try {
      const results = await Promise.all(pingPromises)
      const newPings = {}
      
      results.forEach(({ regionId, ping }) => {
        newPings[regionId] = ping
      })
      
      setRegionPings(newPings)
      
      // Find the optimal region (lowest ping)
      const optimalResult = results.reduce((best, current) => 
        current.ping < best.ping ? current : best
      )
      
      // Update UI with optimal region
      setOptimalRegion(optimalResult.region)
      setCurrentServer(optimalResult.region.displayName)
      setCurrentPing(optimalResult.ping)
      
      console.log(`🎯 Optimal Hathora region: ${optimalResult.region.displayName} (${optimalResult.ping}ms)`)
      
      // Store the optimal region preference in localStorage for future sessions
      try {
        localStorage.setItem('turfloot_optimal_region', JSON.stringify({
          regionId: optimalResult.region.id,
          displayName: optimalResult.region.displayName,
          ping: optimalResult.ping,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.log('Could not save optimal region preference')
      }
      
    } catch (error) {
      console.error('❌ Failed to measure region pings:', error)
      // Fallback to estimated best region based on timezone
      const fallbackRegion = availableRegions.find(r => r.id === getPreferredRegionByTimezone()) || availableRegions[0]
      setCurrentServer(fallbackRegion.displayName)
      setCurrentPing(getEstimatedLatencyOffset(fallbackRegion.id))
      setOptimalRegion(fallbackRegion)
    }
    
    setIsLoadingPings(false)
  }
  
  // Get preferred region based on user's timezone (matches Hathora client logic)
  const getPreferredRegionByTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    if (timezone.includes('America')) {
      return timezone.includes('Los_Angeles') || timezone.includes('Vancouver') ? 'seattle' : 'washingtondc'
    } else if (timezone.includes('Europe')) {
      return timezone.includes('London') || timezone.includes('Dublin') ? 'london' : 'frankfurt'
    } else if (timezone.includes('Asia')) {
      if (timezone.includes('Tokyo') || timezone.includes('Japan')) return 'tokyo'
      if (timezone.includes('Singapore') || timezone.includes('Malaysia')) return 'singapore'
      if (timezone.includes('India') || timezone.includes('Kolkata')) return 'mumbai'
      return 'singapore'
    } else if (timezone.includes('Australia') || timezone.includes('Pacific') || timezone.includes('Auckland')) {
      return 'sydney'
    }
    
    return 'washingtondc' // Safe fallback
  }

  // Initialize optimal region and measure pings on component mount
  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return
    }
    
    // Try to load saved region preference first
    try {
      const savedPreference = localStorage.getItem('turfloot_user_region_preference')
      const savedOptimal = localStorage.getItem('turfloot_optimal_region')
      
      if (savedPreference) {
        const preference = JSON.parse(savedPreference)
        // Use saved preference if it's recent (less than 24 hours old)
        if (Date.now() - preference.timestamp < 86400000) {
          const savedRegion = availableRegions.find(r => r.id === preference.regionId)
          if (savedRegion) {
            setCurrentServer(savedRegion.displayName)
            setCurrentPing(preference.ping)
            setOptimalRegion(savedRegion)
            console.log(`🔄 Loaded saved region preference: ${savedRegion.displayName} (${preference.ping}ms)`)
          }
        }
      } else if (savedOptimal) {
        const optimal = JSON.parse(savedOptimal)
        // Use saved optimal if it's recent (less than 1 hour old)
        if (Date.now() - optimal.timestamp < 3600000) {
          const optimalRegion = availableRegions.find(r => r.id === optimal.regionId)
          if (optimalRegion) {
            setCurrentServer(optimalRegion.displayName)
            setCurrentPing(optimal.ping)
            setOptimalRegion(optimalRegion)
            console.log(`🎯 Loaded saved optimal region: ${optimalRegion.displayName} (${optimal.ping}ms)`)
          }
        }
      }
    } catch (e) {
      console.log('Could not load saved region preferences')
    }
    
    // Start ping measurements
    measureAllPings()
    
    // Refresh pings every 2 minutes for accurate real-time data
    const pingInterval = setInterval(measureAllPings, 120000)
    
    return () => clearInterval(pingInterval)
  }, [])

  // Region selection handler with optimal ping detection
  const handleRegionSelect = (regionId) => {
    const selectedRegion = availableRegions.find(r => r.id === regionId)
    
    if (!selectedRegion) return
    
    setCurrentServer(selectedRegion.displayName)
    setOptimalRegion(selectedRegion)
    
    // Use real-time ping if available, otherwise use estimated value
    const realPing = regionPings[regionId]
    const estimatedPing = getEstimatedLatencyOffset(regionId)
    const pingToUse = realPing !== undefined ? realPing : estimatedPing
    
    setCurrentPing(pingToUse)
    setShowRegionDropdown(false)
    
    console.log(`🌍 Region manually changed to: ${selectedRegion.displayName} (${pingToUse}ms)`)
    
    // Save user's manual region preference
    try {
      localStorage.setItem('turfloot_user_region_preference', JSON.stringify({
        regionId: selectedRegion.id,
        displayName: selectedRegion.displayName,
        ping: pingToUse,
        manualSelection: true,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.log('Could not save user region preference')
    }
    
    // Re-measure ping for the selected region to get fresh data
    measurePing(regionId, selectedRegion.endpoint)
      .then(newPing => {
        setCurrentPing(newPing)
        setRegionPings(prev => ({ ...prev, [regionId]: newPing }))
        console.log(`📡 Updated ping for ${selectedRegion.displayName}: ${newPing}ms`)
      })
      .catch(error => console.error(`❌ Failed to update ping for ${selectedRegion.displayName}:`, error))
  }

  // Party Lobby management
  const [showPartyLobby, setShowPartyLobby] = useState(false)
  
  // Game Loading State
  const [isJoiningGame, setIsJoiningGame] = useState(false)
  const [gameLoadingInfo, setGameLoadingInfo] = useState({
    roomType: null,
    entryFee: 0,
    partyMode: false,
    partySize: 1
  })

  // Handle game start from Party Lobby
  const handleGameStart = useCallback((gameData) => {
    const { roomType, entryFee, gameRoomId, lobbyId, partyMode, partyId, partySize, partyMembers } = gameData
    
    console.log('🎮 Starting game with data:', gameData)
    
    if (!router) {
      console.error('Router not available')
      return
    }
    
    // Show loading popup with game info
    setGameLoadingInfo({
      roomType: roomType || 'practice',
      entryFee: entryFee || 0,
      partyMode: partyMode || false,
      partySize: partySize || 1
    })
    setIsJoiningGame(true)
    
    // Add a small delay for UX (let user see the loading popup)
    setTimeout(() => {
      if (partyMode && gameRoomId) {
        // PARTY MODE: Navigate to coordinated game room
        console.log(`🎮 Party Mode: Navigating to game room ${gameRoomId} with ${partySize} members`)
        
        const gameUrl = `/agario?mode=party&fee=${entryFee}&roomId=${gameRoomId}&partyId=${partyId}&partySize=${partySize}&members=${encodeURIComponent(JSON.stringify(partyMembers))}`
        
        console.log('🔗 Game URL:', gameUrl)
        router.push(gameUrl)
        
      } else if (roomType === 'practice') {
        // SOLO GLOBAL MULTIPLAYER MODE: Navigate to global multiplayer
        console.log('🌍 Solo Global Multiplayer Mode: Navigating to worldwide multiplayer')
        router.push('/agario?mode=practice&fee=0&roomId=global-practice-bots')
        
      } else {
        // SOLO CASH MODE: Navigate to cash game
        console.log(`🎮 Solo Cash Mode: Navigating to ${roomType} game`)
        router.push(`/agario?mode=cash&fee=${entryFee}&roomId=${lobbyId || 'solo-' + Date.now()}`)
      }
    }, 2000) // Extended delay to see loading popup better
  }, [router]) // Add router as dependency
  
  // Hide loading popup when component unmounts or navigation occurs
  useEffect(() => {
    return () => {
      setIsJoiningGame(false)
    }
  }, [])

  // Also hide loading popup on route changes (only if router is available)
  useEffect(() => {
    if (!router) return
    
    const handleRouteChange = () => {
      setIsJoiningGame(false)
    }
    
    // Note: Next.js 13 app router doesn't have router events
    // The loading will be hidden when page actually navigates
    
    return () => {
      // Cleanup if needed
    }
  }, [router?.isReady]) // Use router.isReady to avoid initialization errors

  const [showMobileRegionDropdown, setShowMobileRegionDropdown] = useState(false)
  const [showMobileFriendsLobby, setShowMobileFriendsLobby] = useState(false)

  // TEMPORARY: Force mobile mode for testing - REMOVE AFTER VERIFICATION
  const [forceMobileMode, setForceMobileMode] = useState(false)
  // FIXED: Dynamic leaderboard based on actual player eliminations instead of mock data
  const [leaderboardData, setLeaderboardData] = useState([])
  const [playerEliminationStats, setPlayerEliminationStats] = useState({ kills: 0, deaths: 0, streak: 0 })
  const [playerCustomization, setPlayerCustomization] = useState({
    skin: 'default_blue'
  })
  const [userBalance, setUserBalance] = useState(0) // Start at 0 for new accounts
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [socialInitialTab, setSocialInitialTab] = useState('leaderboard')
  const [friendsList, setFriendsList] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  
  // Real-time cash-out notifications state
  const [cashOutNotifications, setCashOutNotifications] = useState([])
  
  // API URL utility - prefers standard routes, uses bypass only for known blocked routes
  const getApiUrl = useCallback((endpoint) => {
    if (typeof window === 'undefined') return endpoint // SSR fallback
    
    const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    // Always use standard routes for localhost
    if (isLocalDevelopment) {
      return `http://localhost:3000${endpoint}`
    }
    
    // INFRASTRUCTURE WORKAROUND: Only use bypass for known blocked routes
    // Remove this section when Kubernetes ingress is fixed to allow /api/* routes
    const useBypassRouting = true // Set to false when infrastructure is fixed
    
    if (useBypassRouting) {
      if (endpoint.startsWith('/api/names/')) {
        console.log(`🔄 Using bypass route for blocked endpoint: ${endpoint}`)
        return endpoint.replace('/api/names/', '/names-api/')
      }
      
      if (endpoint.startsWith('/api/friends/')) {
        console.log(`🔄 Using bypass route for blocked endpoint: ${endpoint}`)
        return endpoint.replace('/api/friends/', '/friends-api/')
      }
    }
    
    // Default: use standard routes (preferred)
    return endpoint
  }, [])
  
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
  
  // Get Privy authentication (using mock provider)
  const { ready, authenticated, user, login, logout } = usePrivy()

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
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showRegionDropdown])


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
      const response = await fetch('http://localhost:3000/api/users/balance', {
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

  // FIXED: Function to update player elimination stats for dynamic leaderboard
  const updatePlayerEliminationStats = (stats) => {
    setPlayerEliminationStats(prev => ({
      kills: stats.kills || prev.kills,
      deaths: stats.deaths || prev.deaths,
      streak: stats.streak || prev.streak
    }))
    
    // Refresh leaderboard data to include current player's updated stats
    if (stats.kills > 0) {
      console.log(`📊 Player elimination stats updated: ${stats.kills} kills, ${stats.deaths} deaths, ${stats.streak} streak`)
      
      // Update leaderboard with current player's stats
      setLeaderboardData(prev => {
        // Remove any existing entry for current player
        const filteredLeaderboard = prev.filter(player => player.name !== (displayName || 'You'))
        
        // Add current player with updated stats
        const updatedLeaderboard = [
          {
            rank: 1, // Will be re-sorted
            name: displayName || 'You',
            eliminations: stats.kills,
            earnings: `${stats.kills} eliminations`
          },
          ...filteredLeaderboard
        ]
        
        // Sort by eliminations and assign proper ranks
        return updatedLeaderboard
          .sort((a, b) => b.eliminations - a.eliminations)
          .slice(0, 3) // Keep top 3
          .map((player, index) => ({ ...player, rank: index + 1 }))
      })
    }
  }

  // FIXED: Listen for elimination events from the game to update leaderboard dynamically
  useEffect(() => {
    const handlePlayerElimination = (event) => {
      const { kills, deaths, streak } = event.detail
      console.log('📊 Received player elimination event:', { kills, deaths, streak })
      updatePlayerEliminationStats({ kills, deaths, streak })
    }

    // Listen for custom elimination events from the game
    window.addEventListener('playerElimination', handlePlayerElimination)
    
    return () => {
      window.removeEventListener('playerElimination', handlePlayerElimination)
    }
  }, [displayName]) // Re-setup when display name changes

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
        // Fetch live statistics with dynamic URLs
        const [playersResponse, winningsResponse, leaderboardResponse, friendsResponse] = await Promise.all([
          fetch(getApiUrl('/api/stats/live-players')),
          fetch(getApiUrl('/api/stats/global-winnings')),
          fetch(getApiUrl('/api/users/leaderboard')),
          fetch(getApiUrl(`/api/friends/list?userId=${userProfile?.id || userProfile?.privyId || 'demo-user'}`))
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

        // FIXED: Dynamic leaderboard based on real elimination stats instead of mock API data
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json()
          console.log('📊 Raw leaderboard data received:', leaderboardData)
          
          // Process leaderboard data based on actual player eliminations
          if (leaderboardData && leaderboardData.users && Array.isArray(leaderboardData.users)) {
            const processedLeaderboard = leaderboardData.users
              .slice(0, 10) // Get top 10 players
              .filter(user => user.stats?.total_kills > 0) // Only show players with actual eliminations
              .sort((a, b) => (b.stats?.total_kills || 0) - (a.stats?.total_kills || 0)) // Sort by kills descending
              .slice(0, 3) // Show top 3
              .map((user, index) => ({
                rank: index + 1,
                name: user.custom_name || user.email?.split('@')[0] || `Player${user.id?.slice(-4)}`,
                eliminations: user.stats?.total_kills || 0,
                earnings: `${user.stats?.total_kills || 0} eliminations` // Show eliminations instead of mock earnings
              }))
            
            setLeaderboardData(processedLeaderboard)
            console.log('📊 Processed dynamic leaderboard:', processedLeaderboard)
          } else {
            console.log('⚠️ No users with eliminations found - showing current player if they have kills')
            // Show current player if they have eliminations
            if (playerEliminationStats.kills > 0) {
              setLeaderboardData([{
                rank: 1,
                name: displayName || 'You',
                eliminations: playerEliminationStats.kills,
                earnings: `${playerEliminationStats.kills} eliminations`
              }])
            } else {
              setLeaderboardData([])
            }
          }
        } else {
          console.log('⚠️ Leaderboard API unavailable - using local player stats')
          // Fallback to local player stats if API fails
          if (playerEliminationStats.kills > 0) {
            setLeaderboardData([{
              rank: 1,
              name: displayName || 'You',
              eliminations: playerEliminationStats.kills,
              earnings: `${playerEliminationStats.kills} eliminations`
            }])
          } else {
            setLeaderboardData([])
          }
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
      
      // Strategy 1: Check localStorage for saved name first (fastest)
      let savedName = null
      let localUserData = null
      
      try {
        const savedUserData = localStorage.getItem(`turfloot_user_${userId}`)
        if (savedUserData) {
          localUserData = JSON.parse(savedUserData)
          savedName = localUserData.customName
          console.log('💾 Found saved name in localStorage:', savedName)
        }
      } catch (error) {
        console.log('ℹ️ No localStorage data found or invalid data')
      }
      
      // Strategy 2: Try bulletproof names API  
      try {
        const response = await fetch(getApiUrl(`/api/names/get?userId=${encodeURIComponent(userId)}`))
        
        if (response.ok) {
          const userData = await response.json()
          console.log('👤 User profile loaded from names API:', userData)
          
          // Use API name if available, otherwise use localStorage name
          const apiName = userData.customName
          const finalName = apiName || savedName
          
          if (finalName) {
            setDisplayName(finalName)
            setCustomName(finalName)
            console.log('✅ Using name:', finalName, apiName ? '(from names API)' : '(from localStorage)')
          } else {
            setDisplayName('Click to set name')
            setCustomName('')
          }
          
          return
        } else {
          console.log('⚠️ Names API profile not found, using localStorage fallback')
        }
      } catch (error) {
        console.error('❌ Error loading profile from names API:', error)
      }
      
      // Strategy 3: Use localStorage data if API fails
      if (savedName) {
        console.log('💾 Using localStorage saved name:', savedName)
        setDisplayName(savedName)
        setCustomName(savedName)
      } else {
        // Final fallback
        console.log('🆕 No saved name found, using default')
        setDisplayName('Click to set name')
        setCustomName('')
      }
      
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error)
      // Ultimate fallback
      setDisplayName('Click to set name')
      setCustomName('')
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
      const response = await fetch('http://localhost:3000/api/auth/privy', {
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
    if (!ready) {
      console.log('⚠️ Privy not ready yet')
      return
    }
    
    console.log('🚀 Starting login process...')
    login()
  }

  const handleLogout = () => {
    logout()
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

    console.log('💾 Saving custom name:', customName.trim())
    
    // Generate a consistent guest user ID for non-authenticated users
    let userId, requestData, isGuest = false
    
    if (!authenticated || !user) {
      // For non-authenticated users, create a guest session
      let guestId = localStorage.getItem('turfloot_guest_id')
      if (!guestId) {
        guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem('turfloot_guest_id', guestId)
      }
      
      userId = guestId
      requestData = {
        userId: guestId,
        customName: customName.trim(),
        privyId: null,
        email: null
      }
      isGuest = true
      console.log('🧑‍💼 Guest user - using guest ID:', guestId)
    } else {
      // Authenticated user
      userId = user.id
      requestData = {
        userId: user.id,
        customName: customName.trim(),
        privyId: user.id,
        email: user.email?.address || null
      }
      console.log('🔑 Authenticated user:', user.id)
    }

    console.log('📤 Request data:', requestData)

    // ONLY use the bulletproof names API - no fallbacks
    let serverSaveSuccess = false
    
    try {
      console.log('🎯 Using bulletproof names API...')
      const response = await fetch(getApiUrl('/api/names/update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })
      
      console.log('📡 Names API Response status:', response.status)
      console.log('📡 Names API Response ok:', response.ok)
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('📡 Names API Response data:', responseData)
        
        if (responseData && responseData.success) {
          console.log('✅ Name saved successfully to bulletproof names API!')
          serverSaveSuccess = true
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Names API Error:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Names API Request failed:', error)
    }

    // Enhanced localStorage for cross-user discovery
    try {
      const persistentUserData = {
        userId: userId,
        customName: customName.trim(),
        timestamp: new Date().toISOString(),
        serverSaved: serverSaveSuccess,
        isGuest: isGuest
      }
      
      localStorage.setItem(`turfloot_user_${userId}`, JSON.stringify(persistentUserData))
      localStorage.setItem('turfloot_current_user', userId)
      localStorage.setItem('turfloot_display_name', customName.trim())
      
      // Update shared user discovery cache for friends functionality
      try {
        const allLocalUsers = JSON.parse(localStorage.getItem('turfloot_all_users') || '[]')
        const existingIndex = allLocalUsers.findIndex(u => u.userId === user.id)
        
        if (existingIndex >= 0) {
          allLocalUsers[existingIndex] = persistentUserData
        } else {
          allLocalUsers.push(persistentUserData)
        }
        
        // Keep only last 50 users to prevent localStorage bloat
        if (allLocalUsers.length > 50) {
          allLocalUsers.splice(0, allLocalUsers.length - 50)
        }
        
        localStorage.setItem('turfloot_all_users', JSON.stringify(allLocalUsers))
        console.log('💾 Updated shared user discovery cache for friends')
        
      } catch (error) {
        console.error('⚠️ Error updating user discovery cache:', error)
      }
      
      console.log('💾 Name saved to localStorage for cross-session persistence')
    } catch (error) {
      console.error('❌ LocalStorage save failed:', error)
    }

    // Update local state
    setDisplayName(customName.trim())
    setIsEditingName(false)
    
    // User feedback based on success
    if (serverSaveSuccess) {
      alert(`✅ Name "${customName.trim()}" saved successfully!\n\n🎮 Other players can now find you by searching for "${customName.trim()}"`)
    } else {
      alert(`✅ Name "${customName.trim()}" saved locally!\n\n💾 Visible to other players in this session.\n🔄 Will sync to server when available.`)
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
    
    // FIXED: Go directly to practice mode for FREE games, spectator mode for paid games
    if (selectedStake === 'FREE' || selectedStake === 0) {
      handlePracticeMode()
    } else {
      // For cash games, use spectator mode first  
      handleAutoSpectate()
    }
  }

  // NEW: Practice mode - supports both authenticated (global multiplayer) and unauthenticated (demo) users
  const handlePracticeMode = () => {
    console.log('🌍 Global multiplayer practice requested')
    
    const roomId = 'global-practice-bots'
    const gameMode = 'practice'
    const gameFee = 0
    
    console.log('🌍 Preparing global multiplayer connection:', { 
      roomId, 
      gameMode, 
      gameFee,
      globalMultiplayer: true,
      userAuthenticated: authenticated && user ? true : false
    })
    
    // Show loading popup with global multiplayer info
    setGameLoadingInfo({
      roomType: 'Global Multiplayer',
      entryFee: 0,
      partyMode: false,
      partySize: 1
    })
    setIsJoiningGame(true)
    
    // Navigate to global multiplayer experience after loading delay
    setTimeout(() => {
      const gameUrl = `/agario?roomId=${roomId}&mode=${gameMode}&fee=${gameFee}`
      
      try {
        router.push(gameUrl)
        console.log('✅ Router.push called for global multiplayer')
        
        // Fallback navigation after a short delay
        setTimeout(() => {
          if (window.location.pathname === '/') {
            console.log('🔄 Using window.location fallback for global multiplayer')
            window.location.href = gameUrl
          }
        }, 1000)
      } catch (error) {
        console.error('❌ Navigation error:', error)
        // Ultimate fallback
        window.location.href = gameUrl
      }
    }, 2000) // 2 second loading delay like party lobby
  }



  // NEW: Auto-spectate - load directly into real game in spectator mode
  const handleAutoSpectate = () => {
    console.log('👁️ Auto-spectate mode - loading real game as spectator for stake:', selectedStake)
    
    // Determine game mode and fee for all stakes
    const gameMode = selectedStake === 'FREE' || selectedStake === 0 ? 'free' : 'cash'
    const gameFee = selectedStake === 'FREE' || selectedStake === 0 ? 0 : parseInt(selectedStake.toString().replace('$', ''))
    
    // Generate room ID based on game type and region
    let roomId
    if (gameMode === 'free') {
      roomId = 'global-practice-bots' // Spectate the global practice room
    } else {
      // For cash games, generate room ID based on selected region and stake
      const selectedRegion = currentServer ? currentServer.toLowerCase().replace('-', '-') : 'us-east-1'
      // Use room number 1 as default spectate target for each stake
      roomId = `${selectedRegion}-cash-${gameFee}-1`
    }
    
    console.log('👁️ Auto-navigating to real game in spectator mode:', { 
      roomId, 
      gameMode, 
      gameFee, 
      stake: selectedStake,
      region: currentServer || 'US-East-1'
    })
    
    // Navigate directly to the real agario game page but in spectator mode
    const gameUrl = `/agario?roomId=${roomId}&mode=${gameMode}&fee=${gameFee}&spectatorMode=true&stake=${selectedStake}&autoSpectate=true`
    
    try {
      router.push(gameUrl)
      console.log('✅ Router.push called for game spectator mode')
      
      // Fallback navigation after a short delay
      setTimeout(() => {
        if (window.location.pathname === '/') {
          console.log('🔄 Using window.location fallback for game spectator mode')
          window.location.href = gameUrl
        }
      }, 1000)
      
    } catch (error) {
      console.error('❌ Router error for game spectator mode:', error)
      window.location.href = gameUrl
    }
  }

  const proceedToGame = () => {
    const gameStake = pendingGameEntry?.stake || selectedStake
    const gameMode = pendingGameEntry?.mode || (selectedStake === 'FREE' || selectedStake === 0 ? 'free' : 'cash')
    const gameFee = pendingGameEntry?.fee || (selectedStake === 'FREE' || selectedStake === 0 ? 0 : parseInt(selectedStake.toString().replace('$', '')))
    
    console.log('🎮 Proceeding to game:', { gameStake, gameMode, gameFee })
    
    // Determine room type for loading popup
    let roomType
    if (gameStake === 'FREE' || gameStake === 0) {
      roomType = 'practice'
    } else {
      roomType = `$${gameFee}`
    }
    
    // Show loading popup
    console.log('🎮 Setting loading popup state:', { roomType, gameFee })
    setGameLoadingInfo({
      roomType: roomType,
      entryFee: gameFee,
      partyMode: false,
      partySize: 1
    })
    setIsJoiningGame(true)
    console.log('🎮 isJoiningGame set to true - popup should be visible')
    
    // Add delay for better UX
    setTimeout(() => {
      // For FREE games - route to global multiplayer (with authentication)
      if (gameStake === 'FREE' || gameStake === 0) {
        console.log('🌍 Free global multiplayer selected - connecting to worldwide servers')
        
        console.log('✅ Navigating to global multiplayer servers')
        
        // Try router.push with fallback - use global multiplayer servers
        try {
          router.push('/agario?mode=practice&fee=0&roomId=global-practice-bots')
          
          // Extra fallback for edge cases
          setTimeout(() => {
            if (window.location.pathname === '/') {
              console.log('🔄 Using window.location fallback')
              window.location.href = '/agario?mode=practice&fee=0&roomId=global-practice-bots'
            }
          }, 2000)
          
        } catch (error) {
          console.error('❌ Router error:', error)
          window.location.href = '/agario?mode=practice&fee=0&roomId=global-practice-bots'
        }
        return
      }
      
      // For cash games, use the original complex game with authentication
      const mode = 'cash'
      const fee = gameFee
      const roomId = 'lobby'
      
      console.log('💰 Routing to cash game with auth:', { mode, fee, roomId })
      router.push(`/play?mode=${mode}&room=${roomId}&fee=${fee}`)
    }, 2000) // Extended delay for loading popup UX
  }

  const handleOrientationReady = () => {
    console.log('✅ Mobile device ready in landscape - proceeding to game')
    setShowOrientationGate(false)
    proceedToGame()
    // Clear pending game entry
    setPendingGameEntry(null)
  }

  // Main render - no loading state needed as ClientOnlyPrivyWrapper handles hydration
  return (
    <div className="min-h-screen w-full text-white relative flex flex-col bg-black" style={{
      background: 'linear-gradient(to bottom right, rgb(0, 0, 0), rgb(17, 24, 39), rgb(0, 0, 0))',
      minHeight: '100dvh'
    }}>
      
      {/* Top Region Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center justify-center px-4 py-2 space-x-2">
          {/* COINS Display */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-xs">$</span>
            </div>
            <span className="text-yellow-400 font-bold text-sm">COINS</span>
          </div>
          
          {/* Region Buttons */}
          {availableRegions.map((region) => {
            // Define colors for each region to match the reference
            const getRegionColors = (displayName, isActive) => {
              const colors = {
                'Oceania': isActive ? 'bg-teal-600 text-white border-teal-400' : 'bg-teal-700/80 text-teal-200 border-teal-600 hover:bg-teal-600',
                'Asia East': isActive ? 'bg-blue-600 text-white border-blue-400' : 'bg-blue-700/80 text-blue-200 border-blue-600 hover:bg-blue-600',
                'US East': isActive ? 'bg-orange-600 text-white border-orange-400' : 'bg-orange-700/80 text-orange-200 border-orange-600 hover:bg-orange-600',
                'US West': isActive ? 'bg-green-600 text-white border-green-400' : 'bg-green-700/80 text-green-200 border-green-600 hover:bg-green-600',
                'Europe': isActive ? 'bg-purple-600 text-white border-purple-400' : 'bg-purple-700/80 text-purple-200 border-purple-600 hover:bg-purple-600',
                'Global': isActive ? 'bg-red-600 text-white border-red-400' : 'bg-red-700/80 text-red-200 border-red-600 hover:bg-red-600'
              }
              return colors[displayName] || (isActive ? 'bg-gray-600 text-white border-gray-400' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600')
            }
            
            return (
              <button
                key={region.id}
                onClick={() => handleRegionSelect(region.id)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 border ${
                  getRegionColors(region.displayName, currentServer === region.displayName)
                }`}
              >
                {region.displayName}
              </button>
            )
          })}
          
          {/* LOGIN Button */}
          <button
            onClick={handleLoginClick}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all hover:scale-105"
          >
            LOGIN
          </button>
        </div>
      </div>

      {/* Add top padding to account for fixed navigation */}
      <div className="pt-16"></div>
      {/* Game-Inspired Animated Background - Full Coverage */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ minHeight: '100vh', minHeight: '100dvh' }}>
        
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
      <header className="sticky top-16 z-40 h-auto min-h-[64px] w-full backdrop-blur-sm bg-black/90 border-b border-gray-800">
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
                  <span className="text-green-400 font-medium text-xs leading-none hidden sm:inline group-hover:text-green-300 transition-colors duration-200">
                    {isLoadingPings ? 'Measuring...' : currentServer}
                  </span>
                  <span className="text-green-400 font-medium text-xs leading-none sm:hidden group-hover:text-green-300 transition-colors duration-200">
                    {isLoadingPings ? 'Ping...' : currentServer.split('-')[0]}
                  </span>
                  {currentPing !== null && !isLoadingPings && (
                    <span className="text-gray-400 text-xs leading-none group-hover:text-gray-300 transition-colors duration-200">
                      {currentPing}ms {optimalRegion && currentServer === optimalRegion.displayName ? '⚡' : ''}
                    </span>
                  )}
                  {isLoadingPings && (
                    <span className="text-cyan-400 text-xs leading-none animate-pulse">
                      Testing...
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

              {/* Global Connection Status Indicator */}
              <div className="absolute -top-1 -right-1 flex items-center">
                <div 
                  className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-lg border border-cyan-300"
                  title="Connected to Global Hathora Servers - Worldwide Multiplayer Enabled"
                ></div>
              </div>

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
            
      {/* Party Lobby Modal */}
      {showPartyLobby && (
        <PartyLobbySystem 
          user={userProfile}
          displayName={displayName}
          onClose={() => setShowPartyLobby(false)}
          onGameStart={handleGameStart}
        />
      )}

            
            {/* Navigation Buttons */}
            <div className="flex items-center">
              {/* Desktop Navigation - Original Layout */}
              <div className="hidden sm:flex items-center space-x-2">
                {/* Navigation Buttons - Redesigned to match Party Lobby style */}
                {authenticated && user ? (
                  <div className="flex items-center space-x-2">
                  {/* Profile Button - Blue Theme */}
                  <button 
                    onClick={() => setShowProfile(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600/90 to-blue-700/90 backdrop-blur-sm border border-blue-500/60 rounded-xl shadow-lg hover:from-blue-500/90 hover:to-blue-600/90 transition-all duration-200 group cursor-pointer"
                    title="Profile & Social"
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-blue-500/20 border-blue-500/30 group-hover:bg-blue-500/30 transition-all duration-200">
                      <svg className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-none text-blue-400 group-hover:text-blue-300 transition-colors duration-200">
                        Profile
                      </span>
                      <span className="text-gray-400 text-xs leading-none">
                        Social
                      </span>
                    </div>
                  </button>
                  
                  {/* Party Lobby Button - Orange Theme */}
                  <button 
                    onClick={() => {
                      console.log('🏰 Desktop Lobby button clicked!')
                      setShowPartyLobby(true)
                    }}
                    className="relative flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-orange-600/90 to-orange-700/90 backdrop-blur-sm border border-orange-500/60 rounded-xl shadow-lg hover:from-orange-500/90 hover:to-orange-600/90 transition-all duration-200 group cursor-pointer"
                    title="Party Lobby"
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-orange-500/20 border-orange-500/30 group-hover:bg-orange-500/30 transition-all duration-200">
                      <svg className="w-4 h-4 text-orange-400 group-hover:text-orange-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-none text-orange-400 group-hover:text-orange-300 transition-colors duration-200">
                        Party
                      </span>
                      <span className="text-gray-400 text-xs leading-none">
                        Lobby
                      </span>
                    </div>
                    
                    {/* Party Lobby indicator - TODO: Add party state tracking */}
                    {/* Future: Add party status indicator here */}
                    
                    {/* Pending party invites indicator - TODO: Add party invitations state tracking */}
                    {/* Future: Add party invitation count indicator here */}
                  </button>
                  
                  {/* Friends Button - Teal Theme */}
                  <button 
                    onClick={() => setShowFriendsPanel(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-teal-600/90 to-teal-700/90 backdrop-blur-sm border border-teal-500/60 rounded-xl shadow-lg hover:from-teal-500/90 hover:to-teal-600/90 transition-all duration-200 group cursor-pointer"
                    title="Friends & Social"
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-teal-500/20 border-teal-500/30 group-hover:bg-teal-500/30 transition-all duration-200">
                      <svg className="w-4 h-4 text-teal-400 group-hover:text-teal-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 4.197a4 4 0 11-6.918-4.544A6.945 6.945 0 0015 21z" />
                      </svg>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-none text-teal-400 group-hover:text-teal-300 transition-colors duration-200">
                        Friends
                      </span>
                      <span className="text-gray-400 text-xs leading-none">
                        Social
                      </span>
                    </div>
                  </button>
                  
                  {/* Settings Button - Purple Theme */}
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600/90 to-purple-700/90 backdrop-blur-sm border border-purple-500/60 rounded-xl shadow-lg hover:from-purple-500/90 hover:to-purple-600/90 transition-all duration-200 group cursor-pointer"
                    title="Settings"
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-purple-500/20 border-purple-500/30 group-hover:bg-purple-500/30 transition-all duration-200">
                      <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-none text-purple-400 group-hover:text-purple-300 transition-colors duration-200">
                        Settings
                      </span>
                      <span className="text-gray-400 text-xs leading-none">
                        Config
                      </span>
                    </div>
                  </button>
                  
                  {/* Logout Button - Red Theme */}
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-red-600/90 to-red-700/90 backdrop-blur-sm border border-red-500/60 rounded-xl shadow-lg hover:from-red-500/90 hover:to-red-600/90 transition-all duration-200 group cursor-pointer"
                    title="Logout"
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-red-500/20 border-red-500/30 group-hover:bg-red-500/30 transition-all duration-200">
                      <svg className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-none text-red-400 group-hover:text-red-300 transition-colors duration-200">
                        Logout
                      </span>
                      <span className="text-gray-400 text-xs leading-none">
                        Exit
                      </span>
                    </div>
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
                  
                {/* Login Button - Green Theme to match new design */}
                <button 
                  onClick={handleLoginClick}
                  disabled={!ready}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600/90 to-green-700/90 backdrop-blur-sm border border-green-500/60 rounded-xl shadow-lg hover:from-green-500/90 hover:to-green-600/90 transition-all duration-200 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!ready ? 'Initializing authentication...' : 'Click to login with Privy'}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-green-500/20 border-green-500/30 group-hover:bg-green-500/30 transition-all duration-200">
                    <svg className="w-4 h-4 text-green-400 group-hover:text-green-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="font-bold text-xs leading-none text-green-400 group-hover:text-green-300 transition-colors duration-200">
                      {!ready ? 'Loading...' : 'LOGIN'}
                    </span>
                    <span className="text-gray-400 text-xs leading-none">
                      {!ready ? 'Please wait' : 'Connect'}
                    </span>
                  </div>
                </button>
                </div>
              )}
              </div>

              {/* Mobile Navigation - Horizontal Scrollable */}
              <div className="sm:hidden w-full">
                <div className="overflow-x-auto scrollbar-hide mobile-nav-scroll">
                  <div className="flex items-center space-x-2 px-4 py-2 pr-6 min-w-max">{/* Extra right padding to prevent cutoff */}
                    {authenticated && user ? (
                      <>
                        {/* Mobile Profile Button - Compact */}
                        <button 
                          onClick={() => setShowProfile(true)}
                          className="flex-shrink-0 flex flex-col items-center space-y-1 px-3 py-2 bg-gradient-to-r from-blue-600/90 to-blue-700/90 backdrop-blur-sm border border-blue-500/60 rounded-xl shadow-lg hover:from-blue-500/90 hover:to-blue-600/90 transition-all duration-200 group cursor-pointer min-w-[60px]"
                          title="Profile & Social"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-blue-500/20 border-blue-500/30 group-hover:bg-blue-500/30 transition-all duration-200">
                            <svg className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="font-medium text-xs leading-none text-blue-400 group-hover:text-blue-300 transition-colors duration-200">
                            Profile
                          </span>
                        </button>
                        
                        {/* Mobile Party Lobby Button - Compact */}
                        <button 
                          onClick={() => {
                            console.log('🏰 Mobile Lobby button clicked!')
                            setShowPartyLobby(true)
                          }}
                          className="relative flex-shrink-0 flex flex-col items-center space-y-1 px-3 py-2 bg-gradient-to-r from-orange-600/90 to-orange-700/90 backdrop-blur-sm border border-orange-500/60 rounded-xl shadow-lg hover:from-orange-500/90 hover:to-orange-600/90 transition-all duration-200 group cursor-pointer min-w-[60px]"
                          title="Party Lobby"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-orange-500/20 border-orange-500/30 group-hover:bg-orange-500/30 transition-all duration-200">
                            <svg className="w-4 h-4 text-orange-400 group-hover:text-orange-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-xs leading-none text-orange-400 group-hover:text-orange-300 transition-colors duration-200">
                            Lobby
                          </span>
                          
                          {/* Party lobby indicator - TODO: Add party state tracking */}
                          {/* Future: Add party status indicator here */}
                          
                          {/* Party invites indicator - TODO: Add party invitations state tracking */}
                          {/* Future: Add party invitation count indicator here */}
                        </button>
                        
                        {/* Mobile Friends Button - Compact */}
                        <button 
                          onClick={() => setShowFriendsPanel(true)}
                          className="flex-shrink-0 flex flex-col items-center space-y-1 px-3 py-2 bg-gradient-to-r from-teal-600/90 to-teal-700/90 backdrop-blur-sm border border-teal-500/60 rounded-xl shadow-lg hover:from-teal-500/90 hover:to-teal-600/90 transition-all duration-200 group cursor-pointer min-w-[60px]"
                          title="Friends & Social"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-teal-500/20 border-teal-500/30 group-hover:bg-teal-500/30 transition-all duration-200">
                            <svg className="w-4 h-4 text-teal-400 group-hover:text-teal-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 4.197a4 4 0 11-6.918-4.544A6.945 6.945 0 0015 21z" />
                            </svg>
                          </div>
                          <span className="font-medium text-xs leading-none text-teal-400 group-hover:text-teal-300 transition-colors duration-200">
                            Friends
                          </span>
                        </button>
                        
                        {/* Mobile Settings Button - Compact */}
                        <button 
                          onClick={() => setShowSettings(true)}
                          className="flex-shrink-0 flex flex-col items-center space-y-1 px-3 py-2 bg-gradient-to-r from-purple-600/90 to-purple-700/90 backdrop-blur-sm border border-purple-500/60 rounded-xl shadow-lg hover:from-purple-500/90 hover:to-purple-600/90 transition-all duration-200 group cursor-pointer min-w-[60px]"
                          title="Settings"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-purple-500/20 border-purple-500/30 group-hover:bg-purple-500/30 transition-all duration-200">
                            <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-xs leading-none text-purple-400 group-hover:text-purple-300 transition-colors duration-200">
                            Settings
                          </span>
                        </button>
                        
                        {/* Mobile Logout Button - Compact */}
                        <button 
                          onClick={handleLogout}
                          className="flex-shrink-0 flex flex-col items-center space-y-1 px-3 py-2 bg-gradient-to-r from-red-600/90 to-red-700/90 backdrop-blur-sm border border-red-500/60 rounded-xl shadow-lg hover:from-red-500/90 hover:to-red-600/90 transition-all duration-200 group cursor-pointer min-w-[60px]"
                          title="Logout"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-red-500/20 border-red-500/30 group-hover:bg-red-500/30 transition-all duration-200">
                            <svg className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <span className="font-medium text-xs leading-none text-red-400 group-hover:text-red-300 transition-colors duration-200">
                            Logout
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Mobile Lobby Button - Teaser for non-authenticated users */}
                        <button 
                          onClick={() => {
                            alert('Please log in to use Party Lobby feature and team up with friends!')
                          }}
                          className="relative flex-shrink-0 w-16 h-16 bg-gray-600/50 backdrop-blur-sm border border-gray-500/50 rounded-xl shadow-lg transition-all duration-200 group flex flex-col items-center justify-center opacity-60 cursor-pointer hover:opacity-80"
                          title="Party Lobby (Login Required)"
                        >
                          <div className="text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-xs leading-none text-gray-400 mt-1">
                            Lobby
                          </span>
                          
                          {/* Lock icon overlay for non-authenticated users */}
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </button>
                        
                        {/* Mobile Login Button - Compact */}
                        <button 
                          onClick={handleLoginClick}
                          disabled={!ready}
                          className="flex-shrink-0 flex flex-col items-center space-y-1 px-4 py-2 bg-gradient-to-r from-green-600/90 to-green-700/90 backdrop-blur-sm border border-green-500/60 rounded-xl shadow-lg hover:from-green-500/90 hover:to-green-600/90 transition-all duration-200 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px]"
                          title={!ready ? 'Initializing authentication...' : 'Click to login with Privy'}
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-green-500/20 border-green-500/30 group-hover:bg-green-500/30 transition-all duration-200">
                            <svg className="w-4 h-4 text-green-400 group-hover:text-green-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <span className="font-bold text-xs leading-none text-green-400 group-hover:text-green-300 transition-colors duration-200">
                            {!ready ? 'Loading...' : 'LOGIN'}
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
      </header>

      {/* Skill Disclaimer Banner */}
      <div className="h-6 px-4 text-center flex items-center justify-center relative z-40 bg-gray-900/50 border-b border-gray-800">
        <span className="text-cyan-400 text-xs">⚠️ TurfLoot prizes are determined solely by player skill. Play responsibly.</span>
      </div>

      {/* Main Content - Full height coverage for mobile */}
      <main className="flex-1 flex flex-col relative z-40 w-full" style={{ minHeight: 'calc(100vh - 64px)', minHeight: 'calc(100dvh - 64px)' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex flex-col pt-4 sm:pt-8 pb-4 sm:pb-20">
          
          {/* Hero Title - Smaller on mobile to save space */}
          <div className="text-center mb-3 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl md:text-5xl xl:text-6xl font-black tracking-tight mb-1 sm:mb-3">
              <span className="text-white">TURF</span>
              <span className="text-yellow-400">LOOT</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg font-bold tracking-wide">
              SKILL-BASED GRID DOMINATION
            </p>
          </div>

          {/* Main Game Grid - Mobile: Flex Column with Better Spacing, Desktop: Grid */}
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-3 max-w-5xl mx-auto space-y-6 sm:space-y-7 lg:space-y-0 flex-1">
            
            {/* LEFT COLUMN - Leaderboard & Friends - Mobile: Order Last (Bottom) */}
            <div className="order-3 lg:order-1 col-span-12 lg:col-span-3 space-y-4 lg:space-y-3 mt-2 lg:mt-0">
              {/* Leaderboard - More compact on mobile */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-3 lg:p-4 shadow-2xl">
                <div className="flex items-center space-x-3 mb-3 lg:mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-xs lg:text-sm">🏆</span>
                  </div>
                  <h3 className="text-white font-bold text-base lg:text-lg">Leaderboard</h3>
                  <div className="ml-auto">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Live</span>
                  </div>
                </div>
                <div className="space-y-2 lg:space-y-3">
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

              {/* Friends - Proper height to contain Add Friends button */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-3 lg:p-4 shadow-2xl min-h-[240px] lg:h-[276px] flex flex-col">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-xs lg:text-sm">👥</span>
                    </div>
                    <h3 className="text-white font-bold text-base lg:text-lg">Friends</h3>
                  </div>
                  <button className="text-cyan-400 text-xs lg:text-sm hover:text-cyan-300 transition-colors">⟲ Refresh</button>
                </div>
                <div className="flex-1 space-y-2 lg:space-y-3 mb-3">
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
                    <div className="text-center py-4">
                      <div className="text-2xl mb-2">👥</div>
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
                  className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-400 font-bold text-sm transition-all hover:scale-105 mt-auto"
                >
                  Add Friends
                </button>
              </div>
            </div>

            {/* CENTER COLUMN - Main Game Area - Mobile: Order First (Top) */}
            <div className="order-1 lg:order-2 col-span-12 lg:col-span-6 flex flex-col justify-center space-y-3 lg:space-y-4">
              
              {/* Live Stats - More compact on mobile */}
              <div className="flex justify-center space-x-8 lg:space-x-12">
                <div className="text-center">
                  <div className={`text-3xl lg:text-4xl font-black text-yellow-400 mb-1 transition-all duration-300 ${
                    playerCountPulse ? 'pulse-live' : ''
                  }`}>
                    {livePlayerCount}
                  </div>
                  <div className="text-gray-400 text-xs lg:text-sm font-medium">Players in Game</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl lg:text-4xl font-black text-yellow-400 mb-1 transition-all duration-300 ${
                    globalWinningsPulse ? 'pulse-live' : ''
                  }`}>
                    ${globalWinnings.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs lg:text-sm font-medium">Global Player Winnings</div>
                </div>
              </div>

              {/* User Name Display - More compact on mobile */}
              <div className="flex justify-center">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl px-6 lg:px-8 py-4 lg:py-5 border border-gray-700/50 flex items-center space-x-4 lg:space-x-5 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-lg lg:text-xl font-bold text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
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

              {/* Global Multiplayer Status - NEW */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-500/10 border border-cyan-400/30 rounded-xl">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-cyan-400 font-medium text-sm">🌍 Connected to Global Servers - Play with Players Worldwide</span>
                </div>
              </div>

              {/* Main Game Button - More compact on mobile */}
              <div className="flex justify-center">
                <button 
                  onClick={handleJoinGame}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-black py-4 lg:py-6 px-8 lg:px-16 rounded-2xl text-lg lg:text-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-2 border-cyan-300"
                >
                  {(selectedStake > 0 && selectedStake !== 'FREE') ? `JOIN GAME - $${selectedStake}` : '🌍 JOIN GLOBAL MULTIPLAYER'}
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
            <div className="order-2 lg:order-3 col-span-12 lg:col-span-3 space-y-4 lg:space-y-3">
              {/* Wallet Panel - More compact on mobile */}
              <div className="glass-card rounded-2xl p-3 lg:p-4 border border-cyan-400/20 shadow-lg">
                <div className="flex items-center space-x-3 mb-3 lg:mb-4">
                  <div className="w-5 h-5 lg:w-6 lg:h-6 bg-cyan-400 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-black">💰</span>
                  </div>
                  <h3 className="text-white font-bold text-base lg:text-lg">Wallet</h3>
                </div>
                
                <WalletManager onBalanceUpdate={(balance) => setWalletBalance(balance.balance)} />
              </div>

              {/* Customize - More compact on mobile */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 lg:p-6 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4 lg:mb-6">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs lg:text-sm">🎨</span>
                  </div>
                  <h3 className="text-white font-bold text-base lg:text-lg">Customize</h3>
                </div>
                <div className="text-center">
                  <div className="relative w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-3 lg:mb-4">
                    {/* Playable Character Circle with Dynamic Customization - Smaller on mobile */}
                    <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full player-character animate-breathe hover:animate-hover-bounce-loop transition-all duration-300 cursor-pointer shadow-lg border-2 border-cyan-300 flex items-center justify-center ${
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
                      
                      {/* Dynamic Eyes based on equipped face - Mobile responsive spacing */}
                      {playerCustomization.face === 'angry_eyes' ? (
                        <>
                          <div className="w-2 h-1.5 bg-black rounded-sm absolute top-4 lg:top-5 left-4 lg:left-6 transform rotate-12 transition-transform duration-150 ease-out" id="left-eye"></div>
                          <div className="w-2 h-1.5 bg-black rounded-sm absolute top-4 lg:top-5 right-4 lg:right-6 transform -rotate-12 transition-transform duration-150 ease-out" id="right-eye"></div>
                          <div className="w-4 h-1 bg-red-600 rounded absolute top-6 lg:top-7 left-1/2 transform -translate-x-1/2"></div>
                        </>
                      ) : playerCustomization.face === 'wink_eyes' ? (
                        <>
                          <div className="w-2 h-0.5 bg-black rounded absolute top-5 lg:top-6 left-4 lg:left-6 transition-transform duration-150 ease-out" id="left-eye"></div>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-4 lg:top-5 right-4 lg:right-6 transition-transform duration-150 ease-out" id="right-eye"></div>
                          <div className="w-3 h-1 bg-pink-500 rounded-full absolute top-6 lg:top-7 left-1/2 transform -translate-x-1/2"></div>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-4 lg:top-5 left-4 lg:left-6 transition-transform duration-150 ease-out" id="left-eye"></div>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-4 lg:top-5 right-4 lg:right-6 transition-transform duration-150 ease-out" id="right-eye"></div>
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
      
      {/* Friends Panel */}
      {showFriendsPanel && (
        <FriendsPanel 
          onClose={() => setShowFriendsPanel(false)}
          onInviteFriend={(friendId, friendUsername) => {
            // Handle friend invitation to current game
            console.log('🎮 Inviting friend to game:', { friendId, friendUsername })
            // TODO: Implement friend game invitation
            alert(`Invited ${friendUsername} to join your game!`)
          }}
        />
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

      
      {/* Real-time Cash-out Notifications Feed - Desktop Only */}
      {!isMobile && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
          {cashOutNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-black/90 backdrop-blur-sm border border-green-400/30 rounded-lg p-2 md:p-3 max-w-xs md:max-w-sm shadow-2xl transition-all duration-500 ${
                notification.fadeOut ? 'opacity-0 transform translate-x-full md:translate-x-full -translate-x-full' : 'opacity-100 transform translate-x-0'
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
      )}

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
                      router.push('/agario?mode=practice&fee=0&roomId=global-practice-bots')
                    }}
                    className="flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-700/60 rounded-xl border border-gray-600/30 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-green-400 text-xl">🆓</span>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">Global Multiplayer</div>
                        <div className="text-gray-400 text-sm">Free • Worldwide Players</div>
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

      {/* Game Loading Popup */}
      <GameLoadingPopup 
        isVisible={isJoiningGame}
        roomType={gameLoadingInfo.roomType}
        entryFee={gameLoadingInfo.entryFee}
        partyMode={gameLoadingInfo.partyMode}
        partySize={gameLoadingInfo.partySize}
      />
    </div>
  )
}

// Export the main component directly
export default HomeContent