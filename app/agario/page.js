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
        {/* Mission Timer - Top Center */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1000,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '2px solid #8b5cf6',
            borderRadius: '12px',
            padding: '16px 24px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            minWidth: '300px'
          }}
        >
          <div style={{ 
            color: '#a78bfa', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px' 
          }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <span>TACTICAL MISSION</span>
          </div>
          <div style={{ 
            color: 'white', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '12px', 
            textAlign: 'center' 
          }}>
            Survive for 60 seconds
          </div>
          <div style={{ 
            backgroundColor: '#374151', 
            borderRadius: '9999px', 
            height: '12px', 
            marginBottom: '12px', 
            overflow: 'hidden',
            border: '1px solid #4b5563'
          }}>
            <div 
              style={{ 
                background: 'linear-gradient(to right, #8b5cf6, #a78bfa)',
                height: '12px', 
                borderRadius: '9999px', 
                transition: 'width 1000ms',
                width: `${gameStarted ? ((60 - missionTime) / 60) * 100 : 5}%`,
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
              }}
            />
          </div>
          <div style={{ 
            color: 'white', 
            fontSize: '14px', 
            textAlign: 'center', 
            fontFamily: 'monospace',
            backgroundColor: '#374151',
            borderRadius: '6px',
            padding: '4px 8px'
          }}>
            {gameStarted ? formatTime(missionTime) : '1:00'}/01:00
          </div>
        </div>

        {/* Player Stats - Top Left */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            left: '20px', 
            zIndex: 1000,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            minWidth: '250px'
          }}
        >
          <div style={{ 
            color: '#34d399', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            borderBottom: '1px solid #059669',
            paddingBottom: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>🎖️</span>
            <span>OPERATIVE STATUS</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#374151',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <span style={{ color: '#d1d5db', fontWeight: '500' }}>MASS:</span>
              <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '18px' }}>{mass} KG</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#374151',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <span style={{ color: '#d1d5db', fontWeight: '500' }}>ASSETS:</span>
              <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '18px' }}>${score}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#374151',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <span style={{ color: '#d1d5db', fontWeight: '500' }}>ELIMINATIONS:</span>
              <span style={{ color: '#f87171', fontWeight: 'bold', fontSize: '18px' }}>{eliminations}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'rgba(180, 83, 9, 0.3)',
              border: '1px solid #d97706',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <span style={{ color: '#d1d5db', fontWeight: '500' }}>RANK:</span>
              <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🏆</span>
                <span>#1</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mini Map - Top Right */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            zIndex: 1000,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '2px solid #06b6d4',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div style={{ 
            color: '#22d3ee', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            borderBottom: '1px solid #0891b2',
            paddingBottom: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>🗺️</span>
            <span>TACTICAL MAP</span>
          </div>
          <div style={{ 
            width: '144px', 
            height: '144px', 
            backgroundColor: '#374151', 
            borderRadius: '8px', 
            border: '2px solid #0891b2', 
            position: 'relative', 
            overflow: 'hidden', 
            marginBottom: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4) inset'
          }}>
            {/* Player dot */}
            <div 
              style={{ 
                position: 'absolute',
                width: '12px', 
                height: '12px', 
                backgroundColor: '#60a5fa', 
                borderRadius: '50%', 
                transform: 'translate(-50%, -50%)',
                left: `${getPlayerPosition().x}%`, 
                top: `${getPlayerPosition().y}%`,
                boxShadow: '0 0 10px rgba(96, 165, 250, 0.8)',
                border: '2px solid #93c5fd',
                animation: 'pulse 2s infinite'
              }}
            />
            {/* Enemies */}
            {gameRef.current?.enemies.map((enemy, i) => (
              <div 
                key={i}
                style={{ 
                  position: 'absolute',
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#f87171', 
                  borderRadius: '50%', 
                  transform: 'translate(-50%, -50%)',
                  left: `${(enemy.x / gameRef.current.world.width) * 100}%`, 
                  top: `${(enemy.y / gameRef.current.world.height) * 100}%`,
                  border: '1px solid #fca5a5'
                }}
              />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#22d3ee', 
              fontSize: '12px', 
              fontWeight: 'bold', 
              marginBottom: '4px',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              borderRadius: '4px',
              padding: '4px 8px'
            }}>
              SECTOR: Oceania
            </div>
            <div style={{ 
              color: 'white', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px',
              backgroundColor: '#374151',
              borderRadius: '4px',
              padding: '4px 8px'
            }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#34d399', borderRadius: '50%' }}></div>
              <span>999ms</span>
              <span style={{ color: '#34d399' }}>⚡ ONLINE</span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Bottom Right */}
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px', 
          zIndex: 1000, 
          display: 'flex', 
          gap: '16px' 
        }}>
          <button 
            onClick={handleSplit}
            style={{
              width: '112px',
              height: '112px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              border: '4px solid #60a5fa',
              borderRadius: '50%',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              transition: 'all 200ms'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.background = 'linear-gradient(135deg, #1d4ed8, #2563eb)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.background = 'linear-gradient(135deg, #2563eb, #3b82f6)'
            }}
          >
            <span style={{ fontSize: '32px', marginBottom: '4px' }}>⚡</span>
            <span style={{ fontSize: '12px' }}>SPLIT</span>
          </button>
          <button 
            style={{
              width: '112px',
              height: '112px',
              background: 'linear-gradient(135deg, #d97706, #f59e0b)',
              border: '4px solid #fbbf24',
              borderRadius: '50%',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              transition: 'all 200ms'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.background = 'linear-gradient(135deg, #b45309, #d97706)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.background = 'linear-gradient(135deg, #d97706, #f59e0b)'
            }}
          >
            <span style={{ fontSize: '32px', marginBottom: '4px' }}>💰</span>
            <span style={{ fontSize: '12px' }}>CASH</span>
            <span style={{ fontSize: '10px' }}>${score}</span>
          </button>
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} className="bg-black bg-opacity-90 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl border border-red-500 max-w-md w-full mx-4 p-6">
            <div className="text-center mb-6">
              <div className="text-red-400 font-bold text-2xl mb-2 flex items-center justify-center gap-3">
                <span>💀</span>
                <span>MISSION {missionTime === 0 ? 'COMPLETED' : 'TERMINATED'}</span>
              </div>
              <div className="text-gray-300">
                {missionTime === 0 ? 'Mission Completed Successfully!' : 'Operative KIA'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="bg-gray-800 rounded p-3 border border-gray-600">
                <div className="text-gray-400">Final Mass</div>
                <div className="text-white font-bold">{mass} KG</div>
              </div>
              <div className="bg-gray-800 rounded p-3 border border-gray-600">
                <div className="text-gray-400">Eliminations</div>
                <div className="text-green-400 font-bold">{eliminations}</div>
              </div>
              <div className="bg-gray-800 rounded p-3 border border-gray-600">
                <div className="text-gray-400">Assets</div>
                <div className="text-yellow-400 font-bold">${score}</div>
              </div>
              <div className="bg-gray-800 rounded p-3 border border-gray-600">
                <div className="text-gray-400">Rank</div>
                <div className="text-blue-400 font-bold">#1</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleRestart}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded border border-green-500 transition-all flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>RESTART MISSION</span>
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded border border-gray-500 transition-all flex items-center justify-center gap-2"
              >
                <span>🏠</span>
                <span>RETURN TO BASE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgarIOGame