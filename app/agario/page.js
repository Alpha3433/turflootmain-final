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
      
      this.camera.x = Math.max(0, Math.min(this.world.width - this.canvas.width, this.camera.x))
      this.camera.y = Math.max(0, Math.min(this.world.height - this.canvas.height, this.camera.y))
    }

    render() {
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      this.ctx.save()
      this.ctx.translate(-this.camera.x, -this.camera.y)
      
      // Draw grid
      this.drawGrid()
      
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
        {/* Leaderboard - Top Right (like reference) */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #333',
            borderRadius: '4px',
            padding: '8px 12px',
            minWidth: '140px'
          }}
        >
          <div style={{ 
            color: '#fff', 
            fontSize: '12px', 
            fontWeight: 'bold', 
            marginBottom: '6px',
            textAlign: 'center',
            borderBottom: '1px solid #555',
            paddingBottom: '4px'
          }}>
            LEADERBOARD
          </div>
          <div style={{ fontSize: '11px', color: '#ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>1. Player</span>
              <span style={{ color: '#4CAF50' }}>{score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>2. Bot_1</span>
              <span>150</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>3. Bot_2</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Score Display - Top Left (simple) */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '10px', 
            left: '10px', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #333',
            borderRadius: '4px',
            padding: '8px 12px'
          }}
        >
          <div style={{ 
            color: '#4CAF50', 
            fontSize: '16px', 
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {score}
          </div>
          <div style={{ 
            color: '#ccc', 
            fontSize: '10px',
            textAlign: 'center'
          }}>
            LENGTH: {mass}
          </div>
        </div>

        {/* Timer - Bottom Center */}
        <div 
          style={{ 
            position: 'fixed', 
            bottom: '60px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #333',
            borderRadius: '4px',
            padding: '6px 12px'
          }}
        >
          <div style={{ 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'monospace'
          }}>
            {gameStarted ? formatTime(missionTime) : '1:00'}
          </div>
        </div>

        {/* Action Buttons - Integrated Tooltip Style */}
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
          pointerEvents: 'none'
        }}>
          {/* SPLIT Button - Integrated Tooltip Style */}
          <div 
            onClick={handleSplit}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontWeight: '500',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              transition: 'all 150ms ease-out',
              pointerEvents: 'auto',
              position: 'relative',
              minWidth: '160px',
              justifyContent: 'center',
              borderLeft: '3px solid #3b82f6'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.95)'
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.92)'
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.4)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <span style={{ 
              fontSize: '14px',
              color: '#3b82f6',
              fontWeight: 'bold'
            }}>SPACE</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span>Split Operative</span>
          </div>

          {/* CASH Button - Integrated Tooltip Style */}
          <div 
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontWeight: '500',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              transition: 'all 150ms ease-out',
              pointerEvents: 'auto',
              position: 'relative',
              minWidth: '160px',
              justifyContent: 'center',
              borderLeft: '3px solid #f59e0b'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.95)'
              e.target.style.borderColor = 'rgba(245, 158, 11, 0.6)'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.92)'
              e.target.style.borderColor = 'rgba(245, 158, 11, 0.4)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <span style={{ 
              fontSize: '14px',
              color: '#f59e0b',
              fontWeight: 'bold'
            }}>E</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span>Cash Out ${score}</span>
          </div>
        </div>
      </div>


    </div>
  )
}

export default AgarIOGame