#!/usr/bin/env node

// Hathora Server Entry Point for TurfLoot - Node.js 18/20 Compatible
const { Server } = require('socket.io')
const { gameServer } = require('./lib/gameServer.js')
const http = require('http')

const PORT = process.env.HATHORA_PORT || 4000

console.log('🌍 Starting TurfLoot Hathora Server...')
console.log(`📡 Port: ${PORT}`)
console.log(`🔧 Node.js: ${process.version}`)

// Create HTTP server
const server = http.createServer()

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
})

// Initialize our existing game server with Socket.IO
gameServer.initialize(io)

console.log('✅ Game server initialized')

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TurfLoot Hathora server running on port ${PORT}`)
  console.log(`🌐 WebSocket server ready for connections`)
  
  // Keep process alive and handle signals
  process.on('SIGTERM', () => {
    console.log('📤 Received SIGTERM, shutting down gracefully...')
    server.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })
  
  process.on('SIGINT', () => {
    console.log('📤 Received SIGINT, shutting down gracefully...')
    server.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })
})

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error)
  process.exit(1)
})

// Export for testing
module.exports = { server, io }