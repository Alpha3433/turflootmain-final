'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const AgarIOGame = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [cheatingBan, setCheatingBan] = useState(false)
  const [missionTime, setMissionTime] = useState(60)
  const [score, setScore] = useState(0)
  const [mass, setMass] = useState(20)
  const [eliminations, setEliminations] = useState(0)
  const [timeSurvived, setTimeSurvived] = useState(0)
  
  // Missions system
  const [currency, setCurrency] = useState(0) // Coins earned from missions
  const [completedMissions, setCompletedMissions] = useState([])
  const [activeMissions, setActiveMissions] = useState([])
  const [showMissionComplete, setShowMissionComplete] = useState(null)
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0) // For cycling through missions

  // Mission definitions
  const missionTypes = [
    { id: 'collect_coins_10', name: 'Coin Hunter I', description: 'Collect 10 coins', target: 10, reward: 50, icon: '🪙' },
    { id: 'collect_coins_25', name: 'Coin Hunter II', description: 'Collect 25 coins', target: 25, reward: 100, icon: '🪙' },
    { id: 'collect_coins_50', name: 'Coin Master', description: 'Collect 50 coins', target: 50, reward: 200, icon: '💰' },
    { id: 'reach_mass_50', name: 'Growing Strong', description: 'Reach 50 mass', target: 50, reward: 75, icon: '💪' },
    { id: 'reach_mass_100', name: 'Heavy Weight', description: 'Reach 100 mass', target: 100, reward: 150, icon: '🏋️' },
    { id: 'eliminate_1', name: 'First Blood', description: 'Eliminate 1 enemy', target: 1, reward: 100, icon: '⚔️' },
    { id: 'eliminate_3', name: 'Warrior', description: 'Eliminate 3 enemies', target: 3, reward: 250, icon: '🗡️' },
    { id: 'survive_60', name: 'Survivor', description: 'Survive for 60 seconds', target: 60, reward: 100, icon: '⏰' },
    { id: 'survive_120', name: 'Endurance', description: 'Survive for 120 seconds', target: 120, reward: 200, icon: '🕐' }
  ]

  // Mission progress tracking
  const updateMissionProgress = (type, value) => {
    setActiveMissions(prev => prev.map(mission => {
      if (mission.completed) return mission

      let newProgress = mission.progress
      let shouldComplete = false

      switch (type) {
        case 'coin_collected':
          if (mission.id.includes('collect_coins')) {
            newProgress = Math.min(mission.progress + value, mission.target)
            shouldComplete = newProgress >= mission.target
          }
          break
        case 'mass_reached':
          if (mission.id.includes('reach_mass')) {
            newProgress = Math.max(mission.progress, value)
            shouldComplete = newProgress >= mission.target
          }
          break
        case 'elimination':
          if (mission.id.includes('eliminate')) {
            newProgress = Math.min(mission.progress + value, mission.target)
            shouldComplete = newProgress >= mission.target
          }
          break
        case 'survival_time':
          if (mission.id.includes('survive')) {
            newProgress = value
            shouldComplete = newProgress >= mission.target
          }
          break
      }

      if (shouldComplete && !mission.completed) {
        // Complete mission
        setCurrency(prev => prev + mission.reward)
        setShowMissionComplete(mission)
        setTimeout(() => setShowMissionComplete(null), 3000)
        return { ...mission, progress: newProgress, completed: true }
      }

      return { ...mission, progress: newProgress }
    }))
  }

  // Initialize missions when game starts
  useEffect(() => {
    if (gameStarted && activeMissions.length === 0) {
      // Assign 3 random missions when game starts
      const shuffled = [...missionTypes].sort(() => 0.5 - Math.random())
      const selectedMissions = shuffled.slice(0, 3).map(mission => ({
        ...mission,
        progress: 0,
        completed: false
      }))
      setActiveMissions(selectedMissions)
    }
  }, [gameStarted])

  // Cycle through missions every 4 seconds
  useEffect(() => {
    if (activeMissions.length > 0) {
      const interval = setInterval(() => {
        setCurrentMissionIndex(prev => (prev + 1) % activeMissions.length)
      }, 4000) // Change mission every 4 seconds
      
      return () => clearInterval(interval)
    }
  }, [activeMissions.length])
  
  // Cash out state
  const [cashOutProgress, setCashOutProgress] = useState(0)
  const [isCashingOut, setIsCashingOut] = useState(false)
  const [cashOutComplete, setCashOutComplete] = useState(false)
  
  // Minimap state for real-time updates
  const [minimapData, setMinimapData] = useState({
    playerX: 2000,
    playerY: 2000,
    enemies: [],
    coins: [],
    viruses: []
  })

  // Game Engine Class
  class GameEngine {
    constructor(canvas, setCheatingBan, setTimeSurvived, selectedSkin, gameStates) {
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.world = { width: 4000, height: 4000 }
      this.camera = { x: 0, y: 0 }
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 }
      this.setCheatingBan = setCheatingBan // Store the function reference
      this.setTimeSurvived = setTimeSurvived // Store the function reference
      this.selectedSkin = selectedSkin || { id: 'default', name: 'Default Warrior', color: '#4A90E2' } // Store selected skin
      this.gameStates = gameStates || {} // Store game states (cashOutComplete, gameOver)
      
      // Dynamic zone system for cash games
      this.isCashGame = this.detectCashGame()
      this.realPlayerCount = this.isCashGame ? this.getRealPlayerCount() : 8 // Mock 8 for practice
      this.basePlayableRadius = 800 // Minimum zone for 2 players
      this.maxPlayableRadius = 1800 // Maximum zone for full lobby
      this.currentPlayableRadius = this.calculatePlayableRadius()
      this.targetPlayableRadius = this.currentPlayableRadius
      this.zoneTransitionSpeed = 50 // Pixels per second zone change
      this.lastPlayerCountCheck = Date.now()
      
      // Game objects
      this.player = {
        x: this.world.width / 2,
        y: this.world.height / 2,
        mass: 20,
        radius: 25,
        color: this.selectedSkin.color, // Use selected skin color instead of hardcoded blue
        name: 'You',
        speed: 2,
        targetX: this.world.width / 2,
        targetY: this.world.height / 2,
        spawnProtection: true,
        spawnProtectionTime: 4000, // 4 seconds in milliseconds
        spawnProtectionStart: Date.now()
      }
      
      this.coins = []
      this.enemies = []
      this.viruses = []
      this.running = false
      this.lastUpdate = Date.now()
      this.gameStartTime = null // Track when game starts
      this.timeSurvivedSeconds = 0
      
      // Anti-cheat system
      this.antiCheat = {
        enabled: this.isCashGame, // Only active for cash games
        violations: 0,
        maxViolations: 3, // Changed from 5 to 3 strikes
        banned: false,
        
        // Movement validation
        lastPosition: { x: this.player.x, y: this.player.y, timestamp: Date.now() },
        maxSpeed: 6, // Maximum pixels per frame at minimum mass - reduced from 8 to 6
        speedViolations: 0,
        
        // Input monitoring
        mouseMovements: [],
        clickPattern: [],
        keyPresses: [],
        lastInputTime: Date.now(),
        humanLikeThreshold: 0.7,
        
        // Behavioral analysis
        massGainRate: [],
        eliminationPattern: [],
        survivalTime: Date.now(),
        suspiciousActions: 0,
        
        // Network monitoring
        actionQueue: [],
        lastActionTime: Date.now(),
        actionRateLimit: 60, // Max actions per second
        
        // Memory protection
        gameStateHash: '',
        integrityChecks: 0,
        
        // Pattern detection
        botLikeScore: 0,
        humanScore: 100
      }
      
      this.generateCoins()
      this.generateEnemies()
      this.generateViruses()
      this.bindEvents()
      this.initAntiCheat()
      
      console.log(`🎯 Game initialized - Cash game: ${this.isCashGame}, Player count: ${this.realPlayerCount}, Zone radius: ${this.currentPlayableRadius}`)
      console.log(`🛡️ Anti-cheat system: ${this.antiCheat.enabled ? 'ENABLED' : 'DISABLED'}`)
    }

    detectCashGame() {
      // Check URL parameters to determine if this is a cash game
      const urlParams = new URLSearchParams(window.location.search)
      const fee = urlParams.get('fee')
      const mode = urlParams.get('mode')
      
      // Cash games have fee > 0 and mode !== 'local' and mode !== 'practice'
      return fee && parseFloat(fee) > 0 && mode !== 'local' && mode !== 'practice'
    }

    getRealPlayerCount() {
      // In a real implementation, this would fetch actual player count from server
      // For now, simulate varying player counts based on fee tier
      const urlParams = new URLSearchParams(window.location.search)
      const fee = parseFloat(urlParams.get('fee') || 0)
      
      if (fee === 1) return Math.floor(Math.random() * 8) + 2 // 2-10 players
      if (fee === 5) return Math.floor(Math.random() * 12) + 4 // 4-16 players  
      if (fee === 20) return Math.floor(Math.random() * 16) + 6 // 6-22 players
      
      return 8 // Default for practice
    }

    calculatePlayableRadius() {
      if (!this.isCashGame) {
        return 1800 // Fixed size for practice games
      }
      
      // Dynamic scaling for cash games
      const minPlayers = 2
      const maxPlayers = 24
      const playerCount = Math.max(minPlayers, Math.min(maxPlayers, this.realPlayerCount))
      
      // Calculate radius based on player count (more players = bigger zone)
      const playerRatio = (playerCount - minPlayers) / (maxPlayers - minPlayers)
      const radiusDiff = this.maxPlayableRadius - this.basePlayableRadius
      
      return Math.floor(this.basePlayableRadius + (radiusDiff * playerRatio))
    }

    updateDynamicZone(deltaTime) {
      if (!this.isCashGame) return
      
      // Check for player count updates every 5 seconds
      const now = Date.now()
      if (now - this.lastPlayerCountCheck > 5000) {
        const newPlayerCount = this.getRealPlayerCount()
        if (newPlayerCount !== this.realPlayerCount) {
          console.log(`🔄 Player count changed: ${this.realPlayerCount} → ${newPlayerCount}`)
          this.realPlayerCount = newPlayerCount
          this.targetPlayableRadius = this.calculatePlayableRadius()
          console.log(`🎯 Zone target changed: ${this.currentPlayableRadius} → ${this.targetPlayableRadius}`)
        }
        this.lastPlayerCountCheck = now
      }
      
      // Smoothly transition zone size
      if (Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        const direction = this.targetPlayableRadius > this.currentPlayableRadius ? 1 : -1
        const change = this.zoneTransitionSpeed * deltaTime * direction
        this.currentPlayableRadius += change
        
        // Prevent overshooting
        if (direction > 0 && this.currentPlayableRadius > this.targetPlayableRadius) {
          this.currentPlayableRadius = this.targetPlayableRadius
        } else if (direction < 0 && this.currentPlayableRadius < this.targetPlayableRadius) {
          this.currentPlayableRadius = this.targetPlayableRadius
        }
        
        console.log(`🔄 Zone transitioning: ${Math.floor(this.currentPlayableRadius)}px`)
      }
    }

    // === ANTI-CHEAT SYSTEM ===
    
    initAntiCheat() {
      if (!this.antiCheat.enabled) return
      
      console.log('🛡️ Initializing comprehensive anti-cheat system...')
      
      // Override critical functions to detect tampering
      this.protectCriticalFunctions()
      
      // Start periodic integrity checks
      this.startIntegrityMonitoring()
      
      // Enhanced input monitoring
      this.enhanceInputMonitoring()
      
      // Performance profiling to detect automation
      this.startPerformanceProfiling()
      
      console.log('🛡️ Anti-cheat system fully initialized')
    }
    
    protectCriticalFunctions() {
      // Store original function references
      const originalConsoleLog = console.log
      const originalSetInterval = setInterval
      const originalRequestAnimationFrame = requestAnimationFrame
      
      // Monitor console usage (bots often use excessive logging)
      let consoleCallCount = 0
      console.log = (...args) => {
        consoleCallCount++
        if (consoleCallCount > 100) { // Excessive console usage
          this.recordViolation('EXCESSIVE_CONSOLE_USAGE', 'High console.log usage detected')
        }
        return originalConsoleLog.apply(console, args)
      }
      
      // Detect memory manipulation attempts
      this.protectGameVariables()
    }
    
    protectGameVariables() {
      const self = this
      
      // Protect player mass
      let _mass = this.player.mass
      Object.defineProperty(this.player, 'mass', {
        get() { return _mass },
        set(value) {
          const oldMass = _mass
          _mass = value
          
          // Validate mass changes
          if (value > oldMass * 2) { // Suspicious mass jump
            self.recordViolation('SUSPICIOUS_MASS_CHANGE', `Mass jumped from ${oldMass} to ${value}`)
          }
          if (value < 0) { // Invalid mass
            self.recordViolation('INVALID_MASS_VALUE', `Negative mass: ${value}`)
            _mass = 20 // Reset to default
          }
        }
      })
      
      // Protect player position
      this.lastValidPosition = { x: this.player.x, y: this.player.y }
    }
    
    startIntegrityMonitoring() {
      setInterval(() => {
        if (!this.antiCheat.enabled || this.antiCheat.banned) return
        
        // Check game state integrity
        this.validateGameState()
        
        // Analyze behavioral patterns
        this.analyzePlayerBehavior()
        
        // Check for automation patterns
        this.detectAutomation()
        
        // Monitor network patterns
        this.analyzeNetworkPatterns()
        
        this.antiCheat.integrityChecks++
      }, 2000) // Check every 2 seconds
    }
    
    enhanceInputMonitoring() {
      // Track mouse movement patterns
      document.addEventListener('mousemove', (e) => {
        if (!this.antiCheat.enabled) return
        
        const now = Date.now()
        this.antiCheat.mouseMovements.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: now,
          deltaTime: now - this.antiCheat.lastInputTime
        })
        
        // Keep only last 100 movements
        if (this.antiCheat.mouseMovements.length > 100) {
          this.antiCheat.mouseMovements.shift()
        }
        
        this.antiCheat.lastInputTime = now
        this.analyzeMousePattern()
      })
      
      // Track click patterns
      document.addEventListener('click', (e) => {
        if (!this.antiCheat.enabled) return
        
        this.antiCheat.clickPattern.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now(),
          button: e.button
        })
        
        if (this.antiCheat.clickPattern.length > 50) {
          this.antiCheat.clickPattern.shift()
        }
      })
      
      // Track keyboard patterns
      document.addEventListener('keydown', (e) => {
        if (!this.antiCheat.enabled) return
        
        this.antiCheat.keyPresses.push({
          key: e.key,
          timestamp: Date.now(),
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey
        })
        
        if (this.antiCheat.keyPresses.length > 100) {
          this.antiCheat.keyPresses.shift()
        }
        
        // Detect suspicious key combinations
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          this.recordViolation('DEV_TOOLS_ATTEMPT', 'Developer tools access attempted')
        }
      })
    }
    
    startPerformanceProfiling() {
      // Monitor frame timing consistency
      let lastFrameTime = performance.now()
      const frameTimes = []
      
      const checkFrameRate = () => {
        const currentTime = performance.now()
        const deltaTime = currentTime - lastFrameTime
        frameTimes.push(deltaTime)
        
        if (frameTimes.length > 60) { // Check last 60 frames
          frameTimes.shift()
          
          // Detect too-consistent frame timing (indicates automation)
          const variance = this.calculateVariance(frameTimes)
          if (variance < 0.1) { // Too consistent
            this.recordViolation('AUTOMATED_TIMING', `Frame timing too consistent: ${variance}`)
          }
        }
        
        lastFrameTime = currentTime
        if (this.running && this.antiCheat.enabled) {
          requestAnimationFrame(checkFrameRate)
        }
      }
      
      if (this.antiCheat.enabled) {
        requestAnimationFrame(checkFrameRate)
      }
    }
    
    validateGameState() {
      // Check for impossible game states
      if (this.player.mass < 0) {
        this.recordViolation('INVALID_GAME_STATE', 'Negative player mass')
        this.player.mass = 20
      }
      
      if (this.player.radius > this.player.mass * 10) {
        this.recordViolation('INVALID_GAME_STATE', 'Radius-mass ratio violation')
      }
      
      // Check position bounds
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const distance = Math.sqrt(Math.pow(this.player.x - centerX, 2) + Math.pow(this.player.y - centerY, 2))
      
      if (distance > this.currentPlayableRadius + 100) {
        this.recordViolation('POSITION_VIOLATION', 'Player outside valid boundaries')
        // Teleport back to safe zone
        this.player.x = centerX
        this.player.y = centerY
      }
    }
    
    analyzePlayerBehavior() {
      const now = Date.now()
      
      // Track mass gain rate
      this.antiCheat.massGainRate.push({
        mass: this.player.mass,
        timestamp: now
      })
      
      if (this.antiCheat.massGainRate.length > 10) {
        this.antiCheat.massGainRate.shift()
        
        // Check for impossible mass gain
        const oldest = this.antiCheat.massGainRate[0]
        const newest = this.antiCheat.massGainRate[this.antiCheat.massGainRate.length - 1]
        const timeDiff = (newest.timestamp - oldest.timestamp) / 1000 // seconds
        const massGain = newest.mass - oldest.mass
        
        if (massGain > 100 && timeDiff < 5) { // Gained 100+ mass in under 5 seconds
          this.recordViolation('IMPOSSIBLE_MASS_GAIN', `Gained ${massGain} mass in ${timeDiff}s`)
        }
      }
    }
    
    detectAutomation() {
      if (this.antiCheat.mouseMovements.length < 20) return
      
      // Analyze mouse movement patterns
      const movements = this.antiCheat.mouseMovements.slice(-20)
      
      // Check for too-perfect circular movements (common in bots)
      let circularScore = 0
      for (let i = 2; i < movements.length; i++) {
        const prev = movements[i-2]
        const curr = movements[i-1]
        const next = movements[i]
        
        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
        const angleDiff = Math.abs(angle1 - angle2)
        
        if (angleDiff < 0.1) circularScore++ // Very small angle changes
      }
      
      if (circularScore > 15) { // Too many perfect movements
        this.recordViolation('AUTOMATED_MOVEMENT', `Robotic movement pattern detected: ${circularScore}/18`)
        this.antiCheat.botLikeScore += 10
      }
      
      // Check for inhuman reaction times
      const reactionTimes = []
      for (let i = 1; i < movements.length; i++) {
        reactionTimes.push(movements[i].deltaTime)
      }
      
      const avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      if (avgReactionTime < 10) { // Less than 10ms average - impossible for humans
        this.recordViolation('INHUMAN_REACTION_TIME', `Average reaction time: ${avgReactionTime}ms`)
        this.antiCheat.botLikeScore += 15
      }
    }
    
    analyzeNetworkPatterns() {
      // Monitor action frequency
      const now = Date.now()
      const recentActions = this.antiCheat.actionQueue.filter(action => 
        now - action.timestamp < 1000 // Last second
      )
      
      if (recentActions.length > this.antiCheat.actionRateLimit) {
        this.recordViolation('RATE_LIMIT_EXCEEDED', `${recentActions.length} actions per second`)
      }
    }
    
    analyzeMousePattern() {
      if (this.antiCheat.mouseMovements.length < 10) return
      
      const recent = this.antiCheat.mouseMovements.slice(-10)
      
      // Check for linear movement patterns (bot-like)
      let linearityScore = 0
      for (let i = 2; i < recent.length; i++) {
        const p1 = recent[i-2]
        const p2 = recent[i-1]
        const p3 = recent[i]
        
        // Calculate if points are nearly collinear
        const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y))
        if (area < 5) linearityScore++ // Points are very close to a straight line
      }
      
      if (linearityScore > 6) { // Too many linear movements
        this.recordViolation('LINEAR_MOVEMENT_PATTERN', `Bot-like linear movement: ${linearityScore}/8`)
      }
    }
    
    recordViolation(type, description) {
      this.antiCheat.violations++
      this.antiCheat.suspiciousActions++
      
      console.warn(`🚨 ANTI-CHEAT VIOLATION [${this.antiCheat.violations}/${this.antiCheat.maxViolations}]: ${type} - ${description}`)
      
      // Log violation for server reporting
      this.reportViolation(type, description)
      
      // Immediate ban after 3 strikes (no progressive penalties)
      if (this.antiCheat.violations >= this.antiCheat.maxViolations) {
        this.banPlayer()
      }
    }
    
    banPlayer() {
      this.antiCheat.banned = true
      this.running = false
      
      console.error('🔒 PLAYER BANNED: Multiple anti-cheat violations detected')
      
      // Trigger the cheating ban modal
      if (this.setCheatingBan) {
        this.setCheatingBan(true)
      } else {
        // Fallback if state setter is not available
        alert('⚠️ ACCOUNT SUSPENDED\n\nMultiple violations of fair play policies detected.\nContact support if you believe this is an error.')
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      }
    }
    
    reportViolation(type, description) {
      // In a real implementation, this would send to server
      const violationData = {
        type,
        description,
        timestamp: Date.now(),
        playerData: {
          mass: this.player.mass,
          position: { x: this.player.x, y: this.player.y },
          violations: this.antiCheat.violations
        },
        gameData: {
          isCashGame: this.isCashGame,
          roomId: new URLSearchParams(window.location.search).get('roomId')
        }
      }
      
      console.log('📊 Violation report:', violationData)
      // TODO: Send to backend API for logging and analysis
    }
    
    calculateVariance(numbers) {
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
      const squareDiffs = numbers.map(n => Math.pow(n - mean, 2))
      return squareDiffs.reduce((a, b) => a + b, 0) / numbers.length
    }
    
    // === END ANTI-CHEAT SYSTEM ===

    generateCoins() {
      this.coins = []
      const centerX = this.world.width / 2  // 2000
      const centerY = this.world.height / 2 // 2000
      const playableRadius = this.currentPlayableRadius
      
      for (let i = 0; i < 1000; i++) { // Increased to 1000 coins to match Agar.io food density
        let x, y, distance
        
        // Keep generating random positions until we get one inside the circular boundary
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 20) // 20px buffer from edge
        
        this.coins.push({
          x: x,
          y: y,
          radius: 8,
          value: 5, // Increased from 1 to 5 for better mass gain
          color: '#FFD700'
        })
      }
      
      console.log(`🪙 Generated ${this.coins.length} coins within radius ${Math.floor(playableRadius)}px`)
    }

    generateEnemies() {
      this.enemies = []
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      for (let i = 0; i < 8; i++) {
        const mass = 15 + Math.random() * 40
        let x, y, distance
        
        // Generate enemy within the playable radius
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 50) // 50px buffer from edge
        
        this.enemies.push({
          x: x,
          y: y,
          mass: mass,
          radius: Math.sqrt(mass) * 3,
          color: colors[i % colors.length],
          name: `Player ${i + 2}`,
          speed: Math.max(0.2, 35 / Math.sqrt(mass)), // Reduced from 50 to 35 to match player speed
          targetX: Math.random() * this.world.width,
          targetY: Math.random() * this.world.height,
          lastTargetChange: Date.now(),
          spawnProtection: true,
          spawnProtectionTime: 4000, // 4 seconds in milliseconds
          spawnProtectionStart: Date.now() + (i * 200) // Stagger spawn times slightly
        })
      }
      
      console.log(`👥 Generated ${this.enemies.length} enemies within radius ${Math.floor(playableRadius)}px`)
    }

    generateViruses() {
      this.viruses = []
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      for (let i = 0; i < 6; i++) {
        let x, y, distance
        
        // Generate virus within the playable radius
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 100) // 100px buffer from edge for viruses
        
        this.viruses.push({
          x: x,
          y: y,
          radius: 40 + Math.random() * 20,
          color: '#00FF41',
          spikes: 12,
          mass: 100
        })
      }
      
      console.log(`🦠 Generated ${this.viruses.length} viruses within radius ${Math.floor(playableRadius)}px`)
    }

    bindEvents() {
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - rect.left
        this.mouse.y = e.clientY - rect.top
        
        // Convert to world coordinates
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.y + this.camera.y
        
        this.player.targetX = this.mouse.worldX
        this.player.targetY = this.mouse.worldY
      })

      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const touch = e.touches[0]
        this.mouse.x = touch.clientX - rect.left
        this.mouse.y = touch.clientY - rect.top
        
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.y + this.camera.y
        
        this.player.targetX = this.mouse.worldX
        this.player.targetY = this.mouse.worldY
      }, { passive: false })
    }

    update() {
      if (!this.running) return
      
      const now = Date.now()
      const deltaTime = (now - this.lastUpdate) / 1000
      this.lastUpdate = now

      // Update player
      this.updatePlayer(deltaTime)
      
      // Update dynamic zone for cash games
      this.updateDynamicZone(deltaTime / 1000) // Convert to seconds
      
      // Update spawn protection timers
      this.updateSpawnProtection()
      
      // Update enemies
      this.enemies.forEach(enemy => this.updateEnemy(enemy, deltaTime))
      
      // Check collisions
      this.checkCollisions()
      
      // Update camera
      this.updateCamera()
      
      // Maintain coin count
      while (this.coins.length < 1000) { // Increased to 1000 to match Agar.io food density
        const centerX = this.world.width / 2  // 2000
        const centerY = this.world.height / 2 // 2000
        const playableRadius = 1800 // Same as boundary radius
        
        let x, y, distance
        
        // Keep generating random positions until we get one inside the circular boundary
        do {
          x = Math.random() * this.world.width
          y = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        } while (distance > playableRadius - 20) // 20px buffer from edge
        
        this.coins.push({
          x: x,
          y: y,
          radius: 8,
          color: '#FFD700',
          value: 5 // Increased from 1 to 5 for better mass gain
        })
      }
    }

    updatePlayer(deltaTime) {
      // Store previous position for anti-cheat validation
      const prevX = this.player.x
      const prevY = this.player.y
      const now = Date.now()
      
      const dx = this.player.targetX - this.player.x
      const dy = this.player.targetY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const speed = Math.max(0.2, 35 / Math.sqrt(this.player.mass)) // Reduced from 50 to 35 for slower, more controlled movement
        const moveX = (dx / distance) * speed * 60 * deltaTime
        const moveY = (dy / distance) * speed * 60 * deltaTime
        
        // Add movement smoothing to reduce choppy motion
        const smoothingFactor = 0.8 // Higher value = more smoothing
        const smoothMoveX = moveX * smoothingFactor
        const smoothMoveY = moveY * smoothingFactor
        
        // Anti-cheat: Validate movement speed
        if (this.antiCheat.enabled) {
          const proposedX = this.player.x + smoothMoveX
          const proposedY = this.player.y + smoothMoveY
          const actualDistance = Math.sqrt(Math.pow(proposedX - prevX, 2) + Math.pow(proposedY - prevY, 2))
          const timeDelta = now - this.antiCheat.lastPosition.timestamp
          const maxAllowedDistance = this.antiCheat.maxSpeed * (timeDelta / 16.67) // Normalize to 60fps
          
          if (actualDistance > maxAllowedDistance && timeDelta < 1000) { // Ignore if too much time passed
            this.recordViolation('SPEED_HACK', `Movement too fast: ${actualDistance.toFixed(2)} > ${maxAllowedDistance.toFixed(2)}`)
            // Limit the movement
            const ratio = maxAllowedDistance / actualDistance
            this.player.x += smoothMoveX * ratio
            this.player.y += smoothMoveY * ratio
          } else {
            this.player.x += smoothMoveX
            this.player.y += smoothMoveY
          }
          
          // Update anti-cheat position tracking
          this.antiCheat.lastPosition = {
            x: this.player.x,
            y: this.player.y,
            timestamp: now
          }
          
          // Track action for rate limiting
          this.antiCheat.actionQueue.push({
            type: 'movement',
            timestamp: now
          })
        } else {
          this.player.x += smoothMoveX
          this.player.y += smoothMoveY
        }
        
        // Circular boundary constraints (use dynamic radius)
        const centerX = this.world.width / 2
        const centerY = this.world.height / 2
        const playableRadius = this.currentPlayableRadius
        
        const distanceFromCenter = Math.sqrt(
          Math.pow(this.player.x - centerX, 2) + 
          Math.pow(this.player.y - centerY, 2)
        )
        
        if (distanceFromCenter + this.player.radius > playableRadius) {
          // Push player back inside circular boundary
          const angle = Math.atan2(this.player.y - centerY, this.player.x - centerX)
          const maxDistance = playableRadius - this.player.radius
          this.player.x = centerX + Math.cos(angle) * maxDistance
          this.player.y = centerY + Math.sin(angle) * maxDistance
          
          // Anti-cheat: Record boundary violation attempt
          if (this.antiCheat.enabled) {
            this.recordViolation('BOUNDARY_VIOLATION', `Attempted to move outside playable area`)
          }
        }
      }
      
      this.player.radius = Math.sqrt(this.player.mass) * 3
      
      // Anti-cheat: Validate radius-mass relationship
      if (this.antiCheat.enabled) {
        const expectedRadius = Math.sqrt(this.player.mass) * 3
        if (Math.abs(this.player.radius - expectedRadius) > 1) {
          this.recordViolation('RADIUS_MANIPULATION', `Invalid radius: ${this.player.radius} vs expected: ${expectedRadius}`)
          this.player.radius = expectedRadius // Force correct radius
        }
      }
    }

    updateEnemy(enemy, deltaTime) {
      const now = Date.now()
      
      if (now - enemy.lastTargetChange > 3000 + Math.random() * 2000) {
        enemy.targetX = Math.random() * this.world.width
        enemy.targetY = Math.random() * this.world.height
        enemy.lastTargetChange = now
      }
      
      const dx = enemy.targetX - enemy.x
      const dy = enemy.targetY - enemy.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const moveX = (dx / distance) * enemy.speed * 60 * deltaTime
        const moveY = (dy / distance) * enemy.speed * 60 * deltaTime
        
        // Add movement smoothing to enemies for more fluid motion
        const smoothingFactor = 0.7 // Slightly less smoothing than player for more varied movement
        const smoothMoveX = moveX * smoothingFactor
        const smoothMoveY = moveY * smoothingFactor
        
        enemy.x += smoothMoveX
        enemy.y += smoothMoveY
        
        enemy.x = Math.max(enemy.radius, Math.min(this.world.width - enemy.radius, enemy.x))
        enemy.y = Math.max(enemy.radius, Math.min(this.world.height - enemy.radius, enemy.y))
      }
    }

    updateSpawnProtection() {
      const now = Date.now()
      
      // Update player spawn protection
      if (this.player.spawnProtection) {
        if (now - this.player.spawnProtectionStart >= this.player.spawnProtectionTime) {
          this.player.spawnProtection = false
          console.log('Player spawn protection ended')
        }
      }
      
      // Update enemy spawn protection
      this.enemies.forEach(enemy => {
        if (enemy.spawnProtection) {
          if (now - enemy.spawnProtectionStart >= enemy.spawnProtectionTime) {
            enemy.spawnProtection = false
            console.log(`Enemy ${enemy.name} spawn protection ended`)
          }
        }
      })
    }

    checkCollisions() {
      // Player eating coins
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i]
        const dx = this.player.x - coin.x
        const dy = this.player.y - coin.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + coin.radius) {
          this.player.mass += coin.value
          setScore(prev => prev + coin.value)
          setMass(this.player.mass)
          this.coins.splice(i, 1)
          
          // Update mission progress for coin collection
          if (typeof updateMissionProgress === 'function') {
            updateMissionProgress('coin_collected', 1)
            updateMissionProgress('mass_reached', this.player.mass)
          }
        }
      }
      
      // Player vs viruses (authentic Agar.io mechanics)
      for (let i = this.viruses.length - 1; i >= 0; i--) {
        const virus = this.viruses[i]
        const dx = this.player.x - virus.x
        const dy = this.player.y - virus.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + virus.radius) {
          if (this.player.mass > virus.mass) {
            // Player is bigger than virus - split player into multiple pieces (authentic Agar.io)
            const splitCount = Math.min(4, Math.floor(this.player.mass / 40)) // More mass = more splits
            const pieceCount = Math.max(2, splitCount)
            const pieceMass = this.player.mass / pieceCount
            
            // Keep main player as one piece
            this.player.mass = pieceMass
            setMass(Math.floor(pieceMass))
            
            // Create additional player pieces (simplified - just reduce main player mass significantly)
            // In full implementation, this would create multiple controllable pieces
            this.player.mass = Math.max(20, this.player.mass * 0.4) // Much more severe penalty like real Agar.io
            
            // Eject player away from virus
            const ejectDistance = 80
            const ejectAngle = Math.atan2(dx, dy)
            this.player.x += Math.sin(ejectAngle) * ejectDistance
            this.player.y += Math.cos(ejectAngle) * ejectDistance
            
            // Remove the virus (consumed)
            this.viruses.splice(i, 1)
            
            // Spawn a new virus elsewhere to maintain count (within circular boundary)
            const centerX = this.world.width / 2  // 2000
            const centerY = this.world.height / 2 // 2000
            const playableRadius = 1800 // Same as boundary radius
            
            let newX, newY, newDistance
            
            // Keep generating random positions until we get one inside the circular boundary
            do {
              newX = Math.random() * this.world.width
              newY = Math.random() * this.world.height
              newDistance = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2))
            } while (newDistance > playableRadius - 50) // 50px buffer from edge
            
            this.viruses.push({
              x: newX,
              y: newY,
              radius: 35,
              color: '#00FF41',
              spikes: 12,
              mass: 100
            })
            
          } else {
            // Player is smaller - can hide behind virus (no collision with small players)
            // This allows small players to use viruses as protection like in real Agar.io
            continue
          }
        }
      }
      
      // Player vs enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        const dx = this.player.x - enemy.x
        const dy = this.player.y - enemy.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.player.radius + enemy.radius - 10) {
          // Check spawn protection - no collisions if either player has protection
          if (this.player.spawnProtection || enemy.spawnProtection) {
            continue // Skip collision if anyone has spawn protection
          }
          
          if (this.player.mass > enemy.mass * 1.2) {
            // Player eats enemy
            this.player.mass += enemy.mass * 0.8
            setScore(prev => prev + Math.floor(enemy.mass))
            setEliminations(prev => prev + 1)
            setMass(this.player.mass)
            
            // Update mission progress for elimination
            if (typeof updateMissionProgress === 'function') {
              updateMissionProgress('elimination', 1)
              updateMissionProgress('mass_reached', this.player.mass)
            }
            
            // Respawn enemy
            enemy.mass = 15 + Math.random() * 40
            enemy.radius = Math.sqrt(enemy.mass) * 3
            
            // Respawn within playable radius
            const centerX = this.world.width / 2
            const centerY = this.world.height / 2
            const playableRadius = this.currentPlayableRadius
            let x, y, distance
            
            do {
              x = Math.random() * this.world.width
              y = Math.random() * this.world.height
              distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
            } while (distance > playableRadius - 50) // 50px buffer from edge
            
            enemy.x = x
            enemy.y = y
            // Reset spawn protection for respawned enemy
            enemy.spawnProtection = true
            enemy.spawnProtectionStart = Date.now()
            console.log(`Enemy ${enemy.name} respawned with spawn protection within zone radius ${Math.floor(playableRadius)}px`)
          } else if (enemy.mass > this.player.mass * 1.2) {
            // Enemy eats player - Game Over
            this.running = false
            
            // Calculate final survival time
            if (this.gameStartTime && this.setTimeSurvived) {
              const finalTime = Math.floor((Date.now() - this.gameStartTime) / 1000)
              this.setTimeSurvived(finalTime)
              console.log(`🏁 Game Over - Survived for ${finalTime} seconds`)
            }
            
            setGameOver(true)
          }
        }
      }
      
      // Enemies eating coins
      this.enemies.forEach(enemy => {
        for (let i = this.coins.length - 1; i >= 0; i--) {
          const coin = this.coins[i]
          const dx = enemy.x - coin.x
          const dy = enemy.y - coin.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < enemy.radius + coin.radius) {
            enemy.mass += coin.value * 0.5
            enemy.radius = Math.sqrt(enemy.mass) * 3
            this.coins.splice(i, 1)
            break
          }
        }
      })
    }

    updateCamera() {
      const targetX = this.player.x - this.canvas.width / 2
      const targetY = this.player.y - this.canvas.height / 2
      
      this.camera.x += (targetX - this.camera.x) * 0.1
      this.camera.y += (targetY - this.camera.y) * 0.1
      
      // Allow camera to show red boundary areas (extend bounds by 100px)
      const boundaryExtension = 100
      this.camera.x = Math.max(-boundaryExtension, Math.min(this.world.width - this.canvas.width + boundaryExtension, this.camera.x))
      this.camera.y = Math.max(-boundaryExtension, Math.min(this.world.height - this.canvas.height + boundaryExtension, this.camera.y))
    }

    render() {
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      this.ctx.save()
      this.ctx.translate(-this.camera.x, -this.camera.y)
      
      // Draw grid
      this.drawGrid()
      
      // Draw world boundary (red ring)
      this.drawWorldBoundary()
      
      // Draw coins
      this.coins.forEach(coin => this.drawCoin(coin))
      
      // Draw viruses
      this.viruses.forEach(virus => this.drawVirus(virus))
      
      // Draw enemies
      this.enemies.forEach(enemy => this.drawPlayer(enemy))
      
      // Draw player only if game is running and no modals are showing
      if (this.running && !cashOutComplete && !gameOver) {
        this.drawPlayer(this.player)
      }
      
      this.ctx.restore()
    }

    drawGrid() {
      this.ctx.strokeStyle = '#808080' // Much brighter gray grid lines
      this.ctx.lineWidth = 1
      this.ctx.globalAlpha = 0.3 // Add transparency so they don't interfere with gameplay
      const gridSize = 50
      
      const startX = Math.floor(this.camera.x / gridSize) * gridSize
      const startY = Math.floor(this.camera.y / gridSize) * gridSize
      const endX = startX + this.canvas.width + gridSize
      const endY = startY + this.canvas.height + gridSize
      
      for (let x = startX; x <= endX; x += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(x, startY)
        this.ctx.lineTo(x, endY)
        this.ctx.stroke()
      }
      
      for (let y = startY; y <= endY; y += gridSize) {
        this.ctx.beginPath()
        this.ctx.moveTo(startX, y)
        this.ctx.lineTo(endX, y)
        this.ctx.stroke()
      }
      
      // Reset alpha back to normal
      this.ctx.globalAlpha = 1.0
    }

    drawWorldBoundary() {
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      // Draw red danger zone outside playable area
      this.ctx.fillStyle = '#1a0000'
      this.ctx.fillRect(0, 0, this.world.width, this.world.height)
      
      // Draw playable area (black circle to create the safe zone)
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
      
      // Dynamic zone color based on size changes
      let zoneColor = '#00ff00' // Default green
      if (Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        // Zone is changing - use yellow color
        zoneColor = '#ffff00'
      }
      if (this.isCashGame) {
        // Cash games get a distinctive blue-green color
        zoneColor = this.targetPlayableRadius > this.currentPlayableRadius ? '#00ffff' : '#0080ff'
      }
      
      // Draw the boundary circle
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor
      this.ctx.lineWidth = 8
      this.ctx.stroke()
      
      // Add glowing effect
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor.replace(')', ', 0.6)')
      this.ctx.lineWidth = 16
      this.ctx.stroke()
      
      // Add inner glow
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, playableRadius, 0, Math.PI * 2)
      this.ctx.strokeStyle = zoneColor.replace(')', ', 0.3)')
      this.ctx.lineWidth = 24
      this.ctx.stroke()
      
      // Show zone info for cash games
      if (this.isCashGame && Math.abs(this.currentPlayableRadius - this.targetPlayableRadius) > 1) {
        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = 'bold 16px Arial'
        this.ctx.textAlign = 'center'
        const direction = this.targetPlayableRadius > this.currentPlayableRadius ? 'EXPANDING' : 'SHRINKING'
        this.ctx.fillText(`ZONE ${direction}`, centerX, centerY - playableRadius - 40)
        this.ctx.font = 'bold 12px Arial'
        this.ctx.fillText(`Players: ${this.realPlayerCount} | Radius: ${Math.floor(playableRadius)}`, centerX, centerY - playableRadius - 20)
      }
    }

    drawCoin(coin) {
      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = coin.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#FFB000'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
      
      // Draw $ symbol
      this.ctx.fillStyle = '#000000'
      this.ctx.font = 'bold 12px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('$', coin.x, coin.y + 4)
    }

    drawPlayer(player) {
      // Draw player circle
      this.ctx.beginPath()
      this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = player.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 3
      this.ctx.stroke()
      
      // Draw spawn protection ring
      if (player.spawnProtection) {
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2)
        this.ctx.strokeStyle = '#3B82F6' // Bright blue color
        this.ctx.lineWidth = 4
        this.ctx.setLineDash([10, 5]) // Dashed line pattern
        this.ctx.stroke()
        this.ctx.setLineDash([]) // Reset line dash
        
        // Add pulsing effect
        const time = Date.now() / 1000
        const pulseIntensity = Math.sin(time * 4) * 0.3 + 0.7 // Pulse between 0.4 and 1.0
        this.ctx.globalAlpha = pulseIntensity
        
        // Draw inner glow ring
        this.ctx.beginPath()
        this.ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2)
        this.ctx.strokeStyle = '#60A5FA' // Lighter blue
        this.ctx.lineWidth = 2
        this.ctx.stroke()
        
        this.ctx.globalAlpha = 1.0 // Reset alpha
      }
      
      // Draw player name
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 14px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(player.name, player.x, player.y - player.radius - 15)
      
      // Draw black eyes
      const eyeRadius = Math.max(2, player.radius * 0.12) // Made eyes smaller
      const eyeOffset = player.radius * 0.35 // Increased distance from center
      
      // Left eye
      this.ctx.beginPath()
      this.ctx.arc(player.x - eyeOffset, player.y - eyeOffset * 0.3, eyeRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
      
      // Right eye
      this.ctx.beginPath()
      this.ctx.arc(player.x + eyeOffset, player.y - eyeOffset * 0.3, eyeRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = '#000000'
      this.ctx.fill()
    }

    drawVirus(virus) {
      // Draw virus with spiky appearance
      this.ctx.save()
      this.ctx.translate(virus.x, virus.y)
      
      // Draw spikes
      this.ctx.beginPath()
      for (let i = 0; i < virus.spikes; i++) {
        const angle = (i / virus.spikes) * Math.PI * 2
        const spikeLength = virus.radius + 8
        const innerRadius = virus.radius - 5
        
        if (i === 0) {
          this.ctx.moveTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength)
        } else {
          this.ctx.lineTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength)
        }
        
        const nextAngle = ((i + 0.5) / virus.spikes) * Math.PI * 2
        this.ctx.lineTo(Math.cos(nextAngle) * innerRadius, Math.sin(nextAngle) * innerRadius)
      }
      this.ctx.closePath()
      this.ctx.fillStyle = virus.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#00AA00'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
      
      // Draw inner circle
      this.ctx.beginPath()
      this.ctx.arc(0, 0, virus.radius - 10, 0, Math.PI * 2)
      this.ctx.fillStyle = '#004400'
      this.ctx.fill()
      
      this.ctx.restore()
    }

    start() {
      this.running = true
      this.gameStartTime = Date.now() // Start the timer
      this.timeSurvivedSeconds = 0
      setGameStarted(true)
    }

    stop() {
      this.running = false
    }

    split() {
      if (this.player.mass > 20) {
        this.player.mass = this.player.mass * 0.8
        setMass(this.player.mass)
      }
    }
  }

  useEffect(() => {
    // Remove default body margins/padding that might cause white borders
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.margin = '0'
    document.documentElement.style.padding = '0'
    
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    // Set canvas size properly
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    // Get selected skin from localStorage
    let selectedSkin = { id: 'default', name: 'Default Warrior', color: '#4A90E2' } // Default skin
    try {
      const savedSkin = localStorage.getItem('selectedSkin')
      if (savedSkin) {
        selectedSkin = JSON.parse(savedSkin)
        console.log('🎨 Loaded selected skin for game:', selectedSkin.name, selectedSkin.color)
      }
    } catch (error) {
      console.log('⚠️ Error loading selected skin, using default:', error)
    }

    const game = new GameEngine(canvas, setCheatingBan, setTimeSurvived, selectedSkin)
    gameRef.current = game
    
    game.start()

    // Game loop
    const gameLoop = () => {
      if (game.running) {
        game.update()
        game.render()
        
        // Update minimap data for React state (every few frames to avoid performance issues)
        if (Date.now() % 100 < 16) { // Update roughly every 100ms
          setMinimapData({
            playerX: game.player.x,
            playerY: game.player.y,
            enemies: game.enemies.map(enemy => ({ x: enemy.x, y: enemy.y })),
            coins: game.coins.map(coin => ({ x: coin.x, y: coin.y })),
            viruses: game.viruses.map(virus => ({ x: virus.x, y: virus.y }))
          })
          
          // Update other game stats
          setScore(Math.floor(game.player.mass - 20))
          setMass(Math.floor(game.player.mass))
        }
      }
      requestAnimationFrame(gameLoop)
    }
    gameLoop()

    return () => {
      game.stop()
      window.removeEventListener('resize', setCanvasSize)
      // Reset body styles when component unmounts
      document.body.style.margin = ''
      document.body.style.padding = ''
      document.body.style.overflow = ''
      document.documentElement.style.margin = ''
      document.documentElement.style.padding = ''
    }
  }, [])

  // Cash out handling
  const cashOutIntervalRef = useRef(null)
  
  // Cash out key event handlers (separated from the interval logic)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && !isCashingOut && !cashOutComplete && gameStarted) {
        console.log('Starting cash out process') // Debug log
        setIsCashingOut(true)
        setCashOutProgress(0)
      }
    }
    
    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'e' && isCashingOut) {
        console.log('Canceling cash out') // Debug log
        // User released E before completion - reset
        setIsCashingOut(false)
        setCashOutProgress(0)
        if (cashOutIntervalRef.current) {
          clearInterval(cashOutIntervalRef.current)
          cashOutIntervalRef.current = null
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isCashingOut, cashOutComplete, gameStarted])
  
  // Cash out progress interval (separate effect)
  useEffect(() => {
    if (isCashingOut && !cashOutComplete) {
      console.log('Starting progress interval') // Debug log
      
      // Start the 5-second fill animation
      cashOutIntervalRef.current = setInterval(() => {
        setCashOutProgress(prev => {
          console.log('Progress update:', prev) // Debug log
          if (prev >= 100) {
            clearInterval(cashOutIntervalRef.current)
            cashOutIntervalRef.current = null
            setIsCashingOut(false)
            
            // Calculate survival time for cash out
            if (gameRef.current && gameRef.current.gameStartTime) {
              const finalTime = Math.floor((Date.now() - gameRef.current.gameStartTime) / 1000)
              setTimeSurvived(finalTime)
              console.log(`💰 Cash Out - Survived for ${finalTime} seconds`)
            }
            
            // Stop the game to prevent player from being eaten after cash out
            if (gameRef.current) {
              gameRef.current.running = false
              console.log('🛑 Game stopped after successful cash out')
            }
            
            setCashOutComplete(true)
            return 100
          }
          return prev + 2 // 2% every 100ms = 5 seconds total
        })
      }, 100)
    }
    
    // Cleanup interval if not cashing out
    return () => {
      if (cashOutIntervalRef.current) {
        clearInterval(cashOutIntervalRef.current)
        cashOutIntervalRef.current = null
      }
    }
  }, [isCashingOut, cashOutComplete])

  // Mission timer and survival tracking
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const timer = setInterval(() => {
      setMissionTime(prev => {
        const newTime = prev - 1
        
        // Update survival mission progress
        const survivalSeconds = 60 - newTime
        updateMissionProgress('survival_time', survivalSeconds)
        
        if (newTime <= 0) {
          setGameOver(true)
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameOver])

  const handleSplit = () => {
    if (gameRef.current) {
      gameRef.current.split()
    }
  }

  const handleRestart = () => {
    setGameOver(false)
    setMissionTime(60)
    setScore(0)
    setMass(20)
    setEliminations(0)
    
    if (gameRef.current) {
      gameRef.current.player = {
        x: gameRef.current.world.width / 2,
        y: gameRef.current.world.height / 2,
        mass: 20,
        radius: 25,
        color: '#4A90E2',
        name: 'You',
        speed: 2,
        targetX: gameRef.current.world.width / 2,
        targetY: gameRef.current.world.height / 2
      }
      gameRef.current.generateCoins()
      gameRef.current.generateEnemies()
      gameRef.current.start()
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPlayerPosition = () => {
    if (!gameRef.current) return { x: 50, y: 50 }
    const player = gameRef.current.player
    const world = gameRef.current.world
    return {
      x: (player.x / world.width) * 100,
      y: (player.y / world.height) * 100
    }
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0" style={{ position: 'relative', margin: 0, padding: 0 }}>
      {/* Game Canvas - Full Screen */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair bg-black m-0 p-0"
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: 1,
          margin: 0,
          padding: 0,
          border: 'none',
          outline: 'none',
          display: 'block'
        }}
      />

      {/* DESKTOP HUD UI Elements - Always Visible */}
      <div>
        {/* Live Leaderboard - Smaller Version */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '10px', 
            left: '10px', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '2px solid rgba(0, 255, 255, 0.3)',
            borderRadius: '6px',
            padding: '10px',
            minWidth: '160px',
            fontFamily: '"Rajdhani", sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ 
            color: '#00ffff', 
            fontSize: '14px', 
            fontWeight: '700', 
            marginBottom: '10px',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            💰 Live Leaderboard
          </div>
          
          {/* Player Rankings - Dynamic Leaderboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
            {(() => {
              if (!gameRef.current) return null;
              
              // Create leaderboard data combining player and enemies
              const leaderboardData = [
                {
                  name: 'You',
                  score: score,
                  isPlayer: true
                },
                ...gameRef.current.enemies.map((enemy, index) => ({
                  name: enemy.name,
                  score: Math.floor(enemy.mass - 20), // Convert mass to score like player
                  isPlayer: false
                }))
              ];
              
              // Sort by score in descending order
              leaderboardData.sort((a, b) => b.score - a.score);
              
              // Take top 5 players
              return leaderboardData.slice(0, 5).map((player, index) => (
                <div key={player.name} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '4px 8px',
                  backgroundColor: player.isPlayer ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  borderRadius: '4px',
                  border: player.isPlayer ? '1px solid rgba(0, 255, 255, 0.3)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#ffffff',
                      fontSize: '12px', 
                      fontWeight: '700',
                      marginRight: '8px'
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ 
                      color: player.isPlayer ? '#00ffff' : '#ffffff', 
                      fontSize: '12px', 
                      fontWeight: '600' 
                    }}>
                      {player.name}
                    </span>
                  </div>
                  <span style={{ 
                    color: '#00ff88', 
                    fontSize: '12px', 
                    fontWeight: '700'
                  }}>
                    ${player.score}
                  </span>
                </div>
              ));
            })()}
          </div>
          
          {/* Players in game counter */}
          <div style={{ 
            color: '#00ffff', 
            fontSize: '10px', 
            fontWeight: '600',
            textAlign: 'center',
            paddingTop: '6px',
            borderTop: '1px solid rgba(0, 255, 255, 0.3)'
          }}>
            11 players in game
          </div>
        </div>
        
        {/* Anti-Cheat Status Indicator - Only show for cash games */}
        {(() => {
          const urlParams = new URLSearchParams(window.location.search)
          const fee = urlParams.get('fee')
          const isCashGame = fee && parseFloat(fee) > 0
          
          if (!isCashGame) return null
          
          return (
            <div style={{ 
              position: 'fixed', 
              top: '180px', 
              left: '10px', 
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              border: '2px solid rgba(255, 69, 58, 0.6)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontFamily: '"Rajdhani", sans-serif',
              minWidth: '160px'
            }}>
              <div style={{ 
                color: '#ff453a', 
                fontSize: '12px', 
                fontWeight: '700', 
                marginBottom: '4px',
                textAlign: 'center',
                letterSpacing: '0.5px'
              }}>
                🛡️ ANTI-CHEAT ACTIVE
              </div>
              <div style={{ 
                color: '#ffffff', 
                fontSize: '10px', 
                fontWeight: '500',
                textAlign: 'center',
                lineHeight: '1.3'
              }}>
                Fair play monitoring enabled
              </div>
              <div style={{ 
                color: '#00ff88', 
                fontSize: '10px', 
                fontWeight: '600',
                textAlign: 'center',
                marginTop: '2px'
              }}>
                Status: PROTECTED
              </div>
            </div>
          )
        })()}
        
        {/* Missions Panel - Top Center */}
        {activeMissions.length > 0 && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '2px solid rgba(59, 130, 246, 0.6)',
            borderRadius: '8px',
            padding: '12px 20px',
            fontFamily: '"Rajdhani", sans-serif',
            maxWidth: '400px',
            minWidth: '320px',
            transition: 'all 0.3s ease'
          }}>
            {/* Mission Display */}
            {(() => {
              const currentMission = activeMissions[currentMissionIndex]
              if (!currentMission) return null
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Mission Icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: currentMission.completed ? 
                      'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)' : 
                      'linear-gradient(45deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}>
                    {currentMission.icon}
                  </div>
                  
                  {/* Mission Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        color: currentMission.completed ? '#22c55e' : '#ffffff',
                        fontSize: '14px',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        {currentMission.name}
                      </span>
                      <span style={{
                        color: '#FFD700',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        +{currentMission.reward}💰
                      </span>
                    </div>
                    
                    <div style={{
                      color: '#a0aec0',
                      fontSize: '11px',
                      marginBottom: '6px'
                    }}>
                      {currentMission.description}
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        width: `${Math.min(100, (currentMission.progress / currentMission.target) * 100)}%`,
                        height: '100%',
                        background: currentMission.completed ?
                          'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' :
                          'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '2px'
                    }}>
                      <span style={{
                        color: '#9ca3af',
                        fontSize: '10px'
                      }}>
                        {currentMission.progress}/{currentMission.target}
                      </span>
                      {currentMission.completed && (
                        <span style={{
                          color: '#22c55e',
                          fontSize: '10px',
                          fontWeight: '700'
                        }}>
                          ✓ COMPLETE
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Mission Counter */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <div style={{
                      color: '#a0aec0',
                      fontSize: '10px',
                      textTransform: 'uppercase'
                    }}>
                      Mission
                    </div>
                    <div style={{
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}>
                      {currentMissionIndex + 1}/{activeMissions.length}
                    </div>
                    <div style={{
                      color: '#FFD700',
                      fontSize: '10px',
                      fontWeight: '700'
                    }}>
                      💰 {currency}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
        
        {/* Mission Complete Notification - Less Intrusive */}
        {showMissionComplete && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            transform: 'translateY(0)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid #22c55e',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#ffffff',
            fontFamily: '"Rajdhani", sans-serif',
            maxWidth: '280px',
            zIndex: 1500,
            animation: 'slideInRight 0.4s ease-out',
            boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                background: 'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                ✅
              </div>
              <div>
                <div style={{ 
                  color: '#22c55e', 
                  fontSize: '14px', 
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>
                  Mission Complete!
                </div>
                <div style={{ 
                  color: '#ffffff', 
                  fontSize: '12px', 
                  fontWeight: '600'
                }}>
                  {showMissionComplete.icon} {showMissionComplete.name}
                </div>
              </div>
            </div>
            <div style={{ 
              color: '#FFD700', 
              fontSize: '14px', 
              fontWeight: '700',
              textAlign: 'center',
              padding: '6px 12px',
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}>
              +{showMissionComplete.reward} 💰 Coins Earned!
            </div>
          </div>
        )}

        {/* Cheating Ban Popup */}
        {cheatingBan && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ff3333',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              padding: '0',
              color: 'white',
              boxShadow: '0 0 60px rgba(255, 51, 51, 0.8)',
              fontFamily: '"Rajdhani", sans-serif',
              animation: 'pulse 2s infinite'
            }}>
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid #ff3333',
                background: 'linear-gradient(45deg, rgba(255, 51, 51, 0.2) 0%, rgba(255, 51, 51, 0.1) 100%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  background: 'linear-gradient(45deg, #ff3333 0%, #cc0000 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 20px rgba(255, 51, 51, 0.6)'
                }}>
                  🚫
                </div>
                <h2 style={{
                  color: '#ff3333',
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 15px rgba(255, 51, 51, 0.8)',
                  letterSpacing: '2px'
                }}>
                  ACCOUNT SUSPENDED
                </h2>
                <p style={{
                  color: '#ff6b6b',
                  fontSize: '16px',
                  margin: '0',
                  fontWeight: '600'
                }}>
                  Kicked for suspected cheating
                </p>
              </div>

              {/* Details */}
              <div style={{ padding: '24px' }}>
                <div style={{
                  backgroundColor: 'rgba(255, 51, 51, 0.1)',
                  border: '1px solid rgba(255, 51, 51, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    color: '#ffffff', 
                    fontSize: '18px', 
                    fontWeight: '700',
                    marginBottom: '8px'
                  }}>
                    🛡️ FAIR PLAY VIOLATION
                  </div>
                  <div style={{ 
                    color: '#e2e8f0', 
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    Our anti-cheat system detected suspicious activity including speed hacks, automation scripts, or memory manipulation attempts.
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#ff6b6b', fontSize: '24px', fontWeight: '700' }}>
                      3/3
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Violations</div>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#ff6b6b', fontSize: '24px', fontWeight: '700' }}>
                      PERMANENT
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Ban Status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexDirection: 'column'
                }}>
                  <button
                    onClick={() => window.location.href = '/'}
                    style={{
                      backgroundColor: '#4a5568',
                      border: '2px solid #718096',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#718096'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#4a5568'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🏠 Return to Lobby
                  </button>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#a0aec0',
                    marginTop: '8px',
                    lineHeight: '1.4'
                  }}>
                    Contact support if you believe this is an error.<br/>
                    Email: support@turfloot.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Matching Reference Style */}
        
        {/* Cash Out Button - Bottom Center */}
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div 
            style={{
              backgroundColor: 'rgba(255, 165, 0, 0.95)',
              border: '2px solid #ff8c00',
              borderRadius: '8px',
              color: '#000000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              textAlign: 'center',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: '0 4px 12px rgba(255, 165, 0, 0.4)',
              minWidth: '200px',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              if (!isCashingOut) {
                e.target.style.backgroundColor = 'rgba(255, 200, 50, 0.98)'
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(255, 165, 0, 0.5)'
              }
            }}
            onMouseOut={(e) => {
              if (!isCashingOut) {
                e.target.style.backgroundColor = 'rgba(255, 165, 0, 0.95)'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(255, 165, 0, 0.4)'
              }
            }}
          >
            {/* Progress fill overlay */}
            {isCashingOut && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${cashOutProgress}%`,
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                transition: 'width 100ms linear',
                zIndex: 1
              }} />
            )}
            
            {/* Button text */}
            <span style={{ position: 'relative', zIndex: 2 }}>
              {isCashingOut 
                ? `🔥 Cashing Out... ${Math.floor(cashOutProgress)}%`
                : `🔥 Hold E to Cash Out ($${score})`
              }
            </span>
          </div>

          {/* Split Button - Same height as Cash Out */}
          <div 
            onClick={handleSplit}
            style={{
              backgroundColor: 'rgba(255, 0, 0, 0.9)',
              border: '2px solid #ff0000',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: '0 4px 12px rgba(255, 0, 0, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 50, 50, 0.95)'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(255, 0, 0, 0.4)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 0, 0, 0.9)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(255, 0, 0, 0.3)'
            }}
          >
            ⚡ Split (S)
          </div>
        </div>

        {/* Circular Minimap - Top Right (larger and faster updates) */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          width: '220px',
          height: '220px'
        }}>
          {/* Minimap Container */}
          <div style={{
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            backgroundColor: '#000000',
            border: '4px solid #00ff00',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.6)'
          }}>
            {/* Green spiky border effect */}
            <div style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              right: '-3px',
              bottom: '-3px',
              borderRadius: '50%',
              background: `conic-gradient(
                #00ff00 0deg, #00dd00 10deg, #00ff00 20deg, #00ee00 30deg,
                #00ff00 40deg, #00cc00 50deg, #00ff00 60deg, #00dd00 70deg,
                #00ff00 80deg, #00ee00 90deg, #00ff00 100deg, #00dd00 110deg,
                #00ff00 120deg, #00cc00 130deg, #00ff00 140deg, #00ee00 150deg,
                #00ff00 160deg, #00dd00 170deg, #00ff00 180deg, #00cc00 190deg,
                #00ff00 200deg, #00ee00 210deg, #00ff00 220deg, #00dd00 230deg,
                #00ff00 240deg, #00cc00 250deg, #00ff00 260deg, #00ee00 270deg,
                #00ff00 280deg, #00dd00 290deg, #00ff00 300deg, #00cc00 310deg,
                #00ff00 320deg, #00ee00 330deg, #00ff00 340deg, #00dd00 350deg
              )`,
              zIndex: -1
            }} />
            
            {/* Red danger zone ring (outer area) */}
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              right: '5px',
              bottom: '5px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, transparent 75%, rgba(255, 68, 68, 0.4) 85%, rgba(255, 68, 68, 0.6) 100%)',
              zIndex: 1
            }} />
            
            {/* Player dot on minimap - using state data */}
            <div style={{
              position: 'absolute',
              width: '12px',
              height: '12px',
              backgroundColor: '#60a5fa',
              borderRadius: '50%',
              left: `${(minimapData.playerX / 4000) * 210 + 5}px`,
              top: `${(minimapData.playerY / 4000) * 210 + 5}px`,
              transform: 'translate(-50%, -50%)',
              border: '3px solid #ffffff',
              boxShadow: '0 0 12px rgba(96, 165, 250, 1)',
              zIndex: 10
            }} />
            
            {/* Enemy dots on minimap - using state data */}
            {minimapData.enemies.map((enemy, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#ff6b6b',
                  borderRadius: '50%',
                  left: `${(enemy.x / 4000) * 210 + 5}px`,
                  top: `${(enemy.y / 4000) * 210 + 5}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: '0.9',
                  border: '1px solid #ffffff',
                  zIndex: 8
                }}
              />
            ))}
            
            {/* Coin dots on minimap - using state data */}
            {minimapData.coins.map((coin, i) => (
              <div
                key={`coin-${i}`}
                style={{
                  position: 'absolute',
                  width: '4px',
                  height: '4px',
                  backgroundColor: '#ffd700',
                  borderRadius: '50%',
                  left: `${(coin.x / 4000) * 210 + 5}px`,
                  top: `${(coin.y / 4000) * 210 + 5}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: '1',
                  boxShadow: '0 0 4px rgba(255, 215, 0, 0.8)',
                  zIndex: 7
                }}
              />
            ))}
            
            {/* Virus dots on minimap - using state data */}
            {minimapData.viruses.map((virus, i) => (
              <div
                key={`virus-${i}`}
                style={{
                  position: 'absolute',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#00ff41',
                  borderRadius: '50%',
                  left: `${(virus.x / 4000) * 210 + 5}px`,
                  top: `${(virus.y / 4000) * 210 + 5}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: '1',
                  border: '1px solid #00aa00',
                  boxShadow: '0 0 6px rgba(0, 255, 65, 0.8)',
                  zIndex: 6
                }}
              />
            ))}
            
            {/* Border spikes effect overlay */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              borderRadius: '50%',
              border: '3px solid rgba(0, 255, 0, 0.8)',
              boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.4)',
              zIndex: 3
            }} />
          </div>
        </div>

        {/* Ping Latency Meter - Bottom Left */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #333',
          borderRadius: '4px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#ccc',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: '600'
        }}>
          <div style={{ 
            color: '#00ff88', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#00ff88', 
              borderRadius: '50%' 
            }}></div>
            <span>24ms</span>
          </div>
        </div>

        {/* Player Info Panel - Bottom Right (larger with landing page font) */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #333',
          borderRadius: '4px',
          padding: '12px 16px',
          fontSize: '13px',
          color: '#ccc',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: '600',
          minWidth: '140px'
        }}>
          {/* Header */}
          <div style={{ 
            color: '#22d3ee', 
            fontSize: '14px', 
            fontWeight: '700', 
            marginBottom: '8px',
            borderBottom: '1px solid #333',
            paddingBottom: '6px'
          }}>
            You
          </div>
          
          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Net Worth:</span>
              <span style={{ color: '#22c55e', fontWeight: '700' }}>${score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Total Mass:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{mass}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>K/D:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{eliminations}/0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Streak:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{eliminations} 🔥</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Coins Collected:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Time Alive:</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>0:00</span>
            </div>
          </div>
        </div>

        {/* Cash Out Success Popup */}
        {cashOutComplete && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ffd700',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              padding: '0',
              color: 'white',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.6)',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid #ffd700',
                background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  background: 'linear-gradient(45deg, #ffd700 0%, #ffb000 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)'
                }}>
                  🏆
                </div>
                <h2 style={{
                  color: '#ffd700',
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                  letterSpacing: '1px'
                }}>
                  Cashout Successful!
                </h2>
                <p style={{
                  color: '#e2e8f0',
                  fontSize: '16px',
                  margin: '0',
                  opacity: '0.9'
                }}>
                  Congratulations! You've successfully cashed out!
                </p>
              </div>

              {/* Body Content */}
              <div style={{ padding: '24px' }}>
                {/* Amount Received Section - Only for paid rooms */}
                {(() => {
                  const urlParams = new URLSearchParams(window.location.search)
                  const fee = urlParams.get('fee')
                  const isPaidRoom = fee && parseFloat(fee) > 0
                  
                  if (!isPaidRoom) return null
                  
                  return (
                    <div style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        color: '#ffd700', 
                        fontSize: '14px', 
                        fontWeight: '600',
                        marginBottom: '8px',
                        textTransform: 'uppercase'
                      }}>
                        AMOUNT RECEIVED
                      </div>
                      <div style={{ 
                        color: '#ffffff', 
                        fontSize: '24px', 
                        fontWeight: '700',
                        marginBottom: '4px'
                      }}>
                        ${(score * 0.54).toFixed(2)}
                      </div>
                      <div style={{ 
                        color: '#a0aec0', 
                        fontSize: '12px',
                        fontWeight: '400'
                      }}>
                        {(score * 0.026).toFixed(6)} SOL
                      </div>
                    </div>
                  )
                })()}

                {/* Stats Section */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  {/* Time Survived */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '24px' }}>⏱️</div>
                    <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>
                      {Math.floor(timeSurvived / 60)}m {timeSurvived % 60}s
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>
                      Time Survived
                    </div>
                  </div>
                  
                  {/* Eliminations */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '24px' }}>⚔️</div>
                    <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>
                      {eliminations}
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>
                      Eliminations
                    </div>
                  </div>
                </div>

                {/* Balance Section - Only for paid rooms */}
                {(() => {
                  const urlParams = new URLSearchParams(window.location.search)
                  const fee = urlParams.get('fee')
                  const isPaidRoom = fee && parseFloat(fee) > 0
                  
                  if (!isPaidRoom) return null
                  
                  return (
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      padding: '16px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      marginBottom: '24px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ 
                        color: '#a0aec0', 
                        fontSize: '12px', 
                        marginBottom: '8px',
                        textTransform: 'uppercase'
                      }}>
                        Current Balance
                      </div>
                      <div style={{ 
                        color: '#ffffff', 
                        fontSize: '18px', 
                        fontWeight: '700'
                      }}>
                        ${(14.69 + (score * 0.54)).toFixed(2)} / {(0.070710 + (score * 0.026)).toFixed(6)} SOL
                      </div>
                    </div>
                  )
                })()}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexDirection: 'column'
                }}>
                  {/* Join Another Game Button */}
                  <button
                    onClick={() => {
                      setCashOutComplete(false)
                      setCashOutProgress(0)
                      setScore(0)
                      setMass(20)
                      setEliminations(0)
                      setTimeSurvived(0)
                      handleRestart()
                    }}
                    style={{
                      backgroundColor: '#ffd700',
                      border: '2px solid #ffb000',
                      borderRadius: '8px',
                      color: '#1a202c',
                      fontSize: '16px',
                      fontWeight: '700',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#ffb000'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#ffd700'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    JOINING...
                  </button>
                  
                  {/* Home Button */}
                  <button
                    onClick={() => window.location.href = '/'}
                    style={{
                      backgroundColor: 'transparent',
                      border: '2px solid #a0aec0',
                      borderRadius: '8px',
                      color: '#a0aec0',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#a0aec0'
                      e.target.style.color = '#1a202c'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent'
                      e.target.style.color = '#a0aec0'
                    }}
                  >
                    🏠 Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Popup */}
        {gameOver && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: '#1a202c',
              border: '3px solid #ff4444',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              padding: '0',
              color: 'white',
              boxShadow: '0 0 50px rgba(255, 68, 68, 0.5)',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid #ff4444',
                background: 'linear-gradient(45deg, rgba(255, 68, 68, 0.1) 0%, rgba(255, 68, 68, 0.05) 100%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(45deg, #ff4444 0%, #cc3333 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '30px',
                  margin: '0 auto 16px'
                }}>
                  💀
                </div>
                <h2 style={{
                  color: '#ff4444',
                  fontSize: '32px',
                  fontWeight: '700',
                  margin: '0 0 8px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(255, 68, 68, 0.6)'
                }}>
                  GAME OVER
                </h2>
                <p style={{
                  color: '#e2e8f0',
                  fontSize: '16px',
                  margin: '0',
                  opacity: '0.8'
                }}>
                  Your operative has been eliminated!
                </p>
              </div>

              {/* Stats */}
              <div style={{ padding: '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#68d391', fontSize: '24px', fontWeight: '700' }}>
                      ${score}
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Final Score</div>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#60a5fa', fontSize: '24px', fontWeight: '700' }}>
                      {mass} KG
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '14px' }}>Final Mass</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexDirection: 'column'
                }}>
                  <button
                    onClick={handleRestart}
                    style={{
                      backgroundColor: '#68d391',
                      border: '2px solid #48bb78',
                      borderRadius: '8px',
                      color: '#1a202c',
                      fontSize: '18px',
                      fontWeight: '700',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#48bb78'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#68d391'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🔄 Play Again
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    style={{
                      backgroundColor: 'transparent',
                      border: '2px solid #a0aec0',
                      borderRadius: '8px',
                      color: '#a0aec0',
                      fontSize: '16px',
                      fontWeight: '600',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#a0aec0'
                      e.target.style.color = '#1a202c'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent'
                      e.target.style.color = '#a0aec0'
                    }}
                  >
                    🏠 Back to Lobby
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  )
}

export default AgarIOGame