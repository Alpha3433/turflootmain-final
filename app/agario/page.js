'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const AgarIOGame = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [missionTime, setMissionTime] = useState(60)
  const [score, setScore] = useState(0)
  const [mass, setMass] = useState(20)
  const [eliminations, setEliminations] = useState(0)
  
  // Cash out state
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutComplete, setCashOutComplete] = useState(false)
  
  // Minimap state for real-time updates
  const [minimapData, setMinimapData] = useState({
    playerX: 2000,
    playerY: 2000,
    enemies: [],
    coins: [],
    viruses: []
  })

  // Game Engine Class
  class GameEngine {
    constructor(canvas) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.world = { width: 4000, height: 4000 }
      this.camera = { x: 0, y: 0 }
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 }
      
      // Game objects
      this.player = {
        x: this.world.width / 2,
        y: this.world.height / 2,
        mass: 20,
        radius: 25,
        color: '#4A90E2',
        name: 'You',
        speed: 2,
        targetX: this.world.width / 2,
        targetY: this.world.height / 2
      }
      
      this.coins = []
      this.enemies = []
      this.viruses = []
      this.running = false
      this.lastUpdate = Date.now()
      
      this.generateCoins()
      this.generateEnemies()
      this.generateViruses()
      this.bindEvents()
    }

    generateCoins() {
      this.coins = []
      const centerX = this.world.width / 2  // 2000
      const centerY = this.world.height / 2 // 2000
      const playableRadius = 1800 // Same as boundary radius
      
      for (let i = 0; i < 100; i++) { // Increased from default to 100 coins
        let x, y, distance
        
        // Keep generating random positions until we get one inside the circular boundary
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 20) // 20px buffer from edge
        
        this.coins.push({
          x: x,
          y: y,
          radius: 8,
          value: 1,
          color: '#FFD700'
        })
      }
    }

    generateEnemies() {
      this.enemies = []
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
      for (let i = 0; i < 8; i++) {
        const mass = 15 + Math.random() * 40
        this.enemies.push({
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
          mass: mass,
          radius: Math.sqrt(mass) * 3,
          color: colors[i % colors.length],
          name: `Player ${i + 2}`,
          speed: Math.max(0.5, 2 - mass * 0.02),
          targetX: Math.random() * this.world.width,
          targetY: Math.random() * this.world.height,
          lastTargetChange: Date.now()
        })
      }
    }

    generateViruses() {
      this.viruses = []
      const centerX = this.world.width / 2  // 2000
      const centerY = this.world.height / 2 // 2000
      const playableRadius = 1800 // Same as boundary radius
      
      for (let i = 0; i < 25; i++) { // Increased from 15 to 25 viruses
        let x, y, distance
        
        // Keep generating random positions until we get one inside the circular boundary
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 50) // 50px buffer from edge (larger for viruses)
        
        this.viruses.push({
          x: x,
          y: y,
          radius: 35,
          color: '#00FF41',
          spikes: 12,
          mass: 100
        })
      }
    }

    bindEvents() {
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - rect.left
        this.mouse.y = e.clientY - rect.top
        
        // Convert to world coordinates
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.y + this.camera.y
        
        this.player.targetX = this.mouse.worldX
        this.player.targetY = this.mouse.worldY
      })

      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const touch = e.touches[0]
        this.mouse.x = touch.clientX - rect.left
        this.mouse.y = touch.clientY - rect.top
        
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.y + this.camera.y
        
        this.player.targetX = this.mouse.worldX
        this.player.targetY = this.mouse.worldY
      }, { passive: false })
    }

    update() {
      if (!this.running) return
      
      const now = Date.now()
      const deltaTime = (now - this.lastUpdate) / 1000
      this.lastUpdate = now

      // Update player
      this.updatePlayer(deltaTime)
      
      // Update enemies
      this.enemies.forEach(enemy => this.updateEnemy(enemy, deltaTime))
      
      // Check collisions
      this.checkCollisions()
      
      // Update camera
      this.updateCamera()
      
      // Maintain coin count
      while (this.coins.length < 100) {
        const centerX = this.world.width / 2  // 2000
        const centerY = this.world.height / 2 // 2000
        const playableRadius = 1800 // Same as boundary radius
        
        let x, y, distance
        
        // Keep generating random positions until we get one inside the circular boundary
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 20) // 20px buffer from edge
        
        this.coins.push({
          x: x,
          y: y,
          radius: 8,
          color: '#FFD700',
          value: 1
        })
      }
    }

    updatePlayer(deltaTime) {
      const dx = this.player.targetX - this.player.x
      const dy = this.player.targetY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const speed = Math.max(0.5, this.player.speed - this.player.mass * 0.01)
        const moveX = (dx / distance) * speed * 60 * deltaTime
        const moveY = (dy / distance) * speed * 60 * deltaTime
        
        this.player.x += moveX
        this.player.y += moveY
        
        // Circular boundary constraints (synced with minimap)
        const centerX = this.world.width / 2  // 2000
        const centerY = this.world.height / 2 // 2000
        const playableRadius = 1800 // Same as boundary radius
        
        const distanceFromCenter = Math.sqrt(
          Math.pow(this.player.x - centerX, 2) + 
          Math.pow(this.player.y - centerY, 2)
        )
        
        if (distanceFromCenter + this.player.radius > playableRadius) {
          // Push player back inside circular boundary
          const angle = Math.atan2(this.player.y - centerY, this.player.x - centerX)
          const maxDistance = playableRadius - this.player.radius
          this.player.x = centerX + Math.cos(angle) * maxDistance
          this.player.y = centerY + Math.sin(angle) * maxDistance
        }
      }
      
      this.player.radius = Math.sqrt(this.player.mass) * 3
    }

    updateEnemy(enemy, deltaTime) {
      const now = Date.now()
      
      if (now - enemy.lastTargetChange > 3000 + Math.random() * 2000) {
        enemy.targetX = Math.random() * this.world.width
        enemy.targetY = Math.random() * this.world.height
        enemy.lastTargetChange = now
      }
      
      const dx = enemy.targetX - enemy.x
      const dy = enemy.targetY - enemy.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const moveX = (dx / distance) * enemy.speed * 60 * deltaTime
        const moveY = (dy / distance) * enemy.speed * 60 * deltaTime
        
        enemy.x += moveX
        enemy.y += moveY
        
        enemy.x = Math.max(enemy.radius, Math.min(this.world.width - enemy.radius, enemy.x))
        enemy.y = Math.max(enemy.radius, Math.min(this.world.height - enemy.radius, enemy.y))
      }
    }

    checkCollisions() {
      // Player eating coins
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i]
        const dx = this.player.x - coin.x
        const dy = this.player.y - coin.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + coin.radius) {
          this.player.mass += coin.value
          setScore(prev => prev + coin.value)
          setMass(this.player.mass)
          this.coins.splice(i, 1)
        }
      }
      
      // Player vs viruses (authentic Agar.io mechanics)
      for (let i = this.viruses.length - 1; i >= 0; i--) {
        const virus = this.viruses[i]
        const dx = this.player.x - virus.x
        const dy = this.player.y - virus.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + virus.radius) {
          if (this.player.mass > virus.mass) {
            // Player is bigger than virus - split player into multiple pieces (authentic Agar.io)
            const splitCount = Math.min(4, Math.floor(this.player.mass / 40)) // More mass = more splits
            const pieceCount = Math.max(2, splitCount)
            const pieceMass = this.player.mass / pieceCount
            
            // Keep main player as one piece
            this.player.mass = pieceMass
            setMass(Math.floor(pieceMass))
            
            // Create additional player pieces (simplified - just reduce main player mass significantly)
            // In full implementation, this would create multiple controllable pieces
            this.player.mass = Math.max(20, this.player.mass * 0.4) // Much more severe penalty like real Agar.io
            
            // Eject player away from virus
            const ejectDistance = 80
            const ejectAngle = Math.atan2(dx, dy)
            this.player.x += Math.sin(ejectAngle) * ejectDistance
            this.player.y += Math.cos(ejectAngle) * ejectDistance
            
            // Remove the virus (consumed)
            this.viruses.splice(i, 1)
            
            // Spawn a new virus elsewhere to maintain count (within circular boundary)
            const centerX = this.world.width / 2  // 2000
            const centerY = this.world.height / 2 // 2000
            const playableRadius = 1800 // Same as boundary radius
            
            let newX, newY, newDistance
            
            // Keep generating random positions until we get one inside the circular boundary
            do {
              newX = Math.random() * this.world.width
              newY = Math.random() * this.world.height
              newDistance = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2))
            } while (newDistance > playableRadius - 50) // 50px buffer from edge
            
            this.viruses.push({
              x: newX,
              y: newY,
              radius: 35,
              color: '#00FF41',
              spikes: 12,
              mass: 100
            })
            
          } else {
            // Player is smaller - can hide behind virus (no collision with small players)
            // This allows small players to use viruses as protection like in real Agar.io
            continue
          }
        }
      }
      
      // Player vs enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        const dx = this.player.x - enemy.x
        const dy = this.player.y - enemy.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + enemy.radius - 10) {
          if (this.player.mass > enemy.mass * 1.2) {
            // Player eats enemy
            this.player.mass += enemy.mass * 0.8
            setScore(prev => prev + Math.floor(enemy.mass))
            setEliminations(prev => prev + 1)
            setMass(this.player.mass)
            
            // Respawn enemy
            enemy.mass = 15 + Math.random() * 40
            enemy.radius = Math.sqrt(enemy.mass) * 3
            enemy.x = Math.random() * this.world.width
            enemy.y = Math.random() * this.world.height
          } else if (enemy.mass > this.player.mass * 1.2) {
            // Enemy eats player - Game Over
            this.running = false
            setGameOver(true)
          }
        }
      }
      
      // Enemies eating coins
      this.enemies.forEach(enemy => {
        for (let i = this.coins.length - 1; i >= 0; i--) {
          const coin = this.coins[i]
          const dx = enemy.x - coin.x
          const dy = enemy.y - coin.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < enemy.radius + coin.radius) {
            enemy.mass += coin.value * 0.5
            enemy.radius = Math.sqrt(enemy.mass) * 3
            this.coins.splice(i, 1)
            break
          }
        }
      })
    }

    updateCamera() {
      const targetX = this.player.x - this.canvas.width / 2
      const targetY = this.player.y - this.canvas.height / 2
      
      this.camera.x += (targetX - this.camera.x) * 0.1
      this.camera.y += (targetY - this.camera.y) * 0.1
      
      // Allow camera to show red boundary areas (extend bounds by 100px)
      const boundaryExtension = 100
      this.camera.x = Math.max(-boundaryExtension, Math.min(this.world.width - this.canvas.width + boundaryExtension, this.camera.x))
      this.camera.y = Math.max(-boundaryExtension, Math.min(this.world.height - this.canvas.height + boundaryExtension, this.camera.y))
    }

    render() {
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      this.ctx.save()
      this.ctx.translate(-this.camera.x, -this.camera.y)
      
      // Draw grid
      this.drawGrid()
      
      // Draw world boundary (red ring)
      this.drawWorldBoundary()
      
      // Draw coins
      this.coins.forEach(coin => this.drawCoin(coin))
      
      // Draw viruses
      this.viruses.forEach(virus => this.drawVirus(virus))
      
      // Draw enemies
      this.enemies.forEach(enemy => this.drawPlayer(enemy))
      
      // Draw player
      this.drawPlayer(this.player)
      
      this.ctx.restore()
    }

    drawGrid() {
      this.ctx.strokeStyle = '#1a1a1a'
      this.ctx.lineWidth = 1
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
    }

    drawWorldBoundary() {
      // Draw circular red boundary ring around the playable area (synced with minimap)
      const centerX = this.world.width / 2  // 2000
      const centerY = this.world.height / 2 // 2000
      const playableRadius = 1800 // Circular play area radius
      
      // Fill entire canvas with red first (out of bounds area)
      this.ctx.fillStyle = 'rgba(255, 68, 68, 0.4)'
      this.ctx.fillRect(-1000, -1000, this.world.width + 2000, this.world.height + 2000)
      
      // Draw playable area (black circle to create the safe zone)
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
      
      // Draw the boundary circle (green border like minimap)
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = '#00ff00'
      this.ctx.lineWidth = 8
      this.ctx.stroke()
      
      // Add glowing effect
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'
      this.ctx.lineWidth = 16
      this.ctx.stroke()
      
      // Add inner glow
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)'
      this.ctx.lineWidth = 24
      this.ctx.stroke()
    }

    drawCoin(coin) {
      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = coin.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#FFB000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
      
      // Draw $ symbol
      this.ctx.fillStyle = '#000000'
      this.ctx.font = 'bold 12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('$', coin.x, coin.y + 4)
    }

    drawPlayer(player) {
      // Draw player circle
      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = player.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 3
      this.ctx.stroke()
      
      // Draw player name
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 14px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(player.name, player.x, player.y - player.radius - 15)
      
      // Draw mass
      this.ctx.font = '12px Arial'
      this.ctx.fillText(Math.floor(player.mass), player.x, player.y + 4)
    }

    drawVirus(virus) {
      // Draw virus with spiky appearance
      this.ctx.save()
      this.ctx.translate(virus.x, virus.y)
      
      // Draw spikes
      this.ctx.beginPath()
      for (let i = 0; i < virus.spikes; i++) {
        const angle = (i / virus.spikes) * Math.PI * 2
        const spikeLength = virus.radius + 8
        const innerRadius = virus.radius - 5
        
        if (i === 0) {
          this.ctx.moveTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength)
        } else {
          this.ctx.lineTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength)
        }
        
        const nextAngle = ((i + 0.5) / virus.spikes) * Math.PI * 2
        this.ctx.lineTo(Math.cos(nextAngle) * innerRadius, Math.sin(nextAngle) * innerRadius)
      }
      this.ctx.closePath()
      this.ctx.fillStyle = virus.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#00AA00'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
      
      // Draw inner circle
      this.ctx.beginPath()
      this.ctx.arc(0, 0, virus.radius - 10, 0, Math.PI * 2)
      this.ctx.fillStyle = '#004400'
      this.ctx.fill()
      
      this.ctx.restore()
    }

    start() {
      this.running = true
      setGameStarted(true)
    }

    stop() {
      this.running = false
    }

    split() {
      if (this.player.mass > 20) {
        this.player.mass = this.player.mass * 0.8
        setMass(this.player.mass)
      }
    }
  }

  useEffect(() => {
    // Remove default body margins/padding that might cause white borders
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.margin = '0'
    document.documentElement.style.padding = '0'
    
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    // Set canvas size properly
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    const game = new GameEngine(canvas)
    gameRef.current = game
    
    game.start()

    // Game loop
    const gameLoop = () => {
      if (game.running) {
        game.update()
        game.render()
        
        // Update minimap data for React state (every few frames to avoid performance issues)
        if (Date.now() % 100 < 16) { // Update roughly every 100ms
          setMinimapData({
            playerX: game.player.x,
            playerY: game.player.y,
            enemies: game.enemies.map(enemy => ({ x: enemy.x, y: enemy.y })),
            coins: game.coins.map(coin => ({ x: coin.x, y: coin.y })),
            viruses: game.viruses.map(virus => ({ x: virus.x, y: virus.y }))
          })
          
          // Update other game stats
          setScore(Math.floor(game.player.mass - 20))
          setMass(Math.floor(game.player.mass))
        }
      }
      requestAnimationFrame(gameLoop)
    }
    gameLoop()

    return () => {
      game.stop()
      window.removeEventListener('resize', setCanvasSize)
      // Reset body styles when component unmounts
      document.body.style.margin = ''
      document.body.style.padding = ''
      document.body.style.overflow = ''
      document.documentElement.style.margin = ''
      document.documentElement.style.padding = ''
    }
  }, [])

  // Mission timer
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const timer = setInterval(() => {
      setMissionTime(prev => {
        if (prev <= 1) {
          setGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameOver])

  const handleSplit = () => {
    if (gameRef.current) {
      gameRef.current.split()
    }
  }

  const handleRestart = () => {
    setGameOver(false)
    setMissionTime(60)
    setScore(0)
    setMass(20)
    setEliminations(0)
    
    if (gameRef.current) {
      gameRef.current.player = {
        x: gameRef.current.world.width / 2,
        y: gameRef.current.world.height / 2,
        mass: 20,
        radius: 25,
        color: '#4A90E2',
        name: 'You',
        speed: 2,
        targetX: gameRef.current.world.width / 2,
        targetY: gameRef.current.world.height / 2
      }
      gameRef.current.generateCoins()
      gameRef.current.generateEnemies()
      gameRef.current.start()
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPlayerPosition = () => {
    if (!gameRef.current) return { x: 50, y: 50 }
    const player = gameRef.current.player
    const world = gameRef.current.world
    return {
      x: (player.x / world.width) * 100,
      y: (player.y / world.height) * 100
    }
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0" style={{ position: 'relative', margin: 0, padding: 0 }}>
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

      {/* DESKTOP HUD UI Elements - Always Visible */}
      <div>
        {/* Live Leaderboard - Smaller Version */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '10px', 
            left: '10px', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '2px solid rgba(0, 255, 255, 0.3)',
            borderRadius: '6px',
            padding: '10px',
            minWidth: '160px',
            fontFamily: '"Rajdhani", sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ 
            color: '#00ffff', 
            fontSize: '14px', 
            fontWeight: '700', 
            marginBottom: '10px',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            💰 Live Leaderboard
          </div>
          
          {/* Player Rankings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
            {/* 1st Place */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '4px 8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#ffdd44', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  marginRight: '8px'
                }}>
                  #1
                </span>
                <span style={{ 
                  color: '#ffffff', 
                  fontSize: '12px', 
                  fontWeight: '600' 
                }}>
                  Player 13
                </span>
              </div>
              <span style={{ 
                color: '#00ff88', 
                fontSize: '12px', 
                fontWeight: '700'
              }}>
                $277
              </span>
            </div>
            
            {/* 2nd Place - You (highlighted) */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '4px 8px',
              border: '1px solid #00ffff',
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#ffffff', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  marginRight: '8px'
                }}>
                  #2
                </span>
                <span style={{ 
                  color: '#00ffff', 
                  fontSize: '12px', 
                  fontWeight: '700' 
                }}>
                  You
                </span>
              </div>
              <span style={{ 
                color: '#00ff88', 
                fontSize: '12px', 
                fontWeight: '700'
              }}>
                ${score}
              </span>
            </div>
            
            {/* 3rd Place */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '4px 8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#ff8844', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  marginRight: '8px'
                }}>
                  #3
                </span>
                <span style={{ 
                  color: '#ffffff', 
                  fontSize: '12px', 
                  fontWeight: '600' 
                }}>
                  Player 14
                </span>
              </div>
              <span style={{ 
                color: '#00ff88', 
                fontSize: '12px', 
                fontWeight: '700'
              }}>
                $196
              </span>
            </div>
            
            {/* 4th Place */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '4px 8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#aaaaaa', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  marginRight: '8px'
                }}>
                  #4
                </span>
                <span style={{ 
                  color: '#ffffff', 
                  fontSize: '12px', 
                  fontWeight: '600' 
                }}>
                  Player 2
                </span>
              </div>
              <span style={{ 
                color: '#00ff88', 
                fontSize: '12px', 
                fontWeight: '700'
              }}>
                $193
              </span>
            </div>
            
            {/* 5th Place */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '4px 8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#aaaaaa', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  marginRight: '8px'
                }}>
                  #5
                </span>
                <span style={{ 
                  color: '#ffffff', 
                  fontSize: '12px', 
                  fontWeight: '600' 
                }}>
                  Player 12
                </span>
              </div>
              <span style={{ 
                color: '#00ff88', 
                fontSize: '12px', 
                fontWeight: '700'
              }}>
                $177
              </span>
            </div>
          </div>
          
          {/* Players in game counter */}
          <div style={{ 
            color: '#00ffff', 
            fontSize: '10px', 
            fontWeight: '600',
            textAlign: 'center',
            paddingTop: '6px',
            borderTop: '1px solid rgba(0, 255, 255, 0.3)'
          }}>
            11 players in game
          </div>
        </div>

        {/* Action Buttons - Matching Reference Style */}
        
        {/* Cash Out Button - Bottom Center */}
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div 
            style={{
              backgroundColor: 'rgba(255, 165, 0, 0.95)',
              border: '2px solid #ff8c00',
              borderRadius: '8px',
              color: '#000000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              textAlign: 'center',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: '0 4px 12px rgba(255, 165, 0, 0.4)',
              minWidth: '200px',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 200, 50, 0.98)'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(255, 165, 0, 0.5)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 165, 0, 0.95)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(255, 165, 0, 0.4)'
            }}
          >
            🔥 Hold E to Cash Out (${score})
          </div>

          {/* Split Button - Same height as Cash Out */}
          <div 
            onClick={handleSplit}
            style={{
              backgroundColor: 'rgba(255, 0, 0, 0.9)',
              border: '2px solid #ff0000',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: '0 4px 12px rgba(255, 0, 0, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 50, 50, 0.95)'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(255, 0, 0, 0.4)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 0, 0, 0.9)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(255, 0, 0, 0.3)'
            }}
          >
            ⚡ Split (S)
          </div>
        </div>

        {/* Circular Minimap - Top Right (larger and faster updates) */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          width: '220px',
          height: '220px'
        }}>
          {/* Minimap Container */}
          <div style={{
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            backgroundColor: '#000000',
            border: '4px solid #00ff00',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.6)'
          }}>
            {/* Green spiky border effect */}
            <div style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              right: '-3px',
              bottom: '-3px',
              borderRadius: '50%',
              background: `conic-gradient(
                #00ff00 0deg, #00dd00 10deg, #00ff00 20deg, #00ee00 30deg,
                #00ff00 40deg, #00cc00 50deg, #00ff00 60deg, #00dd00 70deg,
                #00ff00 80deg, #00ee00 90deg, #00ff00 100deg, #00dd00 110deg,
                #00ff00 120deg, #00cc00 130deg, #00ff00 140deg, #00ee00 150deg,
                #00ff00 160deg, #00dd00 170deg, #00ff00 180deg, #00cc00 190deg,
                #00ff00 200deg, #00ee00 210deg, #00ff00 220deg, #00dd00 230deg,
                #00ff00 240deg, #00cc00 250deg, #00ff00 260deg, #00ee00 270deg,
                #00ff00 280deg, #00dd00 290deg, #00ff00 300deg, #00cc00 310deg,
                #00ff00 320deg, #00ee00 330deg, #00ff00 340deg, #00dd00 350deg
              )`,
              zIndex: -1
            }} />
            
            {/* Red danger zone ring (outer area) */}
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
            
            {/* Player dot on minimap - using state data */}
            <div style={{
              position: 'absolute',
              width: '12px',
              height: '12px',
              backgroundColor: '#60a5fa',
              borderRadius: '50%',
              left: `${(minimapData.playerX / 4000) * 210 + 5}px`,
              top: `${(minimapData.playerY / 4000) * 210 + 5}px`,
              transform: 'translate(-50%, -50%)',
              border: '3px solid #ffffff',
              boxShadow: '0 0 12px rgba(96, 165, 250, 1)',
              zIndex: 10
            }} />
            
            {/* Enemy dots on minimap - using state data */}
            {minimapData.enemies.map((enemy, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#ff6b6b',
                  borderRadius: '50%',
                  left: `${(enemy.x / 4000) * 210 + 5}px`,
                  top: `${(enemy.y / 4000) * 210 + 5}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: '0.9',
                  border: '1px solid #ffffff',
                  zIndex: 8
                }}
              />
            ))}
            
            {/* Coin dots on minimap - using state data */}
            {minimapData.coins.map((coin, i) => (
              <div
                key={`coin-${i}`}
                style={{
                  position: 'absolute',
                  width: '4px',
                  height: '4px',
                  backgroundColor: '#ffd700',
                  borderRadius: '50%',
                  left: `${(coin.x / 4000) * 210 + 5}px`,
                  top: `${(coin.y / 4000) * 210 + 5}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: '1',
                  boxShadow: '0 0 4px rgba(255, 215, 0, 0.8)',
                  zIndex: 7
                }}
              />
            ))}
            
            {/* Virus dots on minimap - using state data */}
            {minimapData.viruses.map((virus, i) => (
              <div
                key={`virus-${i}`}
                style={{
                  position: 'absolute',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#00ff41',
                  borderRadius: '50%',
                  left: `${(virus.x / 4000) * 210 + 5}px`,
                  top: `${(virus.y / 4000) * 210 + 5}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: '1',
                  border: '1px solid #00aa00',
                  boxShadow: '0 0 6px rgba(0, 255, 65, 0.8)',
                  zIndex: 6
                }}
              />
            ))}
            
            {/* Border spikes effect overlay */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              borderRadius: '50%',
              border: '3px solid rgba(0, 255, 0, 0.8)',
              boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.4)',
              zIndex: 3
            }} />
          </div>
        </div>

        {/* Ping Latency Meter - Bottom Left */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #333',
          borderRadius: '4px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#ccc',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: '600'
        }}>
          <div style={{ 
            color: '#00ff88', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#00ff88', 
              borderRadius: '50%' 
            }}></div>
            <span>24ms</span>
          </div>
        </div>

        {/* Player Info Panel - Bottom Right (larger with landing page font) */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #333',
          borderRadius: '4px',
          padding: '12px 16px',
          fontSize: '13px',
          color: '#ccc',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: '600',
          minWidth: '140px'
        }}>
          {/* Header */}
          <div style={{ 
            color: '#22d3ee', 
            fontSize: '14px', 
            fontWeight: '700', 
            marginBottom: '8px',
            borderBottom: '1px solid #333',
            paddingBottom: '6px'
          }}>
            You
          </div>
          
          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Net Worth:</span>
              <span style={{ color: '#22c55e', fontWeight: '700' }}>${score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Total Mass:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{mass}</span>
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
              <span style={{ color: '#9ca3af' }}>Coins Collected:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Time Alive:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>0:00</span>
            </div>
          </div>
        </div>

        {/* Game Over Popup */}
        {gameOver && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ff4444',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              padding: '0',
              color: 'white',
              boxShadow: '0 0 50px rgba(255, 68, 68, 0.5)',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid #ff4444',
                background: 'linear-gradient(45deg, rgba(255, 68, 68, 0.1) 0%, rgba(255, 68, 68, 0.05) 100%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(45deg, #ff4444 0%, #cc3333 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '30px',
                  margin: '0 auto 16px'
                }}>
                  💀
                </div>
                <h2 style={{
                  color: '#ff4444',
                  fontSize: '32px',
                  fontWeight: '700',
                  margin: '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(255, 68, 68, 0.6)'
                }}>
                  GAME OVER
                </h2>
                <p style={{
                  color: '#e2e8f0',
                  fontSize: '16px',
                  margin: '0',
                  opacity: '0.8'
                }}>
                  Your operative has been eliminated!
                </p>
              </div>

              {/* Stats */}
              <div style={{ padding: '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#68d391', fontSize: '24px', fontWeight: '700' }}>
                      ${score}
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Final Score</div>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#60a5fa', fontSize: '24px', fontWeight: '700' }}>
                      {mass} KG
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Final Mass</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexDirection: 'column'
                }}>
                  <button
                    onClick={handleRestart}
                    style={{
                      backgroundColor: '#68d391',
                      border: '2px solid #48bb78',
                      borderRadius: '8px',
                      color: '#1a202c',
                      fontSize: '18px',
                      fontWeight: '700',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#48bb78'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#68d391'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🔄 Play Again
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    style={{
                      backgroundColor: 'transparent',
                      border: '2px solid #a0aec0',
                      borderRadius: '8px',
                      color: '#a0aec0',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#a0aec0'
                      e.target.style.color = '#1a202c'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent'
                      e.target.style.color = '#a0aec0'
                    }}
                  >
                    🏠 Back to Lobby
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  )
}

export default AgarIOGame