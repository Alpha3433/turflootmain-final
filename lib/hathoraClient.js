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

  // Create or join a lobby based on game mode - HATHORA LOBBY SERVICE ONLY
  async createOrJoinRoom(userId = null, gameMode = 'practice') {
    if (!this.client) {
      throw new Error('Hathora client not initialized - cannot create lobby without Hathora')
    }

    // For TurfLoot, always use global practice lobby for cross-platform play
    if (gameMode === 'practice') {
      console.log('🌍 Joining global practice lobby for worldwide multiplayer')
      
      // Try to find existing global practice lobbies
      const lobbies = await this.client.getLobbies()
      const practiceLobbies = lobbies.filter(lobby => 
        lobby.roomConfig && 
        JSON.parse(lobby.roomConfig).gameMode === 'practice' && 
        lobby.numPlayers < JSON.parse(lobby.roomConfig).maxPlayers
      )
      
      if (practiceLobbies.length > 0) {
        console.log('🎮 Found existing global practice lobby:', practiceLobbies[0].lobbyId)
        return practiceLobbies[0].lobbyId
      }
    }

    // Create new lobby if none found
    const lobbyConfig = {
      visibility: 'public',
      region: this.getPreferredRegion(),
      roomConfig: {
        gameMode: gameMode,
        maxPlayers: 20,
        roomName: gameMode === 'practice' ? 'Global Practice Arena' : 'TurfLoot Match'
      }
    }

    const lobbyId = await this.client.createLobby(lobbyConfig, userId)
    console.log(`🆕 Created new ${gameMode} lobby: ${lobbyId}`)
    return lobbyId
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

  // Connect to Socket.IO - ONLY HATHORA PROCESSES for global multiplayer
  async connectToGame(gameConfig = {}) {
    const { userId, roomId: requestedRoomId } = gameConfig
    
    console.log('🔌 Connecting to game with config:', { userId, requestedRoomId })
    
    // FIXED: ONLY CREATE HATHORA PROCESSES - NO FALLBACKS - USE LOBBY SERVICE
    if (requestedRoomId === 'global-practice-bots') {
      console.log('🌍 Global Multiplayer detected - HATHORA LOBBY ONLY (no fallbacks)')
      
      // Initialize Hathora client if not already done
      if (!this.client) {
        const initialized = await this.initialize()
        if (!initialized) {
          throw new Error('Hathora client initialization failed - cannot proceed without Hathora')
        }
      }

      console.log('🚀 Creating Hathora lobby for global multiplayer...')
      
      // Use CreateLobby instead of CreateRoom for client-side operations
      const lobbyConfig = {
        visibility: 'public',
        region: this.getPreferredRegion(),
        roomConfig: {
          gameMode: 'practice',
          maxPlayers: 50,
          roomName: 'Global Multiplayer Arena',
          isGlobalRoom: true
        }
      }

      const lobbyId = await this.client.createLobby(lobbyConfig, userId)
      console.log('🆕 Created Hathora lobby for global multiplayer:', lobbyId)
      
      // Get connection info for the new lobby
      const connectionInfo = await this.client.getLobbyInfo(lobbyId)
      console.log('📡 Hathora lobby connection info:', connectionInfo)
      
      // Import Socket.IO client
      const { io } = await import('socket.io-client')
      
      // Connect to the actual Hathora server
      const socketUrl = `wss://${connectionInfo.host}:${connectionInfo.port}`
      console.log('🌍 Connecting to Hathora server:', socketUrl)
      
      const socket = io(socketUrl, {
        transports: ['websocket'],
        timeout: 15000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        ...gameConfig.socketOptions
      })

      this.currentConnection = {
        socket,
        serverInfo: {
          host: connectionInfo.host,
          port: connectionInfo.port,
          isLocal: false,
          region: connectionInfo.region,
          roomId: lobbyId,
          isHathoraProcess: true,
          note: 'Real Hathora lobby process for global multiplayer'
        },
        roomId: lobbyId
      }

      console.log('✅ Hathora Global Multiplayer lobby connection established:', {
        socketUrl,
        lobbyId: lobbyId,
        serverType: 'Hathora Lobby Process',
        region: connectionInfo.region
      })

      return {
        socket,
        serverInfo: this.currentConnection.serverInfo,
        roomId: lobbyId
      }
    }
    
    // For other room types, use Hathora only - NO FALLBACKS
    const serverInfo = await this.getOptimalServer(userId)
    
    // Use the requested roomId from Server Browser or URL params
    const finalRoomId = requestedRoomId || serverInfo.roomId
    
    console.log('🎮 Final room configuration:', {
      requestedRoomId,
      serverRoomId: serverInfo.roomId,
      finalRoomId,
      serverHost: serverInfo.host,
      serverPort: serverInfo.port
    })
    
    // Import Socket.IO client
    const { io } = await import('socket.io-client')
    
    const socketUrl = `wss://${serverInfo.host}:${serverInfo.port}`

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