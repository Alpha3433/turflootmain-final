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

  async joinArena({ privyUserId, playerName = null, specificRoomId = null }) {
    try {
      console.log('🚀 Connecting to Colyseus server...')
      console.log('👤 Player info:', { privyUserId, playerName })
      
      // Create Colyseus client 
      this.client = new Client(this.endpoint)
      
      // Use joinOrCreate with required fields that the server expects
      console.log('🎯 Joining global TurfLoot arena...')
      
      this.room = await this.client.joinOrCreate("arena", {
        // Include required fields that server expects to prevent 4002 errors
        playerName: playerName || 'Anonymous Player',
        privyUserId: privyUserId || 'anonymous-' + Date.now()
      })
      
      this.isConnected = true
      
      console.log('✅ Connected to Colyseus arena room')
      console.log(`🎮 Room ID: ${this.room.roomId}`)
      console.log(`👥 Session ID: ${this.room.sessionId}`)
      console.log(`👤 Player name will be: ${playerName}`)
      
      // Send player info after joining
      if (playerName || privyUserId) {
        this.room.send("playerInfo", {
          playerName: playerName || 'Anonymous Player',
          privyUserId: privyUserId
        })
      }
      
      // Set up event listeners using official Colyseus Cloud documentation approach
      this.setupEventListeners()
      
      // Add connection monitoring
      this.room.onLeave((code) => {
        console.warn('⚠️ Left Colyseus room with code:', code)
        this.isConnected = false
      })
      
      this.room.onError((code, message) => {
        console.error('❌ Colyseus room error:', { code, message })
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
      
      // Handle players using official Colyseus Cloud documentation approach
      if (state && state.players) {
        // Use the official pattern for listening to collection changes
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
      }

      // Handle coins if they exist in state
      if (state && state.coins) {
        state.coins.onAdd = (coin, key) => {
          console.log(`🪙 Coin spawned: ${key}`)
        }

        state.coins.onRemove = (coin, key) => {
          console.log(`🪙 Coin collected: ${key}`)
        }
      }

      // Handle game objects if they exist
      if (state && state.gameObjects) {
        state.gameObjects.onAdd = (obj, key) => {
          console.log(`🎯 Game object added: ${key}`)
        }

        state.gameObjects.onRemove = (obj, key) => {
          console.log(`🎯 Game object removed: ${key}`)
        }
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

// Named export for the helper function
export const joinArena = ({ privyUserId, playerName, specificRoomId }) => {
  return colyseusClient.joinArena({ privyUserId, playerName, specificRoomId })
}