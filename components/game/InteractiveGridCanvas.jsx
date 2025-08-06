'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const InteractiveGridCanvas = () => {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastMousePosRef = useRef({ x: -1, y: -1 })
  const isInitializedRef = useRef(false)
  
  // Grid state
  const GRID_SIZE = 40
  const CELL_LIFETIME = 4000 // 4 seconds
  const FADE_DURATION = 1000 // 1s fade out
  
  const [gridState] = useState(() => {
    // Initialize grid with timestamp and alpha for each cell
    const grid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => ({
        filled: false,
        timestamp: 0,
        alpha: 0
      }))
    )
    return grid
  })

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)
      
      const handleChange = (e) => setPrefersReducedMotion(e.matches)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Convert screen coordinates to grid coordinates
  const screenToGrid = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: -1, y: -1 }

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE)
    const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE)
    
    return { 
      x: Math.max(0, Math.min(GRID_SIZE - 1, x)), 
      y: Math.max(0, Math.min(GRID_SIZE - 1, y)) 
    }
  }, [])

  // Fill grid cell and surrounding area (trail effect)
  const fillGridCells = useCallback((gridX, gridY, timestamp) => {
    const radius = 1.5 // Trail thickness
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = Math.round(gridX + dx)
        const y = Math.round(gridY + dy)
        
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance <= radius) {
            gridState[y][x] = {
              filled: true,
              timestamp,
              alpha: 1 - (distance / radius) * 0.3 // Softer edges
            }
          }
        }
      }
    }
  }, [gridState])

  // Update grid state (handle fading)
  const updateGrid = useCallback((currentTime) => {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = gridState[y][x]
        if (cell.filled) {
          const age = currentTime - cell.timestamp
          
          if (age > CELL_LIFETIME) {
            // Start fading
            const fadeProgress = Math.min(1, (age - CELL_LIFETIME) / FADE_DURATION)
            cell.alpha = (1 - fadeProgress) * cell.alpha
            
            if (fadeProgress >= 1) {
              // Reset cell
              cell.filled = false
              cell.alpha = 0
              cell.timestamp = 0
            }
          }
        }
      }
    }
  }, [gridState])

  // Draw grid
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const cellWidth = rect.width / GRID_SIZE
    const cellHeight = rect.height / GRID_SIZE

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw subtle grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 0.5
    
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = (i / GRID_SIZE) * rect.width
      const y = (i / GRID_SIZE) * rect.height
      
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()
    }

    // Draw filled cells
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = gridState[y][x]
        if (cell.filled && cell.alpha > 0.01) {
          const cellX = x * cellWidth
          const cellY = y * cellHeight
          
          // Fill cell with Solana green
          ctx.fillStyle = `rgba(20, 241, 149, ${cell.alpha * 0.7})`
          ctx.fillRect(cellX, cellY, cellWidth, cellHeight)
          
          // Stroke outline
          ctx.strokeStyle = `rgba(255, 255, 255, ${cell.alpha * 0.25})`
          ctx.lineWidth = 1
          ctx.strokeRect(cellX, cellY, cellWidth, cellHeight)
        }
      }
    }
  }, [gridState])

  // Animation loop
  const animate = useCallback((currentTime) => {
    updateGrid(currentTime)
    drawGrid()
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [updateGrid, drawGrid])

  // Handle pointer events (mouse and touch)
  const handlePointerMove = useCallback((clientX, clientY) => {
    const currentTime = Date.now()
    const { x, y } = screenToGrid(clientX, clientY)
    const lastPos = lastMousePosRef.current
    
    if (x !== -1 && y !== -1 && (x !== lastPos.x || y !== lastPos.y)) {
      fillGridCells(x, y, currentTime)
      lastMousePosRef.current = { x, y }
    }
  }, [screenToGrid, fillGridCells])

  // Event handlers
  const handleMouseMove = useCallback((e) => {
    if (prefersReducedMotion) return
    handlePointerMove(e.clientX, e.clientY)
  }, [prefersReducedMotion, handlePointerMove])

  const handleTouchMove = useCallback((e) => {
    if (prefersReducedMotion) return
    e.preventDefault()
    const touch = e.touches[0]
    if (touch) {
      handlePointerMove(touch.clientX, touch.clientY)
    }
  }, [prefersReducedMotion, handlePointerMove])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isInitializedRef.current) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      // Set actual canvas size
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      
      // Scale context for high DPI
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      
      // Set CSS size
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    isInitializedRef.current = true

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Start animation loop
  useEffect(() => {
    if (prefersReducedMotion || !isInitializedRef.current) return

    console.log('Starting animation loop...')
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [prefersReducedMotion, animate])

  // Add touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prefersReducedMotion) return

    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    
    return () => {
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
  }, [prefersReducedMotion, handleTouchMove])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair pointer-events-auto"
      onMouseMove={handleMouseMove}
      style={{
        background: prefersReducedMotion 
          ? 'radial-gradient(circle at center, rgba(20, 241, 149, 0.1) 0%, transparent 70%)'
          : 'transparent',
        zIndex: 1
      }}
    />
  )
}

export default InteractiveGridCanvas