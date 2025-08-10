'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const AgarIOGame = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const [gameStats, setGameStats] = useState({ netWorth: 100, rank: 1, players: 1, kills: 0, deaths: 0, streak: 0 })
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameResult, setGameResult] = useState('')
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [killFeed, setKillFeed] = useState([])
  const [floatingTexts, setFloatingTexts] = useState([])

  useEffect(() => {
    // Handle page visibility (exit game when tab is not visible)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Tab hidden - removing player from game')
        if (gameRef.current && !isGameOver) {
          gameRef.current.cleanup()
          setIsGameOver(true)
          setGameResult('🚪 Left Game - Tab Closed')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Initialize the game
    initializeGame()
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (gameRef.current) {
        gameRef.current.cleanup()
      }
    }
  }, [])

  // Handle keyboard input for cash-out
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && !isCashingOut && gameRef.current?.game?.player?.alive) {
        startCashOut()
      }
    }

    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'e' && isCashingOut) {
        cancelCashOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isCashingOut])

  const startCashOut = () => {
    setIsCashingOut(true)
    setCashOutProgress(0)
    
    const cashOutTimer = setInterval(() => {
      setCashOutProgress(prev => {
        if (prev >= 100) {
          clearInterval(cashOutTimer)
          completeCashOut()
          return 100
        }
        return prev + 2 // 5 seconds = 100 / 2
      })
    }, 100)

    gameRef.current.cashOutTimer = cashOutTimer
  }

  const cancelCashOut = () => {
    setIsCashingOut(false)
    setCashOutProgress(0)
    if (gameRef.current?.cashOutTimer) {
      clearInterval(gameRef.current.cashOutTimer)
    }
  }

  const completeCashOut = () => {
    const netWorth = gameRef.current?.game?.player?.netWorth || 0
    addFloatingText(`Banked: $${netWorth}`, gameRef.current?.game?.player?.x || 0, gameRef.current?.game?.player?.y || 0, '#00ff00')
    
    // Add to kill feed
    addToKillFeed(`You cashed out $${netWorth}`)
    
    setIsCashingOut(false)
    setCashOutProgress(0)
    
    // Fade out and end game
    setTimeout(() => {
      setIsGameOver(true)
      setGameResult(`💰 Cashed Out: $${netWorth}`)
    }, 1000)
  }

  const addToKillFeed = (message) => {
    const newFeedItem = {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }
    
    setKillFeed(prev => [newFeedItem, ...prev.slice(0, 4)]) // Keep last 5 items
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setKillFeed(prev => prev.filter(item => item.id !== newFeedItem.id))
    }, 5000)
  }

  const addFloatingText = (text, x, y, color = '#ffff00') => {
    const newText = {
      id: Date.now(),
      text,
      x,
      y,
      color,
      life: 1.0,
      startY: y
    }
    
    setFloatingTexts(prev => [...prev, newText])
    
    // Remove after animation
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== newText.id))
    }, 2000)
  }

  const initializeGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    // Game configuration
    const config = {
      worldSize: 4000,
      orbCount: 200,
      botCount: 15,
      baseSpeed: 180,
      startingNetWorth: 100,
      startingMass: 10,
      orbMassValue: 1.5, // Orbs now only give mass, not money
      massPerDollar: 0.8,
      bountyThreshold: 500,
      killReward: 50,
      platformFee: 0.10 // 10% platform fee on cash out
    }

    // Game state
    const game = {
      player: {
        x: 0,
        y: 0,
        netWorth: config.startingNetWorth,
        dir: { x: 0, y: 0 },
        alive: true,
        name: 'You',
        kills: 0,
        deaths: 0,
        streak: 0,
        isBounty: false,
        cashBadgeScale: 1.0,
        lastNetWorth: config.startingNetWorth
      },
      bots: [],
      orbs: [],
      camera: { x: 0, y: 0, zoom: 0.6 },
      running: true,
      bounties: new Set()
    }

    // Initialize orbs (money pickup)
    for (let i = 0; i < config.orbCount; i++) {
      game.orbs.push({
        id: i,
        x: (Math.random() - 0.5) * config.worldSize,
        y: (Math.random() - 0.5) * config.worldSize,
        value: config.orbValue,
        color: `hsl(${60 + Math.random() * 30}, 70%, 60%)` // Gold-ish colors
      })
    }

    // Initialize bots with varying net worth
    for (let i = 0; i < config.botCount; i++) {
      const netWorth = config.startingNetWorth + Math.random() * 200
      game.bots.push({
        id: i,
        x: (Math.random() - 0.5) * config.worldSize,
        y: (Math.random() - 0.5) * config.worldSize,
        netWorth: netWorth,
        dir: { 
          x: (Math.random() - 0.5) * 2, 
          y: (Math.random() - 0.5) * 2 
        },
        alive: true,
        name: `Player ${i + 1}`,
        color: `hsl(${Math.random() * 360}, 60%, 50%)`,
        targetDir: { x: 0, y: 0 },
        lastDirChange: Date.now(),
        kills: Math.floor(Math.random() * 5),
        deaths: Math.floor(Math.random() * 2),
        streak: Math.floor(Math.random() * 3),
        isBounty: false,
        cashBadgeScale: 1.0,
        lastNetWorth: netWorth
      })
    }

    // Helper functions
    const getRadius = (netWorth) => Math.sqrt(netWorth) * config.radiusPerDollar
    
    const getDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
    
    const normalizeVector = (vec) => {
      const length = Math.hypot(vec.x, vec.y) || 1
      return { x: vec.x / length, y: vec.y / length }
    }

    const getCashBadgeColor = (netWorth) => {
      if (netWorth < 200) return '#90EE90' // Light green
      if (netWorth < 500) return '#FFD700' // Gold
      if (netWorth < 1000) return '#FF6347' // Tomato
      return '#8A2BE2' // Blue violet for high stakes
    }

    const updateBounties = () => {
      const allPlayers = [game.player, ...game.bots].filter(p => p.alive)
      allPlayers.sort((a, b) => b.netWorth - a.netWorth)
      
      // Clear old bounties
      game.bounties.clear()
      allPlayers.forEach(p => p.isBounty = false)
      
      // Mark top 25% as bounties if they have enough net worth
      const bountyCount = Math.max(1, Math.floor(allPlayers.length * 0.25))
      for (let i = 0; i < bountyCount; i++) {
        if (allPlayers[i].netWorth >= config.bountyThreshold) {
          game.bounties.add(allPlayers[i])
          allPlayers[i].isBounty = true
        }
      }
    }

    // Mouse movement handler
    const handleMouseMove = (e) => {
      if (!game.player.alive || isCashingOut) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const worldMouseX = (mouseX - canvas.width / 2) / game.camera.zoom + game.camera.x
      const worldMouseY = (mouseY - canvas.height / 2) / game.camera.zoom + game.camera.y
      
      const dx = worldMouseX - game.player.x
      const dy = worldMouseY - game.player.y
      
      game.player.dir = normalizeVector({ x: dx, y: dy })
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    // Game loop
    let lastTime = 0
    const gameLoop = (currentTime) => {
      if (!game.running) return
      
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      // Cancel cash out if moving
      if (isCashingOut && (game.player.dir.x !== 0 || game.player.dir.y !== 0)) {
        cancelCashOut()
      }
      
      // Update player (only if not cashing out)
      if (game.player.alive && !isCashingOut) {
        const speed = config.baseSpeed / Math.sqrt(Math.max(game.player.netWorth / 100, 1))
        game.player.x += game.player.dir.x * speed * deltaTime
        game.player.y += game.player.dir.y * speed * deltaTime
        
        // World boundaries
        const halfWorld = config.worldSize / 2
        game.player.x = Math.max(-halfWorld, Math.min(halfWorld, game.player.x))
        game.player.y = Math.max(-halfWorld, Math.min(halfWorld, game.player.y))
      }

      // Update bots
      game.bots.forEach(bot => {
        if (!bot.alive) return
        
        // Simple AI: change direction occasionally, chase orbs
        if (Date.now() - bot.lastDirChange > 1000 + Math.random() * 2000) {
          // Find nearest orb
          let nearestOrb = null
          let nearestDistance = Infinity
          
          game.orbs.forEach(orb => {
            const distance = getDistance(bot, orb)
            if (distance < nearestDistance) {
              nearestDistance = distance
              nearestOrb = orb
            }
          })
          
          if (nearestOrb && nearestDistance < 400) {
            // Chase orb
            const dx = nearestOrb.x - bot.x
            const dy = nearestOrb.y - bot.y
            bot.targetDir = normalizeVector({ x: dx, y: dy })
          } else {
            // Random movement
            bot.targetDir = {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2
            }
          }
          bot.lastDirChange = Date.now()
        }
        
        // Move towards target direction
        bot.dir.x += (bot.targetDir.x - bot.dir.x) * deltaTime * 3
        bot.dir.y += (bot.targetDir.y - bot.dir.y) * deltaTime * 3
        bot.dir = normalizeVector(bot.dir)
        
        const speed = config.baseSpeed / Math.sqrt(Math.max(bot.netWorth / 100, 1))
        bot.x += bot.dir.x * speed * deltaTime
        bot.y += bot.dir.y * speed * deltaTime
        
        // World boundaries
        const halfWorld = config.worldSize / 2
        bot.x = Math.max(-halfWorld, Math.min(halfWorld, bot.x))
        bot.y = Math.max(-halfWorld, Math.min(halfWorld, bot.y))
      })

      // Orb pickup
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      
      for (let i = game.orbs.length - 1; i >= 0; i--) {
        const orb = game.orbs[i]
        
        for (const entity of allEntities) {
          const distance = getDistance(entity, orb)
          const radius = getRadius(entity.netWorth)
          
          if (distance <= radius) {
            const oldNetWorth = entity.netWorth
            entity.netWorth += orb.value
            
            // Animate cash badge scale up
            entity.cashBadgeScale = 1.3
            setTimeout(() => {
              if (entity.cashBadgeScale > 1.0) entity.cashBadgeScale = 1.0
            }, 200)
            
            // Add floating text for player
            if (entity === game.player) {
              addFloatingText(`+$${orb.value}`, entity.x, entity.y - 30, '#00ff00')
            }
            
            game.orbs.splice(i, 1)
            break
          }
        }
      }

      // Replenish orbs
      while (game.orbs.length < config.orbCount) {
        game.orbs.push({
          id: Math.random(),
          x: (Math.random() - 0.5) * config.worldSize,
          y: (Math.random() - 0.5) * config.worldSize,
          value: config.orbValue,
          color: `hsl(${60 + Math.random() * 30}, 70%, 60%)`
        })
      }

      // Combat
      if (game.player.alive) {
        for (const bot of game.bots) {
          if (!bot.alive) continue
          
          const distance = getDistance(game.player, bot)
          const playerRadius = getRadius(game.player.netWorth)
          const botRadius = getRadius(bot.netWorth)
          
          if (distance < Math.max(playerRadius, botRadius)) {
            if (game.player.netWorth > bot.netWorth * 1.15) {
              // Player kills bot
              const bountyMultiplier = bot.isBounty ? 1.5 : 1.0
              const killReward = Math.floor(config.killReward * bountyMultiplier)
              
              game.player.netWorth += killReward
              game.player.kills += 1
              game.player.streak += 1
              game.player.cashBadgeScale = 1.3
              
              bot.alive = false
              
              // Add floating text
              const bountyText = bot.isBounty ? ` Bounty!` : ''
              addFloatingText(`+$${killReward}${bountyText}`, game.player.x, game.player.y - 50, '#ff4444')
              
              // Add to kill feed
              addToKillFeed(`You eliminated ${bot.name} (+$${killReward}${bountyText})`)
              
            } else if (bot.netWorth > game.player.netWorth * 1.15) {
              // Bot kills player
              game.player.alive = false
              game.player.deaths += 1
              game.player.streak = 0
              setIsGameOver(true)
              setGameResult(`💀 Eliminated by ${bot.name}`)
            }
          }
        }
      }

      // Bot vs Bot combat
      for (let i = 0; i < game.bots.length; i++) {
        if (!game.bots[i].alive) continue
        
        for (let j = i + 1; j < game.bots.length; j++) {
          if (!game.bots[j].alive) continue
          
          const distance = getDistance(game.bots[i], game.bots[j])
          const radiusA = getRadius(game.bots[i].netWorth)
          const radiusB = getRadius(game.bots[j].netWorth)
          
          if (distance < Math.max(radiusA, radiusB)) {
            if (game.bots[i].netWorth > game.bots[j].netWorth * 1.15) {
              game.bots[i].netWorth += config.killReward
              game.bots[i].kills += 1
              game.bots[i].streak += 1
              game.bots[j].alive = false
              game.bots[j].deaths += 1
              game.bots[j].streak = 0
            } else if (game.bots[j].netWorth > game.bots[i].netWorth * 1.15) {
              game.bots[j].netWorth += config.killReward
              game.bots[j].kills += 1
              game.bots[j].streak += 1
              game.bots[i].alive = false
              game.bots[i].deaths += 1
              game.bots[i].streak = 0
            }
          }
        }
      }

      // Update bounty system
      updateBounties()

      // Update camera
      if (game.player.alive) {
        game.camera.x = game.player.x
        game.camera.y = game.player.y
        
        // Zoom based on net worth
        const targetZoom = Math.max(0.3, Math.min(1.0, 1.0 / Math.sqrt(game.player.netWorth / 100)))
        game.camera.zoom += (targetZoom - game.camera.zoom) * deltaTime * 2
      }

      // Update stats
      const aliveBots = game.bots.filter(b => b.alive)
      const allAlive = game.player.alive ? [game.player, ...aliveBots] : aliveBots
      allAlive.sort((a, b) => b.netWorth - a.netWorth)
      
      const playerRank = game.player.alive ? allAlive.findIndex(e => e === game.player) + 1 : allAlive.length + 1
      
      setGameStats({
        netWorth: Math.floor(game.player.netWorth),
        rank: playerRank,
        players: allAlive.length,
        kills: game.player.kills,
        deaths: game.player.deaths,
        streak: game.player.streak
      })

      // Update floating texts
      setFloatingTexts(prev => prev.map(text => ({
        ...text,
        life: text.life - deltaTime * 0.8,
        y: text.startY - (1 - text.life) * 50
      })).filter(text => text.life > 0))

      // Render
      render()
      
      requestAnimationFrame(gameLoop)
    }

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.save()
      
      // Apply camera transform
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.scale(game.camera.zoom, game.camera.zoom)
      ctx.translate(-game.camera.x, -game.camera.y)
      
      // Draw grid
      drawGrid()
      
      // Draw orbs
      game.orbs.forEach(orb => {
        ctx.fillStyle = orb.color
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, 8, 0, Math.PI * 2)
        ctx.fill()
        
        // Dollar sign
        ctx.fillStyle = '#000000'
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('$', orb.x, orb.y + 3)
      })
      
      // Draw entities (sorted by net worth)
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      allEntities.sort((a, b) => a.netWorth - b.netWorth)
      
      allEntities.forEach(entity => {
        const radius = getRadius(entity.netWorth)
        const isPlayer = entity === game.player
        
        // Bounty gold ring
        if (entity.isBounty) {
          ctx.strokeStyle = '#FFD700'
          ctx.lineWidth = 6
          ctx.beginPath()
          ctx.arc(entity.x, entity.y, radius + 10, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.beginPath()
        ctx.arc(entity.x + 4, entity.y + 4, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Entity circle
        ctx.fillStyle = isPlayer ? '#00f5ff' : entity.color
        ctx.beginPath()
        ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Border
        ctx.strokeStyle = entity.isBounty ? '#FFD700' : '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        
        // Eyes
        if (radius > 15) {
          const eyeOffset = radius * 0.3
          const eyeSize = Math.max(2, radius * 0.1)
          
          ctx.fillStyle = '#000000'
          ctx.beginPath()
          ctx.arc(entity.x - eyeOffset, entity.y - eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.beginPath()
          ctx.arc(entity.x + eyeOffset, entity.y - eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Bounty crown
        if (entity.isBounty) {
          ctx.fillStyle = '#FFD700'
          ctx.font = `${Math.max(16, radius * 0.4)}px Arial`
          ctx.textAlign = 'center'
          ctx.fillText('👑', entity.x, entity.y - radius - 25)
        }
        
        // Cash Badge above player
        const badgeY = entity.y - radius - (entity.isBounty ? 50 : 35)
        const badgeScale = entity.cashBadgeScale || 1.0
        
        ctx.save()
        ctx.translate(entity.x, badgeY)
        ctx.scale(badgeScale, badgeScale)
        
        // Badge background with drop shadow
        const badgeColor = getCashBadgeColor(entity.netWorth)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 5
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        ctx.fillStyle = badgeColor
        ctx.beginPath()
        ctx.roundRect(-25, -8, 50, 16, 8)
        ctx.fill()
        
        ctx.shadowColor = 'transparent'
        
        // Badge text
        ctx.fillStyle = '#000000'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`$${Math.floor(entity.netWorth)}`, 0, 4)
        
        ctx.restore()
      })
      
      // Draw floating texts
      floatingTexts.forEach(text => {
        if (text.life > 0) {
          ctx.fillStyle = text.color + Math.floor(text.life * 255).toString(16).padStart(2, '0')
          ctx.font = '16px Arial'
          ctx.textAlign = 'center'
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 2
          ctx.strokeText(text.text, text.x, text.y)
          ctx.fillText(text.text, text.x, text.y)
        }
      })
      
      // Cash out progress ring
      if (isCashingOut && game.player.alive) {
        const radius = getRadius(game.player.netWorth) + 20
        const progress = cashOutProgress / 100
        
        // Background ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(game.player.x, game.player.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        
        // Progress ring
        ctx.strokeStyle = '#00ff00'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(game.player.x, game.player.y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
        ctx.stroke()
        
        // Cash out text
        ctx.fillStyle = '#ffffff'
        ctx.font = '14px Arial'
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.strokeText('CASHING OUT...', game.player.x, game.player.y - radius - 20)
        ctx.fillText('CASHING OUT...', game.player.x, game.player.y - radius - 20)
      }
      
      ctx.restore()
    }

    const drawGrid = () => {
      const gridSize = 100
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      
      // Get visible world bounds
      const viewWidth = canvas.width / game.camera.zoom
      const viewHeight = canvas.height / game.camera.zoom
      const left = game.camera.x - viewWidth / 2
      const right = game.camera.x + viewWidth / 2
      const top = game.camera.y - viewHeight / 2
      const bottom = game.camera.y + viewHeight / 2
      
      // Vertical lines
      const startX = Math.floor(left / gridSize) * gridSize
      const endX = Math.ceil(right / gridSize) * gridSize
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
      }
      
      // Horizontal lines
      const startY = Math.floor(top / gridSize) * gridSize
      const endY = Math.ceil(bottom / gridSize) * gridSize
      
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
        ctx.stroke()
      }
    }

    // Start game loop
    requestAnimationFrame(gameLoop)

    // Store game reference for cleanup
    gameRef.current = {
      game,
      cleanup: () => {
        game.running = false
        canvas.removeEventListener('mousemove', handleMouseMove)
        if (gameRef.current?.cashOutTimer) {
          clearInterval(gameRef.current.cashOutTimer)
        }
      }
    }
  }

  const restartGame = () => {
    setIsGameOver(false)
    setGameResult('')
    setKillFeed([])
    setFloatingTexts([])
    setIsCashingOut(false)
    setCashOutProgress(0)
    if (gameRef.current) {
      gameRef.current.cleanup()
    }
    setTimeout(() => initializeGame(), 100)
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ display: isGameOver ? 'none' : 'block' }}
      />
      
      {/* Top-right Player Stats Panel */}
      {!isGameOver && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30 min-w-[200px]">
          <div className="text-cyan-400 font-bold text-lg mb-2">You</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Net Worth:</span>
              <span className="text-green-400 font-bold">${gameStats.netWorth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">K/D:</span>
              <span className="text-white">{gameStats.kills}/{gameStats.deaths}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Streak:</span>
              <div className="flex items-center">
                <span className="text-yellow-400 mr-1">{gameStats.streak}</span>
                {gameStats.streak > 0 && <span>🔥</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard (Net Worth) */}
      {!isGameOver && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30 max-w-[250px]">
          <div className="text-cyan-400 font-bold text-lg mb-2">💰 Net Worth Leaders</div>
          <div className="text-sm text-gray-300">
            <div className="mb-1">Rank #{gameStats.rank} of {gameStats.players}</div>
            <div className="text-green-400">Your Worth: ${gameStats.netWorth}</div>
          </div>
        </div>
      )}

      {/* Kill Feed */}
      {killFeed.length > 0 && !isGameOver && (
        <div className="absolute bottom-4 left-4 space-y-2 max-w-[400px]">
          {killFeed.map((item, index) => (
            <div 
              key={item.id}
              className="bg-black/80 backdrop-blur-sm rounded px-3 py-2 border border-gray-600/30 text-sm text-white"
              style={{ opacity: 1 - (index * 0.2) }}
            >
              {item.message}
            </div>
          ))}
        </div>
      )}

      {/* Minimap */}
      {!isGameOver && gameRef.current?.game && (
        <div className="absolute bottom-4 right-4 w-32 h-32 bg-black/80 backdrop-blur-sm rounded border border-gray-600/30">
          <canvas 
            width="128" 
            height="128" 
            className="w-full h-full"
            ref={(minimapCanvas) => {
              if (minimapCanvas && gameRef.current?.game) {
                const ctx = minimapCanvas.getContext('2d')
                const game = gameRef.current.game
                
                // Clear minimap
                ctx.fillStyle = '#111'
                ctx.fillRect(0, 0, 128, 128)
                
                // Draw border
                ctx.strokeStyle = '#333'
                ctx.lineWidth = 1
                ctx.strokeRect(0, 0, 128, 128)
                
                // Scale factor
                const scale = 128 / 4000 // world size is 4000
                
                // Draw players
                const allPlayers = [game.player, ...game.bots].filter(p => p.alive)
                allPlayers.forEach(player => {
                  const x = (player.x + 2000) * scale // offset by half world
                  const y = (player.y + 2000) * scale
                  
                  if (player === game.player) {
                    ctx.fillStyle = '#00f5ff'
                    ctx.fillRect(x - 2, y - 2, 4, 4)
                  } else if (player.isBounty) {
                    ctx.fillStyle = '#FFD700'
                    ctx.fillRect(x - 3, y - 3, 6, 6)
                    // Add crown indicator
                    ctx.fillStyle = '#FFD700'
                    ctx.fillRect(x - 1, y - 5, 2, 2)
                  } else {
                    ctx.fillStyle = '#666'
                    ctx.fillRect(x - 1, y - 1, 2, 2)
                  }
                })
              }
            }}
          />
        </div>
      )}

      {/* Controls */}
      {!isGameOver && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30">
          <div className="text-xs text-gray-300 text-center space-y-1">
            <div>🖱️ Move mouse to control • 💰 Collect orbs for money</div>
            <div>⚔️ Eliminate smaller players • 🏦 Hold E to cash out</div>
            <div>👑 Bounty players give bonus rewards</div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-gray-900 rounded-2xl p-8 border border-cyan-400/30 text-center max-w-md">
            <div className="text-3xl font-bold mb-4 text-red-400">
              {gameResult}
            </div>
            
            <div className="text-gray-300 mb-6 space-y-2">
              <p>Final Net Worth: <span className="text-green-400 font-bold">${gameStats.netWorth}</span></p>
              <p>Final Rank: <span className="text-cyan-400">#{gameStats.rank}</span></p>
              <p>K/D Ratio: <span className="text-yellow-400">{gameStats.kills}/{gameStats.deaths}</span></p>
              <p>Best Streak: <span className="text-orange-400">{gameStats.streak} 🔥</span></p>
            </div>

            <div className="space-y-3">
              <button
                onClick={restartGame}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Play Again
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgarIOGame