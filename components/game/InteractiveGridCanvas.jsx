'use client'

import { useRef, useEffect, useState } from 'react'

const InteractiveGridCanvas = () => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const [trails, setTrails] = useState([])
  const [isVisible, setIsVisible] = useState(true)
  
  // Debug: Add visible indicator
  useEffect(() => {
    console.log('🎮 InteractiveGridCanvas mounted!')
    setIsVisible(true)
  }, [])
  
  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.log('❌ Canvas ref is null')
      return
    }
    
    console.log('🎨 Setting up canvas...')
    
    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      console.log('📐 Canvas dimensions:', rect.width, 'x', rect.height)
      
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Test draw immediately
      const ctx = canvas.getContext('2d')
      
      // Clear and draw test pattern
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw visible test elements
      ctx.fillStyle = '#14F195'
      ctx.fillRect(50, 50, 100, 100)
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fillRect(200, 50, 100, 100)
      
      // Draw grid
      const gridSize = 30
      const cellWidth = canvas.width / gridSize
      const cellHeight = canvas.height / gridSize
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      
      for (let i = 0; i <= gridSize; i++) {
        const x = i * cellWidth
        const y = i * cellHeight
        
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
      
      console.log('✅ Test pattern drawn')
    }
    
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    
    return () => {
      window.removeEventListener('resize', setupCanvas)
    }
  }, [])
  
  // Handle mouse movement
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    console.log('🖱️  Mouse move:', x, y)
    
    // Add trail
    const newTrail = {
      x,
      y,
      timestamp: Date.now(),
      id: Math.random()
    }
    
    setTrails(prev => [...prev.slice(-50), newTrail])
    
    // Draw immediately
    const ctx = canvas.getContext('2d')
    
    // Draw trail point
    ctx.fillStyle = 'rgba(20, 241, 149, 0.8)'
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, 2 * Math.PI)
    ctx.fill()
    
    // Draw grid cell
    const gridSize = 30
    const cellWidth = canvas.width / gridSize
    const cellHeight = canvas.height / gridSize
    const gridX = Math.floor(x / cellWidth)
    const gridY = Math.floor(y / cellHeight)
    
    ctx.fillStyle = 'rgba(20, 241, 149, 0.3)'
    ctx.fillRect(gridX * cellWidth, gridY * cellHeight, cellWidth, cellHeight)
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.strokeRect(gridX * cellWidth, gridY * cellHeight, cellWidth, cellHeight)
  }
  
  return (
    <>
      {/* Debug indicator */}
      {isVisible && (
        <div 
          className="absolute top-4 left-4 bg-green-500 text-black px-2 py-1 text-xs font-bold rounded z-50"
        >
          CANVAS ACTIVE
        </div>
      )}
      
      {/* Canvas */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 15 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          style={{
            display: 'block',
            background: 'rgba(0, 255, 0, 0.05)' // Slight green tint to see canvas bounds
          }}
        />
      </div>
    </>
  )
}

export default InteractiveGridCanvas