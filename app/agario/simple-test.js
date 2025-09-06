'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const SimpleTacticalTest = () => {
  const router = useRouter()
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const animationRef = useRef(null)
  
  const [gameReady, setGameReady] = useState(false)
  const [playerMass, setPlayerMass] = useState(10)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Simple game state
  class SimpleGame {
    constructor(canvas) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.player = {
        x: 400,
        y: 300,
        mass: 10,
        radius: 20,
        color: '#22c55e'
      }
      this.resources = []
      this.generateResources()
      this.running = true
    }

    generateResources() {
      for (let i = 0; i < 50; i++) {
        this.resources.push({
          x: Math.random() * 800,
          y: Math.random() * 600,
          radius: 5,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`
        })
      }
    }

    update(mouseX, mouseY) {
      if (!this.running) return
      
      // Move player toward mouse
      const dx = mouseX - this.player.x
      const dy = mouseY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const speed = 3
        this.player.x += (dx / distance) * speed
        this.player.y += (dy / distance) * speed
      }

      // Check resource collection
      this.resources = this.resources.filter(resource => {
        const dx = resource.x - this.player.x
        const dy = resource.y - this.player.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < this.player.radius + resource.radius) {
          this.player.mass += 1
          this.player.radius = Math.sqrt(this.player.mass) * 2
          return false
        }
        return true
      })
    }

    draw() {
      const ctx = this.ctx
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      // Draw resources
      this.resources.forEach(resource => {
        ctx.fillStyle = resource.color
        ctx.beginPath()
        ctx.arc(resource.x, resource.y, resource.radius, 0, Math.PI * 2)
        ctx.fill()
      })
      
      // Draw player
      ctx.fillStyle = this.player.color
      ctx.strokeStyle = '#16a34a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Player label
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('OPERATIVE', this.player.x, this.player.y - this.player.radius - 10)
      ctx.fillText(`${this.player.mass}kg`, this.player.x, this.player.y + 5)
    }
  }

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = 800
    canvas.height = 600

    const game = new SimpleGame(canvas)
    gameRef.current = game
    setGameReady(true)

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePos({ x, y })
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Game loop
  useEffect(() => {
    if (!gameReady || !gameRef.current) return

    const gameLoop = () => {
      if (gameRef.current) {
        gameRef.current.update(mousePos.x, mousePos.y)
        gameRef.current.draw()
        setPlayerMass(gameRef.current.player.mass)
      }
      animationRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoop()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameReady, mousePos])

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <div className="mb-4 text-white">
        <h1 className="text-2xl font-bold mb-2">🎖️ TACTICAL AGARIO TEST</h1>
        <div className="flex gap-4 text-sm">
          <span>Mass: {playerMass}kg</span>
          <span>Mouse: {mousePos.x}, {mousePos.y}</span>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="border border-green-500 cursor-crosshair"
        style={{ background: '#0a0a0a' }}
      />
      
      <div className="mt-4 flex gap-4">
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          Back to Lobby
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600"
        >
          Restart
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-400 text-center">
        Move your mouse over the canvas to control the operative
      </div>
    </div>
  )
}

export default SimpleTacticalTest