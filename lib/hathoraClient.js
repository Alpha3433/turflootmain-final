// TurfLoot Hathora Client Integration
import { HathoraClient } from '@hathora/client-sdk'

class TurfLootHathoraClient {
  constructor() {
    this.client = null
    this.appId = process.env.NEXT_PUBLIC_HATHORA_APP_ID
    this.isHathoraEnabled = !!this.appId
    this.currentConnection = null
  }

  // Initialize Hathora client
  async initialize() {
    if (!this.isHathoraEnabled) {
      console.log('⚠️ Hathora not configured - check NEXT_PUBLIC_HATHORA_APP_ID')
      return false
    }

    try {
      this.client = new HathoraClient(this.appId)
      console.log('🌍 Hathora client initialized successfully')
      console.log(`🎮 App ID: ${this.appId}`)
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Hathora client:', error)
      return false
    }
  }

  // Get optimal server for player (lowest latency) - HATHORA LOBBY SERVICE ONLY
  async getOptimalServer(userId = null) {
    if (!this.client) {
      throw new Error('Hathora client not initialized - cannot get server without Hathora')
    }

    // Create lobby or join existing one
    const lobbyId = await this.createOrJoinRoom(userId)
    const connectionInfo = await this.client.getLobbyInfo(lobbyId)
    
    return {
      host: connectionInfo.host,
      port: connectionInfo.port,
      roomId: lobbyId,
      isLocal: false,
      region: connectionInfo.region
    }
  }

  // Create or join a room (server process) based on game mode - CREATES ACTUAL HATHORA PROCESSES
  async createOrJoinRoom(userId = null, gameMode = 'practice') {
    if (!this.client) {
      throw new Error('Hathora client not initialized - cannot create room without Hathora')
    }

    // For TurfLoot, create actual server processes for multiplayer
    console.log('🌍 Creating Hathora server process for multiplayer')
    
    // Create actual room (server process) - this will appear in Hathora console
    const roomConfig = {
      gameMode: gameMode,
      maxPlayers: gameMode === 'practice' ? 50 : 8,
      roomName: gameMode === 'practice' ? 'Global Practice Arena' : 'TurfLoot Match',
      region: this.getPreferredRegion()
    }

    console.log('🚀 Creating Hathora room with config:', roomConfig)
    
    // Use createRoom instead of createLobby to create actual server process
    const roomId = await this.client.createRoom(roomConfig, this.getPreferredRegion())
    console.log(`🆕 Created Hathora server process: ${roomId} in region ${this.getPreferredRegion()}`)
    return roomId
  }

  // Get preferred region based on user location
  getPreferredRegion() {
    // Enhanced region detection with Oceania support
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    if (timezone.includes('America')) {
      return timezone.includes('Los_Angeles') || timezone.includes('Vancouver') ? 'seattle' : 'washington-dc'
    } else if (timezone.includes('Europe')) {
      return timezone.includes('London') || timezone.includes('Dublin') ? 'london' : 'frankfurt'
    } else if (timezone.includes('Asia')) {
      if (timezone.includes('Tokyo') || timezone.includes('Japan')) return 'tokyo'
      if (timezone.includes('Singapore') || timezone.includes('Malaysia')) return 'singapore'
      if (timezone.includes('India') || timezone.includes('Kolkata')) return 'mumbai'
      return 'singapore' // Default for other Asian countries
    } else if (timezone.includes('Australia') || timezone.includes('Pacific') || timezone.includes('Auckland')) {
      return 'sydney' // Oceania region for Australia & New Zealand
    }
    
    return 'washington-dc' // Default fallback
  }

  // Connect to Socket.IO - CREATES ACTUAL HATHORA PROCESSES for real multiplayer
  async connectToGame(gameConfig = {}) {
    const { userId, roomId: requestedRoomId } = gameConfig
    
    console.log('🔌 Connecting to game with config:', { userId, requestedRoomId })
    
    // FIXED: CREATE ACTUAL HATHORA ROOM PROCESSES - NOT LOBBIES
    if (requestedRoomId === 'global-practice-bots' || requestedRoomId?.includes('global')) {
      console.log('🌍 Global Multiplayer detected - CREATING HATHORA ROOM PROCESS')
      
      // Initialize Hathora client if not already done
      if (!this.client) {
        const initialized = await this.initialize()
        if (!initialized) {
          throw new Error('Hathora client initialization failed - cannot proceed without Hathora')
        }
      }

      console.log('🚀 Creating Hathora room process for global multiplayer...')
      
      // Create actual room (server process) instead of lobby
      const roomConfig = {
        gameMode: 'practice',
        maxPlayers: 50,
        roomName: 'Global Multiplayer Arena',
        isGlobalRoom: true
      }

      const roomId = await this.client.createRoom(roomConfig, this.getPreferredRegion())
      console.log('🆕 Created Hathora room process for global multiplayer:', roomId)
      
      // Get connection info for the new room
      const connectionInfo = await this.client.getConnectionInfo(roomId)
      console.log('📡 Hathora room connection info:', connectionInfo)
      
      // Connect directly to Hathora WebSocket (no Socket.IO)
      const socketUrl = `wss://${connectionInfo.host}:${connectionInfo.port}`
      console.log('🌍 Connecting directly to Hathora server process:', socketUrl)
      
      const socket = new WebSocket(socketUrl)
      
      // Add Socket.IO-like methods for compatibility
      socket.send = (data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(typeof data === 'string' ? data : JSON.stringify(data))
        }
      }
      
      socket.on = (event, handler) => {
        if (event === 'message') {
          socket.addEventListener('message', (e) => {
            try {
              const data = JSON.parse(e.data)
              handler(data)
            } catch (err) {
              handler(e.data)
            }
          })
        } else if (event === 'open') {
          socket.addEventListener('open', handler)
        } else if (event === 'close') {
          socket.addEventListener('close', handler)
        } else if (event === 'error') {
          socket.addEventListener('error', handler)
        }
      }
      
      socket.disconnect = () => socket.close()
      socket.connected = false
      
      socket.addEventListener('open', () => {
        socket.connected = true
        console.log('✅ Direct WebSocket connection established')
      })
      
      socket.addEventListener('close', () => {
        socket.connected = false
        console.log('🔌 WebSocket connection closed')
      })
      
      socket.addEventListener('error', (error) => {
        console.error('❌ WebSocket error:', error)
      })

      this.currentConnection = {
        socket,
        serverInfo: {
          host: connectionInfo.host,
          port: connectionInfo.port,
          isLocal: false,
          region: connectionInfo.region,
          roomId: roomId,
          isHathoraProcess: true,
          note: 'Real Hathora room process for global multiplayer'
        },
        roomId: roomId
      }

      console.log('✅ Hathora Global Multiplayer room connection established:', {
        socketUrl,
        roomId: roomId,
        serverType: 'Hathora Room Process',
        region: connectionInfo.region
      })

      return {
        socket,
        serverInfo: this.currentConnection.serverInfo,
        roomId: roomId
      }
    }
    
    // For other room types, use Hathora direct WebSocket - NO SOCKET.IO
    const serverInfo = await this.getOptimalServer(userId)
    
    // Use the requested roomId from Server Browser or URL params
    const finalRoomId = requestedRoomId || serverInfo.roomId
    
    console.log('🎮 Final lobby configuration:', {
      requestedRoomId,
      serverRoomId: serverInfo.roomId,
      finalRoomId,
      serverHost: serverInfo.host,
      serverPort: serverInfo.port
    })
    
    // Connect directly to Hathora WebSocket (no Socket.IO)
    const socketUrl = `wss://${serverInfo.host}:${serverInfo.port}`
    const socket = new WebSocket(socketUrl)
    
    // Add Socket.IO-like methods for compatibility
    socket.send = (data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(typeof data === 'string' ? data : JSON.stringify(data))
      }
    }
    
    socket.on = (event, handler) => {
      if (event === 'message') {
        socket.addEventListener('message', (e) => {
          try {
            const data = JSON.parse(e.data)
            handler(data)
          } catch (err) {
            handler(e.data)
          }
        })
      } else if (event === 'open') {
        socket.addEventListener('open', handler)
      } else if (event === 'close') {
        socket.addEventListener('close', handler)
      } else if (event === 'error') {
        socket.addEventListener('error', handler)
      }
    }
    
    socket.disconnect = () => socket.close()
    socket.connected = false
    
    socket.addEventListener('open', () => {
      socket.connected = true
    })
    
    socket.addEventListener('close', () => {
      socket.connected = false
    })

    this.currentConnection = {
      socket,
      serverInfo: {
        ...serverInfo,
        roomId: finalRoomId
      },
      roomId: finalRoomId
    }

    console.log('✅ Hathora direct WebSocket connection established:', {
      socketUrl,
      lobbyId: finalRoomId,
      serverRegion: serverInfo.region
    })

    return {
      socket,
      serverInfo: {
        ...serverInfo,
        roomId: finalRoomId
      },
      roomId: finalRoomId
    }
  }

  // Disconnect from current game
  disconnect() {
    if (this.currentConnection?.socket) {
      this.currentConnection.socket.disconnect()
      this.currentConnection = null
      console.log('🔌 Disconnected from Hathora server')
    }
  }

  // Get connection status
  isConnected() {
    return this.currentConnection?.socket?.connected || false
  }

  // Get current room info
  getCurrentRoom() {
    return this.currentConnection?.roomId || null
  }
}

// Export singleton instance
export const hathoraClient = new TurfLootHathoraClient()
export default hathoraClient