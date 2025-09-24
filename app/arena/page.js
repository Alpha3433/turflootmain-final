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

  // Authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      console.log('❌ User not authenticated - redirecting to login')
      router.push('/')
      return
    }
    
    if (ready && authenticated && !user?.id) {
      console.log('❌ User authenticated but no user ID - redirecting to home')
      router.push('/')
      return
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

  // Sync cash out visuals with game engine rendering
  useEffect(() => {
    if (gameRef.current?.updateGameStates) {
      gameRef.current.updateGameStates({
        isCashingOut,
        cashOutProgress,
        cashOutComplete
      })
    }
  }, [isCashingOut, cashOutProgress, cashOutComplete])

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

  // Colyseus connection and input handling  
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
      
      // Create dedicated client instance for this arena  
      const client = new Client(process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud')
      
      console.log('🎯 Joining arena room:', roomId)
      console.log('🎯 Player details - Name:', playerName, 'PrivyID:', privyUserId)
      
      const room = await client.joinOrCreate("arena", {
        roomName: roomId,
        playerName: playerName,
        privyUserId: privyUserId,
        forceNew: true, // Force creation of new session
        timestamp: Date.now() // Add timestamp for uniqueness
      })
      
      wsRef.current = room
      setConnectionStatus('connected')
      console.log('✅ Connected to dedicated arena:', room.id)
      console.log('🎮 DEDICATED Session ID (should stay stable):', room.sessionId)
      
      // Set expected session ID in game engine for camera stability
      if (gameRef.current) {
        gameRef.current.expectedSessionId = room.sessionId
        console.log('🎯 Set expected session ID in game engine:', room.sessionId)
      }
      
      // Handle server state updates
      room.onStateChange((state) => {
        console.log('🎮 Arena state update - Players:', state.players?.size || 0)
        setPlayerCount(state.players?.size || 0)
        
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
          
          // Check for duplicate player names
          const playerNames = gameState.players.map(p => p.name)
          const duplicateNames = playerNames.filter((name, index) => playerNames.indexOf(name) !== index)
          if (duplicateNames.length > 0) {
            console.warn('⚠️ DUPLICATE PLAYER NAMES DETECTED:', duplicateNames)
            console.warn('⚠️ All players:', gameState.players.map(p => `${p.name}(${p.sessionId})`))
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
      setConnectionStatus('failed')
    }
  }

  // Send input to server - matching agario input handling
  const sendInput = (dx, dy) => {
    if (!wsRef.current || connectionStatus !== 'connected') return
    
    inputSequenceRef.current++
    lastInputRef.current = { dx, dy }
    
    try {
      wsRef.current.send("input", {
        seq: inputSequenceRef.current,
        dx: dx,
        dy: dy
      })
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
    constructor(canvas) {
      console.log('🎮 Initializing pure multiplayer game engine with enhanced mechanics')
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
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

      // Match Agar.io dynamic zone defaults
      this.isCashGame = false
      this.realPlayerCount = 0
      this.basePlayableRadius = 800
      this.maxPlayableRadius = 1800
      this.currentPlayableRadius = 1800
      this.targetPlayableRadius = 1800

      // Local game state mirrors for visual elements
      this.gameStates = {
        isCashingOut: false,
        cashOutProgress: 0,
        cashOutComplete: false
      }
      this.updateGameStates = (updates = {}) => {
        this.gameStates = { ...this.gameStates, ...updates }
      }

      // Maintain caches for animations and helper collections
      this.enemies = []
      this.coins = []
      this.viruses = []
      this.playerPieces = []
      this.virusCache = new Map()

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
        
        // Convert screen coordinates to world coordinates
        this.mouse.worldX = this.mouse.x - this.canvas.width / 2 + this.camera.x + this.player.x
        this.mouse.worldY = this.mouse.y - this.canvas.height / 2 + this.camera.y + this.player.y
      }
      
      this.canvas.addEventListener('mousemove', updateMousePosition)
      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault()
        if (e.touches.length > 0) {
          updateMousePosition(e.touches[0])
        }
      })
    }

    bindEvents() {
      if (typeof window === 'undefined') return
      
      // Mouse movement for non-mobile
      const handleMouseMove = (e) => {
        if (isMobile || !this.canvas) return
        
        const rect = this.canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        // Calculate world position
        const worldMouseX = mouseX - this.canvas.width / 2 + this.camera.x + this.player.x
        const worldMouseY = mouseY - this.canvas.height / 2 + this.camera.y + this.player.y
        
        // Calculate direction toward mouse
        const dx = worldMouseX - this.player.x
        const dy = worldMouseY - this.player.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0.1) {
          const normalizedDx = dx / distance
          const normalizedDy = dy / distance
          sendInput(normalizedDx, normalizedDy)
        }
      }
      
      window.addEventListener('mousemove', handleMouseMove)
    }
    
    updateFromServer(state) {
      const clonedPlayers = state.players ? state.players.map(player => ({ ...player })) : []
      const mergedViruses = state.viruses
        ? state.viruses.map(virus => {
            const previous = this.virusCache.get(virus.id) || {}
            const merged = { ...previous, ...virus }
            this.virusCache.set(virus.id, merged)
            return merged
          })
        : []

      this.serverState = {
        ...state,
        players: clonedPlayers,
        coins: state.coins ? state.coins.map(coin => ({ ...coin })) : [],
        viruses: mergedViruses
      }

      // Find ONLY the current player based on session ID - NO FALLBACK
      const currentPlayer = clonedPlayers.find(p => p.isCurrentPlayer)

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

          this.player.mass = currentPlayer.mass || this.player.mass
          this.player.radius = currentPlayer.radius || this.player.radius
          this.player.name = currentPlayer.name || this.player.name
          this.player.color = currentPlayer.color || this.player.color
          this.player.sessionId = currentPlayer.sessionId

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

      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

      this.ctx.save()
      this.ctx.translate(-this.camera.x, -this.camera.y)

      this.drawGrid()
      this.drawWorldBoundary()

      if (this.serverState) {
        const { coins = [], viruses = [], players = [] } = this.serverState

        coins.forEach(coin => this.drawCoin(coin))
        viruses.forEach(virus => this.drawVirus(virus))
        players.forEach(player => {
          if (player && player.alive !== false) {
            const isMainPlayer = player.isCurrentPlayer || player.sessionId === this.expectedSessionId
            this.drawPlayer(player, isMainPlayer)
          }
        })
      }

      this.ctx.restore()
    }

    drawGrid() {
      this.ctx.strokeStyle = '#808080'
      this.ctx.lineWidth = 1
      this.ctx.globalAlpha = 0.3

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

      this.ctx.globalAlpha = 1.0
    }

    drawWorldBoundary() {
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius

      this.ctx.fillStyle = '#1a0000'
      this.ctx.fillRect(0, 0, this.world.width, this.world.height)

      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()

      let zoneColor = '#00ff00'
      if (Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        zoneColor = '#ffff00'
      }
      if (this.isCashGame) {
        zoneColor = this.targetPlayableRadius > this.currentPlayableRadius ? '#00ffff' : '#0080ff'
      }

      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor
      this.ctx.lineWidth = 8
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor.replace(')', ', 0.6)')
      this.ctx.lineWidth = 16
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor.replace(')', ', 0.3)')
      this.ctx.lineWidth = 24
      this.ctx.stroke()

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

    drawPlayer(player, isCurrentPlayer = false) {
      const radius = player.radius || Math.max(15, Math.sqrt(player.mass || 20) * 3)
      const fillColor = player.color || (isCurrentPlayer ? '#4A90E2' : '#FF6B6B')

      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, radius, 0, Math.PI * 2)
      this.ctx.fillStyle = fillColor
      this.ctx.fill()

      if (player.botType) {
        if (player.botType === 'aggressive') {
          this.ctx.strokeStyle = '#ff4444'
          this.ctx.lineWidth = 4
          this.ctx.setLineDash([8, 4])
        } else if (player.botType === 'defensive') {
          this.ctx.strokeStyle = '#44ff44'
          this.ctx.lineWidth = 5
          this.ctx.setLineDash([])
        } else if (player.botType === 'fast') {
          this.ctx.strokeStyle = '#ffff44'
          this.ctx.lineWidth = 3
          this.ctx.setLineDash([4, 2, 4, 2])
        } else {
          this.ctx.strokeStyle = '#4444ff'
          this.ctx.lineWidth = 3
          this.ctx.setLineDash([6, 3])
        }

        if (player.behavior === 'hunting_player') {
          this.ctx.shadowColor = '#ff0000'
          this.ctx.shadowBlur = 8
        } else if (player.behavior === 'fleeing') {
          this.ctx.shadowColor = '#ffff00'
          this.ctx.shadowBlur = 6
        } else if (player.behavior === 'hunting_enemy') {
          this.ctx.shadowColor = '#ff8800'
          this.ctx.shadowBlur = 5
        }

        this.ctx.stroke()
        this.ctx.shadowBlur = 0
        this.ctx.setLineDash([])
      } else {
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
      }

      if (player.spawnProtection) {
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, radius + 8, 0, Math.PI * 2)
        this.ctx.strokeStyle = '#3B82F6'
        this.ctx.lineWidth = 4
        this.ctx.setLineDash([10, 5])
        this.ctx.stroke()
        this.ctx.setLineDash([])

        const time = Date.now() / 1000
        const pulseIntensity = Math.sin(time * 4) * 0.3 + 0.7
        this.ctx.globalAlpha = pulseIntensity

        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, radius + 6, 0, Math.PI * 2)
        this.ctx.strokeStyle = '#60A5FA'
        this.ctx.lineWidth = 2
        this.ctx.stroke()

        this.ctx.globalAlpha = 1.0
      }

      const isMainPlayer = isCurrentPlayer || (this.expectedSessionId && player.sessionId === this.expectedSessionId)
      if (this.gameStates && this.gameStates.isCashingOut && this.gameStates.cashOutProgress > 0 && isMainPlayer) {
        const ringRadius = radius + 8
        const progressAngle = (this.gameStates.cashOutProgress / 100) * Math.PI * 2

        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius, 0, Math.PI * 2)
        this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)'
        this.ctx.lineWidth = 6
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + progressAngle)
        this.ctx.strokeStyle = '#00ff00'
        this.ctx.lineWidth = 6
        this.ctx.lineCap = 'round'
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius + 2, -Math.PI / 2, -Math.PI / 2 + progressAngle)
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'
        this.ctx.lineWidth = 3
        this.ctx.lineCap = 'round'
        this.ctx.stroke()

        const time = Date.now() / 1000
        const pulseIntensity = Math.sin(time * 6) * 0.3 + 0.8
        this.ctx.globalAlpha = pulseIntensity

        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, ringRadius - 2, -Math.PI / 2, -Math.PI / 2 + progressAngle)
        this.ctx.strokeStyle = '#66ff66'
        this.ctx.lineWidth = 3
        this.ctx.lineCap = 'round'
        this.ctx.stroke()

        this.ctx.globalAlpha = 1.0
      }

      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 14px Arial'
      this.ctx.textAlign = 'center'

      let displayName = player.name || 'Player'
      if (player.botType) {
        const botEmojis = {
          aggressive: '⚔️',
          defensive: '🛡️',
          fast: '⚡',
          balanced: '⚖️'
        }
        displayName = `${botEmojis[player.botType] || ''} ${displayName}`.trim()
      }

      this.ctx.fillText(displayName, player.x, player.y - radius - 15)

      const eyeRadius = Math.max(2, radius * 0.12)
      const eyeOffset = radius * 0.35

      this.ctx.beginPath()
      this.ctx.arc(player.x - eyeOffset, player.y - eyeOffset * 0.3, eyeRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()

      this.ctx.beginPath()
      this.ctx.arc(player.x + eyeOffset, player.y - eyeOffset * 0.3, eyeRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()

      if (player.botType && player.behavior && player.behavior !== 'exploring') {
        this.ctx.fillStyle = '#ffff88'
        this.ctx.font = '10px Arial'
        this.ctx.textAlign = 'center'

        const behaviorText = {
          hunting_player: '🎯 HUNTING YOU!',
          fleeing: '💨 FLEEING',
          hunting_enemy: '🔍 HUNTING',
          hunting_coins: '🪙 COIN HUNT'
        }[player.behavior] || ''

        if (behaviorText) {
          this.ctx.fillText(behaviorText, player.x, player.y - radius - 35)
        }
      }
    }

    drawCoin(coin) {
      const radius = coin.radius || 8

      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, radius, 0, Math.PI * 2)
      this.ctx.fillStyle = coin.color || '#FFD700'
      this.ctx.fill()

      this.ctx.strokeStyle = '#FFB000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      this.ctx.fillStyle = '#000000'
      this.ctx.font = 'bold 12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('$', coin.x, coin.y + 4)
    }

    drawVirus(virus) {
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

      virus.currentRotation += virus.rotationSpeed
      virus.pulsePhase += virus.pulseSpeed
      virus.spikeWavePhase += virus.spikeWaveSpeed

      const pulseScale = 1 + Math.sin(virus.pulsePhase) * 0.1
      const glowPulse = 0.5 + Math.sin(virus.pulsePhase * 1.5) * 0.3

      this.ctx.save()
      this.ctx.translate(virus.x, virus.y)
      this.ctx.rotate((virus.currentRotation * Math.PI) / 180)
      this.ctx.scale(pulseScale, pulseScale)

      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, virus.radius + 20)
      const safeColorShift = isNaN(virus.colorShift) ? 0 : virus.colorShift

      gradient.addColorStop(0, `hsl(120, 100%, ${50 + safeColorShift}%)`)
      gradient.addColorStop(0.6, '#00FF41')
      gradient.addColorStop(1, '#00AA00')

      this.ctx.shadowColor = '#00FF41'
      const safeGlowIntensity = isNaN(virus.glowIntensity) ? 0.5 : virus.glowIntensity
      this.ctx.shadowBlur = 15 * safeGlowIntensity * glowPulse
      this.ctx.shadowOffsetX = 0
      this.ctx.shadowOffsetY = 0

      this.ctx.beginPath()
      for (let i = 0; i < virus.spikes; i++) {
        const baseAngle = (i / virus.spikes) * Math.PI * 2
        const spikeWave = Math.sin(virus.spikeWavePhase + i * 0.5) * 3
        const spikeLength = virus.radius + 12 + spikeWave
        const innerRadius = virus.radius - 3

        const outerX = Math.cos(baseAngle) * spikeLength
        const outerY = Math.sin(baseAngle) * spikeLength

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

      this.ctx.fillStyle = gradient
      this.ctx.fill()

      this.ctx.strokeStyle = `rgba(0, 170, 0, ${0.8 + glowPulse * 0.2})`
      this.ctx.lineWidth = 2 + Math.sin(virus.pulsePhase * 2) * 0.5
      this.ctx.stroke()

      this.ctx.shadowBlur = 0

      const coreRadius = virus.radius - 15
      const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius)
      coreGradient.addColorStop(0, `rgba(0, 255, 65, ${0.8 + glowPulse * 0.2})`)
      coreGradient.addColorStop(1, '#005500')

      this.ctx.beginPath()
      this.ctx.arc(0, 0, coreRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = coreGradient
      this.ctx.fill()

      const eyeRadius = Math.max(4, virus.radius * 0.1)
      const eyeOffset = virus.radius * 0.35

      this.ctx.fillStyle = 'rgba(0, 80, 0, 0.9)'
      this.ctx.beginPath()
      this.ctx.arc(-eyeOffset, -eyeOffset * 0.2, eyeRadius, 0, Math.PI * 2)
      this.ctx.arc(eyeOffset, -eyeOffset * 0.2, eyeRadius, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.fillStyle = 'rgba(0, 255, 65, 0.5)'
      this.ctx.beginPath()
      this.ctx.arc(0, eyeOffset * 0.3, eyeRadius, 0, Math.PI * 2)
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
    
    // Create game instance
    const game = new MultiplayerGameEngine(canvas)
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
            🔒 Authentication Required
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '30px',
            maxWidth: '600px',
            lineHeight: '1.5'
          }}>
            Arena matches are restricted to authenticated Privy users only.<br/>
            This prevents duplicate players and ensures fair gameplay.
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

        {/* Cash Out Button - ported from agario */}
        <div 
          style={{
            position: 'fixed',
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 120px)' : '20px',
            left: isMobile ? 'calc(env(safe-area-inset-left, 0px) + 20px)' : '20px',
            zIndex: 1000,
            backgroundColor: isCashingOut ? 'rgba(255, 140, 0, 0.95)' : 'rgba(255, 165, 0, 0.95)',
            border: '3px solid #ff8c00',
            borderRadius: isMobile ? '12px' : '8px',
            color: '#ffffff',
            fontSize: isMobile ? '11px' : '16px',
            fontWeight: '700',
            cursor: cashOutComplete ? 'default' : 'pointer',
            padding: isMobile ? '10px 16px' : '12px 24px',
            minWidth: isMobile ? '120px' : '200px',
            textAlign: 'center',
            fontFamily: '"Rajdhani", sans-serif',
            userSelect: 'none',
            opacity: cashOutComplete ? 0.6 : 1,
            pointerEvents: cashOutComplete ? 'none' : 'auto',
            boxShadow: isCashingOut 
              ? '0 0 20px rgba(255, 165, 0, 0.8)' 
              : (isMobile ? '0 4px 25px rgba(255, 165, 0, 0.7)' : '0 4px 12px rgba(255, 165, 0, 0.4)'),
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (!isCashingOut && !cashOutComplete) {
              e.target.style.backgroundColor = 'rgba(255, 140, 0, 1)'
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = isMobile ? '0 6px 30px rgba(255, 165, 0, 0.8)' : '0 6px 20px rgba(255, 165, 0, 0.6)'
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
                ? (isCashingOut ? `🔥 ${Math.floor(cashOutProgress)}%` : `🔥 $${score}`)
                : (isCashingOut 
                  ? `🔥 Cashing Out... ${Math.floor(cashOutProgress)}%`
                  : `🔥 Hold E to Cash Out ($${score})`)
            }
          </span>
        </div>

        {/* Split Button - ported from agario */}
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
            position: 'fixed',
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 120px)' : '20px',
            right: isMobile ? 'calc(env(safe-area-inset-right, 0px) + 20px)' : '20px',
            zIndex: 1000,
            fontFamily: '"Rajdhani", sans-serif',
            userSelect: 'none',
            boxShadow: isMobile ? '0 4px 25px rgba(0, 100, 255, 0.6)' : '0 4px 12px rgba(0, 100, 255, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 80, 200, 1)'
            e.target.style.transform = 'scale(1.05)'
            e.target.style.boxShadow = isMobile ? '0 6px 30px rgba(0, 100, 255, 0.8)' : '0 6px 20px rgba(0, 100, 255, 0.6)'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 100, 255, 0.9)'
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = isMobile ? '0 4px 25px rgba(0, 100, 255, 0.6)' : '0 4px 12px rgba(0, 100, 255, 0.4)'
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
          <span style={{ 
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
          }}>
            {isMobile ? '✂️' : '✂️ Split (SPACE)'}
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
