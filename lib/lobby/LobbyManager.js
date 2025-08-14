/**
 * TurfLoot Lobby Management System
 * Handles lobby creation, joining, and match allocation
 */

import { MongoClient } from 'mongodb'
import crypto from 'crypto'

class LobbyManager {
  constructor() {
    this.lobbies = new Map() // In-memory cache for active lobbies
    this.userSessions = new Map() // Track user presence
    this.regions = ['na', 'eu', 'oce', 'asia']
  }

  // Initialize lobby manager
  async initialize(io, mongoUrl) {
    this.io = io
    this.client = new MongoClient(mongoUrl)
    await this.client.connect()
    this.db = this.client.db('turfloot_db')
    
    console.log('🎮 Lobby Manager initialized')
    
    // Clean up old lobbies on startup
    await this.cleanupOldLobbies()
  }

  // Generate unique lobby ID
  generateLobbyId() {
    return crypto.randomUUID()
  }

  // Generate 6-character join code for private lobbies
  generateJoinCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase()
  }

  // Create a new lobby
  async createLobby(hostUserId, options = {}) {
    try {
      const lobbyId = this.generateLobbyId()
      const {
        name = `${options.hostName || 'Player'}'s Lobby`,
        type = 'PUBLIC',
        region = 'na',
        maxPlayers = 2
      } = options

      // Validate region
      if (!this.regions.includes(region)) {
        throw new Error('INVALID_REGION')
      }

      // Check if user is already in a lobby
      if (this.getUserCurrentLobby(hostUserId)) {
        throw new Error('ALREADY_IN_LOBBY')
      }

      // Generate join code for private lobbies
      const joinCode = type === 'PRIVATE' ? this.generateJoinCode() : null

      // Create lobby object
      const lobby = {
        id: lobbyId,
        hostUserId: hostUserId,
        name: name,
        type: type,
        region: region,
        joinCode: joinCode,
        status: 'OPEN',
        maxPlayers: Math.min(maxPlayers, 2), // Enforce max 2 players
        createdAt: new Date(),
        updatedAt: new Date(),
        players: [{
          userId: hostUserId,
          name: options.hostName || 'Player',
          role: 'HOST',
          ready: false,
          joinedAt: new Date()
        }]
      }

      // Store in database
      await this.db.collection('lobbies').insertOne({
        id: lobbyId,
        host_user_id: hostUserId,
        name: name,
        type: type,
        region: region,
        join_code: joinCode,
        status: 'OPEN',
        max_players: lobby.maxPlayers,
        created_at: lobby.createdAt,
        updated_at: lobby.updatedAt
      })

      // Add host as member
      await this.db.collection('lobby_members').insertOne({
        id: crypto.randomUUID(),
        lobby_id: lobbyId,
        user_id: hostUserId,
        role: 'HOST',
        ready: false,
        joined_at: lobby.createdAt
      })

      // Store in memory cache
      this.lobbies.set(lobbyId, lobby)
      
      // Track user presence
      this.userSessions.set(hostUserId, {
        lobbyId: lobbyId,
        socketId: null,
        inMatch: false
      })

      console.log(`🎮 Lobby created: ${lobbyId} by ${hostUserId}`)
      return { lobby, joinCode }

    } catch (error) {
      console.error('❌ Error creating lobby:', error)
      throw error
    }
  }

  // Join an existing lobby
  async joinLobby(userId, options = {}) {
    try {
      const { lobbyId, joinCode, userName = 'Player' } = options

      let lobby = null

      // Find lobby by ID or join code
      if (lobbyId) {
        lobby = this.lobbies.get(lobbyId)
      } else if (joinCode) {
        // Find by join code
        for (const [id, lobbyData] of this.lobbies) {
          if (lobbyData.joinCode === joinCode) {
            lobby = lobbyData
            break
          }
        }
      }

      if (!lobby) {
        throw new Error('LOBBY_NOT_FOUND')
      }

      // Check lobby status
      if (lobby.status !== 'OPEN') {
        throw new Error('LOBBY_NOT_OPEN')
      }

      // Check if lobby is full
      if (lobby.players.length >= lobby.maxPlayers) {
        throw new Error('LOBBY_FULL')
      }

      // Check if user is already in this lobby
      if (lobby.players.find(p => p.userId === userId)) {
        throw new Error('ALREADY_IN_LOBBY')
      }

      // Check if user is in another lobby
      if (this.getUserCurrentLobby(userId)) {
        throw new Error('ALREADY_IN_LOBBY')
      }

      // Add player to lobby
      const player = {
        userId: userId,
        name: userName,
        role: 'MEMBER',
        ready: false,
        joinedAt: new Date()
      }

      lobby.players.push(player)
      lobby.updatedAt = new Date()

      // Update database
      await this.db.collection('lobby_members').insertOne({
        id: crypto.randomUUID(),
        lobby_id: lobby.id,
        user_id: userId,
        role: 'MEMBER',
        ready: false,
        joined_at: player.joinedAt
      })

      // Update memory cache
      this.lobbies.set(lobby.id, lobby)

      // Track user presence
      this.userSessions.set(userId, {
        lobbyId: lobby.id,
        socketId: null,
        inMatch: false
      })

      console.log(`👥 Player ${userId} joined lobby ${lobby.id}`)
      return lobby

    } catch (error) {
      console.error('❌ Error joining lobby:', error)
      throw error
    }
  }

  // Leave a lobby
  async leaveLobby(userId, lobbyId) {
    try {
      const lobby = this.lobbies.get(lobbyId)
      if (!lobby) {
        throw new Error('LOBBY_NOT_FOUND')
      }

      // Remove player from lobby
      const playerIndex = lobby.players.findIndex(p => p.userId === userId)
      if (playerIndex === -1) {
        throw new Error('NOT_IN_LOBBY')
      }

      const isHost = lobby.players[playerIndex].role === 'HOST'
      lobby.players.splice(playerIndex, 1)

      // Remove from database
      await this.db.collection('lobby_members').deleteOne({
        lobby_id: lobbyId,
        user_id: userId
      })

      // If host left and there are other players, assign new host
      if (isHost && lobby.players.length > 0) {
        lobby.players[0].role = 'HOST'
        lobby.hostUserId = lobby.players[0].userId
        
        // Update database
        await this.db.collection('lobbies').updateOne(
          { id: lobbyId },
          { $set: { host_user_id: lobby.hostUserId } }
        )

        await this.db.collection('lobby_members').updateOne(
          { lobby_id: lobbyId, user_id: lobby.hostUserId },
          { $set: { role: 'HOST' } }
        )
      }

      // If lobby is empty, close it
      if (lobby.players.length === 0) {
        await this.closeLobby(lobbyId)
      } else {
        lobby.updatedAt = new Date()
        this.lobbies.set(lobbyId, lobby)
      }

      // Remove user presence
      this.userSessions.delete(userId)

      console.log(`👋 Player ${userId} left lobby ${lobbyId}`)
      return lobby

    } catch (error) {
      console.error('❌ Error leaving lobby:', error)
      throw error
    }
  }

  // Update player ready status
  async updatePlayerReady(userId, lobbyId, ready) {
    try {
      const lobby = this.lobbies.get(lobbyId)
      if (!lobby) {
        throw new Error('LOBBY_NOT_FOUND')
      }

      const player = lobby.players.find(p => p.userId === userId)
      if (!player) {
        throw new Error('NOT_IN_LOBBY')
      }

      player.ready = ready
      lobby.updatedAt = new Date()

      // Update database
      await this.db.collection('lobby_members').updateOne(
        { lobby_id: lobbyId, user_id: userId },
        { $set: { ready: ready } }
      )

      // Update memory cache
      this.lobbies.set(lobbyId, lobby)

      console.log(`✅ Player ${userId} ready status: ${ready}`)
      return lobby

    } catch (error) {
      console.error('❌ Error updating ready status:', error)
      throw error
    }
  }

  // Start a match from lobby
  async startMatch(hostUserId, lobbyId) {
    try {
      const lobby = this.lobbies.get(lobbyId)
      if (!lobby) {
        throw new Error('LOBBY_NOT_FOUND')
      }

      if (lobby.hostUserId !== hostUserId) {
        throw new Error('NOT_HOST')
      }

      if (lobby.status !== 'OPEN') {
        throw new Error('LOBBY_NOT_OPEN')
      }

      // Check minimum players (at least 1 for 1v1, can be 2)
      if (lobby.players.length < 1) {
        throw new Error('NOT_ENOUGH_PLAYERS')
      }

      // Check if all players are ready (optional)
      const allReady = lobby.players.every(p => p.ready || p.role === 'HOST')
      if (!allReady) {
        throw new Error('READY_CHECK_FAILED')
      }

      // Allocate game server
      const matchAllocation = await this.allocateMatch(lobby)
      
      // Create match record
      const matchId = crypto.randomUUID()
      await this.db.collection('matches').insertOne({
        id: matchId,
        lobby_id: lobbyId,
        region: lobby.region,
        server_endpoint: matchAllocation.serverEndpoint,
        status: 'PENDING',
        created_at: new Date()
      })

      // Update lobby status
      lobby.status = 'IN_MATCH'
      await this.db.collection('lobbies').updateOne(
        { id: lobbyId },
        { $set: { status: 'IN_MATCH', updated_at: new Date() } }
      )

      // Update memory cache
      this.lobbies.set(lobbyId, lobby)

      // Mark all players as in match
      lobby.players.forEach(player => {
        const session = this.userSessions.get(player.userId)
        if (session) {
          session.inMatch = true
          this.userSessions.set(player.userId, session)
        }
      })

      console.log(`🎮 Match started for lobby ${lobbyId}: ${matchId}`)
      
      return {
        matchId: matchId,
        serverEndpoint: matchAllocation.serverEndpoint,
        roomCode: matchAllocation.roomCode,
        players: lobby.players
      }

    } catch (error) {
      console.error('❌ Error starting match:', error)
      throw error
    }
  }

  // Simple match allocator
  async allocateMatch(lobby) {
    try {
      // For now, use the existing game server with a unique room code
      const roomCode = `room_${crypto.randomBytes(4).toString('hex')}`
      const serverEndpoint = `ws://localhost:3000/game/${roomCode}`

      // Create game room record
      const matchId = crypto.randomUUID()
      await this.db.collection('game_rooms').insertOne({
        id: crypto.randomUUID(),
        match_id: matchId,
        room_code: roomCode,
        server_url: serverEndpoint,
        capacity: lobby.maxPlayers,
        current_players: 0,
        status: 'WAITING',
        created_at: new Date()
      })

      return {
        matchId: matchId,
        serverEndpoint: serverEndpoint,
        roomCode: roomCode
      }

    } catch (error) {
      console.error('❌ Match allocation failed:', error)
      throw new Error('MATCH_ALLOCATION_FAILED')
    }
  }

  // Get public lobbies for a region
  async getPublicLobbies(region = 'na', limit = 10) {
    try {
      const publicLobbies = []
      
      for (const [id, lobby] of this.lobbies) {
        if (lobby.type === 'PUBLIC' && lobby.status === 'OPEN' && lobby.region === region) {
          publicLobbies.push({
            id: lobby.id,
            name: lobby.name,
            region: lobby.region,
            players: lobby.players.length,
            maxPlayers: lobby.maxPlayers,
            hostName: lobby.players.find(p => p.role === 'HOST')?.name || 'Unknown',
            createdAt: lobby.createdAt
          })
        }
      }

      // Sort by creation time (newest first)
      publicLobbies.sort((a, b) => b.createdAt - a.createdAt)
      
      return publicLobbies.slice(0, limit)

    } catch (error) {
      console.error('❌ Error fetching public lobbies:', error)
      return []
    }
  }

  // Get lobby by ID
  getLobby(lobbyId) {
    return this.lobbies.get(lobbyId)
  }

  // Get user's current lobby
  getUserCurrentLobby(userId) {
    const session = this.userSessions.get(userId)
    return session?.lobbyId ? this.lobbies.get(session.lobbyId) : null
  }

  // Close a lobby
  async closeLobby(lobbyId) {
    try {
      const lobby = this.lobbies.get(lobbyId)
      if (lobby) {
        // Update database
        await this.db.collection('lobbies').updateOne(
          { id: lobbyId },
          { $set: { status: 'CLOSED', updated_at: new Date() } }
        )

        // Remove from memory
        this.lobbies.delete(lobbyId)

        // Clean up user sessions
        lobby.players?.forEach(player => {
          this.userSessions.delete(player.userId)
        })

        console.log(`🚪 Lobby closed: ${lobbyId}`)
      }
    } catch (error) {
      console.error('❌ Error closing lobby:', error)
    }
  }

  // Cleanup old lobbies (run periodically)
  async cleanupOldLobbies() {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      
      // Close old lobbies in database
      await this.db.collection('lobbies').updateMany(
        { created_at: { $lt: cutoffTime }, status: { $ne: 'CLOSED' } },
        { $set: { status: 'CLOSED', updated_at: new Date() } }
      )

      // Clean up memory cache
      for (const [id, lobby] of this.lobbies) {
        if (lobby.createdAt < cutoffTime) {
          this.lobbies.delete(id)
        }
      }

      console.log('🧹 Old lobbies cleaned up')
    } catch (error) {
      console.error('❌ Error cleaning up lobbies:', error)
    }
  }

  // Get lobby statistics
  getStats() {
    return {
      activeLobbies: this.lobbies.size,
      activeSessions: this.userSessions.size,
      lobbiesByRegion: Object.fromEntries(
        this.regions.map(region => [
          region,
          Array.from(this.lobbies.values()).filter(l => l.region === region).length
        ])
      )
    }
  }
}

export const lobbyManager = new LobbyManager()
export default LobbyManager