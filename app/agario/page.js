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

  // Initialize game
  useEffect(() => {
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
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
      />

      {/* Game UI - Always Visible */}
      <>
        {/* Mission Timer - Top Center */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 rounded-lg px-4 py-2 border border-purple-500 z-10">
          <div className="text-purple-400 text-xs font-bold mb-1 flex items-center gap-1">
            <span>⚡</span>
            <span>MISSION</span>
          </div>
          <div className="text-white text-sm font-bold mb-1">Survive for 60 seconds</div>
          <div className="bg-gray-700 rounded-full h-1.5 mb-1">
            <div 
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${gameStarted ? ((60 - missionTime) / 60) * 100 : 0}%` }}
            />
          </div>
          <div className="text-white text-xs text-center">
            {gameStarted ? formatTime(missionTime) : '1:00'}/01:00
          </div>
        </div>

        {/* Mini Map - Top Right */}
        <div className="absolute top-4 right-4 w-24 h-24 bg-black bg-opacity-80 rounded-lg border border-cyan-500 p-1 z-10">
          <div className="relative w-full h-full bg-gray-900 rounded overflow-hidden">
            {/* Player dot on minimap */}
            <div 
              className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ 
                left: `${getPlayerPosition().x}%`, 
                top: `${getPlayerPosition().y}%` 
              }}
            />
            {/* World border */}
            <div className="absolute inset-0 border border-cyan-600 rounded"></div>
          </div>
          <div className="text-cyan-400 text-xs mt-1 text-center font-bold">Oceania</div>
          <div className="text-white text-xs text-center">999ms ⚡</div>
        </div>

        {/* Leaderboard - Bottom Left */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-lg px-3 py-2 border border-yellow-500 z-10">
          <div className="text-yellow-400 text-xs font-bold mb-1 flex items-center gap-1">
            <span>🏆</span>
            <span>Leaders</span>
          </div>
          <div className="text-white text-sm">
            <div className="flex justify-between items-center">
              <span>#1 You</span>
              <span className="text-green-400 ml-2">${score}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Bottom Right */}
        <div className="absolute bottom-4 right-4 flex gap-3 z-10">
          <button 
            onClick={handleSplit}
            className="w-16 h-16 bg-blue-600 rounded-full border-3 border-blue-400 text-white font-bold text-xs shadow-lg hover:bg-blue-700 transition-all flex flex-col items-center justify-center"
          >
            <span className="text-sm">⚡</span>
            <span>SPLIT</span>
          </button>
          <button 
            className="w-16 h-16 bg-yellow-600 rounded-full border-3 border-yellow-400 text-white font-bold text-xs shadow-lg hover:bg-yellow-700 transition-all flex flex-col items-center justify-center"
          >
            <span className="text-sm">$</span>
            <span>CASH</span>
            <span className="text-xs">${score}</span>
          </button>
        </div>
      </>

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center">
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