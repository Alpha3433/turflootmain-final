/**
 * Socket.IO Event Handlers for Lobby System
 */

import { lobbyManager } from './LobbyManager.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'turfloot-secret-key'

// Verify JWT token from socket
function verifySocketToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    console.error('❌ Socket JWT verification failed:', error.message)
    return null
  }
}

// Initialize lobby socket handlers
export function initializeLobbyHandlers(io) {
  console.log('🔌 Initializing lobby socket handlers')

  io.on('connection', (socket) => {
    let authenticatedUser = null

    // Socket authentication
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data
        const decoded = verifySocketToken(token)
        
        if (!decoded) {
          socket.emit('auth_error', { code: 'INVALID_TOKEN', message: 'Authentication failed' })
          return
        }

        authenticatedUser = decoded
        socket.userId = decoded.userId || decoded.id
        socket.join(`user:${socket.userId}`)
        
        console.log(`🔐 Socket authenticated: ${socket.userId}`)
        socket.emit('authenticated', { userId: socket.userId })

      } catch (error) {
        console.error('❌ Socket authentication error:', error)
        socket.emit('auth_error', { code: 'AUTH_ERROR', message: error.message })
      }
    })

    // Create lobby
    socket.on('lobby:create', async (data) => {
      if (!authenticatedUser) {
        socket.emit('lobby:error', { code: 'NOT_AUTHENTICATED', message: 'Please authenticate first' })
        return
      }

      try {
        const { name, type = 'PUBLIC', region = 'na', maxPlayers = 2 } = data
        
        const result = await lobbyManager.createLobby(socket.userId, {
          name,
          type,
          region,
          maxPlayers: Math.min(maxPlayers, 2), // Enforce max 2 players
          hostName: authenticatedUser.nickname || authenticatedUser.username || 'Player'
        })

        // Join socket to lobby room
        socket.join(`lobby:${result.lobby.id}`)
        socket.currentLobbyId = result.lobby.id

        // Emit lobby state to creator
        socket.emit('lobby:created', {
          lobby: result.lobby,
          joinCode: result.joinCode
        })

        // Broadcast lobby state to room
        io.to(`lobby:${result.lobby.id}`).emit('lobby:state', result.lobby)

        console.log(`🎮 Lobby created via socket: ${result.lobby.id}`)

      } catch (error) {
        console.error('❌ Lobby creation error:', error)
        socket.emit('lobby:error', { 
          code: error.message.includes('ALREADY_') ? error.message : 'CREATE_FAILED', 
          message: error.message 
        })
      }
    })

    // Join lobby
    socket.on('lobby:join', async (data) => {
      if (!authenticatedUser) {
        socket.emit('lobby:error', { code: 'NOT_AUTHENTICATED', message: 'Please authenticate first' })
        return
      }

      try {
        const { lobbyId, joinCode } = data
        
        const lobby = await lobbyManager.joinLobby(socket.userId, {
          lobbyId,
          joinCode,
          userName: authenticatedUser.nickname || authenticatedUser.username || 'Player'
        })

        // Join socket to lobby room
        socket.join(`lobby:${lobby.id}`)
        socket.currentLobbyId = lobby.id

        // Broadcast member joined
        socket.to(`lobby:${lobby.id}`).emit('lobby:member_joined', {
          userId: socket.userId,
          name: authenticatedUser.nickname || authenticatedUser.username || 'Player'
        })

        // Broadcast updated lobby state
        io.to(`lobby:${lobby.id}`).emit('lobby:state', lobby)

        console.log(`👥 Player joined lobby via socket: ${socket.userId} -> ${lobby.id}`)

      } catch (error) {
        console.error('❌ Lobby join error:', error)
        socket.emit('lobby:error', { 
          code: error.message.includes('LOBBY_') || error.message.includes('ALREADY_') ? error.message : 'JOIN_FAILED', 
          message: error.message 
        })
      }
    })

    // Leave lobby
    socket.on('lobby:leave', async (data) => {
      if (!authenticatedUser || !socket.currentLobbyId) {
        socket.emit('lobby:error', { code: 'NOT_IN_LOBBY', message: 'Not in a lobby' })
        return
      }

      try {
        const { lobbyId } = data
        const targetLobbyId = lobbyId || socket.currentLobbyId

        const lobby = await lobbyManager.leaveLobby(socket.userId, targetLobbyId)

        // Leave socket room
        socket.leave(`lobby:${targetLobbyId}`)
        socket.currentLobbyId = null

        // Broadcast member left
        socket.to(`lobby:${targetLobbyId}`).emit('lobby:member_left', {
          userId: socket.userId
        })

        // If lobby still exists, broadcast updated state
        if (lobby && lobby.players.length > 0) {
          io.to(`lobby:${targetLobbyId}`).emit('lobby:state', lobby)
        }

        socket.emit('lobby:left', { lobbyId: targetLobbyId })

        console.log(`👋 Player left lobby via socket: ${socket.userId}`)

      } catch (error) {
        console.error('❌ Lobby leave error:', error)
        socket.emit('lobby:error', { code: 'LEAVE_FAILED', message: error.message })
      }
    })

    // Update ready status
    socket.on('lobby:ready', async (data) => {
      if (!authenticatedUser || !socket.currentLobbyId) {
        socket.emit('lobby:error', { code: 'NOT_IN_LOBBY', message: 'Not in a lobby' })
        return
      }

      try {
        const { ready } = data
        
        const lobby = await lobbyManager.updatePlayerReady(socket.userId, socket.currentLobbyId, ready)

        // Broadcast updated lobby state
        io.to(`lobby:${socket.currentLobbyId}`).emit('lobby:state', lobby)

        console.log(`✅ Player ready status updated: ${socket.userId} -> ${ready}`)

      } catch (error) {
        console.error('❌ Ready status update error:', error)
        socket.emit('lobby:error', { code: 'READY_FAILED', message: error.message })
      }
    })

    // Lobby chat
    socket.on('lobby:chat', async (data) => {
      if (!authenticatedUser || !socket.currentLobbyId) {
        socket.emit('lobby:error', { code: 'NOT_IN_LOBBY', message: 'Not in a lobby' })
        return
      }

      try {
        const { text } = data
        
        if (!text || text.trim().length === 0) {
          return
        }

        const chatMessage = {
          userId: socket.userId,
          userName: authenticatedUser.nickname || authenticatedUser.username || 'Player',
          text: text.trim().substring(0, 200), // Limit message length
          timestamp: new Date()
        }

        // Broadcast chat message to lobby
        io.to(`lobby:${socket.currentLobbyId}`).emit('lobby:chat', chatMessage)

        console.log(`💬 Lobby chat: ${socket.userId} -> ${text.substring(0, 50)}`)

      } catch (error) {
        console.error('❌ Lobby chat error:', error)
        socket.emit('lobby:error', { code: 'CHAT_FAILED', message: error.message })
      }
    })

    // Start match
    socket.on('lobby:start', async (data) => {
      if (!authenticatedUser || !socket.currentLobbyId) {
        socket.emit('lobby:error', { code: 'NOT_IN_LOBBY', message: 'Not in a lobby' })
        return
      }

      try {
        const matchData = await lobbyManager.startMatch(socket.userId, socket.currentLobbyId)

        // Broadcast match started to all lobby members
        io.to(`lobby:${socket.currentLobbyId}`).emit('lobby:started', {
          matchId: matchData.matchId,
          serverEndpoint: matchData.serverEndpoint,
          roomCode: matchData.roomCode,
          players: matchData.players
        })

        console.log(`🎮 Match started via socket: ${matchData.matchId}`)

      } catch (error) {
        console.error('❌ Match start error:', error)
        socket.emit('lobby:error', { 
          code: error.message.includes('NOT_') || error.message.includes('READY_') ? error.message : 'START_FAILED', 
          message: error.message 
        })
      }
    })

    // Get public lobbies
    socket.on('lobby:browse', async (data) => {
      try {
        const { region = 'na', limit = 10 } = data || {}
        
        const publicLobbies = await lobbyManager.getPublicLobbies(region, limit)
        
        socket.emit('lobby:browse_result', {
          region,
          lobbies: publicLobbies
        })

      } catch (error) {
        console.error('❌ Lobby browse error:', error)
        socket.emit('lobby:error', { code: 'BROWSE_FAILED', message: error.message })
      }
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (authenticatedUser && socket.currentLobbyId) {
        try {
          // Auto-leave lobby on disconnect
          const lobby = await lobbyManager.leaveLobby(socket.userId, socket.currentLobbyId)
          
          // Broadcast member left
          socket.to(`lobby:${socket.currentLobbyId}`).emit('lobby:member_left', {
            userId: socket.userId
          })

          // If lobby still exists, broadcast updated state
          if (lobby && lobby.players.length > 0) {
            io.to(`lobby:${socket.currentLobbyId}`).emit('lobby:state', lobby)
          }

          console.log(`🔌 Player disconnected and left lobby: ${socket.userId}`)

        } catch (error) {
          console.error('❌ Error handling disconnect:', error)
        }
      }
    })
  })

  // Periodic cleanup
  setInterval(() => {
    lobbyManager.cleanupOldLobbies()
  }, 30 * 60 * 1000) // Every 30 minutes

  console.log('✅ Lobby socket handlers initialized')
}

export default { initializeLobbyHandlers }