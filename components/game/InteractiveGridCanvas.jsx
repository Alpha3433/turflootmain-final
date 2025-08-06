'use client'

import { useRef, useEffect, useState } from 'react'

const InteractiveGridCanvas = () => {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastMousePosRef = useRef({ x: -1, y: -1 })
  const lastEventTimeRef = useRef(0)
  const isPausedRef = useRef(false)
  const offscreenCanvasRef = useRef(null)
  const offscreenCtxRef = useRef(null)
  
  // Grid state
  const GRID_SIZE = 50
  const CELL_LIFETIME = 4000 // 4 seconds
  const FADE_DURATION = 300 // 300ms fade out
  const FPS_THROTTLE = 16 // ~60fps (1000/60)
  
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
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Initialize canvas and offscreen buffer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Create offscreen canvas for better performance
    const offscreenCanvas = document.createElement('canvas')
    const offscreenCtx = offscreenCanvas.getContext('2d')
    
    offscreenCanvasRef.current = offscreenCanvas
    offscreenCtxRef.current = offscreenCtx

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      
      // Set actual canvas size
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      
      // Set offscreen canvas size
      offscreenCanvas.width = canvas.width
      offscreenCanvas.height = canvas.height
      
      // Scale context for high DPI
      ctx.scale(dpr, dpr)
      offscreenCtx.scale(dpr, dpr)
      
      // Set CSS size
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
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
    if (!canvas) return { x: -1, y: -1 }

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE)
    const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE)
    
    return { 
      x: Math.max(0, Math.min(GRID_SIZE - 1, x)), 
      y: Math.max(0, Math.min(GRID_SIZE - 1, y)) 
    }
  }

  // Fill grid cell and surrounding area (trail effect)
  const fillGridCells = (gridX, gridY, timestamp) => {
    const radius = 1 // Trail thickness
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = gridX + dx
        const y = gridY + dy
        
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance <= radius) {
            gridState[y][x] = {
              filled: true,
              timestamp,
              alpha: 1
            }
          }
        }
      }
    }
  }

  // Update grid state (handle fading)
  const updateGrid = (currentTime) => {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = gridState[y][x]
        if (cell.filled) {
          const age = currentTime - cell.timestamp
          
          if (age > CELL_LIFETIME) {
            // Start fading
            const fadeProgress = Math.min(1, (age - CELL_LIFETIME) / FADE_DURATION)
            cell.alpha = 1 - fadeProgress
            
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
  }

  // Draw grid to offscreen canvas
  const drawGrid = () => {
    const canvas = canvasRef.current
    const offscreenCtx = offscreenCtxRef.current
    if (!canvas || !offscreenCtx) return

    const rect = canvas.getBoundingClientRect()
    const cellWidth = rect.width / GRID_SIZE
    const cellHeight = rect.height / GRID_SIZE

    // Clear offscreen canvas
    offscreenCtx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid background (subtle)
    offscreenCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    offscreenCtx.lineWidth = 0.5
    
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = (i / GRID_SIZE) * rect.width
      const y = (i / GRID_SIZE) * rect.height
      
      offscreenCtx.beginPath()
      offscreenCtx.moveTo(x, 0)
      offscreenCtx.lineTo(x, rect.height)
      offscreenCtx.stroke()
      
      offscreenCtx.beginPath()
      offscreenCtx.moveTo(0, y)
      offscreenCtx.lineTo(rect.width, y)
      offscreenCtx.stroke()
    }

    // Draw filled cells
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = gridState[y][x]
        if (cell.filled && cell.alpha > 0) {
          const cellX = x * cellWidth
          const cellY = y * cellHeight
          
          // Fill cell with Solana green
          offscreenCtx.fillStyle = `rgba(20, 241, 149, ${cell.alpha * 0.8})`
          offscreenCtx.fillRect(cellX, cellY, cellWidth, cellHeight)
          
          // Stroke outline
          offscreenCtx.strokeStyle = `rgba(255, 255, 255, ${cell.alpha * 0.25})`
          offscreenCtx.lineWidth = 1
          offscreenCtx.strokeRect(cellX, cellY, cellWidth, cellHeight)
        }
      }
    }

    // Copy offscreen canvas to visible canvas
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.drawImage(offscreenCanvasRef.current, 0, 0, rect.width, rect.height)
  }

  // Animation loop
  const animate = (currentTime) => {
    if (isPausedRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate)
      return
    }

    updateGrid(currentTime)
    drawGrid()
    
    animationFrameRef.current = requestAnimationFrame(animate)
  }

  // Handle pointer events (mouse and touch)
  const handlePointerMove = (clientX, clientY) => {
    const currentTime = Date.now()
    
    // Throttle events to ~60fps
    if (currentTime - lastEventTimeRef.current < FPS_THROTTLE) {
      return
    }
    
    lastEventTimeRef.current = currentTime
    
    const { x, y } = screenToGrid(clientX, clientY)
    const lastPos = lastMousePosRef.current
    
    if (x !== lastPos.x || y !== lastPos.y) {
      fillGridCells(x, y, currentTime)
      lastMousePosRef.current = { x, y }
    }
  }

  // Event handlers
  const handleMouseMove = (e) => {
    if (prefersReducedMotion) return
    handlePointerMove(e.clientX, e.clientY)
  }

  const handleTouchMove = (e) => {
    if (prefersReducedMotion) return
    e.preventDefault()
    const touch = e.touches[0]
    if (touch) {
      handlePointerMove(touch.clientX, touch.clientY)
    }
  }

  // Visibility API - pause when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPausedRef.current = document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Start animation loop
  useEffect(() => {
    if (!prefersReducedMotion) {
      animationFrameRef.current = requestAnimationFrame(animate)
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }
  }, [prefersReducedMotion])

  // Add touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prefersReducedMotion) return

    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    
    return () => {
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
  }, [prefersReducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
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