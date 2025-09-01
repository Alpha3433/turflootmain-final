'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { io } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Play, 
  SkipForward,
  ArrowLeft,
  Eye,
  Users
} from 'lucide-react'

const SimpleSpectatorMode = ({ roomId, gameMode = 'free', entryFee = 0, stake = 'FREE' }) => {
  const canvasRef = useRef(null)
  const socketRef = useRef(null)
  const animationFrameRef = useRef()
  const router = useRouter()
  const { user, getAccessToken } = usePrivy()
  
  // Simple state
  const [isConnected, setIsConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [playerCount, setPlayerCount] = useState(0)

  // Initialize connection
  useEffect(() => {
    if (!roomId) return

    let isMounted = true

    const initializeSpectator = async () => {
      try {
        const token = user ? await getAccessToken() : null
        
        if (!isMounted) return

        const socket = io('/', {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5
        })

        socketRef.current = socket

        socket.on('connect', () => {
          if (!isMounted) return
          console.log('👁️ Simple spectator connected')
          setIsConnected(true)
          
          // Join as spectator
          socket.emit('join_as_spectator', {
            roomId,
            token: token || 'guest'
          })
        })

        socket.on('spectator_joined', (data) => {
          if (!isMounted) return
          console.log('👁️ Joined as spectator:', data)
          setSpectatorCount(data.spectatorCount || 0)
          setPlayerCount(data.playerCount || 0)
        })

        socket.on('spectator_game_state', (state) => {
          if (!isMounted) return
          setGameState(state)
          
          if (state.players) {
            const alivePlayers = state.players.filter(p => p.alive)
            setPlayers(alivePlayers)
            setPlayerCount(alivePlayers.length)
            
            // Auto-select player if none selected or current player died
            if (alivePlayers.length > 0 && (!currentPlayer || !alivePlayers.find(p => p.id === currentPlayer.id))) {
              // Start with top player (highest mass) or first player
              const topPlayer = alivePlayers.sort((a, b) => (b.mass || 0) - (a.mass || 0))[0]
              setCurrentPlayer(topPlayer)
              setCurrentPlayerIndex(0)
              console.log(`👁️ Following: ${topPlayer.nickname}`)
            }
          }
          
          if (state.spectatorCount !== undefined) {
            setSpectatorCount(state.spectatorCount)
          }
        })

        socket.on('spectator_count_update', (data) => {
          if (!isMounted) return
          setSpectatorCount(data.spectatorCount || 0)
        })

        socket.on('disconnect', () => {
          if (!isMounted) return
          console.log('👁️ Spectator disconnected')
          setIsConnected(false)
          setGameState(null)
        })

      } catch (error) {
        if (isMounted) {
          console.error('❌ Failed to initialize spectator:', error)
        }
      }
    }

    initializeSpectator()

    return () => {
      isMounted = false
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [roomId, user, getAccessToken])

  // Canvas rendering - simplified to only follow current player
  const renderCanvas = useCallback((timestamp) => {
    const canvas = canvasRef.current
    if (!canvas || !gameState || !currentPlayer) {
      animationFrameRef.current = requestAnimationFrame(renderCanvas)
      return
    }

    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    // Simple camera - always follow current player
    const viewX = currentPlayer.x || 0
    const viewY = currentPlayer.y || 0
    const zoom = 2.5 // Fixed zoom

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Apply camera transform
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-viewX, -viewY)

    // Draw world bounds (optional)
    if (gameState.worldBounds) {
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 3 / zoom
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
          ctx.fillStyle = '#FFD700'
          ctx.beginPath()
          ctx.arc(food.x, food.y, 4, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
    }

    // Draw players
    if (gameState.players && Array.isArray(gameState.players)) {
      gameState.players.forEach(player => {
        if (!player || !player.alive || typeof player.x !== 'number' || typeof player.y !== 'number') return

        const radius = Math.sqrt(player.mass || 10) * 2
        const isCurrentlyFollowed = player.id === currentPlayer.id
        
        // Player body
        ctx.fillStyle = isCurrentlyFollowed ? '#00FF00' : '#3B82F6'
        ctx.beginPath()
        ctx.arc(player.x, player.y, radius, 0, 2 * Math.PI)
        ctx.fill()
        
        // Player outline
        ctx.strokeStyle = isCurrentlyFollowed ? '#FFFF00' : '#FFF'
        ctx.lineWidth = isCurrentlyFollowed ? 3 / zoom : 2 / zoom
        ctx.stroke()

        // Player name
        if (player.nickname) {
          ctx.fillStyle = isCurrentlyFollowed ? '#FFFF00' : '#FFF'
          ctx.font = `${Math.max(16 / zoom, 12)}px Arial`
          ctx.textAlign = 'center'
          ctx.fillText(player.nickname, player.x, player.y - radius - 20 / zoom)
        }
        
        // Player mass
        ctx.fillStyle = isCurrentlyFollowed ? '#FFFF00' : '#FFD700'
        ctx.font = `${Math.max(14 / zoom, 10)}px Arial`
        ctx.fillText(`${Math.floor(player.mass || 0)}`, player.x, player.y + radius + 25 / zoom)
      })
    }

    ctx.restore()
    animationFrameRef.current = requestAnimationFrame(renderCanvas)
  }, [gameState, currentPlayer])

  // Start/stop rendering
  useEffect(() => {
    if (gameState && currentPlayer && canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderCanvas)
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [renderCanvas, gameState, currentPlayer])

  // Cycle to next player
  const cyclePlayer = () => {
    if (players.length === 0) return
    
    const nextIndex = (currentPlayerIndex + 1) % players.length
    setCurrentPlayerIndex(nextIndex)
    setCurrentPlayer(players[nextIndex])
    
    console.log(`👁️ Cycling to: ${players[nextIndex].nickname}`)
  }

  // Handle join match
  const handleJoinMatch = async () => {
    if (!user && entryFee > 0) {
      // Need authentication for paid games
      console.log('🔐 Authentication required for paid games')
      return
    }

    try {
      console.log('🎮 Joining match...')
      
      // Navigate to actual game
      const gameUrl = `/agario?roomId=${roomId}&mode=${gameMode}&fee=${entryFee}`
      router.push(gameUrl)
      
    } catch (error) {
      console.error('❌ Failed to join match:', error)
    }
  }

  // Handle exit to menu
  const handleExitToMenu = () => {
    router.push('/')
  }

  // Loading state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-96 bg-black/80 border-gray-700">
          <CardContent className="p-8 text-center">
            <Eye className="h-16 w-16 text-blue-400 mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold mb-3 text-white">Entering Match...</h2>
            <p className="text-gray-400">
              Connecting to {stake === 'FREE' ? 'practice' : `$${stake} cash`} game...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0"
      />

      {/* Simple Top Info */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-black/80 border-gray-600">
          <CardContent className="p-3">
            <div className="flex items-center space-x-4 text-sm text-white">
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4 text-blue-400" />
                <span>{spectatorCount} watching</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4 text-green-400" />
                <span>{playerCount} playing</span>
              </div>
              <div className="text-yellow-400 font-bold">
                {stake === 'FREE' ? 'PRACTICE' : `$${stake} CASH`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Player Info */}
      {currentPlayer && (
        <div className="absolute top-4 right-4 z-10">
          <Card className="bg-black/80 border-yellow-500/50">
            <CardContent className="p-3">
              <div className="text-yellow-400 font-bold text-lg">{currentPlayer.nickname}</div>
              <div className="text-white text-sm">Mass: {Math.floor(currentPlayer.mass || 0)}</div>
              <div className="text-gray-400 text-xs">
                Player {currentPlayerIndex + 1} of {players.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exit to Menu - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={handleExitToMenu}
          variant="secondary"
          size="sm"
          className="bg-black/80 border-gray-600 text-white hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Exit
        </Button>
      </div>

      {/* Game Action Buttons - Styled exactly like in-game Cash Out & Split */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-4">
        {/* Next Player Button - Styled like Split Button */}
        <button
          onClick={cyclePlayer}
          disabled={players.length <= 1}
          className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
            players.length <= 1
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-400 text-white'
          }`}
        >
          <span className="text-lg">⚡</span>
          <span>
            Next Player ({players.length})
          </span>
        </button>

        {/* Join Match Button - Styled like Cash Out Button */}
        <button
          onClick={handleJoinMatch}
          className="px-6 py-3 rounded-lg font-bold transition-all bg-yellow-500 hover:bg-yellow-400 text-black"
        >
          💰 Join Match {stake === 'FREE' ? '- FREE' : `- $${stake}`}
        </button>
      </div>

      {/* No Game State Warning */}
      {!gameState && isConnected && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <Card className="bg-black/80 border-gray-700">
            <CardContent className="p-6 text-center">
              <Eye className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse" />
              <p className="text-white">Waiting for game data...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SimpleSpectatorMode