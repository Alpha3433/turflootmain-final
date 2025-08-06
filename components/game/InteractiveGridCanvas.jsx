'use client'

import { useRef, useEffect, useState } from 'react'

const InteractiveGridCanvas = () => {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const gridStateRef = useRef([])
  
  // Grid configuration
  const GRID_SIZE = 30
  const CELL_LIFETIME = 4000 // 4 seconds
  
  // Initialize grid state
  useEffect(() => {
    console.log('🎮 InteractiveGridCanvas: Initializing...')
    gridStateRef.current = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => ({
        filled: false,
        timestamp: 0,
        alpha: 0
      }))
    )
  }, [])
  
  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    console.log('🎨 Canvas: Setting up canvas...')
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      console.log('📐 Canvas: Resizing to', rect.width, 'x', rect.height)
      
      // Set canvas size to match container
      canvas.width = rect.width
      canvas.height = rect.height
      
      const ctx = canvas.getContext('2d')
      
      // Test draw - should show red square in top-left
      ctx.fillStyle = 'red'
      ctx.fillRect(0, 0, 50, 50)
      console.log('🔴 Canvas: Test red square drawn')
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])
  
  // Convert screen coordinates to grid coordinates  
  const screenToGrid = (clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE)
    const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE)
    
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, y))
    }
  }
  
  // Fill grid cells
  const fillGridCells = (gridX, gridY) => {
    const timestamp = Date.now()
    const radius = 1.5
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = Math.round(gridX + dx)
        const y = Math.round(gridY + dy)
        
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance <= radius) {
            gridStateRef.current[y][x] = {
              filled: true,
              timestamp,
              alpha: 1
            }
          }
        }
      }
    }
  }
  
  // Draw the grid
  const drawGrid = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    const cellWidth = rect.width / GRID_SIZE
    const cellHeight = rect.height / GRID_SIZE
    
    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 0.5
    
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = (i / GRID_SIZE) * rect.width
      const y = (i / GRID_SIZE) * rect.height
      
      // Vertical lines
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
      
      // Horizontal lines  
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()
    }
    
    // Draw filled cells
    const currentTime = Date.now()
    let drawnCells = 0
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = gridStateRef.current[y][x]
        if (cell.filled) {
          const age = currentTime - cell.timestamp
          
          if (age > CELL_LIFETIME) {
            // Reset expired cells
            cell.filled = false
            cell.alpha = 0
            cell.timestamp = 0
          } else {
            // Draw active cells
            const cellX = x * cellWidth
            const cellY = y * cellHeight
            
            // Fade out over time
            const fadeStart = CELL_LIFETIME * 0.7 // Start fading at 70% of lifetime
            let alpha = 1
            if (age > fadeStart) {
              alpha = 1 - ((age - fadeStart) / (CELL_LIFETIME - fadeStart))
            }
            
            // Fill with Solana green
            ctx.fillStyle = `rgba(20, 241, 149, ${alpha * 0.8})`
            ctx.fillRect(cellX, cellY, cellWidth, cellHeight)
            
            // Stroke outline
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
            ctx.lineWidth = 1
            ctx.strokeRect(cellX, cellY, cellWidth, cellHeight)
            
            drawnCells++
          }
        }
      }
    }
    
    if (drawnCells > 0) {
      console.log('✅ Drawing', drawnCells, 'active cells')
    }
  }
  
  // Animation loop
  const animate = () => {
    drawGrid()
    animationFrameRef.current = requestAnimationFrame(animate)
  }
  
  // Start animation
  useEffect(() => {
    console.log('🎬 Animation: Starting loop...')
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        console.log('🛑 Animation: Stopped')
      }
    }
  }, [])
  
  // Mouse move handler
  const handleMouseMove = (e) => {
    const gridPos = screenToGrid(e.clientX, e.clientY)
    if (gridPos) {
      console.log('🖱️  Mouse at grid:', gridPos.x, gridPos.y)
      fillGridCells(gridPos.x, gridPos.y)
    }
  }
  
  return (
    <div className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        style={{
          display: 'block',
          background: 'transparent'
        }}
      />
    </div>
  )
}

export default InteractiveGridCanvas

export default InteractiveGridCanvas