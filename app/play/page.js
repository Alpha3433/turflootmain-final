'use client'

import { useState, useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'

const TurfLootGame = () => {
  const { authenticated, user, login } = usePrivy()
  const router = useRouter()
  const [gameStatus, setGameStatus] = useState('lobby') // lobby, playing, ended
  const [roomInfo, setRoomInfo] = useState(null)
  const [balance, setBalance] = useState(0)
  const [playerStats, setPlayerStats] = useState({ mass: 10, rank: 1 })
  const [gameResult, setGameResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const socketRef = useRef(null)
  const gameContainerRef = useRef(null)
  const gameInstanceRef = useRef(null)
  const playerIdRef = useRef(null)

  // Get room parameters from URL
  const [roomParams, setRoomParams] = useState({
    roomId: 'lobby',
    mode: 'free',
    fee: 0
  })

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    setRoomParams({
      roomId: urlParams.get('room') || 'lobby',
      mode: urlParams.get('mode') || 'free',
      fee: parseInt(urlParams.get('fee') || '0', 10)
    })
  }, [])

  useEffect(() => {
    if (authenticated && user) {
      fetchUserBalance()
      initializeGame()
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy()
      }
    }
  }, [authenticated, user, roomParams])

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setBalance(data.balance)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const initializeGame = () => {
    if (!authenticated || !user) return

    // Dynamic import of socket.io-client
    if (typeof window !== 'undefined') {
      import('socket.io-client').then((io) => {
        // Initialize Socket.IO connection
        socketRef.current = io.default('/', {
          transports: ['websocket'],
          upgrade: false
        })

        setupSocketHandlers()
        initializePhaser()
      })
    }
  }

  const setupSocketHandlers = () => {
    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('🔌 Connected to game server')
      joinRoom()
    })

    socket.on('joined', (data) => {
      console.log('🎮 Joined room:', data)
      playerIdRef.current = data.playerId
      setRoomInfo(data)
    })

    socket.on('room_info', (info) => {
      setRoomInfo(info)
    })

    socket.on('match_start', (data) => {
      console.log('🚀 Match started:', data)
      setGameStatus('playing')
    })

    socket.on('game_state', (state) => {
      if (gameInstanceRef.current && gameInstanceRef.current.scene.scenes[0]) {
        gameInstanceRef.current.scene.scenes[0].handleGameState(state)
      }
      
      // Update player stats
      const myPlayer = state.players.find(p => p.id === playerIdRef.current)
      if (myPlayer) {
        const alivePlayers = state.players.filter(p => p.alive).sort((a, b) => b.mass - a.mass)
        const rank = alivePlayers.findIndex(p => p.id === playerIdRef.current) + 1
        setPlayerStats({ mass: Math.floor(myPlayer.mass), rank })
      }
    })

    socket.on('match_end', (result) => {
      console.log('🏁 Match ended:', result)
      setGameStatus('ended')
      setGameResult(result)
    })

    socket.on('payout_complete', (payout) => {
      console.log('💰 Payout completed:', payout)
      fetchUserBalance() // Refresh balance
    })

    socket.on('insufficient_balance', (data) => {
      setError(`Insufficient balance. Required: $${data.required}`)
    })

    socket.on('auth_error', (data) => {
      setError(data.message)
    })

    socket.on('player_eaten', (data) => {
      setError(`You were eaten by ${data.eatenBy}!`)
      setTimeout(() => setError(''), 3000)
    })
  }

  const joinRoom = () => {
    if (!socketRef.current || !authenticated) return

    const token = localStorage.getItem('auth_token')
    socketRef.current.emit('join_room', {
      roomId: roomParams.roomId,
      mode: roomParams.mode,
      fee: roomParams.fee,
      token
    })
  }

  const handleReady = () => {
    if (!socketRef.current || !authenticated) return

    if (roomParams.mode === 'cash' && balance < roomParams.fee) {
      setError(`Insufficient balance. Required: $${roomParams.fee}, Available: $${balance}`)
      return
    }

    setLoading(true)
    const token = localStorage.getItem('auth_token')
    socketRef.current.emit('player_ready', { token })
    
    setTimeout(() => setLoading(false), 2000)
  }

  const initializePhaser = () => {
    if (!gameContainerRef.current || gameInstanceRef.current) return

    // Dynamic import of Phaser
    if (typeof window !== 'undefined') {
      import('phaser').then((Phaser) => {
        class TurfLootGameScene extends Phaser.default.Scene {
          constructor() {
            super('TurfLootGame')
            this.graphics = null
            this.myPlayerId = null
            this.gameState = null
          }

          preload() {
            // No assets to preload
          }

          create() {
            this.cameras.main.setZoom(0.6)
            this.graphics = this.add.graphics()
            this.myPlayerId = playerIdRef.current

            // Handle mouse movement for direction
            this.input.on('pointermove', (pointer) => {
              if (this.myPlayerId && socketRef.current) {
                const camera = this.cameras.main
                const worldPoint = camera.getWorldPoint(pointer.x, pointer.y)
                const myPlayer = this.gameState?.players.find(p => p.id === this.myPlayerId)
                
                if (myPlayer && myPlayer.alive) {
                  const dx = worldPoint.x - myPlayer.x
                  const dy = worldPoint.y - myPlayer.y
                  const length = Math.hypot(dx, dy) || 1
                  
                  socketRef.current.emit('set_direction', {
                    x: dx / length,
                    y: dy / length
                  })
                }
              }
            })
          }

          handleGameState(state) {
            this.gameState = state
            
            // Follow player camera
            const myPlayer = state.players.find(p => p.id === this.myPlayerId)
            if (myPlayer && myPlayer.alive) {
              this.cameras.main.startFollow({ x: myPlayer.x, y: myPlayer.y }, true, 0.08, 0.08)
            }

            this.render()
          }

          render() {
            if (!this.gameState) return

            this.graphics.clear()

            // Draw grid
            this.drawGrid()

            // Draw food
            this.gameState.food.forEach(food => {
              this.graphics.fillStyle(0x10b981, 1)
              this.graphics.fillCircle(food.x, food.y, 4)
            })

            // Draw players
            this.gameState.players.forEach(player => {
              if (!player.alive) return

              const radius = Math.sqrt(player.mass) * 1.2
              const isMe = player.id === this.myPlayerId
              const color = isMe ? 0x00f5ff : 0x9ca3af
              
              // Player circle
              this.graphics.fillStyle(color, 1)
              this.graphics.fillCircle(player.x, player.y, radius)
              
              // Player border
              this.graphics.lineStyle(2, 0xffffff, 0.8)
              this.graphics.strokeCircle(player.x, player.y, radius)
              
              // Player name
              const nameText = this.add.text(
                player.x, 
                player.y - radius - 15, 
                player.nickname, 
                { 
                  fontSize: '14px', 
                  color: '#ffffff',
                  stroke: '#000000',
                  strokeThickness: 2
                }
              )
              nameText.setOrigin(0.5, 0.5)
              nameText.setDepth(10)
              
              // Auto-destroy text after render
              this.time.delayedCall(50, () => nameText.destroy())
            })
          }

          drawGrid() {
            const gridSize = 100
            this.graphics.lineStyle(1, 0x1f2937, 0.5)
            
            for (let x = -2000; x <= 2000; x += gridSize) {
              this.graphics.beginPath()
              this.graphics.moveTo(x, -2000)
              this.graphics.lineTo(x, 2000)
              this.graphics.strokePath()
            }
            
            for (let y = -2000; y <= 2000; y += gridSize) {
              this.graphics.beginPath()
              this.graphics.moveTo(-2000, y)
              this.graphics.lineTo(2000, y)
              this.graphics.strokePath()
            }
          }
        }

        const config = {
          type: Phaser.default.AUTO,
          parent: gameContainerRef.current,
          backgroundColor: '#0b0e13',
          width: window.innerWidth,
          height: window.innerHeight,
          physics: { default: 'arcade' },
          scene: [new TurfLootGameScene()]
        }

        gameInstanceRef.current = new Phaser.default.Game(config)
      })
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Login Required</h2>
          <p className="text-gray-400 mb-8">You need to login to play TurfLoot</p>
          <button 
            onClick={login}
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-6 rounded-xl transition-all"
          >
            Login to Play
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Game Canvas */}
      <div ref={gameContainerRef} className="absolute inset-0" />
      
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 space-y-4 pointer-events-none">
        {/* Player Stats */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/20">
          <div className="text-cyan-400 font-bold text-lg">TurfLoot</div>
          <div className="text-sm text-gray-300">Mass: {playerStats.mass}</div>
          <div className="text-sm text-gray-300">Rank: #{playerStats.rank}</div>
          <div className="text-sm text-gray-300">Balance: ${balance.toFixed(2)}</div>
        </div>

        {/* Room Info */}
        {roomInfo && (
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-yellow-400/20">
            <div className="text-yellow-400 font-bold">Room: {roomInfo.roomId}</div>
            <div className="text-sm text-gray-300">
              Mode: {roomInfo.mode} {roomInfo.fee > 0 && `($${roomInfo.fee})`}
            </div>
            <div className="text-sm text-gray-300">
              Players: {roomInfo.playerCount} ({roomInfo.readyCount} ready)
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      {gameStatus === 'lobby' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-cyan-400 mb-2">Ready to Play?</h3>
              {roomParams.mode === 'cash' && (
                <p className="text-yellow-400 text-sm">Entry Fee: ${roomParams.fee}</p>
              )}
            </div>
            
            <button
              onClick={handleReady}
              disabled={loading || (roomParams.mode === 'cash' && balance < roomParams.fee)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              {loading ? 'Joining...' : 'Ready to Play!'}
            </button>

            {roomParams.mode === 'cash' && balance < roomParams.fee && (
              <p className="text-red-400 text-sm mt-2 text-center">
                Insufficient balance. Add funds to play.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Game Result */}
      {gameStatus === 'ended' && gameResult && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 border border-cyan-400/30 text-center max-w-md">
            <div className="text-3xl font-bold mb-4">
              {gameResult.winnerId === playerIdRef.current ? '🏆 Victory!' : '💀 Game Over'}
            </div>
            
            <div className="text-gray-300 mb-6">
              <p className="mb-2">Winner: {gameResult.winnerName}</p>
              <p>Duration: {Math.floor(gameResult.duration / 1000)}s</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
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

      {/* Error Messages */}
      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="bg-red-600/90 backdrop-blur-sm rounded-lg p-4 border border-red-400/30">
            <p className="text-white font-bold">{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30 pointer-events-none">
        <div className="text-xs text-gray-300">
          <div>🖱️ Move mouse to control</div>
          <div>🍎 Eat food to grow</div>
          <div>⚔️ Eat smaller players</div>
        </div>
      </div>
    </div>
  )
}

export default TurfLootGame