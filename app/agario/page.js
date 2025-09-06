'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
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
        
        // Enhanced hostile name with glow
        ctx.shadowColor = '#ff6b6b'
        ctx.shadowBlur = 8
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(hostile.name, hostile.x, hostile.y - hostile.radius - 12)
        ctx.shadowBlur = 0
      })
      
      // Render operative with enhanced styling
      if (this.operative?.alive) {
        // Operative glow effect
        ctx.shadowColor = '#22c55e'
        ctx.shadowBlur = 15
        ctx.fillStyle = this.operative.color
        ctx.strokeStyle = '#16a34a'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(this.operative.x, this.operative.y, this.operative.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.shadowBlur = 0
        
        // Enhanced operative callsign with glow
        ctx.shadowColor = '#22c55e'
        ctx.shadowBlur = 6
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(this.operative.name, this.operative.x, this.operative.y - this.operative.radius - 18)
        
        // Mass indicator with better styling
        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold 9px monospace'
        ctx.fillText(`${Math.floor(this.operative.mass)}kg`, this.operative.x, this.operative.y + 4)
        ctx.shadowBlur = 0
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

  // Game render loop
  useEffect(() => {
    if (!gameRef.current || !gameInitialized) return

    const gameLoop = () => {
      if (gameRef.current?.running) {
        gameRef.current.render()
        
        // Update tactical stats
        if (gameRef.current.operative) {
          setTacticalStats({
            mass: Math.floor(gameRef.current.operative.mass),
            assets: gameRef.current.operative.assets,
            eliminations: gameRef.current.operative.eliminations,
            kia: 0,
            streak: gameRef.current.operative.eliminations,
            resourcesCollected: gameRef.current.operative.assets,
            missionTime: Math.floor((Date.now() - gameRef.current.lastUpdate) / 1000),
            rank: '#1'
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

  // Mouse and touch handling
  useEffect(() => {
    if (!canvasRef.current || !gameRef.current) return

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

    const handleKeyPress = (e) => {
      if (e.code === 'Space' && gameRef.current?.operative?.alive) {
        e.preventDefault()
        // Handle split action
        console.log('Split activated')
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('keydown', handleKeyPress)

    // Store mouse position for game engine
    const updateLoop = () => {
      if (gameRef.current && gameRef.current.running) {
        gameRef.current.update(mouseX, mouseY)
      }
      requestAnimationFrame(updateLoop)
    }
    updateLoop()

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [gameInitialized])

  // Initialize game engine
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

      {/* Tactical HUD Overlay - IMPROVED LAYOUT */}
      {hudVisible && gameRunning && operativeAlive && (
        <>
          {/* Top Left - Compact Mission HUD Card */}
          <div className="absolute top-4 left-4 bg-gradient-to-br from-gray-900/98 to-gray-800/98 backdrop-blur-lg rounded-lg border border-green-500/50 min-w-[300px] shadow-xl">
            <div className="px-4 py-2 border-b border-green-500/30">
              <div className="flex items-center justify-between">
                <div className="text-green-400 font-bold text-sm flex items-center gap-2">
                  <span>🎖️</span>
                  <span>OPERATIVE</span>
                </div>
                <div className="text-xs text-gray-400">ACTIVE</div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">MASS:</span>
                <span className="text-blue-400 font-bold text-lg">{tacticalStats.mass}kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">ASSETS:</span>
                <span className="text-green-400 font-bold">${tacticalStats.assets}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">THREAT:</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-yellow-400 font-bold text-sm">MODERATE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Right - Compact Ping & Mini Leaderboard */}
          <div className="absolute top-4 right-4 space-y-2">
            {/* Ping Status */}
            <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded border border-green-500/50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300">Ping: {networkStatus.ping}ms</span>
                <span className="text-green-400">|</span>
                <span className="text-green-400">{networkStatus.region}</span>
              </div>
            </div>
            
            {/* Mini Tactical Radar */}
            <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded border border-cyan-500/50 w-[120px] h-[120px]">
              <div className="p-2 h-full">
                <div className="text-cyan-400 text-xs mb-1 text-center">RADAR</div>
                <div className="relative w-full h-[80px] bg-gray-900/50 rounded border border-cyan-500/20">
                  {/* Radar Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-cyan-500/10"></div>
                    ))}
                  </div>
                  {/* Center dot (operative) */}
                  <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                  {/* Hostile contacts */}
                  {radarContacts.slice(0, 3).map((contact, i) => (
                    <div
                      key={contact.id}
                      className={`absolute w-0.5 h-0.5 rounded-full ${
                        contact.threat === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}
                      style={{
                        left: `${50 + (contact.x / 800) * 30}%`,
                        top: `${50 + (contact.y / 800) * 30}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Left - Mission Objective with Progress Bar */}
          {currentObjective && (
            <div className="absolute bottom-20 left-4 bg-gradient-to-br from-gray-900/98 to-gray-800/98 backdrop-blur-lg rounded border border-amber-500/50 max-w-xs shadow-xl">
              <div className="px-3 py-2 border-b border-amber-500/30">
                <div className="text-amber-400 font-bold text-xs flex items-center gap-2">
                  <span>⚡</span>
                  <span>MISSION</span>
                  <div className="ml-auto bg-amber-500/20 px-2 py-0.5 rounded text-xs">ACTIVE</div>
                </div>
              </div>
              <div className="p-3">
                <div className="text-gray-100 text-xs mb-2">{currentObjective.description}</div>
                {/* Circular Progress Indicator */}
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-600"></div>
                    <div 
                      className="absolute top-0 left-0 w-10 h-10 rounded-full border-2 border-amber-400 transform -rotate-90"
                      style={{
                        clipPath: `polygon(50% 50%, 50% 0%, ${33 > 50 ? '100%' : '50%'} 0%, ${33 > 50 ? '100%' : '50%'} ${33 > 50 ? (33 - 50) * 2 : 0}%, ${33 <= 50 ? 50 + 33 * 2 : 100}% ${33 <= 50 ? 100 : (100 - 33) * 2}%)`
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center text-amber-400 text-xs font-bold">
                      33%
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-amber-400 text-xs font-bold">+1000 XP</div>
                    <div className="text-gray-400 text-xs">Progress: 33%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Center - Large Tactical Split Button */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <button className="bg-gradient-to-r from-blue-700 to-cyan-700 hover:from-blue-600 hover:to-cyan-600 border-2 border-blue-500 text-white font-bold px-8 py-4 rounded-lg transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div className="text-left">
                <div className="text-lg font-bold">SPLIT</div>
                <div className="text-xs opacity-80">SPACE</div>
              </div>
            </button>
          </div>

          {/* Top Center - Extract Menu */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <button className="bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-600 hover:to-emerald-600 border border-green-500 text-white font-bold px-4 py-2 rounded transition-all shadow-lg flex items-center gap-2">
              <span>🚁</span>
              <div className="text-left">
                <div className="text-sm font-bold">EXTRACT</div>
                <div className="text-xs opacity-80">${tacticalStats.assets}</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* TACTICAL MISSION DEBRIEF - In-Game Overlay */}
      {missionComplete && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-40">
          {/* Tactical Debrief Interface */}
          <div className="bg-gradient-to-br from-gray-900/98 to-gray-800/98 backdrop-blur-lg border-2 max-w-2xl w-full mx-4 shadow-2xl" 
               style={{
                 borderImage: 'linear-gradient(45deg, #ef4444, #f97316, #ef4444) 1',
                 borderRadius: '12px',
                 boxShadow: '0 0 50px rgba(239, 68, 68, 0.3)'
               }}>
            
            {/* Command Header */}
            <div className="bg-gradient-to-r from-red-900/60 to-orange-900/60 px-6 py-4 border-b-2 border-red-500/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-400">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <div className="text-red-400 font-bold text-xl tracking-wide">MISSION STATUS</div>
                    <div className="text-gray-300 text-sm">OPERATIONAL DEBRIEF</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">CLASSIFICATION</div>
                  <div className="text-red-400 font-bold">TACTICAL</div>
                </div>
              </div>
            </div>

            {/* Mission Result */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`text-2xl font-bold mb-3 ${operativeAlive ? 'text-green-400' : 'text-red-400'}`}>
                  {operativeAlive ? '✅ MISSION ACCOMPLISHED' : '💀 OPERATIVE DOWN'}
                </div>
                <div className="text-gray-300 text-sm mb-1">
                  {operativeAlive ? 'Objective completed successfully' : 'Operative eliminated in the field'}
                </div>
                <div className="text-xs text-gray-500">
                  Mission Duration: {Math.floor(tacticalStats.missionTime / 60)}:{(tacticalStats.missionTime % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {/* Tactical Performance Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4 text-center">
                  <div className="text-blue-400 text-xs font-medium mb-1">FINAL MASS</div>
                  <div className="text-white text-xl font-bold">{tacticalStats.mass}</div>
                  <div className="text-blue-300 text-xs">KILOGRAMS</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-green-400 text-xs font-medium mb-1">ELIMINATIONS</div>
                  <div className="text-white text-xl font-bold">{tacticalStats.eliminations}</div>
                  <div className="text-green-300 text-xs">CONFIRMED</div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <div className="text-yellow-400 text-xs font-medium mb-1">ASSETS</div>
                  <div className="text-white text-xl font-bold">${tacticalStats.assets}</div>
                  <div className="text-yellow-300 text-xs">SECURED</div>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/20 border border-cyan-500/30 rounded-lg p-4 text-center">
                  <div className="text-cyan-400 text-xs font-medium mb-1">FINAL RANK</div>
                  <div className="text-white text-xl font-bold">{tacticalStats.rank}</div>
                  <div className="text-cyan-300 text-xs">POSITION</div>
                </div>
              </div>

              {/* Mission Assessment */}
              <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-4 mb-6">
                <div className="text-amber-400 font-medium text-sm mb-2">📊 TACTICAL ASSESSMENT</div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Threat Neutralized:</span>
                    <span className="text-green-400 font-medium">{tacticalStats.eliminations} hostiles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Resources Secured:</span>
                    <span className="text-blue-400 font-medium">{tacticalStats.resourcesCollected} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kill Streak:</span>
                    <span className="text-yellow-400 font-medium">{tacticalStats.streak} max</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mission Grade:</span>
                    <span className={`font-medium ${operativeAlive ? 'text-green-400' : 'text-red-400'}`}>
                      {operativeAlive ? 'SUCCESS' : 'KIA'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Command Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={restartMission}
                  className="flex-1 bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-600 hover:to-emerald-600 
                           border border-green-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 
                           flex items-center justify-center gap-3 shadow-lg hover:shadow-green-500/25"
                >
                  <span className="text-lg">🔄</span>
                  <div className="text-left">
                    <div className="text-sm font-bold">REDEPLOY</div>
                    <div className="text-xs opacity-80">New Mission</div>
                  </div>
                </button>
                
                <button
                  onClick={returnToBase}
                  className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 
                           border border-gray-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 
                           flex items-center justify-center gap-3 shadow-lg hover:shadow-gray-500/25"
                >
                  <span className="text-lg">🏠</span>
                  <div className="text-left">
                    <div className="text-sm font-bold">EXTRACT</div>
                    <div className="text-xs opacity-80">Return to Base</div>
                  </div>
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