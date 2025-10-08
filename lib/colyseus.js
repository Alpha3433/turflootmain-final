import { Client } from 'colyseus.js'

class TurfLootColyseusClient {
  constructor() {
    this.client = null
    this.room = null
    this.isConnected = false
    this.endpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud'
    
    console.log('🎮 TurfLoot Colyseus Client initialized')
    console.log(`🔗 Endpoint: ${this.endpoint}`)
  }

  async joinArena({ privyUserId, playerName = null, specificRoomId = null, stakeAmount = 0, isAuthenticated = false, endpoint = null }) {
    try {
      console.log('🚀 Connecting to Colyseus server...')
      console.log('👤 Player info:', { privyUserId, playerName })

      const targetEndpoint = endpoint || this.endpoint
      if (!targetEndpoint) {
        throw new Error('No Colyseus endpoint configured')
      }

      if (this.endpoint !== targetEndpoint) {
        console.log('🔁 Updating Colyseus endpoint:', targetEndpoint)
        this.endpoint = targetEndpoint
      }

      // Create Colyseus client
      this.client = new Client(this.endpoint)
      
      // Use joinOrCreate with required fields that the server expects
      console.log('🎯 Joining global TurfLoot arena...')
      
      const normalizedStake = typeof stakeAmount === 'string'
        ? parseFloat(stakeAmount)
        : stakeAmount

      const joinOptions = {
        // Include required fields that server expects to prevent 4002 errors
        playerName: playerName || 'Anonymous Player',
        privyUserId: privyUserId || 'anonymous-' + Date.now(),
        stakeAmount: Number.isFinite(normalizedStake) ? normalizedStake : 0,
        isAuthenticated
      }

      if (specificRoomId) {
        joinOptions.roomName = specificRoomId
      }

      this.room = await this.client.joinOrCreate("arena", joinOptions)
      
      this.isConnected = true
      
      console.log('✅ Connected to Colyseus arena room')
      console.log(`🎮 Room ID: ${this.room.roomId}`)
      console.log(`👥 Session ID: ${this.room.sessionId}`)
      console.log(`👤 Connected as: ${playerName || 'Anonymous Player'}`)
      
      // Set up event listeners using official Colyseus Cloud documentation approach
      this.setupEventListeners()
      
      // Add connection stability monitoring with detailed error information
      this.room.onLeave((code) => {
        console.warn('⚠️ Left Colyseus room with code:', code)
        console.warn('📊 Leave code meanings: 1000=normal, 4000=room full, 4001=unauthorized, 4002=invalid options, 4003=room not found')
        this.isConnected = false
      })
      
      this.room.onError((code, message) => {
        console.error('❌ Colyseus room error:', { code, message })
        console.error('📊 Error details - Code:', code, 'Message:', message)
      })
      
      return this.room
      
    } catch (error) {
      console.error('❌ Failed to connect to Colyseus server:', error)
      this.isConnected = false
      throw error
    }
  }

  setupEventListeners() {
    if (!this.room) return;

    this.room.onStateChange((state) => {
      
      console.log('🎮 Colyseus room state updated')
      console.log('*** DEBUGGING *** Full state object:', state)
      console.log('*** DEBUGGING *** State players:', state.players)
      console.log('*** DEBUGGING *** Players size (MapSchema):', state.players ? state.players.size : 'no players')
      console.log('*** DEBUGGING *** State type:', typeof state)
      
      // Handle players using MapSchema methods (not regular object methods)
      if (state && state.players) {
        console.log('*** DEBUGGING *** Processing MapSchema players...')
        
        // MapSchema uses different iteration - use forEach instead of onAdd/onRemove
        let playerCount = 0
        state.players.forEach((player, sessionId) => {
          playerCount++
          console.log(`👤 *** FOUND PLAYER *** ${sessionId}:`, {
            name: player?.name || player?.playerName || 'No Name',
            alive: player?.alive,
            x: player?.x,
            y: player?.y,
            mass: player?.mass,
            radius: player?.radius
          })
        })
        
        console.log(`*** DEBUGGING *** Actually found ${playerCount} real players via forEach`)
        
        // Still set up the onAdd/onRemove for new players joining/leaving
        state.players.onAdd = (player, sessionId) => {
          const playerName = player?.name || player?.playerName || 'Unknown Player'
          console.log(`👋 Player joined: ${playerName} (${sessionId})`)
        }

        state.players.onRemove = (player, sessionId) => {
          const playerName = player?.name || player?.playerName || 'Player'
          console.log(`👋 Player left: ${playerName} (${sessionId})`)
        }

        state.players.onChange = (player, sessionId) => {
          const playerName = player?.name || player?.playerName || 'Player'
          console.log(`🔄 Player updated: ${playerName} (${sessionId})`)
        }
      } else {
        console.log('*** DEBUGGING *** No players in state or state.players is undefined')
      }

      // Handle coins with MapSchema
      if (state && state.coins) {
        console.log('*** DEBUGGING *** State has coins (MapSchema):', state.coins.size)
        state.coins.onAdd = (coin, key) => {
          console.log(`🪙 Coin spawned: ${key}`)
        }

        state.coins.onRemove = (coin, key) => {
          console.log(`🪙 Coin collected: ${key}`)
        }
      } else {
        console.log('*** DEBUGGING *** No coins in state')
      }
    })

    // Handle room messages using official documentation pattern
    this.room.onMessage("*", (type, message) => {
      console.log(`📨 Received message [${type}]:`, message)
    })

    // Log room join confirmation
    console.log('✅ Event listeners set up using Colyseus Cloud documentation standards')
  }

  // Send input to the server
  sendInput(seq, dx, dy) {
    if (!this.room || !this.isConnected) {
      console.warn('⚠️ Cannot send input: not connected to room')
      return
    }

    this.room.send("input", {
      seq: seq,
      dx: dx,
      dy: dy
    })
  }

  // Send ping for latency measurement
  sendPing() {
    if (!this.room || !this.isConnected) return

    this.room.send("ping", {
      timestamp: Date.now()
    })
  }

  // Leave the room
  leave() {
    if (this.room) {
      this.room.leave()
      this.room = null
    }
    this.isConnected = false
    console.log('👋 Disconnected from Colyseus server')
  }

  // Get current game state
  getGameState() {
    return this.room?.state || null
  }

  // Get player by session ID
  getPlayer(sessionId) {
    return this.room?.state?.players?.get(sessionId) || null
  }

  // Get current player (self)
  getCurrentPlayer() {
    return this.getPlayer(this.room?.sessionId)
  }

  // Get all players as array
  getAllPlayers() {
    if (!this.room?.state?.players) return []
    
    const players = []
    this.room.state.players.forEach((player, sessionId) => {
      players.push({ ...player, sessionId })
    })
    return players
  }

  // Get leaderboard
  getLeaderboard() {
    const players = this.getAllPlayers()
    return players
      .filter(p => p.alive)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        score: p.score,
        mass: Math.round(p.mass)
      }))
  }
}

// Export singleton instance
const colyseusClient = new TurfLootColyseusClient()
export default colyseusClient

// Named export for the class
export { TurfLootColyseusClient }

// Named export for the helper function
export const joinArena = ({ privyUserId, playerName, specificRoomId }) => {
  return colyseusClient.joinArena({ privyUserId, playerName, specificRoomId })
}