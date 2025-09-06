'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const TacticalAgarIO = () => {
  const router = useRouter()
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const animationFrameRef = useRef(null)

  // Simplified state without external dependencies
  const [gameInitialized, setGameInitialized] = useState(false)
  const [gameRunning, setGameRunning] = useState(false)
  const [operativeAlive, setOperativeAlive] = useState(true)
  const [missionComplete, setMissionComplete] = useState(false)
  const [gameLoading, setGameLoading] = useState(true) // Add loading state
  
  // Tactical Stats
  const [tacticalStats, setTacticalStats] = useState({
    mass: 10,
    assets: 0,
    eliminations: 0,
    streak: 0,
    resourcesCollected: 0,
    rank: '#1'
  })

  // HUD State
  const [hudVisible, setHudVisible] = useState(true)
  const [radarContacts, setRadarContacts] = useState([])
  const [networkStatus] = useState({ ping: 23, region: 'US-EAST' })

  // Mission state
  const [currentObjective] = useState({
    description: "Eliminate 5 hostile contacts",
    target: 5,
    type: 'elimination'
  })

  // Enhanced Tactical Game Engine with Full Agar.io Functionality
  class TacticalGameEngine {
    constructor(canvas) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.world = { width: 3000, height: 3000 }
      this.camera = { x: 0, y: 0, zoom: 1 }
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 }
      this.keys = new Set()
      
      // Game objects
      this.player = null
      this.bots = []
      this.food = []
      this.running = false
      this.lastUpdate = Date.now()
      
      // Game settings
      this.maxFood = 400
      this.maxBots = 15
      this.gameSpeed = 60 // FPS
      
      this.initializePlayer()
      this.generateFood()
      this.generateBots()
      this.bindEvents()
    }

    initializePlayer() {
      this.player = {
        id: 'player',
        x: this.world.width / 2,
        y: this.world.height / 2,
        mass: 20,
        radius: this.massToRadius(20),
        color: '#22c55e',
        name: 'OPERATIVE',
        alive: true,
        speed: 2,
        targetX: this.world.width / 2,
        targetY: this.world.height / 2,
        eliminations: 0,
        assets: 0
      }
    }

    massToRadius(mass) {
      return Math.sqrt(mass / Math.PI) * 6
    }

    generateFood() {
      this.food = []
      for (let i = 0; i < this.maxFood; i++) {
        this.addFood()
      }
    }

    addFood() {
      this.food.push({
        id: Math.random().toString(36),
        x: Math.random() * this.world.width,
        y: Math.random() * this.world.height,
        mass: 1,
        radius: 3,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        type: 'food'
      })
    }

    generateBots() {
      this.bots = []
      for (let i = 0; i < this.maxBots; i++) {
        const mass = 15 + Math.random() * 30
        this.bots.push({
          id: `bot-${i}`,
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
          mass: mass,
          radius: this.massToRadius(mass),
          color: '#ef4444',
          name: `HOSTILE-${String(i + 1).padStart(2, '0')}`,
          alive: true,
          speed: Math.max(0.5, 3 - mass * 0.02),
          targetX: Math.random() * this.world.width,
          targetY: Math.random() * this.world.height,
          lastTargetChange: Date.now(),
          aiType: Math.random() > 0.5 ? 'aggressive' : 'passive'
        })
      }
    }

    bindEvents() {
      // Mouse movement
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - rect.left
        this.mouse.y = e.clientY - rect.top
        
        // Convert to world coordinates
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.y + this.camera.y
        
        // Set player target
        if (this.player && this.player.alive) {
          this.player.targetX = this.mouse.worldX
          this.player.targetY = this.mouse.worldY
        }
      })

      // Touch events for mobile
      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const touch = e.touches[0]
        this.mouse.x = touch.clientX - rect.left
        this.mouse.y = touch.clientY - rect.top
        
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.worldY + this.camera.y
        
        if (this.player && this.player.alive) {
          this.player.targetX = this.mouse.worldX
          this.player.targetY = this.mouse.worldY
        }
      })

      // Keyboard events
      document.addEventListener('keydown', (e) => {
        this.keys.add(e.code)
        
        // Split on space
        if (e.code === 'Space' && this.player && this.player.alive && this.player.mass > 20) {
          this.splitPlayer()
        }
      })

      document.addEventListener('keyup', (e) => {
        this.keys.delete(e.code)
      })
    }

    splitPlayer() {
      if (this.player.mass > 20) {
        const halfMass = this.player.mass / 2
        this.player.mass = halfMass
        this.player.radius = this.massToRadius(halfMass)
        
        // Create split particle effect (visual feedback)
        console.log('🔪 TACTICAL SPLIT executed!')
      }
    }

    update() {
      if (!this.running) return
      
      const now = Date.now()
      const deltaTime = (now - this.lastUpdate) / 1000
      this.lastUpdate = now

      // Update player
      this.updatePlayer(deltaTime)
      
      // Update bots
      this.bots.forEach(bot => this.updateBot(bot, deltaTime))
      
      // Check collisions
      this.checkCollisions()
      
      // Update camera
      this.updateCamera()
      
      // Maintain food count
      while (this.food.length < this.maxFood) {
        this.addFood()
      }
      
      // Update tactical stats
      this.updateStats()
    }

    updatePlayer(deltaTime) {
      if (!this.player || !this.player.alive) return
      
      // Calculate direction to target
      const dx = this.player.targetX - this.player.x
      const dy = this.player.targetY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        // Calculate speed based on mass
        const speed = Math.max(0.5, this.player.speed - this.player.mass * 0.01)
        
        // Move towards target
        const moveX = (dx / distance) * speed * deltaTime * 60
        const moveY = (dy / distance) * speed * deltaTime * 60
        
        this.player.x += moveX
        this.player.y += moveY
        
        // Keep player in bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.world.width - this.player.radius, this.player.x))
        this.player.y = Math.max(this.player.radius, Math.min(this.world.height - this.player.radius, this.player.y))
      }
    }

    updateBot(bot, deltaTime) {
      if (!bot.alive) return
      
      const now = Date.now()
      
      // Change target occasionally
      if (now - bot.lastTargetChange > 3000 + Math.random() * 2000) {
        if (bot.aiType === 'aggressive' && this.player && this.player.alive) {
          // Aggressive bots chase player if they're bigger
          if (bot.mass > this.player.mass * 1.2) {
            bot.targetX = this.player.x
            bot.targetY = this.player.y
          } else {
            bot.targetX = Math.random() * this.world.width
            bot.targetY = Math.random() * this.world.height
          }
        } else {
          // Random movement
          bot.targetX = Math.random() * this.world.width
          bot.targetY = Math.random() * this.world.height
        }
        bot.lastTargetChange = now
      }
      
      // Move towards target
      const dx = bot.targetX - bot.x
      const dy = bot.targetY - bot.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const speed = Math.max(0.3, bot.speed - bot.mass * 0.01)
        const moveX = (dx / distance) * speed * deltaTime * 60
        const moveY = (dy / distance) * speed * deltaTime * 60
        
        bot.x += moveX
        bot.y += moveY
        
        // Keep bot in bounds
        bot.x = Math.max(bot.radius, Math.min(this.world.width - bot.radius, bot.x))
        bot.y = Math.max(bot.radius, Math.min(this.world.height - bot.radius, bot.y))
      }
    }

    checkCollisions() {
      // Player eating food
      if (this.player && this.player.alive) {
        for (let i = this.food.length - 1; i >= 0; i--) {
          const food = this.food[i]
          const dx = this.player.x - food.x
          const dy = this.player.y - food.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < this.player.radius + food.radius) {
            // Eat food
            this.player.mass += food.mass
            this.player.radius = this.massToRadius(this.player.mass)
            this.player.assets += 1
            this.food.splice(i, 1)
          }
        }
        
        // Player vs bots
        for (let i = this.bots.length - 1; i >= 0; i--) {
          const bot = this.bots[i]
          if (!bot.alive) continue
          
          const dx = this.player.x - bot.x
          const dy = this.player.y - bot.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < this.player.radius + bot.radius - 5) {
            if (this.player.mass > bot.mass * 1.2) {
              // Player eats bot
              this.player.mass += bot.mass * 0.8
              this.player.radius = this.massToRadius(this.player.mass)
              this.player.eliminations += 1
              this.player.assets += Math.floor(bot.mass / 5)
              bot.alive = false
              
              // Respawn bot after delay
              setTimeout(() => {
                bot.alive = true
                bot.mass = 15 + Math.random() * 30
                bot.radius = this.massToRadius(bot.mass)
                bot.x = Math.random() * this.world.width
                bot.y = Math.random() * this.world.height
              }, 5000)
              
            } else if (bot.mass > this.player.mass * 1.2) {
              // Bot eats player
              this.player.alive = false
              setOperativeAlive(false)
              setMissionComplete(true)
            }
          }
        }
      }
      
      // Bot vs food
      this.bots.forEach(bot => {
        if (!bot.alive) return
        
        for (let i = this.food.length - 1; i >= 0; i--) {
          const food = this.food[i]
          const dx = bot.x - food.x
          const dy = bot.y - food.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < bot.radius + food.radius) {
            bot.mass += food.mass
            bot.radius = this.massToRadius(bot.mass)
            this.food.splice(i, 1)
          }
        }
      })
    }

    updateCamera() {
      if (this.player && this.player.alive) {
        // Smooth camera follow
        const targetX = this.player.x - this.canvas.width / 2
        const targetY = this.player.y - this.canvas.height / 2
        
        this.camera.x += (targetX - this.camera.x) * 0.1
        this.camera.y += (targetY - this.camera.y) * 0.1
        
        // Keep camera in bounds
        this.camera.x = Math.max(0, Math.min(this.world.width - this.canvas.width, this.camera.x))
        this.camera.y = Math.max(0, Math.min(this.world.height - this.canvas.height, this.camera.y))
      }
    }

    updateStats() {
      if (this.player && this.player.alive) {
        setTacticalStats({
          mass: Math.floor(this.player.mass),
          assets: this.player.assets,
          eliminations: this.player.eliminations,
          streak: this.player.eliminations,
          resourcesCollected: this.player.assets,
          rank: '#1'
        })
      }
    }
          name: `HOSTILE-${i.toString().padStart(2, '0')}`,
          velocity: { 
            x: (Math.random() - 0.5) * 1.5, 
            y: (Math.random() - 0.5) * 1.5 
          },
          ai: true
        })
      }
    }

    update(mouseX, mouseY) {
      if (!this.running || !this.operative?.alive) return

      const now = Date.now()
      const deltaTime = Math.min((now - this.lastUpdate) / 1000, 0.016) // Cap at 60fps
      this.lastUpdate = now

      // Update operative movement toward mouse
      this.updateOperativeMovement(mouseX, mouseY, deltaTime)
      
      // Update hostiles AI
      this.updateHostiles(deltaTime)
      
      // Check collisions
      this.checkCollisions()
      
      // Update camera
      this.updateCamera()
      
      // Update radar contacts
      this.updateRadar()
    }

    updateOperativeMovement(mouseX, mouseY, deltaTime) {
      if (!this.operative?.alive) return

      const canvas = this.canvas
      const rect = canvas.getBoundingClientRect()
      
      const worldMouseX = mouseX - canvas.width / 2 + this.operative.x
      const worldMouseY = mouseY - canvas.height / 2 + this.operative.y

      const dx = worldMouseX - this.operative.x
      const dy = worldMouseY - this.operative.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 5) {
        const speed = Math.max(60, 180 - this.operative.mass)
        
        this.operative.velocity.x = (dx / distance) * speed
        this.operative.velocity.y = (dy / distance) * speed
        
        this.operative.x += this.operative.velocity.x * deltaTime
        this.operative.y += this.operative.velocity.y * deltaTime
        
        // Boundary check
        this.operative.x = Math.max(this.operative.radius, Math.min(this.world.width - this.operative.radius, this.operative.x))
        this.operative.y = Math.max(this.operative.radius, Math.min(this.world.height - this.operative.radius, this.operative.y))
      }
    }

    updateHostiles(deltaTime) {
      this.hostiles.forEach(hostile => {
        hostile.x += hostile.velocity.x * deltaTime * 30
        hostile.y += hostile.velocity.y * deltaTime * 30
        
        if (hostile.x <= hostile.radius || hostile.x >= this.world.width - hostile.radius) {
          hostile.velocity.x *= -1
        }
        if (hostile.y <= hostile.radius || hostile.y >= this.world.height - hostile.radius) {
          hostile.velocity.y *= -1
        }
        
        hostile.x = Math.max(hostile.radius, Math.min(this.world.width - hostile.radius, hostile.x))
        hostile.y = Math.max(hostile.radius, Math.min(this.world.height - hostile.radius, hostile.y))
      })
    }

    checkCollisions() {
      if (!this.operative?.alive) return

      // Resource collection
      this.resources = this.resources.filter(resource => {
        const dx = resource.x - this.operative.x
        const dy = resource.y - this.operative.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.operative.radius + resource.radius) {
          this.operative.mass += resource.mass
          this.operative.radius = Math.sqrt(this.operative.mass) * 3
          this.operative.assets += 1
          return false
        }
        return true
      })

      // Hostile collisions
      this.hostiles.forEach((hostile, index) => {
        const dx = hostile.x - this.operative.x
        const dy = hostile.y - this.operative.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.operative.radius + hostile.radius) {
          if (this.operative.mass > hostile.mass) {
            this.operative.mass += hostile.mass * 0.8
            this.operative.radius = Math.sqrt(this.operative.mass) * 3
            this.operative.eliminations += 1
            this.operative.assets += Math.floor(hostile.mass / 3)
            this.hostiles.splice(index, 1)
          } else if (hostile.mass > this.operative.mass) {
            this.operative.alive = false
            setOperativeAlive(false)
            setMissionComplete(true)
          }
        }
      })
    }

    updateCamera() {
      if (!this.operative) return
      this.camera.x = this.operative.x - this.canvas.width / 2
      this.camera.y = this.operative.y - this.canvas.height / 2
    }

    updateRadar() {
      const contacts = []
      const radarRange = 400
      
      this.hostiles.forEach(hostile => {
        const dx = hostile.x - this.operative.x
        const dy = hostile.y - this.operative.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance <= radarRange) {
          contacts.push({
            id: hostile.id,
            type: 'hostile',
            x: dx,
            y: dy,
            distance: distance,
            threat: hostile.mass > this.operative.mass ? 'high' : 'low'
          })
        }
      })
      
      setRadarContacts(contacts)
    }

    render() {
      const ctx = this.ctx
      const canvas = this.canvas
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.save()
      
      // Apply camera transform
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.translate(-this.camera.x - this.operative.x, -this.camera.y - this.operative.y)
      
      // Render tactical grid
      this.renderGrid(ctx)
      
      // Render resources
      this.resources.forEach(resource => {
        ctx.fillStyle = resource.color
        ctx.beginPath()
        ctx.arc(resource.x, resource.y, resource.radius, 0, Math.PI * 2)
        ctx.fill()
      })
      
      // Render hostiles
      this.hostiles.forEach(hostile => {
        ctx.fillStyle = hostile.color
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(hostile.x, hostile.y, hostile.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        
        // Name
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(hostile.name, hostile.x, hostile.y - hostile.radius - 8)
      })
      
      // Render operative
      if (this.operative?.alive) {
        ctx.fillStyle = this.operative.color
        ctx.strokeStyle = '#16a34a'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(this.operative.x, this.operative.y, this.operative.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(this.operative.name, this.operative.x, this.operative.y - this.operative.radius - 12)
        
        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold 8px monospace'
        ctx.fillText(`${Math.floor(this.operative.mass)}kg`, this.operative.x, this.operative.y + 3)
      }
      
      ctx.restore()
    }

    renderGrid(ctx) {
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 1
      const gridSize = 50
      
      const startX = Math.floor(this.camera.x / gridSize) * gridSize
      const startY = Math.floor(this.camera.y / gridSize) * gridSize
      const endX = startX + this.canvas.width + gridSize
      const endY = startY + this.canvas.height + gridSize
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, startY)
        ctx.lineTo(x, endY)
        ctx.stroke()
      }
      
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(startX, y)
        ctx.lineTo(endX, y)
        ctx.stroke()
      }
    }

    start() {
      this.running = true
      setGameRunning(true)
    }

    stop() {
      this.running = false
      setGameRunning(false)
    }
  }

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current || gameInitialized) return

    // Simulate loading time for better UX
    const initializeGameWithLoading = async () => {
      setGameLoading(true)
      
      // Show loading for at least 1.5 seconds for proper initialization feel
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Double check canvas is still available after async delay
      if (!canvasRef.current) {
        console.error('Canvas element not available after loading delay')
        setGameLoading(false)
        return
      }
      
      const canvas = canvasRef.current
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const game = new TacticalGameEngine(canvas)
      gameRef.current = game
      
      setGameInitialized(true)
      setGameLoading(false) // Hide loading when game is ready
      game.start()
    }

    initializeGameWithLoading()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Mouse handling
  useEffect(() => {
    if (!canvasRef.current || !gameInitialized) return

    const canvas = canvasRef.current
    let mouseX = canvas.width / 2
    let mouseY = canvas.height / 2

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      mouseX = touch.clientX - rect.left
      mouseY = touch.clientY - rect.top
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

    // Game update loop
    const updateLoop = () => {
      if (gameRef.current?.running) {
        gameRef.current.update(mouseX, mouseY)
      }
      requestAnimationFrame(updateLoop)
    }
    updateLoop()

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
  }, [gameInitialized])

  // Render loop
  useEffect(() => {
    if (!gameInitialized || !gameRef.current) return

    const renderLoop = () => {
      if (gameRef.current?.running) {
        gameRef.current.render()
        
        // Update stats
        if (gameRef.current.operative) {
          setTacticalStats({
            mass: Math.floor(gameRef.current.operative.mass),
            assets: gameRef.current.operative.assets,
            eliminations: gameRef.current.operative.eliminations,
            streak: gameRef.current.operative.eliminations,
            resourcesCollected: gameRef.current.operative.assets,
            rank: '#1'
          })
        }
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop)
    }

    renderLoop()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameInitialized])

  const restartMission = () => {
    if (gameRef.current) {
      gameRef.current.initializeOperative()
      gameRef.current.generateResources()
      gameRef.current.generateHostiles()
      setOperativeAlive(true)
      setMissionComplete(false)
      gameRef.current.start()
    }
  }

  const returnToBase = () => {
    router.push('/')
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ background: '#0a0a0a' }}
      />

      {/* WORKING Tactical HUD */}
      {hudVisible && gameRunning && operativeAlive && (
        <>
          {/* Operative Status */}
          <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-lg border border-green-500 min-w-64 shadow-xl">
            <div className="px-4 py-2 border-b border-green-500 bg-green-900 bg-opacity-30">
              <div className="text-green-400 font-bold text-sm flex items-center gap-2">
                <span>🎖️</span>
                <span>OPERATIVE STATUS</span>
              </div>
            </div>
            <div className="p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">MASS:</span>
                <span className="text-blue-400 font-bold">{tacticalStats.mass} KG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">ASSETS:</span>
                <span className="text-green-400 font-bold">${tacticalStats.assets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">ELIMINATIONS:</span>
                <span className="text-red-400 font-bold">{tacticalStats.eliminations}</span>
              </div>
            </div>
          </div>

          {/* Radar */}
          <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-lg border border-cyan-500 w-32 h-32 shadow-xl">
            <div className="p-2 h-full">
              <div className="text-cyan-400 text-xs mb-1 text-center font-bold">RADAR</div>
              <div className="relative w-full h-20 bg-gray-800 rounded border border-cyan-500 bg-opacity-50">
                <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                {radarContacts.slice(0, 5).map((contact, i) => (
                  <div
                    key={i}
                    className={`absolute w-0.5 h-0.5 rounded-full ${
                      contact.threat === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                    }`}
                    style={{
                      left: `${50 + (contact.x / 400) * 30}%`,
                      top: `${50 + (contact.y / 400) * 30}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Mission Objective */}
          <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-lg border border-amber-500 max-w-xs shadow-xl">
            <div className="px-3 py-2 border-b border-amber-500 bg-amber-900 bg-opacity-30">
              <div className="text-amber-400 font-bold text-xs">⚡ MISSION</div>
            </div>
            <div className="p-3">
              <div className="text-gray-100 text-xs mb-2">{currentObjective.description}</div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-300">Progress: {tacticalStats.eliminations}/5</span>
                <span className="text-amber-400">+1000 XP</span>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-95 backdrop-blur-md rounded-lg border border-green-500 shadow-xl">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300">{networkStatus.region}</span>
                <span className="text-green-400 font-bold">{networkStatus.ping}ms</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button className="px-4 py-2 bg-green-700 border border-green-500 rounded font-bold text-white hover:bg-green-600 transition-all flex items-center gap-2">
              <span>🚁</span>
              <span>EXTRACT</span>
            </button>
            
            <button className="px-4 py-2 bg-blue-700 border border-blue-500 rounded font-bold text-white hover:bg-blue-600 transition-all flex items-center gap-2">
              <span>⚔️</span>
              <span>SPLIT</span>
            </button>
          </div>
        </>
      )}

      {/* Mission Complete */}
      {missionComplete && (
        <div className="absolute inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-red-500 max-w-md w-full mx-4 shadow-2xl">
            <div className="bg-red-900 bg-opacity-30 px-6 py-4 border-b border-red-500">
              <div className="text-red-400 font-bold text-lg flex items-center gap-3">
                <span>💀</span>
                <span>MISSION TERMINATED</span>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-gray-100 mb-4">
                  {operativeAlive ? 'Mission Completed' : 'Operative KIA'}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-800 rounded p-3 border border-gray-600">
                    <div className="text-gray-400">Final Mass</div>
                    <div className="text-white font-bold">{tacticalStats.mass} KG</div>
                  </div>
                  <div className="bg-gray-800 rounded p-3 border border-gray-600">
                    <div className="text-gray-400">Eliminations</div>
                    <div className="text-green-400 font-bold">{tacticalStats.eliminations}</div>
                  </div>
                  <div className="bg-gray-800 rounded p-3 border border-gray-600">
                    <div className="text-gray-400">Assets</div>
                    <div className="text-yellow-400 font-bold">${tacticalStats.assets}</div>
                  </div>
                  <div className="bg-gray-800 rounded p-3 border border-gray-600">
                    <div className="text-gray-400">Rank</div>
                    <div className="text-cyan-400 font-bold">{tacticalStats.rank}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={restartMission}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded border border-green-500 transition-all flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>RESTART MISSION</span>
                </button>
                <button
                  onClick={returnToBase}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded border border-gray-500 transition-all flex items-center justify-center gap-2"
                >
                  <span>🏠</span>
                  <span>RETURN TO BASE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD Toggle */}
      <button
        onClick={() => setHudVisible(!hudVisible)}
        className="absolute top-4 right-40 bg-gray-900 bg-opacity-80 hover:bg-gray-800 text-gray-300 p-2 rounded border border-gray-600 transition-all"
      >
        {hudVisible ? '🔽' : '🔼'}
      </button>

      {/* Game Loading Overlay */}
      {gameLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-95 backdrop-blur-lg z-50 flex items-center justify-center">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-green-500 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-green-500/20">
            {/* Game Logo/Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border-4 border-green-500 animate-pulse">
                🎮
              </div>
              <h2 className="text-green-400 text-3xl font-bold uppercase tracking-wider mb-2">
                TACTICAL DEPLOYMENT
              </h2>
              <p className="text-gray-300 text-sm">
                Initializing combat zone...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                <div className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
              </div>
              <div className="text-green-400 text-center text-sm font-semibold">
                Loading tactical systems...
              </div>
            </div>

            {/* Loading Tips */}
            <div className="bg-green-900 bg-opacity-20 border border-green-500 rounded-lg p-4">
              <div className="text-green-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                🎯 TACTICAL TIP
              </div>
              <div className="text-gray-300 text-sm">
                Stay mobile and eliminate smaller operatives to increase your tactical advantage!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TacticalAgarIO