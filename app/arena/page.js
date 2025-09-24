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
  
  // Selected skin from landing page customization
  const [selectedSkin, setSelectedSkin] = useState({
    id: 'default',
    name: 'Default Warrior',
    color: '#4A90E2',
    type: 'circle',
    pattern: 'solid'
  })
  
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
  }, [])

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
          if (wsRef.current && wsRef.current.sessionId) {
            wsRef.current.send("split", { targetX: worldTargetX, targetY: worldTargetY })
          }
        }
      } else {
        // Desktop: Use mouse position for split
        if (gameRef.current.mouse) {
          console.log('🎮 Desktop split toward mouse:', gameRef.current.mouse.worldX?.toFixed(1), gameRef.current.mouse.worldY?.toFixed(1))
          
          // Send split command to multiplayer server
          if (wsRef.current && wsRef.current.sessionId) {
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
        privyUserId: privyUserId,
        selectedSkin: selectedSkin // Pass skin data to server for multiplayer visibility
      })
      
      // Clear timeout if connection succeeds
      clearTimeout(connectionTimeout)
      
      wsRef.current = room
      console.log('🔗 Setting initial connection status to connected')
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

  // Send input to server with immediate client-side prediction
  const sendInput = (dx, dy) => {
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
    
    inputSequenceRef.current++
    lastInputRef.current = { dx, dy }
    
    console.log('📤 Sending input to server:', {
      sequence: inputSequenceRef.current,
      direction: { dx: dx.toFixed(3), dy: dy.toFixed(3) },
      roomId: wsRef.current.id,
      sessionId: wsRef.current.sessionId
    })
    
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
      
      console.log('✅ Input sent successfully with client prediction')
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
    constructor(canvas, inputSender, selectedSkin) {
      console.log('🎮 Initializing pure multiplayer game engine with enhanced mechanics')
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.sendInputFn = inputSender  // Store the sendInput function
      this.selectedSkin = selectedSkin || { color: '#4A90E2' } // Store the selected skin
      console.log('🎨 Using selected skin in game engine:', this.selectedSkin)
      this.running = false
      
      // World setup with circular zone system
      this.world = { width: 4000, height: 4000 }
      this.expectedSessionId = null // Will be set when we connect to Colyseus
      
      // Player setup with visual properties matching agario
      this.player = {
        x: 2000,
        y: 2000,
        mass: 25, // Fixed to match server spawn mass
        radius: Math.sqrt(25) * 3, // Proper radius calculation: √25 * 3 = 15
        color: '#4A90E2',
        name: playerName || 'Anonymous Player',
        isCurrentPlayer: true,
        speed: 2,
        targetX: 2000,
        targetY: 2000,
        spawnProtection: true,
        spawnProtectionTime: 6000,
        spawnProtectionStart: Date.now()
      }
      
      // Initialize camera centered on player to prevent jarring (matching local agario)
      this.camera = { 
        x: this.player.x - (this.canvas?.width || 800) / 2, 
        y: this.player.y - (this.canvas?.height || 600) / 2 
      }
      
      // Initialize client-side animation cache for persistent virus animations
      this.virusAnimationCache = new Map() // Persistent animation state across server updates
      this.maxPlayableRadius = 1800  // Maximum zone radius  
      this.currentPlayableRadius = 1400 // Starting zone size
      this.targetPlayableRadius = this.currentPlayableRadius
      this.zoneTransitionSpeed = 20 // Pixels per second zone change
      this.isCashGame = false // Can be set based on game mode
      console.log('🎯 Arena initialized with smooth camera and circular zone - radius:', this.currentPlayableRadius)

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
      
      // Mouse movement for non-mobile - ENHANCED RESPONSIVENESS
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
        
        if (distance > 2) { // Reduced threshold from 5 to 2 for more sensitivity
          const normalizedDx = dx / distance
          const normalizedDy = dy / distance
          
          // IMMEDIATE INPUT - no throttling for maximum responsiveness
          this.sendInputFn(normalizedDx, normalizedDy)
          
          // Reduced debug logging to prevent console spam
          if (Math.random() < 0.1) { // Only log 10% of movements
            console.log('🖱️ Mouse movement:', {
              mouseScreen: { x: mouseX.toFixed(1), y: mouseY.toFixed(1) },
              mouseWorld: { x: worldMouseX.toFixed(1), y: worldMouseY.toFixed(1) },
              player: { x: this.player.x?.toFixed(1), y: this.player.y?.toFixed(1) },
              direction: { dx: normalizedDx.toFixed(3), dy: normalizedDy.toFixed(3) },
              distance: distance.toFixed(1)
            })
          }
        }
      }
      
      // Add event listener
      window.addEventListener('mousemove', handleMouseMove)
      
      // Store reference for cleanup
      this.handleMouseMove = handleMouseMove
    }
    
    applyClientSideMovement(dx, dy) {
      // AGGRESSIVE client-side movement prediction for maximum responsiveness
      if (!this.player.x || !this.player.y) return
      
      // Use same speed calculation as server but with higher responsiveness
      const mass = this.player.mass || 25
      const baseSpeed = 6.0
      const massSpeedFactor = Math.sqrt(mass / 20)
      const dynamicSpeed = Math.max(1.5, baseSpeed / massSpeedFactor)
      
      // Much more aggressive movement for instant responsiveness
      const frameRate = 60 // Target 60fps
      const speedPerFrame = dynamicSpeed / frameRate
      const responsivenessMultiplier = 4 // Increased from 2 to 4 for more immediate response
      
      // Apply immediate movement
      this.player.x += dx * speedPerFrame * responsivenessMultiplier
      this.player.y += dy * speedPerFrame * responsivenessMultiplier
      
      // Simple boundary check to prevent going too far off
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const maxDistance = 2500 // Increased from 2000 to allow more freedom
      
      const distanceFromCenter = Math.sqrt(
        Math.pow(this.player.x - centerX, 2) + 
        Math.pow(this.player.y - centerY, 2)
      )
      
      if (distanceFromCenter > maxDistance) {
        // Clamp to boundary if too far
        const angle = Math.atan2(this.player.y - centerY, this.player.x - centerX)
        this.player.x = centerX + Math.cos(angle) * maxDistance
        this.player.y = centerY + Math.sin(angle) * maxDistance
      }
      
      console.log('⚡ Aggressive client prediction applied:', {
        position: { x: this.player.x.toFixed(1), y: this.player.y.toFixed(1) },
        speed: dynamicSpeed.toFixed(2),
        multiplier: responsivenessMultiplier,
        input: { dx: dx.toFixed(3), dy: dy.toFixed(3) }
      })
    }
    
    updateFromServer(state) {
      this.serverState = state
      
      // Find ONLY the current player based on session ID - NO FALLBACK
      let currentPlayer = state.players.find(p => p.isCurrentPlayer)
      
      if (currentPlayer) {
        console.log('🎮 Server update for player:', currentPlayer.name, 
                   'session:', currentPlayer.sessionId, 
                   'at', currentPlayer.x?.toFixed(1), currentPlayer.y?.toFixed(1))
        
        // IMPROVED SERVER RECONCILIATION for client-side prediction
        if (this.player.x && this.player.y) {
          const distance = Math.sqrt(
            Math.pow(currentPlayer.x - this.player.x, 2) + 
            Math.pow(currentPlayer.y - this.player.y, 2)
          )
          
          console.log('🔄 Position reconciliation:', {
            client: { x: this.player.x.toFixed(1), y: this.player.y.toFixed(1) },
            server: { x: currentPlayer.x.toFixed(1), y: currentPlayer.y.toFixed(1) },
            distance: distance.toFixed(1)
          })
          
          // REDUCED SERVER RECONCILIATION for better client prediction dominance
          if (distance > 300) {
            // Very large desync - snap to server position immediately
            console.log('⚡ Major desync detected - snapping to server position')
            this.player.x = currentPlayer.x
            this.player.y = currentPlayer.y
          } else if (distance > 150) {
            // Large desync - use moderate correction (reduced from 0.6 to 0.3)
            const correctionFactor = 0.3
            this.player.x += (currentPlayer.x - this.player.x) * correctionFactor
            this.player.y += (currentPlayer.y - this.player.y) * correctionFactor
          } else if (distance > 50) {
            // Medium desync - very gentle correction (reduced from 0.2 to 0.1)
            const correctionFactor = 0.1
            this.player.x += (currentPlayer.x - this.player.x) * correctionFactor
            this.player.y += (currentPlayer.y - this.player.y) * correctionFactor
          }
          // If distance <= 50, trust client prediction completely (no correction)
          
        } else {
          // First update - apply directly
          this.player.x = currentPlayer.x
          this.player.y = currentPlayer.y
        }
        
        // Update mass and score (server is always authoritative for these)
        setMass(Math.round(currentPlayer.mass) || 25)
        setScore(Math.round(currentPlayer.score) || 0)
        
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
      
      // Update camera to follow player with smooth interpolation (matching local agario)
      if (this.player.x !== undefined && this.player.y !== undefined) {
        const targetX = this.player.x - this.canvas.width / 2
        const targetY = this.player.y - this.canvas.height / 2
        
        // Use consistent smoothing matching local agario (0.2 lerp factor)
        const smoothing = 0.2
        this.camera.x += (targetX - this.camera.x) * smoothing
        this.camera.y += (targetY - this.camera.y) * smoothing
        
        // Keep camera within world bounds with extension (matching local agario)
        const boundaryExtension = 100
        this.camera.x = Math.max(-boundaryExtension, Math.min(this.world.width - this.canvas.width + boundaryExtension, this.camera.x))
        this.camera.y = Math.max(-boundaryExtension, Math.min(this.world.height - this.canvas.height + boundaryExtension, this.camera.y))
      }
      
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
      
      // Clear canvas with pure black background like local agario
      this.ctx.fillStyle = '#000000' // Pure black background to match local agario
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      // Save context for camera transform
      this.ctx.save()
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
      }
      
      this.ctx.restore()
    }
    
    drawWorldBoundary() {
      // Circular zone system matching local agario
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
      this.ctx.arc(centerX, centerY, playableRadius - 8, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor.replace(')', ', 0.3)')
      this.ctx.lineWidth = 8
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
      const endX = startX + this.canvas.width + gridSize
      const endY = startY + this.canvas.height + gridSize
      
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
      const playerSkinColor = player.skinColor || player.color || '#4A90E2'
      
      // Player glow effect for current player
      if (isCurrentPlayer) {
        this.ctx.shadowColor = playerSkinColor
        this.ctx.shadowBlur = 20
      }
      
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
      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Remove shadow for border
      this.ctx.shadowBlur = 0
      
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
    
    // Create game instance with selected skin
    const game = new MultiplayerGameEngine(canvas, sendInput, selectedSkin)
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
  }, [ready, authenticated, user, isMobile, playerName, privyUserId, selectedSkin])
  
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
              background: '#000000', // Solid black like local agario
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