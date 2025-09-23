'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const AgarIOGame = () => {
  console.log('🎮 AGARIO PAGE COMPONENT RENDERING - URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')
  
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  console.log('🎮 SEARCH PARAMS:', Array.from(searchParams.entries()))
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [cheatingBan, setCheatingBan] = useState(false)
  const [missionTime, setMissionTime] = useState(60)
  const [score, setScore] = useState(0)
  const [mass, setMass] = useState(20)
  const [eliminations, setEliminations] = useState(0)
  const [timeSurvived, setTimeSurvived] = useState(0)
  
  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [connectedPlayers, setConnectedPlayers] = useState(0)
  const [wsConnection, setWsConnection] = useState('disconnected')
  const wsRef = useRef(null)
  const inputSequenceRef = useRef(0)
  const lastInputRef = useRef({ dx: 0, dy: 0 })
  const serverStateRef = useRef(null)
  
  // Missions system
  const [currency, setCurrency] = useState(0) // Coins earned from missions
  const [completedMissions, setCompletedMissions] = useState([])
  const [activeMissions, setActiveMissions] = useState([])
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0) // For cycling through missions

  // Mission definitions
  const missionTypes = [
    { id: 'collect_coins_10', name: 'Coin Hunter I', description: 'Collect 10 coins', target: 10, reward: 50, icon: '🪙' },
    { id: 'collect_coins_25', name: 'Coin Hunter II', description: 'Collect 25 coins', target: 25, reward: 100, icon: '🪙' },
    { id: 'collect_coins_50', name: 'Coin Master', description: 'Collect 50 coins', target: 50, reward: 200, icon: '💰' },
    { id: 'reach_mass_50', name: 'Growing Strong', description: 'Reach 50 mass', target: 50, reward: 75, icon: '💪' },
    { id: 'reach_mass_100', name: 'Heavy Weight', description: 'Reach 100 mass', target: 100, reward: 150, icon: '🏋️' },
    { id: 'eliminate_1', name: 'First Blood', description: 'Eliminate 1 enemy', target: 1, reward: 100, icon: '⚔️' },
    { id: 'eliminate_3', name: 'Warrior', description: 'Eliminate 3 enemies', target: 3, reward: 250, icon: '🗡️' },
    { id: 'survive_60', name: 'Survivor', description: 'Survive for 60 seconds', target: 60, reward: 100, icon: '⏰' },
    { id: 'survive_120', name: 'Endurance', description: 'Survive for 120 seconds', target: 120, reward: 200, icon: '🕐' }
  ]

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  
  // Virtual joystick state for mobile
  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 })
  const [gameReady, setGameReady] = useState(false)
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false)
  const leaderboardTimerRef = useRef(null)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const statsTimerRef = useRef(null)

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

  const playersRef = useRef(new Map()) // Store other players data

  // ========================================
  // HATHORA-FIRST MULTIPLAYER INITIALIZATION
  // No local fallbacks - 100% authoritative server
  // ========================================
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const roomId = urlParams.get('roomId')
    const mode = urlParams.get('mode')
    const multiplayer = urlParams.get('multiplayer')
    const server = urlParams.get('server')
    const hathoraRoom = urlParams.get('hathoraRoom')
    const serverType = urlParams.get('serverType')
    const bots = urlParams.get('bots')
    
    console.log('🎮 COLYSEUS-FIRST: Game initialization - URL parameters:', {
      roomId,
      mode,
      multiplayer,
      server,
      hathoraRoom,
      serverType,
      bots,
      url: window.location.href
    })
    
    // CRITICAL: Allow practice modes
    // 1. Legacy practice mode (if any existing links use this)
    if (mode === 'practice' && roomId === 'global-practice-bots') {
      console.log('✅ LEGACY PRACTICE MODE: Allowing local practice with bots')
      setIsMultiplayer(false)
      setGameStarted(true)
      return
    }
    
    // 2. LOCAL PRACTICE mode (from LOCAL PRACTICE button)
    if (mode === 'local' && multiplayer === 'offline' && server === 'local' && bots === 'true') {
      console.log('✅ LOCAL PRACTICE MODE: Allowing offline practice with bots')
      console.log('🎮 Local practice parameters:', { roomId, mode, multiplayer, server, bots })
      setIsMultiplayer(false)
      setGameStarted(true)
      return
    }
    
    // CRITICAL: Force all server browser games to use Colyseus multiplayer
    // Server browser games are identified by:
    // - mode === 'colyseus-multiplayer' 
    // - server === 'colyseus'
    // - serverType === 'colyseus'
    // - multiplayer === 'true'
    const isServerBrowserGame = (
      mode === 'colyseus-multiplayer' ||
      server === 'colyseus' ||
      serverType === 'colyseus' ||
      multiplayer === 'true' ||
      // Any mode that's not practice/local should be multiplayer
      (mode && mode !== 'practice' && mode !== 'local')
    )
    
    console.log('🎮 MULTIPLAYER DETECTION DEBUG:')
    console.log('  - isServerBrowserGame:', isServerBrowserGame)
    console.log('  - roomId:', roomId)
    console.log('  - server:', server)
    console.log('  - mode:', mode)
    console.log('  - serverType:', serverType)
    console.log('  - multiplayer:', multiplayer)
    
    if (isServerBrowserGame) {
      console.log('🎮 SERVER BROWSER GAME DETECTED: Forcing Colyseus multiplayer')
      console.log('📊 Game parameters:')
      console.log('  - roomId:', roomId || 'will-be-generated')
      console.log('  - server:', server || 'colyseus')
      console.log('  - mode:', mode, 'isServerBrowser:', isServerBrowserGame)
      
      // ✅ FORCE COLYSEUS MULTIPLAYER: All server browser games go to Colyseus
      console.log('✅ PROCEEDING: Colyseus multiplayer enabled (server browser game)')
      
      // Set game to multiplayer mode
      setIsMultiplayer(true)
      setGameStarted(true)
      
      // Initialize Colyseus multiplayer game
      console.log('🎮 Colyseus multiplayer game ready (from server browser)')
      
      // Track game session in database
      trackPlayerSession(roomId, 0, mode, 'colyseus')
      
      console.log('🎮 Setting up client-side prediction with Colyseus state sync')
      console.log('⚡ Colyseus server will handle all game logic')
      console.log('📡 Client will send inputs, receive state updates via Schema')
      
      return
    }
    
    // Block any other non-practice games (fallback protection)
    console.log('❌ BLOCKED: Non-server-browser, non-practice game attempt')
    console.log('🎮 Game parameters that were rejected:', { roomId, mode, multiplayer, server, serverType, bots })
    console.log('🎮 Redirecting to landing page - only server browser and practice modes allowed')
    window.location.href = '/'
  }, [])
  
  const initializeAuthoritativeGame = async (roomId, mode, urlParams) => {
    console.log('🚀 Initializing 100% authoritative Colyseus game...')
    
    const fee = parseFloat(urlParams.get('fee')) || 0
    const region = urlParams.get('region') || 'Australia'
    const maxPlayers = parseInt(urlParams.get('maxPlayers')) || 50
    const gameName = urlParams.get('name') || 'TurfLoot Arena'
    const regionId = urlParams.get('regionId') || 'au-syd'
    
    console.log('📊 Authoritative game configuration:', {
      roomId,
      fee,
      region,
      regionId,
      maxPlayers,
      gameName,
      isAuthoritative: true,
      serverSide: 'Colyseus Cloud'
    })
    
    // 🔥 CRITICAL: Connect to Colyseus arena room
    console.log('🏠 Connecting to Colyseus arena room...')
    
    try {
      // Import and initialize Colyseus client
      const { joinArena } = await import('../../lib/colyseus')
      
      console.log('✅ Colyseus client loaded')
      
      // Join Colyseus arena room
      console.log(`🚀 Joining persistent 24/7 Colyseus arena...`)
      
      // Get Privy user data from URL parameters
      const urlPrivyUserId = urlParams.get('privyUserId')
      const urlPlayerName = urlParams.get('playerName')
      const urlWalletAddress = urlParams.get('walletAddress')
      
      // Use URL data or fallback values
      const realPrivyUserId = urlPrivyUserId || 'anonymous-' + Date.now()
      const realPlayerName = urlPlayerName ? decodeURIComponent(urlPlayerName) : (customUsername || 'Anonymous Player')
      
      console.log('👤 Using player data:', {
        privyUserId: realPrivyUserId,
        playerName: realPlayerName,
        walletAddress: urlWalletAddress
      })
      
      const room = await joinArena({ 
        privyUserId: realPrivyUserId,
        playerName: realPlayerName
      })
      
      console.log('🎮 Connected with player name:', realPlayerName, 'and ID:', realPrivyUserId)
      
      if (!room) {
        throw new Error('Failed to join Colyseus arena room')
      }
      
      console.log('✅ Successfully joined Colyseus arena room:', room.id)
      
      // Set up multiplayer state
      setIsMultiplayer(true)
      window.isMultiplayer = true // CRITICAL: Set global flag for game rendering
      setWsConnection('connected')
      wsRef.current = room
      
      console.log('🎮 Multiplayer mode activated - window.isMultiplayer =', window.isMultiplayer)
      console.log('📡 Setting up Colyseus event handlers...')
      
      // Set up Colyseus room event handlers
      room.onStateChange((state) => {
        console.log('📡 *** GAME PAGE *** Colyseus state received in agario page')
        console.log('👥 *** GAME PAGE *** Players count:', state.players ? state.players.size : 0)
        
        serverStateRef.current = state
        
        // CRITICAL: Update the game's serverState for rendering
        if (gameRef.current) {
          gameRef.current.serverState = state
          console.log('🎮 *** GAME PAGE *** Updated game.serverState, isMultiplayer:', window.isMultiplayer)
          console.log('🎮 *** GAME PAGE *** Game serverState now has', state.players ? state.players.size : 0, 'players')
        } else {
          console.log('❌ *** GAME PAGE *** gameRef.current is null!')
        }
        
        // Update connected players count
        if (state.players) {
          setConnectedPlayers(state.players.size)
        }
      })
      
      room.onMessage("player-joined", (message) => {
        console.log('👋 Player joined:', message)
      })
      
      room.onLeave(() => {
        console.log('👋 Left Colyseus room')
        setIsMultiplayer(false)
        setWsConnection('disconnected')
        setConnectedPlayers(0)
      })
      
      return {
        success: true,
        roomId: room.id,
        serverEndpoint: process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT,
        gameMode: fee > 0 ? 'cash-game' : 'practice',
        region: region,
        maxPlayers: maxPlayers
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Colyseus game:', error)
      setWsConnection('error')
      throw error
    }
  }

  // New function to track real Hathora room sessions
  const trackRealHathoraSession = async (realRoomId, fee, mode, region, gameMode) => {
    try {
      console.log('📊 Tracking real Hathora room session:', {
        realRoomId,
        fee,
        mode,
        region,
        gameMode
      })
      
      // Format data according to API requirements (session object with required fields)
      const sessionData = {
        action: 'join',
        session: {
          roomId: realRoomId,
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          userId: 'anonymous_' + Math.random().toString(36).substr(2, 9),
          entryFee: fee || 0,
          mode: gameMode || mode,
          region: region || 'unknown',
          isRealHathoraRoom: true,
          hathoraRoomProcess: true
        }
      }
      
      const response = await fetch('/api/game-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      })
      
      if (response.ok) {
        console.log('✅ Real Hathora room session tracked successfully')
      } else {
        console.warn('⚠️ Failed to track real Hathora room session:', response.status)
      }
      
    } catch (error) {
      console.error('❌ Error tracking real Hathora room session:', error)
    }
  }

  // Define trackPlayerSession function (was being called but not defined)
  const trackPlayerSession = async (roomId, fee, mode, region) => {
    try {
      console.log('📊 Tracking player session (fallback):', { roomId, fee, mode, region })
      
      // Format data according to API requirements (session object with required fields)
      const sessionData = {
        action: 'join',
        session: {
          roomId: roomId,
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          userId: 'fallback_' + Math.random().toString(36).substr(2, 9),
          entryFee: fee || 0,
          mode: mode || 'unknown',
          region: region || 'unknown',
          isRealHathoraRoom: false,
          fallbackSession: true
        }
      }
      
      const response = await fetch('/api/game-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      })
      
      if (response.ok) {
        console.log('✅ Fallback session tracked successfully')
      } else {
        console.warn('⚠️ Failed to track fallback session:', response.status)
      }
      
    } catch (error) {
      console.error('❌ Error tracking fallback session:', error)
    }
  }

  const handleStatsToggle = () => {
    if (!isMobile) return // Only for mobile
    
    setStatsExpanded(!statsExpanded)
    
    // Clear existing timer when manually toggling
    if (statsTimerRef.current) {
      clearTimeout(statsTimerRef.current)
    }
  }
  const joystickRef = useRef(null)
  const joystickKnobRef = useRef(null)
  
  // Eye tracking state for mobile character
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    // Enhanced mobile detection for in-game experience
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

  // Eye tracking scroll effect for mobile
  useEffect(() => {
    if (!isMobile) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const scrollProgress = Math.min(scrollY / (windowHeight * 0.5), 1)
      
      // Calculate eye movement based on scroll position
      const maxEyeMovement = 2 // Maximum pixels the eyes can move
      const eyeX = Math.sin(scrollProgress * Math.PI * 2) * maxEyeMovement
      const eyeY = (scrollProgress - 0.5) * maxEyeMovement * 2
      
      setEyePosition({ x: eyeX, y: Math.max(-maxEyeMovement, Math.min(maxEyeMovement, eyeY)) })
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile])

  // Multiplayer input transmission system
  const sendInputToServer = (dx, dy) => {
    console.log('🎮 INPUT DEBUG - sendInputToServer called:', {
      dx: dx?.toFixed(3),
      dy: dy?.toFixed(3),
      isMultiplayer,
      wsRef: !!wsRef.current,
      wsConnection,
      hasRoom: !!wsRef.current
    })

    if (!isMultiplayer || !wsRef.current || wsConnection !== 'connected') {
      console.log('❌ INPUT BLOCKED:', {
        isMultiplayer,
        hasWsRef: !!wsRef.current,
        wsConnection,
        reason: !isMultiplayer ? 'not multiplayer' : !wsRef.current ? 'no wsRef' : 'not connected'
      })
      return // Skip if not in multiplayer mode or not connected
    }

    // Only send if input changed significantly to reduce network traffic
    const threshold = 0.01
    if (Math.abs(dx - lastInputRef.current.dx) < threshold && 
        Math.abs(dy - lastInputRef.current.dy) < threshold) {
      console.log('🔄 INPUT THROTTLED - no significant change')
      return
    }

    inputSequenceRef.current++
    lastInputRef.current = { dx, dy }

    try {
      console.log('📡 SENDING INPUT to server:', { seq: inputSequenceRef.current, dx, dy })
      wsRef.current.send("input", {
        seq: inputSequenceRef.current,
        dx: dx,
        dy: dy
      })
    } catch (error) {
      console.error('❌ Failed to send input to server:', error)
    }
  }

  // Virtual joystick handlers for mobile
  const handleJoystickStart = (e) => {
    e.preventDefault()
    if (!isMobile) return
    
    console.log('🕹️ Joystick Started - Mobile:', isMobile, 'Game Available:', !!gameRef.current?.game)
    
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
    
    // Debug what's actually in gameRef
    console.log('🔍 Debug gameRef:', {
      gameRefExists: !!gameRef.current,
      gameRefType: typeof gameRef.current,
      hasGameProperty: gameRef.current?.hasOwnProperty('game'),
      gameProperty: gameRef.current?.game,
      gameRefKeys: gameRef.current ? Object.keys(gameRef.current) : 'none'
    })
    
    // Only update player movement if game is ready
    if (gameRef.current && gameRef.current.player) {
      const strength = distance / 35 // Normalize to 0-1
      const moveSpeed = 500 * strength // Increased movement speed for better responsiveness
      
      const game = gameRef.current  // gameRef.current IS the game object
      
      // Calculate normalized direction for server input
      const dx = Math.cos(angle) * strength
      const dy = Math.sin(angle) * strength
      
      // Send input to multiplayer server
      sendInputToServer(dx, dy)
      
      // For local prediction, still update local targets
      const targetX = game.player.x + Math.cos(angle) * moveSpeed
      const targetY = game.player.y + Math.sin(angle) * moveSpeed
      
      // Debug logging for movement
      console.log('🕹️ Joystick START Movement:', {
        strength: strength.toFixed(2),
        angle: (angle * 180 / Math.PI).toFixed(1) + '°',
        dx: dx.toFixed(3),
        dy: dy.toFixed(3),
        multiplayer: isMultiplayer,
        moveSpeed: moveSpeed.toFixed(1),
        playerPos: { x: game.player.x?.toFixed(1), y: game.player.y?.toFixed(1) },
        targetPos: { x: targetX.toFixed(1), y: targetY.toFixed(1) },
        beforeUpdate: { targetX: game.player.targetX?.toFixed(1), targetY: game.player.targetY?.toFixed(1) }
      })
      
      game.player.targetX = targetX
      game.player.targetY = targetY
      
      // Set flag to indicate joystick is controlling movement
      window.isUsingJoystick = true
      
      console.log('🕹️ After Update:', { targetX: game.player.targetX?.toFixed(1), targetY: game.player.targetY?.toFixed(1) })
    } else {
      console.log('⏳ Game not ready - joystick visual works but no player movement yet')
    }
  }
  
  const handleJoystickMove = (e) => {
    e.preventDefault()
    if (!isMobile || !joystickActive) return
    
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
    
    // Debug what's actually in gameRef
    console.log('🔍 Debug gameRef:', {
      gameRefExists: !!gameRef.current,
      gameRefType: typeof gameRef.current,
      hasGameProperty: gameRef.current?.hasOwnProperty('game'),
      gameProperty: gameRef.current?.game,
      gameRefKeys: gameRef.current ? Object.keys(gameRef.current) : 'none'
    })
    
    // Only update player movement if game is ready
    if (gameRef.current && gameRef.current.player) {
      const strength = distance / 35 // Normalize to 0-1
      const moveSpeed = 500 * strength // Increased movement speed for better responsiveness
      
      const game = gameRef.current  // gameRef.current IS the game object
      
      // Calculate normalized direction for server input
      const dx = Math.cos(angle) * strength
      const dy = Math.sin(angle) * strength
      
      // Send input to multiplayer server
      sendInputToServer(dx, dy)
      
      // For local prediction, still update local targets
      const targetX = game.player.x + Math.cos(angle) * moveSpeed
      const targetY = game.player.y + Math.sin(angle) * moveSpeed
      
      // Debug logging for movement
      console.log('🕹️ Joystick Movement:', {
        strength: strength.toFixed(2),
        angle: (angle * 180 / Math.PI).toFixed(1) + '°',
        dx: dx.toFixed(3),
        dy: dy.toFixed(3),
        multiplayer: isMultiplayer,
        moveSpeed: moveSpeed.toFixed(1),
        playerPos: { x: game.player.x?.toFixed(1), y: game.player.y?.toFixed(1) },
        targetPos: { x: targetX.toFixed(1), y: targetY.toFixed(1) },
        beforeUpdate: { targetX: game.player.targetX?.toFixed(1), targetY: game.player.targetY?.toFixed(1) }
      })
      
      game.player.targetX = targetX
      game.player.targetY = targetY
      
      // Set flag to indicate joystick is controlling movement
      window.isUsingJoystick = true
      
      console.log('🕹️ After Update:', { targetX: game.player.targetX?.toFixed(1), targetY: game.player.targetY?.toFixed(1) })
    } else {
      console.log('⏳ Game not ready - joystick visual works but no player movement yet')
    }
  }
  
  const handleJoystickEnd = (e) => {
    e.preventDefault()
    if (!isMobile) return
    
    console.log('🕹️ Joystick Ended - Stopping Movement')
    
    setJoystickActive(false)
    setJoystickPosition({ x: 0, y: 0 })
    
    // Stop player movement by setting target to current position
    if (gameRef.current?.game?.player) {
      const game = gameRef.current.game
      game.player.targetX = game.player.x
      game.player.targetY = game.player.y
      console.log('🕹️ Player movement stopped at:', { x: game.player.x?.toFixed(1), y: game.player.y?.toFixed(1) })
    }
    
    window.isUsingJoystick = false
  }
  
  // Global variables for game state
  useEffect(() => {
    window.isMobileDevice = isMobile
    window.isUsingJoystick = false
  }, [isMobile])

  // Mission progress tracking
  const updateMissionProgress = (type, value) => {
    setActiveMissions(prev => prev.map(mission => {
      if (mission.completed) return mission

      let newProgress = mission.progress
      let shouldComplete = false

      switch (type) {
        case 'coin_collected':
          if (mission.id.includes('collect_coins')) {
            newProgress = Math.min(mission.progress + value, mission.target)
            shouldComplete = newProgress >= mission.target
          }
          break
        case 'mass_reached':
          if (mission.id.includes('reach_mass')) {
            newProgress = Math.max(mission.progress, value)
            shouldComplete = newProgress >= mission.target
          }
          break
        case 'elimination':
          if (mission.id.includes('eliminate')) {
            newProgress = Math.min(mission.progress + value, mission.target)
            shouldComplete = newProgress >= mission.target
          }
          break
        case 'survival_time':
          if (mission.id.includes('survive')) {
            newProgress = value
            shouldComplete = newProgress >= mission.target
          }
          break
      }

      if (shouldComplete && !mission.completed) {
        // Complete mission
        setCurrency(prev => prev + mission.reward)
        // Mission complete popup removed - no longer shows over minimap
        return { ...mission, progress: newProgress, completed: true }
      }

      return { ...mission, progress: newProgress }
    }))
  }

  // Initialize missions when game starts (only for cash games)
  useEffect(() => {
    if (gameStarted && activeMissions.length === 0) {
      // Check if this is a cash game (only show missions for paid rooms)
      if (typeof window === 'undefined') return
      const urlParams = new URLSearchParams(window.location.search)
      const fee = urlParams.get('fee')
      const mode = urlParams.get('mode')
      const isCashGame = fee && parseFloat(fee) > 0 && mode !== 'local' && mode !== 'practice'
      
      if (isCashGame) {
        // Assign 3 random missions when game starts
        const shuffled = [...missionTypes].sort(() => 0.5 - Math.random())
        const selectedMissions = shuffled.slice(0, 3).map(mission => ({
          ...mission,
          progress: 0,
          completed: false
        }))
        setActiveMissions(selectedMissions)
      }
    }
  }, [gameStarted])

  // REAL PLAYER SESSION TRACKING - Track when real Privy users join/leave games
  useEffect(() => {
    if (!gameStarted) return
    
    const trackPlayerSession = async () => {
      try {
        if (typeof window === 'undefined') return
        
        const urlParams = new URLSearchParams(window.location.search)
        const roomId = urlParams.get('roomId')
        const fee = urlParams.get('fee')
        const mode = urlParams.get('mode')
        const region = urlParams.get('region')
        
        if (!roomId) {
          console.log('🚫 No roomId found - not tracking session')
          return
        }
        
        // Only track multiplayer Hathora rooms (not local practice)
        const isMultiplayerRoom = mode !== 'local' && mode !== 'practice'
        
        if (!isMultiplayerRoom) {
          console.log('🚫 Local/practice game - not tracking session')
          return
        }
        
        console.log('🎯 Tracking real player session:', {
          roomId,
          fee: fee || 0,
          mode,
          region
        })
        
        // Record player joining the room
        const sessionData = {
          roomId,
          entryFee: parseFloat(fee) || 0,
          mode,
          region,
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          status: 'active'
        }
        
        // Send to backend API to record session
        const response = await fetch('/api/game-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'join',
            session: sessionData
          })
        })
        
        if (response.ok) {
          console.log('✅ Player session recorded successfully')
        } else {
          console.warn('⚠️ Failed to record player session:', response.status)
        }
        
      } catch (error) {
        console.error('❌ Error tracking player session:', error)
      }
    }
    
    // Track session when game starts
    trackPlayerSession()
    
    // Update session activity every 30 seconds
    const activityInterval = setInterval(() => {
      const urlParams = new URLSearchParams(window.location.search)
      const roomId = urlParams.get('roomId')
      const mode = urlParams.get('mode')
      
      if (roomId && mode !== 'local' && mode !== 'practice') {
        fetch('/api/game-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update',
            roomId,
            lastActivity: new Date().toISOString()
          })
        }).catch(err => console.warn('⚠️ Failed to update session activity:', err))
      }
    }, 30000) // Every 30 seconds
    
    // Cleanup: Record player leaving when component unmounts
    return () => {
      clearInterval(activityInterval)
      
      const urlParams = new URLSearchParams(window.location.search)
      const roomId = urlParams.get('roomId')
      const mode = urlParams.get('mode')
      
      if (roomId && mode !== 'local' && mode !== 'practice') {
        // Send leave event (don't await since component is unmounting)
        fetch('/api/game-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'leave',
            roomId
          })
        }).catch(err => console.warn('⚠️ Failed to record session leave:', err))
      }
    }
  }, [gameStarted])
  // WebSocket connection for multiplayer Colyseus rooms
  useEffect(() => {
    if (!gameStarted) return

    const connectToColyseusRoom = async () => {
      try {
        console.log('🌐 Initializing Colyseus room connection...')
        
        const urlParams = new URLSearchParams(window.location.search)
        const mode = urlParams.get('mode')
        const multiplayer = urlParams.get('multiplayer')
        const server = urlParams.get('server')

        console.log('🔍 URL parameters:', { mode, multiplayer, server })

        // Only connect to Colyseus for multiplayer rooms
        if (mode === 'local' || mode === 'practice' || server !== 'colyseus') {
          console.log('🚫 Not a Colyseus multiplayer room - skipping WebSocket connection')
          return
        }

        setIsMultiplayer(true)
        setConnectedPlayers(1) // At least the current player

        // Import Colyseus client
        const { joinArena } = await import('../../lib/colyseus')
        
        // Get Privy user ID for authentication
        let privyUserId = null
        let playerName = null
        
        // Try to get Privy user info if available
        try {
          const { usePrivy } = await import('@privy-io/react-auth')
          const { user } = usePrivy()
          privyUserId = user?.id || `anonymous_${Date.now()}`
          playerName = user?.username || user?.email?.split('@')[0] || null
        } catch (error) {
          console.log('⚠️ Privy not available, using anonymous user')
          privyUserId = `anonymous_${Date.now()}`
        }

        console.log('🔑 Connecting with user:', { privyUserId, playerName })

        // Connect to Colyseus arena
        const room = await joinArena({ privyUserId, playerName })
        
        setWsConnection('connected')
        console.log('✅ Connected to Colyseus arena')

        // Store room reference for sending inputs
        wsRef.current = room
        
        // Set up state change listener
        room.onStateChange((state) => {
          if (!state) {
            console.log('📊 Colyseus state is null/undefined')
            return
          }
          
          // Update connected player count with null checks
          const playerCount = state.players ? 
            (state.players.size || Object.keys(state.players).length || 0) : 0
          setConnectedPlayers(playerCount)
          
          // Update local game state with server data
          if (gameRef.current && gameRef.current.updateFromServer) {
            console.log('🔄 Calling updateFromServer with state:', {
              hasPlayers: !!state.players,
              playersCount: state.players?.size || 0,
              hasCoins: !!state.coins,
              hasViruses: !!state.viruses
            })
            gameRef.current.updateFromServer(state)
          } else {
            console.log('❌ Game not ready or updateFromServer missing:', {
              gameExists: !!gameRef.current,
              hasUpdateMethod: !!(gameRef.current?.updateFromServer)
            })
          }
        })

        // Handle player changes (with null check)
        room.onStateChange.once((state) => {
          if (state && state.players) {
            state.players.onAdd((player, sessionId) => {
              console.log(`👋 Player joined: ${player.name || 'Unknown'}`)
              setConnectedPlayers(prev => prev + 1)
            })

            state.players.onRemove((player, sessionId) => {
              console.log(`👋 Player left: ${sessionId}`)
              setConnectedPlayers(prev => Math.max(0, prev - 1))
            })
          }
        })

        // Handle room errors
        room.onError((code, message) => {
          console.error('❌ Colyseus room error:', code, message)
          setWsConnection('error')
        })

        // Handle disconnection
        room.onLeave((code) => {
          console.log('👋 Left Colyseus room:', code)
          setWsConnection('disconnected')
        })

        // Send ping every 5 seconds for latency measurement
        const pingInterval = setInterval(() => {
          if (room && room.connection && room.connection.readyState === WebSocket.OPEN) {
            // Send ping message through Colyseus room
            room.send("ping", { timestamp: Date.now() })
          }
        }, 5000)

        // Cleanup on unmount
        return () => {
          clearInterval(pingInterval)
          if (room) {
            room.leave()
          }
        }

      } catch (error) {
        console.error('❌ Failed to connect to Colyseus server:', error)
        setWsConnection('error')
      }
    }

    connectToColyseusRoom()
  }, [gameStarted])

  // Cycle through missions every 4 seconds
  useEffect(() => {
    if (activeMissions.length > 0) {
      const interval = setInterval(() => {
        setCurrentMissionIndex(prev => (prev + 1) % activeMissions.length)
      }, 4000) // Change mission every 4 seconds
      
      return () => clearInterval(interval)
    }
  }, [activeMissions.length])
  
  // Cash out state
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutComplete, setCashOutComplete] = useState(false)
  
  // Update game engine's gameStates when cash out state changes
  useEffect(() => {
    if (gameRef.current && gameRef.current.updateGameStates) {
      console.log('🔄 Updating game states:', { isCashingOut, cashOutProgress, cashOutComplete, gameOver })
      gameRef.current.updateGameStates({
        isCashingOut,
        cashOutProgress,
        cashOutComplete,
        gameOver
      })
    }
  }, [isCashingOut, cashOutProgress, cashOutComplete, gameOver])
  
  // Minimap state for real-time updates
  const [minimapData, setMinimapData] = useState({
    playerX: 2000,
    playerY: 2000,
    enemies: [],
    coins: [],
    viruses: []
  })

  // Modal states
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [reportType, setReportType] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [reportTarget, setReportTarget] = useState('')

  // Game Engine Class
  class GameEngine {
    constructor(canvas, setCheatingBan, setTimeSurvived, selectedSkin, gameStates) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.world = { width: 4000, height: 4000 }
      this.camera = { x: 0, y: 0 }
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 }
      this.setCheatingBan = setCheatingBan // Store the function reference
      this.setTimeSurvived = setTimeSurvived // Store the function reference
      this.selectedSkin = selectedSkin || { id: 'default', name: 'Default Warrior', color: '#4A90E2' } // Store selected skin
      this.gameStates = gameStates || {} // Store game states (cashOutComplete, gameOver)
      
      // Dynamic zone system for cash games
      this.isCashGame = this.detectCashGame()
      this.realPlayerCount = this.isCashGame ? this.getRealPlayerCount() : 8 // Mock 8 for practice
      this.basePlayableRadius = 800 // Minimum zone for 2 players
      this.maxPlayableRadius = 1800 // Maximum zone for full lobby
      this.currentPlayableRadius = this.calculatePlayableRadius()
      this.targetPlayableRadius = this.currentPlayableRadius
      this.zoneTransitionSpeed = 50 // Pixels per second zone change
      this.lastPlayerCountCheck = Date.now()
      
      // Game objects
      this.player = {
        x: this.world.width / 2,
        y: this.world.height / 2,
        mass: 20,
        radius: 25,
        color: this.selectedSkin.color, // Use selected skin color instead of hardcoded blue
        name: 'You',
        speed: 2,
        targetX: this.world.width / 2,
        targetY: this.world.height / 2,
        spawnProtection: true,
        spawnProtectionTime: 6000, // Increased from 4 to 6 seconds for better protection
        spawnProtectionStart: Date.now()
      }
      
      // Player pieces for splitting (Agar.io style)
      this.playerPieces = []
      this.splitCooldown = 0 // Prevent spam splitting
      this.recombineTime = 3 // Seconds before pieces can recombine (very responsive for testing)
      
      this.coins = []
      this.enemies = []
      this.viruses = []
      this.running = false
      this.lastUpdate = Date.now()
      this.gameStartTime = null // Track when game starts
      this.timeSurvivedSeconds = 0
      
      // Add method to update game states in real-time
      this.updateGameStates = (newStates) => {
        if (this.gameStates) {
          Object.assign(this.gameStates, newStates)
        }
      }
      
      this.antiCheat = {
        enabled: false, // TEMPORARILY DISABLED FOR TESTING - was: this.isCashGame
        violations: 0,
        maxViolations: 20, // Significantly increased from 8 to 20 - very lenient
        banned: false,
        
        // Movement validation - much more lenient
        lastPosition: { x: this.player.x, y: this.player.y, timestamp: Date.now() },
        maxSpeed: 25, // Significantly increased from 12 to 25 - allow very fast movement
        speedViolations: 0,
        
        // Input monitoring
        mouseMovements: [],
        clickPattern: [],
        keyPresses: [],
        lastInputTime: Date.now(),
        humanLikeThreshold: 0.2, // Lowered from 0.4 to 0.2 - much more lenient
        
        // Behavioral analysis - more lenient
        massGainRate: [],
        eliminationPattern: [],
        survivalTime: Date.now(),
        suspiciousActions: 0,
        
        // Network monitoring - more lenient
        actionQueue: [],
        lastActionTime: Date.now(),
        actionRateLimit: 200, // Increased from 120 to 200 actions per second - much more lenient
        
        // Memory protection
        gameStateHash: '',
        integrityChecks: 0,
        
        // Pattern detection
        botLikeScore: 0,
        humanScore: 100
      }
      
      this.generateCoins()
      this.generateEnemies()
      this.generateViruses()
      this.bindEvents()
      this.initAntiCheat()
      
      console.log(`🎯 Game initialized - Cash game: ${this.isCashGame}, Player count: ${this.realPlayerCount}, Zone radius: ${this.currentPlayableRadius}`)
      console.log(`🛡️ Anti-cheat system: ${this.antiCheat.enabled ? 'ENABLED' : '🚫 DISABLED FOR TESTING'}`)
      if (!this.antiCheat.enabled) {
        console.log('🧪 ANTI-CHEAT TEMPORARILY DISABLED - All players can play without restrictions')
      }
    }

    // Update game state from Colyseus server
    updateFromServer(serverState) {
      if (!serverState) return
      
      console.log('📡 Receiving server state update:', {
        players: serverState.players?.size || 0,
        coins: serverState.coins?.size || 0,
        viruses: serverState.viruses?.size || 0,
        timestamp: serverState.timestamp
      })
      
      // Store server state for rendering
      this.serverState = {
        players: [],
        coins: [],
        viruses: [],
        timestamp: serverState.timestamp || Date.now()
      }
      
      // Convert Colyseus MapSchema to arrays for easier processing
      if (serverState.players) {
        serverState.players.forEach((player, sessionId) => {
          this.serverState.players.push({
            sessionId,
            x: player.x,
            y: player.y,
            radius: player.radius,
            mass: player.mass,
            name: player.name,
            color: player.color,
            score: player.score,
            alive: player.alive,
            isCurrentPlayer: sessionId === (wsRef.current?.sessionId)
          })
        })
      }
      
      if (serverState.coins) {
        serverState.coins.forEach((coin, coinId) => {
          this.serverState.coins.push({
            id: coinId,
            x: coin.x,
            y: coin.y,
            radius: coin.radius,
            color: coin.color,
            value: coin.value
          })
        })
      }
      
      if (serverState.viruses) {
        serverState.viruses.forEach((virus, virusId) => {
          this.serverState.viruses.push({
            id: virusId,
            x: virus.x,
            y: virus.y,
            radius: virus.radius,
            color: virus.color
          })
        })
      }
      
      // Update current player from server state if in multiplayer
      const currentPlayer = this.serverState.players.find(p => p.isCurrentPlayer)
      if (currentPlayer && isMultiplayer) {
        // Apply server-authoritative position directly (maintain server authority)
        this.player.x = currentPlayer.x
        this.player.y = currentPlayer.y
        this.player.mass = currentPlayer.mass
        this.player.radius = currentPlayer.radius
        this.player.name = currentPlayer.name
        
        // Update UI state
        if (typeof setMass === 'function') setMass(Math.floor(currentPlayer.mass))
        if (typeof setScore === 'function') setScore(Math.floor(currentPlayer.score))
      }
    }

    detectCashGame() {
      // Check URL parameters to determine if this is a cash game
      if (typeof window === 'undefined') return false
      const urlParams = new URLSearchParams(window.location.search)
      const fee = urlParams.get('fee')
      const mode = urlParams.get('mode')
      
      // Cash games have fee > 0 and mode !== 'local' and mode !== 'practice'
      return fee && parseFloat(fee) > 0 && mode !== 'local' && mode !== 'practice'
    }

    getRealPlayerCount() {
      // In a real implementation, this would fetch actual player count from server
      // For now, simulate varying player counts based on fee tier
      if (typeof window === 'undefined') return 8
      const urlParams = new URLSearchParams(window.location.search)
      const fee = parseFloat(urlParams.get('fee') || 0)
      
      if (fee === 1) return Math.floor(Math.random() * 8) + 2 // 2-10 players
      if (fee === 5) return Math.floor(Math.random() * 12) + 4 // 4-16 players  
      if (fee === 20) return Math.floor(Math.random() * 16) + 6 // 6-22 players
      
      return 8 // Default for practice
    }

    isServerBrowserGame() {
      // Check URL parameters to detect if game was launched from server browser
      if (typeof window === 'undefined') return false
      const urlParams = new URLSearchParams(window.location.search)
      const mode = urlParams.get('mode')
      const server = urlParams.get('server')
      const gameType = urlParams.get('gameType')
      
      // Server browser games typically have these characteristics
      return (
        mode === 'hathora-multiplayer' ||
        mode === 'colyseus-multiplayer' ||
        mode === 'join-existing' ||
        server === 'colyseus' ||
        server === 'hathora' ||
        gameType === 'cash-game' ||
        gameType === 'Arena Battle'
      )
    }

    isRealMultiplayerGame() {
      // Check for any indicators of real multiplayer (not practice/local)
      if (typeof window === 'undefined') return false
      const urlParams = new URLSearchParams(window.location.search)
      const mode = urlParams.get('mode')
      const server = urlParams.get('server')
      const roomId = urlParams.get('roomId')
      const multiplayer = urlParams.get('multiplayer')
      const bots = urlParams.get('bots')
      
      // If this is explicitly local practice mode, it's NOT real multiplayer
      if (mode === 'local' && server === 'local' && multiplayer === 'offline' && bots === 'true') {
        return false
      }
      
      // If this is legacy practice mode, it's NOT real multiplayer
      if (mode === 'practice' && roomId === 'global-practice-bots') {
        return false
      }
      
      // Real multiplayer games have server type or specific modes
      return (
        server && server !== 'local' ||
        mode && mode !== 'local' && mode !== 'practice' ||
        window.location.pathname.includes('multiplayer')
      )
    }

    calculatePlayableRadius() {
      if (!this.isCashGame) {
        return 1800 // Fixed size for practice games
      }
      
      // Dynamic scaling for cash games
      const minPlayers = 2
      const maxPlayers = 24
      const playerCount = Math.max(minPlayers, Math.min(maxPlayers, this.realPlayerCount))
      
      // Calculate radius based on player count (more players = bigger zone)
      const playerRatio = (playerCount - minPlayers) / (maxPlayers - minPlayers)
      const radiusDiff = this.maxPlayableRadius - this.basePlayableRadius
      
      return Math.floor(this.basePlayableRadius + (radiusDiff * playerRatio))
    }

    updateDynamicZone(deltaTime) {
      if (!this.isCashGame) return
      
      // Check for player count updates every 5 seconds
      const now = Date.now()
      if (now - this.lastPlayerCountCheck > 5000) {
        const newPlayerCount = this.getRealPlayerCount()
        if (newPlayerCount !== this.realPlayerCount) {
          console.log(`🔄 Player count changed: ${this.realPlayerCount} → ${newPlayerCount}`)
          this.realPlayerCount = newPlayerCount
          this.targetPlayableRadius = this.calculatePlayableRadius()
          console.log(`🎯 Zone target changed: ${this.currentPlayableRadius} → ${this.targetPlayableRadius}`)
        }
        this.lastPlayerCountCheck = now
      }
      
      // Smoothly transition zone size
      if (Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        const direction = this.targetPlayableRadius > this.currentPlayableRadius ? 1 : -1
        const change = this.zoneTransitionSpeed * deltaTime * direction
        this.currentPlayableRadius += change
        
        // Prevent overshooting
        if (direction > 0 && this.currentPlayableRadius > this.targetPlayableRadius) {
          this.currentPlayableRadius = this.targetPlayableRadius
        } else if (direction < 0 && this.currentPlayableRadius < this.targetPlayableRadius) {
          this.currentPlayableRadius = this.targetPlayableRadius
        }
        
        console.log(`🔄 Zone transitioning: ${Math.floor(this.currentPlayableRadius)}px`)
      }
    }

    // === ANTI-CHEAT SYSTEM ===
    
    initAntiCheat() {
      if (!this.antiCheat.enabled) return
      
      console.log('🛡️ Initializing comprehensive anti-cheat system...')
      
      // Override critical functions to detect tampering
      this.protectCriticalFunctions()
      
      // Start periodic integrity checks
      this.startIntegrityMonitoring()
      
      // Enhanced input monitoring
      this.enhanceInputMonitoring()
      
      // Performance profiling to detect automation
      this.startPerformanceProfiling()
      
      console.log('🛡️ Anti-cheat system fully initialized')
    }
    
    protectCriticalFunctions() {
      // Store original function references
      const originalConsoleLog = console.log
      const originalSetInterval = setInterval
      const originalRequestAnimationFrame = requestAnimationFrame
      
      // Monitor console usage (bots often use excessive logging)
      let consoleCallCount = 0
      console.log = (...args) => {
        consoleCallCount++
        if (consoleCallCount > 500) { // Increased from 100 to 500 - more lenient for console usage
          this.recordViolation('EXCESSIVE_CONSOLE_USAGE', 'High console.log usage detected')
        }
        return originalConsoleLog.apply(console, args)
      }
      
      // Detect memory manipulation attempts
      this.protectGameVariables()
    }
    
    protectGameVariables() {
      const self = this
      
      // Protect player mass
      let _mass = this.player.mass
      Object.defineProperty(this.player, 'mass', {
        get() { return _mass },
        set(value) {
          const oldMass = _mass
          _mass = value
          
          // Validate mass changes - more lenient thresholds
          if (value > oldMass * 4) { // Increased from 2x to 4x - allow larger mass jumps
            self.recordViolation('SUSPICIOUS_MASS_CHANGE', `Mass jumped from ${oldMass} to ${value}`)
          }
          if (value < 0) { // Invalid mass
            self.recordViolation('INVALID_MASS_VALUE', `Negative mass: ${value}`)
            _mass = 20 // Reset to default
          }
        }
      })
      
      // Protect player position
      this.lastValidPosition = { x: this.player.x, y: this.player.y }
    }
    
    startIntegrityMonitoring() {
      setInterval(() => {
        if (!this.antiCheat.enabled || this.antiCheat.banned) return
        
        // Check game state integrity
        this.validateGameState()
        
        // Analyze behavioral patterns
        this.analyzePlayerBehavior()
        
        // Check for automation patterns
        this.detectAutomation()
        
        // Monitor network patterns
        this.analyzeNetworkPatterns()
        
        this.antiCheat.integrityChecks++
      }, 2000) // Check every 2 seconds
    }
    
    enhanceInputMonitoring() {
      // Track mouse movement patterns
      document.addEventListener('mousemove', (e) => {
        if (!this.antiCheat.enabled) return
        
        const now = Date.now()
        this.antiCheat.mouseMovements.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: now,
          deltaTime: now - this.antiCheat.lastInputTime
        })
        
        // Keep only last 100 movements
        if (this.antiCheat.mouseMovements.length > 100) {
          this.antiCheat.mouseMovements.shift()
        }
        
        this.antiCheat.lastInputTime = now
        this.analyzeMousePattern()
      })
      
      // Track click patterns
      document.addEventListener('click', (e) => {
        if (!this.antiCheat.enabled) return
        
        this.antiCheat.clickPattern.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now(),
          button: e.button
        })
        
        if (this.antiCheat.clickPattern.length > 50) {
          this.antiCheat.clickPattern.shift()
        }
      })
      
      // Track keyboard patterns
      document.addEventListener('keydown', (e) => {
        if (!this.antiCheat.enabled) return
        
        this.antiCheat.keyPresses.push({
          key: e.key,
          timestamp: Date.now(),
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey
        })
        
        if (this.antiCheat.keyPresses.length > 100) {
          this.antiCheat.keyPresses.shift()
        }
        
        // Detect suspicious key combinations
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          this.recordViolation('DEV_TOOLS_ATTEMPT', 'Developer tools access attempted')
        }
      })
    }
    
    startPerformanceProfiling() {
      // Monitor frame timing consistency
      let lastFrameTime = performance.now()
      const frameTimes = []
      
      const checkFrameRate = () => {
        const currentTime = performance.now()
        const deltaTime = currentTime - lastFrameTime
        frameTimes.push(deltaTime)
        
        if (frameTimes.length > 60) { // Check last 60 frames
          frameTimes.shift()
          
          // Detect too-consistent frame timing (indicates automation)
          const variance = this.calculateVariance(frameTimes)
          if (variance < 0.1) { // Too consistent
            this.recordViolation('AUTOMATED_TIMING', `Frame timing too consistent: ${variance}`)
          }
        }
        
        lastFrameTime = currentTime
        if (this.running && this.antiCheat.enabled) {
          requestAnimationFrame(checkFrameRate)
        }
      }
      
      if (this.antiCheat.enabled) {
        requestAnimationFrame(checkFrameRate)
      }
    }
    
    validateGameState() {
      // Check for impossible game states
      if (this.player.mass < 0) {
        this.recordViolation('INVALID_GAME_STATE', 'Negative player mass')
        this.player.mass = 20
      }
      
      if (this.player.radius > this.player.mass * 10) {
        this.recordViolation('INVALID_GAME_STATE', 'Radius-mass ratio violation')
      }
      
      // Check position bounds
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const distance = Math.sqrt(Math.pow(this.player.x - centerX, 2) + Math.pow(this.player.y - centerY, 2))
      
      if (distance > this.currentPlayableRadius + 100) {
        this.recordViolation('POSITION_VIOLATION', 'Player outside valid boundaries')
        // Teleport back to safe zone
        this.player.x = centerX
        this.player.y = centerY
      }
    }
    
    analyzePlayerBehavior() {
      const now = Date.now()
      
      // Track mass gain rate
      this.antiCheat.massGainRate.push({
        mass: this.player.mass,
        timestamp: now
      })
      
      if (this.antiCheat.massGainRate.length > 10) {
        this.antiCheat.massGainRate.shift()
        
        // Check for impossible mass gain
        const oldest = this.antiCheat.massGainRate[0]
        const newest = this.antiCheat.massGainRate[this.antiCheat.massGainRate.length - 1]
        const timeDiff = (newest.timestamp - oldest.timestamp) / 1000 // seconds
        const massGain = newest.mass - oldest.mass
        
        if (massGain > 500 && timeDiff < 2) { // Increased from 300 to 500 mass, reduced time from 3s to 2s - much more lenient
          this.recordViolation('IMPOSSIBLE_MASS_GAIN', `Gained ${massGain} mass in ${timeDiff}s`)
        }
      }
    }
    
    detectAutomation() {
      if (this.antiCheat.mouseMovements.length < 20) return
      
      // Analyze mouse movement patterns
      const movements = this.antiCheat.mouseMovements.slice(-20)
      
      // Check for too-perfect circular movements (common in bots)
      let circularScore = 0
      for (let i = 2; i < movements.length; i++) {
        const prev = movements[i-2]
        const curr = movements[i-1]
        const next = movements[i]
        
        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
        const angleDiff = Math.abs(angle1 - angle2)
        
        if (angleDiff < 0.1) circularScore++ // Very small angle changes
      }
      
      if (circularScore > 40) { // Increased from 25 to 40 - allow much more precise movements
        this.recordViolation('AUTOMATED_MOVEMENT', `Robotic movement pattern detected: ${circularScore}/18`)
        this.antiCheat.botLikeScore += 10
      }
      
      // Check for inhuman reaction times
      const reactionTimes = []
      for (let i = 1; i < movements.length; i++) {
        reactionTimes.push(movements[i].deltaTime)
      }
      
      const avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      if (avgReactionTime < 2) { // Reduced from 5ms to 2ms - allow much faster reactions
        this.recordViolation('INHUMAN_REACTION_TIME', `Average reaction time: ${avgReactionTime}ms`)
        this.antiCheat.botLikeScore += 15
      }
    }
    
    analyzeNetworkPatterns() {
      // Monitor action frequency
      const now = Date.now()
      const recentActions = this.antiCheat.actionQueue.filter(action => 
        now - action.timestamp < 1000 // Last second
      )
      
      if (recentActions.length > this.antiCheat.actionRateLimit) {
        this.recordViolation('RATE_LIMIT_EXCEEDED', `${recentActions.length} actions per second`)
      }
    }
    
    analyzeMousePattern() {
      if (this.antiCheat.mouseMovements.length < 10) return
      
      const recent = this.antiCheat.mouseMovements.slice(-10)
      
      // Check for linear movement patterns (bot-like)
      let linearityScore = 0
      for (let i = 2; i < recent.length; i++) {
        const p1 = recent[i-2]
        const p2 = recent[i-1]
        const p3 = recent[i]
        
        // Calculate if points are nearly collinear
        const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y))
        if (area < 5) linearityScore++ // Points are very close to a straight line
      }
      
      if (linearityScore > 20) { // Increased from 10 to 20 - allow much more linear movements
        this.recordViolation('LINEAR_MOVEMENT_PATTERN', `Bot-like linear movement: ${linearityScore}/8`)
      }
    }
    
    recordViolation(type, description) {
      // Grace period: Don't record violations in the first 10 seconds of gameplay
      const gameTime = (Date.now() - this.antiCheat.gameStartTime) / 1000
      if (gameTime < 10) {
        console.log(`🛡️ GRACE PERIOD: Ignoring violation "${type}" in first 10 seconds (${gameTime.toFixed(1)}s elapsed)`)
        return
      }
      
      this.antiCheat.violations++
      this.antiCheat.suspiciousActions++
      
      console.warn(`🚨 ANTI-CHEAT VIOLATION [${this.antiCheat.violations}/${this.antiCheat.maxViolations}]: ${type} - ${description} (Mass: ${this.player.mass.toFixed(1)})`)
      
      // Log violation for server reporting
      this.reportViolation(type, description)
      
      // Much more lenient banning - require many more violations 
      const banThreshold = this.player.mass > 200 ? 25 : this.antiCheat.maxViolations // Even higher threshold for players above 200 mass
      
      if (this.antiCheat.violations >= banThreshold) {
        console.log(`🔒 PLAYER BAN TRIGGERED: ${this.antiCheat.violations}/${banThreshold} violations (Mass: ${this.player.mass.toFixed(1)})`)
        this.banPlayer()
      } else {
        console.log(`⚠️ Violation count: ${this.antiCheat.violations}/${banThreshold} (Mass: ${this.player.mass.toFixed(1)})`)
      }
    }
    
    banPlayer() {
      this.antiCheat.banned = true
      this.running = false
      
      console.error('🔒 PLAYER BANNED: Multiple anti-cheat violations detected')
      
      // Trigger the cheating ban modal
      if (this.setCheatingBan) {
        this.setCheatingBan(true)
      } else {
        // Fallback if state setter is not available
        alert('⚠️ ACCOUNT SUSPENDED\n\nMultiple violations of fair play policies detected.\nContact support if you believe this is an error.')
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      }
    }
    
    reportViolation(type, description) {
      // In a real implementation, this would send to server
      const violationData = {
        type,
        description,
        timestamp: Date.now(),
        playerData: {
          mass: this.player.mass,
          position: { x: this.player.x, y: this.player.y },
          violations: this.antiCheat.violations
        },
        gameData: {
          isCashGame: this.isCashGame,
          roomId: new URLSearchParams(window.location.search).get('roomId')
        }
      }
      
      console.log('📊 Violation report:', violationData)
      // TODO: Send to backend API for logging and analysis
    }
    
    calculateVariance(numbers) {
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
      const squareDiffs = numbers.map(n => Math.pow(n - mean, 2))
      return squareDiffs.reduce((a, b) => a + b, 0) / numbers.length
    }
    
    // === END ANTI-CHEAT SYSTEM ===

    generateCoins() {
      this.coins = []
      const centerX = this.world.width / 2  // 2000
      const centerY = this.world.height / 2 // 2000
      const playableRadius = this.currentPlayableRadius
      
      for (let i = 0; i < 1000; i++) { // Increased to 1000 coins to match Agar.io food density
        let x, y, distance
        
        // Keep generating random positions until we get one inside the circular boundary
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 20) // 20px buffer from edge
        
        this.coins.push({
          x: x,
          y: y,
          radius: 8,
          value: 5, // Increased from 1 to 5 for better mass gain
          color: '#FFD700'
        })
      }
      
      console.log(`🪙 Generated ${this.coins.length} coins within radius ${Math.floor(playableRadius)}px`)
    }

    generateEnemies() {
      this.enemies = []
      
      // Check if this is a multiplayer game by examining the current URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const mode = urlParams.get('mode')
      const multiplayer = urlParams.get('multiplayer')
      const server = urlParams.get('server')
      const bots = urlParams.get('bots')
      
      // Skip bot generation for multiplayer games (Colyseus) - only real human players
      if (mode !== 'local' || multiplayer !== 'offline' || server !== 'local' || bots !== 'true') {
        console.log('🌐 Skipping bot generation - not in local practice mode')
        console.log('🔍 Current params:', { mode, multiplayer, server, bots })
        return
      }
      
      // Skip bot generation for paid/cash games - only real human players
      if (this.isCashGame) {
        console.log('💰 Skipping bot generation for cash game - humans only!')
        return
      }
      
      // Skip bot generation for server browser games - only real human players
      if (this.isServerBrowserGame()) {
        console.log('🖥️ Skipping bot generation for server browser game - real players only!')
        return
      }
      
      // Skip bot generation for any game with 'colyseus' or 'hathora' server type
      if (this.isRealMultiplayerGame()) {
        console.log('🎮 Skipping bot generation for real multiplayer game - humans only!')
        return
      }
      
      console.log('🤖 Generating enhanced AI bots for practice/local game')
      
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#A29BFE', '#FD79A8', '#FDCB6E']
      const botNames = [
        'AI_Hunter', 'CoinSeeker', 'BlobMaster', 'QuickSilver', 'Predator',
        'NinjaCoin', 'MegaBlob', 'SpeedDemon', 'TacticalBot', 'Dominator'
      ]
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      // Create bots with varied difficulty levels
      const botTypes = [
        { type: 'aggressive', count: 2, baseMass: 25, massVariation: 30 },
        { type: 'defensive', count: 2, baseMass: 20, massVariation: 20 },
        { type: 'balanced', count: 3, baseMass: 18, massVariation: 25 },
        { type: 'fast', count: 1, baseMass: 15, massVariation: 10 }
      ]
      
      let botIndex = 0
      botTypes.forEach(botType => {
        for (let i = 0; i < botType.count && botIndex < 8; i++) {
          const mass = botType.baseMass + Math.random() * botType.massVariation
          let x, y, distance
          
          // Generate enemy within the playable radius
          do {
            x = Math.random() * this.world.width
            y = Math.random() * this.world.height
            distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
          } while (distance > playableRadius - 50) // 50px buffer from edge
          
          // Create bot with enhanced AI properties
          const bot = {
            x: x,
            y: y,
            mass: mass,
            radius: Math.sqrt(mass) * 3,
            color: colors[botIndex % colors.length],
            name: botNames[botIndex % botNames.length],
            speed: Math.max(0.2, 35 / Math.sqrt(mass)),
            targetX: Math.random() * this.world.width,
            targetY: Math.random() * this.world.height,
            lastTargetChange: Date.now(),
            spawnProtection: true,
            spawnProtectionTime: 4000, // 4 seconds
            spawnProtectionStart: Date.now() + (botIndex * 200), // Stagger spawn times
            
            // Enhanced AI properties
            botType: botType.type,
            behavior: 'exploring',
            aggressiveness: botType.type === 'aggressive' ? 0.8 : 
                           botType.type === 'defensive' ? 0.3 : 0.5,
            coinHuntingRadius: botType.type === 'fast' ? 15 : 12,
            fleeThreshold: botType.type === 'defensive' ? 1.1 : 1.3,
            huntThreshold: botType.type === 'aggressive' ? 1.1 : 1.4,
            lastBehaviorChange: Date.now(),
            reactionTime: 200 + Math.random() * 300, // 200-500ms reaction time
            decisionCooldown: 0
          }
          
          this.enemies.push(bot)
          botIndex++
        }
      })
      
      console.log(`👥 Generated ${this.enemies.length} enhanced AI bots:`)
      this.enemies.forEach(bot => {
        console.log(`  - ${bot.name} (${bot.botType}): Mass ${Math.floor(bot.mass)}, Aggressiveness ${bot.aggressiveness}`)
      })
    }

    generateViruses() {
      this.viruses = []
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      // Increased virus count from 6 to 12 for more challenging gameplay
      for (let i = 0; i < 12; i++) {
        let x, y, distance
        
        // Generate virus within the playable radius
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 100) // 100px buffer from edge for viruses
        
        this.viruses.push({
          x: x,
          y: y,
          radius: 40 + Math.random() * 20,
          color: '#00FF41',
          spikes: 12,
          mass: 100,
          // Animation properties
          rotationSpeed: 0.5 + Math.random() * 1.5, // Rotation speed (degrees per frame)
          currentRotation: Math.random() * 360, // Starting rotation
          pulseSpeed: 0.02 + Math.random() * 0.03, // Pulsing speed
          pulsePhase: Math.random() * Math.PI * 2, // Starting pulse phase
          spikeWaveSpeed: 0.05 + Math.random() * 0.05, // Individual spike animation
          spikeWavePhase: Math.random() * Math.PI * 2, // Spike wave phase
          glowIntensity: 0.5 + Math.random() * 0.5, // Glow effect intensity
          colorShift: Math.random() * 30 // Color variation for uniqueness
        })
      }
      
      console.log(`🦠 Generated ${this.viruses.length} viruses within radius ${Math.floor(playableRadius)}px`)
    }

    spawnEnemy() {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      const mass = 15 + Math.random() * 40
      let x, y, distance
      
      // Generate enemy within the playable radius
      do {
        x = Math.random() * this.world.width
        y = Math.random() * this.world.height
        distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      } while (distance > playableRadius - 50) // 50px buffer from edge
      
      const newEnemy = {
        x: x,
        y: y,
        mass: mass,
        radius: Math.sqrt(mass) * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        name: `Player ${this.enemies.length + 2}`,
        speed: Math.max(0.2, 35 / Math.sqrt(mass)),
        targetX: Math.random() * this.world.width,
        targetY: Math.random() * this.world.height,
        lastTargetChange: Date.now(),
        spawnProtection: true,
        spawnProtectionTime: 4000,
        spawnProtectionStart: Date.now()
      }
      
      this.enemies.push(newEnemy)
      console.log(`👥 Spawned new enemy within radius ${Math.floor(playableRadius)}px`)
    }

    spawnVirus() {
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      let x, y, distance
      
      // Generate virus within the playable radius
      do {
        x = Math.random() * this.world.width
        y = Math.random() * this.world.height
        distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      } while (distance > playableRadius - 100) // 100px buffer from edge for viruses
      
      const newVirus = {
        x: x,
        y: y,
        radius: 40 + Math.random() * 20,
        color: '#00FF41',
        spikes: 12,
        mass: 100,
        // Animation properties
        rotationSpeed: 0.5 + Math.random() * 1.5, // Rotation speed (degrees per frame)
        currentRotation: Math.random() * 360, // Starting rotation
        pulseSpeed: 0.02 + Math.random() * 0.03, // Pulsing speed
        pulsePhase: Math.random() * Math.PI * 2, // Starting pulse phase
        spikeWaveSpeed: 0.05 + Math.random() * 0.05, // Individual spike animation
        spikeWavePhase: Math.random() * Math.PI * 2, // Spike wave phase
        glowIntensity: 0.5 + Math.random() * 0.5, // Glow effect intensity
        colorShift: Math.random() * 30 // Color variation for uniqueness
      }
      
      this.viruses.push(newVirus)
      console.log(`🦠 Spawned new virus within radius ${Math.floor(playableRadius)}px`)
    }

    bindEvents() {
      console.log('🎮 BIND EVENTS DEBUG: Setting up mouse event listeners')
      console.log('🎮 Canvas available:', !!this.canvas)
      console.log('🎮 Window isMultiplayer:', window.isMultiplayer)
      
      // Desktop mouse controls
      this.canvas.addEventListener('mousemove', (e) => {
        console.log('🖱️ RAW MOUSE EVENT:', { x: e.clientX, y: e.clientY })
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - rect.left
        this.mouse.y = e.clientY - rect.top
        
        // Convert to world coordinates
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.y + this.camera.y
        
        // Direct target update like Agar.io (only for desktop)
        if (!window.isMobileDevice) {
          // Calculate normalized direction for server input
          const dx = this.mouse.worldX - this.player.x
          const dy = this.mouse.worldY - this.player.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 1) { // Only send if there's meaningful movement
            const normalizedDx = dx / distance
            const normalizedDy = dy / distance
            
            // Send input to multiplayer server
            console.log('🖱️ MOUSE INPUT DEBUG:', {
              hasSendInputToServer: !!window.sendInputToServer,
              windowIsMultiplayer: window.isMultiplayer,
              normalizedDx: normalizedDx.toFixed(3),
              normalizedDy: normalizedDy.toFixed(3),
              distance: distance.toFixed(1)
            })
            
            if (window.sendInputToServer) {
              window.sendInputToServer(normalizedDx, normalizedDy)
            } else {
              console.log('❌ window.sendInputToServer not available!')
            }
          }
          
          // For local prediction, still update local targets
          this.player.targetX = this.mouse.worldX
          this.player.targetY = this.mouse.worldY
        }
      })

      // Mobile touch controls - DISABLED: Using analog stick only
      // this.canvas.addEventListener('touchmove', (e) => {
      //   e.preventDefault()
      //   const rect = this.canvas.getBoundingClientRect()
      //   const touch = e.touches[0]
      //   this.mouse.x = touch.clientX - rect.left
      //   this.mouse.y = touch.clientY - rect.top
      //   
      //   this.mouse.worldX = this.mouse.x + this.camera.x
      //   this.mouse.worldY = this.mouse.y + this.camera.y
      //   
      //   // Only use touch movement if not using joystick
      //   if (!window.isUsingJoystick) {
      //     this.player.targetX = this.mouse.worldX
      //     this.player.targetY = this.mouse.worldY
      //   }
      // }, { passive: false })
      
      // Mobile: Analog stick only - no touch-to-move
      console.log('🕹️ Mobile controls: Analog stick only (touch-to-move disabled)')
    }

    update() {
      if (!this.running) return
      
      const now = Date.now()
      const deltaTime = (now - this.lastUpdate) / 1000
      this.lastUpdate = now

      // Always update player movement (for client-side prediction)
      this.updatePlayer(deltaTime)
      
      // Always update camera
      this.updateCamera()
      
      // Skip local AI and collision detection in multiplayer mode
      if (window.isMultiplayer && this.serverState) {
        console.log('🌐 Multiplayer mode: Using server-authoritative state')
        return // Server handles all game logic
      }
      
      // Local single-player game logic (only when not in multiplayer)
      console.log('🏠 Single-player mode: Running local game logic')
      
      // Update dynamic zone for cash games
      this.updateDynamicZone(deltaTime)
      
      // Update spawn protection timers
      this.updateSpawnProtection()
      
      // Update enemies (AI bots)
      this.enemies.forEach(enemy => this.updateEnemy(enemy, deltaTime))
      
      // Check collisions (local simulation)
      this.checkCollisions()
      
      // Maintain coin count (local coin generation)
      while (this.coins.length < 1000) { // Increased to 1000 to match Agar.io food density
        const centerX = this.world.width / 2  // 2000
        const centerY = this.world.height / 2 // 2000
        const playableRadius = 1800 // Same as boundary radius
        
        let x, y, distance
        
        // Keep generating random positions until we get one inside the circular boundary
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 20) // 20px buffer from edge
        
        this.coins.push({
          x: x,
          y: y,
          radius: 8,
          color: '#FFD700',
          value: 5 // Increased from 1 to 5 for better mass gain
        })
      }
    }

    updatePlayer(deltaTime) {
      // Update split cooldown
      if (this.splitCooldown > 0) {
        this.splitCooldown--
      }
      
      const dx = this.player.targetX - this.player.x
      const dy = this.player.targetY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Debug player movement (only log occasionally to avoid spam)
      if (window.isUsingJoystick && Math.random() < 0.01) { // 1% chance to log
        console.log('🎮 Player Movement Update:', {
          playerPos: { x: this.player.x.toFixed(1), y: this.player.y.toFixed(1) },
          targetPos: { x: this.player.targetX.toFixed(1), y: this.player.targetY.toFixed(1) },
          distance: distance.toFixed(1),
          usingJoystick: window.isUsingJoystick
        })
      }
      
      // Dynamic speed based on mass - larger players move slower
      // Use a much smaller threshold to prevent stopping when mouse is still
      if (distance > 0.1) {
        // Speed decreases as mass increases (like Agar.io)
        const baseSpeed = 6.0  // Base speed for small players
        const massSpeedFactor = Math.sqrt(this.player.mass / 20) // Gradual slowdown
        const dynamicSpeed = Math.max(1.5, baseSpeed / massSpeedFactor) // Minimum speed of 1.5
        
        const moveDistance = Math.min(dynamicSpeed, distance) // Don't overshoot target
        
        // Normalize direction and apply dynamic speed
        const moveX = (dx / distance) * moveDistance
        const moveY = (dy / distance) * moveDistance
        
        this.player.x += moveX
        this.player.y += moveY
      }
      
      // Update all player pieces
      this.updatePlayerPieces(deltaTime)
      
      // Quick boundary check - keep it simple
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const maxRadius = this.currentPlayableRadius - this.player.radius
      
      const distanceFromCenter = Math.sqrt(
        Math.pow(this.player.x - centerX, 2) + 
        Math.pow(this.player.y - centerY, 2)
      )
      
      if (distanceFromCenter > maxRadius) {
        const angle = Math.atan2(this.player.y - centerY, this.player.x - centerX)
        this.player.x = centerX + Math.cos(angle) * maxRadius
        this.player.y = centerY + Math.sin(angle) * maxRadius
      }
      
      this.player.radius = Math.sqrt(this.player.mass) * 3
      
      // Anti-cheat: Validate radius-mass relationship
      if (this.antiCheat.enabled) {
        const expectedRadius = Math.sqrt(this.player.mass) * 3
        if (Math.abs(this.player.radius - expectedRadius) > 1) {
          console.log(`⚠️ RADIUS VIOLATION: Player mass: ${this.player.mass}, Current radius: ${this.player.radius}, Expected radius: ${expectedRadius}`)
          this.recordViolation('RADIUS_MANIPULATION', `Invalid radius: ${this.player.radius} vs expected: ${expectedRadius}`)
          this.player.radius = expectedRadius // Force correct radius
        }
      }
      
      // Add debugging for high mass (around 1050)
      if (this.player.mass > 1000) {
        console.log(`🔍 HIGH MASS DEBUG: Mass=${this.player.mass.toFixed(1)}, Radius=${this.player.radius.toFixed(1)}, Zone=${this.currentPlayableRadius}, MaxRadius=${(this.currentPlayableRadius - this.player.radius).toFixed(1)}`)
      }
    }

    updatePlayerPieces(deltaTime) {
      const currentTime = Date.now()
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const maxRadius = this.currentPlayableRadius
      
      // Update each player piece
      for (let i = this.playerPieces.length - 1; i >= 0; i--) {
        const piece = this.playerPieces[i]
        
        // Move piece towards mouse (same logic as main player)
        const dx = piece.targetX - piece.x
        const dy = piece.targetY - piece.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // Apply initial split velocity (strong initial launch like Agar.io)
        if (piece.vx !== 0 || piece.vy !== 0) {
          // Apply velocity with proper scaling - stronger initial movement
          const velocityMultiplier = deltaTime * 60 // Normalize for 60fps equivalent
          piece.x += piece.vx * velocityMultiplier
          piece.y += piece.vy * velocityMultiplier
          
          // Friction - reduce velocity over time (authentic Agar.io decay)
          piece.vx *= 0.92 // Slightly more aggressive friction
          piece.vy *= 0.92
          
          // Stop very small velocities to prevent floating point issues
          if (Math.abs(piece.vx) < 0.05) piece.vx = 0
          if (Math.abs(piece.vy) < 0.05) piece.vy = 0
          
          // Debug log for initial frames
          if (Math.abs(piece.vx) > 0.05 || Math.abs(piece.vy) > 0.05) {
            console.log(`🚀 Piece ejecting: vx=${piece.vx.toFixed(2)}, vy=${piece.vy.toFixed(2)}, pos=(${piece.x.toFixed(0)}, ${piece.y.toFixed(0)})`)
          }
        }
        
        // Move towards mouse target only when no split velocity remains
        if (distance > 0.1 && Math.abs(piece.vx) < 0.05 && Math.abs(piece.vy) < 0.05) {
          const baseSpeed = 6.0
          const massSpeedFactor = Math.sqrt(piece.mass / 20)
          const dynamicSpeed = Math.max(1.5, baseSpeed / massSpeedFactor)
          
          const moveDistance = Math.min(dynamicSpeed, distance)
          const moveX = (dx / distance) * moveDistance
          const moveY = (dy / distance) * moveDistance
          
          piece.x += moveX
          piece.y += moveY
        }
        
        // Update piece properties
        piece.radius = Math.sqrt(piece.mass) * 3
        piece.targetX = this.player.targetX // Follow main player's target
        piece.targetY = this.player.targetY
        
        // Boundary check for pieces
        const distanceFromCenter = Math.sqrt(
          Math.pow(piece.x - centerX, 2) + Math.pow(piece.y - centerY, 2)
        )
        
        if (distanceFromCenter > maxRadius - piece.radius) {
          const angle = Math.atan2(piece.y - centerY, piece.x - centerX)
          piece.x = centerX + Math.cos(angle) * (maxRadius - piece.radius)
          piece.y = centerY + Math.sin(angle) * (maxRadius - piece.radius)
        }
        
        // Check for recombination after shorter cooldown (3 seconds for very responsive gameplay)
        if (currentTime - piece.splitTime > 3000) { // 3 seconds for immediate merging
          piece.recombineReady = true
        }
        
        // Debug: Log piece status every few seconds
        if (currentTime % 2000 < 50) { // Every 2 seconds approximately
          console.log(`🔍 Piece ${i}: Ready=${piece.recombineReady}, Age=${((currentTime - piece.splitTime) / 1000).toFixed(1)}s, Distance to main=${Math.sqrt(Math.pow(piece.x - this.player.x, 2) + Math.pow(piece.y - this.player.y, 2)).toFixed(0)}`)
        }
        
        // Auto-recombine if pieces are close and ready (VERY generous distance)
        if (piece.recombineReady) {
          const distanceToMain = Math.sqrt(
            Math.pow(piece.x - this.player.x, 2) + 
            Math.pow(piece.y - this.player.y, 2)
          )
          
          // Very generous collision detection - pieces merge when reasonably close
          if (distanceToMain < (piece.radius + this.player.radius) * 1.5) {
            // Merge mass back to main player
            this.player.mass += piece.mass
            this.player.radius = Math.sqrt(this.player.mass) * 3
            
            // Remove piece from array
            this.playerPieces.splice(i, 1)
            
            console.log(`🔄 Player piece recombined with main! Distance: ${distanceToMain.toFixed(0)}, Combined mass: ${Math.floor(this.player.mass)}, Remaining pieces: ${this.playerPieces.length}`)
            continue // Skip to next piece since this one was removed
          }
        }
        
        // Check recombination between pieces (VERY lenient conditions)
        for (let j = i + 1; j < this.playerPieces.length; j++) {
          const otherPiece = this.playerPieces[j]
          if (piece.recombineReady && otherPiece.recombineReady) {
            const pieceToPieceDistance = Math.sqrt(
              Math.pow(piece.x - otherPiece.x, 2) + 
              Math.pow(piece.y - otherPiece.y, 2)
            )
            
            // Very generous collision detection for piece-to-piece merging
            if (pieceToPieceDistance < (piece.radius + otherPiece.radius) * 1.5) {
              // Always merge into the larger piece (create one bigger circle)
              if (piece.mass >= otherPiece.mass) {
                piece.mass += otherPiece.mass
                piece.radius = Math.sqrt(piece.mass) * 3
                this.playerPieces.splice(j, 1)
                console.log(`🔄 Player pieces merged! Distance: ${pieceToPieceDistance.toFixed(0)}, New mass: ${Math.floor(piece.mass)}, Remaining pieces: ${this.playerPieces.length}`)
              } else {
                otherPiece.mass += piece.mass
                otherPiece.radius = Math.sqrt(otherPiece.mass) * 3
                this.playerPieces.splice(i, 1)
                console.log(`🔄 Player pieces merged! Distance: ${pieceToPieceDistance.toFixed(0)}, New mass: ${Math.floor(otherPiece.mass)}, Remaining pieces: ${this.playerPieces.length}`)
                break
              }
            }
          }
        }
      }
      
      // Update total mass display
      const totalMass = this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0)
      setMass(Math.floor(totalMass))
    }

    updateEnemy(enemy, deltaTime) {
      const now = Date.now()
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      // Enhanced AI behavior - different strategies based on enemy size and situation
      const enemyRadius = enemy.radius
      const playerRadius = this.player.radius
      const distanceToPlayer = Math.sqrt(
        Math.pow(enemy.x - this.player.x, 2) + 
        Math.pow(enemy.y - this.player.y, 2)
      )
      
      let targetX = enemy.targetX
      let targetY = enemy.targetY
      let shouldUpdateTarget = now - enemy.lastTargetChange > 3000 + Math.random() * 2000
      
      // AI Strategy 1: Avoid larger enemies (including player if larger)
      const avoidanceRadius = enemyRadius * 8 // Avoid within 8x radius
      if (playerRadius > enemyRadius * 1.2 && distanceToPlayer < avoidanceRadius) {
        // Player is significantly larger - flee!
        const fleeAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x)
        const fleeDistance = enemyRadius * 10
        targetX = enemy.x + Math.cos(fleeAngle) * fleeDistance
        targetY = enemy.y + Math.sin(fleeAngle) * fleeDistance
        shouldUpdateTarget = true
        enemy.behavior = 'fleeing'
        enemy.speed = Math.max(0.4, 45 / Math.sqrt(enemy.mass)) // Faster when fleeing
      }
      // AI Strategy 2: Hunt smaller enemies (including player if smaller)
      else if (enemyRadius > playerRadius * 1.3 && distanceToPlayer < enemyRadius * 6) {
        // Enemy is larger - hunt the player!
        targetX = this.player.x
        targetY = this.player.y
        shouldUpdateTarget = true
        enemy.behavior = 'hunting_player'
        enemy.speed = Math.max(0.3, 40 / Math.sqrt(enemy.mass)) // Aggressive hunting speed
      }
      // AI Strategy 3: Hunt other smaller enemies
      else {
        let smallerEnemy = null
        let closestDistance = Infinity
        
        this.enemies.forEach(otherEnemy => {
          if (otherEnemy !== enemy && otherEnemy.radius < enemyRadius * 0.8) {
            const dist = Math.sqrt(
              Math.pow(enemy.x - otherEnemy.x, 2) + 
              Math.pow(enemy.y - otherEnemy.y, 2)
            )
            if (dist < closestDistance && dist < enemyRadius * 8) {
              closestDistance = dist
              smallerEnemy = otherEnemy
            }
          }
        })
        
        if (smallerEnemy) {
          targetX = smallerEnemy.x
          targetY = smallerEnemy.y
          shouldUpdateTarget = true
          enemy.behavior = 'hunting_enemy'
          enemy.speed = Math.max(0.3, 40 / Math.sqrt(enemy.mass))
        }
        // AI Strategy 4: Coin hunting behavior
        else {
          // Look for nearby coins to hunt
          let nearestCoin = null
          let nearestCoinDistance = Infinity
          const coinSearchRadius = enemyRadius * 12
          
          this.coins.forEach(coin => {
            const dist = Math.sqrt(
              Math.pow(enemy.x - coin.x, 2) + 
              Math.pow(enemy.y - coin.y, 2)
            )
            if (dist < nearestCoinDistance && dist < coinSearchRadius) {
              nearestCoinDistance = dist
              nearestCoin = coin
            }
          })
          
          if (nearestCoin) {
            targetX = nearestCoin.x
            targetY = nearestCoin.y
            shouldUpdateTarget = true
            enemy.behavior = 'hunting_coins'
            enemy.speed = Math.max(0.25, 38 / Math.sqrt(enemy.mass))
          }
          // AI Strategy 5: Random exploration (fallback)
          else if (shouldUpdateTarget) {
            enemy.behavior = 'exploring'
            enemy.speed = Math.max(0.2, 35 / Math.sqrt(enemy.mass))
          }
        }
      }
      
      // Update target if needed (random exploration or no specific target)
      if (shouldUpdateTarget && !['fleeing', 'hunting_player', 'hunting_enemy', 'hunting_coins'].includes(enemy.behavior)) {
        // Generate new target within the circular playable area
        let newTargetX, newTargetY, distance
        do {
          newTargetX = Math.random() * this.world.width
          newTargetY = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(newTargetX - centerX, 2) + Math.pow(newTargetY - centerY, 2))
        } while (distance > playableRadius - enemy.radius - 50) // 50px buffer from edge
        
        targetX = newTargetX
        targetY = newTargetY
        enemy.lastTargetChange = now
      }
      
      // Update enemy target
      enemy.targetX = targetX
      enemy.targetY = targetY
      
      // Movement logic with enhanced pathfinding
      const dx = enemy.targetX - enemy.x
      const dy = enemy.targetY - enemy.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const moveX = (dx / distance) * enemy.speed * 60 * deltaTime
        const moveY = (dy / distance) * enemy.speed * 60 * deltaTime
        
        // Add movement smoothing with behavior-based adjustments
        let smoothingFactor = 0.7
        if (enemy.behavior === 'fleeing') {
          smoothingFactor = 0.9 // More direct movement when fleeing
        } else if (enemy.behavior === 'hunting_player' || enemy.behavior === 'hunting_enemy') {
          smoothingFactor = 0.8 // More direct when hunting
        }
        
        const smoothMoveX = moveX * smoothingFactor
        const smoothMoveY = moveY * smoothingFactor
        
        enemy.x += smoothMoveX
        enemy.y += smoothMoveY
        
        // Constrain enemies to circular playable boundary
        const distanceFromCenter = Math.sqrt(
          Math.pow(enemy.x - centerX, 2) + 
          Math.pow(enemy.y - centerY, 2)
        )
        
        if (distanceFromCenter + enemy.radius > playableRadius) {
          // Push enemy back inside circular boundary
          const angle = Math.atan2(enemy.y - centerY, enemy.x - centerX)
          const maxDistance = playableRadius - enemy.radius
          enemy.x = centerX + Math.cos(angle) * maxDistance
          enemy.y = centerY + Math.sin(angle) * maxDistance
          
          // When hitting boundary, choose a new target toward center
          const angleToCenter = Math.atan2(centerY - enemy.y, centerX - enemy.x)
          const targetDistance = Math.random() * (playableRadius * 0.8) // Target within 80% of playable area
          enemy.targetX = centerX + Math.cos(angleToCenter + (Math.random() - 0.5) * Math.PI) * targetDistance
          enemy.targetY = centerY + Math.sin(angleToCenter + (Math.random() - 0.5) * Math.PI) * targetDistance
          enemy.lastTargetChange = now // Reset target timer
          enemy.behavior = 'exploring' // Reset behavior after boundary hit
        }
      }
      
      // AI coins collection - bots can eat coins too
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i]
        const coinDx = enemy.x - coin.x
        const coinDy = enemy.y - coin.y
        const coinDistance = Math.sqrt(coinDx * coinDx + coinDy * coinDy)
        
        if (coinDistance < enemy.radius + coin.radius) {
          enemy.mass += coin.value
          enemy.radius = Math.sqrt(enemy.mass) * 3
          enemy.speed = Math.max(0.2, 35 / Math.sqrt(enemy.mass)) // Update speed based on new mass
          this.coins.splice(i, 1)
        }
      }
    }

    updateSpawnProtection() {
      const now = Date.now()
      
      // Update player spawn protection
      if (this.player.spawnProtection) {
        if (now - this.player.spawnProtectionStart >= this.player.spawnProtectionTime) {
          this.player.spawnProtection = false
          console.log('Player spawn protection ended')
        }
      }
      
      // Update enemy spawn protection
      this.enemies.forEach(enemy => {
        if (enemy.spawnProtection) {
          if (now - enemy.spawnProtectionStart >= enemy.spawnProtectionTime) {
            enemy.spawnProtection = false
            console.log(`Enemy ${enemy.name} spawn protection ended`)
          }
        }
      })
    }

    checkCollisions() {
      // Skip all collisions if game is not running (prevents being eaten after cash out)
      if (!this.running) return
      
      // Player eating coins
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i]
        const dx = this.player.x - coin.x
        const dy = this.player.y - coin.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + coin.radius) {
          this.player.mass += coin.value
          setScore(prev => prev + coin.value)
          setMass(this.player.mass)
          this.coins.splice(i, 1)
          
          // Update mission progress for coin collection
          if (typeof updateMissionProgress === 'function') {
            updateMissionProgress('coin_collected', 1)
            updateMissionProgress('mass_reached', this.player.mass)
          }
        }
      }
      
      // Player vs viruses (authentic Agar.io mechanics)
      for (let i = this.viruses.length - 1; i >= 0; i--) {
        const virus = this.viruses[i]
        const dx = this.player.x - virus.x
        const dy = this.player.y - virus.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + virus.radius) {
          if (this.player.mass > virus.mass) {
            // Player is bigger than virus - split player into multiple pieces (authentic Agar.io)
            const splitCount = Math.min(4, Math.floor(this.player.mass / 40)) // More mass = more splits
            const pieceCount = Math.max(2, splitCount)
            const pieceMass = this.player.mass / pieceCount
            
            // Keep main player as one piece
            this.player.mass = pieceMass
            setMass(Math.floor(pieceMass))
            
            // Create additional player pieces (simplified - just reduce main player mass significantly)
            // In full implementation, this would create multiple controllable pieces
            this.player.mass = Math.max(20, this.player.mass * 0.4) // Much more severe penalty like real Agar.io
            
            // Eject player away from virus
            const ejectDistance = 80
            const ejectAngle = Math.atan2(dx, dy)
            this.player.x += Math.sin(ejectAngle) * ejectDistance
            this.player.y += Math.cos(ejectAngle) * ejectDistance
            
            // Remove the virus (consumed)
            this.viruses.splice(i, 1)
            
            // Spawn a new virus elsewhere to maintain count (within circular boundary)
            const centerX = this.world.width / 2  // 2000
            const centerY = this.world.height / 2 // 2000
            const playableRadius = 1800 // Same as boundary radius
            
            let newX, newY, newDistance
            
            // Keep generating random positions until we get one inside the circular boundary
            do {
              newX = Math.random() * this.world.width
              newY = Math.random() * this.world.height
              newDistance = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2))
            } while (newDistance > playableRadius - 50) // 50px buffer from edge
            
            this.viruses.push({
              x: newX,
              y: newY,
              radius: 35,
              color: '#00FF41',
              spikes: 12,
              mass: 100
            })
            
          } else {
            // Player is smaller - can hide behind virus (no collision with small players)
            // This allows small players to use viruses as protection like in real Agar.io
            continue
          }
        }
      }
      
      // Player vs enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        const dx = this.player.x - enemy.x
        const dy = this.player.y - enemy.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + enemy.radius - 5) { // Reduced collision buffer from -10 to -5
          // Check spawn protection - no collisions if either player has protection
          if (this.player.spawnProtection || enemy.spawnProtection) {
            continue // Skip collision if anyone has spawn protection
          }
          
          if (this.player.mass > enemy.mass * 1.25) { // Increased threshold from 1.2 to 1.25 for fairer gameplay
            // Player eats enemy
            this.player.mass += enemy.mass * 0.8
            setScore(prev => prev + Math.floor(enemy.mass))
            setEliminations(prev => prev + 1)
            setMass(this.player.mass)
            
            // Update mission progress for elimination
            if (typeof updateMissionProgress === 'function') {
              updateMissionProgress('elimination', 1)
              updateMissionProgress('mass_reached', this.player.mass)
            }
            
            // Respawn enemy
            enemy.mass = 15 + Math.random() * 40
            enemy.radius = Math.sqrt(enemy.mass) * 3
            
            // Respawn within playable radius
            const centerX = this.world.width / 2
            const centerY = this.world.height / 2
            const playableRadius = this.currentPlayableRadius
            let x, y, distance
            
            do {
              x = Math.random() * this.world.width
              y = Math.random() * this.world.height
              distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
            } while (distance > playableRadius - 50) // 50px buffer from edge
            
            enemy.x = x
            enemy.y = y
            // Reset spawn protection for respawned enemy
            enemy.spawnProtection = true
            enemy.spawnProtectionStart = Date.now()
            console.log(`Enemy ${enemy.name} respawned with spawn protection within zone radius ${Math.floor(playableRadius)}px`)
          } else if (enemy.mass > this.player.mass * 1.25) { // Increased threshold for fairer elimination
            // Enemy eats player - Game Over
            console.log(`💀 Player eliminated by ${enemy.name}! Player mass: ${this.player.mass.toFixed(1)}, Enemy mass: ${enemy.mass.toFixed(1)}`)
            this.running = false
            
            // Calculate final survival time
            if (this.gameStartTime && this.setTimeSurvived) {
              const finalTime = Math.floor((Date.now() - this.gameStartTime) / 1000)
              this.setTimeSurvived(finalTime)
              console.log(`🏁 Game Over - Survived for ${finalTime} seconds`)
            }
            
            setGameOver(true)
          }
        }
      }
      
      // Enemies eating coins
      this.enemies.forEach(enemy => {
        for (let i = this.coins.length - 1; i >= 0; i--) {
          const coin = this.coins[i]
          const dx = enemy.x - coin.x
          const dy = enemy.y - coin.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < enemy.radius + coin.radius) {
            enemy.mass += coin.value * 0.5
            enemy.radius = Math.sqrt(enemy.mass) * 3
            enemy.speed = Math.max(0.2, 35 / Math.sqrt(enemy.mass)) // Update speed
            this.coins.splice(i, 1)
            break
          }
        }
      })
      
      // Enhanced AI: Enemies vs Enemies collision (bots eating each other)
      for (let i = 0; i < this.enemies.length; i++) {
        const enemy1 = this.enemies[i]
        if (enemy1.spawnProtection) continue // Skip if has spawn protection
        
        for (let j = i + 1; j < this.enemies.length; j++) {
          const enemy2 = this.enemies[j]
          if (enemy2.spawnProtection) continue // Skip if has spawn protection
          
          const dx = enemy1.x - enemy2.x
          const dy = enemy1.y - enemy2.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < enemy1.radius + enemy2.radius - 3) {
            // Determine who eats who based on mass (with threshold)
            const massThreshold = 1.3 // Need to be 30% larger to eat
            
            if (enemy1.mass > enemy2.mass * massThreshold) {
              // Enemy1 eats Enemy2
              console.log(`🤖 ${enemy1.name} ate ${enemy2.name}! (${Math.floor(enemy1.mass)} > ${Math.floor(enemy2.mass)})`)
              enemy1.mass += enemy2.mass * 0.7 // Gain 70% of eaten enemy's mass
              enemy1.radius = Math.sqrt(enemy1.mass) * 3
              enemy1.speed = Math.max(0.2, 35 / Math.sqrt(enemy1.mass))
              
              // Respawn the eaten enemy with new properties
              const respawnMass = 15 + Math.random() * 30
              enemy2.mass = respawnMass
              enemy2.radius = Math.sqrt(respawnMass) * 3
              enemy2.speed = Math.max(0.2, 35 / Math.sqrt(respawnMass))
              
              // Respawn at random location within playable area
              const centerX = this.world.width / 2
              const centerY = this.world.height / 2
              const playableRadius = this.currentPlayableRadius
              let x, y, spawnDistance
              
              do {
                x = Math.random() * this.world.width
                y = Math.random() * this.world.height
                spawnDistance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
              } while (spawnDistance > playableRadius - 100) // Larger buffer for respawn
              
              enemy2.x = x
              enemy2.y = y
              enemy2.spawnProtection = true
              enemy2.spawnProtectionStart = Date.now()
              enemy2.behavior = 'exploring' // Reset behavior
              
            } else if (enemy2.mass > enemy1.mass * massThreshold) {
              // Enemy2 eats Enemy1
              console.log(`🤖 ${enemy2.name} ate ${enemy1.name}! (${Math.floor(enemy2.mass)} > ${Math.floor(enemy1.mass)})`)
              enemy2.mass += enemy1.mass * 0.7 // Gain 70% of eaten enemy's mass
              enemy2.radius = Math.sqrt(enemy2.mass) * 3
              enemy2.speed = Math.max(0.2, 35 / Math.sqrt(enemy2.mass))
              
              // Respawn the eaten enemy with new properties
              const respawnMass = 15 + Math.random() * 30
              enemy1.mass = respawnMass
              enemy1.radius = Math.sqrt(respawnMass) * 3
              enemy1.speed = Math.max(0.2, 35 / Math.sqrt(respawnMass))
              
              // Respawn at random location within playable area
              const centerX = this.world.width / 2
              const centerY = this.world.height / 2
              const playableRadius = this.currentPlayableRadius
              let x, y, spawnDistance
              
              do {
                x = Math.random() * this.world.width
                y = Math.random() * this.world.height
                spawnDistance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
              } while (spawnDistance > playableRadius - 100) // Larger buffer for respawn
              
              enemy1.x = x
              enemy1.y = y
              enemy1.spawnProtection = true
              enemy1.spawnProtectionStart = Date.now()
              enemy1.behavior = 'exploring' // Reset behavior
            }
            // If masses are too similar, they just bounce off each other (no collision)
            else {
              // Apply slight repulsion to prevent sticking together
              const repulsionForce = 2
              const repulsionAngle = Math.atan2(dy, dx)
              enemy1.x += Math.cos(repulsionAngle) * repulsionForce
              enemy1.y += Math.sin(repulsionAngle) * repulsionForce
              enemy2.x -= Math.cos(repulsionAngle) * repulsionForce
              enemy2.y -= Math.sin(repulsionAngle) * repulsionForce
            }
          }
        }
      }
      
      // Player pieces collision detection
      this.checkPlayerPiecesCollisions()
    }

    checkPlayerPiecesCollisions() {
      // Check collisions for each player piece
      for (let pieceIndex = this.playerPieces.length - 1; pieceIndex >= 0; pieceIndex--) {
        const piece = this.playerPieces[pieceIndex]
        
        // Player pieces eating coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
          const coin = this.coins[i]
          const dx = piece.x - coin.x
          const dy = piece.y - coin.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < piece.radius + coin.radius) {
            piece.mass += coin.value
            piece.radius = Math.sqrt(piece.mass) * 3
            setScore(prev => prev + coin.value)
            this.coins.splice(i, 1)
            
            // Update mission progress for coin collection
            if (typeof updateMissionProgress === 'function') {
              updateMissionProgress('coin_collected', 1)
              updateMissionProgress('mass_reached', piece.mass)
            }
          }
        }
        
        // Player pieces vs enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i]
          const dx = piece.x - enemy.x
          const dy = piece.y - enemy.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < piece.radius + enemy.radius - 10) {
            // Check spawn protection - no collisions if either has protection
            if (enemy.spawnProtection) {
              continue // Skip collision if enemy has spawn protection
            }
            
            if (piece.mass > enemy.mass * 1.25) { // Increased threshold for fairer piece vs enemy gameplay
              // Player piece eats enemy
              piece.mass += enemy.mass * 0.8
              piece.radius = Math.sqrt(piece.mass) * 3
              setScore(prev => prev + Math.floor(enemy.mass))
              setEliminations(prev => prev + 1)
              
              // Remove enemy
              this.enemies.splice(i, 1)
              
              // Respawn enemy elsewhere
              this.spawnEnemy()
              
              // Update mission progress
              if (typeof updateMissionProgress === 'function') {
                updateMissionProgress('elimination', 1)
                updateMissionProgress('mass_reached', piece.mass)
              }
              
              console.log(`🔥 Player piece eliminated enemy! Piece mass: ${Math.floor(piece.mass)}`)
              
            } else if (enemy.mass > piece.mass * 1.35) { // Increased threshold from 1.2 to 1.35 for fairer piece elimination
              // Enemy eats player piece
              enemy.mass += piece.mass * 0.8
              enemy.radius = Math.sqrt(enemy.mass) * 3
              
              // Remove the player piece
              this.playerPieces.splice(pieceIndex, 1)
              
              console.log(`💀 Player piece was eliminated by enemy! Remaining pieces: ${this.playerPieces.length}`)
              
              // Only trigger game over if main player is also very small and vulnerable
              if (this.playerPieces.length === 0 && this.player.mass <= 15) {
                // Game over - no pieces left and main player is critically small
                console.log(`🏁 Game Over - All pieces eliminated and main player critically small (mass: ${this.player.mass})!`)
                this.running = false
                const finalTime = Math.floor((Date.now() - this.gameStartTime) / 1000)
                setTimeSurvived(finalTime)
                this.setTimeSurvived(finalTime)
                setGameOver(true)
              }
              
              break // Exit enemy loop since this piece was destroyed
            }
          }
        }
        
        // Player pieces vs viruses
        for (let i = this.viruses.length - 1; i >= 0; i--) {
          const virus = this.viruses[i]
          const dx = piece.x - virus.x
          const dy = piece.y - virus.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < piece.radius + virus.radius) {
            if (piece.mass > virus.mass) {
              // Player piece hits virus - split the piece further
              if (piece.mass > 40) { // Only split if piece has enough mass
                const halfMass = piece.mass / 2
                
                // Update current piece
                piece.mass = halfMass
                piece.radius = Math.sqrt(piece.mass) * 3
                
                // Create new piece from split
                const newPiece = {
                  x: piece.x + Math.random() * 60 - 30,
                  y: piece.y + Math.random() * 60 - 30,
                  mass: halfMass,
                  radius: Math.sqrt(halfMass) * 3,
                  color: piece.color,
                  name: 'You',
                  speed: piece.speed,
                  targetX: piece.targetX,
                  targetY: piece.targetY,
                  splitTime: Date.now(),
                  recombineReady: false,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6
                }
                
                // Add to pieces array if under limit
                if (this.playerPieces.length < 15) {
                  this.playerPieces.push(newPiece)
                }
                
                console.log(`🦠 Player piece hit virus and split! Now ${this.playerPieces.length + 1} total pieces`)
              }
              
              // Remove the virus
              this.viruses.splice(i, 1)
              
              // Respawn virus elsewhere
              this.spawnVirus()
            }
          }
        }
      }
      
      // Update total mass display including all pieces
      const totalMass = this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0)
      setMass(Math.floor(totalMass))
    }

    updateCamera() {
      // Super snappy camera - move more aggressively toward player
      const targetX = this.player.x - this.canvas.width / 2
      const targetY = this.player.y - this.canvas.height / 2
      
      // Use consistent smoothing for both local and multiplayer
      const smoothing = 0.2
      this.camera.x += (targetX - this.camera.x) * smoothing
      this.camera.y += (targetY - this.camera.y) * smoothing
      
      // Keep camera within world bounds
      const boundaryExtension = 100
      this.camera.x = Math.max(-boundaryExtension, Math.min(this.world.width - this.canvas.width + boundaryExtension, this.camera.x))
      this.camera.y = Math.max(-boundaryExtension, Math.min(this.world.height - this.canvas.height + boundaryExtension, this.camera.y))
    }

    render() {
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      this.ctx.save()
      this.ctx.translate(-this.camera.x, -this.camera.y)
      
      // Draw grid
      this.drawGrid()
      
      // Draw world boundary (red ring)
      this.drawWorldBoundary()
      
      // In multiplayer mode, render server state; otherwise render local state
      if (this.serverState && window.isMultiplayer) {
        // Draw server coins
        if (this.serverState.coins) {
          this.serverState.coins.forEach(coin => this.drawCoin(coin))
        }
        
        // Draw server viruses
        if (this.serverState.viruses) {
          this.serverState.viruses.forEach(virus => this.drawVirus(virus))
        }
        
        // Draw all server players (including current player)
        if (this.serverState.players) {
          console.log('🎮 MULTIPLAYER RENDER DEBUG - Total players to draw:', this.serverState.players.length)
          let currentPlayerFound = false
          this.serverState.players.forEach((player, index) => {
            if (player && player.alive) {
              if (player.isCurrentPlayer) {
                console.log('🎮 DRAWING CURRENT PLAYER:', {
                  x: player.x?.toFixed(1),
                  y: player.y?.toFixed(1),
                  radius: player.radius,
                  name: player.name,
                  sessionId: player.sessionId
                })
                currentPlayerFound = true
              }
              this.drawPlayer(player)
            }
          })
          if (!currentPlayerFound) {
            console.log('❌ CURRENT PLAYER NOT FOUND in serverState.players!')
            console.log('🎮 Available players:', this.serverState.players.map(p => ({ 
              sessionId: p.sessionId, 
              isCurrentPlayer: p.isCurrentPlayer, 
              alive: p.alive 
            })))
          }
        }
      } else {
        // Draw local coins
        this.coins.forEach(coin => this.drawCoin(coin))
        
        // Draw local viruses
        this.viruses.forEach(virus => this.drawVirus(virus))
        
        // Draw local enemies
        this.enemies.forEach(enemy => this.drawPlayer(enemy))
        
        // Draw player and all player pieces only if game is running and no modals are showing
        if (this.running && !this.gameStates.cashOutComplete && !this.gameStates.gameOver) {
          this.drawPlayer(this.player)
          
          // Draw all player pieces
          this.playerPieces.forEach(piece => this.drawPlayer(piece))
        }
      }
      
      this.ctx.restore()
    }

    drawGrid() {
      this.ctx.strokeStyle = '#808080' // Much brighter gray grid lines
      this.ctx.lineWidth = 1
      this.ctx.globalAlpha = 0.3 // Add transparency so they don't interfere with gameplay
      const gridSize = 50
      
      const startX = Math.floor(this.camera.x / gridSize) * gridSize
      const startY = Math.floor(this.camera.y / gridSize) * gridSize
      const endX = startX + this.canvas.width + gridSize
      const endY = startY + this.canvas.height + gridSize
      
      for (let x = startX; x <= endX; x += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(x, startY)
        this.ctx.lineTo(x, endY)
        this.ctx.stroke()
      }
      
      for (let y = startY; y <= endY; y += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(startX, y)
        this.ctx.lineTo(endX, y)
        this.ctx.stroke()
      }
      
      // Reset alpha back to normal
      this.ctx.globalAlpha = 1.0
    }

    drawWorldBoundary() {
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      // Draw red danger zone outside playable area
      this.ctx.fillStyle = '#1a0000'
      this.ctx.fillRect(0, 0, this.world.width, this.world.height)
      
      // Draw playable area (black circle to create the safe zone)
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
      
      // Dynamic zone color based on size changes
      let zoneColor = '#00ff00' // Default green
      if (Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        // Zone is changing - use yellow color
        zoneColor = '#ffff00'
      }
      if (this.isCashGame) {
        // Cash games get a distinctive blue-green color
        zoneColor = this.targetPlayableRadius > this.currentPlayableRadius ? '#00ffff' : '#0080ff'
      }
      
      // Draw the boundary circle
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor
      this.ctx.lineWidth = 8
      this.ctx.stroke()
      
      // Add glowing effect
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor.replace(')', ', 0.6)')
      this.ctx.lineWidth = 16
      this.ctx.stroke()
      
      // Add inner glow
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor.replace(')', ', 0.3)')
      this.ctx.lineWidth = 24
      this.ctx.stroke()
      
      // Show zone info for cash games
      if (this.isCashGame && Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = 'bold 16px Arial'
        this.ctx.textAlign = 'center'
        const direction = this.targetPlayableRadius > this.currentPlayableRadius ? 'EXPANDING' : 'SHRINKING'
        this.ctx.fillText(`ZONE ${direction}`, centerX, centerY - playableRadius - 40)
        this.ctx.font = 'bold 12px Arial'
        this.ctx.fillText(`Players: ${this.realPlayerCount} | Radius: ${Math.floor(playableRadius)}`, centerX, centerY - playableRadius - 20)
      }
    }

    drawCoin(coin) {
      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = coin.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#FFB000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
      
      // Draw $ symbol
      this.ctx.fillStyle = '#000000'
      this.ctx.font = 'bold 12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('$', coin.x, coin.y + 4)
    }

    drawPlayer(player) {
      // Draw player circle
      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = player.color
      this.ctx.fill()
      
      // Enhanced AI bot visual indicators
      if (player.botType) {
        // Draw different border styles based on bot type
        if (player.botType === 'aggressive') {
          this.ctx.strokeStyle = '#ff4444' // Red border for aggressive bots
          this.ctx.lineWidth = 4
          this.ctx.setLineDash([8, 4]) // Aggressive dashed pattern
        } else if (player.botType === 'defensive') {
          this.ctx.strokeStyle = '#44ff44' // Green border for defensive bots
          this.ctx.lineWidth = 5
          this.ctx.setLineDash([]) // Solid line
        } else if (player.botType === 'fast') {
          this.ctx.strokeStyle = '#ffff44' // Yellow border for fast bots
          this.ctx.lineWidth = 3
          this.ctx.setLineDash([4, 2, 4, 2]) // Fast alternating pattern
        } else { // balanced
          this.ctx.strokeStyle = '#4444ff' // Blue border for balanced bots
          this.ctx.lineWidth = 3
          this.ctx.setLineDash([6, 3]) // Balanced dashed pattern
        }
        
        // Add behavior indicator with different line styles
        if (player.behavior === 'hunting_player') {
          // Add extra red glow for bots hunting the player
          this.ctx.shadowColor = '#ff0000'
          this.ctx.shadowBlur = 8
        } else if (player.behavior === 'fleeing') {
          // Add yellow glow for fleeing bots
          this.ctx.shadowColor = '#ffff00'
          this.ctx.shadowBlur = 6
        } else if (player.behavior === 'hunting_enemy') {
          // Add orange glow for bots hunting other bots
          this.ctx.shadowColor = '#ff8800'
          this.ctx.shadowBlur = 5
        }
        
        this.ctx.stroke()
        this.ctx.shadowBlur = 0 // Reset shadow
        this.ctx.setLineDash([]) // Reset line dash
      } else {
        // Default border for human players
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
      }
      
      // Draw spawn protection ring
      if (player.spawnProtection) {
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2)
        this.ctx.strokeStyle = '#3B82F6' // Bright blue color
        this.ctx.lineWidth = 4
        this.ctx.setLineDash([10, 5]) // Dashed line pattern
        this.ctx.stroke()
        this.ctx.setLineDash([]) // Reset line dash
        
        // Add pulsing effect
        const time = Date.now() / 1000
        const pulseIntensity = Math.sin(time * 4) * 0.3 + 0.7 // Pulse between 0.4 and 1.0
        this.ctx.globalAlpha = pulseIntensity
        
        // Draw inner glow ring
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2)
        this.ctx.strokeStyle = '#60A5FA' // Lighter blue
        this.ctx.lineWidth = 2
        this.ctx.stroke()
        
        this.ctx.globalAlpha = 1.0 // Reset alpha
      }
      
      // Draw cash out progress ring - show ONLY on the actual main player when cashing out
      if (this.gameStates && this.gameStates.isCashingOut && this.gameStates.cashOutProgress > 0) {
        // Only show on the main player (the one controlled by the user)
        // Use strict comparison - main player should be the exact object reference or have name 'You'
        const isMainPlayer = (player === this.player) || (player.name === 'You' && player !== this.enemies.find(e => e.name === 'You'))
        
        if (isMainPlayer) {
          console.log('🎯 Drawing compact cash out ring on main player:', player.name)
          
          const ringRadius = player.radius + 8  // Much smaller - closer to player circle
          const progressAngle = (this.gameStates.cashOutProgress / 100) * Math.PI * 2
          
          // Draw a compact background ring (full circle)
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius, 0, Math.PI * 2)
          this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)' // Semi-transparent background
          this.ctx.lineWidth = 6  // Thinner for compact look
          this.ctx.stroke()
          
          // Draw the main progress arc - bright and compact
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + progressAngle)
          this.ctx.strokeStyle = '#00ff00' // Bright neon green
          this.ctx.lineWidth = 6  // Thinner for compact look
          this.ctx.lineCap = 'round'
          this.ctx.stroke()
          
          // Add a subtle outer glow effect
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius + 2, -Math.PI / 2, -Math.PI / 2 + progressAngle)
          this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)' // Subtle glow
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
          this.ctx.strokeStyle = '#66ff66' // Bright green inner glow
          this.ctx.lineWidth = 3  // Thinner inner glow
          this.ctx.lineCap = 'round'
          this.ctx.stroke()
          
          this.ctx.globalAlpha = 1.0 // Reset alpha
          
          // REMOVED: No more "CASHING OUT" text above player to avoid interference with "You" label
        }
      }
      
      // Draw player name with bot type indicator
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 14px Arial'
      this.ctx.textAlign = 'center'
      
      let displayName = player.name
      if (player.botType) {
        // Add emoji indicators for different bot types
        const botEmojis = {
          'aggressive': '⚔️',
          'defensive': '🛡️',
          'fast': '⚡',
          'balanced': '⚖️'
        }
        displayName = `${botEmojis[player.botType]} ${player.name}`
      }
      
      this.ctx.fillText(displayName, player.x, player.y - player.radius - 15)
      
      // Draw black eyes
      const eyeRadius = Math.max(2, player.radius * 0.12) // Made eyes smaller
      const eyeOffset = player.radius * 0.35 // Increased distance from center
      
      // Left eye
      this.ctx.beginPath()
      this.ctx.arc(player.x - eyeOffset, player.y - eyeOffset * 0.3, eyeRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
      
      // Right eye
      this.ctx.beginPath()
      this.ctx.arc(player.x + eyeOffset, player.y - eyeOffset * 0.3, eyeRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
      
      // Enhanced AI: Draw behavior indicator above bot name
      if (player.botType && player.behavior && player.behavior !== 'exploring') {
        this.ctx.fillStyle = '#ffff88'
        this.ctx.font = '10px Arial'
        this.ctx.textAlign = 'center'
        
        const behaviorText = {
          'hunting_player': '🎯 HUNTING YOU!',
          'fleeing': '💨 FLEEING',
          'hunting_enemy': '🔍 HUNTING',
          'hunting_coins': '🪙 COIN HUNT'
        }[player.behavior] || ''
        
        if (behaviorText) {
          this.ctx.fillText(behaviorText, player.x, player.y - player.radius - 35)
        }
      }
    }

    drawVirus(virus) {
      // Comprehensive NaN protection for virus properties
      virus.currentRotation = isNaN(virus.currentRotation) ? 0 : virus.currentRotation
      virus.rotationSpeed = isNaN(virus.rotationSpeed) ? 0.5 : virus.rotationSpeed
      virus.pulsePhase = isNaN(virus.pulsePhase) ? 0 : virus.pulsePhase
      virus.pulseSpeed = isNaN(virus.pulseSpeed) ? 0.02 : virus.pulseSpeed
      virus.spikeWavePhase = isNaN(virus.spikeWavePhase) ? 0 : virus.spikeWavePhase
      virus.spikeWaveSpeed = isNaN(virus.spikeWaveSpeed) ? 0.05 : virus.spikeWaveSpeed
      virus.colorShift = isNaN(virus.colorShift) ? 0 : virus.colorShift
      virus.glowIntensity = isNaN(virus.glowIntensity) ? 0.5 : virus.glowIntensity
      virus.radius = isNaN(virus.radius) ? 30 : virus.radius
      virus.spikes = isNaN(virus.spikes) ? 12 : virus.spikes
      
      // Update animation properties
      virus.currentRotation += virus.rotationSpeed
      virus.pulsePhase += virus.pulseSpeed
      virus.spikeWavePhase += virus.spikeWaveSpeed
      
      // Calculate animated values
      const pulseScale = 1 + Math.sin(virus.pulsePhase) * 0.1 // Pulsing effect
      const glowPulse = 0.5 + Math.sin(virus.pulsePhase * 1.5) * 0.3 // Glow pulsing
      
      this.ctx.save()
      this.ctx.translate(virus.x, virus.y)
      this.ctx.rotate((virus.currentRotation * Math.PI) / 180)
      this.ctx.scale(pulseScale, pulseScale)
      
      // Create gradient for depth effect
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, virus.radius + 20)
      
      // Safeguard: Ensure colorShift is a valid number
      const safeColorShift = isNaN(virus.colorShift) ? 0 : virus.colorShift
      
      gradient.addColorStop(0, `hsl(120, 100%, ${50 + safeColorShift}%)`)
      gradient.addColorStop(0.6, '#00FF41')
      gradient.addColorStop(1, '#00AA00')
      
      // Draw outer glow effect
      this.ctx.shadowColor = '#00FF41'
      
      // Safeguard: Ensure glowIntensity is a valid number
      const safeGlowIntensity = isNaN(virus.glowIntensity) ? 0.5 : virus.glowIntensity
      
      this.ctx.shadowBlur = 15 * safeGlowIntensity * glowPulse
      this.ctx.shadowOffsetX = 0
      this.ctx.shadowOffsetY = 0
      
      // Draw animated spikes
      this.ctx.beginPath()
      for (let i = 0; i < virus.spikes; i++) {
        const baseAngle = (i / virus.spikes) * Math.PI * 2
        
        // Individual spike wave animation
        const spikeWave = Math.sin(virus.spikeWavePhase + i * 0.5) * 3
        const spikeLength = virus.radius + 12 + spikeWave
        const innerRadius = virus.radius - 3
        
        // Outer spike point
        const outerX = Math.cos(baseAngle) * spikeLength
        const outerY = Math.sin(baseAngle) * spikeLength
        
        // Inner points (between spikes)
        const nextAngle = ((i + 0.5) / virus.spikes) * Math.PI * 2
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
      this.ctx.lineWidth = 2 + Math.sin(virus.pulsePhase * 2) * 0.5
      this.ctx.stroke()
      
      // Reset shadow for inner elements
      this.ctx.shadowBlur = 0
      
      // Draw animated inner core
      const coreRadius = virus.radius - 15
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
        const lineAngle = (i / 6) * Math.PI * 2 + virus.currentRotation * 0.02
        const lineLength = coreRadius * 0.6
        
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.lineTo(Math.cos(lineAngle) * lineLength, Math.sin(lineAngle) * lineLength)
        this.ctx.stroke()
      }
      
      // Draw central pulsing dot
      const centralDotRadius = 3 + Math.sin(virus.pulsePhase * 3) * 1.5
      this.ctx.beginPath()
      this.ctx.arc(0, 0, centralDotRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + glowPulse * 0.2})`
      this.ctx.fill()
      
      this.ctx.restore()
    }

    start() {
      this.running = true
      this.gameStartTime = Date.now() // Start the timer
      this.timeSurvivedSeconds = 0
      setGameStarted(true)
    }

    stop() {
      this.running = false
    }

    split() {
      // Check if split is allowed (minimum mass and cooldown)
      if (this.player.mass < 36 || this.splitCooldown > 0) {
        return
      }
      
      // Limit maximum number of pieces (authentic Agar.io limit)
      const currentPieces = 1 + this.playerPieces.length
      if (currentPieces >= 16) {
        return
      }
      
      // Calculate mass for each piece (split in half)
      const halfMass = this.player.mass / 2
      const halfRadius = Math.sqrt(halfMass / Math.PI) * 6
      
      // Calculate direction toward mouse cursor (Agar.io style)
      const dx = this.mouse.worldX - this.player.x
      const dy = this.mouse.worldY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Normalize direction vector (prevent division by zero)
      let directionX = 0
      let directionY = 0
      if (distance > 0) {
        directionX = dx / distance
        directionY = dy / distance
      } else {
        // Default direction if mouse is exactly on player (shouldn't happen, but safety check)
        directionX = 1
        directionY = 0
      }
      
      // Split distance and velocity (enhanced for visible ejection)
      const splitDistance = 100 // Increased distance pieces are ejected toward mouse
      const splitVelocity = 20 // Increased initial ejection speed for dramatic launch
      
      const newPiece = {
        x: this.player.x + directionX * splitDistance,
        y: this.player.y + directionY * splitDistance,
        mass: halfMass,
        radius: halfRadius,
        color: this.player.color,
        name: 'You',
        speed: this.player.speed,
        targetX: this.mouse.worldX, // Target the mouse position
        targetY: this.mouse.worldY,
        splitTime: Date.now(), // Track when split occurred
        recombineReady: false,
        vx: directionX * splitVelocity, // Initial velocity toward mouse
        vy: directionY * splitVelocity
      }
      
      // Update main player with recoil effect (opposite direction)
      this.player.mass = halfMass
      this.player.radius = halfRadius
      // Small recoil movement in opposite direction
      const recoilDistance = 20
      this.player.x = this.player.x - directionX * recoilDistance
      this.player.y = this.player.y - directionY * recoilDistance
      this.player.targetX = this.mouse.worldX // Keep following mouse
      this.player.targetY = this.mouse.worldY
      
      // Add new piece to array
      this.playerPieces.push(newPiece)
      
      // Update UI
      setMass(Math.floor(this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0)))
      
      // Set cooldown (1 second)
      this.splitCooldown = 60 // 60 frames = ~1 second at 60fps
      
      console.log(`🚀 Player split toward mouse! Now ${currentPieces + 1} pieces. Total mass: ${Math.floor(this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0))}. Direction: (${directionX.toFixed(2)}, ${directionY.toFixed(2)})`)
    }
  }

  // Initialize game ONCE on mount - don't recreate when multiplayer changes
  useEffect(() => {
    console.log('🎮 GAME INIT USEEFFECT RUNNING - ONE TIME ONLY')
    console.log('🎮 Initial isMultiplayer:', isMultiplayer)
    console.log('🎮 canvasRef.current:', !!canvasRef.current)
    
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
      console.log('❌ GAME INIT BLOCKED: canvasRef.current is null')
      return
    }
    
    console.log('✅ GAME INIT PROCEEDING: Canvas available, creating game engine...')

    const canvas = canvasRef.current
    // Set canvas size properly
    const setCanvasSize = () => {
      if (typeof window !== 'undefined') {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }
    
    setCanvasSize()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', setCanvasSize)
    }

    // Get selected skin from localStorage
    let selectedSkin = { id: 'default', name: 'Default Warrior', color: '#4A90E2' } // Default skin
    try {
      const savedSkin = localStorage.getItem('selectedSkin')
      if (savedSkin) {
        selectedSkin = JSON.parse(savedSkin)
        console.log('🎨 Loaded selected skin for game:', selectedSkin.name, selectedSkin.color)
      }
    } catch (error) {
      console.log('⚠️ Error loading selected skin, using default:', error)
    }

    // Pass game states to engine for player visibility control
    const gameStates = {
      cashOutComplete,
      gameOver,
      isCashingOut,
      cashOutProgress
    }

    console.log('🎮 CREATING GAME ENGINE - ONE TIME INITIALIZATION')
    
    const game = new GameEngine(canvas, setCheatingBan, setTimeSurvived, selectedSkin, gameStates)
    gameRef.current = game
    console.log('🎮 Game initialized and assigned to gameRef')
    
    game.start()
    setGameReady(true)
    console.log('🎮 Game started - Input should work in both local and multiplayer modes')

    // Game loop
    const gameLoop = () => {
      if (game.running) {
        game.update()
        game.render()
        
        // Update minimap data for React state (every few frames to avoid performance issues)
        if (Date.now() % 100 < 16) { // Update roughly every 100ms
          setMinimapData({
            playerX: game.player.x,
            playerY: game.player.y,
            enemies: game.enemies.map(enemy => ({ x: enemy.x, y: enemy.y })),
            coins: game.coins.map(coin => ({ x: coin.x, y: coin.y })),
            viruses: game.viruses.map(virus => ({ x: virus.x, y: virus.y }))
          })
          
          // Update other game stats
          setScore(Math.floor(game.player.mass - 20))
          setMass(Math.floor(game.player.mass))
        }
      }
      requestAnimationFrame(gameLoop)
    }
    gameLoop()

    return () => {
      game.stop()
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', setCanvasSize)
      }
      // Remove mobile game class and reset body styles when component unmounts
      document.body.classList.remove('mobile-game-active')
      document.body.style.margin = ''
      document.body.style.padding = ''
      document.body.style.overflow = ''
      document.body.style.background = ''
      document.documentElement.style.margin = ''
      document.documentElement.style.padding = ''
      document.documentElement.style.background = ''
    }
  }, []) // CRITICAL FIX: Empty dependency array - don't recreate on multiplayer change

  // Separate useEffect to update game state when multiplayer changes
  useEffect(() => {
    console.log('🎮 MULTIPLAYER MODE UPDATE:')
    console.log('🎮 isMultiplayer changed to:', isMultiplayer)
    console.log('🎮 gameRef.current exists:', !!gameRef.current)
    
    // Update global state for existing game engine
    window.sendInputToServer = sendInputToServer
    window.isMultiplayer = isMultiplayer
    window.wsRef = wsRef
    
    if (gameRef.current) {
      console.log('🎮 Updated existing game engine with multiplayer state')
    }
  }, [isMultiplayer])

  // Debug: Monitor multiplayer state synchronization
  useEffect(() => {
    console.log('🎮 Multiplayer state sync - React state:', isMultiplayer, 'Global window.isMultiplayer:', window.isMultiplayer)
    if (isMultiplayer) {
      console.log('🎮 ANTI-FLICKER: Multiplayer mode activated - using smoothed camera and position updates')
    }
  }, [isMultiplayer])

  // Cash out handling
  const cashOutIntervalRef = useRef(null)
  
  // Handle cash out button press (for mobile and desktop buttons)
  const handleCashOut = () => {
    if (!isCashingOut && !cashOutComplete && gameStarted) {
      console.log('Starting cash out process via button') // Debug log
      setIsCashingOut(true)
      setCashOutProgress(0)
    } else if (isCashingOut) {
      console.log('Canceling cash out via button') // Debug log
      // Cancel cash out if already in progress
      setIsCashingOut(false)
      setCashOutProgress(0)
      if (cashOutIntervalRef.current) {
        clearInterval(cashOutIntervalRef.current)
        cashOutIntervalRef.current = null
      }
    }
  }
  
  // Cash out key event handlers (separated from the interval logic)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && !isCashingOut && !cashOutComplete && gameStarted) {
        console.log('Starting cash out process') // Debug log
        setIsCashingOut(true)
        setCashOutProgress(0)
      }
      
      // Handle SPACE key for splitting
      if (e.key === ' ' && gameStarted && gameRef.current) {
        e.preventDefault() // Prevent page scrolling
        console.log('SPACE pressed - attempting split') // Debug log
        gameRef.current.split()
      }
    }
    
    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'e' && isCashingOut) {
        console.log('Canceling cash out') // Debug log
        // User released E before completion - reset
        setIsCashingOut(false)
        setCashOutProgress(0)
        if (cashOutIntervalRef.current) {
          clearInterval(cashOutIntervalRef.current)
          cashOutIntervalRef.current = null
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isCashingOut, cashOutComplete, gameStarted])
  
  // Cash out progress interval (separate effect)
  useEffect(() => {
    if (isCashingOut && !cashOutComplete) {
      console.log('Starting progress interval') // Debug log
      
      // Start the 5-second fill animation
      cashOutIntervalRef.current = setInterval(() => {
        setCashOutProgress(prev => {
          console.log('Progress update:', prev) // Debug log
          if (prev >= 100) {
            clearInterval(cashOutIntervalRef.current)
            cashOutIntervalRef.current = null
            setIsCashingOut(false)
            
            // Calculate survival time for cash out
            if (gameRef.current && gameRef.current.gameStartTime) {
              const finalTime = Math.floor((Date.now() - gameRef.current.gameStartTime) / 1000)
              setTimeSurvived(finalTime)
              console.log(`💰 Cash Out - Survived for ${finalTime} seconds`)
            }
            
            // Stop the game to prevent player from being eaten after cash out
            if (gameRef.current) {
              gameRef.current.running = false
              console.log('🛑 Game stopped after successful cash out')
            }
            
            setCashOutComplete(true)
            return 100
          }
          return prev + 2 // 2% every 100ms = 5 seconds total
        })
      }, 100)
    }
    
    // Cleanup interval if not cashing out
    return () => {
      if (cashOutIntervalRef.current) {
        clearInterval(cashOutIntervalRef.current)
        cashOutIntervalRef.current = null
      }
    }
  }, [isCashingOut, cashOutComplete])

  // Real-time survival timer - updates every second during gameplay
  useEffect(() => {
    if (!gameStarted || gameOver || cashOutComplete) return

    const survivalTimer = setInterval(() => {
      if (gameRef.current && gameRef.current.gameStartTime) {
        const currentTime = Math.floor((Date.now() - gameRef.current.gameStartTime) / 1000)
        setTimeSurvived(currentTime)
      }
    }, 1000)

    return () => clearInterval(survivalTimer)
  }, [gameStarted, gameOver, cashOutComplete])

  // Mission timer and survival tracking
  useEffect(() => {
    if (!gameStarted || gameOver || cashOutComplete) return

    const timer = setInterval(() => {
      setMissionTime(prev => {
        const newTime = prev - 1
        
        // Update survival mission progress
        const survivalSeconds = 60 - newTime
        updateMissionProgress('survival_time', survivalSeconds)
        
        // DO NOT end the game when timer reaches 0 - let player continue playing
        if (newTime <= 0) {
          console.log(`⏰ Mission timer completed! Player survived 60+ seconds and can continue playing`)
          // Reset timer to continue tracking longer survival times
          return 60 // Reset to 60 to track additional survival increments
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameOver, cashOutComplete])

  const handleSplit = (e) => {
    if (gameRef.current) {
      if (isMobile) {
        // Mobile: Use joystick direction for split
        if (joystickPosition.x !== 0 || joystickPosition.y !== 0) {
          // Calculate joystick direction
          const joystickAngle = Math.atan2(joystickPosition.y, joystickPosition.x)
          const splitDistance = 300 // Distance to propel split cell
          
          // Set world coordinates based on joystick direction
          const worldTargetX = gameRef.current.player.x + Math.cos(joystickAngle) * splitDistance
          const worldTargetY = gameRef.current.player.y + Math.sin(joystickAngle) * splitDistance
          
          // Update both player target AND mouse world coordinates for split
          gameRef.current.player.targetX = worldTargetX
          gameRef.current.player.targetY = worldTargetY
          
          // CRITICAL: Set mouse world coordinates (this is what split() actually uses)
          gameRef.current.mouse.worldX = worldTargetX
          gameRef.current.mouse.worldY = worldTargetY
          
          // Also update screen mouse coordinates for consistency
          const screenX = worldTargetX - gameRef.current.camera.x
          const screenY = worldTargetY - gameRef.current.camera.y
          gameRef.current.mouse.x = screenX
          gameRef.current.mouse.y = screenY
          
          console.log(`🕹️ Mobile split: joystick=(${joystickPosition.x.toFixed(1)}, ${joystickPosition.y.toFixed(1)}), angle=${(joystickAngle * 180 / Math.PI).toFixed(1)}°, world=(${worldTargetX.toFixed(0)}, ${worldTargetY.toFixed(0)})`)
        } else {
          // If joystick is centered, split in current movement direction
          const currentTargetX = gameRef.current.player.targetX || gameRef.current.player.x + 100
          const currentTargetY = gameRef.current.player.targetY || gameRef.current.player.y
          
          gameRef.current.mouse.worldX = currentTargetX
          gameRef.current.mouse.worldY = currentTargetY
          gameRef.current.player.targetX = currentTargetX
          gameRef.current.player.targetY = currentTargetY
          
          console.log('🕹️ Mobile split with centered joystick - using current movement direction')
        }
      } else {
        // Desktop: Use mouse position as before
        if (e && e.clientX !== undefined && e.clientY !== undefined) {
          const canvas = canvasRef.current
          if (canvas) {
            const rect = canvas.getBoundingClientRect()
            
            // Update the game's mouse position with current cursor location
            gameRef.current.mouse.x = e.clientX - rect.left
            gameRef.current.mouse.y = e.clientY - rect.top
            
            // Convert to world coordinates
            gameRef.current.mouse.worldX = gameRef.current.mouse.x + gameRef.current.camera.x
            gameRef.current.mouse.worldY = gameRef.current.mouse.y + gameRef.current.camera.y
            
            // Update player target to match mouse position
            gameRef.current.player.targetX = gameRef.current.mouse.worldX
            gameRef.current.player.targetY = gameRef.current.mouse.worldY
            
            console.log(`🎯 Desktop split toward mouse: (${gameRef.current.mouse.worldX.toFixed(0)}, ${gameRef.current.mouse.worldY.toFixed(0)})`)
          }
        }
      }
      
      gameRef.current.split()
    }
  }

  const handleRestart = () => {
    setGameOver(false)
    setMissionTime(60)
    setScore(0)
    setMass(20)
    setEliminations(0)
    
    if (gameRef.current) {
      gameRef.current.player = {
        x: gameRef.current.world.width / 2,
        y: gameRef.current.world.height / 2,
        mass: 20,
        radius: 25,
        color: '#4A90E2',
        name: 'You',
        speed: 2,
        targetX: gameRef.current.world.width / 2,
        targetY: gameRef.current.world.height / 2
      }
      gameRef.current.generateCoins()
      gameRef.current.generateEnemies()
      gameRef.current.start()
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPlayerPosition = () => {
    if (!gameRef.current) return { x: 50, y: 50 }
    const player = gameRef.current.player
    const world = gameRef.current.world
    return {
      x: (player.x / world.width) * 100,
      y: (player.y / world.height) * 100
    }
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0" style={{ position: 'relative', margin: 0, padding: 0 }}>
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

      {/* DESKTOP HUD UI Elements - Always Visible */}
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
            onMouseDown={isMobile ? (e) => { e.target.style.color = '#00ffff' } : undefined}
            onMouseUp={isMobile ? (e) => { e.target.style.color = '#00ffff' } : undefined}
            onTouchStart={isMobile ? (e) => { e.target.style.color = '#00ffff' } : undefined}
            onTouchEnd={isMobile ? (e) => { e.target.style.color = '#00ffff' } : undefined}
          >
            {isMobile 
              ? (leaderboardExpanded ? 'Top 5' : 'Top 3')
              : '💰 Live Leaderboard'
            }
          </div>
          
          {/* Multiplayer Status Indicator */}
          {isMultiplayer && (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: wsConnection === 'connected' ? '#00ff00' : wsConnection === 'connecting' ? '#ffff00' : '#ff0000',
              padding: isMobile ? '4px 8px' : '6px 12px',
              borderRadius: '8px',
              fontSize: isMobile ? '10px' : '12px',
              fontWeight: 'bold',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: `1px solid ${wsConnection === 'connected' ? '#00ff00' : wsConnection === 'connecting' ? '#ffff00' : '#ff0000'}`
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: wsConnection === 'connected' ? '#00ff00' : wsConnection === 'connecting' ? '#ffff00' : '#ff0000',
                animation: wsConnection === 'connecting' ? 'pulse 1s infinite alternate' : 'none'
              }}></span>
              <span>
                {wsConnection === 'connected' && `🌐 MULTIPLAYER (${connectedPlayers} players)`}
                {wsConnection === 'connecting' && '🔄 CONNECTING...'}
                {wsConnection === 'error' && '❌ CONNECTION ERROR'}
                {wsConnection === 'disconnected' && '🔌 DISCONNECTED'}
              </span>
            </div>
          )}

          {/* Player Rankings - Dynamic Leaderboard */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? (leaderboardExpanded ? '2px' : '0px') : '4px', 
            marginBottom: isMobile ? '8px' : '10px',
            transition: 'all 0.3s ease'
          }}>
            {(() => {
              if (!gameRef.current) return null;
              
              // Create leaderboard data combining player and enemies
              const leaderboardData = [
                {
                  name: 'You',
                  score: score,
                  isPlayer: true
                },
                ...gameRef.current.enemies.map((enemy, index) => ({
                  name: enemy.name,
                  score: Math.floor(enemy.mass - 20), // Convert mass to score like player
                  isPlayer: false
                }))
              ];
              
              // Sort by score in descending order
              leaderboardData.sort((a, b) => b.score - a.score);
              
              // Take top 3 (compact) or top 5 (expanded) players for mobile, always 5 for desktop
              const maxPlayers = isMobile ? (leaderboardExpanded ? 5 : 3) : 5
              return leaderboardData.slice(0, maxPlayers).map((player, index) => (
                <div key={player.name} style={{ 
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
                    {isMobile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ 
                          color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#ffffff',
                          fontSize: leaderboardExpanded ? '9px' : '8px', 
                          fontWeight: '700',
                          minWidth: leaderboardExpanded ? '10px' : '8px'
                        }}>
                          #{index + 1}
                        </span>
                        <span style={{ 
                          fontSize: '5px', 
                          color: '#9ca3af', 
                          opacity: '0.7',
                          fontWeight: '500'
                        }}>Rank</span>
                      </div>
                    ) : (
                      <span style={{ 
                        color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#ffffff',
                        fontSize: '12px', 
                        fontWeight: '700',
                        minWidth: '14px'
                      }}>
                        #{index + 1}
                      </span>
                    )}
                    <span style={{ 
                      color: player.isPlayer ? '#00ffff' : '#ffffff', 
                      fontSize: isMobile ? (leaderboardExpanded ? '8px' : '7px') : '12px', 
                      fontWeight: '600',
                      maxWidth: isMobile ? (leaderboardExpanded ? '50px' : '40px') : '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {player.name}
                    </span>
                  </div>
                  {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ 
                        color: '#00ff88', 
                        fontSize: leaderboardExpanded ? '9px' : '8px', 
                        fontWeight: '700'
                      }}>
                        ${player.score}
                      </span>
                      <span style={{ 
                        fontSize: '5px', 
                        color: '#9ca3af', 
                        opacity: '0.7',
                        fontWeight: '500'
                      }}>Score</span>
                    </div>
                  ) : (
                    <span style={{ 
                      color: '#00ff88', 
                      fontSize: '12px', 
                      fontWeight: '700'
                    }}>
                      ${player.score}
                    </span>
                  )}
                </div>
              ));
            })()}
          </div>
          
          {/* Players in game counter */}
          <div style={{ 
            color: '#00ffff', 
            fontSize: isMobile ? '8px' : '10px', 
            fontWeight: '600',
            textAlign: 'center',
            paddingTop: '6px',
            borderTop: '1px solid rgba(0, 255, 255, 0.3)'
          }}>
            11 players in game
          </div>
        </div>
        
        {/* Anti-Cheat Status Indicator - Only show for cash games */}
        {(() => {
          if (typeof window === 'undefined') return null
          const urlParams = new URLSearchParams(window.location.search)
          const fee = urlParams.get('fee')
          const isCashGame = fee && parseFloat(fee) > 0
          
          if (!isCashGame) return null
          
          return (
            <div style={{ 
              position: 'fixed', 
              top: '180px', 
              left: '10px', 
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              border: '2px solid rgba(255, 69, 58, 0.6)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontFamily: '"Rajdhani", sans-serif',
              minWidth: '160px'
            }}>
              <div style={{ 
                color: '#ff453a', 
                fontSize: '12px', 
                fontWeight: '700', 
                marginBottom: '4px',
                textAlign: 'center',
                letterSpacing: '0.5px'
              }}>
                🛡️ ANTI-CHEAT ACTIVE
              </div>
              <div style={{ 
                color: '#ffffff', 
                fontSize: '10px', 
                fontWeight: '500',
                textAlign: 'center',
                lineHeight: '1.3'
              }}>
                Fair play monitoring enabled
              </div>
              <div style={{ 
                color: '#00ff88', 
                fontSize: '10px', 
                fontWeight: '600',
                textAlign: 'center',
                marginTop: '2px'
              }}>
                Status: PROTECTED
              </div>
            </div>
          )
        })()}
        
        {/* Missions Panel - Mobile Optimized */}
        {activeMissions.length > 0 && gameRef.current && gameRef.current.detectCashGame() && (
          <div style={{
            position: 'fixed',
            top: isMobile ? '50%' : '20px',
            left: '50%',
            transform: isMobile ? 'translate(-50%, -50%)' : 'translateX(-50%)',
            zIndex: isMobile ? 2000 : 1000,
            backgroundColor: isMobile ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.85)',
            border: isMobile ? '3px solid rgba(59, 130, 246, 0.8)' : '2px solid rgba(59, 130, 246, 0.6)',
            borderRadius: isMobile ? '16px' : '8px',
            padding: isMobile ? '20px 24px' : '12px 20px',
            fontFamily: '"Rajdhani", sans-serif',
            maxWidth: isMobile ? '300px' : '400px',
            minWidth: isMobile ? '280px' : '320px',
            transition: 'all 0.3s ease',
            boxShadow: isMobile ? '0 10px 40px rgba(59, 130, 246, 0.4)' : 'none'
          }}>
            {/* Mission Display */}
            {(() => {
              const currentMission = activeMissions[currentMissionIndex]
              if (!currentMission) return null
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '20px' : '16px' }}>
                  {/* Mission Icon */}
                  <div style={{
                    width: isMobile ? '50px' : '40px',
                    height: isMobile ? '50px' : '40px',
                    background: currentMission.completed ? 
                      'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)' : 
                      'linear-gradient(45deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: isMobile ? '12px' : '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '22px' : '18px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}>
                    {currentMission.icon}
                  </div>
                  
                  {/* Mission Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: isMobile ? '6px' : '4px'
                    }}>
                      <span style={{
                        color: currentMission.completed ? '#22c55e' : '#ffffff',
                        fontSize: isMobile ? '16px' : '14px',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        {currentMission.name}
                      </span>
                      <span style={{
                        color: '#FFD700',
                        fontSize: isMobile ? '14px' : '12px',
                        fontWeight: '700'
                      }}>
                        +{currentMission.reward}💰
                      </span>
                    </div>
                    
                    <div style={{
                      color: '#a0aec0',
                      fontSize: isMobile ? '13px' : '11px',
                      marginBottom: isMobile ? '8px' : '6px'
                    }}>
                      {currentMission.description}
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: isMobile ? '8px' : '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: isMobile ? '4px' : '3px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        width: `${Math.min(100, (currentMission.progress / currentMission.target) * 100)}%`,
                        height: '100%',
                        background: currentMission.completed ?
                          'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' :
                          'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: isMobile ? '4px' : '2px'
                    }}>
                      <span style={{
                        color: '#9ca3af',
                        fontSize: isMobile ? '12px' : '10px'
                      }}>
                        {currentMission.progress}/{currentMission.target}
                      </span>
                      {currentMission.completed && (
                        <span style={{
                          color: '#22c55e',
                          fontSize: isMobile ? '12px' : '10px',
                          fontWeight: '700'
                        }}>
                          ✓ COMPLETE
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Mission Counter */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '6px' : '4px'
                  }}>
                    <div style={{
                      color: '#a0aec0',
                      fontSize: isMobile ? '12px' : '10px',
                      textTransform: 'uppercase'
                    }}>
                      Mission
                    </div>
                    <div style={{
                      color: '#ffffff',
                      fontSize: isMobile ? '16px' : '14px',
                      fontWeight: '700'
                    }}>
                      {currentMissionIndex + 1}/{activeMissions.length}
                    </div>
                    <div style={{
                      color: '#FFD700',
                      fontSize: isMobile ? '12px' : '10px',
                      fontWeight: '700'
                    }}>
                      💰 {currency}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Cheating Ban Popup */}
        {cheatingBan && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ff3333',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              padding: '0',
              color: 'white',
              boxShadow: '0 0 60px rgba(255, 51, 51, 0.8)',
              fontFamily: '"Rajdhani", sans-serif',
              animation: 'pulse 2s infinite'
            }}>
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid #ff3333',
                background: 'linear-gradient(45deg, rgba(255, 51, 51, 0.2) 0%, rgba(255, 51, 51, 0.1) 100%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  background: 'linear-gradient(45deg, #ff3333 0%, #cc0000 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 20px rgba(255, 51, 51, 0.6)'
                }}>
                  🚫
                </div>
                <h2 style={{
                  color: '#ff3333',
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 15px rgba(255, 51, 51, 0.8)',
                  letterSpacing: '2px'
                }}>
                  ACCOUNT SUSPENDED
                </h2>
                <p style={{
                  color: '#ff6b6b',
                  fontSize: '16px',
                  margin: '0',
                  fontWeight: '600'
                }}>
                  Kicked for suspected cheating
                </p>
              </div>

              {/* Details */}
              <div style={{ padding: '24px' }}>
                <div style={{
                  backgroundColor: 'rgba(255, 51, 51, 0.1)',
                  border: '1px solid rgba(255, 51, 51, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    color: '#ffffff', 
                    fontSize: '18px', 
                    fontWeight: '700',
                    marginBottom: '8px'
                  }}>
                    🛡️ FAIR PLAY VIOLATION
                  </div>
                  <div style={{ 
                    color: '#e2e8f0', 
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    Our anti-cheat system detected suspicious activity including speed hacks, automation scripts, or memory manipulation attempts.
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#ff6b6b', fontSize: '24px', fontWeight: '700' }}>
                      3/3
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Violations</div>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#ff6b6b', fontSize: '24px', fontWeight: '700' }}>
                      PERMANENT
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Ban Status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexDirection: 'column'
                }}>
                  <button
                    onClick={() => window.location.href = '/'}
                    style={{
                      backgroundColor: '#4a5568',
                      border: '2px solid #718096',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 24px',
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
                      e.target.style.backgroundColor = '#718096'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#4a5568'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🏠 Return to Lobby
                  </button>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#a0aec0',
                    marginTop: '8px',
                    lineHeight: '1.4'
                  }}>
                    Contact support if you believe this is an error.<br/>
                    Email: support@turfloot.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Mobile and Desktop */}
        {gameStarted && !gameOver && (
          <div style={{
            position: 'fixed',
            // Mobile: Right side aligned with analog stick
            // Desktop: Bottom center
            bottom: isMobile 
              ? 'calc(env(safe-area-inset-bottom, 0px) + 30px)'
              : '20px',
            right: isMobile 
              ? 'calc(env(safe-area-inset-right, 0px) + 15px)'
              : 'auto',
            left: isMobile ? 'auto' : '50%',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            alignItems: 'center'
          }}>
          {/* Cash Out Button - Larger circular for mobile, rectangular for desktop */}
          <div 
            style={{
              backgroundColor: 'rgba(255, 165, 0, 0.95)',
              border: '3px solid #ff8c00',
              borderRadius: isMobile ? '50%' : '8px',
              color: '#000000',
              fontSize: isMobile ? '12px' : '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: isMobile ? '0' : '12px 24px',
              width: isMobile ? '80px' : 'auto',
              height: isMobile ? '80px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '0' : '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              textAlign: 'center',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: isMobile ? '0 4px 25px rgba(255, 165, 0, 0.7)' : '0 4px 12px rgba(255, 165, 0, 0.4)',
              minWidth: isMobile ? '75px' : '200px',
              position: 'relative',
              overflow: 'hidden',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              flexDirection: isMobile ? 'column' : 'row',
              touchAction: 'manipulation'
            }}
            onMouseOver={(e) => {
              if (!isCashingOut) {
                e.target.style.backgroundColor = 'rgba(255, 200, 50, 0.98)'
                e.target.style.transform = isMobile ? 'scale(1.08)' : 'translateY(-2px)'
                e.target.style.boxShadow = isMobile ? '0 6px 30px rgba(255, 165, 0, 0.9)' : '0 6px 20px rgba(255, 165, 0, 0.5)'
              }
            }}
            onMouseOut={(e) => {
              if (!isCashingOut) {
                e.target.style.backgroundColor = 'rgba(255, 165, 0, 0.95)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = isMobile ? '0 4px 25px rgba(255, 165, 0, 0.7)' : '0 4px 12px rgba(255, 165, 0, 0.4)'
              }
            }}
            onTouchStart={(e) => {
              if (!isMobile) return
              handleCashOut()
              e.target.style.transform = 'scale(0.95)'
              e.target.style.backgroundColor = 'rgba(255, 140, 0, 1)'
            }}
            onTouchEnd={(e) => {
              if (!isMobile) return
              e.target.style.transform = 'scale(1)'
              e.target.style.backgroundColor = 'rgba(255, 165, 0, 0.95)'
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
                transition: 'width 100ms linear',
                zIndex: 1,
                borderRadius: isMobile ? '50%' : '0'
              }} />
            )}
            
            {/* Button content */}
            <span style={{ position: 'relative', zIndex: 2, lineHeight: isMobile ? '1.2' : 'normal' }}>
              {isMobile ? (
                // Mobile: Show icon and short text
                isCashingOut ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '20px' }}>🔥</div>
                    <div style={{ fontSize: '11px', fontWeight: '600' }}>{Math.floor(cashOutProgress)}%</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '20px' }}>💰</div>
                    <div style={{ fontSize: '10px', fontWeight: '600' }}>CASH</div>
                    <div style={{ fontSize: '9px', fontWeight: '500' }}>${score}</div>
                  </div>
                )
              ) : (
                // Desktop: Show full text
                isCashingOut 
                  ? `🔥 Cashing Out... ${Math.floor(cashOutProgress)}%`
                  : `🔥 Hold E to Cash Out ($${score})`
              )}
            </span>
          </div>

          {/* Split Button - Larger circular for mobile, rectangular for desktop */}
          <div 
            onClick={(e) => handleSplit(e)}
            style={{
              backgroundColor: 'rgba(0, 100, 255, 0.9)',
              border: '3px solid #0064ff',
              borderRadius: isMobile ? '50%' : '8px',
              color: '#ffffff',
              fontSize: isMobile ? '12px' : '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: isMobile ? '0' : '12px 24px',
              width: isMobile ? '80px' : 'auto',
              height: isMobile ? '80px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '0' : '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: isMobile ? '0 4px 25px rgba(0, 100, 255, 0.7)' : '0 4px 12px rgba(0, 100, 255, 0.3)',
              flexDirection: isMobile ? 'column' : 'row',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(50, 120, 255, 0.95)'
              e.target.style.transform = isMobile ? 'scale(1.08)' : 'translateY(-2px)'
              e.target.style.boxShadow = isMobile ? '0 6px 30px rgba(0, 100, 255, 0.9)' : '0 6px 20px rgba(0, 100, 255, 0.4)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'rgba(0, 100, 255, 0.9)'
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = isMobile ? '0 4px 25px rgba(0, 100, 255, 0.7)' : '0 4px 12px rgba(0, 100, 255, 0.3)'
            }}
            onTouchStart={(e) => {
              if (!isMobile) return
              e.target.style.transform = 'scale(0.95)'
              e.target.style.backgroundColor = 'rgba(0, 80, 200, 1)'
            }}
            onTouchEnd={(e) => {
              if (!isMobile) return
              e.target.style.transform = 'scale(1)'
              e.target.style.backgroundColor = 'rgba(0, 100, 255, 0.9)'
            }}
          >
            {isMobile ? (
              // Mobile: Show icon and short text
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '20px' }}>⚡</div>
                <div style={{ fontSize: '10px', fontWeight: '600' }}>SPLIT</div>
              </div>
            ) : (
              // Desktop: Show full text
              <span>⚡ Split (Space)</span>
            )}
          </div>
          </div>
        )}

        {/* Virtual Joystick - Mobile Only (Available in ALL orientations) */}
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
              {/* Joystick inner indicator */}
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: joystickActive ? '#ffffff' : 'rgba(0, 0, 0, 0.3)',
                transition: 'background-color 0.2s ease'
              }} />
            </div>
            
            {/* Joystick instruction text */}
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

        {/* Circular Minimap - Top Right (larger and faster updates) */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          width: isMobile ? '121px' : '220px',
          height: isMobile ? '121px' : '220px'
        }}>
          {/* Minimap Container */}
          <div style={{
            width: isMobile ? '121px' : '220px',
            height: isMobile ? '121px' : '220px',
            borderRadius: '50%',
            backgroundColor: '#000000',
            border: isMobile ? '2px solid #00ff00' : '4px solid #00ff00',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isMobile ? '0 0 15px rgba(0, 255, 0, 0.6)' : '0 0 30px rgba(0, 255, 0, 0.6)'
          }}>
            {/* Green spiky border effect */}
            <div style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              right: '-3px',
              bottom: '-3px',
              borderRadius: '50%',
              background: `conic-gradient(
                #00ff00 0deg, #00dd00 10deg, #00ff00 20deg, #00ee00 30deg,
                #00ff00 40deg, #00cc00 50deg, #00ff00 60deg, #00dd00 70deg,
                #00ff00 80deg, #00ee00 90deg, #00ff00 100deg, #00dd00 110deg,
                #00ff00 120deg, #00cc00 130deg, #00ff00 140deg, #00ee00 150deg,
                #00ff00 160deg, #00dd00 170deg, #00ff00 180deg, #00cc00 190deg,
                #00ff00 200deg, #00ee00 210deg, #00ff00 220deg, #00dd00 230deg,
                #00ff00 240deg, #00cc00 250deg, #00ff00 260deg, #00ee00 270deg,
                #00ff00 280deg, #00dd00 290deg, #00ff00 300deg, #00cc00 310deg,
                #00ff00 320deg, #00ee00 330deg, #00ff00 340deg, #00dd00 350deg
              )`,
              zIndex: -1
            }} />
            
            {/* Red danger zone ring (outer area) */}
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              right: '5px',
              bottom: '5px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, transparent 75%, rgba(255, 68, 68, 0.4) 85%, rgba(255, 68, 68, 0.6) 100%)',
              zIndex: 1
            }} />
            
            {/* Player dot on minimap - using state data */}
            <div style={{
              position: 'absolute',
              width: isMobile ? '6px' : '12px',
              height: isMobile ? '6px' : '12px',
              backgroundColor: '#60a5fa',
              borderRadius: '50%',
              left: `${(minimapData.playerX / 4000) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`,
              top: `${(minimapData.playerY / 4000) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`,
              transform: 'translate(-50%, -50%)',
              border: isMobile ? '1px solid #ffffff' : '3px solid #ffffff',
              boxShadow: isMobile ? '0 0 6px rgba(96, 165, 250, 1)' : '0 0 12px rgba(96, 165, 250, 1)',
              zIndex: 10
            }} />
            
            {/* Enemy dots on minimap - using state data */}
            {minimapData.enemies.map((enemy, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: isMobile ? '3px' : '6px',
                  height: isMobile ? '3px' : '6px',
                  backgroundColor: '#ff6b6b',
                  borderRadius: '50%',
                  left: `${(enemy.x / 4000) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`,
                  top: `${(enemy.y / 4000) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: '0.9',
                  border: isMobile ? '0.5px solid #ffffff' : '1px solid #ffffff',
                  zIndex: 8
                }}
              />
            ))}
            
            {/* Coin dots on minimap - REMOVED for cleaner minimap view */}
            {/* {minimapData.coins.map((coin, i) => (...))} */}
            
            {/* Virus dots on minimap - REMOVED for cleaner minimap view */}
            {/* {minimapData.viruses.map((virus, i) => (...))} */}
            
            {/* Border spikes effect overlay */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              borderRadius: '50%',
              border: '3px solid rgba(0, 255, 0, 0.8)',
              boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.4)',
              zIndex: 3
            }} />
          </div>
        </div>

        {/* Ping Latency Meter - Bottom Left */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #333',
          borderRadius: '4px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#ccc',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: '600'
        }}>
          <div style={{ 
            color: '#00ff88', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#00ff88', 
              borderRadius: '50%' 
            }}></div>
            <span>24ms</span>
          </div>
        </div>

        {/* Player Info Panel - Bottom Right (compact) */}
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
                  }}>Net Worth</span>
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
              {/* Line 2: K/D • Streak • Time */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '9px',
                fontWeight: '600',
                padding: '2px 4px',
                background: 'rgba(107, 114, 128, 0.15)',
                borderRadius: '6px',
                border: '1px solid rgba(107, 114, 128, 0.2)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#fbbf24' }}>{eliminations}/0</span>
                  <span style={{ 
                    fontSize: '5px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>K/D</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#f87171' }}>{eliminations}</span>
                  <span style={{ 
                    fontSize: '5px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>Streak</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#60a5fa' }}>{Math.floor(timeSurvived / 60)}:{(timeSurvived % 60).toString().padStart(2, '0')}</span>
                  <span style={{ 
                    fontSize: '5px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>Time</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cash Out Success Popup */}
        {cashOutComplete && (
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
            zIndex: 999999999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ffd700',
              borderRadius: isMobile ? '8px' : '12px',
              maxWidth: isMobile ? '300px' : '500px',
              width: '90%',
              padding: '0',
              color: 'white',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.6)',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              {/* Header */}
              <div style={{
                padding: isMobile ? '12px' : '24px',
                borderBottom: '2px solid #ffd700',
                background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: isMobile ? '40px' : '70px',
                  height: isMobile ? '40px' : '70px',
                  background: 'linear-gradient(45deg, #ffd700 0%, #ffb000 100%)',
                  borderRadius: isMobile ? '8px' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '20px' : '36px',
                  margin: isMobile ? '0 auto 8px' : '0 auto 16px',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)'
                }}>
                  🏆
                </div>
                <h2 style={{
                  color: '#ffd700',
                  fontSize: isMobile ? '18px' : '28px',
                  fontWeight: '700',
                  margin: isMobile ? '0 0 4px' : '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                  letterSpacing: isMobile ? '0.5px' : '1px'
                }}>
                  Cashout Successful!
                </h2>
                <p style={{
                  color: '#e2e8f0',
                  fontSize: isMobile ? '11px' : '16px',
                  margin: '0',
                  opacity: '0.9'
                }}>
                  Congratulations! You've successfully cashed out!
                </p>
              </div>

              {/* Body Content */}
              <div style={{ padding: isMobile ? '12px' : '24px' }}>
                {/* Amount Received Section - Only for paid rooms */}
                {(() => {
                  if (typeof window === 'undefined') return null
                  const urlParams = new URLSearchParams(window.location.search)
                  const fee = urlParams.get('fee')
                  const isPaidRoom = fee && parseFloat(fee) > 0
                  
                  if (!isPaidRoom) return null
                  
                  return (
                    <div style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      padding: isMobile ? '8px' : '16px',
                      marginBottom: isMobile ? '12px' : '24px',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        color: '#ffd700', 
                        fontSize: isMobile ? '10px' : '14px', 
                        fontWeight: '600',
                        marginBottom: isMobile ? '4px' : '8px',
                        textTransform: 'uppercase'
                      }}>
                        AMOUNT RECEIVED
                      </div>
                      <div style={{ 
                        color: '#ffffff', 
                        fontSize: isMobile ? '16px' : '24px', 
                        fontWeight: '700',
                        marginBottom: isMobile ? '2px' : '4px'
                      }}>
                        ${(score * 0.54).toFixed(2)}
                      </div>
                      <div style={{ 
                        color: '#a0aec0', 
                        fontSize: isMobile ? '8px' : '12px',
                        fontWeight: '400'
                      }}>
                        {(score * 0.026).toFixed(6)} SOL
                      </div>
                    </div>
                  )
                })()}

                {/* Stats Section */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: isMobile ? '8px' : '16px',
                  marginBottom: isMobile ? '12px' : '24px'
                }}>
                  {/* Time Survived */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: isMobile ? '8px' : '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px'
                  }}>
                    <div style={{ fontSize: isMobile ? '16px' : '24px' }}>⏱️</div>
                    <div style={{ 
                      color: '#ffffff', 
                      fontSize: isMobile ? '12px' : '18px', 
                      fontWeight: '700' 
                    }}>
                      {Math.floor(timeSurvived / 60)}m {timeSurvived % 60}s
                    </div>
                    <div style={{ 
                      color: '#a0aec0', 
                      fontSize: isMobile ? '8px' : '12px', 
                      textTransform: 'uppercase' 
                    }}>
                      Time Survived
                    </div>
                  </div>
                  
                  {/* Eliminations */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: isMobile ? '8px' : '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px'
                  }}>
                    <div style={{ fontSize: isMobile ? '16px' : '24px' }}>⚔️</div>
                    <div style={{ 
                      color: '#ffffff', 
                      fontSize: isMobile ? '12px' : '18px', 
                      fontWeight: '700' 
                    }}>
                      {eliminations}
                    </div>
                    <div style={{ 
                      color: '#a0aec0', 
                      fontSize: isMobile ? '8px' : '12px', 
                      textTransform: 'uppercase' 
                    }}>
                      Eliminations
                    </div>
                  </div>
                </div>

                {/* Balance Section - Only for paid rooms */}
                {(() => {
                  if (typeof window === 'undefined') return null
                  const urlParams = new URLSearchParams(window.location.search)
                  const fee = urlParams.get('fee')
                  const isPaidRoom = fee && parseFloat(fee) > 0
                  
                  if (!isPaidRoom) return null
                  
                  return (
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      padding: isMobile ? '8px' : '16px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      marginBottom: isMobile ? '12px' : '24px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ 
                        color: '#a0aec0', 
                        fontSize: isMobile ? '8px' : '12px', 
                        marginBottom: isMobile ? '4px' : '8px',
                        textTransform: 'uppercase'
                      }}>
                        Current Balance
                      </div>
                      <div style={{ 
                        color: '#ffffff', 
                        fontSize: isMobile ? '12px' : '18px', 
                        fontWeight: '700'
                      }}>
                        ${(14.69 + (score * 0.54)).toFixed(2)} / {(0.070710 + (score * 0.026)).toFixed(6)} SOL
                      </div>
                    </div>
                  )
                })()}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: isMobile ? '8px' : '12px',
                  flexDirection: 'column'
                }}>
                  {/* Join Another Game Button */}
                  <button
                    onClick={() => {
                      setCashOutComplete(false)
                      setCashOutProgress(0)
                      setScore(0)
                      setMass(20)
                      setEliminations(0)
                      setTimeSurvived(0)
                      handleRestart()
                    }}
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
                  
                  {/* Home Button */}
                  <button
                    onClick={() => window.location.href = '/'}
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
                    BACK TO MAIN MENU
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Popup */}
        {gameOver && (
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
            zIndex: 999999999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ff4444',
              borderRadius: isMobile ? '8px' : '12px',
              maxWidth: isMobile ? '300px' : '500px',
              width: '90%',
              padding: '0',
              color: 'white',
              boxShadow: '0 0 50px rgba(255, 68, 68, 0.5)',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              {/* Header */}
              <div style={{
                padding: isMobile ? '12px' : '24px',
                borderBottom: '2px solid #ff4444',
                background: 'linear-gradient(45deg, rgba(255, 68, 68, 0.1) 0%, rgba(255, 68, 68, 0.05) 100%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: isMobile ? '40px' : '60px',
                  height: isMobile ? '40px' : '60px',
                  background: 'linear-gradient(45deg, #ff4444 0%, #cc3333 100%)',
                  borderRadius: isMobile ? '8px' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '20px' : '30px',
                  margin: isMobile ? '0 auto 8px' : '0 auto 16px'
                }}>
                  💀
                </div>
                <h2 style={{
                  color: '#ff4444',
                  fontSize: isMobile ? '20px' : '32px',
                  fontWeight: '700',
                  margin: isMobile ? '0 0 4px' : '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(255, 68, 68, 0.6)'
                }}>
                  GAME OVER
                </h2>
                <p style={{
                  color: '#e2e8f0',
                  fontSize: isMobile ? '12px' : '16px',
                  margin: '0',
                  opacity: '0.8'
                }}>
                  You have been eliminated!
                </p>
              </div>

              {/* Stats */}
              <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: isMobile ? '8px' : '16px',
                  marginBottom: isMobile ? '12px' : '24px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: isMobile ? '8px' : '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      color: '#68d391', 
                      fontSize: isMobile ? '16px' : '24px', 
                      fontWeight: '700' 
                    }}>
                      ${score}
                    </div>
                    <div style={{ 
                      color: '#a0aec0', 
                      fontSize: isMobile ? '10px' : '14px' 
                    }}>Final Score</div>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: isMobile ? '8px' : '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      color: '#60a5fa', 
                      fontSize: isMobile ? '16px' : '24px', 
                      fontWeight: '700' 
                    }}>
                      {mass} KG
                    </div>
                    <div style={{ 
                      color: '#a0aec0', 
                      fontSize: isMobile ? '10px' : '14px' 
                    }}>Final Mass</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: isMobile ? '8px' : '12px',
                  flexDirection: 'column'
                }}>
                  <button
                    onClick={handleRestart}
                    style={{
                      backgroundColor: '#68d391',
                      border: '2px solid #48bb78',
                      borderRadius: '8px',
                      color: '#1a202c',
                      fontSize: isMobile ? '14px' : '18px',
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
                      e.target.style.backgroundColor = '#48bb78'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#68d391'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    PLAY AGAIN
                  </button>
                  {/* Report Button */}
                  <button
                    onClick={() => {
                      setReportTarget('Unknown Player') // We'll set this to the actual player who eliminated them
                      setReportModalVisible(true)
                    }}
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
                    onClick={() => window.location.href = '/'}
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

        {/* Report Player Modal - Temporarily Removed */}
      </div>
    </div>
  )
}

export default AgarIOGame