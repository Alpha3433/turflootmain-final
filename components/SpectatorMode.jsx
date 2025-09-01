'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { io } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Users, 
  Play, 
  Camera, 
  Move3D, 
  Target,
  Crown,
  Skull,
  ArrowLeft,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react'

const SpectatorMode = ({ roomId, gameMode = 'free', entryFee = 0, autoSpectate = false, stake = 'FREE' }) => {
  const canvasRef = useRef(null)
  const socketRef = useRef(null)
  const router = useRouter()
  const { user, getAccessToken } = usePrivy()
  
  // Spectator state
  const [isConnected, setIsConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [roomInfo, setRoomInfo] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  
  // Player following state
  const [followingPlayerIndex, setFollowingPlayerIndex] = useState(0)
  const [availablePlayers, setAvailablePlayers] = useState([])
  const [currentPlayer, setCurrentPlayer] = useState(null)
  
  // UI state - always show UI for auto-spectate mode
  const [showUI, setShowUI] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [showPlayerInfo, setShowPlayerInfo] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showJoinButton, setShowJoinButton] = useState(true) // Always show join button
  
  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  
  // Desktop controls state
  const [keys, setKeys] = useState({
    w: false, a: false, s: false, d: false,
    up: false, down: false, left: false, right: false
  })
  const keysRef = useRef(keys)

  // Initialize mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // WASD Camera Movement for Desktop
  useEffect(() => {
    if (isMobile) return

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault()
        setKeys(prev => {
          const newKeys = { ...prev }
          if (key === 'w' || key === 'arrowup') newKeys.w = true
          if (key === 'a' || key === 'arrowleft') newKeys.a = true  
          if (key === 's' || key === 'arrowdown') newKeys.s = true
          if (key === 'd' || key === 'arrowright') newKeys.d = true
          keysRef.current = newKeys
          return newKeys
        })
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        setKeys(prev => {
          const newKeys = { ...prev }
          if (key === 'w' || key === 'arrowup') newKeys.w = false
          if (key === 'a' || key === 'arrowleft') newKeys.a = false
          if (key === 's' || key === 'arrowdown') newKeys.s = false
          if (key === 'd' || key === 'arrowright') newKeys.d = false
          keysRef.current = newKeys
          return newKeys
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isMobile])

  // Update camera position based on WASD keys
  useEffect(() => {
    if (cameraMode !== 'free_camera' || isMobile) return

    const moveSpeed = 10 // pixels per frame
    const updateCamera = () => {
      const currentKeys = keysRef.current
      if (currentKeys.w || currentKeys.s || currentKeys.a || currentKeys.d) {
        setCameraPosition(prev => ({
          x: prev.x + (currentKeys.d ? moveSpeed : 0) - (currentKeys.a ? moveSpeed : 0),
          y: prev.y + (currentKeys.s ? moveSpeed : 0) - (currentKeys.w ? moveSpeed : 0)
        }))
      }
    }

    const interval = setInterval(updateCamera, 16) // ~60fps
    return () => clearInterval(interval)
  }, [cameraMode, isMobile])

  // Initialize spectator connection (optimized to prevent reconnection loops)
  useEffect(() => {
    if (!user || !getAccessToken || !roomId || socketRef.current) return

    let isMounted = true
    let reconnectTimeout = null

    const initializeSpectator = async () => {
      try {
        const token = await getAccessToken()
        
        if (!isMounted) return

        const socket = io('/', {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
          timeout: 10000
        })

        socketRef.current = socket

        socket.on('connect', () => {
          if (!isMounted) return
          console.log('👁️ Spectator connected to server')
          setIsConnected(true)
          
          // Join as spectator
          socket.emit('join_as_spectator', {
            roomId,
            token
          })
        })

        socket.on('spectator_joined', (data) => {
          if (!isMounted) return
          console.log('👁️ Successfully joined as spectator:', data)
          setRoomInfo(data)
          setSpectatorCount(data.spectatorCount)
        })

        socket.on('spectator_game_state', (state) => {
          if (!isMounted) return
          setGameState(state)
          setLeaderboard(state.leaderboard || [])
          if (state.spectatorCount !== undefined) {
            setSpectatorCount(state.spectatorCount)
          }
        })

        socket.on('spectator_count_update', (data) => {
          if (!isMounted) return
          setSpectatorCount(data.spectatorCount || 0)
        })

        socket.on('room_info', (info) => {
          if (!isMounted) return
          setRoomInfo(info)
        })
  // Auto-spectate initialization - set default camera mode
  useEffect(() => {
    if (autoSpectate && gameState && gameState.players && gameState.players.length > 0) {
      // Start with bird's eye view for auto-spectate mode
      setCameraMode('bird_eye')
      console.log('👁️ Auto-spectate initialized with bird\'s eye view')
    }
  }, [autoSpectate, gameState])

        socket.on('spectator_became_player', (data) => {
          if (!isMounted) return
          console.log('🎮 Successfully joined game as player')
          // Redirect to game page
          router.push(`/agario?roomId=${data.roomId}&mode=${gameMode}&fee=${entryFee}`)
        })

        socket.on('spectator_limit_reached', (data) => {
          if (!isMounted) return
          console.warn('👁️ Spectator limit reached:', data)
        })

        socket.on('auth_error', (error) => {
          if (!isMounted) return
          console.error('❌ Authentication error:', error)
        })

        socket.on('disconnect', () => {
          if (!isMounted) return
          console.log('👁️ Spectator disconnected')
          setIsConnected(false)
          setGameState(null)
        })

        socket.on('connect_error', (error) => {
          if (!isMounted) return
          console.error('❌ Connection error:', error)
          setIsConnected(false)
        })

      } catch (error) {
        if (isMounted) {
          console.error('❌ Failed to initialize spectator mode:', error)
        }
      }
    }

    initializeSpectator()

    return () => {
      isMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [user, getAccessToken, roomId])

  // Canvas rendering with requestAnimationFrame optimization
  const animationFrameRef = useRef()
  const lastRenderTimeRef = useRef(0)
  const renderIntervalMs = 1000 / 30 // 30 FPS to reduce CPU usage

  const renderCanvas = useCallback((timestamp) => {
    // Throttle rendering to 30 FPS
    if (timestamp - lastRenderTimeRef.current < renderIntervalMs) {
      animationFrameRef.current = requestAnimationFrame(renderCanvas)
      return
    }
    lastRenderTimeRef.current = timestamp

    const canvas = canvasRef.current
    if (!canvas || !gameState) {
      animationFrameRef.current = requestAnimationFrame(renderCanvas)
      return
    }

    const ctx = canvas.getContext('2d')
    
    // Set canvas size only when needed
    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    // Calculate camera position based on mode
    let viewX = 0, viewY = 0, zoom = cameraZoom

    if (cameraMode === 'bird_eye') {
      // Show entire game world - zoomed out map view
      viewX = 0
      viewY = 0
      zoom = Math.min(canvas.width / (gameState.worldBounds?.width || 2000), canvas.height / (gameState.worldBounds?.height || 2000)) * 0.8
    } else if (cameraMode === 'player_follow' && followingPlayer) {
      // Follow specific player with smooth tracking
      const player = gameState.players.find(p => p.id === followingPlayer)
      if (player) {
        viewX = player.x
        viewY = player.y
        zoom = 2.5 // Closer zoom for player following
      }
    } else if (cameraMode === 'player_follow' && !followingPlayer && gameState.players.length > 0) {
      // Auto-follow top player if no specific player selected
      const topPlayer = gameState.players
        .filter(p => p.alive)
        .sort((a, b) => (b.mass || 0) - (a.mass || 0))[0]
      if (topPlayer) {
        viewX = topPlayer.x
        viewY = topPlayer.y
        zoom = 2.5
        setFollowingPlayer(topPlayer.id) // Auto-set following player
      }
    } else if (cameraMode === 'free_camera') {
      // Use manual camera position with WASD/touch controls
      viewX = cameraPosition.x
      viewY = cameraPosition.y
      zoom = cameraZoom
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Save context for transformations
    ctx.save()
    
    // Apply camera transform
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-viewX, -viewY)

    // Draw world bounds
    if (gameState.worldBounds) {
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 5 / zoom
      ctx.strokeRect(
        -gameState.worldBounds.width / 2,
        -gameState.worldBounds.height / 2,
        gameState.worldBounds.width,
        gameState.worldBounds.height
      )
    }

    // Draw food
    if (gameState.food && Array.isArray(gameState.food)) {
      gameState.food.forEach(food => {
        if (food && typeof food.x === 'number' && typeof food.y === 'number') {
          ctx.fillStyle = '#FFD700' // Gold color for food
          ctx.beginPath()
          ctx.arc(food.x, food.y, 3, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
    }

    // Draw players
    if (gameState.players && Array.isArray(gameState.players)) {
      gameState.players.forEach(player => {
        if (!player || !player.alive || typeof player.x !== 'number' || typeof player.y !== 'number') return

        const radius = Math.sqrt(player.mass || 10) * 2
        
        // Player body
        ctx.fillStyle = player.id === followingPlayer ? '#00FF00' : (player.alive ? '#3B82F6' : '#999')
        ctx.beginPath()
        ctx.arc(player.x, player.y, radius, 0, 2 * Math.PI)
        ctx.fill()
        
        // Player outline
        ctx.strokeStyle = '#FFF'
        ctx.lineWidth = 2 / zoom
        ctx.stroke()

        // Player name
        if (player.nickname) {
          ctx.fillStyle = '#FFF'
          ctx.font = `${Math.max(12 / zoom, 8)}px Arial`
          ctx.textAlign = 'center'
          ctx.fillText(player.nickname, player.x, player.y - radius - 10 / zoom)
        }
        
        // Player stats
        ctx.fillStyle = '#FFD700'
        ctx.font = `${Math.max(10 / zoom, 6)}px Arial`
        ctx.fillText(`${Math.floor(player.mass || 0)} mass`, player.x, player.y + radius + 15 / zoom)
      })
    }

    // Restore context
    ctx.restore()

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(renderCanvas)
  }, [gameState, cameraMode, followingPlayer, cameraPosition, cameraZoom])

  // Start/stop canvas rendering
  useEffect(() => {
    if (gameState && canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderCanvas)
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [renderCanvas, gameState])

  // Camera control handlers
  const handleCameraModeChange = (mode) => {
    setCameraMode(mode)
    if (socketRef.current) {
      socketRef.current.emit('spectator_camera_control', { mode })
    }
  }

  const handleFollowPlayer = (playerId) => {
    setFollowingPlayer(playerId)
    setCameraMode('player_follow')
    if (socketRef.current) {
      socketRef.current.emit('spectator_camera_control', { 
        mode: 'player_follow', 
        followingPlayer: playerId 
      })
    }
  }

  const handleJoinGame = async () => {
    if (!socketRef.current) return

    try {
      const token = await getAccessToken()
      socketRef.current.emit('spectator_join_game', { token })
    } catch (error) {
      console.error('❌ Failed to join game:', error)
    }
  }

  const handleBackToLobby = () => {
    router.back()
  }

  // Touch/mouse handlers for free camera mode
  const handleCanvasMouseDown = (e) => {
    if (cameraMode !== 'free_camera') return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setTouchStartPos({ x, y })
    setIsDragging(true)
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDragging || cameraMode !== 'free_camera') return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const deltaX = (x - touchStartPos.x) / cameraZoom
    const deltaY = (y - touchStartPos.y) / cameraZoom
    
    setCameraPosition(prev => ({
      x: prev.x - deltaX,
      y: prev.y - deltaY
    }))
    
    setTouchStartPos({ x, y })
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-96 bg-black/80 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="relative">
              <Eye className="h-16 w-16 text-blue-400 mx-auto mb-6 animate-pulse" />
              <div className="absolute -inset-2 bg-blue-400/20 rounded-full animate-ping"></div>
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">
              {autoSpectate ? `Entering ${stake === 'FREE' ? 'Practice' : `$${stake}`} Match...` : 'Connecting to Spectator Mode...'}
            </h2>
            <p className="text-gray-400 mb-4">
              {autoSpectate 
                ? `Get ready to watch ${stake === 'FREE' ? 'practice games' : `$${stake} cash games`}! You can join anytime.`
                : 'Please wait while we connect you to the game.'
              }
            </p>
            <div className="flex justify-center">
              <div className="w-8 h-1 bg-blue-400 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Main Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0 cursor-crosshair"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      />

      {/* UI Overlay */}
      {showUI && (
        <>
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="flex justify-between items-center">
              {/* Game Info */}
              <Card className="bg-black/70 border-gray-700">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-4 text-sm text-white">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{spectatorCount} watching</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{gameState?.players?.length || 0} playing</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-bold text-yellow-400">
                        {stake === 'FREE' ? 'PRACTICE' : `$${stake} CASH`}
                      </span>
                    </div>
                    {roomInfo?.running && (
                      <Badge variant="secondary" className="bg-green-600">
                        Live
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Controls */}
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowUI(!showUI)}
                  className="bg-black/70 border-gray-700 text-white"
                >
                  {showUI ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBackToLobby}
                  className="bg-black/70 border-gray-700 text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Camera Controls with Instructions */}
          <div className="absolute top-20 left-4 z-10">
            <Card className="bg-black/80 border-gray-600">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="text-sm font-bold text-white">Camera Controls</div>
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant={cameraMode === 'bird_eye' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleCameraModeChange('bird_eye')}
                      className="justify-start text-xs"
                    >
                      <Camera className="h-3 w-3 mr-2" />
                      <div className="text-left">
                        <div>Map View</div>
                        <div className="text-xs opacity-70">See whole battlefield</div>
                      </div>
                    </Button>
                    <Button
                      variant={cameraMode === 'player_follow' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleCameraModeChange('player_follow')}
                      className="justify-start text-xs"
                    >
                      <Target className="h-3 w-3 mr-2" />
                      <div className="text-left">
                        <div>Follow Top Player</div>
                        <div className="text-xs opacity-70">Click leaderboard to switch</div>
                      </div>
                    </Button>
                    <Button
                      variant={cameraMode === 'free_camera' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleCameraModeChange('free_camera')}
                      className="justify-start text-xs"
                    >
                      <Move3D className="h-3 w-3 mr-2" />
                      <div className="text-left">
                        <div>Free Cam</div>
                        <div className="text-xs opacity-70">
                          {isMobile ? 'Swipe to move' : 'WASD or drag'}
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          {showLeaderboard && leaderboard.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <Card className="bg-black/70 border-gray-700 w-64">
                <CardContent className="p-3">
                  <div className="text-sm font-medium text-white mb-2 flex items-center">
                    <Crown className="h-4 w-4 mr-1 text-yellow-500" />
                    Leaderboard
                  </div>
                  <div className="space-y-1">
                    {leaderboard.slice(0, 5).map((player, index) => (
                      <div 
                        key={player.nickname}
                        className="flex justify-between items-center text-xs text-white cursor-pointer hover:bg-white/10 p-1 rounded"
                        onClick={() => handleFollowPlayer(player.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-500">#{index + 1}</span>
                          <span>{player.nickname}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{player.mass}</span>
                          <Skull className="h-3 w-3 text-red-500" />
                          <span>{player.kills}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sticky Join Match Button - Always Visible */}
          {showJoinButton && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <button
                onClick={handleJoinGame}
                className="bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-white font-bold py-4 px-8 rounded-2xl text-xl shadow-2xl border-2 border-green-300 transition-all duration-300 hover:scale-105 pulse-animation"
                style={{
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              >
                <div className="flex items-center space-x-3">
                  <Play className="h-6 w-6" />
                  <span>
                    Join Match {stake === 'FREE' ? '- FREE' : `- $${stake}`}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Mobile-specific UI adjustments */}
          {isMobile && (
            <div className="absolute bottom-20 right-4 z-10">
              <div className="flex flex-col space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="bg-black/70 border-gray-700 text-white"
                >
                  <Crown className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                  className="bg-black/70 border-gray-700 text-white"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading overlay when game state is not available */}
      {!gameState && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <Card className="bg-black/70 border-gray-700">
            <CardContent className="p-6 text-center">
              <Eye className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse" />
              <p className="text-white">Loading game state...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SpectatorMode