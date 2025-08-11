'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGameSettings } from '@/components/providers/GameSettingsProvider'

const AgarIOGame = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const { settings } = useGameSettings()  // Add settings hook
  
  // Ping monitoring function
  const measurePing = async () => {
    try {
      const startTime = Date.now()
      await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache' 
      })
      const endTime = Date.now()
      const latency = endTime - startTime
      setPing(latency)
    } catch (error) {
      // If ping fails, set high ping value to indicate connection issues
      setPing(999)
    }
  }
  const [gameStats, setGameStats] = useState({ netWorth: 100, rank: 1, players: 1, kills: 0, deaths: 0, streak: 0 })
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameResult, setGameResult] = useState('')
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [killFeed, setKillFeed] = useState([])
  const [floatingTexts, setFloatingTexts] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [showControls, setShowControls] = useState(true)
  const [ping, setPing] = useState(0)

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
    
    // Hide controls after 5 seconds
    const controlsTimer = setTimeout(() => {
      setShowControls(false)
    }, 5000)
    
    // Start ping monitoring
    measurePing() // Initial measurement
    const pingInterval = setInterval(measurePing, 2000) // Measure every 2 seconds
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(controlsTimer)
      clearInterval(pingInterval)
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
    
    // Use quickCashOut setting: 3s if enabled, 5s if disabled
    const cashOutDuration = settings.quickCashOut ? 3000 : 5000 // 3s or 5s in milliseconds
    const increment = 100 / (cashOutDuration / 100) // Calculate increment per 100ms
    
    const cashOutTimer = setInterval(() => {
      setCashOutProgress(prev => {
        if (prev >= 100) {
          clearInterval(cashOutTimer)
          completeCashOut()
          return 100
        }
        return prev + increment
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
    const platformFee = netWorth * 0.10 // 10% platform fee
    const finalAmount = netWorth - platformFee
    
    addFloatingText(`Banked: $${Math.floor(finalAmount)}`, gameRef.current?.game?.player?.x || 0, gameRef.current?.game?.player?.y || 0, '#00ff00')
    addFloatingText(`-$${Math.floor(platformFee)} fee`, gameRef.current?.game?.player?.x || 0, (gameRef.current?.game?.player?.y || 0) - 25, '#ff4444')
    
    // Add to kill feed
    addToKillFeed(`You cashed out $${Math.floor(finalAmount)} (after 10% fee)`)
    
    setIsCashingOut(false)
    setCashOutProgress(0)
    
    // Fade out and end game
    setTimeout(() => {
      setIsGameOver(true)
      setGameResult(`💰 Cashed Out: $${Math.floor(finalAmount)} (${Math.floor(platformFee)} fee)`)
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
      worldSize: 3750, // Increased by 25% (was 3000, now 3750)
      orbCount: 600, // Increased even more - 50% more orbs from 400
      virusCount: 25, // Virus cells scattered around the map
      botCount: 15,
      baseSpeed: 648, // Additional 60% increase (405 * 1.6 = 648)
      startingNetWorth: 100,
      startingMass: 10,
      orbMassValue: 4.5, // Tripled from 1.5 to 4.5 - much bigger growth per orb
      massPerDollar: 0.8,
      bountyThreshold: 500,
      killReward: 50,
      platformFee: 0.10,
      virusRadius: 25,
      virusSplitThreshold: 35, // Mass threshold to split when hitting virus
      virusHideThreshold: 25 // Mass threshold to hide inside virus
    }

    // Game state
    const game = {
      player: {
        x: 0,
        y: 0,
        mass: config.startingMass,
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
      viruses: [], // Add virus array
      camera: { x: 0, y: 0, zoom: 1.2 }, // Much more zoomed in
      running: true,
      bounties: new Set()
    }

    // Initialize orbs (mass pickup, not money) - only spawn within circular boundary
    for (let i = 0; i < config.orbCount; i++) {
      let x, y, distance
      const maxRadius = (config.worldSize / 2) - 20 // Add 20 unit margin from edge
      // Keep generating random positions until we find one inside the circle with margin
      do {
        x = (Math.random() - 0.5) * config.worldSize
        y = (Math.random() - 0.5) * config.worldSize
        distance = Math.sqrt(x * x + y * y)
      } while (distance > maxRadius) // Only accept positions well within circular boundary
      
      game.orbs.push({
        id: i,
        x: x,
        y: y,
        massValue: config.orbMassValue,
        color: `hsl(${60 + Math.random() * 30}, 70%, 60%)` // Gold-ish colors
      })
    }
    
    // Initialize viruses (green spiky obstacles) - only spawn within circular boundary
    for (let i = 0; i < config.virusCount; i++) {
      let x, y, distance
      const maxRadius = (config.worldSize / 2) - 30 // Add 30 unit margin from edge for viruses
      // Keep generating random positions until we find one inside the circle with margin
      do {
        x = (Math.random() - 0.5) * config.worldSize
        y = (Math.random() - 0.5) * config.worldSize
        distance = Math.sqrt(x * x + y * y)
      } while (distance > maxRadius) // Only accept positions well within circular boundary
      
      game.viruses.push({
        id: i,
        x: x,
        y: y,
        radius: config.virusRadius,
        color: '#00ff41', // Bright green
        spikes: 4 + Math.floor(Math.random() * 2) // 4-5 spikes (50% fewer than 8-12)
      })
    }

    // Initialize bots with varying mass and net worth - only spawn within circular boundary
    for (let i = 0; i < config.botCount; i++) {
      const mass = config.startingMass + Math.random() * 15
      const netWorth = config.startingNetWorth + Math.random() * 200
      
      let x, y, distance
      const maxRadius = (config.worldSize / 2) - 25 // Add 25 unit margin from edge for bots
      // Keep generating random positions until we find one inside the circle with margin
      do {
        x = (Math.random() - 0.5) * config.worldSize
        y = (Math.random() - 0.5) * config.worldSize
        distance = Math.sqrt(x * x + y * y)
      } while (distance > maxRadius) // Only accept positions well within circular boundary
      
      game.bots.push({
        id: i,
        x: x,
        y: y,
        mass: mass,
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
    const getRadius = (mass) => Math.sqrt(mass) * config.massPerDollar
    
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
        const speed = config.baseSpeed / Math.pow(Math.max(game.player.mass, 1), 0.3) // Less aggressive decay (was sqrt = 0.5, now 0.3)
        game.player.x += game.player.dir.x * speed * deltaTime
        game.player.y += game.player.dir.y * speed * deltaTime
        
        // Circular world boundaries
        const worldRadius = config.worldSize / 2
        const distanceFromCenter = Math.sqrt(game.player.x * game.player.x + game.player.y * game.player.y)
        
        if (distanceFromCenter > worldRadius) {
          // Push player back inside the circle
          const angle = Math.atan2(game.player.y, game.player.x)
          game.player.x = Math.cos(angle) * worldRadius
          game.player.y = Math.sin(angle) * worldRadius
        }
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
        
        const speed = config.baseSpeed / Math.pow(Math.max(bot.mass, 1), 0.3) // Less aggressive decay (was sqrt = 0.5, now 0.3)
        bot.x += bot.dir.x * speed * deltaTime
        bot.y += bot.dir.y * speed * deltaTime
        
        // Circular world boundaries for bots
        const worldRadius = config.worldSize / 2
        const distanceFromCenter = Math.sqrt(bot.x * bot.x + bot.y * bot.y)
        
        if (distanceFromCenter > worldRadius) {
          // Push bot back inside the circle
          const angle = Math.atan2(bot.y, bot.x)
          bot.x = Math.cos(angle) * worldRadius
          bot.y = Math.sin(angle) * worldRadius
        }
      })

      // Orb pickup (mass only, no money)
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      
      for (let i = game.orbs.length - 1; i >= 0; i--) {
        const orb = game.orbs[i]
        
        for (const entity of allEntities) {
          const distance = getDistance(entity, orb)
          const baseRadius = getRadius(entity.mass) * 2.0 // Base visual scaling
          const visualRadius = entity === game.player ? baseRadius * 3.0 : baseRadius // Player 3x bigger
          
          if (distance <= visualRadius) {
            const oldMass = entity.mass
            entity.mass += config.orbMassValue
            
            // Add floating text for player (mass gained, not money)
            if (entity === game.player) {
              addFloatingText(`+${config.orbMassValue} mass`, entity.x, entity.y - 30, '#00ff88')
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

      // Virus collision detection
      for (const virus of game.viruses) {
        for (const entity of allEntities) {
          const distance = getDistance(entity, virus)
          const baseRadius = getRadius(entity.mass) * 2.0
          const visualRadius = entity === game.player ? baseRadius * 3.0 : baseRadius
          
          if (distance <= visualRadius + virus.radius) {
            // Check if entity is big enough to split when hitting virus
            if (entity.mass >= config.virusSplitThreshold) {
              // Split the player/bot into multiple smaller pieces based on mass
              const pieceSize = 100 + Math.random() * 20 // 100-120 mass per piece
              const numPieces = Math.max(2, Math.floor(entity.mass / pieceSize)) // At least 2 pieces
              
              if (entity === game.player) {
                addFloatingText(`💥 SPLIT INTO ${numPieces} PIECES!`, entity.x, entity.y - 40, '#ff0000')
                
                // Reduce mass significantly but keep net worth unchanged
                const newMass = entity.mass / numPieces
                // Keep net worth unchanged - no financial penalty
                
                entity.mass = newMass
                // entity.netWorth remains the same - no change to balance
                
                console.log(`Player split into ${numPieces} pieces, reduced to ${Math.floor(newMass)} mass but kept $${entity.netWorth} net worth`)
              } else {
                // Split bot (simplified version)
                entity.mass = entity.mass / 3
                entity.netWorth = Math.floor(entity.netWorth / 2) // Bots still get financial penalty
              }
            } else if (entity.mass <= config.virusHideThreshold) {
              // Small entities can hide inside virus (immunity mechanic)
              if (entity === game.player) {
                addFloatingText('🛡️ PROTECTED', entity.x, entity.y - 30, '#00ff88')
              }
            }
          }
        }
      }

      // PvP Combat (only if not in virus protection)
      if (game.player.alive) {
        for (const bot of game.bots) {
          if (!bot.alive) continue
          
          const distance = getDistance(game.player, bot)
          const basePlayerRadius = getRadius(game.player.mass) * 2.0
          const playerRadius = basePlayerRadius * 3.0 // Player 3x bigger
          const botRadius = getRadius(bot.mass) * 2.0 // Bot normal size
          
          if (distance < Math.max(playerRadius, botRadius)) {
            if (game.player.mass > bot.mass * 1.15) {
              // Player kills bot - gain money and some mass
              const bountyMultiplier = bot.isBounty ? 1.5 : 1.0
              const killReward = Math.floor(config.killReward * bountyMultiplier)
              
              game.player.netWorth += killReward
              game.player.mass += bot.mass * 0.3 // Gain some mass from kill
              game.player.kills += 1
              game.player.streak += 1
              game.player.cashBadgeScale = 1.3
              
              bot.alive = false
              
              // Add floating text
              const bountyText = bot.isBounty ? ` Bounty!` : ''
              addFloatingText(`+$${killReward}${bountyText}`, game.player.x, game.player.y - 50, '#ff4444')
              
              // Add to kill feed
              addToKillFeed(`You eliminated ${bot.name} (+$${killReward}${bountyText})`)
              
            } else if (bot.mass > game.player.mass * 1.15) {
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
          const radiusA = getRadius(game.bots[i].mass) * 2.0 // Use visual scaling
          const radiusB = getRadius(game.bots[j].mass) * 2.0 // Use visual scaling
          
          if (distance < Math.max(radiusA, radiusB)) {
            if (game.bots[i].mass > game.bots[j].mass * 1.15) {
              game.bots[i].netWorth += config.killReward
              game.bots[i].mass += game.bots[j].mass * 0.3
              game.bots[i].kills += 1
              game.bots[i].streak += 1
              game.bots[j].alive = false
              game.bots[j].deaths += 1
              game.bots[j].streak = 0
            } else if (game.bots[j].mass > game.bots[i].mass * 1.15) {
              game.bots[j].netWorth += config.killReward
              game.bots[j].mass += game.bots[i].mass * 0.3
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
        
        // Keep camera zoom constant - much more zoomed in
        // This way players can see their character actually growing bigger
        const targetZoom = 1.2 // Much more zoomed in fixed level
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

      // Update live leaderboard
      const leaderboardData = allAlive.map((player, index) => ({
        rank: index + 1,
        name: player.name,
        netWorth: Math.floor(player.netWorth),
        isPlayer: player === game.player,
        isBounty: player.isBounty || false
      }))
      
      setLeaderboard(leaderboardData)

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
      
      // Draw red out-of-bounds area (everything outside the circle)
      const playableRadius = config.worldSize / 2
      
      // Get visible world bounds for efficient rendering
      const viewWidth = canvas.width / game.camera.zoom
      const viewHeight = canvas.height / game.camera.zoom
      const left = game.camera.x - viewWidth / 2
      const right = game.camera.x + viewWidth / 2
      const top = game.camera.y - viewHeight / 2
      const bottom = game.camera.y + viewHeight / 2
      
      // Draw red background everywhere first
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)' // Semi-transparent red
      ctx.fillRect(left, top, viewWidth, viewHeight)
      
      // Cut out the playable area (create a "hole" in the red)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(0, 0, playableRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over' // Reset blend mode
      
      // Draw world border (red circle)
      const borderRadius = config.worldSize / 2
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 8
      ctx.setLineDash([20, 10]) // Dashed line pattern
      ctx.beginPath()
      ctx.arc(0, 0, borderRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([]) // Reset line dash
      
      // Draw orbs - bigger like original Agario
      game.orbs.forEach(orb => {
        ctx.fillStyle = orb.color
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, 12, 0, Math.PI * 2) // Bigger orbs
        ctx.fill()
        
        // Dollar sign
        ctx.fillStyle = '#000000'
        ctx.font = '14px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('$', orb.x, orb.y + 4)
      })
      
      // Draw viruses (green spiky obstacles)
      game.viruses.forEach(virus => {
        const spikeLength = virus.radius * 0.6
        const spikeCount = virus.spikes
        
        // Draw virus body (green circle)
        ctx.fillStyle = virus.color
        ctx.beginPath()
        ctx.arc(virus.x, virus.y, virus.radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Draw darker green border
        ctx.strokeStyle = '#00cc33'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(virus.x, virus.y, virus.radius, 0, Math.PI * 2)
        ctx.stroke()
        
        // Draw spikes
        ctx.strokeStyle = '#00aa22'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        
        for (let i = 0; i < spikeCount; i++) {
          const angle = (i / spikeCount) * Math.PI * 2
          const startX = virus.x + Math.cos(angle) * virus.radius
          const startY = virus.y + Math.sin(angle) * virus.radius
          const endX = virus.x + Math.cos(angle) * (virus.radius + spikeLength)
          const endY = virus.y + Math.sin(angle) * (virus.radius + spikeLength)
          
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
          ctx.stroke()
        }
      })
      
      // Draw entities (sorted by net worth)
      const allEntities = [game.player, ...game.bots].filter(e => e.alive)
      allEntities.sort((a, b) => a.netWorth - b.netWorth)
      
      allEntities.forEach(entity => {
        const baseRadius = getRadius(entity.mass) * 2.0 // Base size like original Agario
        const radius = entity === game.player ? baseRadius * 3.0 : baseRadius // Player 3x bigger
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
        const baseRadius = getRadius(game.player.mass) * 2.0
        const radius = baseRadius * 3.0 + 20 // Match player's 3x bigger size
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
    setLeaderboard([])
    setShowControls(true) // Show controls again on restart
    setIsCashingOut(false)
    setCashOutProgress(0)
    if (gameRef.current) {
      gameRef.current.cleanup()
    }
    setTimeout(() => {
      initializeGame()
      // Hide controls after 5 seconds on restart
      setTimeout(() => {
        setShowControls(false)
      }, 5000)
    }, 100)
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

      {/* Live Leaderboard (All Players) */}
      {!isGameOver && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30 max-w-[280px]">
          <div className="text-cyan-400 font-bold text-lg mb-3">💰 Live Leaderboard</div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {leaderboard.slice(0, 5).map((player) => (
              <div 
                key={`${player.rank}-${player.name}`}
                className={`flex justify-between items-center py-1 px-2 rounded text-sm ${
                  player.isPlayer 
                    ? 'bg-cyan-600/30 border border-cyan-400/50' 
                    : 'hover:bg-gray-800/30'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`font-bold w-6 text-center ${
                    player.rank === 1 ? 'text-yellow-400' : 
                    player.rank === 2 ? 'text-gray-300' : 
                    player.rank === 3 ? 'text-orange-400' : 'text-gray-400'
                  }`}>
                    #{player.rank}
                  </span>
                  <span className={`${player.isPlayer ? 'text-cyan-400 font-bold' : 'text-white'}`}>
                    {player.name}
                  </span>
                  {player.isBounty && <span className="text-yellow-400">👑</span>}
                </div>
                <span className="text-green-400 font-bold">
                  ${player.netWorth}
                </span>
              </div>
            ))}
          </div>
          
          {/* Live Player Count */}
          {leaderboard.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600/30">
              <div className="text-center text-gray-300 text-sm">
                <span className="text-cyan-400 font-bold">{leaderboard.length}</span> players in game
              </div>
            </div>
          )}
          
          {leaderboard.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-2">
              No players in game
            </div>
          )}
        </div>
      )}

      {/* Kill Feed */}
      {killFeed.length > 0 && !isGameOver && settings.showKillFeed && (
        <div className="absolute bottom-16 left-4 space-y-2 max-w-[400px]">
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
      {!isGameOver && gameRef.current?.game && settings.showMinimap && (
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
                
                // Scale factor (updated for expanded world size - 3750)
                const worldSize = 3750 // Updated to match 25% increase (was 3000, now 3750)
                const scale = 128 / worldSize
                
                // Draw world border on minimap (red circle)
                const centerX = 64 // center of 128x128 minimap
                const centerY = 64
                const worldRadius = (worldSize / 2) * scale
                ctx.strokeStyle = '#ff0000'
                ctx.lineWidth = 2
                ctx.setLineDash([4, 2]) // Smaller dashed pattern for minimap
                ctx.beginPath()
                ctx.arc(centerX, centerY, worldRadius, 0, Math.PI * 2)
                ctx.stroke()
                ctx.setLineDash([]) // Reset line dash
                
                // Draw players
                const allPlayers = [game.player, ...game.bots].filter(p => p.alive)
                allPlayers.forEach(player => {
                  const x = (player.x + worldSize / 2) * scale // offset by half world
                  const y = (player.y + worldSize / 2) * scale
                  
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
                
                // Draw viruses on minimap
                game.viruses.forEach(virus => {
                  const x = (virus.x + worldSize / 2) * scale
                  const y = (virus.y + worldSize / 2) * scale
                  
                  ctx.fillStyle = '#00ff41' // Bright green
                  ctx.fillRect(x - 2, y - 2, 4, 4)
                  
                  // Add small border to make them more visible
                  ctx.strokeStyle = '#00aa22'
                  ctx.lineWidth = 1
                  ctx.strokeRect(x - 2, y - 2, 4, 4)
                })
              }
            }}
          />
        </div>
      )}

      {/* Cash Out Button */}
      {!isGameOver && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
          <button
            onMouseDown={startCashOut}
            onMouseUp={cancelCashOut}
            onMouseLeave={cancelCashOut}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              isCashingOut 
                ? 'bg-green-600 text-white' 
                : 'bg-yellow-500 hover:bg-yellow-400 text-black'
            }`}
            disabled={!gameRef.current?.game?.player?.alive}
          >
            {isCashingOut 
              ? `Cashing Out... ${Math.floor(cashOutProgress)}%` 
              : `💰 Hold E to Cash Out ($${gameStats.netWorth})`
            }
          </button>
        </div>
      )}

      {/* Controls */}
      {!isGameOver && showControls && settings.showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30">
          <div className="text-xs text-gray-300 text-center space-y-1">
            <div>🖱️ Move mouse to control • 💰 Collect orbs for growth</div>
            <div>⚔️ Eliminate smaller players • 💵 Only kills give money</div>
            <div>👑 Bounty players give bonus rewards</div>
          </div>
        </div>
      )}
      
      {/* Live Ping Monitor */}
      {!isGameOver && settings.showPingMonitor && (
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-gray-600/30">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 rounded-full animate-pulse bg-green-400"></div>
            <span className="text-gray-300">Ping:</span>
            <span className={`font-bold ${
              ping < 50 ? 'text-green-400' : 
              ping < 100 ? 'text-yellow-400' : 
              ping < 200 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {ping}ms
            </span>
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