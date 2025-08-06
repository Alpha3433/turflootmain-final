'use client'

import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  Trophy, 
  Clock, 
  Zap,
  MapPin,
  DollarSign,
  Wifi,
  WifiOff
} from 'lucide-react'

export function MultiplayerGameClient({ stake = 1, onGameEnd }) {
  const { user, token } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const [myPlayer, setMyPlayer] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(120)
  const [isInGame, setIsInGame] = useState(false)
  const [gameStatus, setGameStatus] = useState('waiting') // waiting, active, finished

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !token) return

    const socket = io(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000', {
      auth: {
        token: token
      }
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to game server')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from game server')
      setConnected(false)
    })

    // Game events
    socket.on('game_joined', (data) => {
      console.log('Joined game:', data)
      setGameState(data.gameState)
      setPlayers(data.players)
      setMyPlayer(data.player)
      setIsInGame(true)
      setGameStatus('waiting')
    })

    socket.on('game_started', (data) => {
      console.log('Game started:', data)
      setGameState(data.gameState)
      setPlayers(data.players)
      setGameStatus('active')
      setTimeRemaining(data.gameState.duration)
    })

    socket.on('player_joined', (player) => {
      console.log('Player joined:', player)
      setPlayers(prev => [...prev, player])
    })

    socket.on('player_left', (data) => {
      console.log('Player left:', data)
      setPlayers(prev => prev.filter(p => p.id !== data.playerId))
    })

    socket.on('player_update', (data) => {
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, position: data.gameState.position, trail: data.gameState.trail }
          : p
      ))
    })

    socket.on('territory_update', (data) => {
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, territory: data.territory }
          : p
      ))
      
      if (data.playerId === user.id) {
        setMyPlayer(prev => ({ ...prev, territory: data.territory }))
      }
    })

    socket.on('player_cashed_out', (data) => {
      console.log('Player cashed out:', data)
      setPlayers(prev => prev.filter(p => p.id !== data.playerId))
    })

    socket.on('cash_out_success', (data) => {
      console.log('Cash out successful:', data)
      setIsInGame(false)
      setGameStatus('finished')
      if (onGameEnd) {
        onGameEnd({
          result: 'cash_out',
          payout: data.payout,
          territory: data.territory
        })
      }
    })

    socket.on('game_ended', (data) => {
      console.log('Game ended:', data)
      setGameStatus('finished')
      setIsInGame(false)
      if (onGameEnd) {
        onGameEnd({
          result: data.winner?.id === user.id ? 'win' : 'loss',
          winner: data.winner,
          payouts: data.payouts,
          finalStandings: data.finalStandings
        })
      }
    })

    socket.on('join_error', (data) => {
      console.error('Join error:', data)
      alert(`Failed to join game: ${data.message}`)
    })

    socket.on('cash_out_error', (data) => {
      console.error('Cash out error:', data)
      alert(`Cash out failed: ${data.message}`)
    })

    return () => {
      socket.disconnect()
    }
  }, [user, token, onGameEnd])

  // Game timer
  useEffect(() => {
    if (gameStatus === 'active' && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [timeRemaining, gameStatus])

  // Join game
  const joinGame = () => {
    if (socketRef.current && connected) {
      socketRef.current.emit('join_game', {
        stake,
        gameMode: 'territory'
      })
    }
  }

  // Leave game
  const leaveGame = () => {
    if (socketRef.current && isInGame) {
      socketRef.current.emit('leave_game', {
        roomId: gameState?.id
      })
      setIsInGame(false)
      setGameStatus('waiting')
    }
  }

  // Cash out
  const cashOut = () => {
    if (socketRef.current && isInGame && myPlayer?.territory > 0) {
      socketRef.current.emit('cash_out', {
        roomId: gameState?.id
      })
    }
  }

  // Update game state (called by game engine)
  const updateGameState = (position, trail) => {
    if (socketRef.current && isInGame) {
      socketRef.current.emit('game_update', {
        roomId: gameState?.id,
        gameState: {
          position,
          trail
        }
      })
    }
  }

  // Update territory (called by game engine)
  const updateTerritory = (territory) => {
    if (socketRef.current && isInGame) {
      socketRef.current.emit('territory_update', {
        roomId: gameState?.id,
        territory
      })
    }
  }

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!user) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please authenticate to join multiplayer games</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center">
              {connected ? (
                <Wifi className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 mr-2 text-red-500" />
              )}
              Multiplayer Status
            </span>
            <Badge variant={connected ? 'default' : 'destructive'}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Game Controls */}
      {!isInGame ? (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">Join ${stake} Table</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Compete against other players in real-time territory battles
              </p>
            </div>
            
            <Button 
              onClick={joinGame} 
              disabled={!connected}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Multiplayer Game
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Game Info */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  Game Status
                </span>
                <Badge variant={gameStatus === 'active' ? 'default' : 'secondary'}>
                  {gameStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Prize Pool:</span>
                  <span className="font-bold text-primary">
                    ${gameState?.prizePool?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Time Remaining:</span>
                  <span className="font-bold text-accent">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Players:</span>
                  <span className="font-bold">{players.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Territory */}
          {myPlayer && (
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  My Territory
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Captured</span>
                      <span className="font-bold">{myPlayer.territory.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={myPlayer.territory} 
                      className="h-2 bg-muted"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estimated Value:</span>
                    <span className="font-bold text-primary">
                      ${((gameState?.prizePool || 0) * (myPlayer.territory / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players List */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Players ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {players.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        player.id === user.id ? 'bg-primary' : 'bg-muted-foreground'
                      }`} />
                      <span className="text-sm font-medium">
                        {player.username}
                        {player.id === user.id && ' (You)'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {player.territory?.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={cashOut}
              disabled={!myPlayer || myPlayer.territory === 0 || gameStatus !== 'active'}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Cash Out (${myPlayer ? ((gameState?.prizePool || 0) * (myPlayer.territory / 100)).toFixed(2) : '0.00'})
            </Button>
            
            <Button
              onClick={leaveGame}
              variant="outline"
              className="w-full"
            >
              Leave Game
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// Export the game state update functions for use by the game engine
export { MultiplayerGameClient }