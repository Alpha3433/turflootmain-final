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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768)
      }
    }
    
    checkMobile()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkMobile)
      }
    }
  }, [])

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
        // Mission complete popup removed - no longer shows over minimap
        return { ...mission, progress: newProgress, completed: true }
      }

      return { ...mission, progress: newProgress }
    }))
  }

  // Initialize missions when game starts (only for cash games)
  useEffect(() => {
    if (gameStarted && activeMissions.length === 0) {
      // Check if this is a cash game (only show missions for paid rooms)
      if (typeof window === 'undefined') return
      const urlParams = new URLSearchParams(window.location.search)
      const fee = urlParams.get('fee')
      const mode = urlParams.get('mode')
      const isCashGame = fee && parseFloat(fee) > 0 && mode !== 'local' && mode !== 'practice'
      
      if (isCashGame) {
        // Assign 3 random missions when game starts
        const shuffled = [...missionTypes].sort(() => 0.5 - Math.random())
        const selectedMissions = shuffled.slice(0, 3).map(mission => ({
          ...mission,
          progress: 0,
          completed: false
        }))
        setActiveMissions(selectedMissions)
      }
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
  
  // Update game engine's gameStates when cash out state changes
  useEffect(() => {
    if (gameRef.current && gameRef.current.updateGameStates) {
      console.log('🔄 Updating game states:', { isCashingOut, cashOutProgress, cashOutComplete, gameOver })
      gameRef.current.updateGameStates({
        isCashingOut,
        cashOutProgress,
        cashOutComplete,
        gameOver
      })
    }
  }, [isCashingOut, cashOutProgress, cashOutComplete, gameOver])
  
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
        spawnProtectionTime: 6000, // Increased from 4 to 6 seconds for better protection
        spawnProtectionStart: Date.now()
      }
      
      // Player pieces for splitting (Agar.io style)
      this.playerPieces = []
      this.splitCooldown = 0 // Prevent spam splitting
      this.recombineTime = 3 // Seconds before pieces can recombine (very responsive for testing)
      
      this.coins = []
      this.enemies = []
      this.viruses = []
      this.running = false
      this.lastUpdate = Date.now()
      this.gameStartTime = null // Track when game starts
      this.timeSurvivedSeconds = 0
      
      // Add method to update game states in real-time
      this.updateGameStates = (newStates) => {
        if (this.gameStates) {
          Object.assign(this.gameStates, newStates)
        }
      }
      
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
      if (typeof window === 'undefined') return false
      const urlParams = new URLSearchParams(window.location.search)
      const fee = urlParams.get('fee')
      const mode = urlParams.get('mode')
      
      // Cash games have fee > 0 and mode !== 'local' and mode !== 'practice'
      return fee && parseFloat(fee) > 0 && mode !== 'local' && mode !== 'practice'
    }

    getRealPlayerCount() {
      // In a real implementation, this would fetch actual player count from server
      // For now, simulate varying player counts based on fee tier
      if (typeof window === 'undefined') return 8
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
      
      console.warn(`🚨 ANTI-CHEAT VIOLATION [${this.antiCheat.violations}/${this.antiCheat.maxViolations}]: ${type} - ${description} (Mass: ${this.player.mass.toFixed(1)})`)
      
      // Log violation for server reporting
      this.reportViolation(type, description)
      
      // More lenient banning - require more violations at high mass
      const banThreshold = this.player.mass > 1000 ? 8 : this.antiCheat.maxViolations // Higher threshold for high mass players
      
      if (this.antiCheat.violations >= banThreshold) {
        console.log(`🔒 PLAYER BAN TRIGGERED: ${this.antiCheat.violations}/${banThreshold} violations (Mass: ${this.player.mass.toFixed(1)})`)
        this.banPlayer()
      } else {
        console.log(`⚠️ Violation count: ${this.antiCheat.violations}/${banThreshold} (Mass: ${this.player.mass.toFixed(1)})`)
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
      
      // Increased virus count from 6 to 12 for more challenging gameplay
      for (let i = 0; i < 12; i++) {
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

    spawnEnemy() {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      const mass = 15 + Math.random() * 40
      let x, y, distance
      
      // Generate enemy within the playable radius
      do {
        x = Math.random() * this.world.width
        y = Math.random() * this.world.height
        distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      } while (distance > playableRadius - 50) // 50px buffer from edge
      
      const newEnemy = {
        x: x,
        y: y,
        mass: mass,
        radius: Math.sqrt(mass) * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        name: `Player ${this.enemies.length + 2}`,
        speed: Math.max(0.2, 35 / Math.sqrt(mass)),
        targetX: Math.random() * this.world.width,
        targetY: Math.random() * this.world.height,
        lastTargetChange: Date.now(),
        spawnProtection: true,
        spawnProtectionTime: 4000,
        spawnProtectionStart: Date.now()
      }
      
      this.enemies.push(newEnemy)
      console.log(`👥 Spawned new enemy within radius ${Math.floor(playableRadius)}px`)
    }

    spawnVirus() {
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      let x, y, distance
      
      // Generate virus within the playable radius
      do {
        x = Math.random() * this.world.width
        y = Math.random() * this.world.height
        distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      } while (distance > playableRadius - 100) // 100px buffer from edge for viruses
      
      const newVirus = {
        x: x,
        y: y,
        radius: 40 + Math.random() * 20,
        color: '#00FF41',
        spikes: 12,
        mass: 100
      }
      
      this.viruses.push(newVirus)
      console.log(`🦠 Spawned new virus within radius ${Math.floor(playableRadius)}px`)
    }

    bindEvents() {
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = e.clientX - rect.left
        this.mouse.y = e.clientY - rect.top
        
        // Convert to world coordinates
        this.mouse.worldX = this.mouse.x + this.camera.x
        this.mouse.worldY = this.mouse.y + this.camera.y
        
        // Direct target update like Agar.io
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

      // Update player with simple Agar.io-style movement
      this.updatePlayer(deltaTime)
      
      // Update dynamic zone for cash games
      this.updateDynamicZone(deltaTime)
      
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
      // Update split cooldown
      if (this.splitCooldown > 0) {
        this.splitCooldown--
      }
      
      const dx = this.player.targetX - this.player.x
      const dy = this.player.targetY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Dynamic speed based on mass - larger players move slower
      // Use a much smaller threshold to prevent stopping when mouse is still
      if (distance > 0.1) {
        // Speed decreases as mass increases (like Agar.io)
        const baseSpeed = 6.0  // Base speed for small players
        const massSpeedFactor = Math.sqrt(this.player.mass / 20) // Gradual slowdown
        const dynamicSpeed = Math.max(1.5, baseSpeed / massSpeedFactor) // Minimum speed of 1.5
        
        const moveDistance = Math.min(dynamicSpeed, distance) // Don't overshoot target
        
        // Normalize direction and apply dynamic speed
        const moveX = (dx / distance) * moveDistance
        const moveY = (dy / distance) * moveDistance
        
        this.player.x += moveX
        this.player.y += moveY
      }
      
      // Update all player pieces
      this.updatePlayerPieces(deltaTime)
      
      // Quick boundary check - keep it simple
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const maxRadius = this.currentPlayableRadius - this.player.radius
      
      const distanceFromCenter = Math.sqrt(
        Math.pow(this.player.x - centerX, 2) + 
        Math.pow(this.player.y - centerY, 2)
      )
      
      if (distanceFromCenter > maxRadius) {
        const angle = Math.atan2(this.player.y - centerY, this.player.x - centerX)
        this.player.x = centerX + Math.cos(angle) * maxRadius
        this.player.y = centerY + Math.sin(angle) * maxRadius
      }
      
      this.player.radius = Math.sqrt(this.player.mass) * 3
      
      // Anti-cheat: Validate radius-mass relationship
      if (this.antiCheat.enabled) {
        const expectedRadius = Math.sqrt(this.player.mass) * 3
        if (Math.abs(this.player.radius - expectedRadius) > 1) {
          console.log(`⚠️ RADIUS VIOLATION: Player mass: ${this.player.mass}, Current radius: ${this.player.radius}, Expected radius: ${expectedRadius}`)
          this.recordViolation('RADIUS_MANIPULATION', `Invalid radius: ${this.player.radius} vs expected: ${expectedRadius}`)
          this.player.radius = expectedRadius // Force correct radius
        }
      }
      
      // Add debugging for high mass (around 1050)
      if (this.player.mass > 1000) {
        console.log(`🔍 HIGH MASS DEBUG: Mass=${this.player.mass.toFixed(1)}, Radius=${this.player.radius.toFixed(1)}, Zone=${this.currentPlayableRadius}, MaxRadius=${(this.currentPlayableRadius - this.player.radius).toFixed(1)}`)
      }
    }

    updatePlayerPieces(deltaTime) {
      const currentTime = Date.now()
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const maxRadius = this.currentPlayableRadius
      
      // Update each player piece
      for (let i = this.playerPieces.length - 1; i >= 0; i--) {
        const piece = this.playerPieces[i]
        
        // Move piece towards mouse (same logic as main player)
        const dx = piece.targetX - piece.x
        const dy = piece.targetY - piece.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // Apply initial split velocity (strong initial launch like Agar.io)
        if (piece.vx !== 0 || piece.vy !== 0) {
          // Apply velocity with proper scaling - stronger initial movement
          const velocityMultiplier = deltaTime * 60 // Normalize for 60fps equivalent
          piece.x += piece.vx * velocityMultiplier
          piece.y += piece.vy * velocityMultiplier
          
          // Friction - reduce velocity over time (authentic Agar.io decay)
          piece.vx *= 0.92 // Slightly more aggressive friction
          piece.vy *= 0.92
          
          // Stop very small velocities to prevent floating point issues
          if (Math.abs(piece.vx) < 0.05) piece.vx = 0
          if (Math.abs(piece.vy) < 0.05) piece.vy = 0
          
          // Debug log for initial frames
          if (Math.abs(piece.vx) > 0.05 || Math.abs(piece.vy) > 0.05) {
            console.log(`🚀 Piece ejecting: vx=${piece.vx.toFixed(2)}, vy=${piece.vy.toFixed(2)}, pos=(${piece.x.toFixed(0)}, ${piece.y.toFixed(0)})`)
          }
        }
        
        // Move towards mouse target only when no split velocity remains
        if (distance > 0.1 && Math.abs(piece.vx) < 0.05 && Math.abs(piece.vy) < 0.05) {
          const baseSpeed = 6.0
          const massSpeedFactor = Math.sqrt(piece.mass / 20)
          const dynamicSpeed = Math.max(1.5, baseSpeed / massSpeedFactor)
          
          const moveDistance = Math.min(dynamicSpeed, distance)
          const moveX = (dx / distance) * moveDistance
          const moveY = (dy / distance) * moveDistance
          
          piece.x += moveX
          piece.y += moveY
        }
        
        // Update piece properties
        piece.radius = Math.sqrt(piece.mass) * 3
        piece.targetX = this.player.targetX // Follow main player's target
        piece.targetY = this.player.targetY
        
        // Boundary check for pieces
        const distanceFromCenter = Math.sqrt(
          Math.pow(piece.x - centerX, 2) + Math.pow(piece.y - centerY, 2)
        )
        
        if (distanceFromCenter > maxRadius - piece.radius) {
          const angle = Math.atan2(piece.y - centerY, piece.x - centerX)
          piece.x = centerX + Math.cos(angle) * (maxRadius - piece.radius)
          piece.y = centerY + Math.sin(angle) * (maxRadius - piece.radius)
        }
        
        // Check for recombination after shorter cooldown (3 seconds for very responsive gameplay)
        if (currentTime - piece.splitTime > 3000) { // 3 seconds for immediate merging
          piece.recombineReady = true
        }
        
        // Debug: Log piece status every few seconds
        if (currentTime % 2000 < 50) { // Every 2 seconds approximately
          console.log(`🔍 Piece ${i}: Ready=${piece.recombineReady}, Age=${((currentTime - piece.splitTime) / 1000).toFixed(1)}s, Distance to main=${Math.sqrt(Math.pow(piece.x - this.player.x, 2) + Math.pow(piece.y - this.player.y, 2)).toFixed(0)}`)
        }
        
        // Auto-recombine if pieces are close and ready (VERY generous distance)
        if (piece.recombineReady) {
          const distanceToMain = Math.sqrt(
            Math.pow(piece.x - this.player.x, 2) + 
            Math.pow(piece.y - this.player.y, 2)
          )
          
          // Very generous collision detection - pieces merge when reasonably close
          if (distanceToMain < (piece.radius + this.player.radius) * 1.5) {
            // Merge mass back to main player
            this.player.mass += piece.mass
            this.player.radius = Math.sqrt(this.player.mass) * 3
            
            // Remove piece from array
            this.playerPieces.splice(i, 1)
            
            console.log(`🔄 Player piece recombined with main! Distance: ${distanceToMain.toFixed(0)}, Combined mass: ${Math.floor(this.player.mass)}, Remaining pieces: ${this.playerPieces.length}`)
            continue // Skip to next piece since this one was removed
          }
        }
        
        // Check recombination between pieces (VERY lenient conditions)
        for (let j = i + 1; j < this.playerPieces.length; j++) {
          const otherPiece = this.playerPieces[j]
          if (piece.recombineReady && otherPiece.recombineReady) {
            const pieceToPieceDistance = Math.sqrt(
              Math.pow(piece.x - otherPiece.x, 2) + 
              Math.pow(piece.y - otherPiece.y, 2)
            )
            
            // Very generous collision detection for piece-to-piece merging
            if (pieceToPieceDistance < (piece.radius + otherPiece.radius) * 1.5) {
              // Always merge into the larger piece (create one bigger circle)
              if (piece.mass >= otherPiece.mass) {
                piece.mass += otherPiece.mass
                piece.radius = Math.sqrt(piece.mass) * 3
                this.playerPieces.splice(j, 1)
                console.log(`🔄 Player pieces merged! Distance: ${pieceToPieceDistance.toFixed(0)}, New mass: ${Math.floor(piece.mass)}, Remaining pieces: ${this.playerPieces.length}`)
              } else {
                otherPiece.mass += piece.mass
                otherPiece.radius = Math.sqrt(otherPiece.mass) * 3
                this.playerPieces.splice(i, 1)
                console.log(`🔄 Player pieces merged! Distance: ${pieceToPieceDistance.toFixed(0)}, New mass: ${Math.floor(otherPiece.mass)}, Remaining pieces: ${this.playerPieces.length}`)
                break
              }
            }
          }
        }
      }
      
      // Update total mass display
      const totalMass = this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0)
      setMass(Math.floor(totalMass))
    }

    updateEnemy(enemy, deltaTime) {
      const now = Date.now()
      const centerX = this.world.width / 2
      const centerY = this.world.height / 2
      const playableRadius = this.currentPlayableRadius
      
      // Update target selection to stay within playable area
      if (now - enemy.lastTargetChange > 3000 + Math.random() * 2000) {
        // Generate new target within the circular playable area
        let targetX, targetY, distance
        do {
          targetX = Math.random() * this.world.width
          targetY = Math.random() * this.world.height
          distance = Math.sqrt(Math.pow(targetX - centerX, 2) + Math.pow(targetY - centerY, 2))
        } while (distance > playableRadius - enemy.radius - 50) // 50px buffer from edge
        
        enemy.targetX = targetX
        enemy.targetY = targetY
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
        
        // Constrain enemies to circular playable boundary (same as player)
        const distanceFromCenter = Math.sqrt(
          Math.pow(enemy.x - centerX, 2) + 
          Math.pow(enemy.y - centerY, 2)
        )
        
        if (distanceFromCenter + enemy.radius > playableRadius) {
          // Push enemy back inside circular boundary
          const angle = Math.atan2(enemy.y - centerY, enemy.x - centerX)
          const maxDistance = playableRadius - enemy.radius
          enemy.x = centerX + Math.cos(angle) * maxDistance
          enemy.y = centerY + Math.sin(angle) * maxDistance
          
          // When hitting boundary, choose a new target toward center
          const angleToCenter = Math.atan2(centerY - enemy.y, centerX - enemy.x)
          const targetDistance = Math.random() * (playableRadius * 0.8) // Target within 80% of playable area
          enemy.targetX = centerX + Math.cos(angleToCenter + (Math.random() - 0.5) * Math.PI) * targetDistance
          enemy.targetY = centerY + Math.sin(angleToCenter + (Math.random() - 0.5) * Math.PI) * targetDistance
          enemy.lastTargetChange = now // Reset target timer
        }
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
      // Skip all collisions if game is not running (prevents being eaten after cash out)
      if (!this.running) return
      
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
        
        if (distance < this.player.radius + enemy.radius - 5) { // Reduced collision buffer from -10 to -5
          // Check spawn protection - no collisions if either player has protection
          if (this.player.spawnProtection || enemy.spawnProtection) {
            continue // Skip collision if anyone has spawn protection
          }
          
          if (this.player.mass > enemy.mass * 1.25) { // Increased threshold from 1.2 to 1.25 for fairer gameplay
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
          } else if (enemy.mass > this.player.mass * 1.25) { // Increased threshold for fairer elimination
            // Enemy eats player - Game Over
            console.log(`💀 Player eliminated by ${enemy.name}! Player mass: ${this.player.mass.toFixed(1)}, Enemy mass: ${enemy.mass.toFixed(1)}`)
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
      
      // Player pieces collision detection
      this.checkPlayerPiecesCollisions()
    }

    checkPlayerPiecesCollisions() {
      // Check collisions for each player piece
      for (let pieceIndex = this.playerPieces.length - 1; pieceIndex >= 0; pieceIndex--) {
        const piece = this.playerPieces[pieceIndex]
        
        // Player pieces eating coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
          const coin = this.coins[i]
          const dx = piece.x - coin.x
          const dy = piece.y - coin.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < piece.radius + coin.radius) {
            piece.mass += coin.value
            piece.radius = Math.sqrt(piece.mass) * 3
            setScore(prev => prev + coin.value)
            this.coins.splice(i, 1)
            
            // Update mission progress for coin collection
            if (typeof updateMissionProgress === 'function') {
              updateMissionProgress('coin_collected', 1)
              updateMissionProgress('mass_reached', piece.mass)
            }
          }
        }
        
        // Player pieces vs enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i]
          const dx = piece.x - enemy.x
          const dy = piece.y - enemy.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < piece.radius + enemy.radius - 10) {
            // Check spawn protection - no collisions if either has protection
            if (enemy.spawnProtection) {
              continue // Skip collision if enemy has spawn protection
            }
            
            if (piece.mass > enemy.mass * 1.25) { // Increased threshold for fairer piece vs enemy gameplay
              // Player piece eats enemy
              piece.mass += enemy.mass * 0.8
              piece.radius = Math.sqrt(piece.mass) * 3
              setScore(prev => prev + Math.floor(enemy.mass))
              setEliminations(prev => prev + 1)
              
              // Remove enemy
              this.enemies.splice(i, 1)
              
              // Respawn enemy elsewhere
              this.spawnEnemy()
              
              // Update mission progress
              if (typeof updateMissionProgress === 'function') {
                updateMissionProgress('elimination', 1)
                updateMissionProgress('mass_reached', piece.mass)
              }
              
              console.log(`🔥 Player piece eliminated enemy! Piece mass: ${Math.floor(piece.mass)}`)
              
            } else if (enemy.mass > piece.mass * 1.35) { // Increased threshold from 1.2 to 1.35 for fairer piece elimination
              // Enemy eats player piece
              enemy.mass += piece.mass * 0.8
              enemy.radius = Math.sqrt(enemy.mass) * 3
              
              // Remove the player piece
              this.playerPieces.splice(pieceIndex, 1)
              
              console.log(`💀 Player piece was eliminated by enemy! Remaining pieces: ${this.playerPieces.length}`)
              
              // Only trigger game over if main player is also very small and vulnerable
              if (this.playerPieces.length === 0 && this.player.mass <= 15) {
                // Game over - no pieces left and main player is critically small
                console.log(`🏁 Game Over - All pieces eliminated and main player critically small (mass: ${this.player.mass})!`)
                this.running = false
                const finalTime = Math.floor((Date.now() - this.gameStartTime) / 1000)
                setTimeSurvived(finalTime)
                this.setTimeSurvived(finalTime)
                setGameOver(true)
              }
              
              break // Exit enemy loop since this piece was destroyed
            }
          }
        }
        
        // Player pieces vs viruses
        for (let i = this.viruses.length - 1; i >= 0; i--) {
          const virus = this.viruses[i]
          const dx = piece.x - virus.x
          const dy = piece.y - virus.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < piece.radius + virus.radius) {
            if (piece.mass > virus.mass) {
              // Player piece hits virus - split the piece further
              if (piece.mass > 40) { // Only split if piece has enough mass
                const halfMass = piece.mass / 2
                
                // Update current piece
                piece.mass = halfMass
                piece.radius = Math.sqrt(piece.mass) * 3
                
                // Create new piece from split
                const newPiece = {
                  x: piece.x + Math.random() * 60 - 30,
                  y: piece.y + Math.random() * 60 - 30,
                  mass: halfMass,
                  radius: Math.sqrt(halfMass) * 3,
                  color: piece.color,
                  name: 'You',
                  speed: piece.speed,
                  targetX: piece.targetX,
                  targetY: piece.targetY,
                  splitTime: Date.now(),
                  recombineReady: false,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6
                }
                
                // Add to pieces array if under limit
                if (this.playerPieces.length < 15) {
                  this.playerPieces.push(newPiece)
                }
                
                console.log(`🦠 Player piece hit virus and split! Now ${this.playerPieces.length + 1} total pieces`)
              }
              
              // Remove the virus
              this.viruses.splice(i, 1)
              
              // Respawn virus elsewhere
              this.spawnVirus()
            }
          }
        }
      }
      
      // Update total mass display including all pieces
      const totalMass = this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0)
      setMass(Math.floor(totalMass))
    }

    updateCamera() {
      // Super snappy camera - move more aggressively toward player
      const targetX = this.player.x - this.canvas.width / 2
      const targetY = this.player.y - this.canvas.height / 2
      
      // Increased from 0.1 to 0.2 for snappier camera
      this.camera.x += (targetX - this.camera.x) * 0.2
      this.camera.y += (targetY - this.camera.y) * 0.2
      
      // Keep camera within world bounds
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
      
      // Draw player and all player pieces only if game is running and no modals are showing
      if (this.running && !this.gameStates.cashOutComplete && !this.gameStates.gameOver) {
        this.drawPlayer(this.player)
        
        // Draw all player pieces
        this.playerPieces.forEach(piece => this.drawPlayer(piece))
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
      
      // Draw cash out progress ring - show ONLY on the actual main player when cashing out
      if (this.gameStates && this.gameStates.isCashingOut && this.gameStates.cashOutProgress > 0) {
        // Only show on the main player (the one controlled by the user)
        // Use strict comparison - main player should be the exact object reference or have name 'You'
        const isMainPlayer = (player === this.player) || (player.name === 'You' && player !== this.enemies.find(e => e.name === 'You'))
        
        if (isMainPlayer) {
          console.log('🎯 Drawing compact cash out ring on main player:', player.name)
          
          const ringRadius = player.radius + 8  // Much smaller - closer to player circle
          const progressAngle = (this.gameStates.cashOutProgress / 100) * Math.PI * 2
          
          // Draw a compact background ring (full circle)
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius, 0, Math.PI * 2)
          this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)' // Semi-transparent background
          this.ctx.lineWidth = 6  // Thinner for compact look
          this.ctx.stroke()
          
          // Draw the main progress arc - bright and compact
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + progressAngle)
          this.ctx.strokeStyle = '#00ff00' // Bright neon green
          this.ctx.lineWidth = 6  // Thinner for compact look
          this.ctx.lineCap = 'round'
          this.ctx.stroke()
          
          // Add a subtle outer glow effect
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius + 2, -Math.PI / 2, -Math.PI / 2 + progressAngle)
          this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)' // Subtle glow
          this.ctx.lineWidth = 3
          this.ctx.lineCap = 'round'
          this.ctx.stroke()
          
          // Add pulsing effect for cash out ring
          const time = Date.now() / 1000
          const pulseIntensity = Math.sin(time * 6) * 0.3 + 0.8 // Subtle pulsing
          this.ctx.globalAlpha = pulseIntensity
          
          // Draw inner glow for cash out
          this.ctx.beginPath()
          this.ctx.arc(player.x, player.y, ringRadius - 2, -Math.PI / 2, -Math.PI / 2 + progressAngle)
          this.ctx.strokeStyle = '#66ff66' // Bright green inner glow
          this.ctx.lineWidth = 3  // Thinner inner glow
          this.ctx.lineCap = 'round'
          this.ctx.stroke()
          
          this.ctx.globalAlpha = 1.0 // Reset alpha
          
          // REMOVED: No more "CASHING OUT" text above player to avoid interference with "You" label
        }
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
      // Check if split is allowed (minimum mass and cooldown)
      if (this.player.mass < 36 || this.splitCooldown > 0) {
        return
      }
      
      // Limit maximum number of pieces (authentic Agar.io limit)
      const currentPieces = 1 + this.playerPieces.length
      if (currentPieces >= 16) {
        return
      }
      
      // Calculate mass for each piece (split in half)
      const halfMass = this.player.mass / 2
      const halfRadius = Math.sqrt(halfMass / Math.PI) * 6
      
      // Calculate direction toward mouse cursor (Agar.io style)
      const dx = this.mouse.worldX - this.player.x
      const dy = this.mouse.worldY - this.player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Normalize direction vector (prevent division by zero)
      let directionX = 0
      let directionY = 0
      if (distance > 0) {
        directionX = dx / distance
        directionY = dy / distance
      } else {
        // Default direction if mouse is exactly on player (shouldn't happen, but safety check)
        directionX = 1
        directionY = 0
      }
      
      // Split distance and velocity (enhanced for visible ejection)
      const splitDistance = 100 // Increased distance pieces are ejected toward mouse
      const splitVelocity = 20 // Increased initial ejection speed for dramatic launch
      
      const newPiece = {
        x: this.player.x + directionX * splitDistance,
        y: this.player.y + directionY * splitDistance,
        mass: halfMass,
        radius: halfRadius,
        color: this.player.color,
        name: 'You',
        speed: this.player.speed,
        targetX: this.mouse.worldX, // Target the mouse position
        targetY: this.mouse.worldY,
        splitTime: Date.now(), // Track when split occurred
        recombineReady: false,
        vx: directionX * splitVelocity, // Initial velocity toward mouse
        vy: directionY * splitVelocity
      }
      
      // Update main player with recoil effect (opposite direction)
      this.player.mass = halfMass
      this.player.radius = halfRadius
      // Small recoil movement in opposite direction
      const recoilDistance = 20
      this.player.x = this.player.x - directionX * recoilDistance
      this.player.y = this.player.y - directionY * recoilDistance
      this.player.targetX = this.mouse.worldX // Keep following mouse
      this.player.targetY = this.mouse.worldY
      
      // Add new piece to array
      this.playerPieces.push(newPiece)
      
      // Update UI
      setMass(Math.floor(this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0)))
      
      // Set cooldown (1 second)
      this.splitCooldown = 60 // 60 frames = ~1 second at 60fps
      
      console.log(`🚀 Player split toward mouse! Now ${currentPieces + 1} pieces. Total mass: ${Math.floor(this.player.mass + this.playerPieces.reduce((sum, piece) => sum + piece.mass, 0))}. Direction: (${directionX.toFixed(2)}, ${directionY.toFixed(2)})`)
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
      if (typeof window !== 'undefined') {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }
    
    setCanvasSize()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', setCanvasSize)
    }

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

    // Pass game states to engine for player visibility control
    const gameStates = {
      cashOutComplete,
      gameOver,
      isCashingOut,
      cashOutProgress
    }

    const game = new GameEngine(canvas, setCheatingBan, setTimeSurvived, selectedSkin, gameStates)
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', setCanvasSize)
      }
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
      
      // Handle SPACE key for splitting
      if (e.key === ' ' && gameStarted && gameRef.current) {
        e.preventDefault() // Prevent page scrolling
        console.log('SPACE pressed - attempting split') // Debug log
        gameRef.current.split()
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

  // Real-time survival timer - updates every second during gameplay
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const survivalTimer = setInterval(() => {
      if (gameRef.current && gameRef.current.gameStartTime) {
        const currentTime = Math.floor((Date.now() - gameRef.current.gameStartTime) / 1000)
        setTimeSurvived(currentTime)
      }
    }, 1000)

    return () => clearInterval(survivalTimer)
  }, [gameStarted, gameOver])

  // Mission timer and survival tracking
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const timer = setInterval(() => {
      setMissionTime(prev => {
        const newTime = prev - 1
        
        // Update survival mission progress
        const survivalSeconds = 60 - newTime
        updateMissionProgress('survival_time', survivalSeconds)
        
        // DO NOT end the game when timer reaches 0 - let player continue playing
        if (newTime <= 0) {
          console.log(`⏰ Mission timer completed! Player survived 60+ seconds and can continue playing`)
          // Reset timer to continue tracking longer survival times
          return 60 // Reset to 60 to track additional survival increments
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameOver])

  const handleSplit = (e) => {
    if (gameRef.current) {
      // Update mouse position before splitting to ensure accurate direction
      if (e && e.clientX !== undefined && e.clientY !== undefined) {
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          
          // Update the game's mouse position with current cursor location
          gameRef.current.mouse.x = e.clientX - rect.left
          gameRef.current.mouse.y = e.clientY - rect.top
          
          // Convert to world coordinates
          gameRef.current.mouse.worldX = gameRef.current.mouse.x + gameRef.current.camera.x
          gameRef.current.mouse.worldY = gameRef.current.mouse.y + gameRef.current.camera.y
          
          // Update player target to match mouse position
          gameRef.current.player.targetX = gameRef.current.mouse.worldX
          gameRef.current.player.targetY = gameRef.current.mouse.worldY
          
          console.log(`🎯 Updated mouse position for split: (${gameRef.current.mouse.worldX.toFixed(0)}, ${gameRef.current.mouse.worldY.toFixed(0)})`)
        }
      }
      
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
        {/* Live Leaderboard - Mobile Optimized */}
        <div 
          style={{ 
            position: 'fixed', 
            top: '10px', 
            left: '10px', 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '2px solid rgba(0, 255, 255, 0.3)',
            borderRadius: isMobile ? '12px' : '6px',
            padding: isMobile ? '12px' : '10px',
            minWidth: isMobile ? '140px' : '160px',
            maxWidth: isMobile ? '160px' : '180px',
            fontFamily: '"Rajdhani", sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ 
            color: '#00ffff', 
            fontSize: isMobile ? '13px' : '14px', 
            fontWeight: '700', 
            marginBottom: isMobile ? '8px' : '10px',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            {isMobile ? '🏆 Top 5' : '💰 Live Leaderboard'}
          </div>
          
          {/* Player Rankings - Dynamic Leaderboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '3px' : '4px', marginBottom: isMobile ? '8px' : '10px' }}>
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
                  padding: isMobile ? '3px 6px' : '4px 8px',
                  backgroundColor: player.isPlayer ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  borderRadius: isMobile ? '6px' : '4px',
                  border: player.isPlayer ? '1px solid rgba(0, 255, 255, 0.3)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
                    <span style={{ 
                      color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#ffffff',
                      fontSize: isMobile ? '10px' : '12px', 
                      fontWeight: '700',
                      minWidth: isMobile ? '12px' : '14px'
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ 
                      color: player.isPlayer ? '#00ffff' : '#ffffff', 
                      fontSize: isMobile ? '10px' : '12px', 
                      fontWeight: '600',
                      maxWidth: isMobile ? '50px' : '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {player.name}
                    </span>
                  </div>
                  <span style={{ 
                    color: '#00ff88', 
                    fontSize: isMobile ? '10px' : '12px', 
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
          if (typeof window === 'undefined') return null
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
        
        {/* Missions Panel - Mobile Optimized */}
        {activeMissions.length > 0 && gameRef.current && gameRef.current.detectCashGame() && (
          <div style={{
            position: 'fixed',
            top: isMobile ? '50%' : '20px',
            left: '50%',
            transform: isMobile ? 'translate(-50%, -50%)' : 'translateX(-50%)',
            zIndex: isMobile ? 2000 : 1000,
            backgroundColor: isMobile ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.85)',
            border: isMobile ? '3px solid rgba(59, 130, 246, 0.8)' : '2px solid rgba(59, 130, 246, 0.6)',
            borderRadius: isMobile ? '16px' : '8px',
            padding: isMobile ? '20px 24px' : '12px 20px',
            fontFamily: '"Rajdhani", sans-serif',
            maxWidth: isMobile ? '300px' : '400px',
            minWidth: isMobile ? '280px' : '320px',
            transition: 'all 0.3s ease',
            boxShadow: isMobile ? '0 10px 40px rgba(59, 130, 246, 0.4)' : 'none'
          }}>
            {/* Mission Display */}
            {(() => {
              const currentMission = activeMissions[currentMissionIndex]
              if (!currentMission) return null
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '20px' : '16px' }}>
                  {/* Mission Icon */}
                  <div style={{
                    width: isMobile ? '50px' : '40px',
                    height: isMobile ? '50px' : '40px',
                    background: currentMission.completed ? 
                      'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)' : 
                      'linear-gradient(45deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: isMobile ? '12px' : '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '22px' : '18px',
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
                      marginBottom: isMobile ? '6px' : '4px'
                    }}>
                      <span style={{
                        color: currentMission.completed ? '#22c55e' : '#ffffff',
                        fontSize: isMobile ? '16px' : '14px',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        {currentMission.name}
                      </span>
                      <span style={{
                        color: '#FFD700',
                        fontSize: isMobile ? '14px' : '12px',
                        fontWeight: '700'
                      }}>
                        +{currentMission.reward}💰
                      </span>
                    </div>
                    
                    <div style={{
                      color: '#a0aec0',
                      fontSize: isMobile ? '13px' : '11px',
                      marginBottom: isMobile ? '8px' : '6px'
                    }}>
                      {currentMission.description}
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: isMobile ? '8px' : '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: isMobile ? '4px' : '3px',
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
                      marginTop: isMobile ? '4px' : '2px'
                    }}>
                      <span style={{
                        color: '#9ca3af',
                        fontSize: isMobile ? '12px' : '10px'
                      }}>
                        {currentMission.progress}/{currentMission.target}
                      </span>
                      {currentMission.completed && (
                        <span style={{
                          color: '#22c55e',
                          fontSize: isMobile ? '12px' : '10px',
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
                    gap: isMobile ? '6px' : '4px'
                  }}>
                    <div style={{
                      color: '#a0aec0',
                      fontSize: isMobile ? '12px' : '10px',
                      textTransform: 'uppercase'
                    }}>
                      Mission
                    </div>
                    <div style={{
                      color: '#ffffff',
                      fontSize: isMobile ? '16px' : '14px',
                      fontWeight: '700'
                    }}>
                      {currentMissionIndex + 1}/{activeMissions.length}
                    </div>
                    <div style={{
                      color: '#FFD700',
                      fontSize: isMobile ? '12px' : '10px',
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

        {/* Action Buttons - Mobile Optimized Circular Design */}
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '20px' : '40px',
          right: isMobile ? '15px' : 'auto',
          transform: isMobile ? 'none' : 'translateX(-50%)',
          left: isMobile ? 'auto' : '50%',
          zIndex: 1000,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '15px' : '12px',
          alignItems: 'center'
        }}>
          {/* Cash Out Button - Circular for mobile, rectangular for desktop */}
          <div 
            style={{
              backgroundColor: 'rgba(255, 165, 0, 0.95)',
              border: '3px solid #ff8c00',
              borderRadius: isMobile ? '50%' : '8px',
              color: '#000000',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: isMobile ? '0' : '12px 24px',
              width: isMobile ? '65px' : 'auto',
              height: isMobile ? '65px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '0' : '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              textAlign: 'center',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: isMobile ? '0 4px 20px rgba(255, 165, 0, 0.6)' : '0 4px 12px rgba(255, 165, 0, 0.4)',
              minWidth: isMobile ? '65px' : '200px',
              position: 'relative',
              overflow: 'hidden',
              flexDirection: isMobile ? 'column' : 'row'
            }}
            onMouseOver={(e) => {
              if (!isCashingOut) {
                e.target.style.backgroundColor = 'rgba(255, 200, 50, 0.98)'
                e.target.style.transform = isMobile ? 'scale(1.05)' : 'translateY(-2px)'
                e.target.style.boxShadow = isMobile ? '0 6px 25px rgba(255, 165, 0, 0.8)' : '0 6px 20px rgba(255, 165, 0, 0.5)'
              }
            }}
            onMouseOut={(e) => {
              if (!isCashingOut) {
                e.target.style.backgroundColor = 'rgba(255, 165, 0, 0.95)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = isMobile ? '0 4px 20px rgba(255, 165, 0, 0.6)' : '0 4px 12px rgba(255, 165, 0, 0.4)'
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
                zIndex: 1,
                borderRadius: isMobile ? '50%' : '0'
              }} />
            )}
            
            {/* Button content */}
            <span style={{ position: 'relative', zIndex: 2, lineHeight: isMobile ? '1.2' : 'normal' }}>
              {isMobile ? (
                // Mobile: Show icon and short text
                isCashingOut ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px' }}>🔥</div>
                    <div style={{ fontSize: '10px', fontWeight: '600' }}>{Math.floor(cashOutProgress)}%</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px' }}>💰</div>
                    <div style={{ fontSize: '9px', fontWeight: '600' }}>CASH</div>
                  </div>
                )
              ) : (
                // Desktop: Show full text
                isCashingOut 
                  ? `🔥 Cashing Out... ${Math.floor(cashOutProgress)}%`
                  : `🔥 Hold E to Cash Out ($${score})`
              )}
            </span>
          </div>

          {/* Split Button - Circular for mobile, rectangular for desktop */}
          <div 
            onClick={(e) => handleSplit(e)}
            style={{
              backgroundColor: 'rgba(0, 100, 255, 0.9)',
              border: '3px solid #0064ff',
              borderRadius: isMobile ? '50%' : '8px',
              color: '#ffffff',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: isMobile ? '0' : '12px 24px',
              width: isMobile ? '65px' : 'auto',
              height: isMobile ? '65px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '0' : '8px',
              transition: 'all 150ms',
              pointerEvents: 'auto',
              fontFamily: '"Rajdhani", sans-serif',
              boxShadow: isMobile ? '0 4px 20px rgba(0, 100, 255, 0.6)' : '0 4px 12px rgba(0, 100, 255, 0.3)',
              flexDirection: isMobile ? 'column' : 'row'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(50, 120, 255, 0.95)'
              e.target.style.transform = isMobile ? 'scale(1.05)' : 'translateY(-2px)'
              e.target.style.boxShadow = isMobile ? '0 6px 25px rgba(0, 100, 255, 0.8)' : '0 6px 20px rgba(0, 100, 255, 0.4)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'rgba(0, 100, 255, 0.9)'
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = isMobile ? '0 4px 20px rgba(0, 100, 255, 0.6)' : '0 4px 12px rgba(0, 100, 255, 0.3)'
            }}
          >
            {isMobile ? (
              // Mobile: Show icon and short text
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '18px' }}>⚡</div>
                <div style={{ fontSize: '9px', fontWeight: '600' }}>SPLIT</div>
              </div>
            ) : (
              // Desktop: Show full text
              '⚡ Split (Space)'
            )}
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
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{Math.floor(mass)}</span>
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
              <span style={{ color: '#ffffff', fontWeight: '700' }}>
                {Math.floor(timeSurvived / 60)}:{(timeSurvived % 60).toString().padStart(2, '0')}
              </span>
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
                  if (typeof window === 'undefined') return null
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
                  if (typeof window === 'undefined') return null
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
                    PLAY AGAIN
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
                    HOME
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
                    PLAY AGAIN
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
                    BACK TO LOBBY
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