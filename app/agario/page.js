'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGameSettings } from '@/components/providers/GameSettingsProvider'
import { usePrivy } from '@privy-io/react-auth'
import { io } from 'socket.io-client'
import OrientationGate from '@/components/ui/OrientationGate'

const AgarIOGame = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const socketRef = useRef(null)
  const lastMousePosition = useRef({ x: 0, y: 0 }) // Track mouse for split direction
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

  // FIXED: Mobile detection with proper initialization state tracking
  const [isMobile, setIsMobile] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isLandscape, setIsLandscape] = useState(true)
  const [showOrientationGate, setShowOrientationGate] = useState(false)
  const [mobileDetectionComplete, setMobileDetectionComplete] = useState(false) // NEW: Track when detection is done
  const [gameInitializationComplete, setGameInitializationComplete] = useState(false) // NEW: Track when game is fully initialized
  
  // Mobile HUD state
  const [mobileUIFaded, setMobileUIFaded] = useState(false)
  const [minimapCollapsed, setMinimapCollapsed] = useState(true) // Default collapsed on mobile
  const [statsCollapsed, setStatsCollapsed] = useState(true) // Default collapsed on mobile
  const [leaderboardCollapsed, setLeaderboardCollapsed] = useState(true) // Default collapsed on mobile
  const [instructionsVisible, setInstructionsVisible] = useState(true)
  const [showInstructionsIcon, setShowInstructionsIcon] = useState(false)
  const [missionToastVisible, setMissionToastVisible] = useState(false)
  const [missionIconVisible, setMissionIconVisible] = useState(false)
  const [missionToast, setMissionToast] = useState(null)
  
  // Joystick refs and state
  const joystickRef = useRef(null)
  const joystickKnobRef = useRef(null)
  const touchIdRef = useRef(null)
  const minimapCanvasRef = useRef(null)
  
  // Mobile control state
  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 })
  const [showCurrentMission, setShowCurrentMission] = useState(false)
  
  // Enhanced game features
  const [coinAnimations, setCoinAnimations] = useState([]) // For animated coin pickups
  const [killStreakAnnouncements, setKillStreakAnnouncements] = useState([])
  const [currentMission, setCurrentMission] = useState(null)
  const [missionProgress, setMissionProgress] = useState(0)
  
  // Split mechanic state
  const [splitCooldown, setSplitCooldown] = useState(0)
  const [splitCooldownActive, setSplitCooldownActive] = useState(false)
  const [lastSplitTime, setLastSplitTime] = useState(0)
  const [liveEventFeed, setLiveEventFeed] = useState([])
  const [territoryGlowIntensity, setTerritoryGlowIntensity] = useState(0.3)
  const [initialLobbyFee, setInitialLobbyFee] = useState(100) // Track the entry fee for this lobby
  
  // Player customization state
  const [playerCustomization, setPlayerCustomization] = useState({
    skin: 'default_blue'
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

  // FIXED: Enhanced Mobile Detection with completion tracking
  useEffect(() => {
    const detectMobileDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      console.log('🎮 Mobile Detection Starting:', {
        viewportSize: `${viewportWidth}x${viewportHeight}`,
        ratio: (viewportWidth / viewportHeight).toFixed(2),
        userAgent: userAgent.includes('Mobile') || userAgent.includes('Android')
      })
      
      // Simple mobile detection based on screen size and basic user agent check
      const isMobileUserAgent = /Mobi|Android/i.test(userAgent)
      const isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isNarrowViewport = viewportWidth <= 768
      
      // Simple mobile detection
      const isMobileDevice = isMobileUserAgent || isTouchCapable || isNarrowViewport
      const isCurrentlyLandscape = viewportWidth > viewportHeight
      
      console.log('📱 Mobile Detection Complete:', {
        isMobileDevice,
        isCurrentlyLandscape,
        shouldShowOrientationGate: isMobileDevice && !isCurrentlyLandscape,
        mobileDetectionComplete: true // NEW: Log completion
      })
      
      setIsTouchDevice(isTouchCapable)
      setIsMobile(isMobileDevice)
      setIsLandscape(isCurrentlyLandscape)
      setShowOrientationGate(isMobileDevice && !isCurrentlyLandscape)
      
      // CRITICAL: Mark mobile detection as complete
      setMobileDetectionComplete(true)
      
      // Add mobile game body class for scroll prevention
      if (isMobileDevice) {
        document.body.classList.add('mobile-game-active')
      } else {
        document.body.classList.remove('mobile-game-active')
      }
    }
    
    detectMobileDevice()
    window.addEventListener('resize', detectMobileDevice)
    window.addEventListener('orientationchange', () => {
      // Small delay to allow orientation change to complete
      setTimeout(detectMobileDevice, 200)
    })
    
    return () => {
      window.removeEventListener('resize', detectMobileDevice)
      window.removeEventListener('orientationchange', detectMobileDevice)
      document.body.classList.remove('mobile-game-active')
    }
  }, [])

  // Prevent mobile scrolling
  useEffect(() => {
    if (!isMobile) return

    const preventScroll = (e) => {
      e.preventDefault()
      return false
    }

    document.addEventListener('touchmove', preventScroll, { passive: false })
    document.addEventListener('wheel', preventScroll, { passive: false })

    return () => {
      document.removeEventListener('touchmove', preventScroll)
      document.removeEventListener('wheel', preventScroll)
    }
  }, [isMobile])

  // FIXED: Game initialization with proper mobile detection timing
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
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (gameRef.current) {
        gameRef.current.cleanup()
      }
      // Clean up Socket.IO connection
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // FIXED: Game initialization that waits for mobile detection completion
  useEffect(() => {
    // CRITICAL: Don't initialize game until mobile detection is complete
    if (!mobileDetectionComplete) {
      console.log('⏳ Game initialization waiting for mobile detection to complete...')
      return
    }
    
    console.log('🎮 Game initialization triggered - Mobile detection complete:', { 
      isMobile, 
      isTouchDevice, 
      mobileDetectionComplete 
    })
    
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
          if (process.env.NODE_ENV === 'development') {
            console.error('🔄 Multiplayer failed, falling back to offline mode:', error)
          }
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
      clearTimeout(controlsTimer)
      clearInterval(pingInterval)
    }
  }, [mobileDetectionComplete, isMobile, isTouchDevice, user, getAccessToken]) // CRITICAL: Include mobileDetectionComplete dependency

  // CRITICAL: Mission initialization that waits for both mobile detection AND game initialization
  useEffect(() => {
    // Don't start missions until both mobile detection and game initialization are complete
    if (!mobileDetectionComplete || !gameInitializationComplete) {
      console.log('⏳ Mission initialization waiting...', { 
        mobileDetectionComplete, 
        gameInitializationComplete 
      })
      return
    }
    
    console.log('🎯 Mission system ready to start - both mobile detection and game initialization complete')
    
    // Start first mission after 5 seconds (shorter delay since we know everything is ready)
    const firstMissionTimer = setTimeout(() => {
      if (gameRef.current?.game?.running && !currentMission) {
        console.log('🎯 Starting first mission (delayed start)')
        generateMission()
      }
    }, 5000)
    
    // Generate new missions every 2 minutes 
    const missionInterval = setInterval(() => {
      if (gameRef.current?.game?.running && !currentMission) {
        console.log('🎯 Generating new mission (interval)')
        generateMission()
      }
    }, 120000)
    
    // Clean up on unmount or when dependencies change
    return () => {
      clearTimeout(firstMissionTimer)
      clearInterval(missionInterval)
    }
  }, [mobileDetectionComplete, gameInitializationComplete]) // Wait for both completion flags, but don't include currentMission to avoid infinite loops

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
      case 'default_blue':
      case 'classic_blue':
        return { 
          fillStyle: 'linear-gradient(45deg, #67E8F9 0%, #3B82F6 50%, #1E40AF 100%)',
          solidColor: '#3B82F6',
          hasSpecialEffect: false
        }
      case 'basic_red':
        return { 
          fillStyle: 'linear-gradient(45deg, #FCA5A5 0%, #EF4444 50%, #DC2626 100%)',
          solidColor: '#EF4444',
          hasSpecialEffect: false
        }
      case 'basic_green':
        return { 
          fillStyle: 'linear-gradient(45deg, #86EFAC 0%, #22C55E 50%, #16A34A 100%)',
          solidColor: '#22C55E',
          hasSpecialEffect: false
        }
      case 'basic_yellow':
        return { 
          fillStyle: 'linear-gradient(45deg, #FEF08A 0%, #EAB308 50%, #CA8A04 100%)',
          solidColor: '#EAB308',
          hasSpecialEffect: false
        }
      case 'basic_purple':
        return { 
          fillStyle: 'linear-gradient(45deg, #C4B5FD 0%, #8B5CF6 50%, #7C3AED 100%)',
          solidColor: '#8B5CF6',
          hasSpecialEffect: false
        }
      case 'basic_orange':
        return { 
          fillStyle: 'linear-gradient(45deg, #FDBA74 0%, #F97316 50%, #EA580C 100%)',
          solidColor: '#F97316',
          hasSpecialEffect: false
        }
      case 'rainbow_hologram':
        return { 
          fillStyle: 'linear-gradient(45deg, #EF4444 0%, #8B5CF6 50%, #3B82F6 100%)',
          solidColor: '#8B5CF6',
          hasSpecialEffect: true
        }
      case 'chrome_steel':
        return { 
          fillStyle: 'linear-gradient(45deg, #E5E7EB 0%, #F3F4F6 50%, #9CA3AF 100%)',
          solidColor: '#E5E7EB',
          hasSpecialEffect: false
        }
      case 'matte_blue':
        return { 
          fillStyle: '#2563EB',
          solidColor: '#2563EB',
          hasSpecialEffect: false
        }
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
      default: // fallback to default blue
        return { 
          fillStyle: 'linear-gradient(45deg, #67E8F9 0%, #3B82F6 50%, #1E40AF 100%)',
          solidColor: '#3B82F6',
          hasSpecialEffect: false
        }
    }
  }

  const getPlayerFaceStyle = () => {
    return playerCustomization.face || 'normal_eyes'
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
          console.log('Agario: Loaded player customization:', customizationData)
        }
      } catch (error) {
        console.error('Agario: Failed to load customization:', error)
        // Reset to defaults if there's an error
        setPlayerCustomization({
          skin: 'default_blue'
        })
      }
    }

    // Initial load
    loadCustomization()

    // Listen for customization changes from the modal
    const handleCustomizationChange = (event) => {
      console.log('Agario: Customization changed:', event.detail)
      setPlayerCustomization({
        skin: event.detail.skin || 'default_blue'
      })
    }

    window.addEventListener('playerCustomizationChanged', handleCustomizationChange)
    
    // Also listen for localStorage changes (in case of external updates)
    window.addEventListener('storage', loadCustomization)

    return () => {
      window.removeEventListener('playerCustomizationChanged', handleCustomizationChange)
      window.removeEventListener('storage', loadCustomization)
    }
  }, [])

  // Handle keyboard input for cash-out and split
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && !isCashingOut && gameRef.current?.game?.player?.alive) {
        startCashOut()
      }
      
      // Split functionality - Space key
      if (e.code === 'Space' && gameRef.current?.game?.player?.alive) {
        e.preventDefault() // Prevent page scroll
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          // Use current mouse position or center of screen
          const mouseX = lastMousePosition.current?.x || rect.width / 2
          const mouseY = lastMousePosition.current?.y || rect.height / 2
          
          // Convert screen coordinates to world coordinates
          const game = gameRef.current.game
          const worldX = mouseX - rect.width / 2 + game.camera.x
          const worldY = mouseY - rect.height / 2 + game.camera.y
          
          handleSplit(worldX, worldY)
        }
      }
    }

    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'e' && isCashingOut) {
        cancelCashOut()
      }
    }

    // Right-click for split (optional)
    const handleContextMenu = (e) => {
      if (gameRef.current?.game?.player?.alive) {
        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          const worldX = e.clientX - rect.left - rect.width / 2 + gameRef.current.game.camera.x
          const worldY = e.clientY - rect.top - rect.height / 2 + gameRef.current.game.camera.y
          handleSplit(worldX, worldY)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    if (canvasRef.current) {
      canvasRef.current.addEventListener('contextmenu', handleContextMenu)
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('contextmenu', handleContextMenu)
      }
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
      { type: 'collect', target: 20, duration: 30000, reward: 115, description: 'Collect 20 coins in 30 seconds' },
      { type: 'survive', target: 60000, duration: 60000, reward: 130, description: 'Survive for 60 seconds' },
      { type: 'eliminate', target: 3, duration: 45000, reward: 900, description: 'Eliminate 3 players in 45 seconds' },
      { type: 'mass', target: 500, duration: 40000, reward: 200, description: 'Reach 500 mass in 40 seconds' }
    ]
    
    const mission = missions[Math.floor(Math.random() * missions.length)]
    mission.id = Date.now()
    mission.startTime = Date.now()
    mission.progress = 0
    
    console.log('🎯 Generated new mission:', mission.description, 'Duration:', mission.duration/1000, 'seconds')
    
    setCurrentMission(mission)
    setMissionProgress(0)
    
    // CRITICAL: Store mission in game object for game loop access
    if (gameRef.current?.game) {
      gameRef.current.game.currentMission = mission
      console.log('🎯 Mission stored in game object for loop access')
    }
    
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

  const completeMission = async (mission) => {
    if (gameRef.current?.game?.player) {
      // Add to local game balance immediately
      gameRef.current.game.player.netWorth += mission.reward
      
      // Add visual feedback
      addFloatingText(`Mission Complete! +${mission.reward} Coins`, gameRef.current.game.player.x, gameRef.current.game.player.y - 60, '#00FF00')
      addToKillFeed(`Mission completed: ${mission.description} (+${mission.reward} Coins)`)
      
      // Save reward to player's persistent account
      try {
        const response = await fetch('/api/users/add-mission-reward', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: gameRef.current.game.player.userId || 'demo-user',
            missionType: mission.type,
            rewardAmount: mission.reward,
            missionDescription: mission.description,
            completedAt: new Date().toISOString()
          }),
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('✅ Mission reward saved to account:', result)
          
          // Dispatch event to update landing page balance in real-time
          window.dispatchEvent(new CustomEvent('missionRewardEarned', {
            detail: {
              rewardAmount: mission.reward,
              newBalance: result.newBalance,
              missionType: mission.type,
              description: mission.description
            }
          }))
          
          // Mission reward saved to account successfully
          if (result.newBalance !== undefined) {
            console.log(`💰 Account balance updated: ${result.newBalance} coins`)
          }
        } else {
          console.error('❌ Failed to save mission reward:', response.statusText)
        }
      } catch (error) {
        console.error('❌ Error saving mission reward:', error)
        // Mission reward still applies locally even if save fails
      }
    }
    setCurrentMission(null)
  }

  // Split Mechanic Functions
  const canPlayerSplit = (player) => {
    // Safe version that doesn't depend on config - use hardcoded constants
    const MIN_SPLIT_MASS = 36
    const MAX_CELLS = 16
    const SPLIT_COOLDOWN = 750
    
    // Check if player has any cells that can split
    return player && player.cells && 
           player.cells.length < MAX_CELLS && 
           player.cells.some(cell => cell.mass >= MIN_SPLIT_MASS) &&
           (Date.now() - (player.lastSplitTime || 0)) >= SPLIT_COOLDOWN
  }

  const calculateSplitDirection = (targetCell, mouseX, mouseY) => {
    // Calculate direction from cell center to mouse position
    const dx = mouseX - targetCell.x
    const dy = mouseY - targetCell.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) {
      // Default direction if no mouse movement
      return { x: 1, y: 0 }
    }
    
    return {
      x: dx / distance,
      y: dy / distance
    }
  }

  const performSplit = (cellToSplit, direction, game) => {
    // Safe version with hardcoded constants
    const MIN_SPLIT_MASS = 36
    const SPLIT_BASE_SPEED = 1800
    const SPLIT_MIN_VELOCITY = 400
    const SPLIT_MAX_VELOCITY = 1600
    const MERGE_MIN_TIME = 12000
    
    if (!cellToSplit || cellToSplit.mass < MIN_SPLIT_MASS) {
      return false
    }

    const player = game.player
    
    // Calculate new masses (50/50 split)
    const newMass = Math.floor(cellToSplit.mass / 2)
    const remainingMass = cellToSplit.mass - newMass
    
    // Calculate initial velocity based on mass
    const initialSpeed = Math.min(
      Math.max(
        SPLIT_BASE_SPEED / Math.sqrt(newMass),
        SPLIT_MIN_VELOCITY
      ),
      SPLIT_MAX_VELOCITY
    )
    
    // Calculate safe spawn position
    const cellRadius = Math.sqrt(remainingMass / Math.PI) * 8
    const newRadius = Math.sqrt(newMass / Math.PI) * 8
    const spawnDistance = cellRadius + newRadius + 5 // 5px safety margin
    
    const newX = cellToSplit.x + direction.x * spawnDistance
    const newY = cellToSplit.y + direction.y * spawnDistance
    
    // Check world boundaries
    const worldRadius = config.worldSize / 2
    const distanceFromCenter = Math.sqrt(newX * newX + newY * newY)
    if (distanceFromCenter + newRadius > worldRadius) {
      // Don't split if it would spawn outside world
      return false
    }
    
    // Update original cell
    cellToSplit.mass = remainingMass
    cellToSplit.radius = cellRadius
    
    // Create new cell
    const newCell = {
      id: `split_${Date.now()}_${Math.random()}`,
      x: newX,
      y: newY,
      mass: newMass,
      radius: newRadius,
      velocity: {
        x: direction.x * initialSpeed,
        y: direction.y * initialSpeed
      },
      splitTime: Date.now(),
      mergeLocked: true // Can't merge for 12 seconds
    }
    
    // Add new cell to player
    player.cells.push(newCell)
    
    // Update player totals
    player.totalMass = player.cells.reduce((total, cell) => total + cell.mass, 0)
    player.lastSplitTime = Date.now()
    
    // Set merge lock timer for both cells
    setTimeout(() => {
      if (cellToSplit) cellToSplit.mergeLocked = false
      if (newCell) newCell.mergeLocked = false
    }, MERGE_MIN_TIME)
    
    return true
  }

  const handleSplit = (mouseX = null, mouseY = null) => {
    // Safe version with hardcoded constants
    const MIN_SPLIT_MASS = 36
    const SPLIT_COOLDOWN = 750
    
    if (!gameRef.current?.game?.player || !canPlayerSplit(gameRef.current.game.player)) {
      // Show feedback for denied split
      setSplitCooldownActive(true)
      setTimeout(() => setSplitCooldownActive(false), 300) // Shake effect
      return
    }

    const game = gameRef.current.game
    const player = game.player
    
    // Find the largest cell to split
    const cellToSplit = player.cells.reduce((largest, cell) => {
      if (cell.mass >= MIN_SPLIT_MASS && (!largest || cell.mass > largest.mass)) {
        return cell
      }
      return largest
    }, null)
    
    if (!cellToSplit) return
    
    // Calculate direction
    let direction
    if (mouseX !== null && mouseY !== null) {
      // Desktop: use mouse position
      direction = calculateSplitDirection(cellToSplit, mouseX, mouseY)
    } else if (player.dir && (player.dir.x !== 0 || player.dir.y !== 0)) {
      // Mobile: use movement direction
      const length = Math.sqrt(player.dir.x * player.dir.x + player.dir.y * player.dir.y)
      direction = { x: player.dir.x / length, y: player.dir.y / length }
    } else {
      // Default direction
      direction = { x: 1, y: 0 }
    }
    
    // Perform the split
    if (performSplit(cellToSplit, direction, game)) {
      // Set cooldown
      setSplitCooldown(SPLIT_COOLDOWN)
      setSplitCooldownActive(true)
      
      // Visual/Audio feedback
      console.log('🔄 Split performed!')
      
      // Clear cooldown
      setTimeout(() => {
        setSplitCooldown(0)
        setSplitCooldownActive(false)
      }, SPLIT_COOLDOWN)
    }
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
      // Also reset game session to ensure clean state
      setGameSession({
        startTime: Date.now(),
        endTime: null,
        kills: 0,
        survived: false,
        cashedOut: false,
        earnings: 0,
        playTimeSeconds: 0,
        coinsCollected: 0 // Reset coins collected to 0
      })
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

  // COMPLETELY NEW SIMPLIFIED JOYSTICK SYSTEM - Step by step debugging
  const handleJoystickStart = (e) => {
    console.log('🕹️ === JOYSTICK START - STEP BY STEP DEBUG ===')
    console.log('Step 1: Event received:', e.type, 'at coordinates:', e.clientX, e.clientY)
    
    try {
      e.preventDefault()
      e.stopPropagation()
      console.log('Step 2: Event prevented and propagation stopped')
      
      if (!isMobile) {
        console.log('❌ BLOCKED: Not mobile device')
        return
      }
      
      if (!joystickRef.current) {
        console.log('❌ BLOCKED: No joystick ref')
        return
      }
      
      console.log('Step 3: Passed mobile and ref checks')
      
      const rect = joystickRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      console.log('Step 4: Joystick center calculated:', { centerX, centerY, rectWidth: rect.width, rectHeight: rect.height })
      
      // Set active state
      console.log('Step 5: Setting joystick active...')
      setJoystickActive(true)
      setMobileUIFaded(false)
      touchIdRef.current = e.pointerId
      
      console.log('Step 6: Active state set. touchId:', touchIdRef.current)
      
      const handleJoystickMove = (moveEvent) => {
        console.log('🎮 MOVE EVENT:', moveEvent.type, 'PointerID:', moveEvent.pointerId, 'Expected:', touchIdRef.current)
        
        try {
          moveEvent.preventDefault()
          
          // FIXED: More flexible pointer ID checking for mobile compatibility
          if (touchIdRef.current !== null && moveEvent.pointerId !== touchIdRef.current) {
            console.log('⚠️ Pointer ID mismatch, but continuing anyway for mobile compatibility')
            // Don't return - continue processing for mobile devices
          }
          
          const deltaX = moveEvent.clientX - centerX
          const deltaY = moveEvent.clientY - centerY
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
          const clampedDistance = Math.min(distance, 40) // Clamp to 40px radius
          const angle = Math.atan2(deltaY, deltaX)
          
          const knobX = Math.cos(angle) * clampedDistance
          const knobY = Math.sin(angle) * clampedDistance
          
          console.log('🎯 MOVEMENT CALCULATION:', {
            deltaX: Math.round(deltaX),
            deltaY: Math.round(deltaY), 
            distance: Math.round(distance),
            clampedDistance: Math.round(clampedDistance),
            knobX: Math.round(knobX),
            knobY: Math.round(knobY)
          })
          
          // CRITICAL: Update state immediately
          console.log('📊 UPDATING JOYSTICK POSITION STATE...')
          setJoystickPosition({ x: knobX, y: knobY })
          console.log('✅ State update called with:', { x: knobX, y: knobY })
          
          // CRITICAL: Force immediate visual update
          if (joystickKnobRef.current) {
            const transform = `translate(-50%, -50%) translate(${knobX}px, ${knobY}px)`
            joystickKnobRef.current.style.transform = transform
            console.log('✅ VISUAL UPDATE: Applied transform:', transform)
          } else {
            console.error('❌ VISUAL FAILED: joystickKnobRef.current is null!')
          }
          
          // Send movement to game if distance is significant
          if (clampedDistance > 5) {
            const normalizedX = knobX / 40
            const normalizedY = knobY / 40
            
            console.log('🎮 SENDING TO GAME:', { normalizedX: normalizedX.toFixed(2), normalizedY: normalizedY.toFixed(2) })
            
            // COMPREHENSIVE GAME MOVEMENT - Check all possible states
            console.log('🔍 === GAME MOVEMENT DEBUG ===')
            console.log('gameRef.current exists:', !!gameRef.current)
            
            // Multiple checks to ensure we find the player
            let player = null
            let foundPath = null
            
            // Check different possible paths
            if (gameRef.current?.game?.player) {
              player = gameRef.current.game.player
              foundPath = 'gameRef.current.game.player'
            } else if (gameRef.current?.player) {
              player = gameRef.current.player
              foundPath = 'gameRef.current.player'
            } else if (gameRef.current?.game) {
              console.log('🔍 Game object exists, keys:', Object.keys(gameRef.current.game))
              if (gameRef.current.game.player) {
                player = gameRef.current.game.player
                foundPath = 'gameRef.current.game.player (retry)'
              }
            }
            
            if (player) {
              console.log('✅ PLAYER FOUND at', foundPath)
              console.log('  - Player alive:', player.alive)
              console.log('  - Current position:', { x: player.x, y: player.y })
              console.log('  - Current direction:', player.dir)
              
              // Update player direction (primary movement method)
              if (player.alive) {
                const oldDir = { ...player.dir }
                player.dir = { x: normalizedX, y: normalizedY }
                console.log('✅ MOVEMENT APPLIED:', { 
                  old: oldDir, 
                  new: player.dir,
                  normalized: { x: normalizedX.toFixed(2), y: normalizedY.toFixed(2) }
                })
                
                // Force immediate visual update by triggering game loop
                if (gameRef.current?.game?.running) {
                  console.log('✅ Game is running - movement should be visible')
                } else {
                  console.log('⚠️ Game not running - starting game loop')
                }
              } else {
                console.log('❌ Player is dead, cannot move')
              }
              
            } else {
              console.error('❌ CRITICAL: Player not found in any path!')
              if (gameRef.current) {
                console.log('Available gameRef keys:', Object.keys(gameRef.current))
                if (gameRef.current.game) {
                  console.log('Available game keys:', Object.keys(gameRef.current.game))
                } else {
                  console.log('❌ No game object found')
                }
              } else {
                console.log('❌ gameRef.current is null/undefined')
              }
            }
          }
          
        } catch (error) {
          console.error('❌ MOVE EVENT ERROR:', error)
        }
      }
      
      const handleJoystickEnd = (endEvent) => {
        console.log('🛑 JOYSTICK END')
        
        try {
          endEvent.preventDefault()
          if (endEvent.pointerId !== touchIdRef.current) return
          
          console.log('📊 RESETTING JOYSTICK...')
          setJoystickActive(false)
          setJoystickPosition({ x: 0, y: 0 })
          touchIdRef.current = null
          
          // Reset visual position
          if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform = 'translate(-50%, -50%)'
            console.log('✅ VISUAL RESET: Knob returned to center')
          }
          
          // Stop player movement - FIXED path
          if (gameRef.current?.game?.player) {
            const player = gameRef.current.game.player
            if (player.dir) {
              player.dir = { x: 0, y: 0 }
            }
            console.log('✅ PLAYER MOVEMENT STOPPED')
          }
          
          // Remove event listeners
          document.removeEventListener('pointermove', handleJoystickMove, { passive: false })
          document.removeEventListener('pointerup', handleJoystickEnd, { passive: false })
          document.removeEventListener('pointercancel', handleJoystickEnd, { passive: false })
          
          setTimeout(() => setMobileUIFaded(true), 2000)
          
        } catch (error) {
          console.error('❌ END EVENT ERROR:', error)
        }
      }
      
      // Add event listeners
      console.log('Step 7: Adding event listeners...')
      document.addEventListener('pointermove', handleJoystickMove, { passive: false })
      document.addEventListener('pointerup', handleJoystickEnd, { passive: false })
      document.addEventListener('pointercancel', handleJoystickEnd, { passive: false })
      console.log('✅ Event listeners added successfully')
      
    } catch (error) {
      console.error('❌ JOYSTICK START ERROR:', error)
    }
  }

  // Mobile cash-out button handlers - FIXED for mobile
  const handleCashOutStart = (e) => {
    console.log('💰 Cash-out Start - Mobile touch detected')
    
    try {
      e.preventDefault()
      e.stopPropagation()
      
      if (!isMobile || isCashingOut) {
        console.log('❌ Cash-out blocked: isMobile =', isMobile, 'isCashingOut =', isCashingOut)
        return
      }
      
      setMobileUIFaded(false)
      
      // Start cash-out process - FIXED to call the correct function
      console.log('🎯 Starting cash-out process...')
      startCashOut()
      
    } catch (error) {
      console.error('❌ Cash-out start error:', error)
    }
  }

  const handleCashOutEnd = (e) => {
    console.log('💰 Cash-out End - Mobile touch released')
    
    try {
      e.preventDefault()
      
      if (!isMobile) return
      
      // Cancel cash-out if in progress - FIXED logic
      if (isCashingOut) {
        console.log('🛑 Cancelling cash-out...')
        cancelCashOut()
      }
      
    } catch (error) {
      console.error('❌ Cash-out end error:', error)
    }
  }

  // Mobile action button handlers
  const handleSplitStart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isMobile || !gameRef.current) return
    
    setMobileUIFaded(false)
    
    // Get game and player
    const game = gameRef.current.game
    const player = game?.player
    
    if (!player || !player.alive) return
    
    // Check if player can split using the same logic as desktop
    if (canPlayerSplit(player)) {
      console.log('🔥 Mobile split triggered - performing split')
      
      // For mobile, use joystick direction or default forward direction
      let targetX, targetY
      
      if (joystickActive && (joystickPosition.x !== 0 || joystickPosition.y !== 0)) {
        // Use joystick direction if active
        const distance = 100 // Projection distance
        const largestCell = player.cells.reduce((largest, cell) => 
          (!largest || cell.mass > largest.mass) ? cell : largest, null)
        
        if (largestCell) {
          targetX = largestCell.x + joystickPosition.x * distance
          targetY = largestCell.y + joystickPosition.y * distance
        }
      } else {
        // Use forward direction (right) as default for mobile
        const largestCell = player.cells.reduce((largest, cell) => 
          (!largest || cell.mass > largest.mass) ? cell : largest, null)
        
        if (largestCell) {
          targetX = largestCell.x + 100
          targetY = largestCell.y
        }
      }
      
      // Call the actual split function
      if (targetX !== undefined && targetY !== undefined) {
        handleSplit(targetX, targetY)
      }
    } else {
      console.log('🚫 Mobile split denied - conditions not met')
      // Show visual feedback for denied split
      setSplitCooldownActive(true)
      setTimeout(() => setSplitCooldownActive(false), 300)
    }
  }

  const handleSplitEnd = (e) => {
    e.preventDefault()
  }

  const handleEjectStart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isMobile || !gameRef.current) return
    
    setMobileUIFaded(false)
    // Trigger eject mass action (similar to desktop 'W' key) - FIXED path
    if (gameRef.current?.game?.player?.mass > 15) {
      // Eject mass logic here
      console.log('💨 Mobile eject triggered')
    }
  }

  const handleEjectEnd = (e) => {
    e.preventDefault()
  }

  // Mobile UI fade management with mission toast handling
  useEffect(() => {
    if (!isMobile) return
    
    let fadeTimeout
    let instructionsTimeout
    let missionToastTimeout
    
    const handleActivity = () => {
      setMobileUIFaded(false)
      clearTimeout(fadeTimeout)
      fadeTimeout = setTimeout(() => setMobileUIFaded(true), 3000)
    }
    
    // Hide instructions after 5 seconds on mobile and show icon (reduced from 7s)
    instructionsTimeout = setTimeout(() => {
      setInstructionsVisible(false)
      setShowInstructionsIcon(true)
    }, 5000)
    
    // Show mission toast when new mission appears
    if (currentMission && !missionToastVisible) {
      setMissionToastVisible(true)
      // Hide toast after 3 seconds and show icon
      missionToastTimeout = setTimeout(() => {
        setMissionToastVisible(false)
        setMissionIconVisible(true)
      }, 3000)
    }
    
    // Clear mission states when mission ends
    if (!currentMission) {
      setMissionToastVisible(false)
      setMissionIconVisible(false)
    }
    
    document.addEventListener('pointerdown', handleActivity, { passive: false })
    document.addEventListener('pointermove', handleActivity, { passive: false })
    
    return () => {
      clearTimeout(fadeTimeout)
      clearTimeout(instructionsTimeout)
      clearTimeout(missionToastTimeout)
      document.removeEventListener('pointerdown', handleActivity)
      document.removeEventListener('pointermove', handleActivity)
    }
  }, [isMobile, currentMission, missionToastVisible])

  // Mobile scroll and touch prevention
  useEffect(() => {
    if (!isMobile) return
    
    const preventDefault = (e) => {
      e.preventDefault()
      return false
    }
    
    // Prevent all forms of scrolling and zooming on mobile
    document.addEventListener('touchstart', preventDefault, { passive: false })
    document.addEventListener('touchmove', preventDefault, { passive: false })
    document.addEventListener('touchend', preventDefault, { passive: false })
    document.addEventListener('gesturestart', preventDefault, { passive: false })
    document.addEventListener('gesturechange', preventDefault, { passive: false })
    document.addEventListener('gestureend', preventDefault, { passive: false })
    
    // Prevent context menu
    document.addEventListener('contextmenu', preventDefault, { passive: false })
    
    // Set body classes for mobile
    document.body.classList.add('mobile-game-active')
    
    return () => {
      document.removeEventListener('touchstart', preventDefault)
      document.removeEventListener('touchmove', preventDefault)
      document.removeEventListener('touchend', preventDefault)
      document.removeEventListener('gesturestart', preventDefault)
      document.removeEventListener('gesturechange', preventDefault)
      document.removeEventListener('gestureend', preventDefault)
      document.removeEventListener('contextmenu', preventDefault)
      document.body.classList.remove('mobile-game-active')
    }
  }, [isMobile])

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
      virusCount: 60, // Increased virus count for more strategic gameplay (was 25)
      botCount: 15,
      baseSpeed: 400, // Reduced speed for more strategic gameplay (was 648)
      startingNetWorth: 100,
      startingMass: 10,
      orbMassValue: 4.5, // Tripled from 1.5 to 4.5 - much bigger growth per orb
      massPerDollar: 0.8,
      bountyThreshold: 500,
      killReward: 50,
      platformFee: 0.10,
      virusRadius: 25,
      virusSplitThreshold: 35, // Mass threshold to split when hitting virus
      virusHideThreshold: 25, // Mass threshold to hide inside virus

      // Split Mechanic Configuration
      MIN_SPLIT_MASS: 36, // Minimum mass required to split
      SPLIT_BASE_SPEED: 1800, // Base speed for split projection
      SPLIT_MIN_VELOCITY: 400, // Minimum split velocity
      SPLIT_MAX_VELOCITY: 1600, // Maximum split velocity
      SPLIT_FRICTION_TAU: 0.35, // Velocity decay time constant (seconds)
      SPLIT_DURATION: 0.6, // Maximum split projection duration (seconds)
      SPLIT_MIN_VELOCITY_STOP: 80, // Stop projecting when velocity drops below this
      MAX_CELLS: 16, // Maximum cells per player
      SPLIT_COOLDOWN: 750, // Split cooldown in milliseconds
      MERGE_MIN_TIME: 12000, // Time before cells can merge (milliseconds)
      ABSORB_THRESHOLD: 1.25, // Size ratio needed to absorb another cell
      SPIKE_TRIGGER_MASS: 130 // Mass needed to trigger spike burst
    }

    // FIXED: Mobile-aware camera initialization
    const initialCameraZoom = isMobile ? 1.1 : 1.2 // Start with mobile-appropriate zoom
    console.log(`📷 Camera initialized with zoom: ${initialCameraZoom} (isMobile: ${isMobile})`)
    
    // Game state
    const game = {
      player: {
        cells: [{
          id: 'main',
          x: (Math.random() - 0.5) * (config.worldSize * 0.8), // Random spawn within 80% of world
          y: (Math.random() - 0.5) * (config.worldSize * 0.8), // Random spawn within 80% of world
          mass: config.startingMass,
          radius: Math.sqrt(config.startingMass / Math.PI) * 8,
          velocity: { x: 0, y: 0 },
          splitTime: 0, // When this cell was created by split
          mergeLocked: false // If this cell can't merge yet
        }],
        totalMass: config.startingMass,
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
        lastNetWorth: config.startingNetWorth,
        lastSplitTime: 0 // Track last split for cooldown
      },
      bots: [],
      orbs: [],
      viruses: [], // Add virus array
      camera: { x: 0, y: 0, zoom: initialCameraZoom }, // FIXED: Mobile-aware initial zoom
      running: true,
      bounties: new Set(),
      isMultiplayer: isMultiplayer, // Add multiplayer flag to game state
      isMobileGame: isMobile // FIXED: Store mobile state in game object for consistency
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
      
      // Add variety to virus sizes and spike counts (like agario.com)
      const sizeVariation = 0.8 + Math.random() * 0.6 // Size varies from 80% to 140% of base
      const virusRadius = config.virusRadius * sizeVariation
      const spikeCount = 6 + Math.floor(Math.random() * 6) // 6-11 spikes for more variety
      
      game.viruses.push({
        id: i,
        x: x,
        y: y,
        radius: virusRadius,
        color: '#00ff41', // Bright green
        spikes: spikeCount
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
              
              // Update mission progress for collect type - FIXED: Use game.currentMission
              if (game.currentMission && game.currentMission.type === 'collect') {
                console.log('🎯 Collect mission progress update - Current progress:', game.currentMission.progress, 'Target:', game.currentMission.target)
                setCurrentMission(prev => {
                  if (prev) {
                    const newProgress = prev.progress + 1
                    console.log('🎯 New collect progress:', newProgress, '/', prev.target)
                    setMissionProgress(newProgress)
                    // CRITICAL: Update game.currentMission to keep it synchronized
                    const updatedMission = { ...prev, progress: newProgress }
                    game.currentMission = updatedMission
                    if (newProgress >= prev.target) {
                      console.log('🎯 Collect mission completed!')
                      completeMission(updatedMission)
                      game.currentMission = null // Clear from game object too
                      return null // Clear mission when completed
                    }
                    return updatedMission
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
          // Define safe playable area (circular boundary, avoiding red danger zone)
          const playableRadius = config.worldSize * 0.35 // Use 35% of world size as safe radius
          
          // Generate random position within circular playable area
          let x, y, distance
          do {
            x = (Math.random() - 0.5) * (playableRadius * 2)
            y = (Math.random() - 0.5) * (playableRadius * 2)
            distance = Math.sqrt(x * x + y * y)
          } while (distance > playableRadius) // Only accept positions inside safe circle
          
          game.orbs.push({
            id: Math.random(),
            x: x,
            y: y,
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
        
        // FIXED: Dynamic zoom based on player size - Use game's mobile state for consistency
        let targetZoom
        
        if (game.isMobileGame) {
          // Mobile: LESS INTENSIVE Dynamic zoom that scales with player size for better overview
          const baseMass = 10 // Starting mass
          const currentMass = game.player.mass
          const massRatio = currentMass / baseMass
          
          // FIXED: Much less intensive zoom calculation:
          // - Small players (10-50 mass): 1.1 zoom (slightly close)
          // - Medium players (50-200 mass): 0.95-1.0 zoom (almost normal)  
          // - Large players (200+ mass): 0.7-0.8 zoom (moderate zoom out)
          const baseZoom = 1.1 // Reduced from 1.2 to 1.1
          const zoomReduction = Math.min(massRatio * 0.05, 0.4) // Reduced from 0.1 to 0.05, max reduced from 0.7 to 0.4
          targetZoom = Math.max(baseZoom - zoomReduction, 0.7) // Min increased from 0.4 to 0.7 - much less aggressive
          
          console.log(`📱 Mobile Dynamic Zoom (Game State): Mass ${currentMass.toFixed(0)} → Zoom ${targetZoom.toFixed(2)}`)
        } else {
          // Desktop: Keep original fixed zoom
          targetZoom = 1.2 // Much more zoomed in fixed level
        }
        
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

      // Update mission progress for survive type - FIXED: Use game.currentMission
      if (game.currentMission && game.currentMission.type === 'survive') {
        const elapsed = Date.now() - game.currentMission.startTime
        const newProgress = Math.min(elapsed, game.currentMission.target)
        console.log('🎯 Survive mission progress:', Math.floor(newProgress/1000) + 's /', Math.floor(game.currentMission.target/1000) + 's')
        setMissionProgress(newProgress)
        
        // Update the mission state as well
        setCurrentMission(prev => {
          if (prev && prev.type === 'survive') {
            const updatedMission = { ...prev, progress: newProgress }
            // CRITICAL: Update game.currentMission to keep it synchronized
            game.currentMission = updatedMission
            if (newProgress >= prev.target) {
              console.log('🎯 Survive mission completed!')
              completeMission(updatedMission)
              game.currentMission = null // Clear from game object too
              return null // Clear mission when completed
            }
            return updatedMission
          }
          return prev
        })
      }

      // Update mission progress for mass type - FIXED: Use game.currentMission instead of stale state
      if (game.currentMission && game.currentMission.type === 'mass' && game.player.alive) {
        const newProgress = Math.min(game.player.mass, game.currentMission.target)
        console.log('🎯 Mass mission progress:', newProgress, '/', game.currentMission.target)
        setMissionProgress(newProgress)
        
        // Update the mission state as well
        setCurrentMission(prev => {
          if (prev && prev.type === 'mass') {
            const updatedMission = { ...prev, progress: newProgress }
            // CRITICAL: Update game.currentMission to keep it synchronized
            game.currentMission = updatedMission
            if (newProgress >= prev.target) {
              console.log('🎯 Mass mission completed!')
              completeMission(updatedMission)
              game.currentMission = null // Clear from game object too
              return null // Clear mission when completed
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
        
        // Validate virus coordinates before creating gradient
        if (!isFinite(virus.x) || !isFinite(virus.y) || !isFinite(virus.radius) || virus.radius <= 0) {
          console.warn('Invalid virus coordinates:', { x: virus.x, y: virus.y, radius: virus.radius })
          return // Skip this virus if coordinates are invalid
        }
        
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
        const coreRadius = virus.radius * 0.3
        if (isFinite(coreRadius) && coreRadius > 0) {
          const coreGradient = ctx.createRadialGradient(virus.x, virus.y, 0, virus.x, virus.y, coreRadius)
          coreGradient.addColorStop(0, '#88ffcc') // Bright center
          coreGradient.addColorStop(1, 'transparent')
          
          ctx.fillStyle = coreGradient
          ctx.beginPath()
          ctx.arc(virus.x, virus.y, coreRadius * pulseScale, 0, Math.PI * 2)
          ctx.fill()
        }
        
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
        
        // Display balance above all players' heads (including main player)
        if (entity.netWorth > 0) {
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
          
          // Draw border - use different color for main player vs other players
          ctx.strokeStyle = isPlayer ? '#ffff00' : '#00ff88'  // Yellow for main player, green for others
          ctx.lineWidth = 1
          ctx.strokeRect(
            entity.x - textWidth/2 - bgPadding, 
            entity.y - radius - 30 - textHeight/2 - bgPadding, 
            textWidth + bgPadding*2, 
            textHeight + bgPadding*2
          )
          
          // Draw balance text - use different color for main player vs other players
          ctx.fillStyle = isPlayer ? '#ffff00' : '#00ff88'  // Yellow for main player, green for others
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
      
      // Draw floating texts - Filter out Mission Failed for cleaner mobile experience
      if (settings.showFloatingText) {
        floatingTexts
          .filter(text => 
            // Remove Mission Failed text for cleaner mobile experience
            !text.text.includes('Mission Failed')
          )
          .forEach(text => {
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
      
      // Draw enhanced minimap (outside camera transform) - always render for debugging
      console.log('🗺️ Drawing minimap (forced for debugging)')
      drawMinimap()
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

    // Enhanced Minimap with improved contrast and entity differentiation
    const drawMinimap = () => {
      // FIXED: Use game's mobile state for consistency instead of component state
      const baseminimapSize = 200 // Desktop size
      const mobileMinimapSize = baseminimapSize * 0.5 // First reduction: 50% smaller (100px)
      const finalMobileSize = mobileMinimapSize * 0.25 // Additional 75% reduction (25px final)
      const previousMobileSize = finalMobileSize * 3.5 // Previous: Increase mobile minimap by 250% total (25px -> 87.5px)
      const increasedMobileSize = previousMobileSize * 2 // Increase mobile minimap by another 100% (87.5px -> 175px)
      const adjustedMobileSize = increasedMobileSize * 0.75 // NEW: Decrease by 25% (175px -> 131.25px)
      const minimapSize = game.isMobileGame ? adjustedMobileSize : baseminimapSize // Smaller mobile minimap
      
      console.log(`🗺️ Minimap size: ${minimapSize}px (isMobileGame: ${game.isMobileGame})`)
      
      // FIXED: Adjust minimap position on mobile - moved slightly to the right
      const minimapX = game.isMobileGame 
        ? canvas.width - minimapSize - 80 // Move slightly to the right on mobile (was 120, now 80)
        : canvas.width - minimapSize - 20  // Normal position on desktop
      
      const minimapY = 20
      const minimapRadius = minimapSize / 2 - 5 // Adjust radius for larger size
      const centerX = minimapX + minimapSize / 2
      const centerY = minimapY + minimapSize / 2
      
      // World scale factor
      const worldRadius = config.worldSize / 2
      const scale = minimapRadius / worldRadius
      
      ctx.save()
      
      // 1. BACKGROUND - Dark transparent base with better contrast
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)' // Dark background with 70% opacity
      ctx.beginPath()
      ctx.arc(centerX, centerY, minimapRadius + 8, 0, Math.PI * 2)
      ctx.fill()
      
      // 2. OUTER BORDER - Thick, bright neon border
      ctx.strokeStyle = '#00ff41' // Neon green border
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(centerX, centerY, minimapRadius + 5, 0, Math.PI * 2)
      ctx.stroke()
      
      // 3. DANGER ZONE INDICATORS - Red zones on minimap
      const playableRadius = worldRadius * 0.35 // Same as orb spawning radius
      const minimapPlayableRadius = playableRadius * scale
      
      // Show danger zone (area outside playable radius)
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)' // Red tint for danger zones
      ctx.beginPath()
      ctx.arc(centerX, centerY, minimapRadius, 0, Math.PI * 2)
      ctx.fill()
      
      // Show safe zone
      ctx.fillStyle = 'rgba(0, 100, 0, 0.15)' // Green tint for safe zone
      ctx.beginPath()
      ctx.arc(centerX, centerY, minimapPlayableRadius, 0, Math.PI * 2)
      ctx.fill()
      
      // 4. GRID INDICATORS - Subtle sector lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(
          centerX + Math.cos(angle) * minimapRadius,
          centerY + Math.sin(angle) * minimapRadius
        )
        ctx.stroke()
      }
      
      // Clip to circular minimap
      ctx.beginPath()
      ctx.arc(centerX, centerY, minimapRadius, 0, Math.PI * 2)
      ctx.clip()
      
      // 5. COINS - Gold $ symbols instead of tiny dots
      game.orbs.forEach(orb => {
        const minimapOrbX = centerX + (orb.x * scale)
        const minimapOrbY = centerY + (orb.y * scale)
        
        // Check if orb is within minimap bounds
        const distFromCenter = Math.sqrt(
          Math.pow(minimapOrbX - centerX, 2) + Math.pow(minimapOrbY - centerY, 2)
        )
        
        if (distFromCenter <= minimapRadius) {
          ctx.fillStyle = '#FFD700' // Gold color
          ctx.font = 'bold 8px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('$', minimapOrbX, minimapOrbY + 2)
        }
      })
      
      // 6. ENEMY BOTS - Red triangles for better visibility
      game.bots.forEach(bot => {
        if (bot.alive) {
          const minimapBotX = centerX + (bot.x * scale)
          const minimapBotY = centerY + (bot.y * scale)
          
          // Check if bot is within minimap bounds
          const distFromCenter = Math.sqrt(
            Math.pow(minimapBotX - centerX, 2) + Math.pow(minimapBotY - centerY, 2)
          )
          
          if (distFromCenter <= minimapRadius) {
            // Draw triangle for enemies
            ctx.fillStyle = '#FF4444' // Bright red for enemies
            ctx.beginPath()
            ctx.moveTo(minimapBotX, minimapBotY - 4)
            ctx.lineTo(minimapBotX - 3, minimapBotY + 2)
            ctx.lineTo(minimapBotX + 3, minimapBotY + 2)
            ctx.closePath()
            ctx.fill()
            
            // Add outline for better visibility
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      })
      
      // 7. VIRUSES - Gray hexagons
      game.viruses?.forEach(virus => {
        const minimapVirusX = centerX + (virus.x * scale)
        const minimapVirusY = centerY + (virus.y * scale)
        
        const distFromCenter = Math.sqrt(
          Math.pow(minimapVirusX - centerX, 2) + Math.pow(minimapVirusY - centerY, 2)
        )
        
        if (distFromCenter <= minimapRadius) {
          ctx.fillStyle = '#888888' // Gray for obstacles
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3
            const x = minimapVirusX + Math.cos(angle) * 3
            const y = minimapVirusY + Math.sin(angle) * 3
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
        }
      })
      
      // 8. PLAYER - Large glowing cyan circle with ring
      const minimapPlayerX = centerX + (game.player.x * scale)
      const minimapPlayerY = centerY + (game.player.y * scale)
      
      // Validate coordinates before creating gradient
      if (!isFinite(minimapPlayerX) || !isFinite(minimapPlayerY)) {
        console.warn('Invalid minimap player coordinates:', { minimapPlayerX, minimapPlayerY, playerX: game.player.x, playerY: game.player.y, scale })
        return // Skip rendering if coordinates are invalid
      }
      
      // Player glow effect
      const gradient = ctx.createRadialGradient(
        minimapPlayerX, minimapPlayerY, 0,
        minimapPlayerX, minimapPlayerY, 12
      )
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)') // Neon cyan center
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0)') // Fade to transparent
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(minimapPlayerX, minimapPlayerY, 12, 0, Math.PI * 2)
      ctx.fill()
      
      // Player main dot
      ctx.fillStyle = '#00FFFF' // Bright cyan
      ctx.beginPath()
      ctx.arc(minimapPlayerX, minimapPlayerY, 5, 0, Math.PI * 2)
      ctx.fill()
      
      // Player ring indicator
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(minimapPlayerX, minimapPlayerY, 8, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.restore()
      

    }

    // Start game loop
    requestAnimationFrame(gameLoop)

    // Store game reference for cleanup - FIXED: Store the actual game object reference
    gameRef.current = {
      game,           // This now points to the SAME object used in the game loop
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
    
    // REMOVED: Mission initialization moved to separate useEffect with proper timing
    // Missions will now start via the dedicated useEffect that waits for proper initialization
    
    // CRITICAL: Mark game initialization as complete
    console.log('🎮 Game initialization complete - missions will now work properly')
    setGameInitializationComplete(true)
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
    setCurrentMission(null)
    setMissionProgress(0)
    setAutoCashOutTriggered(false) // Reset auto cash out flag
    
    // CRITICAL: Reset initialization state to allow proper re-initialization
    setGameInitializationComplete(false)
    console.log('🔄 Game restart - resetting initialization state')
    
    if (gameRef.current) {
      gameRef.current.cleanup()
    }
    
    // Initialize new game after a brief delay to allow state to settle
    setTimeout(() => {
      initializeGame() // This will set gameInitializationComplete back to true
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
      
      {/* Multiplayer Status - Desktop Only */}
      {isConnected && !isMobile && (
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
      
      {/* Demo Mode Badge - REMOVED for cleaner mobile experience */}
      
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

      {/* Current Mission Display - Desktop Only */}
      {currentMission && !isGameOver && !isMobile && (
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

      {/* Stats Panel - Desktop Only */}
      {!isGameOver && !isMobile && (
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

      {/* Live Leaderboard (All Players) - Desktop Only */}
      {!isGameOver && !isMobile && (
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

      {/* Kill Feed - REMOVED per user request */}
      {/* {killFeed.length > 0 && !isGameOver && settings.showKillFeed && (
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
      )} */}

      {/* Live Event Feed - Desktop Version (unchanged) */}
      {!isGameOver && liveEventFeed.length > 0 && !isMobile && (
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

      {/* Mobile Live Event Feed - Redesigned for top-left mobile experience */}
      {!isGameOver && liveEventFeed.length > 0 && isMobile && (
        <div 
          className={`fixed top-4 left-4 z-30 transition-all duration-300 ${mobileUIFaded ? 'opacity-60' : 'opacity-95'}`}
          style={{
            top: `calc(env(safe-area-inset-top, 0px) + 16px)`,
            left: `calc(env(safe-area-inset-left, 0px) + 16px)`,
            maxWidth: '180px'
          }}
        >
          <div className="bg-black/90 backdrop-blur-sm rounded-xl border border-orange-400/40 overflow-hidden">
            {/* Compact Header */}
            <div className="bg-orange-500/20 px-3 py-1 border-b border-orange-400/20">
              <div className="text-orange-300 font-bold text-xs flex items-center">
                <span className="mr-1">📺</span>
                <span>Live</span>
              </div>
            </div>
            
            {/* Compact Event List */}
            <div className="p-2 space-y-1 max-h-20 overflow-y-auto">
              {liveEventFeed.slice(0, 3).map((event) => ( // Show max 3 events on mobile
                <div 
                  key={event.id} 
                  className={`text-xs px-2 py-1 rounded-lg border ${
                    event.type === 'kill' ? 'bg-red-500/15 text-red-200 border-red-400/20' :
                    event.type === 'cashout' ? 'bg-green-500/15 text-green-200 border-green-400/20' :
                    'bg-blue-500/15 text-blue-200 border-blue-400/20'
                  }`}
                >
                  <div className="truncate">
                    {event.message.length > 25 ? `${event.message.substring(0, 25)}...` : event.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* Cash Out Button - Desktop Only */}
      {!isGameOver && !isMobile && (
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

      {/* Controls - Desktop Only */}
      {!isGameOver && showControls && settings.showControls && !isMobile && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30">
          <div className="text-xs text-gray-300 text-center space-y-1">
            <div>🖱️ Move mouse to control • 💰 Collect orbs for growth</div>
            <div>⚔️ Eliminate smaller players • 💵 Only kills give money</div>
            <div>👑 Bounty players give bonus rewards</div>
          </div>
        </div>
      )}
      
      {/* Live Ping Monitor - Desktop Only */}
      {!isGameOver && settings.showPingMonitor && !isMobile && (
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

      {/* Game Over Screen - Ultra-Minimal Mobile Design */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-20 p-4">
          {/* Ultra-Minimal Mobile Game Over Popup */}
          <div className={`
            ${isMobile 
              ? 'bg-black/95 backdrop-blur-sm rounded-2xl max-w-xs w-full border border-red-400/30 shadow-2xl' 
              : 'bg-gray-900 rounded-2xl p-8 border border-cyan-400/30 max-w-md'
            }
          `}>
            
            {isMobile ? (
              /* REDESIGNED: Enhanced Mobile Layout with Better Stats Display */
              <div className="p-5 text-center">
                {/* Game Result Title with Icon */}
                <div className="text-xl font-bold mb-4 text-red-400 flex items-center justify-center space-x-3">
                  <span className="text-2xl">
                    {gameResult.includes('Eliminated') ? '💀' : 
                     gameResult.includes('Tab Closed') ? '🚪' : '💔'}
                  </span>
                  <span>
                    {gameResult.includes('Eliminated') ? 'Eliminated' :
                     gameResult.includes('Tab Closed') ? 'Game Left' : 'Game Over'}
                  </span>
                </div>
                
                {/* REDESIGNED: Enhanced Stats Display - Better Layout */}
                <div className="bg-gray-800/50 rounded-xl p-3 mb-4 border border-gray-600/30">
                  {/* Primary Stats Row */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        ${gameStats.netWorth}
                      </div>
                      <div className="text-xs text-gray-500">Net Worth</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-cyan-400">
                        #{gameStats.rank}
                      </div>
                      <div className="text-xs text-gray-500">Position</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-400">
                        {gameStats.kills}
                      </div>
                      <div className="text-xs text-gray-500">Kills</div>
                    </div>
                  </div>
                  
                  {/* REMOVED: Secondary Stats Row with Mass to prevent button cut-off */}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      restartGame()
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      restartGame()
                    }}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm shadow-lg"
                    style={{ touchAction: 'manipulation' }}
                  >
                    🔄 Play Again
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push('/')
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push('/')
                    }}
                    className="w-full bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm shadow-lg"
                    style={{ touchAction: 'manipulation' }}
                  >
                    🏠 Lobby
                  </button>
                </div>
              </div>
            ) : (
              /* Desktop Layout - Original Design */
              <>
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
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile-Optimized Cash Out Success Popup - Landscape Friendly */}
      {showCashOutSuccess && cashOutDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 rounded-2xl max-w-lg w-full border-2 border-green-400/30 shadow-2xl transform animate-in">
            
            {/* Landscape-optimized layout */}
            <div className="flex items-center justify-between p-4">
              
              {/* Success Icon & Amount - Left side */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-400/50">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <h2 className="text-green-400 font-bold text-lg">Cash Out Success!</h2>
                  <p className="text-white text-2xl font-bold">${Math.floor(cashOutDetails.finalAmount)}</p>
                  <p className="text-green-300 text-xs">After ${Math.floor(cashOutDetails.platformFee)} platform fee</p>
                </div>
              </div>

              {/* Stats - Center */}
              <div className="text-center px-4">
                <div className="text-white text-sm space-y-1">
                  <div>🎯 {cashOutDetails.kills} Eliminations</div>
                  <div>🔥 {cashOutDetails.streak} Max Streak</div>
                  <div>⏱️ {Math.floor(cashOutDetails.playTime / 60)}:{(cashOutDetails.playTime % 60).toString().padStart(2, '0')}</div>
                </div>
                <p className="text-gray-300 text-xs mt-2">
                  {cashOutDetails.finalAmount > 500 ? "🏆 Incredible!" :
                   cashOutDetails.finalAmount > 200 ? "🎯 Great job!" :
                   "🎮 Keep practicing!"}
                </p>
              </div>

              {/* Action Buttons - Right side with enhanced mobile touch support */}
              <div className="space-y-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🎮 Play Again button clicked - mobile')
                    handlePlayAgain()
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🎮 Play Again button touched - mobile')
                    handlePlayAgain()
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all hover:scale-105 text-sm"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="flex items-center space-x-2">
                    <span>🎮</span>
                    <div>
                      <div>Play Again</div>
                      <div className="text-xs opacity-75">${initialLobbyFee}</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🏠 Main Menu button clicked - mobile')
                    setShowCashOutSuccess(false)
                    setCashOutDetails(null)
                    window.location.href = '/'
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🏠 Main Menu button touched - mobile')
                    setShowCashOutSuccess(false)
                    setCashOutDetails(null)
                    window.location.href = '/'
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all hover:scale-105 text-sm"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="flex items-center space-x-2">
                    <span>🏠</span>
                    <span>Main Menu</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game canvas and other content remains above */}

      {/* Mobile-Only Features (≤768px width or touch device detected) */}
      {isMobile && (
        <>
          {/* Orientation Gate - Full-screen landscape requirement */}
          {showOrientationGate && (
            <OrientationGate onLandscapeReady={() => setShowOrientationGate(false)} />
          )}

          {/* Mobile Joystick - REPOSITIONED away from edge to prevent cutoff */}
          {!showOrientationGate && !isGameOver && (
            <div 
              ref={joystickRef}
              className="fixed z-50"
              style={{ 
                bottom: `calc(env(safe-area-inset-bottom, 0px) + 40px)`,
                left: '70px', // Moved further from edge to prevent cutoff
                width: '100px',
                height: '100px',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
              onPointerDown={handleJoystickStart}
              onTouchStart={handleJoystickStart}
            >
              {/* Joystick Base */}
              <div 
                className="absolute inset-0 rounded-full border-4 flex items-center justify-center"
                style={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  borderColor: joystickActive ? 'rgba(0, 255, 255, 0.8)' : 'rgba(100, 255, 100, 0.6)',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Joystick Knob - FIXED with direct style updates */}
                <div 
                  ref={joystickKnobRef}
                  className="absolute rounded-full border-2 border-white"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: joystickActive ? 'rgba(0, 255, 255, 0.9)' : 'rgba(100, 255, 255, 0.7)',
                    boxShadow: joystickActive ? '0 0 10px rgba(0, 255, 255, 0.5)' : 'none',
                    // Use transform for reliable positioning
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${joystickPosition.x}px), calc(-50% + ${joystickPosition.y}px))`,
                    transition: joystickActive ? 'none' : 'transform 0.2s ease'
                  }}
                />
                
                {/* Center dot for reference */}
                <div 
                  className="absolute w-2 h-2 bg-white/30 rounded-full"
                  style={{
                    left: 'calc(50% - 4px)',
                    top: 'calc(50% - 4px)'
                  }}
                />
                
                {/* Enhanced Debug info */}
                <div className="absolute -bottom-12 left-0 text-xs text-white bg-black/70 px-2 py-1 rounded">
                  <div>Pos: {Math.round(joystickPosition.x)},{Math.round(joystickPosition.y)}</div>
                  <div>Active: {joystickActive ? 'YES' : 'NO'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Action Buttons */}
          {!showOrientationGate && !isGameOver && (
            <div className={`fixed bottom-5 right-5 flex flex-col gap-4 z-50 transition-opacity duration-300 ${mobileUIFaded ? 'opacity-40' : 'opacity-100'}`}
                 style={{ 
                   bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                   right: '20px' 
                 }}>
              {/* Circular Cash-Out Button with LARGER touch area for mobile */}
              <div 
                className="relative rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95"
                onPointerDown={(e) => {
                  console.log('💰 Cash-out POINTER DOWN - Touch detected at:', e.clientX, e.clientY)
                  handleCashOutStart(e)
                }}
                onPointerUp={(e) => {
                  console.log('💰 Cash-out POINTER UP - Touch released')
                  handleCashOutEnd(e)
                }}
                onPointerLeave={(e) => {
                  console.log('💰 Cash-out POINTER LEAVE')
                  handleCashOutEnd(e)
                }}
                onTouchStart={(e) => {
                  console.log('💰 Cash-out TOUCH START - Mobile touch detected')
                  handleCashOutStart(e)
                }}
                onTouchEnd={(e) => {
                  console.log('💰 Cash-out TOUCH END - Mobile touch released')
                  handleCashOutEnd(e)
                }}
                style={{ 
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  width: '100px', // Larger touch area
                  height: '100px', // Larger touch area
                  padding: '10px', // Extra padding for easier touch
                  zIndex: 1001 // Higher z-index
                }}
              >
                {/* Progress ring - ONLY show when cashing out */}
                {isCashingOut && (
                  <svg className="cashout-progress-ring absolute inset-0" width="100" height="100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45"
                      fill="none"
                      stroke="rgba(0, 255, 0, 0.3)"
                      strokeWidth="4"
                      style={{
                        strokeDasharray: `${2 * Math.PI * 45}`,
                        strokeDashoffset: `${2 * Math.PI * 45 * (1 - cashOutProgress / 100)}`,
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50px 50px'
                      }}
                    />
                  </svg>
                )}
                
                {/* Button content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs font-bold bg-gray-800/80 rounded-full border-2 border-gray-600">
                  <div className="text-lg">💰</div>
                  <div className="text-center leading-tight">
                    <div>{isCashingOut ? `${Math.floor(cashOutProgress)}%` : 'CASH'}</div>
                    <div className="text-xs">{isCashingOut ? 'OUT' : `$${gameStats.netWorth}`}</div>
                  </div>
                </div>
                {/* Cash-out guidance tooltip */}
                {!isCashingOut && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-80">
                    Hold to cash out
                  </div>
                )}
              </div>

              {/* Mobile Split Button */}
              <div 
                className={`relative rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
                  splitCooldownActive 
                    ? 'animate-pulse' 
                    : ''
                }`}
                onPointerDown={(e) => {
                  console.log('⚡ Split POINTER DOWN - Touch detected at:', e.clientX, e.clientY)
                  handleSplitStart(e)
                }}
                onPointerUp={(e) => {
                  console.log('⚡ Split POINTER UP - Touch released')
                  handleSplitEnd(e)
                }}
                onPointerLeave={(e) => {
                  console.log('⚡ Split POINTER LEAVE')
                  handleSplitEnd(e)
                }}
                onTouchStart={(e) => {
                  console.log('⚡ Split TOUCH START - Mobile touch detected')
                  handleSplitStart(e)
                }}
                onTouchEnd={(e) => {
                  console.log('⚡ Split TOUCH END - Mobile touch released')
                  handleSplitEnd(e)
                }}
                style={{ 
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  width: '80px', // Slightly smaller than cash-out
                  height: '80px', 
                  padding: '8px',
                  zIndex: 1001
                }}
              >
                {/* Split cooldown indicator */}
                {splitCooldownActive && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse border-2 border-red-400/60"></div>
                )}
                
                {/* Button content */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center text-white text-xs font-bold rounded-full border-2 transition-all duration-200 ${
                  splitCooldownActive 
                    ? 'bg-red-800/80 border-red-600' 
                    : canPlayerSplit(gameRef.current?.game?.player || { cells: [] })
                      ? 'bg-blue-800/80 border-blue-600 hover:bg-blue-700/90' 
                      : 'bg-gray-800/60 border-gray-700'
                }`}>
                  <div className="text-lg">⚡</div>
                  <div className="text-center leading-tight">
                    <div className="text-xs">SPLIT</div>
                  </div>
                </div>
                
                {/* Split guidance tooltip */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-80">
                  Tap to split
                </div>
              </div>
            </div>
          )}

          {/* Refined Mobile HUD Elements */}
          {!showOrientationGate && !isGameOver && (
            <>

              {/* Tiny Minimap - 90% smaller total, minimal footprint */}
              <div 
                className={`fixed top-4 right-4 z-40 transition-all duration-300 ${mobileUIFaded ? 'opacity-30' : 'opacity-100'} ${
                  minimapCollapsed ? 'w-1.5 h-1.5' : 'w-3 h-3'
                }`}
                style={{
                  top: `calc(env(safe-area-inset-top, 0px) + 16px)`
                }}
                onClick={() => setMinimapCollapsed(!minimapCollapsed)}
              >
                <div className={`w-full h-full bg-black/95 rounded-full border border-gray-600/30 flex items-center justify-center transition-all duration-300 ${
                  minimapCollapsed ? 'border-cyan-400/60' : 'border-gray-600/30'
                }`}>
                  {!minimapCollapsed ? (
                    <canvas 
                      width="12" 
                      height="12"
                      style={{ borderRadius: '50%' }}
                      ref={minimapCanvasRef}
                      className="w-full h-full"
                    />
                  ) : (
                    // Pin emoji removed for mobile - just show empty circle
                    <div className="w-2 h-2 bg-cyan-400/60 rounded-full"></div>
                  )}
                </div>
              </div>

              {/* Mobile Stats Panel - Collapsed by default with 📊 icon */}
              <div 
                className={`fixed bottom-4 right-4 z-40 transition-all duration-300 ${mobileUIFaded ? 'opacity-30' : 'opacity-100'}`}
                style={{
                  bottom: `calc(env(safe-area-inset-bottom, 0px) + 120px)`,
                  right: '16px'
                }}
                onClick={() => setStatsCollapsed(!statsCollapsed)}
              >
                {!statsCollapsed ? (
                  <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-cyan-400/30 min-w-[160px]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-cyan-400 text-sm">📊</span>
                        <span className="text-white font-medium text-sm">Stats</span>
                      </div>
                      <button className="text-gray-400 hover:text-white text-xs">✕</button>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Worth:</span>
                        <span className="text-green-400 font-bold">${gameStats.netWorth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">K/D:</span>
                        <span className="text-white">{gameStats.kills}/{gameStats.deaths}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Streak:</span>
                        <span className="text-yellow-400">{gameStats.streak} 🔥</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Rank:</span>
                        <span className="text-cyan-400">#{gameStats.rank}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mobile-hud-icon bg-black/80 border-cyan-400/60">
                    <span className="text-cyan-400">📊</span>
                  </div>
                )}
              </div>

              {/* Mobile Leaderboard Toggle - MOVED to align with joystick on left side */}
              <div 
                className={`fixed z-40 transition-all duration-300 ${mobileUIFaded ? 'opacity-30' : 'opacity-100'}`}
                style={{
                  bottom: `calc(env(safe-area-inset-bottom, 0px) + 40px)`, // Same as joystick
                  left: '190px', // Positioned to the right of joystick (70px + 100px + 20px margin)
                  padding: '10px',
                  minWidth: '60px',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  try {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🏆 Trophy button clicked - toggling leaderboard safely')
                    
                    // SAFE toggle - prevent any potential API calls or errors
                    setLeaderboardCollapsed(prev => !prev)
                    
                    // Ensure no propagation to prevent potential conflicts
                    return false
                  } catch (error) {
                    console.error('❌ Trophy button error (handled):', error)
                    // Still try to toggle even if there's an error
                    try {
                      setLeaderboardCollapsed(prev => !prev)
                    } catch (innerError) {
                      console.error('❌ Critical trophy button error:', innerError)
                    }
                  }
                }}
                onTouchEnd={(e) => {
                  try {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🏆 Trophy button touched - toggling leaderboard safely')
                    
                    // SAFE toggle for touch
                    setLeaderboardCollapsed(prev => !prev)
                    
                    return false
                  } catch (error) {
                    console.error('❌ Trophy touch error (handled):', error)
                    // Still try to toggle even if there's an error
                    try {
                      setLeaderboardCollapsed(prev => !prev)
                    } catch (innerError) {
                      console.error('❌ Critical trophy touch error:', innerError)
                    }
                  }
                }}
              >
                {!leaderboardCollapsed ? (
                  <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-cyan-400/30 max-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-400 text-sm">🏆</span>
                        <span className="text-cyan-400 font-medium text-sm">Leaders</span>
                      </div>
                      <button className="text-gray-400 hover:text-white text-xs">✕</button>
                    </div>
                    <div className="space-y-1">
                      {leaderboard && leaderboard.length > 0 ? leaderboard.slice(0, 3).map((player, index) => (
                        <div key={player.id || `player-${index}`} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1">
                            <span className={`font-bold ${
                              index === 0 ? 'text-yellow-400' : 
                              index === 1 ? 'text-gray-300' : 'text-orange-400'
                            }`}>
                              #{index + 1}
                            </span>
                            <span className="text-white truncate max-w-[60px]">{player.name || 'Player'}</span>
                          </div>
                          <span className="text-green-400 font-bold">${player.netWorth || 0}</span>
                        </div>
                      )) : (
                        <div className="text-gray-400 text-xs text-center py-2">
                          No players yet
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mobile-hud-icon bg-black/80 border-yellow-400/60">
                    <span className="text-yellow-400">🏆</span>
                  </div>
                )}
              </div>

            </>
          )}

          {/* Mobile-Optimized Mission Display - Top Center */}
          {!showOrientationGate && !isGameOver && currentMission && isMobile && (
            <div 
              className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-30 transition-all duration-300 ${mobileUIFaded ? 'opacity-70' : 'opacity-100'}`}
              style={{
                top: `calc(env(safe-area-inset-top, 0px) + 16px)`
              }}
            >
              <div className="bg-black/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-400/40 shadow-lg max-w-sm">
                <div className="text-center">
                  {/* Mission Title */}
                  <div className="text-purple-400 text-xs font-bold flex items-center justify-center space-x-2 mb-1">
                    <span>🎯</span>
                    <span>MISSION</span>
                  </div>
                  
                  {/* Mission Description - Compact */}
                  <div className="text-white text-xs mb-2 leading-tight">
                    {currentMission.description}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
                    <div 
                      className="bg-purple-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(currentMission.progress / currentMission.target) * 100}%` }}
                    ></div>
                  </div>
                  
                  {/* Progress Text */}
                  <div className="text-gray-300 text-xs">
                    {currentMission.progress}/{currentMission.target}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Mission Toast - Keep original for desktop */}
          {missionToastVisible && missionToast && !isMobile && (
            <div 
              className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-black/90 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-400/30 shadow-lg max-w-xs"
              style={{
                top: `calc(env(safe-area-inset-top, 0px) + 16px)`
              }}
            >
              <div className="text-white text-xs font-medium flex items-center space-x-2">
                <span className="text-purple-400">🎯</span>
                <span className="truncate text-xs">{missionToast}</span>
              </div>
            </div>
          )}

          {/* Mobile Mission Toast - Minimal notification style */}
          {missionToastVisible && missionToast && isMobile && (
            <div 
              className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 bg-purple-900/90 backdrop-blur-sm rounded-full px-3 py-1 border border-purple-400/50 shadow-lg animate-pulse"
              style={{
                top: `calc(env(safe-area-inset-top, 0px) + 64px)`
              }}
            >
              <div className="text-purple-200 text-xs font-medium">
                🎯 {missionToast}
              </div>
            </div>
          )}

          {/* Mission Icon Toggle - Removed for mobile to prevent edge cutoff */}

          {/* Single Mobile Instructions Toast - Enhanced touch dismiss */}
          {!showOrientationGate && !isGameOver && instructionsVisible && (
            <div 
              className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${mobileUIFaded ? 'opacity-30' : 'opacity-100'}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('📱 Instructions dismissed via click')
                setInstructionsVisible(false)
                setShowInstructionsIcon(true)
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('📱 Instructions dismissed via touch')
                setInstructionsVisible(false)
                setShowInstructionsIcon(true)
              }}
              style={{ 
                touchAction: 'manipulation',
                cursor: 'pointer'
              }}
            >
              <div className="bg-black/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-cyan-400/30 text-center max-w-xs mx-auto">
                <div className="text-white text-xs font-normal leading-tight mb-1">
                  Use joystick to move • Tap buttons to split/boost • Hold button to cash-out
                </div>
                <div className="text-xs text-cyan-400 animate-pulse">👆 Tap anywhere to dismiss</div>
              </div>
            </div>
          )}

          {/* Instructions Info Icon - REMOVED per user request */}
        </>
      )}
    </div>
  )
}

export default AgarIOGame