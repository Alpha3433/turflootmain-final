'use client'

import { useRef, useEffect, useState } from 'react'

const InteractiveGridCanvas = () => {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [gridCells, setGridCells] = useState(new Map())
  
  // Grid configuration matching Paper-io style
  const GRID_SIZE = 40
  const CELL_LIFETIME = 4000 // 4 seconds as requested
  const TRAIL_WIDTH = 2 // Trail thickness
  
  // Initialize and setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    
    const setupCanvas = () => {
      // Set canvas size to match container
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Initial draw to show canvas is working
      drawGrid()
    }
    
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    
    return () => {
      window.removeEventListener('resize', setupCanvas)
    }
  }, [])
  
  // Animation loop for fading effects
  useEffect(() => {
    const animate = () => {
      cleanupExpiredCells()
      drawGrid()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])
  
  // Remove expired cells
  const cleanupExpiredCells = () => {
    const now = Date.now()
    const newGridCells = new Map()
    
    gridCells.forEach((cell, key) => {
      if (now - cell.timestamp < CELL_LIFETIME) {
        newGridCells.set(key, cell)
      }
    })
    
    if (newGridCells.size !== gridCells.size) {
      setGridCells(newGridCells)
    }
  }
  
  // Convert screen coordinates to grid coordinates
  const screenToGrid = (clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const cellWidth = rect.width / GRID_SIZE
    const cellHeight = rect.height / GRID_SIZE
    
    const gridX = Math.floor((clientX - rect.left) / cellWidth)
    const gridY = Math.floor((clientY - rect.top) / cellHeight)
    
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, gridX)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, gridY))
    }
  }
  
  // Fill grid cells around position (Paper-io trail effect)
  const fillCells = (centerX, centerY) => {
    const timestamp = Date.now()
    const newCells = new Map(gridCells)
    
    // Create trail area around mouse position
    for (let dx = -TRAIL_WIDTH; dx <= TRAIL_WIDTH; dx++) {
      for (let dy = -TRAIL_WIDTH; dy <= TRAIL_WIDTH; dy++) {
        const x = centerX + dx
        const y = centerY + dy
        
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance <= TRAIL_WIDTH) {
            const key = `${x},${y}`
            newCells.set(key, {
              x,
              y,
              timestamp,
              intensity: Math.max(0, 1 - distance / TRAIL_WIDTH)
            })
          }
        }
      }
    }
    
    setGridCells(newCells)
  }
  
  // Draw the grid and active cells
  const drawGrid = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const cellWidth = rect.width / GRID_SIZE
    const cellHeight = rect.height / GRID_SIZE
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw subtle background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 0.5
    
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = i * cellWidth
      const y = i * cellHeight
      
      // Vertical lines
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
      
      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    
    // Draw active cells with fading effect
    const currentTime = Date.now()
    
    gridCells.forEach((cell) => {
      const age = currentTime - cell.timestamp
      const ageRatio = age / CELL_LIFETIME
      
      if (ageRatio < 1) {
        // Calculate fade out alpha
        let alpha = cell.intensity
        if (ageRatio > 0.7) {
          // Start fading after 70% of lifetime
          alpha *= (1 - (ageRatio - 0.7) / 0.3)
        }
        
        const cellX = cell.x * cellWidth
        const cellY = cell.y * cellHeight
        
        // Fill with Solana green (#14F195) as requested
        ctx.fillStyle = `rgba(20, 241, 149, ${alpha * 0.8})`
        ctx.fillRect(cellX, cellY, cellWidth, cellHeight)
        
        // Stroke with white outline as requested
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.25})`
        ctx.lineWidth = 1
        ctx.strokeRect(cellX, cellY, cellWidth, cellHeight)
      }
    })
  }
  
  // Handle mouse movement
  const handleMouseMove = (e) => {
    const gridPos = screenToGrid(e.clientX, e.clientY)
    if (gridPos) {
      fillCells(gridPos.x, gridPos.y)
    }
  }
  
  // Handle touch movement for mobile
  const handleTouchMove = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (touch) {
      const gridPos = screenToGrid(touch.clientX, touch.clientY)
      if (gridPos) {
        fillCells(gridPos.x, gridPos.y)
      }
    }
  }
  
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair pointer-events-auto"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        style={{
          display: 'block',
          background: 'transparent'
        }}
      />
    </div>
  )
}

export default InteractiveGridCanvas