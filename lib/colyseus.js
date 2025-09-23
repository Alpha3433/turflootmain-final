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
      
      // Strategy: Try to join a specific fixed room ID first
      const FIXED_ROOM_ID = "TurfLoot-Global-Arena-24-7"
      
      try {
        console.log('🎯 Attempting to join fixed room ID:', FIXED_ROOM_ID)
        
        // Try to join the specific fixed room first
        this.room = await this.client.joinById(FIXED_ROOM_ID, {
          playerName: playerName || 'Anonymous Player',
          privyUserId: privyUserId || 'anonymous-' + Date.now()
        })
        
        console.log('✅ Successfully joined fixed room:', FIXED_ROOM_ID)
        
      } catch (joinError) {
        console.log('⚠️ Fixed room not found, creating new room with fixed ID...')
        
        try {
          // Create a room with the fixed ID
          this.room = await this.client.create("arena", {
            roomName: "global-turfloot-arena",
            playerName: playerName || 'Anonymous Player',
            privyUserId: privyUserId || 'anonymous-' + Date.now(),
            isFixedRoom: true
          })
          
          console.log('🏗️ Created new room with ID:', this.room.roomId)
          
        } catch (createError) {
          console.log('⚠️ Create failed, falling back to joinOrCreate...')
          
          // Final fallback
          this.room = await this.client.joinOrCreate("arena", {
            roomName: "global-turfloot-arena",
            playerName: playerName || 'Anonymous Player',
            privyUserId: privyUserId || 'anonymous-' + Date.now()
          })
          
          console.log('🔄 Fallback: Connected via joinOrCreate')
        }
      }
      
      this.isConnected = true
      
      console.log('✅ Connected to Colyseus arena room')
      console.log(`🎮 Room ID: ${this.room.roomId}`)
      console.log(`👥 Session ID: ${this.room.sessionId}`)
      console.log(`👤 Connected as: ${playerName}`)
      
      // Set up event listeners
      this.setupEventListeners()
      
      // Add connection stability monitoring
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
      console.log('📊 Arena state updated');
      // Handle null safety for state properties
      if (state) {
        console.log(`👥 Players: ${state.players?.size || 0}`);
        console.log(`🪙 Coins: ${state.coins?.size || 0}`);
        console.log(`🦠 Viruses: ${state.viruses?.size || 0}`);
      }
    });

    // Set up schema listeners when state is first available
    this.room.onStateChange.once((state) => {
      if (state && state.players) {
        // Handle player additions - USE ASSIGNMENT, NOT FUNCTION CALL
        state.players.onAdd = (player, sessionId) => {
          console.log(`👋 Player joined: ${player.name || 'Unknown'} (${sessionId})`);
        };

        // Handle player removals
        state.players.onRemove = (player, sessionId) => {
          console.log(`👋 Player left: ${sessionId}`);
        };

        // Handle player changes
        state.players.onChange = (player, sessionId) => {
          console.log(`🔄 Player updated: ${sessionId}`);
        };
      }

      // Handle coins if they exist
      if (state && state.coins) {
        state.coins.onAdd = (coin, key) => {
          console.log(`🪙 Coin spawned: ${key}`);
        };

        state.coins.onRemove = (coin, key) => {
          console.log(`🪙 Coin collected: ${key}`);
        };
      }

      // Handle viruses if they exist
      if (state && state.viruses) {
        state.viruses.onAdd = (virus, key) => {
          console.log(`🦠 Virus spawned: ${key}`);
        };

        state.viruses.onRemove = (virus, key) => {
          console.log(`🦠 Virus removed: ${key}`);
        };
      }
    });

    this.room.onMessage('gameState', (message) => {
      console.log('🎮 Game state message:', message);
    });

    this.room.onMessage('playerJoined', (message) => {
      console.log('👤 Player joined:', message);
    });

    this.room.onMessage('playerLeft', (message) => {
      console.log('👋 Player left:', message);
    });

    this.room.onError((code, message) => {
      console.error('🚨 Room error:', code, message);
    });

    this.room.onLeave((code) => {
      console.log('🚪 Left room with code:', code);
      this.isConnected = false;
    });
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