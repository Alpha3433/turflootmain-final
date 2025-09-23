'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import colyseusClient from '../../lib/colyseus.js'

const MultiplayerArena = () => {
  console.log('🎮 MULTIPLAYER ARENA - Pure Colyseus multiplayer mode')
  
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const wsRef = useRef(null)
  
  // Game states
  const [gameReady, setGameReady] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [playerCount, setPlayerCount] = useState(0)
  const [mass, setMass] = useState(100)
  const [score, setScore] = useState(0)
  const [serverState, setServerState] = useState(null)
  
  // Input handling
  const inputSequenceRef = useRef(0)
  const lastInputRef = useRef({ dx: 0, dy: 0 })
  
  // Parse URL parameters
  const roomId = searchParams.get('roomId') || 'global-turfloot-arena'
  const playerName = searchParams.get('playerName') || 'Anonymous Player'
  const privyUserId = searchParams.get('privyUserId') || `anonymous_${Date.now()}`
  
  console.log('🎮 Arena parameters:', { roomId, playerName, privyUserId })

  // Colyseus connection and input handling
  const connectToColyseus = async () => {
    try {
      console.log('🚀 Connecting to Colyseus arena...')
      setConnectionStatus('connecting')
      
      const client = colyseusClient
      
      const room = await client.joinArena({
        roomName: roomId,
        playerName: playerName,
        privyUserId: privyUserId
      })
      
      wsRef.current = room
      setConnectionStatus('connected')
      console.log('✅ Connected to arena:', room.id)
      
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
        
        // Process players
        if (state.players) {
          state.players.forEach((player, sessionId) => {
            gameState.players.push({
              ...player,
              sessionId,
              isCurrentPlayer: sessionId === room.sessionId
            })
          })
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
        }
      })
      
    } catch (error) {
      console.error('❌ Colyseus connection failed:', error)
      setConnectionStatus('failed')
    }
  }
  
  // Send input to server
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

  // Pure multiplayer game engine
  class MultiplayerGameEngine {
    constructor(canvas) {
      console.log('🎮 Initializing pure multiplayer game engine')
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.running = false
      
      // World setup
      this.world = { width: 4000, height: 4000 }
      this.camera = { x: 0, y: 0 }
      
      // Player setup
      this.player = {
        x: 2000, y: 2000, mass: 100, radius: 25,
        color: '#4A90E2', name: playerName, alive: true
      }
      
      // Server state - no local generation
      this.serverState = null
      
      this.setupInput()
      console.log('✅ Pure multiplayer engine initialized')
    }
    
    setupInput() {
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        const centerX = this.canvas.width / 2
        const centerY = this.canvas.height / 2
        
        const dx = (mouseX - centerX) / centerX
        const dy = (mouseY - centerY) / centerY
        
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance > 0.1) {
          const normalizedDx = dx / distance
          const normalizedDy = dy / distance
          sendInput(normalizedDx, normalizedDy)
        }
      })
    }
    
    updateFromServer(state) {
      this.serverState = state
      
      // Update current player from server
      const currentPlayer = state.players.find(p => p.isCurrentPlayer)
      if (currentPlayer) {
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
        
        // Always update other properties directly
        this.player.mass = currentPlayer.mass
        this.player.radius = currentPlayer.radius
        this.player.name = currentPlayer.name
        this.player.alive = currentPlayer.alive
        
        // Update UI
        setMass(Math.floor(currentPlayer.mass))
        setScore(Math.floor(currentPlayer.score || 0))
      }
    }
    
    updateCamera() {
      // Only update camera if player position is valid
      if (!this.player.x || !this.player.y) return
      
      const targetX = this.player.x - this.canvas.width / 2
      const targetY = this.player.y - this.canvas.height / 2
      
      // Use gentler smoothing to prevent camera jumping
      const smoothing = 0.08
      this.camera.x += (targetX - this.camera.x) * smoothing
      this.camera.y += (targetY - this.camera.y) * smoothing
      
      // Keep camera within reasonable bounds
      const boundaryExtension = 200
      this.camera.x = Math.max(-boundaryExtension, Math.min(this.world.width - this.canvas.width + boundaryExtension, this.camera.x))
      this.camera.y = Math.max(-boundaryExtension, Math.min(this.world.height - this.canvas.height + boundaryExtension, this.camera.y))
    }
    
    render() {
      // Clear canvas
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      if (!this.serverState) {
        // Show loading state
        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = '24px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillText('Waiting for server...', this.canvas.width / 2, this.canvas.height / 2)
        return
      }
      
      this.ctx.save()
      this.ctx.translate(-this.camera.x, -this.camera.y)
      
      // Draw grid
      this.drawGrid()
      
      // Draw server coins
      this.serverState.coins.forEach(coin => this.drawCoin(coin))
      
      // Draw server viruses  
      this.serverState.viruses.forEach(virus => this.drawVirus(virus))
      
      // Draw all players
      this.serverState.players.forEach(player => {
        if (player.alive) {
          this.drawPlayer(player, player.isCurrentPlayer)
        }
      })
      
      this.ctx.restore()
    }
    
    drawGrid() {
      this.ctx.strokeStyle = '#333333'
      this.ctx.lineWidth = 1
      
      const gridSize = 100
      const startX = Math.floor(this.camera.x / gridSize) * gridSize
      const startY = Math.floor(this.camera.y / gridSize) * gridSize
      const endX = this.camera.x + this.canvas.width
      const endY = this.camera.y + this.canvas.height
      
      for (let x = startX; x <= endX; x += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(x, this.camera.y)
        this.ctx.lineTo(x, endY)
        this.ctx.stroke()
      }
      
      for (let y = startY; y <= endY; y += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(this.camera.x, y)
        this.ctx.lineTo(endX, y)
        this.ctx.stroke()
      }
    }
    
    drawCoin(coin) {
      this.ctx.fillStyle = '#ffeb3b'
      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, coin.radius || 8, 0, Math.PI * 2)
      this.ctx.fill()
      
      this.ctx.strokeStyle = '#fff'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
    
    drawVirus(virus) {
      this.ctx.fillStyle = '#8e24aa'
      this.ctx.beginPath()
      this.ctx.arc(virus.x, virus.y, virus.radius || 40, 0, Math.PI * 2)
      this.ctx.fill()
      
      this.ctx.strokeStyle = '#4a148c'
      this.ctx.lineWidth = 3
      this.ctx.stroke()
    }
    
    drawPlayer(player, isCurrentPlayer = false) {
      // Player circle
      this.ctx.fillStyle = player.color || '#4A90E2'
      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Border (thicker for current player)
      this.ctx.strokeStyle = isCurrentPlayer ? '#ffffff' : '#cccccc'
      this.ctx.lineWidth = isCurrentPlayer ? 4 : 2
      this.ctx.stroke()
      
      // Player name
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '16px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(player.name, player.x, player.y + 5)
    }
    
    update() {
      this.updateCamera()
    }
    
    start() {
      this.running = true
      this.gameLoop()
    }
    
    stop() {
      this.running = false
    }
    
    gameLoop() {
      if (this.running) {
        this.update()
        this.render()
        requestAnimationFrame(() => this.gameLoop())
      }
    }
  }
  
  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return
    
    console.log('🎮 Initializing multiplayer arena')
    
    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    const game = new MultiplayerGameEngine(canvas)
    gameRef.current = game
    
    game.start()
    setGameReady(true)
    
    // Connect to Colyseus
    connectToColyseus()
    
    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      game.stop()
      window.removeEventListener('resize', handleResize)
      if (wsRef.current) {
        wsRef.current.leave()
      }
    }
  }, [])
  
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000' }}>
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'none' }}
      />
      
      {/* UI Overlay */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }}>
        <div>🎮 Multiplayer Arena</div>
        <div>Status: {connectionStatus}</div>
        <div>Players: {playerCount}</div>
        <div>Mass: {mass}</div>
        <div>Score: {score}</div>
      </div>
      
      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          fontSize: '24px',
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          {connectionStatus === 'connecting' && '🔄 Connecting to arena...'}
          {connectionStatus === 'failed' && '❌ Connection failed'}
        </div>
      )}
      
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          backgroundColor: '#ff4444',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Exit Arena
      </button>
    </div>
  )
}

export default MultiplayerArena