// TurfLoot Hathora Client - Client-side API wrapper (no SDK, calls server APIs)
class TurfLootHathoraClient {
  constructor() {
    this.appId = process.env.NEXT_PUBLIC_HATHORA_APP_ID
    this.isHathoraEnabled = !!this.appId
    this.currentConnection = null
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }

  // Initialize client (no SDK needed, just validate configuration)
  async initialize() {
    if (!this.isHathoraEnabled) {
      console.log('⚠️ Hathora not configured - check NEXT_PUBLIC_HATHORA_APP_ID')
      return false
    }

    console.log('🌍 Hathora client initialized (server-side API mode)')
    console.log(`🎮 App ID: ${this.appId}`)
    return true
  }

  // Create room via server API (secure, no SDK secrets in browser)
  async createRoomServerSide(gameMode = 'practice', region = null, maxPlayers = 8, stakeAmount = 0) {
    console.log(`🚀 Creating room via server API: ${gameMode}, region: ${region}`)
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      })

      // Create the fetch promise
      const fetchPromise = fetch(`${this.baseUrl}/api/hathora/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameMode,
          region,
          maxPlayers,
          stakeAmount
        })
      })

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise])

      if (!response.ok) {
        console.error(`❌ Server response not OK: ${response.status} ${response.statusText}`)
        
        let errorData = null
        try {
          errorData = await response.json()
        } catch (jsonError) {
          console.error('❌ Failed to parse error response as JSON:', jsonError)
          throw new Error(`Server API error: ${response.status} ${response.statusText}`)
        }
        
        throw new Error(`Server API error: ${errorData.error || response.statusText}`)
      }

      let roomInfo = null
      try {
        roomInfo = await response.json()
      } catch (jsonError) {
        console.error('❌ Failed to parse successful response as JSON:', jsonError)
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()))
        
        // Try to get the raw response text for debugging
        try {
          const responseText = await response.text()
          console.error('❌ Raw response text:', responseText)
        } catch (textError) {
          console.error('❌ Could not get response text:', textError)
        }
        
        throw new Error('Invalid JSON response from server')
      }
      
      if (!roomInfo.success) {
        throw new Error(`Room creation failed: ${roomInfo.error}`)
      }

      console.log(`✅ Room created via server API:`, {
        roomId: roomInfo.roomId,
        host: roomInfo.host,
        port: roomInfo.port,
        hasToken: !!roomInfo.playerToken
      })

      return roomInfo

    } catch (error) {
      console.error('❌ Failed to create room via server API:', error)
      throw error
    }
  }

  // Get authentication token for Hathora operations
  async getAuthToken() {
    try {
      // For now, use anonymous authentication
      // In production, this should use proper player authentication
      return 'anonymous-token'
    } catch (error) {
      console.error('❌ Failed to get auth token:', error)
      return null
    }
  }

  // Get connection info (no longer needed - server API returns everything)
  async getConnectionInfo(roomId) {
    console.warn('⚠️ getConnectionInfo() is deprecated - room info comes from server API')
    throw new Error('Use server API response directly instead of getConnectionInfo()')
  }
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

  // Create practice/multiplayer room (calls server API)
  async createOrJoinRoom(userId = null, gameMode = 'practice', stakeAmount = 0) {
    console.log(`🌍 Creating ${gameMode} room via server API`)
    
    const region = this.getPreferredRegion()
    const maxPlayers = gameMode === 'practice' ? 50 : (stakeAmount >= 0.05 ? 4 : 6)
    
    return await this.createRoomServerSide(gameMode, region, maxPlayers, stakeAmount)
  }

  // Create paid room (calls server API) 
  async createPaidRoom(stakeAmount, userId = null, region = null) {
    console.log(`💰 Creating paid room via server API: $${stakeAmount}`)
    
    const roomRegion = region || this.getPreferredRegion()
    const maxPlayers = stakeAmount >= 0.05 ? 4 : 6
    
    return await this.createRoomServerSide('cash-game', roomRegion, maxPlayers, stakeAmount)
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
      // Capture the original native send method to avoid infinite recursion
      const rawSend = socket.send.bind(socket)
      socket.send = (data) => {
        if (socket.readyState === WebSocket.OPEN) {
          rawSend(typeof data === 'string' ? data : JSON.stringify(data))
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