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

      {/* DESKTOP ONLY - HUD UI Elements */}
      <div className="hidden md:block">
        {/* Mission Timer - Top Center */}
        <div 
          className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-xl px-6 py-4 border-2 border-purple-500 shadow-2xl"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="text-purple-400 text-sm font-bold mb-2 flex items-center justify-center gap-2">
            <span className="text-lg">⚡</span>
            <span>TACTICAL MISSION</span>
          </div>
          <div className="text-white text-lg font-bold mb-3 text-center">Survive for 60 seconds</div>
          <div className="bg-gray-700 rounded-full h-3 mb-3 overflow-hidden shadow-inner border border-gray-600">
            <div 
              className="bg-gradient-to-r from-purple-500 to-purple-400 h-3 rounded-full transition-all duration-1000 shadow-lg"
              style={{ width: `${gameStarted ? ((60 - missionTime) / 60) * 100 : 5}%` }}
            />
          </div>
          <div className="text-white text-sm text-center font-mono bg-gray-800 rounded px-2 py-1">
            {gameStarted ? formatTime(missionTime) : '1:00'}/01:00
          </div>
        </div>

        {/* Player Stats - Top Left */}
        <div 
          className="fixed top-5 left-5 z-50 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-xl px-4 py-4 border-2 border-green-500 shadow-2xl min-w-64"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="text-green-400 text-sm font-bold mb-3 flex items-center gap-2 border-b border-green-600 pb-2">
            <span className="text-lg">🎖️</span>
            <span>OPERATIVE STATUS</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
              <span className="text-gray-300 font-medium">MASS:</span>
              <span className="text-blue-400 font-bold text-lg">{mass} KG</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
              <span className="text-gray-300 font-medium">ASSETS:</span>
              <span className="text-green-400 font-bold text-lg">${score}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
              <span className="text-gray-300 font-medium">ELIMINATIONS:</span>
              <span className="text-red-400 font-bold text-lg">{eliminations}</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-900 bg-opacity-50 rounded px-3 py-2 border border-yellow-600">
              <span className="text-gray-300 font-medium">RANK:</span>
              <span className="text-yellow-400 font-bold text-lg flex items-center gap-1">
                <span>🏆</span>
                <span>#1</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mini Map - Top Right */}
        <div 
          className="fixed top-5 right-5 z-50 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-xl border-2 border-cyan-500 shadow-2xl p-4"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="text-cyan-400 text-sm font-bold mb-3 flex items-center gap-2 border-b border-cyan-600 pb-2">
            <span className="text-lg">🗺️</span>
            <span>TACTICAL MAP</span>
          </div>
          <div className="w-36 h-36 bg-gray-800 rounded-lg border-2 border-cyan-600 relative overflow-hidden mb-3 shadow-inner">
            {/* Player dot */}
            <div 
              className="absolute w-3 h-3 bg-blue-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg animate-pulse border-2 border-blue-300"
              style={{ 
                left: `${getPlayerPosition().x}%`, 
                top: `${getPlayerPosition().y}%` 
              }}
            />
            {/* Enemies */}
            {gameRef.current?.enemies.map((enemy, i) => (
              <div 
                key={i}
                className="absolute w-2 h-2 bg-red-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md border border-red-300"
                style={{ 
                  left: `${(enemy.x / gameRef.current.world.width) * 100}%`, 
                  top: `${(enemy.y / gameRef.current.world.height) * 100}%` 
                }}
              />
            ))}
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full grid grid-cols-4 grid-rows-4 border border-cyan-700">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="border border-cyan-800"></div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-cyan-400 text-xs font-bold mb-1 bg-cyan-900 bg-opacity-50 rounded px-2 py-1">
              SECTOR: Oceania
            </div>
            <div className="text-white text-xs flex items-center justify-center gap-1 bg-gray-800 rounded px-2 py-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>999ms</span>
              <span className="text-green-400">⚡ ONLINE</span>
            </div>
          </div>
        </div>

        {/* Leaderboard - Bottom Left */}
        <div 
          className="fixed bottom-5 left-5 z-50 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-xl px-4 py-4 border-2 border-yellow-500 shadow-2xl"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="text-yellow-400 text-sm font-bold mb-3 flex items-center gap-2 border-b border-yellow-600 pb-2">
            <span className="text-lg">🏆</span>
            <span>LEADERBOARD</span>
          </div>
          <div className="space-y-2 text-sm min-w-48">
            <div className="flex justify-between items-center bg-yellow-900 bg-opacity-40 rounded-lg px-3 py-2 border border-yellow-600">
              <span className="text-yellow-300 font-bold flex items-center gap-1">
                <span>👑</span>
                <span>#1 You</span>
              </span>
              <span className="text-green-400 font-bold text-lg">${score}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-gray-300">#2 Player 8</span>
              <span className="text-gray-400 font-medium">$45</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-gray-300">#3 Player 3</span>
              <span className="text-gray-400 font-medium">$38</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-gray-300">#4 Player 7</span>
              <span className="text-gray-400 font-medium">$22</span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Bottom Right */}
        <div className="fixed bottom-5 right-5 z-50 flex gap-4">
          <button 
            onClick={handleSplit}
            className="w-28 h-28 bg-gradient-to-br from-blue-600 to-blue-700 backdrop-blur-md rounded-full border-4 border-blue-400 text-white font-bold text-sm shadow-2xl hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-200 flex flex-col items-center justify-center group relative overflow-hidden"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-200 rounded-full"></div>
            <span className="text-3xl mb-1 group-hover:animate-pulse relative z-10">⚡</span>
            <span className="text-xs font-bold relative z-10">SPLIT</span>
          </button>
          <button 
            className="w-28 h-28 bg-gradient-to-br from-yellow-600 to-yellow-700 backdrop-blur-md rounded-full border-4 border-yellow-400 text-white font-bold text-sm shadow-2xl hover:from-yellow-700 hover:to-yellow-800 hover:scale-105 transition-all duration-200 flex flex-col items-center justify-center group relative overflow-hidden"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <div className="absolute inset-0 bg-yellow-400 opacity-0 group-hover:opacity-20 transition-opacity duration-200 rounded-full"></div>
            <span className="text-3xl mb-1 group-hover:animate-pulse relative z-10">💰</span>
            <span className="text-xs font-bold relative z-10">CASH</span>
            <span className="text-xs font-medium relative z-10">${score}</span>
          </button>
        </div>

        {/* Connection Status - Bottom Center */}
        <div 
          className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-xl px-6 py-3 border-2 border-green-500 shadow-2xl"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg border border-green-300"></div>
              <span className="text-green-400 font-bold text-sm">TACTICAL LINK ACTIVE</span>
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <div className="text-white text-sm font-mono bg-gray-800 rounded px-2 py-1">12ms</div>
            <div className="w-px h-4 bg-gray-600"></div>
            <div className="text-cyan-400 text-sm font-bold">MULTIPLAYER</div>
          </div>
        </div>

        {/* Center Crosshair */}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="relative">
            <div className="w-8 h-8 border-2 border-green-400 border-opacity-40 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-60 animate-pulse"></div>
          </div>
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