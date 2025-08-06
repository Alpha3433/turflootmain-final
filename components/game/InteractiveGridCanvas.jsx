'use client'

import { useRef, useEffect, useState } from 'react'

const InteractiveGridCanvas = () => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const [gridCells, setGridCells] = useState(new Map())
  
  const GRID_SIZE = 40
  const CELL_LIFETIME = 4000 // 4 seconds as requested
  const TRAIL_WIDTH = 2
  
  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Initial draw
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
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
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
  
  // Draw the grid and active cells
  const drawGrid = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const cellWidth = canvas.width / GRID_SIZE
    const cellHeight = canvas.height / GRID_SIZE
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw subtle background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
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
    
    // Draw active trail cells with fading effect
    const currentTime = Date.now()
    
    gridCells.forEach((cell) => {
      const age = currentTime - cell.timestamp
      const ageRatio = age / CELL_LIFETIME
      
      if (ageRatio < 1) {
        // Calculate fade out alpha (start fading after 70% of lifetime)
        let alpha = cell.intensity
        if (ageRatio > 0.7) {
          alpha *= (1 - (ageRatio - 0.7) / 0.3)
        }
        
        const cellX = cell.x * cellWidth
        const cellY = cell.y * cellHeight
        
        // Fill with Solana green (#14F195) as requested
        ctx.fillStyle = `rgba(20, 241, 149, ${alpha * 0.6})`
        ctx.fillRect(cellX, cellY, cellWidth, cellHeight)
        
        // Stroke with white outline as requested
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.25})`
        ctx.lineWidth = 1
        ctx.strokeRect(cellX, cellY, cellWidth, cellHeight)
      }
    })
  }
  
  // Handle mouse movement - create Paper-io style trail
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert to grid coordinates
    const cellWidth = canvas.width / GRID_SIZE
    const cellHeight = canvas.height / GRID_SIZE
    const gridX = Math.floor(x / cellWidth)
    const gridY = Math.floor(y / cellHeight)
    
    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      const timestamp = Date.now()
      const newCells = new Map(gridCells)
      
      // Create trail area around mouse position (Paper-io style)
      for (let dx = -TRAIL_WIDTH; dx <= TRAIL_WIDTH; dx++) {
        for (let dy = -TRAIL_WIDTH; dy <= TRAIL_WIDTH; dy++) {
          const tx = gridX + dx
          const ty = gridY + dy
          
          if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance <= TRAIL_WIDTH) {
              const key = `${tx},${ty}`
              newCells.set(key, {
                x: tx,
                y: ty,
                timestamp,
                intensity: Math.max(0.3, 1 - distance / TRAIL_WIDTH)
              })
            }
          }
        }
      }
      
      setGridCells(newCells)
    }
  }
  
  // Handle touch movement for mobile
  const handleTouchMove = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (touch) {
      handleMouseMove(touch)
    }
  }
  
  return (
    <div className="absolute inset-0 w-full h-full" style={{ zIndex: 15 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
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
}

export default InteractiveGridCanvas