'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGameSettings } from '@/components/providers/GameSettingsProvider'
import { usePrivy } from '@privy-io/react-auth'
import { io } from 'socket.io-client'

const AgarIOGame = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const socketRef = useRef(null)
  const router = useRouter()
  const { settings } = useGameSettings()  // Add settings hook
  const { user, getAccessToken } = usePrivy() // Add Privy auth
  
  // Ping monitoring function
  const measurePing = async () => {
    try {
      const startTime = Date.now()
      await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache' 
      })
      const endTime = Date.now()
      const latency = endTime - startTime
      setPing(latency)
    } catch (error) {
      // If ping fails, set high ping value to indicate connection issues
      setPing(999)
    }
  }
  const [gameStats, setGameStats] = useState({ netWorth: 100, rank: 1, players: 1, kills: 0, deaths: 0, streak: 0 })
  const [showCashOutSuccess, setShowCashOutSuccess] = useState(false)
  const [cashOutDetails, setCashOutDetails] = useState(null)
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameResult, setGameResult] = useState('')
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [killFeed, setKillFeed] = useState([])
  const [floatingTexts, setFloatingTexts] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [showControls, setShowControls] = useState(true)
  const [ping, setPing] = useState(0)
  const [autoCashOutTriggered, setAutoCashOutTriggered] = useState(false) // Flag to prevent multiple auto cash outs
  
  // Enhanced game features
  const [coinAnimations, setCoinAnimations] = useState([]) // For animated coin pickups
  const [killStreakAnnouncements, setKillStreakAnnouncements] = useState([])
  const [currentMission, setCurrentMission] = useState(null)
  const [missionProgress, setMissionProgress] = useState(0)
  const [liveEventFeed, setLiveEventFeed] = useState([])
  const [territoryGlowIntensity, setTerritoryGlowIntensity] = useState(0.3)
  const [initialLobbyFee, setInitialLobbyFee] = useState(100) // Track the entry fee for this lobby
  
  // Player customization state
  const [playerCustomization, setPlayerCustomization] = useState({
    skin: 'default_blue',
    hat: null,
    trail: 'default_sparkle',
    face: 'normal_eyes'
  })
  
  // Game session tracking for statistics
  const [gameSession, setGameSession] = useState({
    startTime: null,
    endTime: null,
    kills: 0,
    survived: false,
    cashedOut: false,
    earnings: 0,
    playTimeSeconds: 0,
    coinsCollected: 0 // Track coins/orbs collected
  })

  // Time alive tracking
  const [timeAlive, setTimeAlive] = useState(0) // Time in seconds since game started

  // Real-time multiplayer state
  const [isConnected, setIsConnected] = useState(false)
  const [roomId, setRoomId] = useState(null)
  const [realPlayers, setRealPlayers] = useState(new Map())
  const [gameMode, setGameMode] = useState('free') // 'free' or 'cash'
  const [entryFee, setEntryFee] = useState(0)
  const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(false)
  const [connectedPlayers, setConnectedPlayers] = useState(0)
  const [gameServerFood, setGameServerFood] = useState([])
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  useEffect(() => {
    // Handle page visibility (exit game when tab is not visible)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Tab hidden - removing player from game')
        if (gameRef.current && !isGameOver) {
          gameRef.current.cleanup()
          setIsGameOver(true)
          setGameResult('🚪 Left Game - Tab Closed')
        }
        // Disconnect from multiplayer if connected
        if (socketRef.current) {
          socketRef.current.disconnect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Reset auto cash out flag for fresh game
    setAutoCashOutTriggered(false)
    
    // Check if user is authenticated and determine game mode
    if (user && getAccessToken) {
      // Check URL parameters to see if this is a cash game
      const urlParams = new URLSearchParams(window.location.search)
      const paramFee = parseFloat(urlParams.get('fee')) || 0
      const paramMode = urlParams.get('mode') || 'free'
      
      // Only use multiplayer for cash games, free games use bots for testing
      if (paramMode === 'cash' && paramFee > 0) {
        console.log('💰 Cash game detected - initializing multiplayer')
        // Try multiplayer first, but fallback to offline if authentication fails
        initializeMultiplayer().catch((error) => {
          console.error('🔄 Multiplayer failed, falling back to offline mode:', error)
          // Initialize offline demo game with bots as fallback
          initializeGame(false) // false = offline mode with bots
        })
      } else {
        console.log('🆓 Free game detected - using bots for testing')
        // Free games always use bots for immediate testing
        initializeGame(false) // false = offline mode with bots
      }
    } else {
      // Initialize offline demo game with bots
      console.log('🤖 Starting offline demo mode - user not authenticated')
      initializeGame(false) // false = offline mode with bots
    }
    
    // Hide controls after 5 seconds
    const controlsTimer = setTimeout(() => {
      setShowControls(false)
    }, 5000)
    
    // Start ping monitoring
    measurePing() // Initial measurement
    const pingInterval = setInterval(measurePing, 2000) // Measure every 2 seconds
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(controlsTimer)
      clearInterval(pingInterval)
      if (gameRef.current) {
        gameRef.current.cleanup()
      }
      // Clean up Socket.IO connection
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [user, getAccessToken]) // Add dependencies

  const handlePlayAgain = () => {
    // Charge the same entry fee as when they joined the lobby
    console.log(`🎮 Player wants to play again - charging entry fee: $${initialLobbyFee}`)
    
    // Reset all game states
    setShowCashOutSuccess(false)
    setCashOutDetails(null)
    setIsGameOver(false)
    setGameResult('')
    setIsCashingOut(false)
    setCashOutProgress(0)
    setCurrentMission(null)
    setMissionProgress(0)
    
    // Note: In a real implementation, you would:
    // 1. Check if user has sufficient balance
    // 2. Deduct the entry fee from their wallet
    // 3. Update the backend with the transaction
    // For now, we'll restart the game immediately
    
    // Restart the game with the same parameters
    window.location.reload() // Simple restart - in production you'd restart more elegantly
  }

  // Helper function to get player's customized appearance
  const getPlayerSkinColor = () => {
    switch (playerCustomization.skin) {
      case 'golden_snake':
        return { 
          fillStyle: 'linear-gradient(45deg, #FCD34D 0%, #F59E0B 50%, #EA580C 100%)',
          solidColor: '#F59E0B',
          hasSpecialEffect: true
        }
      case 'neon_green':
        return { 
          fillStyle: 'linear-gradient(45deg, #86EFAC 0%, #22C55E 50%, #16A34A 100%)',
          solidColor: '#22C55E',
          hasSpecialEffect: false
        }
      case 'fire_red':
        return { 
          fillStyle: 'linear-gradient(45deg, #FCA5A5 0%, #EF4444 50%, #DC2626 100%)',
          solidColor: '#EF4444',
          hasSpecialEffect: false
        }
      case 'ice_blue':
        return { 
          fillStyle: 'linear-gradient(45deg, #BFDBFE 0%, #60A5FA 50%, #3B82F6 100%)',
          solidColor: '#60A5FA',
          hasSpecialEffect: false
        }
      case 'shadow_black':
        return { 
          fillStyle: 'linear-gradient(45deg, #4B5563 0%, #6B21C8 50%, #000000 100%)',
          solidColor: '#6B21C8',
          hasSpecialEffect: true
        }
      default: // default_blue
        return { 
          fillStyle: '#00f5ff',
          solidColor: '#00f5ff',
          hasSpecialEffect: false
        }
    }
  }

  const getPlayerFaceStyle = () => {
    return playerCustomization.face || 'normal_eyes'
  }

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
        console.log('Agario: Loaded player customization:', customizationData)
      }
    } catch (error) {
      console.error('Agario: Failed to load customization:', error)
      // Reset to defaults if there's an error
      setPlayerCustomization({
        skin: 'default_blue',
        hat: null,
        trail: 'default_sparkle',
        face: 'normal_eyes'
      })
    }
  }, [])

  // Handle keyboard input for cash-out
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && !isCashingOut && gameRef.current?.game?.player?.alive) {
        startCashOut()
      }
    }

    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'e' && isCashingOut) {
        cancelCashOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isCashingOut, settings])

  const startCashOut = () => {
    setIsCashingOut(true)
    setCashOutProgress(0)
    
    // Use quickCashOut setting: 3s if enabled, 5s if disabled
    const cashOutDuration = settings.quickCashOut ? 3000 : 5000 // 3s or 5s in milliseconds
    const increment = 100 / (cashOutDuration / 100) // Calculate increment per 100ms
    
    const cashOutTimer = setInterval(() => {
      setCashOutProgress(prev => {
        if (prev >= 100) {
          clearInterval(cashOutTimer)
          completeCashOut()
          return 100
        }
        return prev + increment
      })
    }, 100)

    gameRef.current.cashOutTimer = cashOutTimer
  }

  const cancelCashOut = () => {
    setIsCashingOut(false)
    setCashOutProgress(0)
    if (gameRef.current?.cashOutTimer) {
      clearInterval(gameRef.current.cashOutTimer)
    }
  }

  // Function to update user statistics after a game session
  const updateUserStatistics = async (wonGame = false) => {
    // Calculate session statistics
    const sessionData = {
      ...gameSession,
      endTime: gameSession.endTime || Date.now(),
      playTimeSeconds: gameSession.startTime ? Math.floor((Date.now() - gameSession.startTime) / 1000) : 0,
      survived: wonGame || gameSession.cashedOut,
      won: wonGame
    }

    console.log('📊 Updating user statistics:', sessionData)

    try {
      const response = await fetch('/api/users/stats/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData,
          userId: 'current-user', // TODO: Get actual user ID from auth
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ User statistics updated successfully:', result)
      } else {
        console.error('❌ Failed to update user statistics:', response.status)
      }
    } catch (error) {
      console.error('❌ Error updating user statistics:', error)
    }
  }

  const completeCashOut = () => {
    const netWorth = gameRef.current?.game?.player?.netWorth || 0
    const platformFee = netWorth * 0.10 // 10% platform fee
    const finalAmount = netWorth - platformFee
    
    // Store cash out details for success popup
    setCashOutDetails({
      originalAmount: netWorth,
      platformFee: platformFee,
      finalAmount: finalAmount,
      kills: gameRef.current?.game?.player?.kills || 0,
      streak: gameRef.current?.game?.player?.streak || 0,
      playTime: gameSession.startTime ? Math.floor((Date.now() - gameSession.startTime) / 1000) : 0
    })
    
    // Show success popup
    setShowCashOutSuccess(true)
    
    addFloatingText(`Banked: $${Math.floor(finalAmount)}`, gameRef.current?.game?.player?.x || 0, gameRef.current?.game?.player?.y || 0, '#00ff00')
    addFloatingText(`-$${Math.floor(platformFee)} fee`, gameRef.current?.game?.player?.x || 0, (gameRef.current?.game?.player?.y || 0) - 25, '#ff4444')
    
    // Add to kill feed and live events
    const cashOutMessage = `You cashed out $${Math.floor(finalAmount)} (after 10% fee)`
    addToKillFeed(cashOutMessage)
    addLiveEvent(`Player cashed out $${Math.floor(finalAmount)}`, 'cashout')
    
    // Update session tracking - successful cash out (win)
    setGameSession(prev => ({
      ...prev,
      cashedOut: true,
      survived: true,
      earnings: finalAmount,
      endTime: Date.now(),
      playTimeSeconds: prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : 0
    }))

    // Update user statistics for successful cash out
    updateUserStatistics(true) // true = won/cashed out successfully

    setIsCashingOut(false)
    setCashOutProgress(0)
  }

  const addToKillFeed = (message) => {
    const newFeedItem = {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }
    
    setKillFeed(prev => [newFeedItem, ...prev.slice(0, 4)]) // Keep last 5 items
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setKillFeed(prev => prev.filter(item => item.id !== newFeedItem.id))
    }, 5000)
  }

  const addFloatingText = (text, x, y, color = '#ffff00') => {
    const newText = {
      id: Date.now(),
      text,
      x,
      y,
      color,
      life: 1.0,
      startY: y
    }
    
    setFloatingTexts(prev => [...prev, newText])
    
    // Remove after animation
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== newText.id))
    }, 2000)
  }

  // Enhanced functions for new features
  const addCoinAnimation = (x, y) => {
    const animation = {
      id: Date.now() + Math.random(),
      x,
      y,
      scale: 1,
      rotation: 0,
      particles: [],
      life: 1.0
    }
    
    // Generate particle burst
    for (let i = 0; i < 8; i++) {
      animation.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 1.0,
        color: Math.random() > 0.5 ? '#FFD700' : '#00FFFF'
      })
    }
    
    setCoinAnimations(prev => [...prev, animation])
    
    // Remove after animation
    setTimeout(() => {
      setCoinAnimations(prev => prev.filter(item => item.id !== animation.id))
    }, 1000)
  }

  const addKillStreakAnnouncement = (streak) => {
    let message = ''
    let color = '#FF6B6B'
    
    if (streak === 2) {
      message = 'Double Loot!'
      color = '#FFD93D'
    } else if (streak === 3) {
      message = 'Triple Threat!'
      color = '#6BCF7F'
    } else if (streak === 5) {
      message = 'Loot King!'
      color = '#4ECDC4'
    } else if (streak >= 10) {
      message = 'LEGENDARY!'
      color = '#FF3366'
    }
    
    if (message) {
      const announcement = {
        id: Date.now(),
        message,
        color,
        scale: 1,
        life: 1.0
      }
      
      setKillStreakAnnouncements(prev => [...prev, announcement])
      
      setTimeout(() => {
        setKillStreakAnnouncements(prev => prev.filter(item => item.id !== announcement.id))
      }, 3000)
    }
  }

  const generateMission = () => {
    const missions = [
      { type: 'collect', target: 20, duration: 30000, reward: 50, description: 'Collect 20 coins in 30 seconds' },
      { type: 'survive', target: 60000, duration: 60000, reward: 100, description: 'Survive for 60 seconds' },
      { type: 'eliminate', target: 3, duration: 45000, reward: 150, description: 'Eliminate 3 players in 45 seconds' },
      { type: 'mass', target: 500, duration: 40000, reward: 75, description: 'Reach 500 mass in 40 seconds' }
    ]
    
    const mission = missions[Math.floor(Math.random() * missions.length)]
    mission.id = Date.now()
    mission.startTime = Date.now()
    mission.progress = 0
    
    console.log('🎯 Generated new mission:', mission.description, 'Duration:', mission.duration/1000, 'seconds')
    
    setCurrentMission(mission)
    setMissionProgress(0)
    
    // Auto-fail mission after duration if not completed
    setTimeout(() => {
      setCurrentMission(prev => {
        // Only fail if mission is still active and not completed
        if (prev && prev.id === mission.id && prev.progress < prev.target) {
          console.log('🎯 Mission failed:', prev.description)
          addFloatingText('Mission Failed!', gameRef.current?.game?.player?.x || 0, gameRef.current?.game?.player?.y || 0, '#FF4444')
          addToKillFeed(`Mission failed: ${prev.description}`)
          return null
        }
        return prev
      })
    }, mission.duration)
  }

  const completeMission = (mission) => {
    if (gameRef.current?.game?.player) {
      gameRef.current.game.player.netWorth += mission.reward
      addFloatingText(`Mission Complete! +${mission.reward} SP`, gameRef.current.game.player.x, gameRef.current.game.player.y - 60, '#00FF00')
      addToKillFeed(`Mission completed: ${mission.description} (+${mission.reward} SP)`)
    }
    setCurrentMission(null)
  }

  const addLiveEvent = (message, type = 'info') => {
    const event = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    }
    
    setLiveEventFeed(prev => [event, ...prev.slice(0, 4)]) // Keep only 5 most recent events
    
    // Remove after 10 seconds
    setTimeout(() => {
      setLiveEventFeed(prev => prev.filter(item => item.id !== event.id))
    }, 10000)
  }

  // Real-time multiplayer initialization
  // Token refresh mechanism to prevent random auth errors
  const refreshAuthToken = async () => {
    if (!user) return false
    
    try {
      console.log('🔄 Refreshing auth token...')
      
      // Try to get fresh Privy token
      const privyToken = await getAccessToken()
      if (privyToken) {
        // Try to exchange for our API token
        const response = await fetch('/api/auth/privy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            privy_user: user
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.token) {
            localStorage.setItem('auth_token', data.token)
            console.log('✅ Auth token refreshed successfully')
            return true
          }
        }
        
        // Fallback: use Privy token directly
        localStorage.setItem('auth_token', privyToken)
        console.log('✅ Using Privy token as fallback')
        return true
      }
    } catch (error) {
      console.warn('⚠️ Token refresh failed:', error.message)
    }
    
    return false
  }

  // Time alive tracking timer
  useEffect(() => {
    let timeAliveInterval = null
    
    // Start the timer when game is running
    if (!isGameOver && gameRef.current?.game?.running) {
      timeAliveInterval = setInterval(() => {
        setTimeAlive(prev => prev + 1)
      }, 1000) // Update every second
    }
    
    // Clear interval on game over or cleanup
    return () => {
      if (timeAliveInterval) {
        clearInterval(timeAliveInterval)
      }
    }
  }, [isGameOver])

  // Reset time alive when game restarts
  useEffect(() => {
    if (!isGameOver) {
      setTimeAlive(0) // Reset timer on new game
    }
  }, [isGameOver])

  // Format time alive for display (MM:SS)
  const formatTimeAlive = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  useEffect(() => {
    if (!user) return
    
    const tokenCheckInterval = setInterval(async () => {
      const storedToken = localStorage.getItem('auth_token')
      if (!storedToken) return
      
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]))
        const currentTime = Date.now() / 1000
        
        // Refresh token if expiring in next 10 minutes
        if (payload.exp && payload.exp < currentTime + 600) {
          console.log('⏰ Token expiring soon, refreshing...')
          await refreshAuthToken()
        }
      } catch (e) {
        console.warn('⚠️ Token check failed, refreshing:', e.message)
        await refreshAuthToken()
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(tokenCheckInterval)
  }, [user])

  const initializeMultiplayer = async () => {
    try {
      console.log('🔗 Initializing multiplayer connection...')
      
      // For authenticated users, try to get our API token first, then fall back to Privy token
      let authToken = localStorage.getItem('auth_token')
      
      // If no stored token but user is authenticated, try to get fresh token
      if (!authToken && user) {
        console.log('🔄 No stored token found, trying to get fresh token...')
        try {
          // Try to get Privy access token as fallback
          const privyToken = await getAccessToken()
          if (privyToken) {
            authToken = privyToken
            console.log('✅ Using Privy token as fallback')
          }
        } catch (e) {
          console.log('⚠️ Could not get Privy token:', e.message)
        }
      }
      
      if (!authToken) {
        console.error('❌ No auth token available - user not authenticated')
        setGameResult('Authentication required to play')
        setIsGameOver(true)
        return
      }
      
      // Validate token format but be more lenient with expiration
      let tokenValid = true
      let tokenInfo = null
      
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]))
        const currentTime = Date.now() / 1000
        
        tokenInfo = {
          userId: payload.userId || payload.sub,
          privyId: payload.privyId,
          email: payload.email,
          username: payload.username,
          exp: payload.exp,
          expiresAt: new Date((payload.exp || 0) * 1000)
        }
        
        // Check if token is expired, but allow some grace period
        if (payload.exp && payload.exp < currentTime - 300) { // 5 minute grace period
          console.warn('⚠️ Auth token expired, but continuing with graceful degradation')
          tokenValid = false
        } else if (payload.exp && payload.exp < currentTime + 600) { // Warn if expiring in 10 minutes
          console.warn('⚠️ Auth token expiring soon:', tokenInfo.expiresAt)
        }
        
        console.log('✅ Auth token analyzed:', tokenInfo)
      } catch (e) {
        console.warn('⚠️ Could not parse token, but continuing:', e.message)
        tokenValid = false
      }
      
      // If token is invalid but user is still authenticated with Privy, continue anyway
      if (!tokenValid && user) {
        console.log('🔄 Token invalid but user authenticated - continuing with degraded auth')
      }
      
      // Parse URL parameters for room settings
      const urlParams = new URLSearchParams(window.location.search)
      const paramRoomId = urlParams.get('roomId') || `room_${Date.now()}`
      const paramMode = urlParams.get('mode') || 'free'
      const paramFee = parseFloat(urlParams.get('fee')) || 0
      
      setRoomId(paramRoomId)
      setGameMode(paramMode)
      setEntryFee(paramFee)
      
      console.log('🎮 Game settings:', { roomId: paramRoomId, mode: paramMode, fee: paramFee })
      
      // Connect to Socket.IO server
      const socket = io({
        auth: {
          token: authToken,
          fallback: true // Allow graceful degradation
        },
        transports: ['websocket', 'polling']
      })
      
      socketRef.current = socket
      
      // Socket event handlers
      socket.on('connect', () => {
        console.log('✅ Connected to game server:', socket.id)
        setIsConnected(true)
        
        // Join game room
        socket.emit('join_room', {
          roomId: paramRoomId,
          mode: paramMode,
          fee: paramFee,
          token: authToken,
          fallback: true
        })
      })
      
      socket.on('disconnect', () => {
        console.log('❌ Disconnected from game server')
        setIsConnected(false)
        if (!isGameOver) {
          setGameResult('Disconnected from server')
          setIsGameOver(true)
        }
      })
      
      socket.on('joined', (data) => {
        console.log('🎯 Joined room:', data)
        setIsWaitingForPlayers(true)
        
        // Set player as ready to start
        setTimeout(() => {
          socket.emit('player_ready', { token: authToken })
          setIsPlayerReady(true)
        }, 1000)
      })
      
      socket.on('room_info', (roomInfo) => {
        console.log('📊 Room info update:', roomInfo)
        setConnectedPlayers(roomInfo.playerCount)
        
        if (roomInfo.running && isWaitingForPlayers) {
          setIsWaitingForPlayers(false)
        }
      })
      
      socket.on('match_start', (data) => {
        console.log('🏁 Match started!', data)
        setIsWaitingForPlayers(false)
        
        // Initialize local game with multiplayer mode
        initializeGame(true) // true = multiplayer mode
      })
      
      socket.on('game_state', (gameState) => {
        // Update real players from server
        const playersMap = new Map()
        gameState.players.forEach(player => {
          if (player.id !== socket.id) { // Don't include our own player
            playersMap.set(player.id, {
              id: player.id,
              x: player.x,
              y: player.y,
              mass: player.mass,
              nickname: player.nickname,
              alive: player.alive,
              color: `hsl(${(player.id.charCodeAt(0) * 137) % 360}, 60%, 50%)` // Consistent color
            })
          }
        })
        setRealPlayers(playersMap)
        
        // Update food from server
        setGameServerFood(gameState.food || [])
      })
      
      socket.on('match_end', (data) => {
        console.log('🏆 Match ended:', data)
        setIsGameOver(true)
        
        if (data.winnerId === socket.id) {
          setGameResult(`🎉 Victory! You won the match!`)
          if (data.mode === 'cash' && data.fee > 0) {
            // Handle cash prize
            console.log('💰 Prize won:', data)
          }
        } else {
          setGameResult(`💔 Game Over - Winner: ${data.winnerName}`)
        }
      })
      
      socket.on('player_eaten', (data) => {
        console.log('💀 You were eaten by:', data.eatenBy)
        setIsGameOver(true)
        setGameResult(`💀 Eaten by ${data.eatenBy}`)
      })
      
      socket.on('auth_error', (error) => {
        console.error('🔐 Authentication error:', error)
        setGameResult('Authentication failed')
        setIsGameOver(true)
      })
      
      socket.on('join_error', (error) => {
        console.error('🚫 Join error:', error)
        setGameResult(`Failed to join game: ${error.message}`)
        setIsGameOver(true)
      })
      
      socket.on('insufficient_balance', (data) => {
        console.error('💸 Insufficient balance:', data)
        setGameResult(`Insufficient balance. Required: $${data.required}`)
        setIsGameOver(true)
      })
      
    } catch (error) {
      console.error('❌ Multiplayer initialization failed:', error)
      setGameResult('Failed to connect to multiplayer server')
      setIsGameOver(true)
    }
  }

  const initializeGame = (isMultiplayer = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Initialize game session tracking
    setGameSession({
      startTime: Date.now(),
      endTime: null,
      kills: 0,
      survived: false,
      cashedOut: false,
      earnings: 0,
      playTimeSeconds: 0
    })
    
    console.log('🎮 Game session started - tracking statistics')

    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    // Game configuration
    const config = {
      worldSize: 3750, // Increased by 25% (was 3000, now 3750)
      orbCount: 600, // Increased even more - 50% more orbs from 400
      virusCount: 25, // Virus cells scattered around the map
      botCount: 15,
      baseSpeed: 648, // Additional 60% increase (405 * 1.6 = 648)
      startingNetWorth: 100,
      startingMass: 10,
      orbMassValue: 4.5, // Tripled from 1.5 to 4.5 - much bigger growth per orb
      massPerDollar: 0.8,
      bountyThreshold: 500,
      killReward: 50,
      platformFee: 0.10,
      virusRadius: 25,
      virusSplitThreshold: 35, // Mass threshold to split when hitting virus
      virusHideThreshold: 25 // Mass threshold to hide inside virus
    }

    // Game state
    const game = {
      player: {
        x: 0,
        y: 0,
        mass: config.startingMass,
        netWorth: config.startingNetWorth,
        dir: { x: 0, y: 0 },
        alive: true,
        name: 'You',
        kills: 0,
        deaths: 0,
        streak: 0,
        isBounty: false,
        spawnProtected: true, // New spawn protection
        spawnTime: Date.now(), // Track when spawned
        lastNetWorth: config.startingNetWorth
      },
      bots: [],
      orbs: [],
      viruses: [], // Add virus array
      camera: { x: 0, y: 0, zoom: 1.2 }, // Much more zoomed in
      running: true,
      bounties: new Set(),
      isMultiplayer: isMultiplayer // Add multiplayer flag to game state
    }

    // Initialize orbs (mass pickup, not money) - only spawn within circular boundary
    for (let i = 0; i < config.orbCount; i++) {
      let x, y, distance
      const maxRadius = (config.worldSize / 2) - 20 // Add 20 unit margin from edge
      // Keep generating random positions until we find one inside the circle with margin
      do {
        x = (Math.random() - 0.5) * config.worldSize
        y = (Math.random() - 0.5) * config.worldSize
        distance = Math.sqrt(x * x + y * y)
      } while (distance > maxRadius) // Only accept positions well within circular boundary
      
      game.orbs.push({
        id: i,
        x: x,
        y: y,
        massValue: config.orbMassValue,
        color: '#FFD700' // Fixed gold color - no more random flickering
      })
    }
    
    // Initialize viruses (green spiky obstacles) - only spawn within circular boundary
    for (let i = 0; i < config.virusCount; i++) {
      let x, y, distance
      const maxRadius = (config.worldSize / 2) - 30 // Add 30 unit margin from edge for viruses
      // Keep generating random positions until we find one inside the circle with margin
      do {
        x = (Math.random() - 0.5) * config.worldSize
        y = (Math.random() - 0.5) * config.worldSize
        distance = Math.sqrt(x * x + y * y)
      } while (distance > maxRadius) // Only accept positions well within circular boundary
      
      game.viruses.push({
        id: i,
        x: x,
        y: y,
        radius: config.virusRadius,
        color: '#00ff41', // Bright green
        spikes: 4 + Math.floor(Math.random() * 2) // 4-5 spikes (50% fewer than 8-12)
      })
    }

    // Initialize bots or use real players
    if (!game.isMultiplayer) {
      // Only create bots in offline/demo mode - Initialize bots with varying mass and net worth
      for (let i = 0; i < config.botCount; i++) {
        const mass = config.startingMass + Math.random() * 15
        const netWorth = config.startingNetWorth + Math.random() * 200
        
        let x, y, distance
        const maxRadius = (config.worldSize / 2) - 25 // Add 25 unit margin from edge for bots
        // Keep generating random positions until we find one inside the circle with margin
        do {
          x = (Math.random() - 0.5) * config.worldSize
          y = (Math.random() - 0.5) * config.worldSize
          distance = Math.sqrt(x * x + y * y)
        } while (distance > maxRadius) // Only accept positions well within circular boundary
        
        game.bots.push({
          id: i,
          x: x,
          y: y,
          mass: mass,
          netWorth: netWorth,
          dir: { 
            x: (Math.random() - 0.5) * 2, 
            y: (Math.random() - 0.5) * 2 
          },
          alive: true,
          name: `Player ${i + 1}`,
          color: `hsl(${Math.random() * 360}, 60%, 50%)`,
          targetDir: { x: 0, y: 0 },
          lastDirChange: Date.now(),
          kills: Math.floor(Math.random() * 5),
          deaths: Math.floor(Math.random() * 2),
          streak: Math.floor(Math.random() * 3),
          isBounty: false,
          spawnProtected: true, // New bots get spawn protection
          spawnTime: Date.now(), // Track when spawned
          lastNetWorth: netWorth
        })
      }
    } else {
      // In multiplayer mode, bots array will be populated by real players from Socket.IO
      console.log('🔗 Multiplayer mode - waiting for real players from server')
    }

    // Helper functions
    const getRadius = (mass) => Math.sqrt(mass) * config.massPerDollar
    
    const getDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
    
    const normalizeVector = (vec) => {
      const length = Math.hypot(vec.x, vec.y) || 1
      return { x: vec.x / length, y: vec.y / length }
    }

    // Helper functions for game mechanics

    const updateBounties = () => {
      const allPlayers = [game.player, ...game.bots].filter(p => p.alive)
      allPlayers.sort((a, b) => b.netWorth - a.netWorth)
      
      // Clear old bounties
      game.bounties.clear()
      allPlayers.forEach(p => p.isBounty = false)
      
      // Mark top 25% as bounties if they have enough net worth
      const bountyCount = Math.max(1, Math.floor(allPlayers.length * 0.25))
      for (let i = 0; i < bountyCount; i++) {
        if (allPlayers[i].netWorth >= config.bountyThreshold) {
          game.bounties.add(allPlayers[i])
          allPlayers[i].isBounty = true
        }
      }
    }

    // Mouse movement handler
    const handleMouseMove = (e) => {
      if (!game.player.alive || isCashingOut) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const worldMouseX = (mouseX - canvas.width / 2) / game.camera.zoom + game.camera.x
      const worldMouseY = (mouseY - canvas.height / 2) / game.camera.zoom + game.camera.y
      
      const dx = worldMouseX - game.player.x
      const dy = worldMouseY - game.player.y
      
      game.player.dir = normalizeVector({ x: dx, y: dy })
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    // Game loop
    let lastTime = 0
    const gameLoop = (currentTime) => {
      if (!game.running) return
      
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      // Cancel cash out if moving
      if (isCashingOut && (game.player.dir.x !== 0 || game.player.dir.y !== 0)) {
        cancelCashOut()
      }
      
      // Update player (only if not cashing out)
      if (game.player.alive && !isCashingOut) {
        const speed = config.baseSpeed / Math.pow(Math.max(game.player.mass, 1), 0.3) // Less aggressive decay (was sqrt = 0.5, now 0.3)
        game.player.x += game.player.dir.x * speed * deltaTime
        game.player.y += game.player.dir.y * speed * deltaTime
        
        // Circular world boundaries
        const worldRadius = config.worldSize / 2
        const distanceFromCenter = Math.sqrt(game.player.x * game.player.x + game.player.y * game.player.y)
        
        if (distanceFromCenter > worldRadius) {
          // Push player back inside the circle
          const angle = Math.atan2(game.player.y, game.player.x)
          game.player.x = Math.cos(angle) * worldRadius
          game.player.y = Math.sin(angle) * worldRadius
        }
        
        // Send position update to server in multiplayer mode
        if (socketRef.current && isConnected) {
          // Send updates every few frames to avoid overwhelming the server
          if (currentTime % 3 === 0) { // Send every 3rd frame (10 FPS updates)
            socketRef.current.emit('set_direction', {
              x: game.player.dir.x,
              y: game.player.dir.y
            })
          }
        }
      }

      // Update bots (only in offline mode) or sync real players (in multiplayer mode)
      if (game.isMultiplayer && realPlayers.size > 0) {
        // Replace bots with real players from Socket.IO
        game.bots = Array.from(realPlayers.values()).map(realPlayer => ({
          id: realPlayer.id,
          x: realPlayer.x,
          y: realPlayer.y,
          mass: realPlayer.mass,
          netWorth: realPlayer.mass * 10, // Estimate networth from mass
          dir: { x: 0, y: 0 }, // Server handles movement
          alive: realPlayer.alive,
          name: realPlayer.nickname,
          color: realPlayer.color,
          targetDir: { x: 0, y: 0 },
          lastDirChange: Date.now(),
          kills: 0,
          deaths: 0,
          streak: 0,
          isBounty: false,
          spawnProtected: false,
          spawnTime: Date.now(),
          lastNetWorth: realPlayer.mass * 10
        }))
      } else if (!game.isMultiplayer) {
        // Original bot AI logic (only in offline mode)
      game.bots.forEach(bot => {
        if (!bot.alive) return
        
        // Simple AI: change direction occasionally, chase orbs
        if (Date.now() - bot.lastDirChange > 1000 + Math.random() * 2000) {
          // Find nearest orb
          let nearestOrb = null
          let nearestDistance = Infinity
          
          game.orbs.forEach(orb => {
            const distance = getDistance(bot, orb)
            if (distance < nearestDistance) {
              nearestDistance = distance
              nearestOrb = orb
            }
          })
          
          if (nearestOrb && nearestDistance < 400) {
            // Chase orb
            const dx = nearestOrb.x - bot.x
            const dy = nearestOrb.y - bot.y
            bot.targetDir = normalizeVector({ x: dx, y: dy })
          } else {
            // Random movement
            bot.targetDir = {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2
            }
          }
          bot.lastDirChange = Date.now()
        }
        
        // Move towards target direction
        bot.dir.x += (bot.targetDir.x - bot.dir.x) * deltaTime * 3
        bot.dir.y += (bot.targetDir.y - bot.dir.y) * deltaTime * 3
        bot.dir = normalizeVector(bot.dir)
        
        const speed = config.baseSpeed / Math.pow(Math.max(bot.mass, 1), 0.3) // Less aggressive decay (was sqrt = 0.5, now 0.3)
        bot.x += bot.dir.x * speed * deltaTime
        bot.y += bot.dir.y * speed * deltaTime
        
        // Circular world boundaries for bots
        const worldRadius = config.worldSize / 2
        const distanceFromCenter = Math.sqrt(bot.x * bot.x + bot.y * bot.y)
        
        if (distanceFromCenter > worldRadius) {
          // Push bot back inside the circle
          const angle = Math.atan2(bot.y, bot.x)
          bot.x = Math.cos(angle) * worldRadius
          bot.y = Math.sin(angle) * worldRadius
        }
      })
      } // Close the multiplayer/offline mode conditional

      // Orb pickup (mass only, no money)
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      
      for (let i = game.orbs.length - 1; i >= 0; i--) {
        const orb = game.orbs[i]
        
        for (const entity of allEntities) {
          const distance = getDistance(entity, orb)
          const baseRadius = getRadius(entity.mass) * 2.0 // Base visual scaling
          const visualRadius = entity === game.player ? baseRadius * 3.0 : baseRadius // Player 3x bigger
          
          if (distance <= visualRadius) {
            const oldMass = entity.mass
            entity.mass += config.orbMassValue
            
            // Add enhanced coin collection effects for player
            if (entity === game.player) {
              addFloatingText(`+${config.orbMassValue} mass`, entity.x, entity.y - 30, '#00ff88')
              addCoinAnimation(orb.x, orb.y) // New animated coin pickup
              
              // Increment coins collected counter (with safety check)
              setGameSession(prev => ({
                ...prev,
                coinsCollected: (prev.coinsCollected || 0) + 1
              }))
              
              // Update mission progress
              if (currentMission && currentMission.type === 'collect') {
                setCurrentMission(prev => {
                  if (prev) {
                    const newProgress = prev.progress + 1
                    setMissionProgress(newProgress)
                    if (newProgress >= prev.target) {
                      completeMission({ ...prev, progress: newProgress })
                    }
                    return { ...prev, progress: newProgress }
                  }
                  return prev
                })
              }
            }
            
            game.orbs.splice(i, 1)
            break
          }
        }
      }

      // Replenish orbs (only in offline mode - server handles food in multiplayer)
      if (!game.isMultiplayer) {
        while (game.orbs.length < config.orbCount) {
          game.orbs.push({
            id: Math.random(),
            x: (Math.random() - 0.5) * config.worldSize,
            y: (Math.random() - 0.5) * config.worldSize,
            massValue: config.orbMassValue,
            color: '#FFD700' // Fixed gold color - no more random flickering
          })
        }
      } else {
        // In multiplayer mode, use food from server
        game.orbs = gameServerFood.map(food => ({
          id: food.id,
          x: food.x,
          y: food.y,
          massValue: config.orbMassValue,
          color: '#FFD700'
        }))
      }

      // Virus collision detection
      for (const virus of game.viruses) {
        for (const entity of allEntities) {
          const distance = getDistance(entity, virus)
          const baseRadius = getRadius(entity.mass) * 2.0
          const visualRadius = entity === game.player ? baseRadius * 3.0 : baseRadius
          
          if (distance <= visualRadius + virus.radius) {
            // Check if entity is big enough to split when hitting virus
            if (entity.mass >= config.virusSplitThreshold) {
              // Split the player/bot into multiple smaller pieces based on mass
              const pieceSize = 100 + Math.random() * 20 // 100-120 mass per piece
              const numPieces = Math.max(2, Math.floor(entity.mass / pieceSize)) // At least 2 pieces
              
              if (entity === game.player) {
                addFloatingText(`💥 SPLIT INTO ${numPieces} PIECES!`, entity.x, entity.y - 40, '#ff0000')
                
                // Reduce mass significantly but keep net worth unchanged
                const newMass = entity.mass / numPieces
                // Keep net worth unchanged - no financial penalty
                
                entity.mass = newMass
                // entity.netWorth remains the same - no change to balance
                
                console.log(`Player split into ${numPieces} pieces, reduced to ${Math.floor(newMass)} mass but kept $${entity.netWorth} net worth`)
              } else {
                // Split bot (simplified version)
                entity.mass = entity.mass / 3
                entity.netWorth = Math.floor(entity.netWorth / 2) // Bots still get financial penalty
              }
            } else if (entity.mass <= config.virusHideThreshold) {
              // Small entities can hide inside virus (immunity mechanic)
              if (entity === game.player) {
                addFloatingText('🛡️ PROTECTED', entity.x, entity.y - 30, '#00ff88')
              }
            }
          }
        }
      }

      // PvP Combat (only if not in virus protection)
      if (game.player.alive) {
        for (const bot of game.bots) {
          if (!bot.alive) continue
          
          const distance = getDistance(game.player, bot)
          const basePlayerRadius = getRadius(game.player.mass) * 2.0
          const playerRadius = basePlayerRadius * 3.0 // Player 3x bigger
          const botRadius = getRadius(bot.mass) * 2.0 // Bot normal size
          
          if (distance < Math.max(playerRadius, botRadius)) {
            // Check spawn protection - no combat allowed during protection
            if (game.player.spawnProtected || bot.spawnProtected) {
              // During spawn protection, no one can eat anyone
              continue
            }
            
            if (game.player.mass > bot.mass * 1.15) {
              // Player kills bot - gain money and some mass
              const bountyMultiplier = bot.isBounty ? 1.5 : 1.0
              const killReward = Math.floor(config.killReward * bountyMultiplier)
              
              game.player.netWorth += killReward
              game.player.mass += bot.mass * 0.3 // Gain some mass from kill
              game.player.kills += 1
              game.player.streak += 1
              // Removed cashBadgeScale animation to fix flickering
              
              // Update session tracking
              setGameSession(prev => ({
                ...prev,
                kills: prev.kills + 1
              }))
              
              bot.alive = false
              
              // Add floating text
              const bountyText = bot.isBounty ? ` Bounty!` : ''
              addFloatingText(`+$${killReward}${bountyText}`, game.player.x, game.player.y - 50, '#ff4444')
              
              // Add kill streak announcement
              addKillStreakAnnouncement(game.player.streak)
              
              // Add to kill feed and live events
              const killMessage = `You eliminated ${bot.name} (+$${killReward}${bountyText})`
              addToKillFeed(killMessage)
              addLiveEvent(`Player eliminated ${bot.name} for $${killReward}`, 'kill')
              
              // Update mission progress
              if (currentMission && currentMission.type === 'eliminate') {
                console.log('🎯 Eliminate mission progress update - Current progress:', currentMission.progress, 'Target:', currentMission.target)
                setCurrentMission(prev => {
                  if (prev) {
                    const newProgress = prev.progress + 1
                    console.log('🎯 New eliminate progress:', newProgress, '/', prev.target)
                    setMissionProgress(newProgress)
                    if (newProgress >= prev.target) {
                      console.log('🎯 Eliminate mission completed!')
                      completeMission({ ...prev, progress: newProgress })
                      return null // Clear mission when completed
                    }
                    return { ...prev, progress: newProgress }
                  }
                  return prev
                })
              }
              
            } else if (bot.mass > game.player.mass * 1.15) {
              // Bot kills player
              game.player.alive = false
              game.player.deaths += 1
              game.player.streak = 0
              
              // Fail any active mission when player dies
              if (currentMission) {
                console.log('🎯 Mission failed due to player death:', currentMission.description)
                addFloatingText('Mission Failed!', game.player.x, game.player.y - 80, '#FF4444')
                addToKillFeed(`Mission failed: ${currentMission.description} (eliminated)`)
                setCurrentMission(null)
              }
              
              // Update session tracking - game loss
              setGameSession(prev => ({
                ...prev,
                survived: false,
                cashedOut: false,
                endTime: Date.now(),
                playTimeSeconds: prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : 0
              }))
              
              // Update user statistics for game loss
              setTimeout(() => {
                updateUserStatistics(false) // false = lost/died
              }, 100)
              
              setIsGameOver(true)
              setGameResult(`💀 Eliminated by ${bot.name}`)
            }
          }
        }
      }

      // Bot vs Bot combat
      for (let i = 0; i < game.bots.length; i++) {
        if (!game.bots[i].alive) continue
        
        for (let j = i + 1; j < game.bots.length; j++) {
          if (!game.bots[j].alive) continue
          
          const distance = getDistance(game.bots[i], game.bots[j])
          const radiusA = getRadius(game.bots[i].mass) * 2.0 // Use visual scaling
          const radiusB = getRadius(game.bots[j].mass) * 2.0 // Use visual scaling
          
          if (distance < Math.max(radiusA, radiusB)) {
            if (game.bots[i].mass > game.bots[j].mass * 1.15) {
              game.bots[i].netWorth += config.killReward
              game.bots[i].mass += game.bots[j].mass * 0.3
              game.bots[i].kills += 1
              game.bots[i].streak += 1
              game.bots[j].alive = false
              game.bots[j].deaths += 1
              game.bots[j].streak = 0
            } else if (game.bots[j].mass > game.bots[i].mass * 1.15) {
              game.bots[j].netWorth += config.killReward
              game.bots[j].mass += game.bots[i].mass * 0.3
              game.bots[j].kills += 1
              game.bots[j].streak += 1
              game.bots[i].alive = false
              game.bots[i].deaths += 1
              game.bots[i].streak = 0
            }
          }
        }
      }

      // Update bounty system
      updateBounties()

      // Update camera
      if (game.player.alive) {
        game.camera.x = game.player.x
        game.camera.y = game.player.y
        
        // Keep camera zoom constant - much more zoomed in
        // This way players can see their character actually growing bigger
        const targetZoom = 1.2 // Much more zoomed in fixed level
        game.camera.zoom += (targetZoom - game.camera.zoom) * deltaTime * 2
      }

      // Update stats
      const aliveBots = game.bots.filter(b => b.alive)
      const allAlive = game.player.alive ? [game.player, ...aliveBots] : aliveBots
      allAlive.sort((a, b) => b.netWorth - a.netWorth)
      
      const playerRank = game.player.alive ? allAlive.findIndex(e => e === game.player) + 1 : allAlive.length + 1
      
      setGameStats({
        netWorth: Math.floor(game.player.netWorth),
        mass: Math.floor(game.player.mass),
        rank: playerRank,
        players: allAlive.length,
        kills: game.player.kills,
        deaths: game.player.deaths,
        streak: game.player.streak
      })

      // Auto Cash Out Logic - check if threshold is reached
      if (settings.autoCashOut && game.player.alive && !isCashingOut && !autoCashOutTriggered) {
        const currentNetWorth = Math.floor(game.player.netWorth)
        if (currentNetWorth >= settings.autoCashOutThreshold) {
          console.log(`🎯 Auto cash out triggered! Net worth: $${currentNetWorth} >= threshold: $${settings.autoCashOutThreshold}`)
          setAutoCashOutTriggered(true) // Prevent multiple triggers
          startCashOut()
          addFloatingText(`AUTO CASH OUT!`, game.player.x, game.player.y - 70, '#ffff00')
          addToKillFeed(`Auto cash out triggered at $${currentNetWorth}`)
        }
      } else if (settings.autoCashOut && game.player.alive && !autoCashOutTriggered) {
        // Debug logging to help understand why auto cash out isn't triggering
        const currentNetWorth = Math.floor(game.player.netWorth)
        if (currentNetWorth % 50 === 0) { // Log every $50 to avoid spam
          console.log(`💰 Auto cash out monitoring: $${currentNetWorth} / $${settings.autoCashOutThreshold} (${isCashingOut ? 'already cashing out' : 'threshold not reached'})`)
        }
      }

      // Update live leaderboard
      const leaderboardData = allAlive.map((player, index) => ({
        rank: index + 1,
        name: player.name,
        netWorth: Math.floor(player.netWorth),
        isPlayer: player === game.player,
        isBounty: player.isBounty || false
      }))
      
      setLeaderboard(leaderboardData)

      // Update spawn protection (2 second duration)
      if (game.player.spawnProtected && Date.now() - game.player.spawnTime > 2000) {
        game.player.spawnProtected = false
        console.log('🛡️ Spawn protection expired for player')
      }
      
      // Update bot spawn protection
      game.bots.forEach(bot => {
        if (bot.spawnProtected && Date.now() - bot.spawnTime > 2000) {
          bot.spawnProtected = false
        }
      })

      // Update floating texts
      setFloatingTexts(prev => prev.map(text => ({
        ...text,
        life: text.life - deltaTime * 0.8,
        y: text.startY - (1 - text.life) * 50
      })).filter(text => text.life > 0))

      // Update coin animations
      setCoinAnimations(prev => prev.map(anim => ({
        ...anim,
        life: anim.life - deltaTime * 2.0,
        scale: 1 + (1 - anim.life) * 2,
        rotation: anim.rotation + deltaTime * 720, // 720 degrees per second
        particles: anim.particles.map(particle => ({
          ...particle,
          x: particle.x + particle.vx * deltaTime,
          y: particle.y + particle.vy * deltaTime,
          life: particle.life - deltaTime * 1.5
        })).filter(p => p.life > 0)
      })).filter(anim => anim.life > 0))

      // Update kill streak announcements
      setKillStreakAnnouncements(prev => prev.map(announcement => ({
        ...announcement,
        life: announcement.life - deltaTime * 0.5,
        scale: 1 + Math.sin((1 - announcement.life) * Math.PI * 4) * 0.2
      })).filter(announcement => announcement.life > 0))

      // Update territory glow intensity (pulsing)
      setTerritoryGlowIntensity(prev => 0.3 + Math.sin(currentTime * 0.003) * 0.2)

      // Update mission progress for survive type
      if (currentMission && currentMission.type === 'survive') {
        const elapsed = Date.now() - currentMission.startTime
        const newProgress = Math.min(elapsed, currentMission.target)
        console.log('🎯 Survive mission progress:', Math.floor(newProgress/1000) + 's /', Math.floor(currentMission.target/1000) + 's')
        setMissionProgress(newProgress)
        
        // Update the mission state as well
        setCurrentMission(prev => {
          if (prev && prev.type === 'survive') {
            const updatedMission = { ...prev, progress: newProgress }
            if (newProgress >= prev.target) {
              console.log('🎯 Survive mission completed!')
              completeMission(updatedMission)
              return null // Clear mission when completed
            }
            return updatedMission
          }
          return prev
        })
      }

      // Update mission progress for mass type
      if (currentMission && currentMission.type === 'mass' && game.player.alive) {
        const newProgress = Math.min(game.player.mass, currentMission.target)
        setMissionProgress(newProgress)
        
        // Update the mission state as well
        setCurrentMission(prev => {
          if (prev && prev.type === 'mass') {
            const updatedMission = { ...prev, progress: newProgress }
            if (newProgress >= prev.target) {
              completeMission(updatedMission)
            }
            return updatedMission
          }
          return prev
        })
      }

      // Render
      render()
      
      requestAnimationFrame(gameLoop)
    }

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.save()
      
      // Apply camera transform
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.scale(game.camera.zoom, game.camera.zoom)
      ctx.translate(-game.camera.x, -game.camera.y)
      
      // Draw grid
      drawGrid()
      
      // Draw red out-of-bounds area (everything outside the circle)
      const playableRadius = config.worldSize / 2
      
      // Get visible world bounds for efficient rendering
      const viewWidth = canvas.width / game.camera.zoom
      const viewHeight = canvas.height / game.camera.zoom
      const left = game.camera.x - viewWidth / 2
      const right = game.camera.x + viewWidth / 2
      const top = game.camera.y - viewHeight / 2
      const bottom = game.camera.y + viewHeight / 2
      
      // Draw red background everywhere first
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)' // Semi-transparent red
      ctx.fillRect(left, top, viewWidth, viewHeight)
      
      // Cut out the playable area (create a "hole" in the red)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(0, 0, playableRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over' // Reset blend mode
      
      // Draw world border with enhanced glow
      const borderRadius = config.worldSize / 2
      
      // Draw glow effect
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 20 * territoryGlowIntensity
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.8 + territoryGlowIntensity * 0.4})`
      ctx.lineWidth = 8
      ctx.setLineDash([20, 10]) // Dashed line pattern
      ctx.beginPath()
      ctx.arc(0, 0, borderRadius, 0, Math.PI * 2)
      ctx.stroke()
      
      // Reset shadow for other drawings
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.setLineDash([]) // Reset line dash
      
      // Draw orbs - enhanced with different types
      game.orbs.forEach((orb, index) => {
        // Determine orb type based on properties
        const isHighValue = orb.massValue > config.orbMassValue * 1.5
        const isBonusOrb = index % 7 === 0 // Every 7th orb is a bonus orb
        
        // Set orb appearance
        if (isBonusOrb) {
          // Bonus orbs - larger and golden
          ctx.fillStyle = '#FFD700'
          ctx.beginPath()
          ctx.arc(orb.x, orb.y, 16, 0, Math.PI * 2)
          ctx.fill()
          
          // Add sparkle effect
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(orb.x - 4, orb.y - 4, 2, 0, Math.PI * 2)
          ctx.fill()
          
          // Dollar sign
          ctx.fillStyle = '#8B4513' // Dark brown
          ctx.font = 'bold 16px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('$', orb.x, orb.y + 5)
        } else if (isHighValue) {
          // High value orbs - silver/cyan
          ctx.fillStyle = '#00FFFF'
          ctx.beginPath()
          ctx.arc(orb.x, orb.y, 14, 0, Math.PI * 2)
          ctx.fill()
          
          // Dollar sign
          ctx.fillStyle = '#000080' // Dark blue
          ctx.font = 'bold 15px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('$', orb.x, orb.y + 4)
        } else {
          // Regular orbs - fixed gold color to prevent flickering
          ctx.fillStyle = '#FFD700'
          ctx.beginPath()
          ctx.arc(orb.x, orb.y, 12, 0, Math.PI * 2)
          ctx.fill()
          
          // Dollar sign
          ctx.fillStyle = '#000000'
          ctx.font = '14px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('$', orb.x, orb.y + 4)
        }
      })
      
      // Draw viruses (modern geometric spiky obstacles)
      game.viruses.forEach(virus => {
        const time = Date.now() * 0.003 // For animations
        const pulseScale = 1 + Math.sin(time * 2) * 0.1 // Subtle pulse animation
        const spikeLength = virus.radius * 0.8 * pulseScale
        const spikeCount = virus.spikes
        
        // Create gradient for virus body
        const gradient = ctx.createRadialGradient(virus.x, virus.y, 0, virus.x, virus.y, virus.radius)
        gradient.addColorStop(0, '#00ff88') // Bright green center (matching your logo)
        gradient.addColorStop(0.7, '#00cc66')
        gradient.addColorStop(1, '#009944') // Darker green edge
        
        // Draw outer glow/shadow
        ctx.shadowColor = '#00ff88'
        ctx.shadowBlur = 15 * pulseScale
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        // Draw virus body with gradient
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(virus.x, virus.y, virus.radius * pulseScale, 0, Math.PI * 2)
        ctx.fill()
        
        // Reset shadow for spikes
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        // Draw outer layer spikes (larger, triangular)
        for (let i = 0; i < spikeCount; i++) {
          const angle = (i / spikeCount) * Math.PI * 2 + time * 0.5 // Slow rotation
          const baseX = virus.x + Math.cos(angle) * virus.radius * pulseScale
          const baseY = virus.y + Math.sin(angle) * virus.radius * pulseScale
          const tipX = virus.x + Math.cos(angle) * (virus.radius + spikeLength) * pulseScale
          const tipY = virus.y + Math.sin(angle) * (virus.radius + spikeLength) * pulseScale
          
          // Calculate perpendicular points for triangle base
          const perpAngle = angle + Math.PI / 2
          const baseWidth = virus.radius * 0.15
          const base1X = baseX + Math.cos(perpAngle) * baseWidth
          const base1Y = baseY + Math.sin(perpAngle) * baseWidth
          const base2X = baseX - Math.cos(perpAngle) * baseWidth
          const base2Y = baseY - Math.sin(perpAngle) * baseWidth
          
          // Create gradient for spike
          const spikeGradient = ctx.createLinearGradient(baseX, baseY, tipX, tipY)
          spikeGradient.addColorStop(0, '#00cc66') // Base darker
          spikeGradient.addColorStop(0.5, '#00ff88') // Middle bright
          spikeGradient.addColorStop(1, '#88ffcc') // Tip lighter (3D effect)
          
          // Draw triangular spike with glow
          ctx.shadowColor = '#00ffaa'
          ctx.shadowBlur = 8 * pulseScale
          ctx.fillStyle = spikeGradient
          ctx.beginPath()
          ctx.moveTo(tipX, tipY)
          ctx.lineTo(base1X, base1Y)
          ctx.lineTo(base2X, base2Y)
          ctx.closePath()
          ctx.fill()
          
          // Draw spike border with cyan accent (matching your logo)
          ctx.shadowBlur = 0
          ctx.strokeStyle = '#00ddff' // Cyan accent
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
        
        // Draw inner layer spikes (smaller, for depth)
        const innerSpikeCount = Math.floor(spikeCount * 0.6)
        const innerSpikeLength = spikeLength * 0.6
        
        for (let i = 0; i < innerSpikeCount; i++) {
          const angle = ((i + 0.5) / innerSpikeCount) * Math.PI * 2 + time * 0.3 // Offset and slower rotation
          const baseX = virus.x + Math.cos(angle) * virus.radius * 0.7 * pulseScale
          const baseY = virus.y + Math.sin(angle) * virus.radius * 0.7 * pulseScale
          const tipX = virus.x + Math.cos(angle) * (virus.radius * 0.7 + innerSpikeLength) * pulseScale
          const tipY = virus.y + Math.sin(angle) * (virus.radius * 0.7 + innerSpikeLength) * pulseScale
          
          // Smaller triangular spikes
          const perpAngle = angle + Math.PI / 2
          const baseWidth = virus.radius * 0.08
          const base1X = baseX + Math.cos(perpAngle) * baseWidth
          const base1Y = baseY + Math.sin(perpAngle) * baseWidth
          const base2X = baseX - Math.cos(perpAngle) * baseWidth
          const base2Y = baseY - Math.sin(perpAngle) * baseWidth
          
          // Inner spike gradient (more subtle)
          const innerGradient = ctx.createLinearGradient(baseX, baseY, tipX, tipY)
          innerGradient.addColorStop(0, '#009955')
          innerGradient.addColorStop(1, '#66ffaa')
          
          ctx.fillStyle = innerGradient
          ctx.beginPath()
          ctx.moveTo(tipX, tipY)
          ctx.lineTo(base1X, base1Y)
          ctx.lineTo(base2X, base2Y)
          ctx.closePath()
          ctx.fill()
          
          // Inner spike accent
          ctx.strokeStyle = '#44ffcc'
          ctx.lineWidth = 1
          ctx.stroke()
        }
        
        // Draw core highlight (matching your logo's bright center)
        const coreGradient = ctx.createRadialGradient(virus.x, virus.y, 0, virus.x, virus.y, virus.radius * 0.3)
        coreGradient.addColorStop(0, '#88ffcc') // Bright center
        coreGradient.addColorStop(1, 'transparent')
        
        ctx.fillStyle = coreGradient
        ctx.beginPath()
        ctx.arc(virus.x, virus.y, virus.radius * 0.3 * pulseScale, 0, Math.PI * 2)
        ctx.fill()
        
        // Reset any remaining effects
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      })
      
      // Draw entities (sorted by net worth)
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      allEntities.sort((a, b) => a.netWorth - b.netWorth)
      
      allEntities.forEach(entity => {
        const baseRadius = getRadius(entity.mass) * 2.0 // Base size like original Agario
        const radius = entity === game.player ? baseRadius * 3.0 : baseRadius // Player 3x bigger
        const isPlayer = entity === game.player
        
        // Bounty gold ring
        if (entity.isBounty) {
          ctx.strokeStyle = '#FFD700'
          ctx.lineWidth = 6
          ctx.beginPath()
          ctx.arc(entity.x, entity.y, radius + 10, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.beginPath()
        ctx.arc(entity.x + 4, entity.y + 4, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Entity circle with customization support
        if (isPlayer) {
          const playerSkin = getPlayerSkinColor()
          ctx.fillStyle = playerSkin.solidColor
          ctx.beginPath()
          ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2)
          ctx.fill()
          
          // Add special effects for legendary skins
          if (playerSkin.hasSpecialEffect) {
            ctx.save()
            ctx.globalCompositeOperation = 'overlay'
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
            ctx.beginPath()
            ctx.arc(entity.x, entity.y, radius * 0.8, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        } else {
          ctx.fillStyle = entity.color
          ctx.beginPath()
          ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Border
        ctx.strokeStyle = entity.isBounty ? '#FFD700' : '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        
        // Eyes with customization support
        if (radius > 15) {
          const eyeOffset = radius * 0.3
          const eyeSize = Math.max(2, radius * 0.1)
          const faceStyle = isPlayer ? getPlayerFaceStyle() : 'normal_eyes'
          
          if (faceStyle === 'angry_eyes' && isPlayer) {
            // Angry eyes - angled eyebrows
            ctx.fillStyle = '#000000'
            ctx.fillRect(entity.x - eyeOffset - eyeSize, entity.y - eyeOffset - eyeSize, eyeSize * 2, eyeSize)
            ctx.fillRect(entity.x + eyeOffset - eyeSize, entity.y - eyeOffset - eyeSize, eyeSize * 2, eyeSize)
            
            // Angry mouth
            ctx.strokeStyle = '#FF0000'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(entity.x, entity.y + eyeOffset, eyeSize * 2, 0, Math.PI)
            ctx.stroke()
          } else if (faceStyle === 'wink_eyes' && isPlayer) {
            // Wink eyes - one closed, one open
            ctx.fillStyle = '#000000'
            // Closed eye (line)
            ctx.fillRect(entity.x - eyeOffset - eyeSize, entity.y - eyeOffset, eyeSize * 2, 1)
            // Open eye (circle)
            ctx.beginPath()
            ctx.arc(entity.x + eyeOffset, entity.y - eyeOffset, eyeSize, 0, Math.PI * 2)
            ctx.fill()
            
            // Happy mouth
            ctx.strokeStyle = '#FF69B4'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(entity.x, entity.y + eyeOffset, eyeSize * 1.5, 0, Math.PI)
            ctx.stroke()
          } else {
            // Normal eyes
            ctx.fillStyle = '#000000'
            ctx.beginPath()
            ctx.arc(entity.x - eyeOffset, entity.y - eyeOffset, eyeSize, 0, Math.PI * 2)
            ctx.fill()
            
            ctx.beginPath()
            ctx.arc(entity.x + eyeOffset, entity.y - eyeOffset, eyeSize, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        
        // Spawn protection shield effect
        if ((isPlayer && game.player.spawnProtected) || (!isPlayer && entity.spawnProtected)) {
          ctx.save()
          const shieldRadius = radius + 8
          const pulseIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7
          
          // Shield outer glow
          ctx.shadowColor = '#00BFFF'
          ctx.shadowBlur = 15
          ctx.strokeStyle = `rgba(0, 191, 255, ${pulseIntensity})`
          ctx.lineWidth = 4
          ctx.setLineDash([8, 4])
          ctx.beginPath()
          ctx.arc(entity.x, entity.y, shieldRadius, 0, Math.PI * 2)
          ctx.stroke()
          
          // Shield text
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.fillStyle = '#00BFFF'
          ctx.font = 'bold 10px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('🛡️', entity.x, entity.y - radius - 20)
          
          ctx.restore()
        }
        
        // Display balance above other players' heads (not for the main player)
        if (!isPlayer && entity.netWorth > 0) {
          ctx.save()
          ctx.font = 'bold 12px Arial'
          ctx.textAlign = 'center'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1
          
          // Background for better readability
          const balanceText = `$${Math.floor(entity.netWorth)}`
          const textMetrics = ctx.measureText(balanceText)
          const textWidth = textMetrics.width
          const textHeight = 14
          const bgPadding = 3
          
          // Draw background rectangle
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
          ctx.fillRect(
            entity.x - textWidth/2 - bgPadding, 
            entity.y - radius - 30 - textHeight/2 - bgPadding, 
            textWidth + bgPadding*2, 
            textHeight + bgPadding*2
          )
          
          // Draw border
          ctx.strokeStyle = '#00ff88'
          ctx.lineWidth = 1
          ctx.strokeRect(
            entity.x - textWidth/2 - bgPadding, 
            entity.y - radius - 30 - textHeight/2 - bgPadding, 
            textWidth + bgPadding*2, 
            textHeight + bgPadding*2
          )
          
          // Draw balance text
          ctx.fillStyle = '#00ff88'
          ctx.fillText(balanceText, entity.x, entity.y - radius - 25)
          
          ctx.restore()
        }
        
        // Hat rendering for player
        if (isPlayer && playerCustomization.hat && radius > 15) {
          const hatY = entity.y - radius - 5 // Position hat above the character
          const hatSize = radius * 0.8
          
          ctx.save()
          
          switch (playerCustomization.hat) {
            case 'crown_gold':
              // Golden crown
              ctx.fillStyle = '#FFD700'
              ctx.fillRect(entity.x - hatSize/2, hatY - hatSize/2, hatSize, hatSize/2)
              // Crown jewel
              ctx.fillStyle = '#FF0000'
              ctx.beginPath()
              ctx.arc(entity.x, hatY - hatSize/4, 3, 0, Math.PI * 2)
              ctx.fill()
              break
              
            case 'cap_baseball':
              // Baseball cap
              ctx.fillStyle = '#FF0000'
              ctx.beginPath()
              ctx.ellipse(entity.x, hatY, hatSize/2, hatSize/3, 0, 0, Math.PI * 2)
              ctx.fill()
              // Cap visor
              ctx.fillStyle = '#CC0000'
              ctx.beginPath()
              ctx.ellipse(entity.x + hatSize/3, hatY + hatSize/4, hatSize/3, hatSize/6, 0, 0, Math.PI * 2)
              ctx.fill()
              break
              
            case 'helmet_space':
              // Space helmet
              ctx.fillStyle = '#C0C0C0'
              ctx.beginPath()
              ctx.arc(entity.x, hatY, hatSize/2, 0, Math.PI * 2)
              ctx.fill()
              // Helmet visor
              ctx.fillStyle = 'rgba(135, 206, 250, 0.3)'
              ctx.beginPath()
              ctx.arc(entity.x, hatY, hatSize/2 - 2, 0, Math.PI * 2)
              ctx.fill()
              break
          }
          
          ctx.restore()
        }
        
        // Bounty crown
        if (entity.isBounty) {
          ctx.fillStyle = '#FFD700'
          ctx.font = `${Math.max(16, radius * 0.4)}px Arial`
          ctx.textAlign = 'center'
          ctx.fillText('👑', entity.x, entity.y - radius - 25)
        }
        
        // Player name display (only if showPlayerNames is enabled)
        if (settings.showPlayerNames && entity.name) {
          ctx.fillStyle = '#ffffff'
          ctx.font = '14px Arial'
          ctx.textAlign = 'center'
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 2
          
          const nameY = entity.y + radius + 15
          ctx.strokeText(entity.name, entity.x, nameY)
          ctx.fillText(entity.name, entity.x, nameY)
        }
        

      })
      
      // Draw floating texts
      if (settings.showFloatingText) {
        floatingTexts.forEach(text => {
          if (text.life > 0) {
            ctx.fillStyle = text.color + Math.floor(text.life * 255).toString(16).padStart(2, '0')
            ctx.font = '16px Arial'
            ctx.textAlign = 'center'
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 2
            ctx.strokeText(text.text, text.x, text.y)
            ctx.fillText(text.text, text.x, text.y)
          }
        })
      }

      // Draw coin animations
      coinAnimations.forEach(anim => {
        if (anim.life > 0) {
          ctx.save()
          ctx.translate(anim.x, anim.y)
          ctx.scale(anim.scale, anim.scale)
          ctx.rotate(anim.rotation * Math.PI / 180)
          
          // Draw spinning coin
          ctx.fillStyle = '#FFD700'
          ctx.beginPath()
          ctx.arc(0, 0, 10, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.fillStyle = '#000000'
          ctx.font = 'bold 14px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('$', 0, 4)
          
          ctx.restore()
          
          // Draw particles
          anim.particles.forEach(particle => {
            if (particle.life > 0) {
              ctx.fillStyle = particle.color + Math.floor(particle.life * 255).toString(16).padStart(2, '0')
              ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2)
            }
          })
        }
      })
      
      // Cash out progress ring
      if (isCashingOut && game.player.alive) {
        const baseRadius = getRadius(game.player.mass) * 2.0
        const radius = baseRadius * 3.0 + 20 // Match player's 3x bigger size
        const progress = cashOutProgress / 100
        
        // Background ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(game.player.x, game.player.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        
        // Progress ring
        ctx.strokeStyle = '#00ff00'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(game.player.x, game.player.y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
        ctx.stroke()
        
        // Cash out text
        ctx.fillStyle = '#ffffff'
        ctx.font = '14px Arial'
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.strokeText('CASHING OUT...', game.player.x, game.player.y - radius - 20)
        ctx.fillText('CASHING OUT...', game.player.x, game.player.y - radius - 20)
      }
      
      ctx.restore()
    }

    const drawGrid = () => {
      const gridSize = 100
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      
      // Get visible world bounds
      const viewWidth = canvas.width / game.camera.zoom
      const viewHeight = canvas.height / game.camera.zoom
      const left = game.camera.x - viewWidth / 2
      const right = game.camera.x + viewWidth / 2
      const top = game.camera.y - viewHeight / 2
      const bottom = game.camera.y + viewHeight / 2
      
      // Vertical lines
      const startX = Math.floor(left / gridSize) * gridSize
      const endX = Math.ceil(right / gridSize) * gridSize
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
      }
      
      // Horizontal lines
      const startY = Math.floor(top / gridSize) * gridSize
      const endY = Math.ceil(bottom / gridSize) * gridSize
      
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
        ctx.stroke()
      }
    }

    // Start game loop
    requestAnimationFrame(gameLoop)

    // Store game reference for cleanup
    gameRef.current = {
      game,
      cleanup: () => {
        game.running = false
        canvas.removeEventListener('mousemove', handleMouseMove)
        if (gameRef.current?.cashOutTimer) {
          clearInterval(gameRef.current.cashOutTimer)
        }
        if (gameRef.current?.missionInterval) {
          clearInterval(gameRef.current.missionInterval)
        }
      }
    }
    
    // Start first mission after 10 seconds
    setTimeout(() => {
      if (gameRef.current?.game?.running && !currentMission) {
        generateMission()
      }
    }, 10000)
    
    // Generate new missions every 2 minutes
    const missionInterval = setInterval(() => {
      if (gameRef.current?.game?.running && !currentMission) {
        generateMission()
      }
    }, 120000)
    gameRef.current.missionInterval = missionInterval
  }

  const restartGame = () => {
    setIsGameOver(false)
    setGameResult('')
    setKillFeed([])
    setFloatingTexts([])
    setLeaderboard([])
    setShowControls(true) // Show controls again on restart
    setIsCashingOut(false)
    setCashOutProgress(0)
    setAutoCashOutTriggered(false) // Reset auto cash out flag for new game
    if (gameRef.current) {
      gameRef.current.cleanup()
    }
    setTimeout(() => {
      initializeGame()
      // Hide controls after 5 seconds on restart
      setTimeout(() => {
        setShowControls(false)
      }, 5000)
    }, 100)
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ display: isGameOver ? 'none' : 'block' }}
      />
      
      {/* Multiplayer Status */}
      {isConnected && (
        <div className="absolute top-4 right-4 bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-green-400/50">
          <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            MULTIPLAYER
          </div>
          <div className="text-white text-xs mt-1">
            Room: {roomId}
          </div>
          <div className="text-white text-xs">
            Mode: {gameMode} {entryFee > 0 && `($${entryFee})`}
          </div>
          <div className="text-white text-xs">
            Players: {connectedPlayers}
          </div>
        </div>
      )}
      
      {/* Waiting for Players */}
      {isWaitingForPlayers && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/95 backdrop-blur-sm rounded-lg p-6 border border-blue-400/50 text-center">
          <div className="text-blue-400 font-bold text-lg mb-2">⏳ Waiting for Players</div>
          <div className="text-white text-sm mb-3">
            {connectedPlayers} player{connectedPlayers !== 1 ? 's' : ''} connected
          </div>
          <div className="text-gray-400 text-xs">
            {gameMode === 'cash' ? 'Minimum 2 players required' : 'Game starts automatically'}
          </div>
          {isPlayerReady && (
            <div className="text-green-400 text-xs mt-2">✓ You are ready</div>
          )}
        </div>
      )}
      
      {/* Connection Status */}
      {!isConnected && user && (
        <div className="absolute top-4 right-4 bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-red-400/50">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            OFFLINE
          </div>
          <div className="text-white text-xs mt-1">
            Demo Mode
          </div>
        </div>
      )}
      
      {/* Kill Streak Announcements */}
      {killStreakAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) scale(${announcement.scale})`,
            opacity: announcement.life
          }}
        >
          <div 
            className="px-8 py-4 rounded-lg font-bold text-4xl text-center shadow-2xl"
            style={{ 
              color: announcement.color,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              background: 'rgba(0,0,0,0.8)',
              border: `2px solid ${announcement.color}`
            }}
          >
            {announcement.message}
          </div>
        </div>
      ))}

      {/* Current Mission Display - Moved to Top Center */}
      {currentMission && !isGameOver && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-purple-400/50 max-w-xs">
          <div className="text-purple-400 font-bold text-sm mb-2">🎯 MISSION</div>
          <div className="text-white text-sm mb-2">{currentMission.description}</div>
          <div className="bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(missionProgress / currentMission.target) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-300">
            <span>
              {currentMission.type === 'survive' 
                ? `${Math.floor(missionProgress / 1000)}/${Math.floor(currentMission.target / 1000)}s`
                : `${missionProgress}/${currentMission.target}`
              }
            </span>
            <span className="text-green-400">{currentMission.reward} SP</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.max(0, Math.ceil((currentMission.startTime + currentMission.duration - Date.now()) / 1000))}s left
          </div>
        </div>
      )}
      {!isGameOver && (
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30 min-w-[200px]">
          <div className="text-cyan-400 font-bold text-lg mb-2">You</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Net Worth:</span>
              <span className="text-green-400 font-bold">${gameStats.netWorth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Total Mass:</span>
              <span className="text-blue-400 font-bold">{Math.floor(gameStats.mass || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">K/D:</span>
              <span className="text-white">{gameStats.kills}/{gameStats.deaths}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Streak:</span>
              <div className="flex items-center">
                <span className="text-yellow-400 mr-1">{gameStats.streak}</span>
                {gameStats.streak > 0 && <span>🔥</span>}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Coins Collected:</span>
              <span className="text-orange-400 font-bold">{gameSession.coinsCollected || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Time Alive:</span>
              <span className="text-purple-400 font-bold">{formatTimeAlive(timeAlive)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Leaderboard (All Players) */}
      {!isGameOver && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30 max-w-[280px]">
          <div className="text-cyan-400 font-bold text-lg mb-3">💰 Live Leaderboard</div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {leaderboard.slice(0, 5).map((player) => (
              <div 
                key={`${player.rank}-${player.name}`}
                className={`flex justify-between items-center py-1 px-2 rounded text-sm ${
                  player.isPlayer 
                    ? 'bg-cyan-600/30 border border-cyan-400/50' 
                    : 'hover:bg-gray-800/30'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`font-bold w-6 text-center ${
                    player.rank === 1 ? 'text-yellow-400' : 
                    player.rank === 2 ? 'text-gray-300' : 
                    player.rank === 3 ? 'text-orange-400' : 'text-gray-400'
                  }`}>
                    #{player.rank}
                  </span>
                  <span className={`${player.isPlayer ? 'text-cyan-400 font-bold' : 'text-white'}`}>
                    {player.name}
                  </span>
                  {player.isBounty && <span className="text-yellow-400">👑</span>}
                </div>
                <span className="text-green-400 font-bold">
                  ${player.netWorth}
                </span>
              </div>
            ))}
          </div>
          
          {/* Live Player Count */}
          {leaderboard.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600/30">
              <div className="text-center text-gray-300 text-sm">
                <span className="text-cyan-400 font-bold">{leaderboard.length}</span> players in game
              </div>
            </div>
          )}
          
          {leaderboard.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-2">
              No players in game
            </div>
          )}
        </div>
      )}

      {/* Kill Feed */}
      {killFeed.length > 0 && !isGameOver && settings.showKillFeed && (
        <div className="absolute bottom-16 left-4 space-y-2 max-w-[400px]">
          {killFeed.map((item, index) => (
            <div 
              key={item.id}
              className="bg-black/80 backdrop-blur-sm rounded px-3 py-2 border border-gray-600/30 text-sm text-white"
              style={{ opacity: 1 - (index * 0.2) }}
            >
              {item.message}
            </div>
          ))}
        </div>
      )}

      {/* Separate Live Event Feed */}
      {!isGameOver && liveEventFeed.length > 0 && (
        <div className="absolute top-4 left-80 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-orange-400/30 max-w-[250px]">
          <div className="text-orange-400 font-bold text-sm mb-2">📺 Live Events</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {liveEventFeed.map((event) => (
              <div 
                key={event.id} 
                className={`text-xs px-2 py-1 rounded ${
                  event.type === 'kill' ? 'bg-red-500/20 text-red-300' :
                  event.type === 'cashout' ? 'bg-green-500/20 text-green-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}
              >
                {event.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimap - moved to top-right and 25% bigger */}
      {!isGameOver && gameRef.current?.game && settings.showMinimap && (
        <div className="absolute top-4 right-4 w-40 h-40 bg-black/80 backdrop-blur-sm rounded border border-gray-600/30">
          <canvas 
            width="128" 
            height="128" 
            className="w-full h-full"
            ref={(minimapCanvas) => {
              if (minimapCanvas && gameRef.current?.game) {
                const ctx = minimapCanvas.getContext('2d')
                const game = gameRef.current.game
                
                // Clear minimap
                ctx.fillStyle = '#111'
                ctx.fillRect(0, 0, 128, 128)
                
                // Draw border
                ctx.strokeStyle = '#333'
                ctx.lineWidth = 1
                ctx.strokeRect(0, 0, 128, 128)
                
                // Scale factor (updated for expanded world size - 3750)
                const worldSize = 3750 // Updated to match 25% increase (was 3000, now 3750)
                const scale = 128 / worldSize
                
                // Draw world border on minimap (red circle)
                const centerX = 64 // center of 128x128 minimap
                const centerY = 64
                const worldRadius = (worldSize / 2) * scale
                ctx.strokeStyle = '#ff0000'
                ctx.lineWidth = 2
                ctx.setLineDash([4, 2]) // Smaller dashed pattern for minimap
                ctx.beginPath()
                ctx.arc(centerX, centerY, worldRadius, 0, Math.PI * 2)
                ctx.stroke()
                ctx.setLineDash([]) // Reset line dash
                
                // Draw players
                const allPlayers = [game.player, ...game.bots].filter(p => p.alive)
                allPlayers.forEach(player => {
                  const x = (player.x + worldSize / 2) * scale // offset by half world
                  const y = (player.y + worldSize / 2) * scale
                  
                  if (player === game.player) {
                    // Use customized player color on minimap
                    const playerSkin = getPlayerSkinColor()
                    ctx.fillStyle = playerSkin.solidColor
                    ctx.fillRect(x - 2, y - 2, 4, 4)
                  } else if (player.isBounty) {
                    ctx.fillStyle = '#FFD700'
                    ctx.fillRect(x - 3, y - 3, 6, 6)
                    // Add crown indicator
                    ctx.fillStyle = '#FFD700'
                    ctx.fillRect(x - 1, y - 5, 2, 2)
                  } else {
                    ctx.fillStyle = '#666'
                    ctx.fillRect(x - 1, y - 1, 2, 2)
                  }
                })
                
                // Draw viruses on minimap (spikes icon)
                game.viruses.forEach(virus => {
                  const x = (virus.x + worldSize / 2) * scale
                  const y = (virus.y + worldSize / 2) * scale
                  
                  ctx.fillStyle = '#00ff41' // Bright green
                  // Draw spike/star shape
                  ctx.beginPath()
                  for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4
                    const radius = i % 2 === 0 ? 3 : 1.5
                    const px = x + Math.cos(angle) * radius
                    const py = y + Math.sin(angle) * radius
                    if (i === 0) ctx.moveTo(px, py)
                    else ctx.lineTo(px, py)
                  }
                  ctx.closePath()
                  ctx.fill()
                })

                // Draw orbs on minimap with different icons
                game.orbs.forEach((orb, index) => {
                  const x = (orb.x + worldSize / 2) * scale
                  const y = (orb.y + worldSize / 2) * scale
                  
                  const isBonusOrb = index % 7 === 0 // Every 7th orb is a bonus orb
                  const isHighValue = false // Simplified: remove config dependency for now
                  
                  if (isBonusOrb) {
                    // Bonus orb - golden diamond
                    ctx.fillStyle = '#FFD700'
                    ctx.beginPath()
                    ctx.moveTo(x, y - 2)
                    ctx.lineTo(x + 2, y)
                    ctx.lineTo(x, y + 2)
                    ctx.lineTo(x - 2, y)
                    ctx.closePath()
                    ctx.fill()
                  } else if (isHighValue) {
                    // High value orb - cyan square
                    ctx.fillStyle = '#00FFFF'
                    ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
                  } else {
                    // Regular orb - small yellow dot
                    ctx.fillStyle = '#FFFF00'
                    ctx.fillRect(x - 0.5, y - 0.5, 1, 1)
                  }
                })
              }
            }}
          />
        </div>
      )}

      {/* Cash Out Button */}
      {!isGameOver && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
          <button
            onMouseDown={startCashOut}
            onMouseUp={cancelCashOut}
            onMouseLeave={cancelCashOut}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              isCashingOut 
                ? 'bg-green-600 text-white' 
                : 'bg-yellow-500 hover:bg-yellow-400 text-black'
            }`}
            disabled={!gameRef.current?.game?.player?.alive}
          >
            {isCashingOut 
              ? `Cashing Out... ${Math.floor(cashOutProgress)}%` 
              : `💰 Hold E to Cash Out ($${gameStats.netWorth})`
            }
          </button>
        </div>
      )}

      {/* Controls */}
      {!isGameOver && showControls && settings.showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30">
          <div className="text-xs text-gray-300 text-center space-y-1">
            <div>🖱️ Move mouse to control • 💰 Collect orbs for growth</div>
            <div>⚔️ Eliminate smaller players • 💵 Only kills give money</div>
            <div>👑 Bounty players give bonus rewards</div>
          </div>
        </div>
      )}
      
      {/* Live Ping Monitor */}
      {!isGameOver && settings.showPingMonitor && (
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-gray-600/30">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 rounded-full animate-pulse bg-green-400"></div>
            <span className="text-gray-300">Ping:</span>
            <span className={`font-bold ${
              ping < 50 ? 'text-green-400' : 
              ping < 100 ? 'text-yellow-400' : 
              ping < 200 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {ping}ms
            </span>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-gray-900 rounded-2xl p-8 border border-cyan-400/30 text-center max-w-md">
            <div className="text-3xl font-bold mb-4 text-red-400">
              {gameResult}
            </div>
            
            <div className="text-gray-300 mb-6 space-y-2">
              <p>Final Net Worth: <span className="text-green-400 font-bold">${gameStats.netWorth}</span></p>
              <p>Final Rank: <span className="text-cyan-400">#{gameStats.rank}</span></p>
              <p>K/D Ratio: <span className="text-yellow-400">{gameStats.kills}/{gameStats.deaths}</span></p>
              <p>Best Streak: <span className="text-orange-400">{gameStats.streak} 🔥</span></p>
            </div>

            <div className="space-y-3">
              <button
                onClick={restartGame}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Play Again
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Cash Out Success Popup */}
      {showCashOutSuccess && cashOutDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-green-400/30 shadow-2xl transform animate-in">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400/50">
                <div className="text-4xl animate-bounce">💰</div>
              </div>
              <h2 className="text-3xl font-bold text-green-400 mb-2">Cash Out Successful!</h2>
              <p className="text-green-200 text-sm">You've successfully survived and cashed out</p>
            </div>

            {/* Earnings Breakdown */}
            <div className="bg-black/30 rounded-lg p-4 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Gross Earnings:</span>
                  <span className="text-white font-bold">${Math.floor(cashOutDetails.originalAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Platform Fee (10%):</span>
                  <span className="text-red-400 font-bold">-${Math.floor(cashOutDetails.platformFee)}</span>
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-400 font-bold text-lg">Net Payout:</span>
                    <span className="text-green-400 font-bold text-xl">${Math.floor(cashOutDetails.finalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{cashOutDetails.kills}</div>
                <div className="text-xs text-gray-400">Kills</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{cashOutDetails.streak}</div>
                <div className="text-xs text-gray-400">Max Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{Math.floor(cashOutDetails.playTime)}s</div>
                <div className="text-xs text-gray-400">Survived</div>
              </div>
            </div>

            {/* Performance Message */}
            <div className="text-center mb-6">
              <p className="text-green-300 text-sm">
                {cashOutDetails.finalAmount > 500 ? "🏆 Incredible performance!" :
                 cashOutDetails.finalAmount > 200 ? "🎯 Great job surviving!" :
                 "🎮 Better luck next time!"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handlePlayAgain}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>🎮</span>
                <div className="text-center">
                  <div>Play Again</div>
                  <div className="text-xs opacity-75">${initialLobbyFee} entry fee</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowCashOutSuccess(false)
                  setCashOutDetails(null)
                  window.location.href = '/'
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>🏠</span>
                <span>Main Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game canvas and other content remains above */}
    </div>
  )
}

export default AgarIOGame