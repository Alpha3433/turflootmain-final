'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Client } from 'colyseus.js'
import { usePrivy } from '@privy-io/react-auth'

const MultiplayerArena = () => {
  console.log('🎮 MULTIPLAYER ARENA - Pure Colyseus multiplayer mode with game mechanics')
  
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const wsRef = useRef(null)
  
  // Privy authentication
  const { ready, authenticated, user, login } = usePrivy()
  
  // Core game states
  const [gameReady, setGameReady] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [playerCount, setPlayerCount] = useState(0)
  const [mass, setMass] = useState(100)
  const [score, setScore] = useState(0)
  const [serverState, setServerState] = useState(null)
  const [timeSurvived, setTimeSurvived] = useState(0)
  const [eliminations, setEliminations] = useState(0)

  // Cash out system - ported from agario
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutComplete, setCashOutComplete] = useState(false)
  const cashOutIntervalRef = useRef(null)

  // Mission system - ported from agario  
  const [currency, setCurrency] = useState(0)
  const [completedMissions, setCompletedMissions] = useState([])
  const [activeMissions, setActiveMissions] = useState([])
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0)

  // Mobile detection and UI states
  const [isMobile, setIsMobile] = useState(false)
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false)
  const leaderboardTimerRef = useRef(null)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const statsTimerRef = useRef(null)
  
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
  
  // Mission definitions - ported from agario
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
  
  // Parse URL parameters and get authenticated user data
  const roomId = searchParams.get('roomId') || 'global-turfloot-arena'
  
  // Use authenticated Privy user data instead of URL parameters
  const playerName = user?.discord?.username || user?.twitter?.username || user?.google?.name || user?.wallet?.address?.slice(0, 8) || 'Player'
  const privyUserId = user?.id || null
  
  console.log('🎮 Arena parameters:')
  console.log('  - roomId:', roomId)  
  console.log('  - authenticated user:', !!user)
  console.log('  - playerName (from Privy):', playerName)
  console.log('  - privyUserId (from Privy):', privyUserId)

  // Authentication loading state
  const [authMessage, setAuthMessage] = useState('')

  // Authentication check - redirect to login if not authenticated with user feedback
  useEffect(() => {
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
  }, [ready, authenticated, user, router])

  // Handle cash out functionality - ported from agario
  const handleCashOut = () => {
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

  // Handle split functionality - ported from agario
  const handleSplit = (e) => {
    if (gameRef.current && gameReady) {
      if (isMobile) {
        // Mobile: Use joystick direction for split
        if (joystickPosition.x !== 0 || joystickPosition.y !== 0) {
          const joystickAngle = Math.atan2(joystickPosition.y, joystickPosition.x)
          const splitDistance = 300
          
          const worldTargetX = gameRef.current.player.x + Math.cos(joystickAngle) * splitDistance
          const worldTargetY = gameRef.current.player.y + Math.sin(joystickAngle) * splitDistance
          
          console.log('🎮 Mobile split toward:', worldTargetX.toFixed(1), worldTargetY.toFixed(1))
          
          // Send split command to multiplayer server
          if (wsRef.current && connectionStatus === 'connected') {
            wsRef.current.send("split", { targetX: worldTargetX, targetY: worldTargetY })
          }
        }
      } else {
        // Desktop: Use mouse position for split
        if (gameRef.current.mouse) {
          console.log('🎮 Desktop split toward mouse:', gameRef.current.mouse.worldX?.toFixed(1), gameRef.current.mouse.worldY?.toFixed(1))
          
          // Send split command to multiplayer server
          if (wsRef.current && connectionStatus === 'connected') {
            wsRef.current.send("split", { 
              targetX: gameRef.current.mouse.worldX, 
              targetY: gameRef.current.mouse.worldY 
            })
          }
        }
      }
    }
  }

  // Cash out key event handlers - ported from agario
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && !isCashingOut && !cashOutComplete && gameReady) {
        console.log('Starting cash out process with E key')
        setIsCashingOut(true)
        setCashOutProgress(0)
      }
      
      // Handle SPACE key for splitting
      if (e.key === ' ' && gameReady && gameRef.current) {
        e.preventDefault()
        console.log('SPACE pressed - attempting split')
        handleSplit(e)
      }
    }
    
    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'e' && isCashingOut) {
        console.log('Canceling cash out - E key released')
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
  }, [isCashingOut, cashOutComplete, gameReady])

  // Cash out progress interval - ported from agario
  useEffect(() => {
    if (isCashingOut && !cashOutComplete) {
      console.log('Starting cash out progress interval')
      
      cashOutIntervalRef.current = setInterval(() => {
        setCashOutProgress(prev => {
          const newProgress = prev + 2 // 2% per 100ms = 5 second duration
          
          if (newProgress >= 100) {
            console.log('Cash out completed!')
            setIsCashingOut(false)
            setCashOutComplete(true)
            clearInterval(cashOutIntervalRef.current)
            cashOutIntervalRef.current = null
            
            // Add currency based on score
            setCurrency(prevCurrency => prevCurrency + score)
            
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
    // Prevent multiple connections - cleanup any existing connection first
    if (wsRef.current) {
      console.log('🔄 Cleaning up existing connection before creating new one...')
      try {
        wsRef.current.leave()
      } catch (error) {
        console.log('⚠️ Error cleaning up existing connection:', error)
      }
      wsRef.current = null
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
      
      console.log('🎯 Joining arena room:', roomId)
      console.log('🎯 Player details - Name:', playerName, 'PrivyID:', privyUserId)
      
      // Add timeout to connection attempt
      const connectionTimeout = setTimeout(() => {
        console.error('❌ Connection timeout after 15 seconds')
        setConnectionStatus('failed')
      }, 15000)
      
      const room = await client.joinOrCreate("arena", {
        roomName: roomId,
        playerName: playerName,
        privyUserId: privyUserId
      })
      
      // Clear timeout if connection succeeds
      clearTimeout(connectionTimeout)
      
      wsRef.current = room
      setConnectionStatus('connected')
      console.log('✅ Connected to dedicated arena:', room.id)
      console.log('🎮 DEDICATED Session ID (should stay stable):', room.sessionId)
      
      // Set expected session ID in game engine for camera stability
      if (gameRef.current) {
        gameRef.current.expectedSessionId = room.sessionId
        console.log('🎯 Set expected session ID in game engine:', room.sessionId)
      }
      
      // Handle connection errors
      room.onError((code, message) => {
        console.error('❌ Colyseus room error:', code, message)
        setConnectionStatus('failed')
      })
      
      room.onLeave((code) => {
        console.log('👋 Left room with code:', code)
        setConnectionStatus('disconnected')
      })
      
      // Handle server state updates
      room.onStateChange((state) => {
        console.log('🎮 Arena state update - Players:', state.players?.size || 0, 'Connection:', connectionStatus)
        setPlayerCount(state.players?.size || 0)
        
        // Ensure connection status is set to connected when receiving state updates
        if (connectionStatus !== 'connected') {
          console.log('🔗 Setting connection status to connected (state update received)')
          setConnectionStatus('connected')
        }
        
        // Convert MapSchema to usable format
        const gameState = {
          players: [],
          coins: [],
          viruses: [],
          worldSize: state.worldSize || 4000
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
      console.error('❌ Colyseus connection failed:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        endpoint: process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT
      })
      setConnectionStatus('failed')
      
      // Retry connection after 5 seconds with exponential backoff
      setTimeout(() => {
        console.log('🔄 Retrying connection in 5 seconds...')
        connectToColyseus()
      }, 5000)
    }
  }

  // Send input to server - enhanced debugging
  const sendInput = (dx, dy) => {
    if (!wsRef.current || connectionStatus !== 'connected') {
      console.log('❌ Cannot send input - connection status:', connectionStatus)
      return
    }
    
    inputSequenceRef.current++
    lastInputRef.current = { dx, dy }
    
    console.log('📤 Sending input to server:', {
      sequence: inputSequenceRef.current,
      direction: { dx: dx.toFixed(3), dy: dy.toFixed(3) },
      connectionStatus
    })
    
    try {
      wsRef.current.send("input", {
        seq: inputSequenceRef.current,
        dx: dx,
        dy: dy
      })
      console.log('✅ Input sent successfully')
    } catch (error) {
      console.error('❌ Failed to send input:', error)
    }
  }

  // Virtual joystick handlers for mobile - matching agario exactly
  const handleJoystickStart = (e) => {
    e.preventDefault()
    if (!isMobile) return
    
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
    
    console.log('🕹️ Joystick Ended - Stopping Movement')
    
    setJoystickActive(false)
    setJoystickPosition({ x: 0, y: 0 })
    
    // Send stop input to server
    sendInput(0, 0)
  }

  // Pure multiplayer game engine - updated to match agario visual features
  class MultiplayerGameEngine {
    constructor(canvas, inputSender) {
      console.log('🎮 Initializing pure multiplayer game engine with enhanced mechanics')
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.sendInputFn = inputSender  // Store the sendInput function
      this.running = false
      
      // World setup
      this.world = { width: 4000, height: 4000 }
      this.camera = { x: 0, y: 0 }
      this.expectedSessionId = null // Will be set when we connect to Colyseus

      // Player setup with visual properties matching agario
      this.player = {
        x: 2000,
        y: 2000,
        mass: 100,
        radius: 25,
        color: '#4A90E2',
        name: playerName || 'Anonymous Player',
        speed: 2,
        targetX: 2000,
        targetY: 2000,
        spawnProtection: true,
        spawnProtectionTime: 6000,
        spawnProtectionStart: Date.now()
      }

      this.serverState = null
      this.lastUpdate = Date.now()
      this.gameStartTime = Date.now()
      
      this.bindEvents()
      this.setupMouse()
    }

    setupMouse() {
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 }
      
      const updateMousePosition = (e) => {
        if (!this.canvas) return
        
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - rect.left
        this.mouse.y = e.clientY - rect.top
        
        // Convert screen coordinates to world coordinates - CORRECTED
        this.mouse.worldX = this.camera.x + this.mouse.x
        this.mouse.worldY = this.camera.y + this.mouse.y
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
      
      // Mouse movement for non-mobile - FIXED
      const handleMouseMove = (e) => {
        if (isMobile || !this.canvas) return
        
        const rect = this.canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        // Convert screen coordinates to world coordinates - CORRECTED FORMULA
        const worldMouseX = this.camera.x + mouseX
        const worldMouseY = this.camera.y + mouseY
        
        // Calculate direction toward mouse cursor
        const dx = worldMouseX - this.player.x
        const dy = worldMouseY - this.player.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 5) { // Minimum distance threshold
          const normalizedDx = dx / distance
          const normalizedDy = dy / distance
          
          // Send normalized input to multiplayer server
          this.sendInputFn(normalizedDx, normalizedDy)
          
          // Debug logging
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
    
    updateFromServer(state) {
      this.serverState = state
      
      // Find ONLY the current player based on session ID - NO FALLBACK
      let currentPlayer = state.players.find(p => p.isCurrentPlayer)
      
      if (currentPlayer) {
        // Verify this is actually our session to prevent camera jumping
        if (currentPlayer.sessionId === this.expectedSessionId) {
          console.log('🎮 Camera following authenticated player:', currentPlayer.name, 
                     'session:', currentPlayer.sessionId, 
                     'at', currentPlayer.x?.toFixed(1), currentPlayer.y?.toFixed(1))
          
          // Smooth position updates to prevent camera jumping
          if (this.player.x && this.player.y) {
            const distance = Math.sqrt(
              Math.pow(currentPlayer.x - this.player.x, 2) + 
              Math.pow(currentPlayer.y - this.player.y, 2)
            )
            
            // If the distance is large, apply directly (avoid desync)
            // If small, smooth interpolate to prevent jitter
            if (distance > 100) {
              this.player.x = currentPlayer.x
              this.player.y = currentPlayer.y
            } else {
              const lerpFactor = 0.3
              this.player.x += (currentPlayer.x - this.player.x) * lerpFactor
              this.player.y += (currentPlayer.y - this.player.y) * lerpFactor
            }
          } else {
            // First update - apply directly
            this.player.x = currentPlayer.x
            this.player.y = currentPlayer.y
          }
          
          // Update mass and score
          setMass(Math.round(currentPlayer.mass) || 100)
          setScore(Math.round(currentPlayer.score) || 0)
        } else {
          console.log('⚠️ Session ID mismatch - ignoring player update for session:', 
                     currentPlayer.sessionId, 'expected:', this.expectedSessionId)
        }
      } else {
        console.log('⚠️ Current player not found in state - camera remains stationary')
        // Do NOT use any fallback - camera should not jump to other players
      }
    }
    
    start() {
      this.running = true
      console.log('🎮 Multiplayer game engine started with enhanced mechanics')
    }
    
    stop() {
      this.running = false
      console.log('🎮 Multiplayer game engine stopped')
      
      // Clean up event listeners
      if (this.handleMouseMove) {
        window.removeEventListener('mousemove', this.handleMouseMove)
      }
      
      if (this.updateMousePosition && this.canvas) {
        this.canvas.removeEventListener('mousemove', this.updateMousePosition)
      }
    }
    
    update() {
      if (!this.running) return
      
      const deltaTime = (Date.now() - this.lastUpdate) / 1000
      this.lastUpdate = Date.now()
      
      // Update time survived
      const currentTimeSurvived = Math.floor((Date.now() - this.gameStartTime) / 1000)
      setTimeSurvived(currentTimeSurvived)
      
      // Update camera to follow player
      this.camera.x = this.player.x - this.canvas.width / 2
      this.camera.y = this.player.y - this.canvas.height / 2
      
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
    
    render() {
      if (!this.ctx || !this.running) return
      
      // Clear canvas with darker background matching 2nd image
      this.ctx.fillStyle = '#1a1a1a' // Dark background like 2nd image
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      // Save context for camera transform
      this.ctx.save()
      this.ctx.translate(-this.camera.x, -this.camera.y)
      
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
      }
      
      this.ctx.restore()
    }
    
    drawWorldBoundary() {
      // Draw richer background matching 2nd image style
      const gridSize = 25 // Smaller grid for denser pattern
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      this.ctx.lineWidth = 1
      
      // Vertical lines - denser grid
      for (let x = 0; x <= this.world.width; x += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(x, 0)
        this.ctx.lineTo(x, this.world.height)
        this.ctx.stroke()
      }
      
      // Horizontal lines - denser grid  
      for (let y = 0; y <= this.world.height; y += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(0, y)
        this.ctx.lineTo(this.world.width, y)
        this.ctx.stroke()
      }
      
      // World border - bright green like 2nd image
      this.ctx.strokeStyle = '#00ff00'
      this.ctx.lineWidth = 8
      this.ctx.strokeRect(0, 0, this.world.width, this.world.height)
      
      // Add inner border glow
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)'
      this.ctx.lineWidth = 20
      this.ctx.strokeRect(-10, -10, this.world.width + 20, this.world.height + 20)
    }
    
    drawPlayer(player, isCurrentPlayer = false) {
      const playerRadius = player.radius || 25
      
      // Player glow effect for current player
      if (isCurrentPlayer) {
        this.ctx.shadowColor = '#00BFFF'
        this.ctx.shadowBlur = 20
      }
      
      // Player circle with gradient
      const gradient = this.ctx.createRadialGradient(
        player.x, player.y, 0,
        player.x, player.y, playerRadius
      )
      
      if (isCurrentPlayer) {
        gradient.addColorStop(0, '#00BFFF')  // Bright blue center
        gradient.addColorStop(0.7, '#0080FF') // Medium blue
        gradient.addColorStop(1, '#0040AA')   // Dark blue edge
      } else {
        gradient.addColorStop(0, '#FF6B6B')  // Red center for enemies
        gradient.addColorStop(0.7, '#FF4444') // Medium red
        gradient.addColorStop(1, '#CC2222')   // Dark red edge
      }
      
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Remove shadow for border
      this.ctx.shadowBlur = 0
      
      // Enhanced border
      this.ctx.strokeStyle = isCurrentPlayer ? '#FFFFFF' : '#DDDDDD'
      this.ctx.lineWidth = isCurrentPlayer ? 4 : 3
      this.ctx.stroke()
      
      // Player name with better contrast
      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.font = `bold ${Math.max(12, playerRadius * 0.5)}px "Rajdhani", sans-serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 3
      this.ctx.strokeText(player.name || 'Player', player.x, player.y)
      this.ctx.fillText(player.name || 'Player', player.x, player.y)
    }
    
    drawCoin(coin) {
      // Enhanced coin rendering matching 2nd image density
      const coinSize = coin.radius || 6
      
      // Main coin body with gradient
      const gradient = this.ctx.createRadialGradient(coin.x, coin.y, 0, coin.x, coin.y, coinSize)
      gradient.addColorStop(0, '#FFD700')
      gradient.addColorStop(0.7, '#FFA500')
      gradient.addColorStop(1, '#FF8C00')
      
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, coinSize, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Bright outline for visibility
      this.ctx.strokeStyle = '#FFFF00'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
      
      // Inner sparkle
      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.beginPath()
      this.ctx.arc(coin.x - coinSize * 0.3, coin.y - coinSize * 0.3, coinSize * 0.2, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    drawVirus(virus) {
      // Enhanced virus rendering matching 2nd image - green spiky circles
      const virusRadius = virus.radius || 50
      const spikes = 12
      
      // Main virus body - bright green
      this.ctx.fillStyle = '#00FF00'
      this.ctx.beginPath()
      
      // Draw spiky outline
      for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2
        const isSpike = i % 2 === 0
        const radius = isSpike ? virusRadius * 1.3 : virusRadius * 0.8
        
        const x = virus.x + Math.cos(angle) * radius
        const y = virus.y + Math.sin(angle) * radius
        
        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }
      
      this.ctx.closePath()
      this.ctx.fill()
      
      // Virus border - darker green
      this.ctx.strokeStyle = '#00AA00'
      this.ctx.lineWidth = 4
      this.ctx.stroke()
      
      // Inner pattern - darker core
      this.ctx.fillStyle = '#008800'
      this.ctx.beginPath()
      this.ctx.arc(virus.x, virus.y, virusRadius * 0.5, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Virus "eyes" or spots
      this.ctx.fillStyle = '#004400'
      for (let i = 0; i < 3; i++) {
        const spotAngle = (i / 3) * Math.PI * 2
        const spotX = virus.x + Math.cos(spotAngle) * virusRadius * 0.25
        const spotY = virus.y + Math.sin(spotAngle) * virusRadius * 0.25
        
        this.ctx.beginPath()
        this.ctx.arc(spotX, spotY, virusRadius * 0.08, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
  }

  // Initialize game ONLY when authenticated
  useEffect(() => {
    // Wait for Privy to be ready and user to be authenticated
    if (!ready || !authenticated || !user?.id) {
      console.log('🔒 Waiting for authentication...', { ready, authenticated, userId: user?.id })
      return
    }
    
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
    
    // Create game instance
    const game = new MultiplayerGameEngine(canvas, sendInput)
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
      console.log('🧹 Cleaning up arena connection...')
      game.stop()
      window.removeEventListener('resize', handleResize)
      if (wsRef.current) {
        console.log('🔌 Disconnecting from Colyseus...')
        wsRef.current.leave()
        wsRef.current = null
      }
      
      // Cleanup mobile styles
      if (isMobile) {
        document.body.classList.remove('mobile-game-active')
      }
    }
  }, [ready, authenticated, user, isMobile, playerName, privyUserId])
  
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
            color: connectionStatus === 'connected' ? '#00ff00' : connectionStatus === 'connecting' ? '#ffff00' : '#ff0000',
            padding: isMobile ? '4px 8px' : '6px 12px',
            borderRadius: '8px',
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px solid ${connectionStatus === 'connected' ? '#00ff00' : connectionStatus === 'connecting' ? '#ffff00' : '#ff0000'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected' ? '#00ff00' : connectionStatus === 'connecting' ? '#ffff00' : '#ff0000',
              animation: connectionStatus === 'connecting' ? 'pulse 1s infinite alternate' : 'none'
            }}></span>
            <span>
              {connectionStatus === 'connected' && `🌐 MULTIPLAYER (${playerCount} players)`}
              {connectionStatus === 'connecting' && '🔄 CONNECTING...'}
              {connectionStatus === 'failed' && '❌ CONNECTION ERROR'}
              {connectionStatus === 'disconnected' && '🔌 DISCONNECTED'}
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
              const leaderboardData = serverState.players
                ? serverState.players
                    .filter(player => player.alive)
                    .map((player, playerIndex) => ({
                      name: player.name || 'Anonymous',
                      score: Math.floor(player.score || 0),
                      isPlayer: player.isCurrentPlayer,
                      sessionId: player.sessionId || `player_${playerIndex}`,
                      uniqueKey: `${player.sessionId || playerIndex}_${player.name || 'anonymous'}`
                    }))
                    .sort((a, b) => b.score - a.score)
                : []
              
              // Take top 3 (compact) or top 5 (expanded) players for mobile, always 5 for desktop
              const maxPlayers = isMobile ? (leaderboardExpanded ? 5 : 3) : 5
              return leaderboardData.slice(0, maxPlayers).map((player, index) => (
                <div key={player.uniqueKey} style={{ 
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

        {/* Enhanced Stats Panel - Bottom Left with compact mobile view */}
        <div 
          onClick={handleStatsToggle}
          style={{ 
            position: 'fixed', 
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 5px)' : '10px', 
            right: isMobile ? 'calc(env(safe-area-inset-right, 0px) + 5px)' : '10px', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: isMobile ? '1px solid rgba(139, 69, 19, 0.4)' : '2px solid rgba(139, 69, 19, 0.4)',
            borderRadius: isMobile ? '8px' : '6px',
            padding: isMobile ? (statsExpanded ? '6px' : '4px') : '10px',
            minWidth: isMobile ? (statsExpanded ? '120px' : '100px') : '140px',
            maxWidth: isMobile ? (statsExpanded ? '140px' : '120px') : '160px',
            fontFamily: '"Rajdhani", sans-serif',
            cursor: isMobile ? 'pointer' : 'default',
            userSelect: 'none',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Stats Header */}
          <div style={{ 
            color: '#d97706', 
            fontSize: isMobile ? (statsExpanded ? '11px' : '10px') : '13px', 
            fontWeight: '700', 
            marginBottom: isMobile ? (statsExpanded ? '6px' : '3px') : '8px',
            textAlign: 'center',
            letterSpacing: '0.2px',
            textShadow: '0 0 8px rgba(217, 119, 6, 0.6)'
          }}>
            {isMobile 
              ? (statsExpanded ? '📊 Player Stats' : '📊')
              : '📊 Player Stats'
            }
          </div>
          
          {/* Stats Content */}
          {(!isMobile || statsExpanded) && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '4px' : '6px',
              transition: 'all 0.3s ease'
            }}>
              {/* Line 1: Score • Mass */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: '600',
                padding: isMobile ? '3px 6px' : '4px 8px',
                background: 'rgba(34, 197, 94, 0.15)',
                borderRadius: '6px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ 
                    color: '#22c55e',
                    textShadow: '0 0 6px rgba(34, 197, 94, 0.8)'
                  }}>{score}</span>
                  <span style={{ 
                    fontSize: '6px', 
                    color: '#9ca3af', 
                    opacity: '0.7',
                    fontWeight: '500'
                  }}>Score</span>
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
                fontSize: isMobile ? '9px' : '10px',
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

        {/* Circular Minimap - Top Right */}
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
            backgroundColor: '#000000',
            border: isMobile ? '2px solid #00ff00' : '4px solid #00ff00',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isMobile ? '0 0 15px rgba(0, 255, 0, 0.6)' : '0 0 30px rgba(0, 255, 0, 0.6)'
          }}>
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
                  left: `${(enemy.x / 4000) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`,
                  top: `${(enemy.y / 4000) * (isMobile ? 115 : 210) + (isMobile ? 3 : 5)}px`,
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
            
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              borderRadius: '50%',
              border: '3px solid rgba(0, 255, 0, 0.8)',
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(0, 255, 0, 0.1) 10%, transparent 20%, rgba(0, 255, 0, 0.1) 30%, transparent 40%, rgba(0, 255, 0, 0.1) 50%, transparent 60%, rgba(0, 255, 0, 0.1) 70%, transparent 80%, rgba(0, 255, 0, 0.1) 90%, transparent 100%)',
              animation: 'minimapRotate 20s linear infinite',
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
              e.target.style.transform = 'translateX(-50%) scale(1.05)'
            }
          }}
          onMouseOut={(e) => {
            if (!isCashingOut) {
              e.target.style.backgroundColor = 'rgba(255, 165, 0, 0.95)'
              e.target.style.transform = 'translateX(-50%) scale(1)'
            }
          }}
          onTouchStart={(e) => {
            if (!isMobile) return
            handleCashOut()
            e.target.style.transform = 'translateX(-50%) scale(0.95)'
          }}
          onTouchEnd={(e) => {
            if (!isMobile) return
            e.target.style.transform = 'translateX(-50%) scale(1)'
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
            e.target.style.transform = 'translateX(-50%) scale(1.05)'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 100, 255, 0.9)'
            e.target.style.transform = 'translateX(-50%) scale(1)'
          }}
          onTouchStart={(e) => {
            if (!isMobile) return
            e.target.style.transform = 'translateX(-50%) scale(0.95)'
          }}
          onTouchEnd={(e) => {
            if (!isMobile) return
            e.target.style.transform = 'translateX(-50%) scale(1)'
          }}
        >
          <span style={{ 
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
          }}>
            {isMobile ? '✂️ Split' : '✂️ Split (Space)'}
          </span>
        </div>

        {/* Exit Arena Button - Top Right */}
        <button
          onClick={() => router.push('/')}
          style={{
            position: 'fixed',
            top: '20px',
            right: isMobile ? '20px' : '250px', // Adjust for minimap
            zIndex: 1001,
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: isMobile ? '8px 12px' : '10px 16px',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 'bold',
            fontFamily: '"Rajdhani", sans-serif',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#b91c1c'
            e.target.style.transform = 'translateY(-1px)'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#dc2626'
            e.target.style.transform = 'translateY(0)'
          }}
        >
          Exit Arena
        </button>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          100% { opacity: 0.5; }
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