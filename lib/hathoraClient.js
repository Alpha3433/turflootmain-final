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

  // Connect to Socket.IO through Hathora
  async connectToGame(gameConfig = {}) {
    const serverInfo = await this.getOptimalServer(gameConfig.userId)
    
    console.log('🔌 Connecting to server:', serverInfo)
    
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
      serverInfo,
      roomId: serverInfo.roomId
    }

    return {
      socket,
      serverInfo,
      roomId: serverInfo.roomId || gameConfig.roomId
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