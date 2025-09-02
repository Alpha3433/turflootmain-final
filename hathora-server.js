#!/usr/bin/env node

// Hathora Server Entry Point for TurfLoot
import { startServer } from '@hathora/server-sdk'
import { gameServer } from './lib/gameServer.js'
import http from 'http'

const PORT = process.env.HATHORA_PORT || 4000

console.log('🌍 Starting TurfLoot Hathora Server...')

// Create HTTP server
const server = http.createServer()

// Initialize our existing game server with Hathora
gameServer.initialize(server)

// Hathora-specific event handlers
const hathoraHandlers = {
  // Called when a new room should be created
  subscribeUser: (roomId, userId) => {
    console.log(`👤 Hathora: User ${userId} subscribing to room ${roomId}`)
    
    // Create or get existing room using our game server
    const room = gameServer.getOrCreateRoom(roomId, 'multiplayer', 0)
    
    return {
      type: 'room-created',
      roomId: roomId,
      state: {
        players: room.players.size,
        maxPlayers: 20,
        gameMode: room.mode,
        status: room.running ? 'active' : 'waiting'
      }
    }
  },

  // Called when a user leaves a room  
  unsubscribeUser: (roomId, userId) => {
    console.log(`👋 Hathora: User ${userId} unsubscribing from room ${roomId}`)
    
    const room = gameServer.rooms.get(roomId)
    if (room) {
      // Clean up user from room
      room.removePlayer(userId)
    }
  },

  // Called when room should be destroyed
  onRoomDestroy: (roomId) => {
    console.log(`🗑️ Hathora: Destroying room ${roomId}`)
    
    const room = gameServer.rooms.get(roomId)
    if (room) {
      room.cleanup()
      gameServer.rooms.delete(roomId)
    }
  }
}

// Start Hathora server with our handlers
startServer({
  port: PORT,
  ...hathoraHandlers
}, server)

// Start our game server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 TurfLoot Hathora Server running on port ${PORT}`)
  console.log(`🌍 Ready for global multiplayer connections!`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Hathora server closed')
    process.exit(0)
  })
})

export default server