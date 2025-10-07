'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Client } from 'colyseus.js'
import { usePrivy } from '../../frontend/utils/privyClient'

// Global connection tracker to prevent duplicates across component instances
const GLOBAL_CONNECTION_TRACKER = {
  activeConnection: null,
  isConnecting: false,
  userId: null,
  lastPlayerName: null
}

const MultiplayerArena = () => {
  console.log('🎮 MULTIPLAYER ARENA - Pure Colyseus multiplayer mode with game mechanics')
  
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const wsRef = useRef(null)
  const isConnectingRef = useRef(false) // Track connection state to prevent duplicates
  const componentIdRef = useRef(Math.random().toString(36).substring(7)) // Unique component ID for debugging
  const lastInputTimeRef = useRef(0) // For input throttling
  const inputThrottleMs = 16 // ~60fps input rate (like agario)
  
  // Privy authentication
  const { ready, authenticated, user, login } = usePrivy()
  
  // Player name state that updates when localStorage changes
  const [playerName, setPlayerName] = useState('Anonymous Player')
  
  // Core game states
  const [gameReady, setGameReady] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [playerCount, setPlayerCount] = useState(0)
  const [mass, setMass] = useState(25) // Fixed to match server starting mass
  const [score, setScore] = useState(0)
  const [serverState, setServerState] = useState(null)
  const [timeSurvived, setTimeSurvived] = useState(0)
  const [eliminations, setEliminations] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameOverDetails, setGameOverDetails] = useState({
    finalScore: 0,
    finalMass: 0,
    eliminatedBy: ''
  })

  // Cash out system - ported from agario
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutComplete, setCashOutComplete] = useState(false)
  const [showCashOutSuccessModal, setShowCashOutSuccessModal] = useState(false)
  const [gameStats, setGameStats] = useState({ timeStarted: Date.now(), eliminations: 0 })
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState(10)
  const [showLoadingModal, setShowLoadingModal] = useState(false)
  const cashOutIntervalRef = useRef(null)

  const gameStatsRef = useRef(gameStats)

  // Mission system - ported from agario  
  const [currency, setCurrency] = useState(0)
  const [completedMissions, setCompletedMissions] = useState([])
  const [activeMissions, setActiveMissions] = useState([])
  const [missionPopupVisible, setMissionPopupVisible] = useState(false)
  const [missionPopupCondensed, setMissionPopupCondensed] = useState(false)
  const [completedMissionsLoaded, setCompletedMissionsLoaded] = useState(false)
  const [missionRunCompleted, setMissionRunCompleted] = useState(false)
  const [missionCompletionIndicator, setMissionCompletionIndicator] = useState(null)

  // Mobile detection and UI states
  const [isMobile, setIsMobile] = useState(false)
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false)
  const leaderboardTimerRef = useRef(null)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const statsTimerRef = useRef(null)

  // Live latency tracking
  const [pingMs, setPingMs] = useState(null)
  const pingSentAtRef = useRef(null)
  const pingIntervalRef = useRef(null)

  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  const resetPingState = useCallback((clearValue = true) => {
    pingSentAtRef.current = null
    if (clearValue) {
      setPingMs(null)
    }
  }, [])

  const initializePingMeasurement = useCallback((room) => {
    if (!room) {
      return
    }

    if (!room.__arenaPingListenerAttached) {
      room.onMessage('pong', (message) => {
        const now = Date.now()
        const clientTimestamp = message?.clientTimestamp ?? message?.timestamp ?? pingSentAtRef.current

        if (clientTimestamp) {
          const latency = Math.max(0, Math.round(now - clientTimestamp))
          setPingMs(latency)
        }
      })
      room.__arenaPingListenerAttached = true
    }

    const sendPing = () => {
      try {
        const websocket = room?.connection?.transport?.ws
        const isOpen = websocket?.readyState === WebSocket.OPEN || room?.connection?.isConnected

        if (isOpen) {
          const timestamp = Date.now()
          pingSentAtRef.current = timestamp
          room.send('ping', { timestamp })
        }
      } catch (error) {
        console.warn('⚠️ Failed to send ping:', error)
      }
    }

    clearPingInterval()
    sendPing()

    const intervalId = setInterval(sendPing, 2000)
    pingIntervalRef.current = intervalId
  }, [clearPingInterval])
  
  // Virtual joystick state for mobile
  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 })
  const joystickRef = useRef(null)
  const joystickKnobRef = useRef(null)

  // Minimap state for real-time updates
  const [minimapData, setMinimapData] = useState({
    playerX: 2000,
    playerY: 2000,
    enemies: [],
    coins: [],
    viruses: []
  })
  
  // Input handling
  const inputSequenceRef = useRef(0)
  const lastInputRef = useRef({ dx: 0, dy: 0 })
  const continuousInputIntervalRef = useRef(null)

  const missionCondenseTimeoutRef = useRef(null)
  const currencyLoadedRef = useRef(false)
  const activeMissionsRef = useRef([])
  const missionStatsRef = useRef({
    initialized: false,
    score: 0,
    massRaw: 25,
    massRounded: 25,
    maxMassAchieved: 25
  })
  
  // Mission definitions - ported from agario
  const missionTypes = useMemo(() => ([
    { id: 'collect_coins_10', name: 'Coin Hunter I', description: 'Collect 10 coins', target: 10, reward: 50, icon: '🪙' },
    { id: 'collect_coins_25', name: 'Coin Hunter II', description: 'Collect 25 coins', target: 25, reward: 100, icon: '🪙' },
    { id: 'collect_coins_50', name: 'Coin Master', description: 'Collect 50 coins', target: 50, reward: 200, icon: '💰' },
    { id: 'reach_mass_50', name: 'Growing Strong', description: 'Reach 50 mass', target: 50, reward: 75, icon: '💪' },
    { id: 'reach_mass_100', name: 'Heavy Weight', description: 'Reach 100 mass', target: 100, reward: 150, icon: '🏋️' },
    { id: 'eliminate_1', name: 'First Blood', description: 'Eliminate 1 enemy', target: 1, reward: 100, icon: '⚔️' },
    { id: 'eliminate_3', name: 'Warrior', description: 'Eliminate 3 enemies', target: 3, reward: 250, icon: '🗡️' },
    { id: 'survive_60', name: 'Survivor', description: 'Survive for 60 seconds', target: 60, reward: 100, icon: '⏰' },
    { id: 'survive_120', name: 'Endurance', description: 'Survive for 120 seconds', target: 120, reward: 200, icon: '🕐' }
  ]), [])

  const visibleMissions = useMemo(() => {
    return activeMissions.filter(mission => !mission.completed && !completedMissions.includes(mission.id))
  }, [activeMissions, completedMissions])
  const missionsToDisplay = useMemo(() => visibleMissions.slice(0, 1), [visibleMissions])
  const activeMissionCount = missionsToDisplay.length
  const hasActiveMissions = activeMissionCount > 0
  const showMissionCompletion = Boolean(missionCompletionIndicator && !hasActiveMissions)
  const shouldRenderMissionPopup = (missionPopupVisible && (hasActiveMissions || missionPopupCondensed)) || showMissionCompletion

  const getPingColor = useCallback((latency) => {
    if (latency == null) return '#6b7280'
    if (latency <= 60) return '#10b981'
    if (latency <= 120) return '#f59e0b'
    return '#ef4444'
  }, [])

  const pingIndicatorColor = useMemo(() => {
    if (connectionStatus === 'connected') {
      return getPingColor(pingMs)
    }
    if (connectionStatus === 'connecting') {
      return '#f59e0b'
    }
    if (connectionStatus === 'failed' || connectionStatus === 'disconnected') {
      return '#ef4444'
    }
    if (connectionStatus === 'eliminated') {
      return pingMs == null ? '#6b7280' : getPingColor(pingMs)
    }
    return '#6b7280'
  }, [connectionStatus, getPingColor, pingMs])

  const pingDisplayText = useMemo(() => {
    if (connectionStatus === 'connecting') {
      return 'Connecting…'
    }
    if (connectionStatus === 'failed') {
      return 'Error'
    }
    if (connectionStatus === 'disconnected') {
      return 'Offline'
    }
    return pingMs == null ? 'Measuring…' : `${pingMs}ms`
  }, [connectionStatus, pingMs])

  const pingSubtitle = useMemo(() => {
    if (connectionStatus === 'connecting') {
      return 'Establishing arena link'
    }
    if (connectionStatus === 'failed') {
      return 'Connection failed'
    }
    if (connectionStatus === 'disconnected') {
      return 'Reconnecting…'
    }
    if (connectionStatus === 'eliminated') {
      return pingMs == null ? 'Eliminated' : 'Spectator latency'
    }
    return pingMs == null ? 'Measuring latency' : ''
  }, [connectionStatus, pingMs])
  
  // Parse URL parameters and get authenticated user data
  const roomId = searchParams.get('roomId') || 'global-turfloot-arena'
  
  const privyUserId = user?.id || null
  const walletAddress = user?.wallet?.address
  const emailAddress = user?.email?.address
  const missionStorageKey = useMemo(() => (
    privyUserId ? `arena_completed_missions_${privyUserId}` : 'arena_completed_missions_guest'
  ), [privyUserId])

  const getCurrencyStorageConfig = useCallback(() => {
    if (authenticated && user) {
      const identifier = walletAddress || emailAddress || user?.id || 'unknown'
      return {
        key: `userCurrency_${identifier}`,
        defaultValue: 100
      }
    }

    return {
      key: 'guestCurrency',
      defaultValue: 0
    }
  }, [authenticated, emailAddress, user, walletAddress])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    setCompletedMissionsLoaded(false)

    let storedMissions = []
    try {
      const storedValue = window.localStorage.getItem(missionStorageKey)
      if (storedValue) {
        const parsed = JSON.parse(storedValue)
        if (Array.isArray(parsed)) {
          storedMissions = parsed
        }
      }
    } catch (error) {
      console.error('❌ Failed to load completed missions from storage:', error)
    }

    setCompletedMissions(storedMissions)
    setCompletedMissionsLoaded(true)
  }, [missionStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const { key, defaultValue } = getCurrencyStorageConfig()
    const sanitizedDefault = Number.isFinite(defaultValue) ? defaultValue : 0

    let nextCurrency = sanitizedDefault

    try {
      const storedValue = window.localStorage.getItem(key)
      if (storedValue !== null) {
        const parsed = parseInt(storedValue, 10)
        if (!Number.isNaN(parsed)) {
          nextCurrency = parsed
        } else {
          window.localStorage.removeItem(key)
        }
      } else {
        window.localStorage.setItem(key, sanitizedDefault.toString())
      }
    } catch (error) {
      console.error('❌ Failed to load mission currency from storage:', error)
      nextCurrency = sanitizedDefault
    }

    setCurrency(nextCurrency)
    currencyLoadedRef.current = true
  }, [getCurrencyStorageConfig])

  useEffect(() => {
    if (typeof window === 'undefined' || !currencyLoadedRef.current) {
      return
    }

    const { key } = getCurrencyStorageConfig()
    const numericCurrency = Number.isFinite(currency) ? currency : 0
    const sanitizedCurrency = Math.max(0, Math.floor(numericCurrency))

    try {
      window.localStorage.setItem(key, sanitizedCurrency.toString())
      window.dispatchEvent(new CustomEvent('turfloot:currencyUpdated', {
        detail: { currency: sanitizedCurrency }
      }))
    } catch (error) {
      console.error('❌ Failed to persist mission currency to storage:', error)
    }
  }, [currency, getCurrencyStorageConfig])

  useEffect(() => {
    activeMissionsRef.current = activeMissions
  }, [activeMissions])

  useEffect(() => {
    gameStatsRef.current = gameStats
  }, [gameStats])

  const updateMissionProgress = useCallback((type, value) => {
    const missions = activeMissionsRef.current
    if (!missions || missions.length === 0) {
      return
    }

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) {
      return
    }

    let rewardDelta = 0
    let missionChanged = false
    let completedMissionPayload = null

    setActiveMissions(prev => {
      if (!prev || prev.length === 0) {
        return prev
      }

      const nextMissions = prev.map(mission => {
        if (!mission || mission.completed) {
          return mission
        }

        const currentProgress = Number.isFinite(mission.progress) ? mission.progress : 0
        let newProgress = currentProgress
        let shouldComplete = false

        switch (type) {
          case 'coin_collected': {
            if (mission.id.includes('collect_coins')) {
              const increment = Math.max(0, Math.floor(numericValue))
              if (increment > 0) {
                newProgress = Math.min(mission.target, currentProgress + increment)
                shouldComplete = newProgress >= mission.target
              }
            }
            break
          }
          case 'mass_reached': {
            if (mission.id.includes('reach_mass')) {
              const roundedValue = Math.max(0, Math.floor(numericValue))
              newProgress = Math.max(currentProgress, roundedValue)
              shouldComplete = newProgress >= mission.target
            }
            break
          }
          case 'survival_time': {
            if (mission.id.includes('survive')) {
              const roundedValue = Math.max(0, Math.floor(numericValue))
              newProgress = Math.max(currentProgress, roundedValue)
              shouldComplete = newProgress >= mission.target
            }
            break
          }
          case 'elimination': {
            if (mission.id.includes('eliminate')) {
              const increment = Math.max(0, Math.floor(numericValue))
              if (increment > 0) {
                newProgress = Math.min(mission.target, currentProgress + increment)
                shouldComplete = newProgress >= mission.target
              }
            }
            break
          }
          default:
            break
        }

        if (shouldComplete && !mission.completed) {
          rewardDelta += mission.reward || 0
          missionChanged = true
          if (!completedMissionPayload) {
            completedMissionPayload = {
              id: mission.id,
              name: mission.name,
              reward: mission.reward || 0
            }
          }
          return { ...mission, progress: newProgress, completed: true }
        }

        if (newProgress !== currentProgress) {
          missionChanged = true
          return { ...mission, progress: newProgress }
        }

        return mission
      })

      return missionChanged ? nextMissions : prev
    })

    if (missionChanged) {
      if (rewardDelta > 0) {
        setCurrency(prev => {
          const current = Number.isFinite(prev) ? prev : 0
          return Math.max(0, current + rewardDelta)
        })
      }
      if (completedMissionPayload) {
        setMissionCompletionIndicator(completedMissionPayload)
        setMissionPopupVisible(true)
        setMissionPopupCondensed(true)
      }
      console.log('🎯 Mission progress updated:', { type, value: numericValue, rewardDelta })
    }
  }, [setActiveMissions, setCurrency])

  useEffect(() => {
    if (!completedMissionsLoaded || typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(missionStorageKey, JSON.stringify(completedMissions))
    } catch (error) {
      console.error('❌ Failed to persist completed missions to storage:', error)
    }
  }, [completedMissions, completedMissionsLoaded, missionStorageKey])

  useEffect(() => {
    if (activeMissions.length === 0) {
      return
    }

    const newlyCompleted = activeMissions
      .filter(mission => mission.completed && !completedMissions.includes(mission.id))
      .map(mission => mission.id)

    if (newlyCompleted.length === 0) {
      return
    }

    setCompletedMissions(prev => {
      const deduped = newlyCompleted.filter(id => !prev.includes(id))
      if (deduped.length === 0) {
        return prev
      }
      return [...prev, ...deduped]
    })
    setMissionRunCompleted(true)
  }, [activeMissions, completedMissions])
  
  // Function to get current player display name
  const getCurrentPlayerName = () => {
    // First, check for custom username from landing page
    if (user?.id) {
      const userKey = `turfloot_username_${user.id.slice(0, 10)}`
      const customUsername = localStorage.getItem(userKey) || localStorage.getItem('turfloot_auth_username')
      if (customUsername) {
        console.log('🎯 Using custom username from landing page:', customUsername)
        return customUsername
      }
    }
    
    // Fallback to Privy data or default
    const fallbackName = user?.discord?.username || user?.twitter?.username || user?.google?.name || user?.wallet?.address?.slice(0, 8) || 'Anonymous Player'
    console.log('🎯 Using fallback username:', fallbackName)
    return fallbackName
  }
  
  // Update playerName state when user data is available
  useEffect(() => {
    if (user?.id) {
      const currentName = getCurrentPlayerName()
      setPlayerName(currentName)
    }
  }, [user?.id, user?.discord?.username, user?.twitter?.username, user?.google?.name, user?.wallet?.address])

  useEffect(() => {
    if (!gameOver) {
      return
    }

    if (gameRef.current) {
      gameRef.current.stop()
    }

    lastInputRef.current = { dx: 0, dy: 0 }

    setJoystickActive(false)
    setJoystickPosition({ x: 0, y: 0 })

    if (cashOutIntervalRef.current) {
      clearInterval(cashOutIntervalRef.current)
      cashOutIntervalRef.current = null
    }
  }, [gameOver])
  
  // Listen for localStorage changes to detect username updates from landing page
  useEffect(() => {
    const handleStorageChange = () => {
      if (user?.id) {
        const updatedName = getCurrentPlayerName()
        if (updatedName !== playerName) {
          console.log('🔄 Username change detected in localStorage:', playerName, '->', updatedName)
          setPlayerName(updatedName)
        }
      }
    }

    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange)

    // Also check periodically for changes in same tab (localStorage doesn't fire storage event for same tab)
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [user?.id, playerName])

  useEffect(() => {
    if (!gameReady || !completedMissionsLoaded || missionRunCompleted || activeMissions.length > 0) {
      return
    }

    const availableMissions = missionTypes.filter(mission => !completedMissions.includes(mission.id))

    if (availableMissions.length === 0) {
      if (missionCompletionIndicator) {
        setMissionPopupVisible(true)
        setMissionPopupCondensed(true)
      } else {
        setMissionPopupVisible(false)
        setMissionPopupCondensed(false)
      }
      return
    }

    const shuffled = [...availableMissions].sort(() => 0.5 - Math.random())
    const selected = shuffled
      .slice(0, Math.min(1, shuffled.length))
      .map(mission => ({
        ...mission,
        progress: mission.progress || 0,
        completed: mission.completed || false
      }))

    setActiveMissions(selected)
    setMissionCompletionIndicator(null)
    setMissionPopupVisible(true)
    setMissionPopupCondensed(false)
  }, [
    gameReady,
    missionRunCompleted,
    completedMissions,
    activeMissions.length,
    missionTypes,
    completedMissionsLoaded,
    missionCompletionIndicator
  ])

  useEffect(() => {
    if (!gameReady || completedMissions.length === 0) {
      return
    }

    setActiveMissions(prev => {
      const filtered = prev.filter(mission => !completedMissions.includes(mission.id))
      if (filtered.length === prev.length) {
        return prev
      }
      return filtered
    })
  }, [gameReady, completedMissions])

  useEffect(() => {
    if (!missionPopupVisible) {
      return
    }

    if (visibleMissions.length === 0) {
      if (missionCompletionIndicator) {
        setMissionPopupCondensed(true)
        return
      }

      setMissionPopupVisible(false)
      setMissionPopupCondensed(false)
    }
  }, [visibleMissions.length, missionPopupVisible, missionCompletionIndicator])

  useEffect(() => {
    if (!missionPopupVisible || missionPopupCondensed || visibleMissions.length === 0) {
      return
    }

    if (missionCondenseTimeoutRef.current) {
      clearTimeout(missionCondenseTimeoutRef.current)
    }

    missionCondenseTimeoutRef.current = setTimeout(() => {
      setMissionPopupCondensed(true)
      missionCondenseTimeoutRef.current = null
    }, 5000)

    return () => {
      if (missionCondenseTimeoutRef.current) {
        clearTimeout(missionCondenseTimeoutRef.current)
        missionCondenseTimeoutRef.current = null
      }
    }
  }, [missionPopupVisible, missionPopupCondensed, visibleMissions.length])

  useEffect(() => {
    if (missionPopupVisible) {
      return
    }

    if (missionCondenseTimeoutRef.current) {
      clearTimeout(missionCondenseTimeoutRef.current)
      missionCondenseTimeoutRef.current = null
    }

    setMissionPopupCondensed(false)
  }, [missionPopupVisible])

  useEffect(() => {
    return () => {
      if (missionCondenseTimeoutRef.current) {
        clearTimeout(missionCondenseTimeoutRef.current)
      }
    }
  }, [])

  const handleMissionCondense = () => {
    setMissionPopupCondensed(true)
    if (missionCondenseTimeoutRef.current) {
      clearTimeout(missionCondenseTimeoutRef.current)
      missionCondenseTimeoutRef.current = null
    }
  }

  const handleMissionExpand = () => {
    if (visibleMissions.length === 0) {
      return
    }

    if (missionCondenseTimeoutRef.current) {
      clearTimeout(missionCondenseTimeoutRef.current)
      missionCondenseTimeoutRef.current = null
    }

    setMissionPopupCondensed(false)
    setMissionPopupVisible(true)
  }

  console.log('🎮 Arena parameters:')
  console.log('  - roomId:', roomId)  
  console.log('  - authenticated user:', !!user)
  console.log('  - privyUserId (from Privy):', privyUserId)

  // Authentication loading state
  const [authMessage, setAuthMessage] = useState('')
  
  // Selected skin from landing page customization
  const [selectedSkin, setSelectedSkin] = useState({
    id: 'default',
    name: 'Default Warrior',
    color: '#4A90E2',
    type: 'circle',
    pattern: 'solid'
  })
  const [selectedSkinLoaded, setSelectedSkinLoaded] = useState(false)
  const normalizedSelectedSkin = useMemo(() => ({
    id: selectedSkin?.id || 'default',
    name: selectedSkin?.name || 'Default Warrior',
    color: selectedSkin?.color || '#4A90E2',
    type: selectedSkin?.type || 'circle',
    pattern: selectedSkin?.pattern || 'solid'
  }), [
    selectedSkin?.id,
    selectedSkin?.name,
    selectedSkin?.color,
    selectedSkin?.type,
    selectedSkin?.pattern
  ])

  // Load selected skin from localStorage
  useEffect(() => {
    const savedSkin = localStorage.getItem('selectedSkin')
    if (savedSkin) {
      try {
        const parsedSkin = JSON.parse(savedSkin)
        setSelectedSkin(parsedSkin)
        console.log('🎨 Loaded selected skin for arena:', parsedSkin)
      } catch (error) {
        console.log('❌ Error loading saved skin:', error)
      }
    }
    setSelectedSkinLoaded(true)
  }, [])

  // Authentication check - redirect to login if not authenticated with user feedback
  useEffect(() => {
    if (!selectedSkinLoaded) {
      console.log('⏳ Waiting for selected skin before initializing arena connection')
      return
    }

    if (!ready) {
      setAuthMessage('🔒 Checking authentication...')
      return
    }

    if (ready && !authenticated) {
      console.log('❌ User not authenticated - redirecting to login')
      console.log('🔗 To access the arena, please login first at the main page')
      setAuthMessage('❌ Authentication required! Redirecting to login...')
      // Add a slight delay to show feedback before redirect
      const timer = setTimeout(() => {
        router.push('/?auth_required=arena')
      }, 2000)
      return () => clearTimeout(timer)
    }
    
    if (ready && authenticated && !user?.id) {
      console.log('❌ User authenticated but no user ID - redirecting to home')
      setAuthMessage('❌ Authentication error! Redirecting...')
      const timer = setTimeout(() => {
        router.push('/?auth_error=no_user_id')
      }, 2000)
      return () => clearTimeout(timer)
    }

    if (ready && authenticated && user?.id) {
      setAuthMessage('✅ Authentication successful! Loading arena...')
    }
  }, [ready, authenticated, user, router, selectedSkinLoaded])

  // Handle cash out functionality - ported from agario
  const handleCashOut = () => {
    if (gameOver) {
      console.log('⚠️ Cash out ignored - player eliminated')
      return
    }

    if (!isCashingOut && !cashOutComplete && gameReady) {
      console.log('Starting cash out process via button')
      setIsCashingOut(true)
      setCashOutProgress(0)
    } else if (isCashingOut) {
      console.log('Canceling cash out via button')
      setIsCashingOut(false)
      setCashOutProgress(0)
      if (cashOutIntervalRef.current) {
        clearInterval(cashOutIntervalRef.current)
        cashOutIntervalRef.current = null
      }
    }
  }

  // Handle split functionality - ported from agario with improved error handling
  const handleSplit = (e) => {
    console.log('🎯 handleSplit called - checking initial conditions...')

    if (gameOver) {
      console.log('⚠️ Split ignored - player eliminated')
      return
    }

    if (!gameRef.current || !gameReady || !wsRef.current || !wsRef.current.sessionId) {
      console.log('❌ Split denied - initial conditions not met:', {
        gameRef: !!gameRef.current,
        gameReady,
        wsRef: !!wsRef.current,
        sessionId: wsRef.current?.sessionId,
        reason: !gameRef.current ? 'No gameRef' : 
                !gameReady ? 'Game not ready' :
                !wsRef.current ? 'No wsRef' :
                !wsRef.current.sessionId ? 'No sessionId' : 'Unknown'
      })
      return
    }
    
    console.log('✅ Initial conditions passed - checking player mass...')
    
    // Check if player has sufficient mass to split (server requirement: >= 40)
    const playerMass = gameRef.current.player?.mass || 0;
    console.log('🎯 Player mass check:', {
      player: gameRef.current.player,
      mass: playerMass,
      hasPlayer: !!gameRef.current.player,
      massType: typeof playerMass,
      sufficient: playerMass >= 40
    });
    
    if (playerMass < 40) {
      console.log('⚠️ Split denied - insufficient mass:', playerMass, '< 40')
      
      // Show visual feedback to user
      const message = `Need ${40 - playerMass} more mass to split`
      console.log('📢 User feedback:', message)
      
      // Could add a toast notification here in the future
      return
    }
    
    console.log('✅ Mass requirement met:', playerMass, '>= 40')
    
    let targetX, targetY
    
    if (isMobile) {
      // Mobile: Use joystick direction for split
      if (joystickPosition.x !== 0 || joystickPosition.y !== 0) {
        const joystickAngle = Math.atan2(joystickPosition.y, joystickPosition.x)
        const splitDistance = 300
        
        targetX = gameRef.current.player.x + Math.cos(joystickAngle) * splitDistance
        targetY = gameRef.current.player.y + Math.sin(joystickAngle) * splitDistance
        
        console.log('🎮 Mobile split toward:', targetX.toFixed(1), targetY.toFixed(1))
      } else {
        console.log('⚠️ Mobile split denied - no joystick input')
        return
      }
    } else {
      // Desktop: Use mouse position for split with fallback
      if (gameRef.current.mouse && 
          typeof gameRef.current.mouse.worldX === 'number' && 
          typeof gameRef.current.mouse.worldY === 'number' &&
          isFinite(gameRef.current.mouse.worldX) &&
          isFinite(gameRef.current.mouse.worldY)) {
        
        targetX = gameRef.current.mouse.worldX
        targetY = gameRef.current.mouse.worldY
        
        console.log('🎮 Desktop split toward mouse:', targetX.toFixed(1), targetY.toFixed(1))
      } else {
        // Fallback: Split forward (right direction) if mouse coordinates are invalid
        console.log('⚠️ Invalid mouse coordinates, using fallback direction:', gameRef.current.mouse)
        console.log('🎮 Using fallback split direction: right')
        
        const fallbackDistance = 200
        targetX = gameRef.current.player.x + fallbackDistance
        targetY = gameRef.current.player.y
        
        console.log('🎮 Fallback split toward:', targetX.toFixed(1), targetY.toFixed(1))
      }
    }
    
    // Validate coordinates are reasonable numbers
    if (!isFinite(targetX) || !isFinite(targetY)) {
      console.log('⚠️ Split denied - invalid target coordinates:', targetX, targetY)
      return
    }
    
    // Send split command to multiplayer server with error handling and connection recovery
    try {
      console.log('📤 Sending split command to server:', { targetX, targetY })
      // Check Colyseus connection structure properly
      console.log('🔗 Colyseus connection check:', {
        wsRef: !!wsRef.current,
        sessionId: wsRef.current?.sessionId,
        hasWebSocket: !!wsRef.current?.connection,
        readyState: wsRef.current?.connection?.readyState,
        colyseusState: wsRef.current?.state,
        hasRoom: !!wsRef.current?.room
      })
      
      // Proper Colyseus connection validation
      if (!wsRef.current || !wsRef.current.sessionId) {
        console.log('❌ Split failed - no valid Colyseus session')
        return
      }
      
      // Send split message to server (server-authoritative approach)
      console.log('🚀 Sending split message to server')
      wsRef.current.send("split", { targetX, targetY })
      console.log('✅ Split message sent to server successfully')
    } catch (error) {
      console.error('❌ Error sending split message:', error)
      
      // Check if it's a WebSocket state error
      if (error.message && error.message.includes('CLOSING or CLOSED')) {
        console.log('🔄 Detected WebSocket closing/closed state - split message ignored')
      }
    }
  }

  const handleArenaRestart = () => {
    console.log('🔁 Restart requested after elimination')
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const handleBackToLobby = () => {
    console.log('🏠 Returning to lobby after elimination')
    router.push('/')
  }

  const handleReportPlayer = () => {
    const target = gameOverDetails.eliminatedBy || 'Unknown Player'
    console.log('📣 Report Player clicked for', target)
  }

  // Cash out key event handlers - ported from agario with split spam prevention
  const lastSplitTimeRef = useRef(0)
  const SPLIT_COOLDOWN = 500 // 500ms cooldown between splits
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) {
        return
      }

      const key = e.key.toLowerCase()

      if (key === 'm') {
        if (visibleMissions.length > 0) {
          if (missionCondenseTimeoutRef.current) {
            clearTimeout(missionCondenseTimeoutRef.current)
            missionCondenseTimeoutRef.current = null
          }

          if (!missionPopupVisible || missionPopupCondensed) {
            setMissionPopupCondensed(false)
            setMissionPopupVisible(true)
          } else {
            setMissionPopupCondensed(true)
            setMissionPopupVisible(true)
          }
        }
        return
      }

      if (key === 'e' && !isCashingOut && !cashOutComplete && gameReady) {
        console.log('Starting cash out process with E key')
        setIsCashingOut(true)
        setCashOutProgress(0)
        
        // Update local state in game engine for immediate ring display
        if (gameRef.current) {
          gameRef.current.updateLocalCashOutState(true, 0)
        }
        
        // Send cash out start message to server for multiplayer visibility
        if (wsRef.current && wsRef.current.sessionId) {
          try {
            console.log('💰 Attempting to send cash out start message to server')
            console.log('🔗 WebSocket connection state check:', {
              hasWsRef: !!wsRef.current,
              hasConnection: !!wsRef.current?.connection,
              readyState: wsRef.current?.connection?.readyState,
              expectedState: 1 // WebSocket.OPEN
            })
            
            // Check if connection is still valid before sending (WebSocket.OPEN = 1)
            if (!wsRef.current || !wsRef.current.connection || 
                wsRef.current.connection.readyState !== 1) {
              console.log('⚠️ Connection not ready for cash out start - skipping message')
              return
            }
            
            wsRef.current.send("cashOutStart", {})
            console.log('✅ Cash out start message sent successfully')
          } catch (error) {
            console.error('❌ Error sending cash out start message:', error)
            
            // Check if it's a WebSocket state error
            if (error.message && error.message.includes('CLOSING or CLOSED')) {
              console.log('🔄 Detected WebSocket closing/closed state - cash out start ignored')
            }
          }
        }
      }
      
      // Handle SPACE key for splitting with cooldown
      if (e.key === ' ' && gameReady && gameRef.current) {
        e.preventDefault()

        console.log('🚀 SPACEBAR PRESSED - Detailed Debug Info:', {
          gameReady,
          gameRef: !!gameRef.current,
          wsRef: !!wsRef.current,
          wsConnection: wsRef.current?.connection?.readyState,
          sessionId: wsRef.current?.sessionId,
          playerMass: gameRef.current?.player?.mass,
          mouseCoords: gameRef.current?.mouse ? {
            worldX: gameRef.current.mouse.worldX,
            worldY: gameRef.current.mouse.worldY,
            x: gameRef.current.mouse.x,
            y: gameRef.current.mouse.y
          } : null,
          isMobile,
          joystickPosition
        })
        
        const now = Date.now()
        if (now - lastSplitTimeRef.current < SPLIT_COOLDOWN) {
          console.log('⚠️ Split cooldown active, ignoring spacebar press. Time remaining:', (SPLIT_COOLDOWN - (now - lastSplitTimeRef.current)) + 'ms')
          return
        }
        
        console.log('✅ Spacebar conditions met - calling handleSplit')
        lastSplitTimeRef.current = now
        
        try {
          handleSplit(e)
        } catch (error) {
          console.error('❌ Error in handleSplit:', error)
          console.error('❌ Stack trace:', error.stack)
        }
      } else {
        // Debug why spacebar didn't trigger
        if (e.key === ' ') {
          console.log('🔍 SPACEBAR BLOCKED - Conditions not met:', {
            spacePressed: e.key === ' ',
            gameReady,
            gameRef: !!gameRef.current,
            reasonBlocked: !gameReady ? 'gameReady=false' : !gameRef.current ? 'gameRef.current=null' : 'unknown'
          })
        }
      }
    }

    const handleKeyUp = (e) => {
      if (gameOver) {
        return
      }

      if (e.key.toLowerCase() === 'e' && isCashingOut) {
        console.log('Canceling cash out - E key released')
        setIsCashingOut(false)
        setCashOutProgress(0)
        if (cashOutIntervalRef.current) {
          clearInterval(cashOutIntervalRef.current)
          cashOutIntervalRef.current = null
        }
        
        // Update local state in game engine to stop ring display
        if (gameRef.current) {
          gameRef.current.updateLocalCashOutState(false, 0)
        }
        
        // Send cash out stop message to server for multiplayer visibility
        if (wsRef.current && wsRef.current.sessionId) {
          try {
            console.log('💰 Attempting to send cash out stop message to server')
            console.log('🔗 WebSocket connection state check:', {
              hasWsRef: !!wsRef.current,
              hasConnection: !!wsRef.current?.connection,
              readyState: wsRef.current?.connection?.readyState,
              expectedState: 1 // WebSocket.OPEN
            })
            
            // Check if connection is still valid before sending (WebSocket.OPEN = 1)
            if (!wsRef.current || !wsRef.current.connection || 
                wsRef.current.connection.readyState !== 1) {
              console.log('⚠️ Connection not ready for cash out stop - skipping message')
              return
            }
            
            wsRef.current.send("cashOutStop", {})
            console.log('✅ Cash out stop message sent successfully')
          } catch (error) {
            console.error('❌ Error sending cash out stop message:', error)
            
            // Check if it's a WebSocket state error
            if (error.message && error.message.includes('CLOSING or CLOSED')) {
              console.log('🔄 Detected WebSocket closing/closed state - cash out stop ignored')
            }
          }
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    gameOver,
    isCashingOut,
    cashOutComplete,
    gameReady,
    missionPopupVisible,
    missionPopupCondensed,
    visibleMissions.length
  ])

  // Cash out progress interval - ported from agario
  useEffect(() => {
    if (isCashingOut && !cashOutComplete) {
      console.log('Starting cash out progress interval')
      
      cashOutIntervalRef.current = setInterval(() => {
        setCashOutProgress(prev => {
          const newProgress = prev + 2 // 2% per 100ms = 5 second duration
          
          // Update local state in game engine for immediate ring display
          if (gameRef.current && newProgress < 100) {
            gameRef.current.updateLocalCashOutState(true, newProgress)
          }
          
          if (newProgress >= 100) {
            console.log('Cash out completed!')
            setIsCashingOut(false)
            setCashOutComplete(true)
            clearInterval(cashOutIntervalRef.current)
            cashOutIntervalRef.current = null
            
            // Update local state in game engine to stop ring display
            if (gameRef.current) {
              gameRef.current.updateLocalCashOutState(false, 100)
            }
            
            // Add currency based on score
            setCurrency(prevCurrency => prevCurrency + score)
            
            // Show cashout success modal and start countdown
            setShowCashOutSuccessModal(true)
            setAutoRedirectCountdown(10)
            
            // Start countdown timer
            const countdownInterval = setInterval(() => {
              setAutoRedirectCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownInterval)
                  window.location.href = '/'
                  return 0
                }
                return prev - 1
              })
            }, 1000)
            
            return 100
          }
          
          return newProgress
        })
      }, 100) // Update every 100ms for smooth progress
    }
    
    return () => {
      if (cashOutIntervalRef.current) {
        clearInterval(cashOutIntervalRef.current)
        cashOutIntervalRef.current = null
      }
    }
  }, [isCashingOut, score])

  // Auto-collapse leaderboard after 5 seconds of no interaction
  useEffect(() => {
    if (leaderboardExpanded && isMobile) {
      leaderboardTimerRef.current = setTimeout(() => {
        setLeaderboardExpanded(false)
      }, 5000)
    }
    
    return () => {
      if (leaderboardTimerRef.current) {
        clearTimeout(leaderboardTimerRef.current)
      }
    }
  }, [leaderboardExpanded, isMobile])

  const handleLeaderboardToggle = () => {
    if (!isMobile) return // Only for mobile
    
    setLeaderboardExpanded(!leaderboardExpanded)
    
    // Clear existing timer when manually toggling
    if (leaderboardTimerRef.current) {
      clearTimeout(leaderboardTimerRef.current)
    }
  }

  // Auto-collapse stats panel after 5 seconds of no interaction
  useEffect(() => {
    if (statsExpanded && isMobile) {
      statsTimerRef.current = setTimeout(() => {
        setStatsExpanded(false)
      }, 5000)
    }
    
    return () => {
      if (statsTimerRef.current) {
        clearTimeout(statsTimerRef.current)
      }
    }
  }, [statsExpanded, isMobile])

  const handleStatsToggle = () => {
    if (!isMobile) return // Only for mobile
    
    setStatsExpanded(!statsExpanded)
    
    // Clear existing timer when manually toggling
    if (statsTimerRef.current) {
      clearTimeout(statsTimerRef.current)
    }
  }

  // Mobile detection - matching agario exactly
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return
      
      // Screen dimensions - mobile if height <= 768 OR smallest dimension <= 768
      const heightCheck = window.innerHeight <= 768
      const smallestCheck = Math.min(window.innerWidth, window.innerHeight) <= 768
      const isSmallScreen = heightCheck || smallestCheck
      
      // Mobile landscape detection (wide but short screens - like phones in landscape)
      const aspectRatio = window.innerWidth / window.innerHeight
      const isMobileLandscape = window.innerHeight <= 500 && aspectRatio >= 1.5
      
      // Touch and user agent detection (for real devices)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // ALWAYS mobile if screen is very small (for automation/testing)
      const isVerySmallScreen = window.innerHeight <= 600 || window.innerWidth <= 600
      
      // Device is mobile if ANY of these conditions are true:
      const mobile = isSmallScreen || isMobileLandscape || isVerySmallScreen || (isTouchDevice && isMobileUA)
      
      console.log('🎮 IN-GAME Mobile Detection:', {
        heightCheck,
        smallestCheck,
        isSmallScreen,
        isMobileLandscape,
        isVerySmallScreen,
        isTouchDevice,
        isMobileUA,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        minDimension: Math.min(window.innerWidth, window.innerHeight),
        aspectRatio: aspectRatio.toFixed(2),
        result: mobile,
        analogStickVisible: mobile ? 'YES' : 'NO'
      })
      
      setIsMobile(mobile)

      if (gameRef.current && typeof gameRef.current.setCameraZoom === 'function') {
        gameRef.current.setCameraZoom(mobile ? 0.75 : 1)
      }
    }
    
    checkMobile()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile)
      window.addEventListener('orientationchange', checkMobile)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkMobile)
        window.removeEventListener('orientationchange', checkMobile)
      }
    }
  }, [])

  // Colyseus connection and input handling - ENHANCED DEBUGGING
  const connectToColyseus = async () => {
    if (!selectedSkinLoaded) {
      console.log('⏳ Selected skin not loaded - delaying Colyseus connection attempt')
      return
    }
    const componentId = componentIdRef.current
    console.log(`🔗 [${componentId}] Connection attempt started for user:`, privyUserId)

    clearPingInterval()
    resetPingState(true)

    // Show loading modal when starting connection
    setShowLoadingModal(true)
    
    // GLOBAL duplicate connection prevention
    if (GLOBAL_CONNECTION_TRACKER.isConnecting) {
      console.log(`🔄 [${componentId}] Global connection already in progress - skipping duplicate attempt`)
      return
    }
    
    if (GLOBAL_CONNECTION_TRACKER.activeConnection && GLOBAL_CONNECTION_TRACKER.userId === privyUserId) {
      console.log(`✅ [${componentId}] User already has active global connection - reusing existing connection`)
      const existingRoom = GLOBAL_CONNECTION_TRACKER.activeConnection
      wsRef.current = existingRoom
      setConnectionStatus('connected')
      setShowLoadingModal(false)
      initializePingMeasurement(existingRoom)
      return
    }
    
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current) {
      console.log(`🔄 [${componentId}] Component connection already in progress - skipping duplicate attempt`)
      return
    }
    
    // Check if already connected
    if (wsRef.current && wsRef.current.sessionId) {
      console.log(`✅ [${componentId}] Already connected to arena - skipping duplicate connection`)
      return
    }
    
    isConnectingRef.current = true
    GLOBAL_CONNECTION_TRACKER.isConnecting = true
    GLOBAL_CONNECTION_TRACKER.userId = privyUserId
    
    // Cleanup any existing connection first
    if (wsRef.current) {
      console.log(`🔄 [${componentId}] Cleaning up existing connection before creating new one...`)
      try {
        wsRef.current.leave()
      } catch (error) {
        console.log(`⚠️ [${componentId}] Error cleaning up existing connection:`, error)
      }
      wsRef.current = null
    }
    
    // Also cleanup global connection if it's for a different user
    if (GLOBAL_CONNECTION_TRACKER.activeConnection && GLOBAL_CONNECTION_TRACKER.userId !== privyUserId) {
      console.log(`🔄 [${componentId}] Cleaning up global connection for different user`)
      try {
        GLOBAL_CONNECTION_TRACKER.activeConnection.leave()
      } catch (error) {
        console.log(`⚠️ [${componentId}] Error cleaning up global connection:`, error)
      }
      GLOBAL_CONNECTION_TRACKER.activeConnection = null
    }
    
    try {
      console.log('🚀 Creating dedicated Colyseus client for this arena...')
      setConnectionStatus('connecting')
      
      // Get the endpoint from environment or fallback
      const endpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud'
      console.log('🎯 Colyseus endpoint:', endpoint)
      console.log('🎯 Environment check:', {
        endpoint: process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT,
        playerName,
        privyUserId,
        roomId
      })
      
      // Create dedicated client instance for this arena  
      const client = new Client(endpoint)
      
      const skinPayload = { ...normalizedSelectedSkin }

      console.log('🎯 Joining arena room:', roomId)
      console.log('🎯 Player details - Name:', playerName, 'PrivyID:', privyUserId)
      console.log('🎨 Selected skin payload:', skinPayload)
      
      // Add timeout to connection attempt
      const connectionTimeout = setTimeout(() => {
        isConnectingRef.current = false // Reset connection flag on timeout
        GLOBAL_CONNECTION_TRACKER.isConnecting = false // Reset global flag on timeout
        console.error(`❌ [${componentId}] Connection timeout after 15 seconds`)
        setConnectionStatus('failed')
        
        // Hide loading modal on timeout
        setShowLoadingModal(false)
      }, 15000)
      
      const room = await client.joinOrCreate("arena", {
        roomName: roomId,
        playerName: playerName,
        privyUserId: privyUserId,
        selectedSkin: skinPayload // Pass skin data to server for multiplayer visibility
      })
      
      // Clear timeout if connection succeeds
      clearTimeout(connectionTimeout)
      
      wsRef.current = room
      GLOBAL_CONNECTION_TRACKER.activeConnection = room // Store in global tracker
      isConnectingRef.current = false // Reset connection flag on success
      GLOBAL_CONNECTION_TRACKER.isConnecting = false // Reset global flag on success
      console.log(`🔗 [${componentId}] Setting initial connection status to connected`)
      setConnectionStatus('connected')

      initializePingMeasurement(room)

      missionStatsRef.current = {
        initialized: false,
        score: 0,
        massRaw: 25,
        massRounded: 25,
        maxMassAchieved: 25
      }
      
      // Hide loading modal on successful connection
      setShowLoadingModal(false)
      
      console.log(`✅ [${componentId}] Connected to dedicated arena:`, room.id)
      console.log('🎮 DEDICATED Session ID (should stay stable):', room.sessionId)
      
      // Set expected session ID in game engine for camera stability
      if (gameRef.current) {
        gameRef.current.expectedSessionId = room.sessionId
        console.log('🎯 Set expected session ID in game engine:', room.sessionId)
      }
      
      // Handle connection errors
      room.onError((code, message) => {
        console.error(`❌ [${componentId}] Colyseus room error:`, code, message)
        console.error(`🔍 ERROR DEBUG - Code: ${code}, Message: ${message}`)
        console.error(`🔍 ERROR DEBUG - Stack trace:`, new Error().stack)
        clearPingInterval()
        resetPingState(true)
        isConnectingRef.current = false // Reset connection flag on room error
        GLOBAL_CONNECTION_TRACKER.isConnecting = false // Reset global flag on room error
        if (GLOBAL_CONNECTION_TRACKER.activeConnection === room) {
          GLOBAL_CONNECTION_TRACKER.activeConnection = null // Clear global connection if it's this room
        }
        setConnectionStatus('failed')
      })

      room.onLeave((code) => {
        console.log(`👋 [${componentId}] Left room with code:`, code)
        console.log(`🔍 LEAVE DEBUG - Code: ${code}, Reason: ${code === 1000 ? 'Normal closure' : code === 1006 ? 'Abnormal closure' : 'Other: ' + code}`)
        console.log(`🔍 LEAVE DEBUG - Stack trace:`, new Error().stack)
        clearPingInterval()
        resetPingState(true)
        isConnectingRef.current = false // Reset connection flag on leave
        GLOBAL_CONNECTION_TRACKER.isConnecting = false // Reset global flag on leave
        if (wsRef.current === room) {
          wsRef.current = null
        }
        if (GLOBAL_CONNECTION_TRACKER.activeConnection === room) {
          GLOBAL_CONNECTION_TRACKER.activeConnection = null // Clear global connection if it's this room
        }
        lastInputRef.current = { dx: 0, dy: 0 }
        setConnectionStatus(prevStatus => (prevStatus === 'eliminated' ? prevStatus : 'disconnected'))
      })

      room.onMessage('gameOver', (payload) => {
        console.log('☠️ Received gameOver message from server:', payload)

        const safeScore = Math.max(0, Math.round(payload?.finalScore ?? 0))
        const safeMass = Math.max(0, Math.round(payload?.finalMass ?? 0))
        const eliminatedBy = payload?.eliminatedBy || 'Unknown Player'

        setGameOverDetails({
          finalScore: safeScore,
          finalMass: safeMass,
          eliminatedBy
        })
        setScore(safeScore)
        setMass(safeMass)
        setGameOver(true)
        setConnectionStatus('eliminated')
        setIsCashingOut(false)
        setCashOutProgress(0)
        setCashOutComplete(false)
        setShowCashOutSuccessModal(false)
        if (cashOutIntervalRef.current) {
          clearInterval(cashOutIntervalRef.current)
          cashOutIntervalRef.current = null
        }
        setJoystickActive(false)
        setJoystickPosition({ x: 0, y: 0 })
        if (gameRef.current) {
          gameRef.current.stop()
        }

        setGameStats((prevStats) => ({
          ...prevStats,
          finalScore: safeScore,
          finalMass: safeMass,
          eliminatedBy
        }))
      })

      // Handle server state updates
      room.onStateChange((state) => {
        console.log('🎮 Arena state update - Players:', state.players?.size || 0, 'Connection:', connectionStatus)
        setPlayerCount(state.players?.size || 0)

        // Ensure connection status is set to connected when receiving state updates
        setConnectionStatus((prevStatus) => {
          if (prevStatus === 'eliminated') {
            return prevStatus
          }

          if (prevStatus !== 'connected') {
            console.log('🔗 Setting connection status to connected (state update received)')
          }

          return 'connected'
        })
        
        // Convert MapSchema to usable format
        const gameState = {
          players: [],
          coins: [],
          viruses: [],
          worldSize: state.worldSize || 8000
        }
        
        // Process players with proper current player identification
        if (state.players) {
          console.log('🎮 Current session ID:', room.sessionId)
          console.log('🎮 Players in state:', Array.from(state.players.keys()))
          let currentPlayerFound = false
          
          state.players.forEach((player, sessionId) => {
            console.log(`🎮 Player: ${player.name} (${sessionId}) - isCurrentPlayer: ${sessionId === room.sessionId}`)
            const isCurrentPlayer = sessionId === room.sessionId
            if (isCurrentPlayer) {
              console.log('✅ Found current player:', sessionId, player.name)
              currentPlayerFound = true
            }
            
            gameState.players.push({
              ...player,
              sessionId,
              isCurrentPlayer
            })
          })
          
          if (!currentPlayerFound) {
            console.log('❌ Current player not found! Available sessions:', 
              Array.from(state.players.keys()))
          }
        }
        
        // Process coins
        if (state.coins) {
          state.coins.forEach((coin, coinId) => {
            gameState.coins.push({ ...coin, id: coinId })
          })
        }
        
        // Process viruses
        if (state.viruses) {
          state.viruses.forEach((virus, virusId) => {
            gameState.viruses.push({ ...virus, id: virusId })
          })
        }
        
        setServerState(gameState)
        
        // Update game engine if it exists
        if (gameRef.current) {
          gameRef.current.updateFromServer(gameState)
          
          // Ensure session ID is set (in case game was initialized before connection)
          if (!gameRef.current.expectedSessionId) {
            gameRef.current.expectedSessionId = room.sessionId
            console.log('🎯 Set expected session ID in game engine (delayed):', room.sessionId)
          }
        }
      })
      
    } catch (error) {
      isConnectingRef.current = false // Reset connection flag on error
      GLOBAL_CONNECTION_TRACKER.isConnecting = false // Reset global flag on error

      // Hide loading modal on error
      setShowLoadingModal(false)

      clearPingInterval()
      resetPingState(true)

      console.error(`❌ [${componentId}] Colyseus connection failed:`, error)
      console.error(`❌ [${componentId}] Error details:`, {
        message: error.message,
        stack: error.stack,
        endpoint: process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT
      })
      setConnectionStatus('failed')
      
      // Retry connection after 5 seconds with exponential backoff
      setTimeout(() => {
        console.log(`🔄 [${componentId}] Retrying connection in 5 seconds...`)
        connectToColyseus()
      }, 5000)
    }
  }

  // Send input to server with throttling for smooth networking (like agario)
  const sendInput = (dx, dy) => {
    if (gameOver) {
      return
    }

    // Check actual room connection state instead of React state
    if (!wsRef.current) {
      console.log('❌ Cannot send input - no room connection')
      return
    }
    
    // Check if room is actually connected by verifying it has a sessionId
    if (!wsRef.current.sessionId) {
      console.log('❌ Cannot send input - room not fully connected (no sessionId)')
      return
    }
    
    // Input throttling for smooth networking (60fps max input rate)
    const now = Date.now()
    if (now - lastInputTimeRef.current < inputThrottleMs) {
      // Still apply client-side prediction even when throttling server input
      if (gameRef.current && gameRef.current.player.x !== undefined) {
        gameRef.current.applyClientSideMovement(dx, dy)
      }
      return
    }
    lastInputTimeRef.current = now
    
    inputSequenceRef.current++
    lastInputRef.current = { dx, dy }
    
    // Only log occasionally to reduce spam
    if (inputSequenceRef.current % 30 === 0) {
      console.log('📤 Throttled input to server:', {
        sequence: inputSequenceRef.current,
        direction: { dx: dx.toFixed(3), dy: dy.toFixed(3) },
        fps: Math.round(1000 / inputThrottleMs)
      })
    }
    
    try {
      wsRef.current.send("input", {
        seq: inputSequenceRef.current,
        dx: dx,
        dy: dy
      })
      
      // CLIENT-SIDE PREDICTION: Apply movement immediately for responsiveness
      if (gameRef.current && gameRef.current.player.x !== undefined) {
        gameRef.current.applyClientSideMovement(dx, dy)
      }
      
    } catch (error) {
      // Handle WebSocket CLOSING/CLOSED errors gracefully without breaking movement
      if (error.message && error.message.includes('CLOSING or CLOSED')) {
        console.log('⚠️ WebSocket closing - skipping input send (this is expected during disconnection)')
      } else {
        console.error('❌ Failed to send input:', error)
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (continuousInputIntervalRef.current) {
      clearInterval(continuousInputIntervalRef.current)
      continuousInputIntervalRef.current = null
    }

    const usingTouchControls = isMobile || joystickActive
    const hasActiveRoom = wsRef.current && wsRef.current.sessionId
    const shouldRun = gameReady && !gameOver && connectionStatus === 'connected' && hasActiveRoom && !usingTouchControls

    if (!shouldRun) {
      return
    }

    const sendCachedDirection = () => {
      const latestInput = lastInputRef.current || { dx: 0, dy: 0 }
      sendInput(latestInput.dx, latestInput.dy)
    }

    // Ensure the server receives the most recent direction immediately when the loop starts
    sendCachedDirection()

    const intervalId = window.setInterval(sendCachedDirection, inputThrottleMs)
    continuousInputIntervalRef.current = intervalId

    return () => {
      if (continuousInputIntervalRef.current) {
        clearInterval(continuousInputIntervalRef.current)
        continuousInputIntervalRef.current = null
      }
    }
  }, [connectionStatus, gameReady, gameOver, isMobile, joystickActive])

  // Virtual joystick handlers for mobile - matching agario exactly
  const handleJoystickStart = (e) => {
    e.preventDefault()
    if (!isMobile) return
    if (gameOver) return

    console.log('🕹️ Joystick Started - Mobile:', isMobile, 'Game Available:', !!gameRef.current?.player)
    
    setJoystickActive(true)
    const rect = joystickRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const touch = e.touches ? e.touches[0] : e
    const deltaX = touch.clientX - centerX
    const deltaY = touch.clientY - centerY
    
    // Limit joystick knob to circle boundary
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 35)
    const angle = Math.atan2(deltaY, deltaX)
    
    const knobX = Math.cos(angle) * distance
    const knobY = Math.sin(angle) * distance
    
    // Always update visual position of joystick knob
    setJoystickPosition({ x: knobX, y: knobY })
    
    // Only update player movement if game is ready
    if (gameRef.current && gameRef.current.player) {
      const strength = distance / 35 // Normalize to 0-1
      
      // Calculate normalized direction for server input
      const dx = Math.cos(angle) * strength
      const dy = Math.sin(angle) * strength
      
      // Send input to multiplayer server
      sendInput(dx, dy)
      
      console.log('🕹️ Joystick START Movement:', {
        strength: strength.toFixed(2),
        angle: (angle * 180 / Math.PI).toFixed(1) + '°',
        dx: dx.toFixed(3),
        dy: dy.toFixed(3)
      })
    }
  }
  
  const handleJoystickMove = (e) => {
    e.preventDefault()
    if (!isMobile || !joystickActive) return
    if (gameOver) return
    
    const rect = joystickRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const touch = e.touches ? e.touches[0] : e
    const deltaX = touch.clientX - centerX
    const deltaY = touch.clientY - centerY
    
    // Limit joystick knob to circle boundary
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 35)
    const angle = Math.atan2(deltaY, deltaX)
    
    const knobX = Math.cos(angle) * distance
    const knobY = Math.sin(angle) * distance
    
    // Always update visual position of joystick knob
    setJoystickPosition({ x: knobX, y: knobY })
    
    // Only update player movement if game is ready
    if (gameRef.current && gameRef.current.player) {
      const strength = distance / 35 // Normalize to 0-1
      
      // Calculate normalized direction for server input
      const dx = Math.cos(angle) * strength
      const dy = Math.sin(angle) * strength
      
      // Send input to multiplayer server
      sendInput(dx, dy)
    }
  }
  
  const handleJoystickEnd = (e) => {
    e.preventDefault()
    if (!isMobile) return
    if (gameOver) return

    console.log('🕹️ Joystick Ended - Stopping Movement')
    
    setJoystickActive(false)
    setJoystickPosition({ x: 0, y: 0 })
    
    // Send stop input to server
    sendInput(0, 0)
  }

  // Pure multiplayer game engine - updated to match agario visual features
  class MultiplayerGameEngine {
    constructor(canvas, inputSender, selectedSkin, isMobileFlag = false) {
      console.log('🎮 Initializing pure multiplayer game engine with enhanced mechanics')
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.sendInputFn = inputSender  // Store the sendInput function
      const normalizedSkin = {
        id: selectedSkin?.id || 'default',
        name: selectedSkin?.name || 'Default Warrior',
        color: selectedSkin?.color || '#4A90E2',
        type: selectedSkin?.type || 'circle',
        pattern: selectedSkin?.pattern || 'solid'
      }
      this.selectedSkin = normalizedSkin // Store the selected skin
      console.log('🎨 Using selected skin in game engine:', this.selectedSkin)
      this.running = false

      this.cameraZoom = isMobileFlag ? 0.75 : 1

      // World setup with circular zone system
      this.world = { width: 8000, height: 8000 }
      this.expectedSessionId = null // Will be set when we connect to Colyseus
      this.localCashOutState = { isCashingOut: false, cashOutProgress: 0 } // Local state for immediate feedback
      
      // Simple camera initialization matching local agario exactly
      this.camera = { x: 0, y: 0 }
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 }
      
      // Player setup with visual properties matching agario
      this.player = {
        x: 2000, // Updated center for left-side playable area (worldSize/4)
        y: 2000, // Updated center for top-side playable area (worldSize/4)
        mass: 25, // Fixed to match server spawn mass
        radius: Math.sqrt(25) * 3, // Proper radius calculation: √25 * 3 = 15
        color: normalizedSkin.color,
        skinColor: normalizedSkin.color,
        skinId: normalizedSkin.id,
        skinName: normalizedSkin.name,
        skinType: normalizedSkin.type,
        skinPattern: normalizedSkin.pattern,
        name: playerName || 'Anonymous Player',
        isCurrentPlayer: true,
        speed: 2,
        targetX: 2000, // Updated center for left-side playable area (worldSize/4)
        targetY: 2000, // Updated center for top-side playable area (worldSize/4)
        spawnProtection: true,
        spawnProtectionTime: 4000,
        spawnProtectionStart: Date.now()
      }
      
      // Initialize client-side animation cache for persistent virus animations
      this.virusAnimationCache = new Map() // Persistent animation state across server updates
      this.maxPlayableRadius = 1800  // Maximum zone radius - matching local agario practice mode
      this.currentPlayableRadius = 1800 // Starting zone size - matching local agario practice mode
      this.targetPlayableRadius = this.currentPlayableRadius
      this.zoneTransitionSpeed = 20 // Pixels per second zone change
      this.isCashGame = false // Can be set based on game mode
      console.log('🎯 Arena initialized with smooth camera and circular zone - radius:', this.currentPlayableRadius)

      this.serverState = null
      this.lastUpdate = Date.now()
      this.gameStartTime = Date.now()
      this.lastMovementUpdate = null // For deltaTime calculation in movement
      this.lastMovementUpdate = null // For deltaTime calculation in movement
      
      this.bindEvents()
      this.setupMouse()
    }

    setCameraZoom(nextZoom = 1) {
      const safeZoom = Math.max(0.1, Number.isFinite(nextZoom) ? nextZoom : 1)
      if (this.cameraZoom !== safeZoom) {
        console.log('🔍 Updating camera zoom:', safeZoom)
        this.cameraZoom = safeZoom
        if (this.mouse) {
          this.mouse.worldX = this.camera.x + (this.mouse.x || 0) / safeZoom
          this.mouse.worldY = this.camera.y + (this.mouse.y || 0) / safeZoom
        }
      }
    }
    
    // Method to update local cash out state for immediate feedback
    updateLocalCashOutState(isCashingOut, cashOutProgress = 0) {
      this.localCashOutState = { isCashingOut, cashOutProgress }
      console.log('💰 Local cash out state updated:', this.localCashOutState)
    }

    setupMouse() {
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 }
      
      const updateMousePosition = (e) => {
        if (!this.canvas) return

        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - rect.left
        this.mouse.y = e.clientY - rect.top

        // Convert screen coordinates to world coordinates - CORRECTED
        const zoom = this.cameraZoom || 1
        this.mouse.worldX = this.camera.x + this.mouse.x / zoom
        this.mouse.worldY = this.camera.y + this.mouse.y / zoom
      }
      
      this.canvas.addEventListener('mousemove', updateMousePosition)
      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault()
        if (e.touches.length > 0) {
          updateMousePosition(e.touches[0])
        }
      })
      
      // Store reference for cleanup
      this.updateMousePosition = updateMousePosition
    }

    bindEvents() {
      if (typeof window === 'undefined') return
      
      // Mouse movement for non-mobile - ENHANCED RESPONSIVENESS
      const handleMouseMove = (e) => {
        if (isMobile || !this.canvas) return

        const rect = this.canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Convert screen coordinates to world coordinates - CORRECTED FORMULA
        const zoom = this.cameraZoom || 1
        const worldMouseX = this.camera.x + mouseX / zoom
        const worldMouseY = this.camera.y + mouseY / zoom

        // Calculate direction toward mouse cursor
        const dx = worldMouseX - this.player.x
        const dy = worldMouseY - this.player.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        let normalizedDx = 0
        let normalizedDy = 0

        if (distance > 2) { // Reduced threshold from 5 to 2 for more sensitivity
          normalizedDx = dx / distance
          normalizedDy = dy / distance
        }

        // Cache the most recent normalized direction for the continuous sender loop
        lastInputRef.current = { dx: normalizedDx, dy: normalizedDy }

        if (!this.sendInputFn) {
          return
        }

        // IMMEDIATE INPUT - no throttling for maximum responsiveness
        this.sendInputFn(normalizedDx, normalizedDy)

        // Reduced debug logging to prevent console spam
        if (distance > 2 && Math.random() < 0.1) { // Only log 10% of movements
          console.log('🖱️ Mouse movement:', {
            mouseScreen: { x: mouseX.toFixed(1), y: mouseY.toFixed(1) },
            mouseWorld: { x: worldMouseX.toFixed(1), y: worldMouseY.toFixed(1) },
            player: { x: this.player.x?.toFixed(1), y: this.player.y?.toFixed(1) },
            direction: { dx: normalizedDx.toFixed(3), dy: normalizedDy.toFixed(3) },
            distance: distance.toFixed(1)
          })
        }
      }
      
      // Add event listener
      window.addEventListener('mousemove', handleMouseMove)
      
      // Store reference for cleanup
      this.handleMouseMove = handleMouseMove
    }
    
    applyClientSideMovement(dx, dy) {
      // PURE SERVER AUTHORITY - Only send input to server, no client-side movement
      // This eliminates position mismatches between client and server
      
      // We don't move the player locally anymore - server handles all movement
      // Player position will be updated via updateFromServer() method
      
      // Just send the input to the server (this is already handled in the input processing)
      console.log('🎮 Client input sent to server - no local movement applied')
    }
    
    updateFromServer(state) {
      this.serverState = state
      
      // Find ONLY the current player based on session ID - NO FALLBACK
      let currentPlayer = state.players.find(p => p.isCurrentPlayer)
      
      if (currentPlayer) {
        console.log('🎮 Server update for player:', currentPlayer.name, 
                   'session:', currentPlayer.sessionId, 
                   'at', currentPlayer.x?.toFixed(1), currentPlayer.y?.toFixed(1))
        
        // PURE SERVER AUTHORITY - No client-side prediction, just use server position
        console.log('🎮 Applying server authoritative position:', {
          server: { x: currentPlayer.x.toFixed(1), y: currentPlayer.y.toFixed(1) }
        })
        
        // Always use server position (no reconciliation needed)
        this.player.x = currentPlayer.x
        this.player.y = currentPlayer.y
        this.player.targetX = currentPlayer.x  
        this.player.targetY = currentPlayer.y
        
        // Verify spawn position is within playable area (for debugging)
        const worldCenterX = this.world.width / 4 // 2000 - left-side playable area
        const worldCenterY = this.world.height / 4 // 2000 - top-side playable area
        const distanceFromCenter = Math.sqrt(
          Math.pow(currentPlayer.x - worldCenterX, 2) + 
          Math.pow(currentPlayer.y - worldCenterY, 2)
        )
        console.log('🎯 SPAWN VERIFICATION CLIENT:', {
          spawnPos: `(${currentPlayer.x.toFixed(1)}, ${currentPlayer.y.toFixed(1)})`,
          worldCenter: `(${worldCenterX}, ${worldCenterY})`,
          distanceFromCenter: distanceFromCenter.toFixed(1),
          playableRadius: this.currentPlayableRadius,
          inPlayableArea: distanceFromCenter <= this.currentPlayableRadius
        })
        
        // Update mass and score (server is always authoritative for these)
        const currentScoreRounded = Math.max(0, Math.round(currentPlayer.score || 0))
        const rawMass = Number.isFinite(currentPlayer.mass) ? currentPlayer.mass : 0
        const roundedMass = Math.max(0, Math.round(rawMass))

        console.log('🎯 Mass update from server:', currentPlayer.mass, '(rounded:', roundedMass || 25, ')')
        setMass(roundedMass || 25)
        setScore(currentScoreRounded)

        const missionStats = missionStatsRef.current || {}

        if (!missionStats.initialized) {
          missionStats.score = currentScoreRounded
          missionStats.massRaw = rawMass
          missionStats.massRounded = roundedMass
          missionStats.maxMassAchieved = roundedMass
          missionStats.initialized = true
        } else {
          const previousScore = Number.isFinite(missionStats.score) ? missionStats.score : 0
          const scoreDelta = currentScoreRounded - previousScore
          const previousRawMass = Number.isFinite(missionStats.massRaw) ? missionStats.massRaw : rawMass
          const rawMassDelta = rawMass - previousRawMass
          const approxMassDelta = Number.isFinite(rawMassDelta) ? Math.round(rawMassDelta) : 0

          if (scoreDelta > 0) {
            const isLikelyCoin =
              Math.abs(scoreDelta - approxMassDelta) <= 2 ||
              (approxMassDelta < 0 && scoreDelta === 1)
            if (isLikelyCoin) {
              updateMissionProgress('coin_collected', scoreDelta)
            }
          }

          const previousMaxMass = Number.isFinite(missionStats.maxMassAchieved)
            ? missionStats.maxMassAchieved
            : missionStats.massRounded ?? roundedMass

          if (roundedMass > previousMaxMass) {
            updateMissionProgress('mass_reached', roundedMass)
            missionStats.maxMassAchieved = roundedMass
          } else {
            missionStats.maxMassAchieved = Math.max(previousMaxMass, roundedMass)
          }

          const survivalStart = gameStatsRef.current?.timeStarted ?? Date.now()
          const survivalSeconds = Math.max(0, Math.floor((Date.now() - survivalStart) / 1000))
          if (survivalSeconds > 0) {
            updateMissionProgress('survival_time', survivalSeconds)
          }
        }

        missionStats.score = currentScoreRounded
        missionStats.massRaw = rawMass
        missionStats.massRounded = roundedMass
        missionStats.maxMassAchieved = Math.max(missionStats.maxMassAchieved ?? roundedMass, roundedMass)
        missionStatsRef.current = missionStats

        // Update other player properties
        this.player.mass = currentPlayer.mass
        this.player.radius = currentPlayer.radius
        this.player.color = currentPlayer.color
        this.player.skinColor = currentPlayer.skinColor
        
      } else {
        console.log('❌ No current player found in server state - players available:', 
                   Array.from(state.players.keys()))
      }
    }
    
    start() {
      if (this.running) return
      this.running = true
      this.gameStartTime = Date.now()
      console.log('🎮 Multiplayer game engine started with enhanced mechanics')
      
      // Update zone periodically (matching local agario)
      this.zoneUpdateInterval = setInterval(() => {
        this.updateDynamicZone()
      }, 100) // Update every 100ms
    }
    
    stop() {
      this.running = false
      if (this.zoneUpdateInterval) {
        clearInterval(this.zoneUpdateInterval)
        this.zoneUpdateInterval = null
      }
      // Clear animation cache to prevent memory leaks
      if (this.virusAnimationCache) {
        this.virusAnimationCache.clear()
      }
      console.log('🎮 Multiplayer game engine stopped with animation cleanup')
      
      // Clean up event listeners
      if (this.handleMouseMove) {
        window.removeEventListener('mousemove', this.handleMouseMove)
      }
      
      if (this.updateMousePosition && this.canvas) {
        this.canvas.removeEventListener('mousemove', this.updateMousePosition)
      }
    }
    
    updateDynamicZone() {
      // Smooth zone size transitions (matching local agario)
      if (Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        const direction = this.currentPlayableRadius < this.targetPlayableRadius ? 1 : -1
        const change = this.zoneTransitionSpeed * (100 / 1000) // Convert to per-frame change
        this.currentPlayableRadius += direction * change
        
        // Clamp to target
        if (direction > 0) {
          this.currentPlayableRadius = Math.min(this.currentPlayableRadius, this.targetPlayableRadius)
        } else {
          this.currentPlayableRadius = Math.max(this.currentPlayableRadius, this.targetPlayableRadius)
        }
      }
      
      // Simulate dynamic zone changes for demonstration (optional)
      // Uncomment to see zone shrinking/expanding every 30 seconds:
      /*
      const gameTime = Date.now() - this.gameStartTime
      if (gameTime > 30000 && gameTime % 60000 < 1000) {
        // Shrink zone every 60 seconds after first 30 seconds
        this.targetPlayableRadius = Math.max(this.basePlayableRadius, this.targetPlayableRadius - 200)
        console.log('🔻 Zone shrinking to radius:', this.targetPlayableRadius)
      }
      */
    }
    
    update() {
      if (!this.running) return
      
      const deltaTime = (Date.now() - this.lastUpdate) / 1000
      this.lastUpdate = Date.now()
      
      // Update time survived
      const currentTimeSurvived = Math.floor((Date.now() - this.gameStartTime) / 1000)
      setTimeSurvived(currentTimeSurvived)
      
      // Update split cooldown (like agario)
      if (this.splitCooldown > 0) {
        this.splitCooldown--
      }
      
      // Update player pieces (exact agario naming)
      this.updatePlayerPieces(deltaTime)
      
      // Update camera - EXACTLY matching local agario implementation
      this.updateCamera()
    }
    
    updateCamera() {
      // IDENTICAL to local agario camera - super snappy camera that moves aggressively toward player
      const viewportWidth = this.canvas.width / (this.cameraZoom || 1)
      const viewportHeight = this.canvas.height / (this.cameraZoom || 1)
      const targetX = this.player.x - viewportWidth / 2
      const targetY = this.player.y - viewportHeight / 2
      
      // Use consistent smoothing for both local and multiplayer (identical to agario)
      const smoothing = 0.2
      this.camera.x += (targetX - this.camera.x) * smoothing
      this.camera.y += (targetY - this.camera.y) * smoothing
      
      // Keep camera within world bounds (identical to agario)
      const boundaryExtension = 100
      this.camera.x = Math.max(
        -boundaryExtension,
        Math.min(this.world.width - viewportWidth + boundaryExtension, this.camera.x)
      )
      this.camera.y = Math.max(
        -boundaryExtension,
        Math.min(this.world.height - viewportHeight + boundaryExtension, this.camera.y)
      )
      
      // Update minimap data every few frames for better performance
      if (Date.now() % 100 < 16) {
        if (this.serverState) {
          // Show other live players on minimap (excluding current player)
          const minimapPlayers = this.serverState.players
            ? this.serverState.players
                .filter(player => player && player.alive && !player.isCurrentPlayer)
                .map(player => ({ 
                  x: player.x, 
                  y: player.y,
                  name: player.name,
                  isPlayer: true 
                }))
            : []

          // Use server state for coins and viruses too
          const minimapCoins = this.serverState.coins || []
          const minimapViruses = this.serverState.viruses || []

          setMinimapData({
            playerX: this.player.x,
            playerY: this.player.y,
            enemies: minimapPlayers,
            coins: minimapCoins.map(coin => ({ x: coin.x, y: coin.y })),
            viruses: minimapViruses.map(virus => ({ x: virus.x, y: virus.y }))
          })
        }
      }
    }
    
    updatePlayerPieces(deltaTime) {
      if (!this.playerPieces || this.playerPieces.length === 0) return
      
      const now = Date.now()
      
      // Update each player piece (exact agario loop)
      for (let i = this.playerPieces.length - 1; i >= 0; i--) {
        const piece = this.playerPieces[i]
        
        // AGARIO MOVEMENT: Pieces follow main player target (exact agario logic)
        if (this.player && typeof this.player.targetX === 'number' && typeof this.player.targetY === 'number') {
          // Update piece target to follow main player (exact agario behavior)
          piece.targetX = this.player.targetX
          piece.targetY = this.player.targetY
          
          const dx = piece.targetX - piece.x
          const dy = piece.targetY - piece.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 5) {
            // Move toward target (exact agario speed calculation)
            const speed = Math.max(2, 20 - piece.radius * 0.02) 
            const moveDistance = speed * deltaTime * 60
            
            const dirX = dx / distance
            const dirY = dy / distance
            
            piece.x += dirX * moveDistance
            piece.y += dirY * moveDistance
          }
        }
        
        // Apply initial split momentum (only first 1 second like agario)
        const splitAge = now - piece.splitTime
        if (splitAge < 1000) {
          piece.x += piece.vx * deltaTime * 60
          piece.y += piece.vy * deltaTime * 60
          
          // Decay velocity quickly like agario
          piece.vx *= 0.95
          piece.vy *= 0.95
        } else {
          // Stop momentum after 1 second, only target following remains
          piece.vx = 0
          piece.vy = 0
        }
        
        // Keep pieces within arena boundaries (exact agario style)
        const centerX = this.world.width / 4
        const centerY = this.world.height / 4
        const playableRadius = 1800
        const maxRadius = playableRadius - piece.radius
        
        const distFromCenter = Math.sqrt(
          Math.pow(piece.x - centerX, 2) + 
          Math.pow(piece.y - centerY, 2)
        )
        
        if (distFromCenter > maxRadius) {
          const angle = Math.atan2(piece.y - centerY, piece.x - centerX)
          piece.x = centerX + Math.cos(angle) * maxRadius
          piece.y = centerY + Math.sin(angle) * maxRadius
          piece.vx = 0
          piece.vy = 0
        }
        
        // Check for merge with main player (exact agario merge detection)
        if (piece.canMerge) {
          const dx = piece.x - this.player.x
          const dy = piece.y - this.player.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          // Exact agario merge distance
          const minMergeDistance = (piece.radius + this.player.radius) * 0.8
          
          if (distance < minMergeDistance) {
            // Merge piece into main player (exact agario style)
            this.player.mass += piece.mass
            this.player.radius = Math.sqrt(this.player.mass / Math.PI) * 6  // Exact agario radius
            
            // Remove the merged piece
            this.playerPieces.splice(i, 1)
            
            // Update total mass UI like agario
            const totalMass = this.player.mass + this.playerPieces.reduce((sum, p) => sum + p.mass, 0)
            setMass(Math.floor(totalMass))
            
            console.log('🔄 Piece merged! New player mass:', Math.round(this.player.mass), 'Total mass:', Math.floor(totalMass))
            continue
          }
        }
        
        // Check for merge between pieces (agario allows this)
        for (let j = i - 1; j >= 0; j--) {
          const otherPiece = this.playerPieces[j]
          
          if (piece.canMerge && otherPiece.canMerge) {
            const dx = piece.x - otherPiece.x
            const dy = piece.y - otherPiece.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const minMergeDistance = (piece.radius + otherPiece.radius) * 0.8
            
            if (distance < minMergeDistance) {
              // Merge the two pieces (exact agario style)
              otherPiece.mass += piece.mass
              otherPiece.radius = Math.sqrt(otherPiece.mass / Math.PI) * 6  // Exact agario radius
              
              // Remove the merged piece
              this.playerPieces.splice(i, 1)
              
              // Update total mass UI
              const totalMass = this.player.mass + this.playerPieces.reduce((sum, p) => sum + p.mass, 0)
              setMass(Math.floor(totalMass))
              
              console.log('🔄 Pieces merged! New piece mass:', Math.round(otherPiece.mass))
              break
            }
          }
        }
      }
    }
    
    render() {
      if (!this.ctx || !this.running) return
      
      // Clear canvas with pure black background like local agario
      this.ctx.fillStyle = '#000000' // Pure black background to match local agario
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      // Save context for camera transform
      this.ctx.save()

      // Apply camera translation (this is what makes the camera follow the player)
      const zoom = this.cameraZoom || 1
      this.ctx.scale(zoom, zoom)
      this.ctx.translate(-this.camera.x, -this.camera.y)
      
      // Draw optimized grid first (matching local agario render order)
      this.drawGrid()
      
      // Draw world boundary with enhanced visuals
      this.drawWorldBoundary()
      
      // Draw server state if available
      if (this.serverState) {
        // Draw coins first (background layer)
        this.serverState.coins.forEach(coin => {
          this.drawCoin(coin)
        })
        
        // Draw viruses (middle layer)
        this.serverState.viruses.forEach(virus => {
          this.drawVirus(virus)
        })
        
        // Draw all players (foreground layer)
        this.serverState.players.forEach(player => {
          if (player.alive) {
            this.drawPlayer(player, player.isCurrentPlayer)
          }
        })
        
        // Draw player pieces (exact agario naming)
        this.drawPlayerPieces()
      }
      
      this.ctx.restore()
    }
    
    drawWorldBoundary() {
      // Circular zone system for top-left playable area
      const centerX = this.world.width / 4  // 2000 - top left area center X
      const centerY = this.world.height / 4 // 2000 - top left area center Y
      const playableRadius = this.currentPlayableRadius
      
      // Draw red danger zone everywhere  
      this.ctx.fillStyle = '#1a0000'
      this.ctx.fillRect(0, 0, this.world.width, this.world.height)
      
      // Draw playable area (black circle to create the safe zone) in top left
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
      
      // Draw red divider border between playable area and red zone
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = '#ff0000' // Bright red divider
      this.ctx.lineWidth = 6 // Thick border for visibility
      this.ctx.stroke()
      
      // Draw optimized grid matching local agario
      this.drawGrid()
    }
    
    drawGrid() {
      // Camera-optimized grid rendering matching local agario
      this.ctx.strokeStyle = '#808080' // Brighter gray grid lines like local agario
      this.ctx.lineWidth = 1
      this.ctx.globalAlpha = 0.3 // Add transparency so they don't interfere with gameplay
      const gridSize = 50
      
      // Only render grid lines visible in current camera viewport (performance optimization)
      const startX = Math.floor(this.camera.x / gridSize) * gridSize
      const startY = Math.floor(this.camera.y / gridSize) * gridSize
      const viewportWidth = this.canvas.width / (this.cameraZoom || 1)
      const viewportHeight = this.canvas.height / (this.cameraZoom || 1)
      const endX = startX + viewportWidth + gridSize
      const endY = startY + viewportHeight + gridSize
      
      // Constrain to world bounds for safety
      const worldStartX = Math.max(startX, 0)
      const worldEndX = Math.min(endX, this.world.width)
      const worldStartY = Math.max(startY, 0)
      const worldEndY = Math.min(endY, this.world.height)
      
      // Draw vertical lines (only visible ones)
      for (let x = worldStartX; x <= worldEndX; x += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(x, worldStartY)
        this.ctx.lineTo(x, worldEndY)
        this.ctx.stroke()
      }
      
      // Draw horizontal lines (only visible ones)
      for (let y = worldStartY; y <= worldEndY; y += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(worldStartX, y)
        this.ctx.lineTo(worldEndX, y)
        this.ctx.stroke()
      }
      
      // Reset alpha back to normal
      this.ctx.globalAlpha = 1.0
    }
    
    drawPlayer(player, isCurrentPlayer = false) {
      const playerRadius = player.radius || 25
      
      // Use server-provided skin color for all players (enables multiplayer skin visibility)
      const playerSkinColor = player.skinColor || player.color || this.selectedSkin?.color || '#4A90E2'
      
      // Player circle with gradient using server-provided skin color
      const gradient = this.ctx.createRadialGradient(
        player.x, player.y, 0,
        player.x, player.y, playerRadius
      )
      
      // All players now use their server-side skin colors
      const baseColor = playerSkinColor
      const lighterColor = this.adjustColorBrightness(baseColor, 20)  
      const darkerColor = this.adjustColorBrightness(baseColor, -40)   
      
      gradient.addColorStop(0, lighterColor)  // Lighter center
      gradient.addColorStop(0.7, baseColor)   // Base color
      gradient.addColorStop(1, darkerColor)   // Darker edge
      
      this.ctx.fillStyle = gradient
      this.ctx.shadowColor = 'transparent'
      this.ctx.shadowBlur = 0
      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2)
      this.ctx.fill()

      // Enhanced border
      this.ctx.strokeStyle = isCurrentPlayer ? '#FFFFFF' : '#DDDDDD'
      this.ctx.lineWidth = isCurrentPlayer ? 4 : 3
      this.ctx.stroke()
      
      // Black eyes (classic Agar.io style)
      const eyeSize = Math.max(3, playerRadius * 0.15)
      const eyeOffsetX = playerRadius * 0.3
      const eyeOffsetY = -playerRadius * 0.1
      
      this.ctx.fillStyle = '#000000'
      
      // Left eye
      this.ctx.beginPath()
      this.ctx.arc(player.x - eyeOffsetX, player.y + eyeOffsetY, eyeSize, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Right eye
      this.ctx.beginPath()
      this.ctx.arc(player.x + eyeOffsetX, player.y + eyeOffsetY, eyeSize, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Draw spawn protection ring with blue checkered pattern
      if (player.spawnProtection) {
        const ringRadius = playerRadius + 8
        const time = Date.now() / 1000
        const pulseIntensity = Math.sin(time * 4) * 0.3 + 0.7 // Pulse between 0.4 and 1.0
        
        // Draw checkered pattern ring
        this.ctx.save()
        this.ctx.globalAlpha = pulseIntensity
        
        // Create checkered pattern by drawing segments
        const segments = 24 // Number of segments around the circle
        const anglePerSegment = (Math.PI * 2) / segments
        
        for (let i = 0; i < segments; i++) {
          const startAngle = i * anglePerSegment
          const endAngle = (i + 1) * anglePerSegment
          
          // Alternate between two shades of blue for checkered effect
          if (i % 2 === 0) {
            this.ctx.strokeStyle = '#3B82F6' // Bright blue
          } else {
            this.ctx.strokeStyle = '#1E40AF' // Darker blue
          }
          
          this.ctx.lineWidth = 6
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius, startAngle, endAngle)
          this.ctx.stroke()
        }
        
        // Draw inner glow ring with checkered pattern
        const innerRingRadius = playerRadius + 5
        for (let i = 0; i < segments; i++) {
          const startAngle = i * anglePerSegment
          const endAngle = (i + 1) * anglePerSegment
          
          // Alternate pattern for inner ring (offset by 1 for better visual)
          if ((i + 1) % 2 === 0) {
            this.ctx.strokeStyle = '#60A5FA' // Light blue
          } else {
            this.ctx.strokeStyle = '#2563EB' // Medium blue
          }
          
          this.ctx.lineWidth = 3
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, innerRingRadius, startAngle, endAngle)
          this.ctx.stroke()
        }
        
        this.ctx.restore()
      }
      
      // Draw cash out progress ring - visible to ALL players when someone is cashing out
      // For current player, check both server state and local state
      let shouldShowCashOutRing = player.isCashingOut
      let actualProgress = player.cashOutProgress
      
      // If this is the current player, also check local state for immediate feedback
      if (isCurrentPlayer && this.localCashOutState) {
        shouldShowCashOutRing = shouldShowCashOutRing || this.localCashOutState.isCashingOut
        actualProgress = this.localCashOutState.cashOutProgress || actualProgress
      }
      
      if (shouldShowCashOutRing) {
        // Debug logging for cash out ring
        if (isCurrentPlayer) {
          console.log('💰 Cash out ring rendering:', {
            playerName: player.name,
            playerX: player.x,
            playerY: player.y,
            playerRadius: playerRadius,
            serverIsCashingOut: player.isCashingOut,
            serverProgress: player.cashOutProgress,
            localIsCashingOut: this.localCashOutState?.isCashingOut,
            localProgress: this.localCashOutState?.cashOutProgress,
            shouldShow: shouldShowCashOutRing,
            actualProgress: actualProgress
          })
        }
        const ringRadius = playerRadius + 12  // Slightly larger than spawn protection ring
        const progressAngle = (actualProgress / 100) * Math.PI * 2
        
        // Draw background ring (full circle)
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius, 0, Math.PI * 2)
        this.ctx.strokeStyle = 'rgba(255, 193, 7, 0.3)' // Semi-transparent yellow background
        this.ctx.lineWidth = 6
        this.ctx.stroke()
        
        // Draw the main progress arc - bright yellow
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + progressAngle)
        this.ctx.strokeStyle = '#ffff00' // Bright yellow
        this.ctx.lineWidth = 6
        this.ctx.lineCap = 'round'
        this.ctx.stroke()
        
        // Add outer glow effect
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius + 2, -Math.PI / 2, -Math.PI / 2 + progressAngle)
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)' // Subtle yellow glow
        this.ctx.lineWidth = 3
        this.ctx.lineCap = 'round'
        this.ctx.stroke()
        
        // Add pulsing effect for cash out ring
        const time = Date.now() / 1000
        const pulseIntensity = Math.sin(time * 6) * 0.3 + 0.8 // Subtle pulsing
        this.ctx.globalAlpha = pulseIntensity
        
        // Draw inner glow for cash out
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius - 2, -Math.PI / 2, -Math.PI / 2 + progressAngle)
        this.ctx.strokeStyle = '#ffff66' // Bright yellow inner glow
        this.ctx.lineWidth = 3
        this.ctx.lineCap = 'round'
        this.ctx.stroke()
        
        this.ctx.globalAlpha = 1.0 // Reset alpha
        
        // Cash out text removed as per user request
      }
    }
    
    // Helper function to adjust color brightness
    adjustColorBrightness(hexColor, percent) {
      const num = parseInt(hexColor.replace("#", ""), 16)
      const amt = Math.round(2.55 * percent)
      const R = (num >> 16) + amt
      const G = (num >> 8 & 0x00FF) + amt
      const B = (num & 0x0000FF) + amt
      return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
    }
    
    drawCoin(coin) {
      // Simple coin rendering matching local agario style
      const coinRadius = coin.radius || 6
      
      // Main coin body - use coin color from server or default gold
      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, coinRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = coin.color || '#FFD700'
      this.ctx.fill()
      
      // Orange/gold border like local agario
      this.ctx.strokeStyle = '#FFB000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
      
      // Draw $ symbol like local agario
      this.ctx.fillStyle = '#000000'
      this.ctx.font = 'bold 12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText('$', coin.x, coin.y + 1) // Slight vertical adjustment for better centering
    }
    
    drawVirus(virus) {
      // Create unique ID for virus (using position as identifier since viruses don't move)
      const virusId = `${Math.round(virus.x)}_${Math.round(virus.y)}`
      
      // Get or create persistent animation state for this virus
      let animationState = this.virusAnimationCache.get(virusId)
      if (!animationState) {
        // Initialize animation properties for new virus
        animationState = {
          currentRotation: Math.random() * 360, // Random starting rotation
          rotationSpeed: 0.5 + Math.random() * 0.5, // Varied rotation speeds
          pulsePhase: Math.random() * Math.PI * 2, // Random starting phase
          pulseSpeed: 0.02 + Math.random() * 0.01, // Slightly varied pulse speeds
          spikeWavePhase: Math.random() * Math.PI * 2, // Random spike wave start
          spikeWaveSpeed: 0.05 + Math.random() * 0.02, // Varied wave speeds
          colorShift: Math.random() * 10 - 5, // Random color variation
          glowIntensity: 0.5 + Math.random() * 0.3, // Varied glow intensity
          lastUpdate: Date.now()
        }
        this.virusAnimationCache.set(virusId, animationState)
      }
      
      // Update animation properties with delta time for smooth animation
      const now = Date.now()
      const deltaTime = Math.min((now - animationState.lastUpdate) / 1000, 0.1) // Cap delta to prevent jumps
      animationState.lastUpdate = now
      
      animationState.currentRotation += animationState.rotationSpeed * deltaTime * 60 // 60fps normalized
      animationState.pulsePhase += animationState.pulseSpeed * deltaTime * 60
      animationState.spikeWavePhase += animationState.spikeWaveSpeed * deltaTime * 60
      
      // Keep rotations within reasonable bounds
      if (animationState.currentRotation > 360) animationState.currentRotation -= 360
      if (animationState.pulsePhase > Math.PI * 4) animationState.pulsePhase -= Math.PI * 4
      if (animationState.spikeWavePhase > Math.PI * 4) animationState.spikeWavePhase -= Math.PI * 4
      
      // Set virus properties from server or defaults
      const virusRadius = virus.radius || 50
      const virusSpikes = virus.spikes || 12
      
      // Calculate animated values
      const pulseScale = 1 + Math.sin(animationState.pulsePhase) * 0.1 // Pulsing effect
      const glowPulse = 0.5 + Math.sin(animationState.pulsePhase * 1.5) * 0.3 // Glow pulsing
      
      this.ctx.save()
      this.ctx.translate(virus.x, virus.y)
      this.ctx.rotate((animationState.currentRotation * Math.PI) / 180)
      this.ctx.scale(pulseScale, pulseScale)
      
      // Create gradient for depth effect (matching local agario)
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, virusRadius + 20)
      gradient.addColorStop(0, `hsl(120, 100%, ${50 + animationState.colorShift}%)`)
      gradient.addColorStop(0.6, '#00FF41')
      gradient.addColorStop(1, '#00AA00')
      
      // Draw outer glow effect
      this.ctx.shadowColor = '#00FF41'
      this.ctx.shadowBlur = 15 * animationState.glowIntensity * glowPulse
      this.ctx.shadowOffsetX = 0
      this.ctx.shadowOffsetY = 0
      
      // Draw animated spikes (matching local agario complexity)
      this.ctx.beginPath()
      for (let i = 0; i < virusSpikes; i++) {
        const baseAngle = (i / virusSpikes) * Math.PI * 2
        
        // Individual spike wave animation
        const spikeWave = Math.sin(animationState.spikeWavePhase + i * 0.5) * 3
        const spikeLength = virusRadius + 12 + spikeWave
        const innerRadius = virusRadius - 3
        
        // Outer spike point
        const outerX = Math.cos(baseAngle) * spikeLength
        const outerY = Math.sin(baseAngle) * spikeLength
        
        // Inner points (between spikes)
        const nextAngle = ((i + 0.5) / virusSpikes) * Math.PI * 2
        const innerX = Math.cos(nextAngle) * innerRadius
        const innerY = Math.sin(nextAngle) * innerRadius
        
        if (i === 0) {
          this.ctx.moveTo(outerX, outerY)
        } else {
          this.ctx.lineTo(outerX, outerY)
        }
        this.ctx.lineTo(innerX, innerY)
      }
      this.ctx.closePath()
      
      // Fill with gradient
      this.ctx.fillStyle = gradient
      this.ctx.fill()
      
      // Draw spike outlines with animation
      this.ctx.strokeStyle = `rgba(0, 170, 0, ${0.8 + glowPulse * 0.2})`
      this.ctx.lineWidth = 2 + Math.sin(animationState.pulsePhase * 2) * 0.5
      this.ctx.stroke()
      
      // Reset shadow for inner elements
      this.ctx.shadowBlur = 0
      
      // Draw animated inner core
      const coreRadius = virusRadius - 15
      const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius)
      coreGradient.addColorStop(0, `rgba(0, 255, 65, ${0.8 + glowPulse * 0.2})`)
      coreGradient.addColorStop(0.5, 'rgba(0, 68, 0, 0.9)')
      coreGradient.addColorStop(1, 'rgba(0, 34, 0, 1)')
      
      this.ctx.beginPath()
      this.ctx.arc(0, 0, coreRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = coreGradient
      this.ctx.fill()
      
      // Draw pulsing energy lines in the core
      this.ctx.strokeStyle = `rgba(0, 255, 65, ${0.4 + glowPulse * 0.3})`
      this.ctx.lineWidth = 1
      
      for (let i = 0; i < 6; i++) {
        const lineAngle = (i / 6) * Math.PI * 2 + animationState.currentRotation * 0.02
        const lineLength = coreRadius * 0.6
        
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.lineTo(Math.cos(lineAngle) * lineLength, Math.sin(lineAngle) * lineLength)
        this.ctx.stroke()
      }
      
      // Draw central pulsing dot
      const centralDotRadius = 3 + Math.sin(animationState.pulsePhase * 3) * 1.5
      this.ctx.beginPath()
      this.ctx.arc(0, 0, centralDotRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + glowPulse * 0.2})`
      this.ctx.fill()
      
      this.ctx.restore()
    }
    
    drawPlayerPieces() {
      if (!this.playerPieces || this.playerPieces.length === 0) return
      
      // Draw each player piece (exact agario style)
      this.playerPieces.forEach(piece => {
        this.ctx.save()
        this.ctx.translate(piece.x, piece.y)

        // Main piece body (exact agario style)
        this.ctx.beginPath()
        this.ctx.arc(0, 0, piece.radius, 0, Math.PI * 2)
        const pieceColor = piece.skinColor || piece.color || this.selectedSkin?.color || '#4A90E2'
        this.ctx.fillStyle = pieceColor
        this.ctx.fill()
        
        // Piece border (like agario)
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
        
        // Add split piece indicator (small dot like agario)
        this.ctx.beginPath()
        this.ctx.arc(0, -piece.radius * 0.3, 3, 0, Math.PI * 2)
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fill()
        
        // Merge cooldown indicator (30 second cooldown like agario)
        if (!piece.canMerge) {
          const elapsed = Date.now() - piece.splitTime
          const progress = Math.min(elapsed / 30000, 1) // 30 second cooldown like agario
          
          // Draw cooldown ring (subtle like agario)
          this.ctx.beginPath()
          this.ctx.arc(0, 0, piece.radius + 4, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
          this.ctx.lineWidth = 2
          this.ctx.stroke()
        } else {
          // Draw merge available indicator (subtle green glow like agario)
          this.ctx.beginPath()
          this.ctx.arc(0, 0, piece.radius + 2, 0, Math.PI * 2)
          this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'
          this.ctx.lineWidth = 1
          this.ctx.stroke()
        }
        
        this.ctx.restore()
      })
    }
  }

  // Initialize game ONLY when authenticated
  useEffect(() => {
    // Wait for Privy to be ready and user to be authenticated with user data available
    if (!ready || !authenticated || !user?.id || !playerName || playerName === 'Anonymous Player') {
      console.log('🔒 Waiting for authentication and player name...', { ready, authenticated, userId: user?.id, playerName })
      return
    }
    
    // Check if playerName has changed and we need to cleanup existing connection
    if (GLOBAL_CONNECTION_TRACKER.activeConnection && 
        GLOBAL_CONNECTION_TRACKER.userId === privyUserId && 
        GLOBAL_CONNECTION_TRACKER.lastPlayerName && 
        GLOBAL_CONNECTION_TRACKER.lastPlayerName !== playerName) {
      console.log(`🔄 Player name changed from "${GLOBAL_CONNECTION_TRACKER.lastPlayerName}" to "${playerName}" - cleaning up old connection`)
      
      // Cleanup existing connection due to name change
      try {
        GLOBAL_CONNECTION_TRACKER.activeConnection.leave()
      } catch (error) {
        console.log('⚠️ Error cleaning up connection due to name change:', error)
      }
      GLOBAL_CONNECTION_TRACKER.activeConnection = null
      GLOBAL_CONNECTION_TRACKER.lastPlayerName = null
    }
    
    // Store current playerName for future comparison
    GLOBAL_CONNECTION_TRACKER.lastPlayerName = playerName
    
    console.log('🎮 Arena initialization - setting up game for authenticated user...')
    console.log('🎮 Authenticated as:', playerName, '(', privyUserId, ')')
    
    // Apply mobile game class for full screen optimization
    if (isMobile) {
      document.body.classList.add('mobile-game-active')
    }
    
    // Remove default body margins/padding that might cause white borders
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#000000'
    document.documentElement.style.margin = '0'
    document.documentElement.style.padding = '0'
    document.documentElement.style.background = '#000000'
    
    if (!canvasRef.current) {
      console.log('❌ Canvas not ready')
      return
    }
    
    console.log('✅ Creating game engine and connecting to arena...')
    
    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    // Create game instance with selected skin
    const game = new MultiplayerGameEngine(canvas, sendInput, normalizedSelectedSkin, isMobile)
    gameRef.current = game
    
    game.start()
    setGameReady(true)
    
    // Game loop
    const gameLoop = () => {
      if (game.running) {
        game.update()
        game.render()
        requestAnimationFrame(gameLoop)
      }
    }
    
    requestAnimationFrame(gameLoop)
    
    // Connect to Colyseus only once and only when authenticated
    connectToColyseus()
    
    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      const componentId = componentIdRef.current
      console.log(`🧹 [${componentId}] Cleaning up arena connection...`)
      game.stop()
      if (continuousInputIntervalRef.current) {
        clearInterval(continuousInputIntervalRef.current)
        continuousInputIntervalRef.current = null
      }
      lastInputRef.current = { dx: 0, dy: 0 }
      window.removeEventListener('resize', handleResize)
      clearPingInterval()
      resetPingState(true)
      if (wsRef.current) {
        console.log(`🔌 [${componentId}] Disconnecting from Colyseus...`)
        wsRef.current.leave()
        wsRef.current = null
      }
      
      // Clear global connection if it's this component's connection
      if (GLOBAL_CONNECTION_TRACKER.activeConnection === wsRef.current) {
        GLOBAL_CONNECTION_TRACKER.activeConnection = null
        console.log(`🧹 [${componentId}] Cleared global connection reference`)
      }
      
      isConnectingRef.current = false // Reset connection flag on cleanup
      GLOBAL_CONNECTION_TRACKER.isConnecting = false // Reset global flag on cleanup
      
      // Cleanup mobile styles
      if (isMobile) {
        document.body.classList.remove('mobile-game-active')
      }
    }
  }, [
    ready,
    authenticated,
    user?.id,
    playerName,
    selectedSkinLoaded,
    normalizedSelectedSkin
  ]) // Add playerName to dependencies so effect responds to name changes
  
  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0" style={{ position: 'relative', margin: 0, padding: 0 }}>
      {/* Authentication Required Screen */}
      {(!ready || !authenticated || !user?.id) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          fontFamily: '"Rajdhani", sans-serif'
        }}>
          <div style={{
            color: '#ff6b6b',
            fontSize: '48px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            🔒 Arena Access Control
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '20px',
            maxWidth: '600px',
            lineHeight: '1.5'
          }}>
            Arena matches are restricted to authenticated Privy users only.<br/>
            This prevents duplicate players and ensures fair gameplay.
          </div>
          {/* Dynamic Authentication Status */}
          <div style={{
            color: '#00ff88',
            fontSize: '16px',
            textAlign: 'center',
            marginBottom: '30px',
            padding: '10px 20px',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '8px'
          }}>
            {authMessage || '🔄 Initializing authentication...'}
          </div>
          {ready && !authenticated && (
            <button
              onClick={login}
              style={{
                backgroundColor: '#00ff88',
                color: '#000000',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: '"Rajdhani", sans-serif',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#00cc6a'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#00ff88'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              Login with Privy
            </button>
          )}
          {!ready && (
            <div style={{
              color: '#ffffff',
              fontSize: '16px',
              opacity: '0.7'
            }}>
              Loading authentication...
            </div>
          )}
        </div>
      )}

      {/* Game Canvas - Full Screen */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair bg-black m-0 p-0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          margin: 0,
          padding: 0,
          border: 'none',
          outline: 'none',
          display: 'block'
        }}
      />

      {/* Mission Popup */}
      {shouldRenderMissionPopup && (
        <div
          style={{
            position: 'fixed',
            top: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            pointerEvents: 'none',
            paddingLeft: isMobile ? 'calc(env(safe-area-inset-left, 0px) + 12px)' : '0',
            paddingRight: isMobile ? 'calc(env(safe-area-inset-right, 0px) + 12px)' : '0'
          }}
        >
          {showMissionCompletion ? (
            <div
              title={missionCompletionIndicator?.name ? `Completed: ${missionCompletionIndicator.name}` : 'Mission complete'}
              style={{
                background: 'rgba(15, 15, 15, 0.92)',
                border: '1px solid rgba(34, 197, 94, 0.65)',
                borderRadius: '9999px',
                padding: isMobile ? '8px 16px' : '10px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '10px',
                color: '#ffffff',
                fontFamily: '"Rajdhani", sans-serif',
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: 'default',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
                pointerEvents: 'auto',
                backdropFilter: 'blur(6px)'
              }}
              role="status"
              aria-live="polite"
            >
              <span style={{ fontSize: isMobile ? '16px' : '18px' }}>✅</span>
              <span style={{ color: '#22c55e', textTransform: 'uppercase' }}>Mission Complete</span>
              {missionCompletionIndicator?.reward > 0 && (
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    borderRadius: '9999px',
                    padding: '2px 10px',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                >
                  +{missionCompletionIndicator.reward}💰
                </span>
              )}
            </div>
          ) : missionPopupCondensed ? (
            <button
              type="button"
              onClick={handleMissionExpand}
              style={{
                background: 'rgba(15, 15, 15, 0.92)',
                border: '1px solid rgba(251, 191, 36, 0.6)',
                borderRadius: '9999px',
                padding: isMobile ? '8px 14px' : '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px',
                color: '#ffffff',
                fontFamily: '"Rajdhani", sans-serif',
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
                pointerEvents: 'auto',
                backdropFilter: 'blur(6px)'
              }}
            >
              <span style={{ fontSize: isMobile ? '16px' : '18px' }}>🎯</span>
              <span style={{ color: '#fbbf24', textTransform: 'uppercase' }}>Missions</span>
              <span
                style={{
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#fbbf24',
                  borderRadius: '9999px',
                  padding: '2px 10px',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}
              >
                {activeMissionCount}
              </span>
            </button>
          ) : (
            <div
              style={{
                background: 'rgba(15, 15, 15, 0.94)',
                border: '1px solid rgba(251, 191, 36, 0.55)',
                borderRadius: isMobile ? '12px' : '16px',
                padding: isMobile ? '14px' : '18px',
                width: isMobile ? 'min(360px, calc(100vw - 32px))' : '380px',
                maxWidth: '420px',
                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.55)',
                color: '#ffffff',
                fontFamily: '"Rajdhani", sans-serif',
                pointerEvents: 'auto',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: isMobile ? '10px' : '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      fontSize: isMobile ? '22px' : '26px',
                      lineHeight: 1
                    }}
                  >
                    🎯
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: isMobile ? '14px' : '16px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}
                    >
                      Mission Briefing
                    </div>
                    <div
                      style={{
                        fontSize: isMobile ? '11px' : '12px',
                        color: '#fbbf24',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                      }}
                    >
                      Objectives online
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleMissionCondense}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(148, 163, 184, 0.4)',
                    borderRadius: '9999px',
                    padding: isMobile ? '4px 10px' : '6px 12px',
                    color: '#cbd5f5',
                    fontSize: isMobile ? '10px' : '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase'
                  }}
                >
                  Minimize
                </button>
              </div>

              <p
                style={{
                  fontSize: isMobile ? '11px' : '12px',
                  color: '#cbd5f5',
                  margin: '0 0 12px 0',
                  letterSpacing: '0.4px'
                }}
              >
                Complete the active objectives to earn bonus rewards.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '12px' }}>
                {missionsToDisplay.map(mission => {
                  const progressValue = Math.min(mission.progress ?? 0, mission.target)
                  const progressPercent = mission.target > 0
                    ? Math.min(100, Math.round((progressValue / mission.target) * 100))
                    : 0

                  return (
                    <div
                      key={mission.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: isMobile ? '10px' : '12px',
                        border: '1px solid rgba(251, 191, 36, 0.2)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ fontSize: isMobile ? '20px' : '22px', lineHeight: 1 }}>{mission.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: isMobile ? '13px' : '14px',
                              letterSpacing: '0.5px'
                            }}
                          >
                            {mission.name}
                          </div>
                          <div
                            style={{
                              fontSize: isMobile ? '11px' : '12px',
                              color: 'rgba(203, 213, 225, 0.85)'
                            }}
                          >
                            {mission.description}
                          </div>
                        </div>
                        <div
                          style={{
                            color: '#fbbf24',
                            fontWeight: 700,
                            fontSize: isMobile ? '12px' : '13px'
                          }}
                        >
                          +{mission.reward}💰
                        </div>
                      </div>

                      <div
                        style={{
                          height: '6px',
                          borderRadius: '9999px',
                          background: 'rgba(255, 255, 255, 0.12)',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${progressPercent}%`,
                            background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                            height: '100%'
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '4px',
                          fontSize: '10px',
                          color: '#94a3b8',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}
                      >
                        <span>Progress</span>
                        <span>{progressValue}/{mission.target}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* UI Elements */}
      <div>
        {/* Live Leaderboard - Mobile Optimized */}
        <div 
          style={{ 
            position: 'fixed', 
            top: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 5px)' : '10px', 
            left: isMobile ? 'calc(env(safe-area-inset-left, 0px) + 5px)' : '10px', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: isMobile ? '1px solid rgba(0, 255, 255, 0.3)' : '2px solid rgba(0, 255, 255, 0.3)',
            borderRadius: isMobile ? '8px' : '6px',
            padding: isMobile ? (leaderboardExpanded ? '6px' : '4px') : '10px',
            minWidth: isMobile ? (leaderboardExpanded ? '110px' : '90px') : '160px',
            maxWidth: isMobile ? (leaderboardExpanded ? '120px' : '100px') : '180px',
            fontFamily: '"Rajdhani", sans-serif',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Header */}
          <div 
            onClick={handleLeaderboardToggle}
            style={{ 
              color: '#00ffff', 
              fontSize: isMobile ? (leaderboardExpanded ? '11px' : '10px') : '14px', 
              fontWeight: '700', 
              marginBottom: isMobile ? (leaderboardExpanded ? '6px' : '3px') : '10px',
              textAlign: 'center',
              letterSpacing: '0.2px',
              cursor: isMobile ? 'pointer' : 'default',
              userSelect: 'none',
              transition: 'all 0.2s ease',
              padding: isMobile ? '2px' : '0'
            }}
          >
            {isMobile 
              ? (leaderboardExpanded ? 'Top 5' : 'Top 3')
              : '💰 Live Leaderboard'
            }
          </div>
          
          {/* Multiplayer Status Indicator */}
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: connectionStatus === 'connected'
              ? '#00ff00'
              : connectionStatus === 'connecting'
                ? '#ffff00'
                : connectionStatus === 'eliminated'
                  ? '#ff4444'
                  : '#ff0000',
            padding: isMobile ? '4px 8px' : '6px 12px',
            borderRadius: '8px',
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px solid ${connectionStatus === 'connected'
              ? '#00ff00'
              : connectionStatus === 'connecting'
                ? '#ffff00'
                : connectionStatus === 'eliminated'
                  ? '#ff4444'
                  : '#ff0000'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected'
                ? '#00ff00'
                : connectionStatus === 'connecting'
                  ? '#ffff00'
                  : connectionStatus === 'eliminated'
                    ? '#ff4444'
                    : '#ff0000',
              animation: connectionStatus === 'connecting' ? 'pulse 1s infinite alternate' : 'none'
            }}></span>
            <span>
              {connectionStatus === 'connected' && `🌐 MULTIPLAYER (${playerCount} players)`}
              {connectionStatus === 'connecting' && '🔄 CONNECTING...'}
              {connectionStatus === 'failed' && '❌ CONNECTION ERROR'}
              {connectionStatus === 'disconnected' && null}
              {connectionStatus === 'eliminated' && '☠️ ELIMINATED'}
            </span>
          </div>

          {/* Player Rankings - Dynamic Leaderboard */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? (leaderboardExpanded ? '2px' : '0px') : '4px', 
            marginBottom: isMobile ? '8px' : '10px',
            transition: 'all 0.3s ease'
          }}>
            {(() => {
              if (!gameRef.current || !serverState) return null;
              
              // Create leaderboard data from server state
              const leaderboardMap = new Map()

              if (serverState.players) {
                serverState.players.forEach((player, playerIndex) => {
                  if (!player?.alive) return

                  const isSplitPiece = player?.isSplitPiece
                  const ownerSessionId = player?.ownerSessionId

                  // Ignore orphaned split pieces that don't have an owner reference.
                  if (isSplitPiece && !ownerSessionId) {
                    return
                  }

                  const ownerId = isSplitPiece
                    ? ownerSessionId
                    : (player.sessionId || ownerSessionId || `player_${playerIndex}`)

                  if (!ownerId) {
                    return
                  }

                  const playerScore = Math.floor(player.score || 0)
                  const existingEntry = leaderboardMap.get(ownerId)
                  const isCurrentPlayer = !!player.isCurrentPlayer

                  if (existingEntry) {
                    const useNewName = playerScore > existingEntry.score && player?.name
                    leaderboardMap.set(ownerId, {
                      ownerId,
                      name: useNewName ? player.name : existingEntry.name,
                      score: Math.max(existingEntry.score, playerScore),
                      isPlayer: existingEntry.isPlayer || isCurrentPlayer
                    })
                  } else {
                    leaderboardMap.set(ownerId, {
                      ownerId,
                      name: player.name || 'Anonymous',
                      score: playerScore,
                      isPlayer: isCurrentPlayer
                    })
                  }
                })
              }

              const leaderboardData = Array.from(leaderboardMap.values()).sort((a, b) => b.score - a.score)

              // Take top 3 (compact) or top 5 (expanded) players for mobile, always 5 for desktop
              const maxPlayers = isMobile ? (leaderboardExpanded ? 5 : 3) : 5
              return leaderboardData.slice(0, maxPlayers).map((player, index) => (
                <div key={player.ownerId} style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: isMobile ? (leaderboardExpanded ? '2px 4px' : '1px 2px') : '4px 8px',
                  backgroundColor: player.isPlayer ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  borderRadius: isMobile ? '6px' : '4px',
                  border: player.isPlayer ? '1px solid rgba(0, 255, 255, 0.3)' : 'none',
                  minHeight: isMobile ? (leaderboardExpanded ? '14px' : '12px') : 'auto',
                  transition: 'all 0.2s ease',
                  opacity: isMobile && !leaderboardExpanded && index >= 3 ? 0 : 1,
                  transform: isMobile && !leaderboardExpanded && index >= 3 ? 'translateY(-10px)' : 'translateY(0)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? (leaderboardExpanded ? '3px' : '2px') : '6px' }}>
                    <span style={{ 
                      color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#ffffff',
                      fontSize: isMobile ? (leaderboardExpanded ? '9px' : '8px') : '12px', 
                      fontWeight: '700',
                      minWidth: isMobile ? (leaderboardExpanded ? '10px' : '8px') : '14px'
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ 
                      color: player.isPlayer ? '#00ffff' : '#ffffff', 
                      fontSize: isMobile ? (leaderboardExpanded ? '8px' : '7px') : '12px', 
                      fontWeight: '600',
                      maxWidth: isMobile ? (leaderboardExpanded ? '50px' : '40px') : '80px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {player.name}
                    </span>
                  </div>
                  <span style={{ 
                    color: '#fbbf24', 
                    fontSize: isMobile ? (leaderboardExpanded ? '8px' : '7px') : '12px', 
                    fontWeight: '700',
                    textShadow: '0 0 4px rgba(251, 191, 36, 0.6)'
                  }}>
                    {player.score}
                  </span>
                </div>
              ))
            })()}
          </div>
        </div>

        {/* Live Ping Meter - Bottom Left */}
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)' : '10px',
            left: '10px',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.82)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: isMobile ? '6px 10px' : '8px 12px',
            minWidth: '140px',
            color: '#e5e7eb',
            fontFamily: '"Rajdhani", sans-serif',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '6px',
              marginBottom: '4px'
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '9999px',
                backgroundColor: pingIndicatorColor,
                boxShadow: `0 0 10px ${pingIndicatorColor}66`
              }}
            />
            <span
              style={{
                fontWeight: 700,
                fontSize: isMobile ? '11px' : '12px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: pingIndicatorColor
              }}
            >
              {pingDisplayText}
            </span>
          </div>
          <div
            style={{
              fontSize: isMobile ? '9px' : '10px',
              letterSpacing: '0.03em',
              color: '#9ca3af'
            }}
          >
            {pingSubtitle}
          </div>
        </div>

        {/* Player Info Panel - Bottom Right (compact) - FROM LOCAL AGARIO */}
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)' : '10px',
          left: isMobile ? '50%' : 'auto',
          right: isMobile ? 'auto' : '10px',
          transform: isMobile ? 'translateX(-50%)' : 'none',
          zIndex: 1000,
          // Minimal mobile styling
          background: isMobile 
            ? 'rgba(0, 0, 0, 0.6)'
            : 'rgba(0, 0, 0, 0.85)',
          border: isMobile 
            ? 'none' 
            : '2px solid #333',
          borderRadius: isMobile ? '6px' : '4px',
          padding: isMobile ? (statsExpanded ? '4px 6px' : '2px 4px') : '12px 14px',
          fontSize: isMobile ? (statsExpanded ? '9px' : '8px') : '11px',
          color: '#ccc',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: '600',
          minWidth: isMobile ? (statsExpanded ? '100px' : '75px') : '160px',
          maxWidth: isMobile ? 'none' : '180px',
          transition: 'all 0.2s ease'
        }}>
          {/* Header */}
          <div 
            onClick={handleStatsToggle}
            style={{ 
              color: isMobile ? '#9ca3af' : '#22d3ee', 
              fontSize: isMobile ? (statsExpanded ? '9px' : '8px') : '14px', 
              fontWeight: '600', 
              marginBottom: isMobile ? (statsExpanded ? '3px' : '1px') : '8px',
              borderBottom: isMobile ? 'none' : '1px solid #333',
              paddingBottom: isMobile ? '0' : '6px',
              cursor: isMobile ? 'pointer' : 'default',
              userSelect: 'none',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              opacity: isMobile ? '0.8' : '1'
            }}
            onTouchStart={isMobile ? (e) => { e.target.style.color = '#00ffff' } : undefined}
            onTouchEnd={isMobile ? (e) => { e.target.style.color = '#22d3ee' } : undefined}
          >
            {isMobile 
              ? (statsExpanded ? 'You' : 'Stats')
              : 'You'
            }
          </div>
          
          {/* Stats - Compact or Expanded */}
          {!isMobile || statsExpanded ? (
            /* Full Stats - Desktop always, Mobile when expanded */
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: isMobile ? '3px' : '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Worth:</span>
                <span style={{ color: '#22c55e', fontWeight: '700' }}>${score}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Mass:</span>
                <span style={{ color: '#ffffff', fontWeight: '700' }}>{Math.floor(mass)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>K/D:</span>
                <span style={{ color: '#ffffff', fontWeight: '700' }}>{eliminations}/0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Streak:</span>
                <span style={{ color: '#ffffff', fontWeight: '700' }}>{eliminations} 🔥</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Coins:</span>
                <span style={{ color: '#ffffff', fontWeight: '700' }}>{score}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Time:</span>
                <span style={{ color: '#ffffff', fontWeight: '700' }}>
                  {Math.floor(timeSurvived / 60)}:{(timeSurvived % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          ) : (
            /* Compact 2-Line Stats - Mobile only */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {/* Line 1: Net Worth • Mass */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 4px',
                background: 'rgba(34, 197, 94, 0.15)',
                borderRadius: '6px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ 
                    color: '#22c55e',
                    textShadow: '0 0 6px rgba(34, 197, 94, 0.8)'
                  }}>${score}</span>
                  <span style={{ 
                    fontSize: '6px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>Worth</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ 
                    color: '#e5e7eb',
                    textShadow: '0 0 4px rgba(229, 231, 235, 0.8)'
                  }}>{Math.floor(mass)}m</span>
                  <span style={{ 
                    fontSize: '6px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>Mass</span>
                </div>
              </div>
              {/* Line 2: K/D • Streak */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '9px',
                fontWeight: '700',
                padding: '2px 4px',
                background: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '6px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ 
                    color: '#3b82f6',
                    textShadow: '0 0 6px rgba(59, 130, 246, 0.8)'
                  }}>{eliminations}/0</span>
                  <span style={{ 
                    fontSize: '6px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>K/D</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ 
                    color: '#f59e0b',
                    textShadow: '0 0 4px rgba(245, 158, 11, 0.8)'
                  }}>{eliminations} 🔥</span>
                  <span style={{ 
                    fontSize: '6px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>Streak</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Virtual Joystick - Mobile Only */}
        {isMobile && (
          <div 
            ref={joystickRef}
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 30px)',
              left: 'calc(env(safe-area-inset-left, 0px) + 30px)',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: (gameRef.current && gameRef.current.player) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: (gameRef.current && gameRef.current.player) ? '3px solid rgba(255, 255, 255, 0.4)' : '3px solid rgba(255, 255, 255, 0.15)',
              animation: (!joystickActive && gameRef.current && gameRef.current.player) ? 'joystickPulse 3s ease-in-out infinite' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              touchAction: 'none',
              userSelect: 'none',
              opacity: (gameRef.current && gameRef.current.player) ? 1 : 0.3,
              boxShadow: (gameRef.current && gameRef.current.player) 
                ? '0 0 20px rgba(255, 255, 255, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.1)'
                : '0 0 10px rgba(255, 255, 255, 0.1), inset 0 0 10px rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onMouseDown={handleJoystickStart}
            onMouseMove={handleJoystickMove}
            onMouseUp={handleJoystickEnd}
          >
            {/* Joystick Knob */}
            <div
              ref={joystickKnobRef}
              style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                backgroundColor: joystickActive ? 'rgba(0, 150, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                border: `2px solid ${joystickActive ? '#0096ff' : 'rgba(255, 255, 255, 0.9)'}`,
                transform: `translate(${joystickPosition.x}px, ${joystickPosition.y}px)`,
                transition: joystickActive ? 'none' : 'all 0.2s ease-out',
                boxShadow: joystickActive 
                  ? '0 0 15px rgba(0, 150, 255, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.2)',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: joystickActive ? '#ffffff' : 'rgba(0, 0, 0, 0.3)',
                transition: 'background-color 0.2s ease'
              }} />
            </div>
            
            <div style={{
              position: 'absolute',
              bottom: '-25px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: '600',
              fontFamily: '"Rajdhani", sans-serif',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
            }}>
              MOVE
            </div>
          </div>
        )}

        {/* Circular Minimap - Shows Only Playable Area */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          width: isMobile ? '121px' : '220px',
          height: isMobile ? '121px' : '220px'
        }}>
          <div style={{
            width: isMobile ? '121px' : '220px',
            height: isMobile ? '121px' : '220px',
            borderRadius: '50%',
            backgroundColor: '#000000', // Pure black background
            backgroundImage: 'none', // Prevent any inherited gradients
            border: isMobile ? '2px solid #00ff00' : '4px solid #00ff00',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Player dot - positioned within playable area bounds only */}
            <div style={{
              position: 'absolute',
              width: isMobile ? '6px' : '12px',
              height: isMobile ? '6px' : '12px',
              backgroundColor: '#60a5fa',
              borderRadius: '50%',
              left: `${((minimapData.playerX - (2000 - 1800)) / (1800 * 2)) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`, // Map playable area (200-3800) to full minimap
              top: `${((minimapData.playerY - (2000 - 1800)) / (1800 * 2)) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`, // Map playable area (200-3800) to full minimap
              transform: 'translate(-50%, -50%)',
              border: isMobile ? '1px solid #ffffff' : '3px solid #ffffff',
              zIndex: 10
            }} />
            
            {minimapData.enemies.map((enemy, i) => (
              <div
                key={i}
                title={enemy.isPlayer ? `Player: ${enemy.name || 'Anonymous'}` : 'AI Enemy'}
                style={{
                  position: 'absolute',
                  width: isMobile ? '4px' : '7px',
                  height: isMobile ? '4px' : '7px',
                  backgroundColor: enemy.isPlayer ? '#00ff88' : '#ff6b6b',
                  borderRadius: '50%',
                  left: `${((enemy.x - (2000 - 1800)) / (1800 * 2)) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`, // Map playable area (200-3800) to full minimap
                  top: `${((enemy.y - (2000 - 1800)) / (1800 * 2)) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`, // Map playable area (200-3800) to full minimap
                  transform: 'translate(-50%, -50%)',
                  opacity: enemy.isPlayer ? '1.0' : '0.8',
                  border: enemy.isPlayer 
                    ? (isMobile ? '1px solid #ffffff' : '2px solid #ffffff') 
                    : (isMobile ? '0.5px solid #ffffff' : '1px solid #ffffff'),
                  boxShadow: enemy.isPlayer ? '0 0 4px rgba(0, 255, 136, 0.6)' : 'none',
                  zIndex: enemy.isPlayer ? 10 : 8
                }}
              />
            ))}
            
            {/* No boundary circle - players can move freely throughout the world */}
            
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              borderRadius: '50%',
              border: '3px solid rgba(0, 255, 0, 0.8)',
              boxShadow: 'inset 0 0 18px rgba(0, 255, 0, 0.25)',
              background: 'transparent',
              pointerEvents: 'none'
            }} />
          </div>
        </div>

        {/* Cash Out Button - centered bottom position */}
        <div 
          style={{
            position: 'fixed',
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 20px)' : '30px',
            left: '50%',
            transform: 'translateX(-50%)', // Center horizontally
            marginLeft: '-120px', // Offset left from center
            zIndex: 1000,
            backgroundColor: isCashingOut ? 'rgba(255, 140, 0, 0.95)' : 'rgba(255, 165, 0, 0.95)',
            border: '3px solid #ff8c00',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: '700',
            cursor: cashOutComplete ? 'default' : 'pointer',
            padding: isMobile ? '8px 12px' : '10px 16px',
            minWidth: isMobile ? '140px' : '200px',
            textAlign: 'center',
            fontFamily: '"Rajdhani", sans-serif',
            userSelect: 'none',
            opacity: cashOutComplete ? 0.6 : 1,
            pointerEvents: cashOutComplete ? 'none' : 'auto',
            boxShadow: isCashingOut 
              ? '0 0 20px rgba(255, 165, 0, 0.8)' 
              : '0 4px 12px rgba(255, 165, 0, 0.4)',
            transition: 'all 0.3s ease',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (!isCashingOut && !cashOutComplete) {
              e.target.style.backgroundColor = 'rgba(255, 140, 0, 1)'
              e.target.style.boxShadow = '0 0 25px rgba(255, 165, 0, 0.9)'
            }
          }}
          onMouseOut={(e) => {
            if (!isCashingOut) {
              e.target.style.backgroundColor = 'rgba(255, 165, 0, 0.95)'
              e.target.style.boxShadow = isCashingOut 
                ? '0 0 20px rgba(255, 165, 0, 0.8)' 
                : '0 4px 12px rgba(255, 165, 0, 0.4)'
            }
          }}
          onTouchStart={(e) => {
            if (!isMobile) return
            handleCashOut()
            // No transform on touch to prevent movement
          }}
          onTouchEnd={(e) => {
            if (!isMobile) return
            // No transform on touch end to prevent movement
          }}
          onMouseDown={isMobile ? undefined : handleCashOut}
        >
          {/* Progress fill overlay */}
          {isCashingOut && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${cashOutProgress}%`,
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              transition: 'width 0.1s ease-out',
              zIndex: -1
            }} />
          )}
          
          <span style={{ 
            position: 'relative',
            zIndex: 1,
            display: 'block',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
          }}>
            {cashOutComplete 
              ? `✅ Cashed Out! +$${score}`
              : isMobile 
                ? (isCashingOut ? `🔥 ${Math.floor(cashOutProgress)}%` : `🔥 Hold E ($${score})`)
                : (isCashingOut 
                  ? `🔥 Cashing Out... ${Math.floor(cashOutProgress)}%`
                  : `🔥 Hold E to Cash Out ($${score})`)
            }
          </span>
        </div>

        {/* Split Button - centered bottom right position */}
        <div 
          onClick={(e) => handleSplit(e)}
          style={{
            backgroundColor: 'rgba(0, 100, 255, 0.9)',
            border: '3px solid #0064ff',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: '700',
            cursor: 'pointer',
            padding: isMobile ? '8px 12px' : '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 20px)' : '30px',
            left: '50%',
            transform: 'translateX(-50%)', // Center horizontally  
            marginLeft: '120px', // Offset right from center
            zIndex: 1000,
            fontFamily: '"Rajdhani", sans-serif',
            userSelect: 'none',
            minWidth: isMobile ? '120px' : '160px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 100, 255, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 80, 200, 1)'
            e.target.style.boxShadow = '0 0 20px rgba(0, 100, 255, 0.8)'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 100, 255, 0.9)'
            e.target.style.boxShadow = '0 4px 12px rgba(0, 100, 255, 0.4)'
          }}
          onTouchStart={(e) => {
            if (!isMobile) return
            // No transform on touch to prevent movement
          }}
          onTouchEnd={(e) => {
            if (!isMobile) return
            // No transform on touch end to prevent movement
          }}
        >
          <span style={{ 
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
          }}>
            {isMobile ? '✂️ Split' : '✂️ Split (Space)'}
          </span>
        </div>

      </div>

      {/* Loading Modal */}
      {showLoadingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          fontFamily: '"Rajdhani", sans-serif'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '3px solid #ffff00',
            borderRadius: '16px',
            padding: '60px 40px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(255, 255, 0, 0.4)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            {/* Loading Spinner */}
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 30px auto',
              border: '4px solid rgba(255, 255, 0, 0.3)',
              borderTop: '4px solid #ffff00',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            
            {/* Main Title */}
            <h1 style={{
              color: '#ffff00',
              fontSize: '28px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              JOINING ARENA
            </h1>
            
            {/* Subtitle */}
            <p style={{
              color: '#ffffff',
              fontSize: '16px',
              margin: '0 0 24px 0',
              opacity: 0.9,
              lineHeight: '1.4'
            }}>
              Connecting to arena room...<br />
              Please wait while we set up your game.
            </p>
            
            {/* Loading dots animation */}
            <div style={{
              color: '#ffff00',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              <span style={{ animation: 'fadeInOut 1.5s ease-in-out infinite' }}>●</span>
              <span style={{ animation: 'fadeInOut 1.5s ease-in-out infinite 0.5s' }}>●</span>
              <span style={{ animation: 'fadeInOut 1.5s ease-in-out infinite 1s' }}>●</span>
            </div>
          </div>
        </div>
      )}

      {/* Cashout Success Modal */}
      {showCashOutSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          fontFamily: '"Rajdhani", sans-serif'
        }}>
          <div style={{
            backgroundColor: '#1f1f1f',
            border: '3px solid #ffff00',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(255, 255, 0, 0.5)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            {/* Trophy Icon */}
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏆</div>
            
            {/* Main Title */}
            <h1 style={{
              color: '#ffff00',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              CASHOUT SUCCESSFUL!
            </h1>
            
            {/* Subtitle */}
            <p style={{
              color: '#ffffff',
              fontSize: '16px',
              margin: '0 0 16px 0',
              opacity: 0.9
            }}>
              Congratulations! You've successfully cashed out!
            </p>
            
            {/* Auto-redirect countdown */}
            <p style={{
              color: '#ffff00',
              fontSize: '14px',
              margin: '0 0 32px 0',
              opacity: 0.8
            }}>
              Returning to main menu in {autoRedirectCountdown} seconds...
            </p>
            
            {/* Stats Cards */}
            <div style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '32px',
              justifyContent: 'center'
            }}>
              {/* Time Survived Card */}
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '20px',
                minWidth: '120px',
                border: '1px solid #404040'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  {Math.floor((Date.now() - gameStats.timeStarted) / 60000)}m {Math.floor(((Date.now() - gameStats.timeStarted) % 60000) / 1000)}s
                </div>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  textTransform: 'uppercase'
                }}>
                  TIME SURVIVED
                </div>
              </div>
              
              {/* Eliminations Card */}
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '20px',
                minWidth: '120px',
                border: '1px solid #404040'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚔️</div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  {gameStats.eliminations}
                </div>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  textTransform: 'uppercase'
                }}>
                  ELIMINATIONS
                </div>
              </div>
            </div>
            
            {/* Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowCashOutSuccessModal(false)
                  setCashOutComplete(false)
                  setGameStats({ timeStarted: Date.now(), eliminations: 0 })
                  // Reset game state but stay in arena
                  window.location.reload()
                }}
                style={{
                  backgroundColor: '#ffff00',
                  color: '#1f1f1f',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Rajdhani", sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#ffff66'
                  e.target.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ffff00'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                PLAY AGAIN
              </button>
              
              <button
                onClick={() => {
                  window.location.href = '/'
                }}
                style={{
                  backgroundColor: '#404040',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: '"Rajdhani", sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#505050'
                  e.target.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#404040'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                BACK TO MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Popup */}
      {gameOver && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000000,
            pointerEvents: 'auto'
          }}
        >
          <div
            style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ff4444',
              borderRadius: isMobile ? '8px' : '12px',
              maxWidth: isMobile ? '300px' : '500px',
              width: '90%',
              padding: 0,
              color: 'white',
              boxShadow: '0 0 50px rgba(255, 68, 68, 0.5)',
              fontFamily: '"Rajdhani", sans-serif'
            }}
          >
            <div
              style={{
                padding: isMobile ? '12px' : '24px',
                borderBottom: '2px solid #ff4444',
                background: 'linear-gradient(45deg, rgba(255, 68, 68, 0.1) 0%, rgba(255, 68, 68, 0.05) 100%)',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: isMobile ? '40px' : '60px',
                  height: isMobile ? '40px' : '60px',
                  background: 'linear-gradient(45deg, #ff4444 0%, #cc3333 100%)',
                  borderRadius: isMobile ? '8px' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '20px' : '30px',
                  margin: isMobile ? '0 auto 8px' : '0 auto 16px'
                }}
              >
                💀
              </div>
              <h2
                style={{
                  color: '#ff4444',
                  fontSize: isMobile ? '20px' : '32px',
                  fontWeight: '700',
                  margin: isMobile ? '0 0 4px' : '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(255, 68, 68, 0.6)'
                }}
              >
                GAME OVER
              </h2>
              <p
                style={{
                  color: '#e2e8f0',
                  fontSize: isMobile ? '12px' : '16px',
                  margin: 0,
                  opacity: '0.8'
                }}
              >
                You have been eliminated!
              </p>
              {gameOverDetails.eliminatedBy && (
                <p
                  style={{
                    color: '#fbbf24',
                    fontSize: isMobile ? '11px' : '14px',
                    margin: isMobile ? '6px 0 0' : '10px 0 0'
                  }}
                >
                  Eliminated by {gameOverDetails.eliminatedBy}
                </p>
              )}
            </div>

            <div style={{ padding: isMobile ? '12px' : '24px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: isMobile ? '8px' : '16px',
                  marginBottom: isMobile ? '12px' : '24px'
                }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: isMobile ? '8px' : '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      color: '#68d391',
                      fontSize: isMobile ? '16px' : '24px',
                      fontWeight: '700'
                    }}
                  >
                    ${gameOverDetails.finalScore || score}
                  </div>
                  <div
                    style={{
                      color: '#a0aec0',
                      fontSize: isMobile ? '10px' : '14px'
                    }}
                  >
                    Final Score
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: isMobile ? '8px' : '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      color: '#60a5fa',
                      fontSize: isMobile ? '16px' : '24px',
                      fontWeight: '700'
                    }}
                  >
                    {gameOverDetails.finalMass || Math.round(mass)} KG
                  </div>
                  <div
                    style={{
                      color: '#a0aec0',
                      fontSize: isMobile ? '10px' : '14px'
                    }}
                  >
                    Final Mass
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '8px' : '12px'
                }}
              >
                <button
                  onClick={handleArenaRestart}
                  style={{
                    backgroundColor: '#ffd700',
                    border: '2px solid #ffb000',
                    borderRadius: '8px',
                    color: '#1a202c',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '700',
                    padding: isMobile ? '8px 16px' : '12px 24px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    fontFamily: '"Rajdhani", sans-serif',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#ffb000'
                    e.target.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#ffd700'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  PLAY AGAIN
                </button>
                <button
                  onClick={handleReportPlayer}
                  style={{
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    border: '2px solid #ff4444',
                    borderRadius: '8px',
                    color: '#ff4444',
                    fontSize: isMobile ? '11px' : '14px',
                    fontWeight: '600',
                    padding: isMobile ? '6px 12px' : '8px 16px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    fontFamily: '"Rajdhani", sans-serif',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.2)'
                    e.target.style.transform = 'translateY(-1px)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.1)'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  REPORT PLAYER
                </button>
                <button
                  onClick={handleBackToLobby}
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #a0aec0',
                    borderRadius: '8px',
                    color: '#a0aec0',
                    fontSize: isMobile ? '12px' : '16px',
                    fontWeight: '600',
                    padding: isMobile ? '8px 16px' : '12px 24px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    fontFamily: '"Rajdhani", sans-serif',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#a0aec0'
                    e.target.style.color = '#1a202c'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'transparent'
                    e.target.style.color = '#a0aec0'
                  }}
                >
                  BACK TO LOBBY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(255, 255, 0, 0.5); }
          50% { box-shadow: 0 0 50px rgba(255, 255, 0, 0.8); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        @keyframes joystickPulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.1);
          }
          50% { 
            transform: scale(1.05); 
            box-shadow: 0 0 25px rgba(255, 255, 255, 0.3), inset 0 0 25px rgba(255, 255, 255, 0.15);
          }
        }
        
        @keyframes minimapRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .mobile-game-active {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: #000000 !important;
        }
      `}</style>
    </div>
  )
}

export default MultiplayerArena