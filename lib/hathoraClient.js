// TurfLoot Hathora Client Integration
import { LobbyV3Api, RoomV2Api } from '@hathora/cloud-sdk-typescript'

class TurfLootHathoraClient {
  constructor() {
    this.lobbyClient = null
    this.roomClient = null
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
      this.lobbyClient = new LobbyV3Api()
      this.roomClient = new RoomV2Api()
      console.log('🌍 Hathora client initialized successfully')
      console.log(`🎮 App ID: ${this.appId}`)
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Hathora client:', error)
      return false
    }
  }

  // Get optimal server for player (lowest latency) - SIMPLIFIED VERSION
  async getOptimalServer(userId = null) {
    if (!this.client) {
      throw new Error('Hathora client not initialized - cannot get server without Hathora')
    }

    // Create lobby or join existing one
    const lobbyId = await this.createOrJoinRoom(userId)
    
    // Simplified connection info without getConnectionInfo
    return {
      host: 'hathora.dev',
      port: 443,
      roomId: lobbyId,
      isLocal: false,
      region: this.getPreferredRegion()
    }
  }

  // Create or join a room (server process) based on game mode - CREATES ACTUAL HATHORA PROCESSES
  async createOrJoinRoom(userId = null, gameMode = 'practice', stakeAmount = 0) {
    if (!this.client) {
      throw new Error('Hathora client not initialized - cannot create room without Hathora')
    }

    // For TurfLoot, create actual server processes for multiplayer
    console.log(`🌍 Creating Hathora server process for ${gameMode} mode with $${stakeAmount} stake`)
    
    // Create actual room (server process) - this will appear in Hathora console
    const roomConfig = {
      gameMode: gameMode,
      stakeAmount: stakeAmount,
      maxPlayers: gameMode === 'practice' ? 50 : (stakeAmount >= 0.05 ? 4 : 6), // High stakes = fewer players
      roomName: gameMode === 'practice' ? 'Global Practice Arena' : `$${stakeAmount} Cash Game`,
      region: this.getPreferredRegion(),
      isPaidRoom: stakeAmount > 0,
      entryFee: stakeAmount
    }

    console.log('🚀 Creating Hathora room with config:', roomConfig)
    
    try {
      // Use createLobby instead of createRoom (correct client API)
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('Failed to get authentication token from Hathora')
      }

      // Create lobby with proper region mapping
      const mappedRegion = this.mapServerRegionToHathora(roomConfig.region)
      console.log(`🎯 Creating lobby in region: ${mappedRegion}`)
      
      let roomId
      try {
        // Use LobbyV3Api createLobby method (correct API)
        const createLobbyParams = {
          region: mappedRegion,
          visibility: 'public',
          roomConfig: JSON.stringify(roomConfig)
        }
        
        const response = await this.lobbyClient.createLobby(this.appId, createLobbyParams)
        roomId = response.data.roomId
        console.log(`✅ Created Hathora lobby: ${roomId}`)
      } catch (regionError) {
        console.warn(`⚠️ Region-specific creation failed:`, regionError.message)
        // Fallback without region
        const fallbackParams = {
          visibility: 'public',
          roomConfig: JSON.stringify(roomConfig)
        }
        const response = await this.lobbyClient.createLobby(this.appId, fallbackParams)
        roomId = response.data.roomId
        console.log(`✅ Created Hathora lobby (no region): ${roomId}`)
      }

      if (!roomId || typeof roomId !== 'string') {
        throw new Error(`Invalid room ID returned: ${roomId}`)
      }

      // Get connection info immediately after creation
      let connectionInfo = null
      try {
        console.log(`📡 Getting connection info for room: ${roomId}`)
        connectionInfo = await this.getConnectionInfo(roomId)
        console.log(`📊 Connection info:`, connectionInfo)
      } catch (connectionError) {
        console.warn(`⚠️ Failed to get connection info:`, connectionError.message)
      }

      console.log(`🆕 Created Hathora server process: ${roomId}`)
      console.log(`💰 Room type: ${gameMode}, Entry fee: $${stakeAmount}`)
      
      // Return JUST the room ID (not an object) to prevent [object Object] issues
      return roomId
      
    } catch (error) {
      console.error('❌ Failed to create Hathora room:', error)
      throw error
    }
  }

  // Create specific paid room for cash games
  async createPaidRoom(stakeAmount, userId = null, region = null) {
    if (!this.client) {
      throw new Error('Hathora client not initialized - cannot create paid room')
    }

    console.log(`💰 Creating paid Hathora room with $${stakeAmount} stake`)
    
    // Override region if specified, with proper mapping
    let roomRegion
    if (region) {
      roomRegion = this.mapServerRegionToHathora(region)
    } else {
      roomRegion = this.getPreferredRegion()
    }
    console.log(`🌍 Creating paid room in region: ${roomRegion}`)
    
    // Create paid room with specific configuration
    const roomConfig = {
      gameMode: 'cash-game',
      stakeAmount: stakeAmount,
      maxPlayers: stakeAmount >= 0.05 ? 4 : 6, // High stakes rooms have fewer players
      roomName: `$${stakeAmount} Cash Game`,
      region: roomRegion,
      isPaidRoom: true,
      entryFee: stakeAmount,
      userId: userId
    }

    console.log('💰 Creating paid Hathora room with config:', roomConfig)
    
    try {
      console.log('🔐 Attempting anonymous login to Hathora...')
      const token = await this.client.loginAnonymous()
      console.log(`🔑 Login result: ${token ? 'Success' : 'Failed'}`)
      
      if (!token) {
        throw new Error('Failed to get authentication token from Hathora')
      }
      
      // Create lobby with correct API
      console.log(`🌍 Creating Hathora lobby in region: ${roomRegion}`)
      
      let roomId
      try {
        // Use createLobby (correct client API)
        roomId = await this.client.createLobby(token, {
          region: roomRegion,
          visibility: 'public'
        })
        
        console.log(`✅ Created Hathora lobby with region: ${roomId} in ${roomRegion}`)
        
      } catch (regionError) {
        console.log(`⚠️ Region-specific creation failed:`, regionError.message)
        console.log(`🔄 Trying without region...`)
        
        // Fallback without region
        roomId = await this.client.createLobby(token, { visibility: 'public' })
        console.log(`✅ Created Hathora lobby (no region): ${roomId}`)
      }
      
      if (!roomId || typeof roomId !== 'string') {
        throw new Error(`Invalid room ID returned: ${roomId}`)
      }
      
      console.log(`💰 Entry fee: $${stakeAmount}, Max players: ${roomConfig.maxPlayers}`)
      console.log(`🎯 Requested region: ${roomRegion}`)
      
      // Return JUST the room ID to prevent [object Object] issues
      return roomId
      
    } catch (error) {
      console.error('❌ Failed to create paid Hathora room:', error)
      throw error
    }
  }

  // Map server browser region names to Hathora canonical region identifiers
  mapServerRegionToHathora(serverRegion) {
    console.log(`🔍 REGION MAPPING DEBUG: Input region = "${serverRegion}" (type: ${typeof serverRegion})`)
    
    const regionMap = {
      // Standard server regions mapped to Hathora canonical region codes
      'US-East-1': 'us-east-1',
      'US-West-1': 'us-west-1', 
      'US-West-2': 'us-west-2',
      'US-Central-1': 'us-central-1',
      'europe-central': 'europe-central',
      'europe-west': 'europe-west',
      'asia-southeast': 'asia-southeast',
      'asia-east': 'asia-east',
      
      // Legacy mappings for backward compatibility
      'washington-dc': 'us-east-1',
      'seattle': 'us-west-2', 
      'los-angeles': 'us-west-1',
      'frankfurt': 'europe-central',
      'london': 'europe-west',
      'singapore': 'asia-southeast',
      'sydney': 'asia-southeast', // Use asia-southeast for Oceania as closest
      
      // Generic region mappings
      'US': 'us-east-1',
      'EU': 'europe-central',
      'OCE': 'asia-southeast', // Map Oceania to closest available region
      'Asia': 'asia-southeast',
      'Oceania': 'asia-southeast',
      
      // Alternative mappings
      'US East': 'us-east-1',
      'US West': 'us-west-2',
      'Europe': 'europe-central',
      'Europe (Frankfurt)': 'europe-central',
      'Europe (London)': 'europe-west',
      'OCE (Sydney)': 'asia-southeast'
    }
    
    console.log(`🗂️ Available region mappings:`, Object.keys(regionMap))
    
    let mappedRegion = regionMap[serverRegion]
    
    // Handle array of regions (for Europe) - select based on preference or load balancing
    if (Array.isArray(mappedRegion)) {
      // For Europe, alternate between Frankfurt and London for load distribution
      const regionIndex = Math.floor(Math.random() * mappedRegion.length)
      mappedRegion = mappedRegion[regionIndex]
      console.log(`🗺️ Mapping server region "${serverRegion}" to Hathora region "${mappedRegion}" (selected from ${regionMap[serverRegion].join(', ')})`)
    } else if (mappedRegion) {
      console.log(`🗺️ Mapping server region "${serverRegion}" to Hathora region "${mappedRegion}"`)
    } else {
      // Fallback - use default Seattle region and warn
      mappedRegion = 'SEATTLE'
      console.warn(`⚠️ No mapping found for server region "${serverRegion}", using default fallback: "${mappedRegion}"`)
    }
    
    return mappedRegion
  }

  // Get preferred region based on user location
  getPreferredRegion() {
    // Enhanced region detection with Oceania support
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    if (timezone.includes('America')) {
      return timezone.includes('Los_Angeles') || timezone.includes('Vancouver') ? 'seattle' : 'washington-dc'
    } else if (timezone.includes('Europe')) {
      // Enhanced European region selection
      if (timezone.includes('London') || timezone.includes('Dublin') || timezone.includes('Edinburgh')) {
        return 'london' // UK and Ireland get London servers
      } else if (timezone.includes('Paris') || timezone.includes('Madrid') || timezone.includes('Brussels')) {
        return 'london' // Western Europe also gets London for better latency
      } else {
        return 'frankfurt' // Central/Eastern Europe gets Frankfurt
      }
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

      // Create actual room (server process) instead of lobby
      const token = await this.client.loginAnonymous()
      const roomId = await this.client.createPublicLobby(token, { region: this.getPreferredRegion() })
      console.log('🆕 Created Hathora room process for global multiplayer:', roomId)
      
      // Simplified connection info without getConnectionInfo
      const connectionInfo = {
        host: 'hathora.dev',
        port: 443,
        region: this.getPreferredRegion(),
        roomId: roomId
      }
      console.log('📡 Hathora room connection info (simplified):', connectionInfo)
      
      // Connect directly to Hathora WebSocket with proper path and authentication
      let socketUrl
      
      if (token) {
        // Use direct connection with query parameters
        socketUrl = `wss://${connectionInfo.host}:${connectionInfo.port}?token=${token}&roomId=${roomId}`
        console.log('🌍 Connecting to Hathora server with direct connection and query params')
      } else {
        // Fallback to direct connection without authentication
        socketUrl = `wss://${connectionInfo.host}:${connectionInfo.port}`
        console.log('🌍 Connecting to Hathora server with direct connection (no auth)')
      }
      
      console.log('🔗 WebSocket URL:', socketUrl)
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
    
    // Connect directly to Hathora WebSocket with proper path and authentication
    let socketUrl
    
    // Get authentication token first
    const token = await this.client.loginAnonymous()
    
    if (token && finalRoomId) {
      // Use direct connection with query parameters
      socketUrl = `wss://${serverInfo.host}:${serverInfo.port}?token=${token}&roomId=${finalRoomId}`
      console.log('🌍 Connecting to Hathora server with direct connection and query params')
    } else {
      // Fallback to direct connection without authentication
      socketUrl = `wss://${serverInfo.host}:${serverInfo.port}`
      console.log('🌍 Connecting to Hathora server with direct connection (no auth)')
    }
    
    console.log('🔗 WebSocket URL:', socketUrl)
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

  // Get room information and player count from Hathora
  async getRoomInfo(roomId) {
    if (!this.client) {
      console.warn('⚠️ Hathora client not initialized for getRoomInfo')
      return null
    }

    try {
      console.log(`🔍 Querying Hathora room info for: ${roomId}`)
      
      // Use Hathora SDK to get room info
      const roomInfo = await this.client.getRoomInfo(roomId)
      
      if (roomInfo) {
        console.log(`✅ Room ${roomId} info:`, {
          status: roomInfo.status,
          allocations: roomInfo.allocations?.length || 0,
          currentPlayers: roomInfo.currentPlayers || 0
        })
        return roomInfo
      } else {
        console.log(`📭 Room ${roomId} not found or inactive`)
        return null
      }
    } catch (error) {
      // Don't log as error since many rooms won't exist yet
      console.log(`ℹ️ Room ${roomId} not found: ${error.message}`)
      return null
    }
  }

  // Get active rooms list from Hathora
  async getActiveRooms() {
    if (!this.client) {
      console.warn('⚠️ Hathora client not initialized for getActiveRooms')
      return []
    }

    try {
      const rooms = await this.client.listActivePublicLobbies()
      console.log(`📋 Found ${rooms.length} active Hathora rooms`)
      return rooms
    } catch (error) {
      console.warn('⚠️ Failed to get active rooms from Hathora:', error.message)
      return []
    }
  }
}

// Export singleton instance
export const hathoraClient = new TurfLootHathoraClient()
export default hathoraClient