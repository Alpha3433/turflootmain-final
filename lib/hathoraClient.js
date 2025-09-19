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

  // Connect to Socket.IO - CONNECTS TO SINGLE SEATTLE SERVER
  async connectToGame(gameConfig = {}) {
    const { userId, roomId: requestedRoomId } = gameConfig
    
    console.log('🔌 Connecting to single Seattle server with config:', { userId, requestedRoomId })
    
    // Fixed Seattle Server Connection Info (from user provided data)
    const seattleServerInfo = {
      host: 'mpl7ff.edge.hathora.dev',
      port: 50283,
      processId: 'cb88bc37-ecec-4688-8966-4d3d438a3242',
      appId: 'app-ad240461-f9c1-4c9b-9846-8b9cbcaa1298',
      deploymentId: 'dep-7cc6db21-9d5e-4086-b5d8-984f1f1e2ddb',
      buildId: 'bld-30739381-fd81-462f-97d7-377979f6918f',
      region: 'seattle',
      roomId: 'seattle-main-server'
    }
    
    console.log('🏔️ Connecting to Seattle server:', seattleServerInfo)
    
    // Connect directly to the Seattle Hathora server
    const socketUrl = `wss://${seattleServerInfo.host}:${seattleServerInfo.port}`
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
      console.log('✅ Seattle server WebSocket connection established')
    })
    
    socket.addEventListener('close', () => {
      socket.connected = false
      console.log('🔌 Seattle server WebSocket connection closed')
    })
    
    socket.addEventListener('error', (error) => {
      console.error('❌ Seattle server WebSocket error:', error)
    })

    this.currentConnection = {
      socket,
      serverInfo: {
        host: seattleServerInfo.host,
        port: seattleServerInfo.port,
        isLocal: false,
        region: seattleServerInfo.region,
        roomId: seattleServerInfo.roomId,
        processId: seattleServerInfo.processId,
        isSeattleServer: true,
        note: 'Fixed Seattle Hathora server'
      },
      roomId: seattleServerInfo.roomId
    }

    console.log('✅ Seattle server connection established:', {
      socketUrl,
      roomId: seattleServerInfo.roomId,
      serverType: 'Fixed Seattle Server',
      region: seattleServerInfo.region
    })

    return {
      socket,
      serverInfo: this.currentConnection.serverInfo,
      roomId: seattleServerInfo.roomId
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
    console.warn('⚠️ getRoomInfo() is not available in client-side wrapper')
    console.log('💡 Use server API endpoints to get room information instead')
    
    // Since this is a client-side wrapper, we don't have direct access to Hathora SDK
    // Room info should be retrieved through server API calls
    try {
      console.log(`🔍 Note: Room info for ${roomId} should be queried via server API`)
      
      // Return null since this method shouldn't be used in client-side code
      // Server-side APIs should handle room info queries
      return null
      
    } catch (error) {
      console.log(`ℹ️ Room ${roomId} info not available via client: ${error.message}`)
      return null
    }
  }

  // Get active rooms list from Hathora
  async getActiveRooms() {
    console.warn('⚠️ getActiveRooms() is not available in client-side wrapper')
    console.log('💡 Use server API endpoints to get active room list instead')
    
    // Since this is a client-side wrapper, we don't have direct access to Hathora SDK
    // Active rooms should be retrieved through server API calls like /api/servers
    try {
      console.log('🔍 Note: Active rooms should be queried via server API endpoints')
      
      // Return empty array since this method shouldn't be used in client-side code
      // Server-side APIs should handle active room queries
      return []
      
    } catch (error) {
      console.warn('⚠️ Failed to get active rooms from client wrapper:', error.message)
      return []
    }
  }
}

// Export singleton instance
export const hathoraClient = new TurfLootHathoraClient()
export default hathoraClient