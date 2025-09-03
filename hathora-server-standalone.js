#!/usr/bin/env node

/**
 * Standalone Hathora Server - NO Socket.IO Dependencies
 * Pure Node.js HTTP + WebSocket implementation to avoid uWebSockets.js conflicts
 */

const http = require('http')
const crypto = require('crypto')

const PORT = process.env.HATHORA_PORT || 4000

console.log('🌍 Starting TurfLoot Hathora Server (Standalone)...')
console.log(`📡 Port: ${PORT}`)
console.log(`🔧 Node.js: ${process.version}`)
console.log('⚡ Pure Node.js implementation - no uWebSockets.js dependency')

// Simple WebSocket implementation
class SimpleWebSocket {
  constructor() {
    this.connections = new Map()
    this.rooms = new Map()
  }

  handleUpgrade(request, socket, head) {
    const key = request.headers['sec-websocket-key']
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64')

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      'Sec-WebSocket-Protocol: chat',
      ''
    ].join('\r\n')

    socket.write(responseHeaders)

    const connectionId = crypto.randomUUID()
    this.connections.set(connectionId, socket)

    console.log(`🔌 WebSocket connection established: ${connectionId}`)

    socket.on('data', (buffer) => {
      try {
        const frame = this.parseFrame(buffer)
        if (frame) {
          this.handleMessage(connectionId, frame.payload)
        }
      } catch (error) {
        console.error('Frame parsing error:', error.message)
      }
    })

    socket.on('close', () => {
      console.log(`🔌 WebSocket connection closed: ${connectionId}`)
      this.connections.delete(connectionId)
    })

    socket.on('error', (error) => {
      console.error(`WebSocket error: ${error.message}`)
      this.connections.delete(connectionId)
    })
  }

  parseFrame(buffer) {
    if (buffer.length < 2) return null

    const firstByte = buffer[0]
    const secondByte = buffer[1]

    const fin = !!(firstByte & 0x80)
    const opcode = firstByte & 0x0f

    if (opcode === 0x8) return null // Close frame

    const masked = !!(secondByte & 0x80)
    let payloadLength = secondByte & 0x7f

    let offset = 2

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset)
      offset += 2
    } else if (payloadLength === 127) {
      // Skip 64-bit length for simplicity
      offset += 8
      payloadLength = buffer.readUInt32BE(offset)
      offset += 4
    }

    if (buffer.length < offset + (masked ? 4 : 0) + payloadLength) {
      return null // Incomplete frame
    }

    let payload = buffer.slice(
      offset + (masked ? 4 : 0), 
      offset + (masked ? 4 : 0) + payloadLength
    )

    if (masked) {
      const maskKey = buffer.slice(offset, offset + 4)
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4]
      }
    }

    return { fin, opcode, payload: payload.toString('utf8') }
  }

  sendFrame(socket, payload) {
    const payloadBuffer = Buffer.from(payload, 'utf8')
    const frame = Buffer.alloc(2 + payloadBuffer.length)
    
    frame[0] = 0x81 // FIN + text frame
    frame[1] = payloadBuffer.length
    payloadBuffer.copy(frame, 2)
    
    socket.write(frame)
  }

  handleMessage(connectionId, message) {
    try {
      const data = JSON.parse(message)
      console.log(`📨 Message from ${connectionId}:`, data.type || 'unknown')

      switch (data.type) {
        case 'join_room':
          this.handleJoinRoom(connectionId, data)
          break
        case 'game_action':
          this.handleGameAction(connectionId, data)
          break
        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong', timestamp: Date.now() })
          break
        default:
          console.log(`Unknown message type: ${data.type}`)
      }
    } catch (error) {
      console.error('Message handling error:', error.message)
    }
  }

  handleJoinRoom(connectionId, data) {
    const roomId = data.roomId || 'global-practice-bots'
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        players: new Map(),
        createdAt: Date.now()
      })
      console.log(`🏠 Created new room: ${roomId}`)
    }

    const room = this.rooms.get(roomId)
    room.players.set(connectionId, {
      id: connectionId,
      nickname: data.nickname || 'Player',
      joinedAt: Date.now()
    })

    console.log(`👤 Player ${data.nickname} joined room ${roomId} (${room.players.size} players)`)

    // Send join confirmation
    this.sendToConnection(connectionId, {
      type: 'joined',
      roomId: roomId,
      playerId: connectionId,
      players: room.players.size
    })

    // Broadcast to other players in room
    this.broadcastToRoom(roomId, {
      type: 'player_joined',
      playerId: connectionId,
      nickname: data.nickname,
      totalPlayers: room.players.size
    }, connectionId)
  }

  handleGameAction(connectionId, data) {
    // Simple game action relay
    const rooms = Array.from(this.rooms.values())
    const playerRoom = rooms.find(room => room.players.has(connectionId))
    
    if (playerRoom) {
      this.broadcastToRoom(playerRoom.id, {
        type: 'game_update',
        playerId: connectionId,
        action: data.action,
        data: data.data
      }, connectionId)
    }
  }

  sendToConnection(connectionId, message) {
    const socket = this.connections.get(connectionId)
    if (socket) {
      this.sendFrame(socket, JSON.stringify(message))
    }
  }

  broadcastToRoom(roomId, message, excludeId = null) {
    const room = this.rooms.get(roomId)
    if (!room) return

    for (const [playerId] of room.players) {
      if (playerId !== excludeId) {
        this.sendToConnection(playerId, message)
      }
    }
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Simple health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      uptime: process.uptime(),
      connections: wsHandler.connections.size,
      rooms: wsHandler.rooms.size
    }))
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

// Initialize WebSocket handler
const wsHandler = new SimpleWebSocket()

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  wsHandler.handleUpgrade(request, socket, head)
})

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TurfLoot Hathora server running on port ${PORT}`)
  console.log(`🌐 WebSocket server ready for connections`)
  console.log(`✅ No external dependencies - pure Node.js implementation`)
  
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

console.log('📊 Server statistics will be available at /health')

module.exports = { server, wsHandler }