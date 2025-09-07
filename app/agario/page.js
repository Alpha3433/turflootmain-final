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
      this.running = false
      this.lastUpdate = Date.now()
      
      this.generateCoins()
      this.generateEnemies()
      this.bindEvents()
    }

    generateCoins() {
      this.coins = []
      for (let i = 0; i < 300; i++) {
        this.coins.push({
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
          radius: 8,
          color: '#FFD700',
          value: 1
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
      while (this.coins.length < 300) {
        this.coins.push({
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
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
        
        this.player.x = Math.max(this.player.radius, Math.min(this.world.width - this.player.radius, this.player.x))
        this.player.y = Math.max(this.player.radius, Math.min(this.world.height - this.player.radius, this.player.y))
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
      // Draw red boundary ring around the playable area
      const borderWidth = 20
      const margin = 50 // Distance outside world bounds where red zone starts
      
      this.ctx.strokeStyle = '#ff4444'
      this.ctx.fillStyle = 'rgba(255, 68, 68, 0.3)' // Semi-transparent red fill
      this.ctx.lineWidth = borderWidth
      
      // Outer boundary (danger zone)
      const outerLeft = -margin
      const outerTop = -margin  
      const outerRight = this.world.width + margin
      const outerBottom = this.world.height + margin
      
      // Inner boundary (playable area)
      const innerLeft = 0
      const innerTop = 0
      const innerRight = this.world.width
      const innerBottom = this.world.height
      
      // Draw the red border zones (top, right, bottom, left)
      
      // Top border
      this.ctx.fillRect(outerLeft, outerTop, outerRight - outerLeft, innerTop - outerTop)
      
      // Bottom border  
      this.ctx.fillRect(outerLeft, innerBottom, outerRight - outerLeft, outerBottom - innerBottom)
      
      // Left border
      this.ctx.fillRect(outerLeft, innerTop, innerLeft - outerLeft, innerBottom - innerTop)
      
      // Right border
      this.ctx.fillRect(innerRight, innerTop, outerRight - innerRight, innerBottom - innerTop)
      
      // Draw the boundary line (inner edge of red zone)
      this.ctx.strokeRect(innerLeft, innerTop, this.world.width, this.world.height)
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

        {/* Player Stats - Bottom Right */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #333',
          borderRadius: '4px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#ccc'
        }}>
          <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>#{mass} FPS</div>
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