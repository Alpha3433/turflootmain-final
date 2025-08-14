/**
 * TurfLoot Anti-Cheat System
 * Server-side validation and cheat detection
 */

export class AntiCheatSystem {
  constructor() {
    this.suspiciousPlayers = new Map() // Track suspicious activity
    this.playerHistory = new Map() // Store player movement/action history
    this.config = {
      maxSpeed: 1000, // Maximum allowed speed
      maxMassGain: 50, // Maximum mass gain per second
      maxPositionJump: 500, // Maximum position change per tick
      suspicionThreshold: 5, // Strikes before action
      validationInterval: 1000, // Validate every second
      historySize: 10 // Keep last 10 actions
    }
  }

  // Initialize tracking for a new player
  initializePlayer(playerId, initialState) {
    this.playerHistory.set(playerId, {
      positions: [{ x: initialState.x, y: initialState.y, timestamp: Date.now() }],
      massHistory: [{ mass: initialState.mass, timestamp: Date.now() }],
      actions: [],
      lastValidation: Date.now(),
      suspicionLevel: 0
    })
    
    console.log(`🛡️ Anti-cheat initialized for player ${playerId}`)
  }

  // Validate player movement
  validateMovement(playerId, newPosition, deltaTime) {
    const history = this.playerHistory.get(playerId)
    if (!history) return { valid: false, reason: 'No history found' }

    const lastPosition = history.positions[history.positions.length - 1]
    const distance = Math.hypot(newPosition.x - lastPosition.x, newPosition.y - lastPosition.y)
    const timeDiff = (Date.now() - lastPosition.timestamp) / 1000
    const speed = distance / Math.max(timeDiff, 0.016) // Minimum 60 FPS

    // Check for teleportation/speed hacks
    if (speed > this.config.maxSpeed) {
      this.addSuspicion(playerId, 'speed_hack', { 
        speed: speed, 
        maxAllowed: this.config.maxSpeed,
        distance: distance,
        timeDiff: timeDiff 
      })
      return { valid: false, reason: 'Speed too high', speed: speed }
    }

    // Check for impossible position jumps
    if (distance > this.config.maxPositionJump && timeDiff < 1) {
      this.addSuspicion(playerId, 'teleportation', { 
        distance: distance, 
        maxAllowed: this.config.maxPositionJump 
      })
      return { valid: false, reason: 'Position jump too large', distance: distance }
    }

    // Update history
    history.positions.push({ x: newPosition.x, y: newPosition.y, timestamp: Date.now() })
    if (history.positions.length > this.config.historySize) {
      history.positions.shift()
    }

    return { valid: true }
  }

  // Validate mass changes
  validateMassChange(playerId, newMass, expectedMass, reason = 'unknown') {
    const history = this.playerHistory.get(playerId)
    if (!history) return { valid: false, reason: 'No history found' }

    const lastMass = history.massHistory[history.massHistory.length - 1]
    const massGain = newMass - lastMass.mass
    const timeDiff = (Date.now() - lastMass.timestamp) / 1000
    const massGainRate = massGain / Math.max(timeDiff, 0.1)

    // Check for unrealistic mass gains
    if (massGainRate > this.config.maxMassGain && massGain > 0) {
      this.addSuspicion(playerId, 'mass_manipulation', { 
        massGain: massGain, 
        rate: massGainRate, 
        maxAllowed: this.config.maxMassGain,
        reason: reason 
      })
      return { valid: false, reason: 'Mass gain too rapid', rate: massGainRate }
    }

    // Validate against expected mass (from server calculations)
    const massDifference = Math.abs(newMass - expectedMass)
    if (massDifference > 10) { // Allow 10 mass units tolerance
      this.addSuspicion(playerId, 'mass_desync', { 
        clientMass: newMass, 
        serverMass: expectedMass, 
        difference: massDifference 
      })
      return { valid: false, reason: 'Mass desync detected', difference: massDifference }
    }

    // Update history
    history.massHistory.push({ mass: newMass, timestamp: Date.now() })
    if (history.massHistory.length > this.config.historySize) {
      history.massHistory.shift()
    }

    return { valid: true }
  }

  // Validate action frequency (prevent rapid-fire actions)
  validateActionFrequency(playerId, actionType) {
    const history = this.playerHistory.get(playerId)
    if (!history) return { valid: false, reason: 'No history found' }

    const now = Date.now()
    const recentActions = history.actions.filter(action => 
      action.type === actionType && (now - action.timestamp) < 1000
    )

    // Action-specific limits
    const actionLimits = {
      orb_collect: 20, // Max 20 orbs per second
      player_eliminate: 5, // Max 5 eliminations per second
      direction_change: 30 // Max 30 direction changes per second
    }

    const maxAllowed = actionLimits[actionType] || 10
    if (recentActions.length >= maxAllowed) {
      this.addSuspicion(playerId, 'action_spam', { 
        actionType: actionType, 
        count: recentActions.length, 
        maxAllowed: maxAllowed 
      })
      return { valid: false, reason: 'Action frequency too high' }
    }

    // Add action to history
    history.actions.push({ type: actionType, timestamp: now })
    if (history.actions.length > this.config.historySize * 5) {
      history.actions = history.actions.slice(-this.config.historySize * 3) // Keep recent actions
    }

    return { valid: true }
  }

  // Add suspicion to a player
  addSuspicion(playerId, cheatType, details) {
    const suspicion = this.suspiciousPlayers.get(playerId) || {
      playerId: playerId,
      suspicionLevel: 0,
      incidents: [],
      firstIncident: Date.now()
    }

    suspicion.suspicionLevel++
    suspicion.incidents.push({
      type: cheatType,
      timestamp: Date.now(),
      details: details
    })

    this.suspiciousPlayers.set(playerId, suspicion)

    console.warn(`⚠️ Anti-cheat: Player ${playerId} flagged for ${cheatType}`, details)
    console.warn(`⚠️ Suspicion level: ${suspicion.suspicionLevel}/${this.config.suspicionThreshold}`)

    // Auto-kick if threshold reached
    if (suspicion.suspicionLevel >= this.config.suspicionThreshold) {
      return this.executeAction(playerId, 'kick', `Multiple cheat violations detected`)
    }

    return null // No action taken yet
  }

  // Execute anti-cheat action
  executeAction(playerId, actionType, reason) {
    const suspicion = this.suspiciousPlayers.get(playerId)
    
    const action = {
      playerId: playerId,
      action: actionType,
      reason: reason,
      timestamp: Date.now(),
      incidents: suspicion?.incidents || []
    }

    console.error(`🚨 Anti-cheat action: ${actionType} for player ${playerId} - ${reason}`)

    return action
  }

  // Get player suspicion status
  getPlayerStatus(playerId) {
    const suspicion = this.suspiciousPlayers.get(playerId)
    const history = this.playerHistory.get(playerId)
    
    return {
      playerId: playerId,
      suspicionLevel: suspicion?.suspicionLevel || 0,
      isClean: !suspicion || suspicion.suspicionLevel === 0,
      incidents: suspicion?.incidents || [],
      historySize: history?.positions?.length || 0
    }
  }

  // Clean up old data
  cleanup(maxAge = 300000) { // 5 minutes
    const cutoff = Date.now() - maxAge
    
    // Clean suspicious players
    for (const [playerId, suspicion] of this.suspiciousPlayers) {
      if (suspicion.firstIncident < cutoff) {
        this.suspiciousPlayers.delete(playerId)
      }
    }

    // Clean player history
    for (const [playerId, history] of this.playerHistory) {
      if (history.lastValidation < cutoff) {
        this.playerHistory.delete(playerId)
      }
    }
  }

  // Get system statistics
  getStatistics() {
    return {
      trackedPlayers: this.playerHistory.size,
      suspiciousPlayers: this.suspiciousPlayers.size,
      totalIncidents: Array.from(this.suspiciousPlayers.values())
        .reduce((sum, player) => sum + player.incidents.length, 0),
      config: this.config
    }
  }

  // Server-side collision detection
  validateCollision(playerA, playerB, collisionType) {
    // Calculate server-side collision
    const distance = Math.hypot(playerA.x - playerB.x, playerA.y - playerB.y)
    const radiusA = Math.sqrt(playerA.mass) * 1.2
    const radiusB = Math.sqrt(playerB.mass) * 1.2
    
    const shouldCollide = distance < Math.max(radiusA, radiusB)
    
    if (collisionType === 'elimination' && shouldCollide) {
      // Validate elimination is fair
      const massRatio = Math.max(playerA.mass, playerB.mass) / Math.min(playerA.mass, playerB.mass)
      if (massRatio < 1.15) {
        // Too close in mass for elimination
        return { valid: false, reason: 'Mass difference too small for elimination' }
      }
    }

    return { 
      valid: shouldCollide, 
      serverDistance: distance, 
      serverRadiusA: radiusA, 
      serverRadiusB: radiusB 
    }
  }
}

// Export singleton instance
export const antiCheat = new AntiCheatSystem()