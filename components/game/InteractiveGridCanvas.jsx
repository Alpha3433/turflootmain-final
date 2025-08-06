'use client'

import { useRef, useEffect } from 'react'

const InteractiveGridCanvas = () => {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    console.log('🎨 Canvas component mounted!')
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      drawStaticGrid()
    }
    
    // Draw a static grid that's always visible
    const drawStaticGrid = () => {
      const ctx = canvas.getContext('2d')
      const width = canvas.width
      const height = canvas.height
      
      console.log('🎨 Drawing static grid...', width, height)
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height)
      
      // Draw test rectangle to ensure canvas is working
      ctx.fillStyle = 'rgba(20, 241, 149, 0.3)'
      ctx.fillRect(10, 10, 100, 100)
      
      // Draw grid lines
      const gridSize = 30
      const cellWidth = width / gridSize
      const cellHeight = height / gridSize
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      
      // Vertical lines
      for (let i = 0; i <= gridSize; i++) {
        const x = i * cellWidth
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      
      // Horizontal lines
      for (let i = 0; i <= gridSize; i++) {
        const y = i * cellHeight
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])
  
  // Simple mouse move handler for testing
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    console.log('🖱️  Mouse at:', x, y)
    
    const ctx = canvas.getContext('2d')
    
    // Draw a small green circle where mouse is
    ctx.fillStyle = 'rgba(20, 241, 149, 0.8)'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, 2 * Math.PI)
    ctx.fill()
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