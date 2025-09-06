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

  // Tactical Game Engine - FIXED VERSION
  class TacticalGameEngine {
    constructor(canvas) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.world = { width: 2000, height: 2000 }
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
        radius: 20,
        color: '#22c55e',
        name: 'OPERATIVE',
        alive: true,
        assets: 0,
        eliminations: 0,
        velocity: { x: 0, y: 0 }
      }
    }

    generateResources() {
      this.resources = []
      for (let i = 0; i < 200; i++) {
        this.resources.push({
          id: `resource-${i}`,
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
          mass: 1,
          radius: 4,
          color: `hsl(${Math.random() * 60 + 30}, 70%, 60%)`,
          type: 'supply'
        })
      }
    }

    generateHostiles() {
      this.hostiles = []
      for (let i = 0; i < 10; i++) {
        const mass = 8 + Math.random() * 25
        this.hostiles.push({
          id: `hostile-${i}`,
          x: Math.random() * this.world.width,
          y: Math.random() * this.world.height,
          mass: mass,
          radius: Math.sqrt(mass) * 3,
          color: '#ef4444',
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

    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const game = new TacticalGameEngine(canvas)
    gameRef.current = game
    
    setGameInitialized(true)
    game.start()

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
    </div>
  )
}

export default TacticalAgarIO