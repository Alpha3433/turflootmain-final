/**
 * Enhanced Game Synchronization System
 * Handles real-time action synchronization between clients and server
 */

export class GameSynchronizer {
  constructor(io) {
    this.io = io
    this.syncQueue = new Map() // Per-room sync queues
    this.playerStates = new Map() // Authoritative player states
    this.config = {
      tickRate: 30, // Server tick rate (30 FPS)
      maxLatency: 200, // Maximum allowed latency (ms)
      interpolationBuffer: 100, // Client-side interpolation buffer (ms)
      reconciliationWindow: 500 // Time window for client reconciliation (ms)
    }
    
    this.startSyncLoop()
  }

  // Initialize synchronization for a room
  initializeRoom(roomId) {
    this.syncQueue.set(roomId, {
      actions: [], // Queued actions to process
      lastSync: Date.now(),
      playerPositions: new Map(),
      gameEvents: []
    })
    
    console.log(`🔄 Sync initialized for room ${roomId}`)
  }

  // Queue a player action for synchronization
  queueAction(roomId, playerId, action) {
    const roomSync = this.syncQueue.get(roomId)
    if (!roomSync) return

    const timestamp = Date.now()
    const syncAction = {
      id: `${playerId}_${timestamp}_${Math.random()}`,
      playerId: playerId,
      type: action.type,
      data: action.data,
      timestamp: timestamp,
      clientTimestamp: action.clientTimestamp || timestamp,
      processed: false
    }

    roomSync.actions.push(syncAction)
    
    // Validate action based on type
    this.validateAction(roomId, syncAction)
  }

  // Validate incoming actions
  async validateAction(roomId, action) {
    switch (action.type) {
      case 'player_move':
        return this.validateMovement(roomId, action)
      case 'orb_collect':
        return this.validateOrbCollection(roomId, action)
      case 'player_eliminate':
        return this.validateElimination(roomId, action)
      default:
        return true
    }
  }

  // Validate player movement
  validateMovement(roomId, action) {
    const { playerId, data } = action
    const { position, direction, timestamp } = data
    
    const lastPosition = this.getLastValidPosition(roomId, playerId)
    if (!lastPosition) return true // First movement

    // Calculate expected position based on server state
    const timeDiff = (timestamp - lastPosition.timestamp) / 1000
    const maxDistance = this.calculateMaxDistance(playerId, timeDiff)
    const actualDistance = Math.hypot(
      position.x - lastPosition.x,
      position.y - lastPosition.y
    )

    if (actualDistance > maxDistance * 1.2) { // 20% tolerance
      console.warn(`⚠️ Invalid movement for ${playerId}: ${actualDistance} > ${maxDistance}`)
      this.handleInvalidAction(roomId, playerId, 'invalid_movement', {
        expected: maxDistance,
        actual: actualDistance
      })
      return false
    }

    // Update authoritative position
    this.updatePlayerState(roomId, playerId, {
      position: position,
      direction: direction,
      timestamp: timestamp
    })

    return true
  }

  // Validate orb collection
  validateOrbCollection(roomId, action) {
    const { playerId, data } = action
    const { orbId, playerPosition } = data
    
    // Get server-side orb position
    const orb = this.getOrbById(roomId, orbId)
    if (!orb) {
      this.handleInvalidAction(roomId, playerId, 'invalid_orb', { orbId })
      return false
    }

    // Validate collection distance
    const distance = Math.hypot(
      playerPosition.x - orb.x,
      playerPosition.y - orb.y
    )
    const playerRadius = this.getPlayerRadius(roomId, playerId)
    
    if (distance > playerRadius + 20) { // 20 unit tolerance
      this.handleInvalidAction(roomId, playerId, 'invalid_collection', {
        distance,
        maxDistance: playerRadius + 20
      })
      return false
    }

    // Valid collection - process server-side
    this.processOrbCollection(roomId, playerId, orbId)
    return true
  }

  // Process synchronized actions
  processSyncQueue(roomId) {
    const roomSync = this.syncQueue.get(roomId)
    if (!roomSync) return

    const now = Date.now()
    const actionsToProcess = roomSync.actions
      .filter(action => !action.processed)
      .sort((a, b) => a.timestamp - b.timestamp) // Process in chronological order

    const processedActions = []

    for (const action of actionsToProcess) {
      try {
        // Process action based on type
        const result = this.executeAction(roomId, action)
        
        if (result.success) {
          action.processed = true
          processedActions.push({
            ...action,
            serverTimestamp: now,
            result: result.data
          })
        } else {
          // Handle failed action
          this.handleFailedAction(roomId, action, result.error)
        }
      } catch (error) {
        console.error(`Error processing action ${action.id}:`, error)
        this.handleFailedAction(roomId, action, error.message)
      }
    }

    // Broadcast synchronized state
    if (processedActions.length > 0) {
      this.broadcastSyncUpdate(roomId, processedActions)
    }

    // Clean up processed actions
    roomSync.actions = roomSync.actions.filter(action => !action.processed)
  }

  // Execute a validated action
  executeAction(roomId, action) {
    switch (action.type) {
      case 'player_move':
        return this.executeMovement(roomId, action)
      case 'orb_collect':
        return this.executeOrbCollection(roomId, action)
      case 'player_eliminate':
        return this.executeElimination(roomId, action)
      default:
        return { success: false, error: 'Unknown action type' }
    }
  }

  // Execute player movement
  executeMovement(roomId, action) {
    const { playerId, data } = action
    const playerState = this.playerStates.get(playerId)
    
    if (!playerState) {
      return { success: false, error: 'Player state not found' }
    }

    // Update authoritative state
    playerState.position = data.position
    playerState.direction = data.direction
    playerState.lastUpdate = Date.now()

    return {
      success: true,
      data: {
        playerId: playerId,
        position: data.position,
        direction: data.direction
      }
    }
  }

  // Execute orb collection
  executeOrbCollection(roomId, action) {
    const { playerId, data } = action
    const { orbId } = data
    
    // Remove orb from game state
    const orb = this.removeOrb(roomId, orbId)
    if (!orb) {
      return { success: false, error: 'Orb already collected' }
    }

    // Update player mass/score
    this.updatePlayerMass(roomId, playerId, orb.value)

    return {
      success: true,
      data: {
        playerId: playerId,
        orbId: orbId,
        massGain: orb.value,
        newMass: this.getPlayerMass(roomId, playerId)
      }
    }
  }

  // Broadcast synchronized updates to all clients
  broadcastSyncUpdate(roomId, processedActions) {
    const syncUpdate = {
      timestamp: Date.now(),
      actions: processedActions,
      playerStates: this.getPlayerStates(roomId),
      gameEvents: this.getGameEvents(roomId)
    }

    this.io.to(roomId).emit('sync_update', syncUpdate)
  }

  // Handle lag compensation
  compensateForLatency(roomId, playerId, action) {
    const playerLatency = this.getPlayerLatency(playerId)
    const serverTime = Date.now()
    const adjustedTimestamp = action.clientTimestamp + (playerLatency / 2)
    
    // Rewind game state to the adjusted timestamp
    const historicalState = this.getHistoricalState(roomId, adjustedTimestamp)
    
    // Validate action against historical state
    const isValid = this.validateActionAgainstState(action, historicalState)
    
    if (!isValid) {
      // Send correction to client
      this.sendCorrection(playerId, {
        actionId: action.id,
        correctState: this.getCurrentState(roomId, playerId),
        serverTime: serverTime
      })
      return false
    }

    return true
  }

  // Send correction to client for desync
  sendCorrection(playerId, correction) {
    this.io.to(playerId).emit('sync_correction', correction)
    console.warn(`📡 Sent sync correction to player ${playerId}`)
  }

  // Calculate interpolation data for smooth movement
  calculateInterpolation(roomId, playerId) {
    const history = this.getPlayerHistory(roomId, playerId, 3) // Last 3 positions
    if (history.length < 2) return null

    const latest = history[0]
    const previous = history[1]
    const timeDiff = latest.timestamp - previous.timestamp

    if (timeDiff === 0) return null

    return {
      velocity: {
        x: (latest.position.x - previous.position.x) / timeDiff,
        y: (latest.position.y - previous.position.y) / timeDiff
      },
      position: latest.position,
      timestamp: latest.timestamp
    }
  }

  // Start the main synchronization loop
  startSyncLoop() {
    setInterval(() => {
      for (const roomId of this.syncQueue.keys()) {
        this.processSyncQueue(roomId)
      }
    }, 1000 / this.config.tickRate) // 30 FPS

    console.log('🔄 Game synchronization loop started')
  }

  // Utility methods
  getLastValidPosition(roomId, playerId) {
    const roomSync = this.syncQueue.get(roomId)
    return roomSync?.playerPositions.get(playerId) || null
  }

  updatePlayerState(roomId, playerId, state) {
    let playerState = this.playerStates.get(playerId)
    if (!playerState) {
      playerState = { position: { x: 0, y: 0 }, direction: { x: 0, y: 0 } }
      this.playerStates.set(playerId, playerState)
    }
    
    Object.assign(playerState, state)
  }

  handleInvalidAction(roomId, playerId, reason, details) {
    console.warn(`⚠️ Invalid action from ${playerId}: ${reason}`, details)
    
    // Send correction to client
    this.sendCorrection(playerId, {
      reason: reason,
      details: details,
      correctState: this.getCurrentState(roomId, playerId)
    })
  }

  getGameStatistics(roomId) {
    const roomSync = this.syncQueue.get(roomId)
    if (!roomSync) return null

    return {
      roomId: roomId,
      queuedActions: roomSync.actions.length,
      trackedPlayers: roomSync.playerPositions.size,
      lastSync: roomSync.lastSync,
      avgLatency: this.calculateAverageLatency(roomId)
    }
  }

  cleanup(roomId) {
    this.syncQueue.delete(roomId)
    console.log(`🧹 Cleaned up sync data for room ${roomId}`)
  }
}

// Export singleton instance
export const gameSynchronizer = new GameSynchronizer()