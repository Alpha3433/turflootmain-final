'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const AgarIOGame = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const [gameStats, setGameStats] = useState({ mass: 10, rank: 1, players: 1 })
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameResult, setGameResult] = useState('')

  useEffect(() => {
    // Initialize the Agario game
    initializeGame()
    
    return () => {
      if (gameRef.current) {
        gameRef.current.cleanup()
      }
    }
  }, [])

  const initializeGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    // Game configuration
    const config = {
      worldSize: 4000,
      foodCount: 400,
      botCount: 20,
      baseSpeed: 180,
      startingMass: 10,
      foodMass: 1,
      radiusPerMass: 1.2
    }

    // Game state
    const game = {
      player: {
        x: 0,
        y: 0,
        mass: config.startingMass,
        dir: { x: 0, y: 0 },
        alive: true,
        name: 'Player'
      },
      bots: [],
      food: [],
      camera: { x: 0, y: 0, zoom: 0.6 },
      running: true
    }

    // Initialize food
    for (let i = 0; i < config.foodCount; i++) {
      game.food.push({
        id: i,
        x: (Math.random() - 0.5) * config.worldSize,
        y: (Math.random() - 0.5) * config.worldSize,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      })
    }

    // Initialize bots
    for (let i = 0; i < config.botCount; i++) {
      game.bots.push({
        id: i,
        x: (Math.random() - 0.5) * config.worldSize,
        y: (Math.random() - 0.5) * config.worldSize,
        mass: config.startingMass + Math.random() * 20,
        dir: { 
          x: (Math.random() - 0.5) * 2, 
          y: (Math.random() - 0.5) * 2 
        },
        alive: true,
        name: `Bot ${i + 1}`,
        color: `hsl(${Math.random() * 360}, 60%, 50%)`,
        targetDir: { x: 0, y: 0 },
        lastDirChange: Date.now()
      })
    }

    // Helper functions
    const getRadius = (mass) => Math.sqrt(mass) * config.radiusPerMass
    
    const getDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
    
    const normalizeVector = (vec) => {
      const length = Math.hypot(vec.x, vec.y) || 1
      return { x: vec.x / length, y: vec.y / length }
    }

    // Mouse movement handler
    const handleMouseMove = (e) => {
      if (!game.player.alive) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const worldMouseX = (mouseX - canvas.width / 2) / game.camera.zoom + game.camera.x
      const worldMouseY = (mouseY - canvas.height / 2) / game.camera.zoom + game.camera.y
      
      const dx = worldMouseX - game.player.x
      const dy = worldMouseY - game.player.y
      
      game.player.dir = normalizeVector({ x: dx, y: dy })
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    // Game loop
    let lastTime = 0
    const gameLoop = (currentTime) => {
      if (!game.running) return
      
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      // Update player
      if (game.player.alive) {
        const speed = config.baseSpeed / Math.sqrt(Math.max(game.player.mass, 1))
        game.player.x += game.player.dir.x * speed * deltaTime
        game.player.y += game.player.dir.y * speed * deltaTime
        
        // World boundaries
        const halfWorld = config.worldSize / 2
        game.player.x = Math.max(-halfWorld, Math.min(halfWorld, game.player.x))
        game.player.y = Math.max(-halfWorld, Math.min(halfWorld, game.player.y))
      }

      // Update bots
      game.bots.forEach(bot => {
        if (!bot.alive) return
        
        // Simple AI: change direction occasionally
        if (Date.now() - bot.lastDirChange > 2000 + Math.random() * 3000) {
          bot.targetDir = {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2
          }
          bot.lastDirChange = Date.now()
        }
        
        // Move towards target direction
        bot.dir.x += (bot.targetDir.x - bot.dir.x) * deltaTime
        bot.dir.y += (bot.targetDir.y - bot.dir.y) * deltaTime
        bot.dir = normalizeVector(bot.dir)
        
        const speed = config.baseSpeed / Math.sqrt(Math.max(bot.mass, 1))
        bot.x += bot.dir.x * speed * deltaTime
        bot.y += bot.dir.y * speed * deltaTime
        
        // World boundaries
        const halfWorld = config.worldSize / 2
        bot.x = Math.max(-halfWorld, Math.min(halfWorld, bot.x))
        bot.y = Math.max(-halfWorld, Math.min(halfWorld, bot.y))
      })

      // Food consumption
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      
      for (let i = game.food.length - 1; i >= 0; i--) {
        const food = game.food[i]
        
        for (const entity of allEntities) {
          const distance = getDistance(entity, food)
          const radius = getRadius(entity.mass)
          
          if (distance <= radius) {
            entity.mass += config.foodMass
            game.food.splice(i, 1)
            break
          }
        }
      }

      // Replenish food
      while (game.food.length < config.foodCount) {
        game.food.push({
          id: Math.random(),
          x: (Math.random() - 0.5) * config.worldSize,
          y: (Math.random() - 0.5) * config.worldSize,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`
        })
      }

      // Player vs Bot combat
      if (game.player.alive) {
        for (const bot of game.bots) {
          if (!bot.alive) continue
          
          const distance = getDistance(game.player, bot)
          const playerRadius = getRadius(game.player.mass)
          const botRadius = getRadius(bot.mass)
          
          if (distance < Math.max(playerRadius, botRadius)) {
            if (game.player.mass > bot.mass * 1.1) {
              // Player eats bot
              game.player.mass += bot.mass * 0.8
              bot.alive = false
            } else if (bot.mass > game.player.mass * 1.1) {
              // Bot eats player
              game.player.alive = false
              setIsGameOver(true)
              setGameResult('💀 Game Over! You were eaten by ' + bot.name)
            }
          }
        }
      }

      // Bot vs Bot combat
      for (let i = 0; i < game.bots.length; i++) {
        if (!game.bots[i].alive) continue
        
        for (let j = i + 1; j < game.bots.length; j++) {
          if (!game.bots[j].alive) continue
          
          const distance = getDistance(game.bots[i], game.bots[j])
          const radiusA = getRadius(game.bots[i].mass)
          const radiusB = getRadius(game.bots[j].mass)
          
          if (distance < Math.max(radiusA, radiusB)) {
            if (game.bots[i].mass > game.bots[j].mass * 1.1) {
              game.bots[i].mass += game.bots[j].mass * 0.8
              game.bots[j].alive = false
            } else if (game.bots[j].mass > game.bots[i].mass * 1.1) {
              game.bots[j].mass += game.bots[i].mass * 0.8
              game.bots[i].alive = false
            }
          }
        }
      }

      // Update camera
      if (game.player.alive) {
        game.camera.x = game.player.x
        game.camera.y = game.player.y
        
        // Zoom based on mass
        const targetZoom = Math.max(0.4, Math.min(1.0, 1.0 / Math.sqrt(game.player.mass / 10)))
        game.camera.zoom += (targetZoom - game.camera.zoom) * deltaTime * 2
      }

      // Update stats
      const aliveBots = game.bots.filter(b => b.alive)
      const allAlive = game.player.alive ? [game.player, ...aliveBots] : aliveBots
      allAlive.sort((a, b) => b.mass - a.mass)
      
      const playerRank = game.player.alive ? allAlive.findIndex(e => e === game.player) + 1 : allAlive.length + 1
      
      setGameStats({
        mass: Math.floor(game.player.mass),
        rank: playerRank,
        players: allAlive.length
      })

      // Render
      render()
      
      requestAnimationFrame(gameLoop)
    }

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.save()
      
      // Apply camera transform
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.scale(game.camera.zoom, game.camera.zoom)
      ctx.translate(-game.camera.x, -game.camera.y)
      
      // Draw grid
      drawGrid()
      
      // Draw food
      game.food.forEach(food => {
        ctx.fillStyle = food.color
        ctx.beginPath()
        ctx.arc(food.x, food.y, 5, 0, Math.PI * 2)
        ctx.fill()
        
        // Glow effect
        ctx.fillStyle = food.color + '40'
        ctx.beginPath()
        ctx.arc(food.x, food.y, 8, 0, Math.PI * 2)
        ctx.fill()
      })
      
      // Draw entities (sorted by mass)
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      allEntities.sort((a, b) => a.mass - b.mass)
      
      allEntities.forEach(entity => {
        const radius = getRadius(entity.mass)
        const isPlayer = entity === game.player
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.beginPath()
        ctx.arc(entity.x + 3, entity.y + 3, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Entity circle
        ctx.fillStyle = isPlayer ? '#00f5ff' : entity.color
        ctx.beginPath()
        ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Border
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        
        // Eyes
        if (radius > 15) {
          const eyeOffset = radius * 0.3
          const eyeSize = Math.max(2, radius * 0.1)
          
          ctx.fillStyle = '#000000'
          ctx.beginPath()
          ctx.arc(entity.x - eyeOffset, entity.y - eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.beginPath()
          ctx.arc(entity.x + eyeOffset, entity.y - eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Name and mass
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 3
        ctx.font = `${Math.max(12, Math.min(18, radius * 0.3))}px Arial`
        ctx.textAlign = 'center'
        
        const text = `${entity.name} (${Math.floor(entity.mass)})`
        ctx.strokeText(text, entity.x, entity.y - radius - 10)
        ctx.fillText(text, entity.x, entity.y - radius - 10)
      })
      
      ctx.restore()
    }

    const drawGrid = () => {
      const gridSize = 100
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      
      // Get visible world bounds
      const viewWidth = canvas.width / game.camera.zoom
      const viewHeight = canvas.height / game.camera.zoom
      const left = game.camera.x - viewWidth / 2
      const right = game.camera.x + viewWidth / 2
      const top = game.camera.y - viewHeight / 2
      const bottom = game.camera.y + viewHeight / 2
      
      // Vertical lines
      const startX = Math.floor(left / gridSize) * gridSize
      const endX = Math.ceil(right / gridSize) * gridSize
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
      }
      
      // Horizontal lines
      const startY = Math.floor(top / gridSize) * gridSize
      const endY = Math.ceil(bottom / gridSize) * gridSize
      
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
        ctx.stroke()
      }
    }

    // Start game loop
    requestAnimationFrame(gameLoop)

    // Store game reference for cleanup
    gameRef.current = {
      game,
      cleanup: () => {
        game.running = false
        canvas.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }

  const restartGame = () => {
    setIsGameOver(false)
    setGameResult('')
    if (gameRef.current) {
      gameRef.current.cleanup()
    }
    setTimeout(() => initializeGame(), 100)
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ display: isGameOver ? 'none' : 'block' }}
      />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 space-y-4 pointer-events-none z-10">
        {/* Game Stats */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30">
          <div className="text-cyan-400 font-bold text-lg">Agario Clone</div>
          <div className="text-sm text-gray-300">Mass: {gameStats.mass}</div>
          <div className="text-sm text-gray-300">Rank: #{gameStats.rank}</div>
          <div className="text-sm text-gray-300">Players: {gameStats.players}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30 pointer-events-none z-10">
        <div className="text-xs text-gray-300">
          <div>🖱️ Move mouse to control</div>
          <div>🍎 Eat food to grow</div>
          <div>⚔️ Eat smaller players</div>
        </div>
      </div>

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-gray-900 rounded-2xl p-8 border border-cyan-400/30 text-center max-w-md">
            <div className="text-3xl font-bold mb-4 text-red-400">
              {gameResult}
            </div>
            
            <div className="text-gray-300 mb-6">
              <p className="mb-2">Final Mass: {gameStats.mass}</p>
              <p>Final Rank: #{gameStats.rank}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={restartGame}
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

      {/* Back Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => router.push('/')}
          className="bg-gray-800/70 backdrop-blur-sm hover:bg-gray-700/70 text-white font-bold py-2 px-4 rounded-lg transition-all border border-gray-600/30"
        >
          ← Back to Lobby
        </button>
      </div>
    </div>
  )
}

export default AgarIOGame