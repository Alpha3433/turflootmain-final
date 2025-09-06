'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePrivy } from '@privy-io/react-ui'
import { useGameSettings } from '@/components/providers/GameSettingsProvider'

const TacticalAgarIO = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const animationFrameRef = useRef(null)
  const { settings } = useGameSettings()
  const { user, getAccessToken } = usePrivy()

  // Core Game State
  const [gameInitialized, setGameInitialized] = useState(false)
  const [gameRunning, setGameRunning] = useState(false)
  const [operativeAlive, setOperativeAlive] = useState(true)
  const [missionComplete, setMissionComplete] = useState(false)
  
  // Tactical Stats
  const [tacticalStats, setTacticalStats] = useState({
    mass: 10,
    assets: 0,
    eliminations: 0,
    kia: 0,
    streak: 0,
    resourcesCollected: 0,
    missionTime: 0,
    rank: 'N/A'
  })

  // HUD State
  const [hudVisible, setHudVisible] = useState(true)
  const [radarContacts, setRadarContacts] = useState([])
  const [currentObjective, setCurrentObjective] = useState(null)
  const [networkStatus, setNetworkStatus] = useState({ ping: 0, region: 'US-EAST' })
  const [commandCenter, setCommandCenter] = useState([])

  // URL Parameters
  const roomId = searchParams.get('roomId')
  const gameMode = searchParams.get('mode') || 'tactical'
  const fee = parseInt(searchParams.get('fee')) || 0
  const region = searchParams.get('region') || 'US-East'
  const isMultiplayer = searchParams.get('multiplayer') === 'hathora'

  // Tactical Game Engine
  class TacticalGameEngine {
    constructor(canvas) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.world = { width: 4000, height: 4000 }
      this.camera = { x: 0, y: 0, zoom: 1 }
      this.operative = null
      this.hostiles = []
      this.resources = []
      this.running = false
      this.lastUpdate = Date.now()
      
      this.initializeOperative()
      this.generateResources()
      this.generateHostiles()
    }

    initializeOperative() {
      this.operative = {
        id: 'operative-alpha',
        x: this.world.width / 2,
        y: this.world.height / 2,
        mass: 10,
        radius: Math.sqrt(10) * 6,
        color: '#22c55e', // Military green
        name: user?.id?.slice(-8) || 'OPERATIVE',
        alive: true,
        assets: 0,
        eliminations: 0,
        velocity: { x: 0, y: 0 }
      }
    }

    generateResources() {
      this.resources = []
      for (let i = 0; i < 500; i++) {
        this.resources.push({
          id: `resource-${i}`,
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
          mass: 1,
          radius: 3,
          color: `hsl(${Math.random() * 60 + 30}, 70%, 60%)`, // Resource colors
          type: 'supply'
        })
      }
    }

    generateHostiles() {
      this.hostiles = []
      for (let i = 0; i < 20; i++) {
        const mass = 5 + Math.random() * 50
        this.hostiles.push({
          id: `hostile-${i}`,
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
          mass: mass,
          radius: Math.sqrt(mass) * 6,
          color: '#ef4444', // Hostile red
          name: `HOSTILE-${i.toString().padStart(2, '0')}`,
          velocity: { 
            x: (Math.random() - 0.5) * 2, 
            y: (Math.random() - 0.5) * 2 
          },
          ai: true
        })
      }
    }

    update(mouseX, mouseY) {
      if (!this.running || !this.operative?.alive) return

      const now = Date.now()
      const deltaTime = (now - this.lastUpdate) / 1000
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
      this.updateRadarContacts()
    }

    updateOperativeMovement(mouseX, mouseY, deltaTime) {
      if (!this.operative?.alive) return

      const canvas = this.canvas
      const rect = canvas.getBoundingClientRect()
      
      // Convert mouse to world coordinates
      const worldMouseX = (mouseX - rect.left - canvas.width / 2) / this.camera.zoom + this.camera.x + this.operative.x
      const worldMouseY = (mouseY - rect.top - canvas.height / 2) / this.camera.zoom + this.camera.y + this.operative.y

      // Calculate direction
      const dx = worldMouseX - this.operative.x
      const dy = worldMouseY - this.operative.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 5) {
        // Speed based on mass (bigger = slower)
        const speed = Math.max(50, 200 - this.operative.mass * 2)
        
        this.operative.velocity.x = (dx / distance) * speed
        this.operative.velocity.y = (dy / distance) * speed
        
        // Update position
        this.operative.x += this.operative.velocity.x * deltaTime
        this.operative.y += this.operative.velocity.y * deltaTime
        
        // Boundary check
        this.operative.x = Math.max(this.operative.radius, Math.min(this.world.width - this.operative.radius, this.operative.x))
        this.operative.y = Math.max(this.operative.radius, Math.min(this.world.height - this.operative.radius, this.operative.y))
      }
    }

    updateHostiles(deltaTime) {
      this.hostiles.forEach(hostile => {
        // Simple AI movement
        hostile.x += hostile.velocity.x * deltaTime * 50
        hostile.y += hostile.velocity.y * deltaTime * 50
        
        // Boundary bounce
        if (hostile.x <= hostile.radius || hostile.x >= this.world.width - hostile.radius) {
          hostile.velocity.x *= -1
        }
        if (hostile.y <= hostile.radius || hostile.y >= this.world.height - hostile.radius) {
          hostile.velocity.y *= -1
        }
        
        // Keep in bounds
        hostile.x = Math.max(hostile.radius, Math.min(this.world.width - hostile.radius, hostile.x))
        hostile.y = Math.max(hostile.radius, Math.min(this.world.height - hostile.radius, hostile.y))
      })
    }

    checkCollisions() {
      if (!this.operative?.alive) return

      // Check resource collection
      this.resources = this.resources.filter(resource => {
        const dx = resource.x - this.operative.x
        const dy = resource.y - this.operative.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.operative.radius + resource.radius) {
          // Collect resource
          this.operative.mass += resource.mass
          this.operative.radius = Math.sqrt(this.operative.mass) * 6
          this.operative.assets += 1
          return false // Remove resource
        }
        return true
      })

      // Check hostile collisions
      this.hostiles.forEach(hostile => {
        const dx = hostile.x - this.operative.x
        const dy = hostile.y - this.operative.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.operative.radius + hostile.radius) {
          if (this.operative.mass > hostile.mass) {
            // Eliminate hostile
            this.operative.mass += hostile.mass * 0.8
            this.operative.radius = Math.sqrt(this.operative.mass) * 6
            this.operative.eliminations += 1
            this.operative.assets += Math.floor(hostile.mass / 5)
            
            // Remove hostile
            const index = this.hostiles.indexOf(hostile)
            if (index > -1) {
              this.hostiles.splice(index, 1)
            }
          } else if (hostile.mass > this.operative.mass) {
            // Operative eliminated
            this.operative.alive = false
            setOperativeAlive(false)
            setMissionComplete(true)
          }
        }
      })
    }

    updateCamera() {
      if (!this.operative) return
      
      // Follow operative
      this.camera.x = this.operative.x - this.canvas.width / 2
      this.camera.y = this.operative.y - this.canvas.height / 2
      
      // Dynamic zoom based on mass
      this.camera.zoom = Math.max(0.5, Math.min(2, 1 - (this.operative.mass - 10) / 200))
    }

    updateRadarContacts() {
      const contacts = []
      const radarRange = 800
      
      // Add hostiles to radar
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
            threat: hostile.mass > this.operative.mass ? 'high' : 'low',
            mass: hostile.mass
          })
        }
      })
      
      setRadarContacts(contacts)
    }

    render() {
      const ctx = this.ctx
      const canvas = this.canvas
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0a' // Dark tactical background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.save()
      
      // Apply camera transform
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.scale(this.camera.zoom, this.camera.zoom)
      ctx.translate(-this.camera.x - this.operative.x, -this.camera.y - this.operative.y)
      
      // Render grid
      this.renderTacticalGrid(ctx)
      
      // Render resources
      this.resources.forEach(resource => {
        ctx.fillStyle = resource.color
        ctx.beginPath()
        ctx.arc(resource.x, resource.y, resource.radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Resource glow
        ctx.shadowColor = resource.color
        ctx.shadowBlur = 5
        ctx.stroke()
        ctx.shadowBlur = 0
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
        
        // Hostile name
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(hostile.name, hostile.x, hostile.y - hostile.radius - 10)
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
        
        // Operative callsign
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(this.operative.name, this.operative.x, this.operative.y - this.operative.radius - 15)
        
        // Mass indicator
        ctx.fillStyle = '#22c55e'
        ctx.font = '10px monospace'
        ctx.fillText(`${Math.floor(this.operative.mass)}kg`, this.operative.x, this.operative.y + 5)
      }
      
      ctx.restore()
    }

    renderTacticalGrid(ctx) {
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 1
      const gridSize = 100
      
      const startX = Math.floor(this.camera.x / gridSize) * gridSize
      const startY = Math.floor(this.camera.y / gridSize) * gridSize
      const endX = startX + this.canvas.width / this.camera.zoom + gridSize
      const endY = startY + this.canvas.height / this.camera.zoom + gridSize
      
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

    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const game = new TacticalGameEngine(canvas)
    gameRef.current = game
    
    setGameInitialized(true)
    game.start()

    // Mouse movement handler
    const handleMouseMove = (e) => {
      if (game.running && game.operative?.alive) {
        game.update(e.clientX, e.clientY)
      }
    }

    // Touch handler for mobile
    const handleTouchMove = (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      if (game.running && game.operative?.alive) {
        game.update(touch.clientX, touch.clientY)
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameInitialized])

  // Game loop
  useEffect(() => {
    if (!gameRef.current) return

    const gameLoop = () => {
      if (gameRef.current?.running) {
        gameRef.current.render()
        
        // Update tactical stats
        if (gameRef.current.operative) {
          setTacticalStats({
            mass: Math.floor(gameRef.current.operative.mass),
            assets: gameRef.current.operative.assets,
            eliminations: gameRef.current.operative.eliminations,
            kia: 0, // Will be updated on death
            streak: gameRef.current.operative.eliminations,
            resourcesCollected: gameRef.current.operative.assets,
            missionTime: Math.floor((Date.now() - gameRef.current.lastUpdate) / 1000),
            rank: '#1' // Placeholder
          })
        }
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoop()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameInitialized])

  // Generate tactical objectives
  useEffect(() => {
    if (!gameInitialized) return
    
    const objectives = [
      { id: 1, description: "Eliminate 5 hostile contacts", target: 5, type: 'elimination' },
      { id: 2, description: "Collect 50 tactical resources", target: 50, type: 'collection' },
      { id: 3, description: "Achieve 100kg operational mass", target: 100, type: 'growth' },
      { id: 4, description: "Survive for 300 seconds", target: 300, type: 'survival' }
    ]
    
    setCurrentObjective(objectives[Math.floor(Math.random() * objectives.length)])
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

      {/* Tactical HUD Overlay */}
      {hudVisible && gameRunning && operativeAlive && (
        <>
          {/* Top Left - Tactical Status */}
          <div className="absolute top-4 left-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded border border-green-500/50 min-w-[280px] shadow-xl">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-4 py-2 border-b border-green-500/30">
              <div className="text-green-400 font-bold text-sm flex items-center gap-2">
                <span>🎖️</span>
                <span>OPERATIVE STATUS</span>
                <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">MASS:</span>
                <span className="text-blue-400 font-bold">{tacticalStats.mass} KG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">ASSETS:</span>
                <span className="text-green-400 font-bold">${tacticalStats.assets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">K.I.A. RATIO:</span>
                <span className="text-white font-bold">{tacticalStats.eliminations}:{tacticalStats.kia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">THREAT LEVEL:</span>
                <span className="text-yellow-400 font-bold">MODERATE</span>
              </div>
            </div>
          </div>

          {/* Top Right - Radar Display */}
          <div className="absolute top-4 right-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded border border-cyan-500/50 w-[200px] h-[200px] shadow-xl">
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 px-3 py-2 border-b border-cyan-500/30">
              <div className="text-cyan-400 font-bold text-xs flex items-center gap-2">
                <span>📡</span>
                <span>TACTICAL RADAR</span>
              </div>
            </div>
            <div className="p-3 h-full">
              <div className="relative w-full h-[150px] bg-gray-900/50 rounded border border-cyan-500/20">
                {/* Radar Grid */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 border-cyan-500/10">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="border border-cyan-500/10"></div>
                  ))}
                </div>
                {/* Center dot (operative) */}
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                {/* Radar sweep */}
                <div className="absolute inset-0 rounded overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 w-1 h-16 bg-gradient-to-t from-cyan-400/50 to-transparent origin-bottom transform -translate-x-1/2 translate-y-full rotate-0 animate-spin"></div>
                </div>
                {/* Hostile contacts */}
                {radarContacts.map(contact => (
                  <div
                    key={contact.id}
                    className={`absolute w-1 h-1 rounded-full ${
                      contact.threat === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                    }`}
                    style={{
                      left: `${50 + (contact.x / 800) * 40}%`,
                      top: `${50 + (contact.y / 800) * 40}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Left - Current Objective */}
          {currentObjective && (
            <div className="absolute bottom-4 left-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded border border-amber-500/50 max-w-sm shadow-xl">
              <div className="bg-gradient-to-r from-amber-600/20 to-yellow-600/20 px-4 py-2 border-b border-amber-500/30">
                <div className="text-amber-400 font-bold text-sm flex items-center gap-2">
                  <span>⚡</span>
                  <span>MISSION OBJECTIVE</span>
                  <span className="text-xs bg-amber-500/20 px-2 py-1 rounded ml-auto">ACTIVE</span>
                </div>
              </div>
              <div className="p-4">
                <div className="text-gray-100 text-sm mb-3">{currentObjective.description}</div>
                <div className="bg-gray-800/60 rounded h-2 mb-2 border border-gray-600/50">
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded w-1/3"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-300">
                  <span>PROGRESS: 33%</span>
                  <span className="text-amber-400">REWARD: 1000 XP</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Right - Network Status */}
          <div className="absolute bottom-4 right-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded border border-green-500/50 shadow-xl">
            <div className="px-3 py-2">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 rounded-full animate-pulse bg-green-400"></div>
                <span className="text-gray-300 font-medium">{networkStatus.region} SECTOR</span>
                <span className="text-green-400 font-bold">{networkStatus.ping}ms</span>
                <span className="text-green-400 text-xs">📡</span>
              </div>
              <div className="text-xs text-gray-400 text-center mt-1">
                HATHORA TACTICAL NETWORK
              </div>
            </div>
          </div>

          {/* Bottom Center - Tactical Commands */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button className="px-6 py-3 bg-gradient-to-r from-green-700 to-emerald-700 border border-green-500 rounded font-bold text-white hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-3 shadow-lg">
              <span>🚁</span>
              <div className="flex flex-col items-start">
                <span className="text-xs">EXTRACT</span>
                <span className="text-sm">${tacticalStats.assets} ASSETS</span>
              </div>
            </button>
            
            <button className="px-6 py-3 bg-gradient-to-r from-blue-700 to-cyan-700 border border-blue-500 rounded font-bold text-white hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center gap-3 shadow-lg">
              <span>⚡</span>
              <div className="flex flex-col items-start">
                <span className="text-xs">TACTICAL</span>
                <span className="text-sm">SPLIT</span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Mission Complete Screen */}
      {missionComplete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-red-500/50 max-w-md w-full mx-4 shadow-2xl">
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-4 border-b border-red-500/30">
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
                  <div className="bg-gray-800/50 rounded p-3 border border-gray-600/30">
                    <div className="text-gray-400">Final Mass</div>
                    <div className="text-white font-bold">{tacticalStats.mass} KG</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-3 border border-gray-600/30">
                    <div className="text-gray-400">Eliminations</div>
                    <div className="text-green-400 font-bold">{tacticalStats.eliminations}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-3 border border-gray-600/30">
                    <div className="text-gray-400">Assets</div>
                    <div className="text-yellow-400 font-bold">${tacticalStats.assets}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-3 border border-gray-600/30">
                    <div className="text-gray-400">Final Rank</div>
                    <div className="text-cyan-400 font-bold">{tacticalStats.rank}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={restartMission}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded border border-green-500 transition-all flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>RESTART MISSION</span>
                </button>
                <button
                  onClick={returnToBase}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-6 rounded border border-gray-500 transition-all flex items-center justify-center gap-2"
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
        className="absolute top-4 right-[220px] bg-gray-900/80 hover:bg-gray-800/80 text-gray-300 p-2 rounded border border-gray-600/50 transition-all"
      >
        {hudVisible ? '🔽' : '🔼'}
      </button>
    </div>
  )
}

export default TacticalAgarIO