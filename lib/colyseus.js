import { Client } from 'colyseus.js'

class TurfLootColyseusClient {
  constructor() {
    this.client = null
    this.room = null
    this.isConnected = false
    this.endpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'ws://localhost:2567'
    
    console.log('🎮 TurfLoot Colyseus Client initialized')
    console.log(`🔗 Endpoint: ${this.endpoint}`)
  }

  async joinArena({ privyUserId, playerName = null }) {
    try {
      console.log('🚀 Connecting to Colyseus server...')
      
      // Create Colyseus client
      this.client = new Client(this.endpoint)
      
      // Join or create an arena room
      this.room = await this.client.joinOrCreate("arena", {
        privyUserId: privyUserId,
        playerName: playerName || `Player_${Math.random().toString(36).substring(7)}`
      })
      
      this.isConnected = true
      
      console.log('✅ Connected to Colyseus arena room')
      console.log(`🎮 Room ID: ${this.room.roomId}`)
      console.log(`👥 Session ID: ${this.room.sessionId}`)
      
      // Set up event listeners
      this.setupEventListeners()
      
      return this.room
      
    } catch (error) {
      console.error('❌ Failed to connect to Colyseus server:', error)
      this.isConnected = false
      throw error
    }
  }

  setupEventListeners() {
    if (!this.room) return

    // Handle state changes
    this.room.onStateChange((state) => {
      console.log('📊 Game state updated:', {
        players: state.players.size,
        coins: state.coins.size,
        viruses: state.viruses.size,
        timestamp: state.timestamp
      })
    })

    // Handle player additions
    this.room.state.players.onAdd((player, sessionId) => {
      console.log(`👋 Player joined: ${player.name} (${sessionId})`)
    })

    // Handle player removals
    this.room.state.players.onRemove((player, sessionId) => {
      console.log(`👋 Player left: ${player.name} (${sessionId})`)
    })

    // Handle connection errors
    this.room.onError((code, message) => {
      console.error('❌ Room error:', code, message)
    })

    // Handle room leave
    this.room.onLeave((code) => {
      console.log('👋 Left room with code:', code)
      this.isConnected = false
    })

    // Handle custom messages
    this.room.onMessage("pong", (message) => {
      const latency = Date.now() - message.clientTimestamp
      console.log(`🏓 Pong received - Latency: ${latency}ms`)
    })
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

// Named export for the helper function
export const joinArena = ({ privyUserId, playerName }) => {
  return colyseusClient.joinArena({ privyUserId, playerName })
}