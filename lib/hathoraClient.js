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

  // Get optimal server for player (lowest latency)
  async getOptimalServer(userId = null) {
    if (!this.client) {
      // Fallback to local server
      return {
        host: process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3000',
        port: 3000,
        isLocal: true
      }
    }

    try {
      // Create room or join existing one
      const roomId = await this.createOrJoinRoom(userId)
      const connectionInfo = await this.client.getRoomInfo(roomId)
      
      return {
        host: connectionInfo.host,
        port: connectionInfo.port,
        roomId: roomId,
        isLocal: false,
        region: connectionInfo.region
      }
    } catch (error) {
      console.error('❌ Failed to get optimal server:', error)
      // Fallback to local
      return {
        host: process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3000', 
        port: 3000,
        isLocal: true
      }
    }
  }

  // Create or join a room based on game mode
  async createOrJoinRoom(userId = null, gameMode = 'practice') {
    if (!this.client) return 'global-practice-bots' // Fallback to global room

    try {
      // For TurfLoot, always use global practice room for cross-platform play
      if (gameMode === 'practice') {
        console.log('🌍 Joining global practice room for worldwide multiplayer')
        
        // Try to find existing global practice room
        const rooms = await this.client.getRooms()
        const practiceRooms = rooms.filter(room => 
          room.gameMode === 'practice' && room.players < room.maxPlayers
        )
        
        if (practiceRooms.length > 0) {
          console.log('🎮 Found existing global practice room:', practiceRooms[0].id)
          return practiceRooms[0].id
        }
      }

      // Create new room if none found
      const roomConfig = {
        visibility: 'public',
        region: this.getPreferredRegion(),
        roomConfig: {
          gameMode: gameMode,
          maxPlayers: 20,
          roomName: gameMode === 'practice' ? 'Global Practice Arena' : 'TurfLoot Match'
        }
      }

      const roomId = await this.client.createRoom(roomConfig, userId)
      console.log(`🆕 Created new ${gameMode} room: ${roomId}`)
      return roomId
      
    } catch (error) {
      console.error('❌ Failed to create/join room:', error)
      return 'global-practice-bots' // Always fallback to practice room
    }
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

  // Connect to Socket.IO through Hathora with specific room support
  async connectToGame(gameConfig = {}) {
    const { userId, roomId: requestedRoomId } = gameConfig
    
    console.log('🔌 Connecting to game with config:', { userId, requestedRoomId })
    
    // FIXED: For global-practice-bots, use proper Hathora lobby creation
    if (requestedRoomId === 'global-practice-bots') {
      console.log('🌍 Global Multiplayer detected - creating Hathora lobby')
      
      try {
        // Use Hathora client to create/join a shared lobby
        console.log('🎮 Authenticating with Hathora...')
        const token = await this.client.loginAnonymous()
        console.log('✅ Hathora authentication successful')
        
        // Try to find existing public lobbies first
        console.log('🔍 Looking for existing global multiplayer lobby...')
        const existingLobbies = await this.client.getPublicLobbies(token)
        console.log(`📋 Found ${existingLobbies.length} existing lobbies`)
        
        let lobbyToJoin = null
        
        // Look for existing global multiplayer lobby
        for (const lobby of existingLobbies) {
          console.log(`🏠 Checking lobby: ${lobby.roomId} in ${lobby.region}`)
          if (lobby.region === 'sydney' || lobby.region === 'washington-dc') {
            lobbyToJoin = lobby
            console.log('✅ Found existing global multiplayer lobby to join')
            break
          }
        }
        
        // Create new lobby if none exists
        if (!lobbyToJoin) {
          console.log('🆕 Creating new global multiplayer lobby...')
          lobbyToJoin = await this.client.createPublicLobby(token, 'sydney', {
            gameMode: 'practice',
            maxPlayers: 50,
            roomName: 'Global Multiplayer (Oceania)'
          })
          console.log('✅ New lobby created')
        }
        
        // Get connection details for the lobby
        console.log('🔌 Getting connection details...')
        const connectionInfo = await this.client.getConnectionDetailsForRoomId(token, lobbyToJoin.roomId)
        
        if (!connectionInfo?.exposedPort?.host) {
          throw new Error('Failed to get connection details from Hathora')
        }
        
        console.log('🌐 Hathora connection details:', {
          host: connectionInfo.exposedPort.host,
          port: connectionInfo.exposedPort.port,
          roomId: lobbyToJoin.roomId
        })
        
        // Import Socket.IO client
        const { io } = await import('socket.io-client')
        
        // Connect to the Hathora server
        const socketUrl = `ws://${connectionInfo.exposedPort.host}:${connectionInfo.exposedPort.port}`
        
        const socket = io(socketUrl, {
          transports: ['websocket'],
          timeout: 15000,
          forceNew: false,
          ...gameConfig.socketOptions
        })

        this.currentConnection = {
          socket,
          serverInfo: {
            host: connectionInfo.exposedPort.host,
            port: connectionInfo.exposedPort.port,
            isLocal: false,
            region: lobbyToJoin.region || 'oceania',
            roomId: lobbyToJoin.roomId,
            hathoraLobby: true
          },
          roomId: lobbyToJoin.roomId
        }

        console.log('✅ Global Multiplayer Hathora connection established:', {
          socketUrl,
          roomId: lobbyToJoin.roomId,
          region: lobbyToJoin.region
        })

        return {
          socket,
          serverInfo: this.currentConnection.serverInfo,
          roomId: lobbyToJoin.roomId
        }
        
      } catch (error) {
        console.error('❌ Hathora connection failed:', error.message)
        console.log('🔄 Falling back to local server...')
        
        // Fallback to local server
        return this.connectToLocalFallback(requestedRoomId, gameConfig)
      }
    }
    
    // For other room types, use the original Hathora logic or fallback
    try {
      const serverInfo = await this.getOptimalServer(userId)
      
      // Use the requested roomId from Server Browser or URL params
      const finalRoomId = requestedRoomId || serverInfo.roomId || 'global-practice-bots'
      
      console.log('🎮 Final room configuration:', {
        requestedRoomId,
        serverRoomId: serverInfo.roomId,
        finalRoomId,
        serverHost: serverInfo.host,
        serverPort: serverInfo.port
      })
      
      // Import Socket.IO client
      const { io } = await import('socket.io-client')
      
      const socketUrl = serverInfo.isLocal 
        ? `http://${serverInfo.host}` 
        : `wss://${serverInfo.host}:${serverInfo.port}`

      const socket = io(socketUrl, {
        transports: ['websocket'],
        timeout: 10000,
        forceNew: true,
        ...gameConfig.socketOptions
      })

      this.currentConnection = {
        socket,
        serverInfo: {
          ...serverInfo,
          roomId: finalRoomId
        },
        roomId: finalRoomId
      }

      console.log('✅ Hathora connection established:', {
        socketUrl,
        roomId: finalRoomId,
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
    } catch (error) {
      console.error('❌ Standard Hathora connection failed:', error.message)
      return this.connectToLocalFallback(requestedRoomId, gameConfig)
    }
  }

  // Fallback connection to local server
  async connectToLocalFallback(roomId, gameConfig) {
    console.log('🔄 Using local server fallback for room:', roomId)
    
    const { io } = await import('socket.io-client')
    const socketUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 15000,
      forceNew: false,
      ...gameConfig.socketOptions
    })

    this.currentConnection = {
      socket,
      serverInfo: {
        host: socketUrl.replace('http://', '').replace('https://', ''),
        port: 3000,
        isLocal: true,
        region: 'local-fallback',
        roomId: roomId
      },
      roomId: roomId
    }

    console.log('✅ Local fallback connection established')
    return {
      socket,
      serverInfo: this.currentConnection.serverInfo,
      roomId: roomId
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