#!/usr/bin/env node

/**
 * TurfLoot Hathora Server - Node.js 20 Compatible
 * No uWebSockets.js dependency - uses native Node.js WebSocket
 */

import { createServer } from 'http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 7777
const HOST = '0.0.0.0'

console.log('🚀 TurfLoot Hathora Server Starting (Node.js 20 Compatible)')
console.log(`📡 Node.js Version: ${process.version}`)
console.log(`🌍 Listening on ${HOST}:${PORT}`)

// Game state
const gameState = {
  players: new Map(),
  food: [],
  gameRunning: true,
  lastUpdate: Date.now()
}

// Initialize food
function initializeFood() {
  console.log('🍎 Initializing food...')
  for (let i = 0; i < 200; i++) {
    gameState.food.push({
      id: Math.random().toString(36),
      x: Math.random() * 3000 - 1500,
      y: Math.random() * 3000 - 1500,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    })
  }
  console.log(`✅ Generated ${gameState.food.length} food items`)
}

// Create HTTP server
const server = createServer()

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/socket.io/',
  perMessageDeflate: false
})

console.log('🔌 WebSocket server created')

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const playerId = Math.random().toString(36).substr(2, 9)
  console.log(`🎮 Player ${playerId} connected from ${req.socket.remoteAddress}`)
  
  // Initialize player
  const player = {
    id: playerId,
    x: Math.random() * 1000 - 500,
    y: Math.random() * 1000 - 500,
    mass: 20,
    radius: 20,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    name: `Player_${playerId.substr(0, 4)}`,
    alive: true,
    cells: [{
      id: `${playerId}_0`,
      x: Math.random() * 1000 - 500,
      y: Math.random() * 1000 - 500,
      mass: 20,
      radius: 20
    }],
    lastUpdate: Date.now()
  }
  
  gameState.players.set(playerId, player)
  ws.playerId = playerId
  
  // Send initial game state
  const initMessage = JSON.stringify({
    type: 'init',
    playerId: playerId,
    player: player,
    food: gameState.food,
    players: Array.from(gameState.players.values()).filter(p => p.id !== playerId)
  })
  
  ws.send(initMessage)
  console.log(`📤 Sent init data to player ${playerId}`)
  
  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (error) {
      console.error(`❌ Error parsing message from ${playerId}:`, error.message)
    }
  })
  
  // Handle disconnect
  ws.on('close', () => {
    console.log(`👋 Player ${playerId} disconnected`)
    gameState.players.delete(playerId)
    
    // Broadcast player left
    broadcast({
      type: 'playerLeft',
      playerId: playerId
    }, playerId)
  })
  
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for player ${playerId}:`, error.message)
  })
  
  // Broadcast new player to others
  broadcast({
    type: 'playerJoined',
    player: player
  }, playerId)
})

// Handle game messages
function handleMessage(ws, message) {
  const playerId = ws.playerId
  const player = gameState.players.get(playerId)
  
  if (!player || !player.alive) return
  
  switch (message.type) {
    case 'move':
      if (message.direction) {
        player.cells.forEach(cell => {
          cell.x += message.direction.x * 2
          cell.y += message.direction.y * 2
          
          // Keep within bounds
          cell.x = Math.max(-1500, Math.min(1500, cell.x))
          cell.y = Math.max(-1500, Math.min(1500, cell.y))
        })
        
        // Update player position to largest cell
        const largestCell = player.cells.reduce((largest, cell) => 
          cell.mass > largest.mass ? cell : largest
        )
        player.x = largestCell.x
        player.y = largestCell.y
        player.lastUpdate = Date.now()
      }
      break
      
    case 'split':
      if (player.cells.length < 16 && player.cells.some(cell => cell.mass >= 36)) {
        const cellToSplit = player.cells.find(cell => cell.mass >= 36)
        if (cellToSplit) {
          const newMass = Math.floor(cellToSplit.mass / 2)
          cellToSplit.mass = newMass
          cellToSplit.radius = Math.sqrt(newMass / Math.PI) * 8
          
          const newCell = {
            id: `${playerId}_${Date.now()}`,
            x: cellToSplit.x + (message.direction?.x || 1) * 100,
            y: cellToSplit.y + (message.direction?.y || 0) * 100,
            mass: newMass,
            radius: Math.sqrt(newMass / Math.PI) * 8
          }
          
          player.cells.push(newCell)
          console.log(`💥 Player ${playerId} split into ${player.cells.length} cells`)
        }
      }
      break
      
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      break
  }
}

// Broadcast message to all players except sender
function broadcast(message, excludePlayerId = null) {
  const messageStr = JSON.stringify(message)
  
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN && client.playerId !== excludePlayerId) {
      client.send(messageStr)
    }
  })
}

// Game loop
function gameLoop() {
  const now = Date.now()
  
  // Check for food consumption
  gameState.players.forEach(player => {
    if (!player.alive) return
    
    player.cells.forEach(cell => {
      gameState.food = gameState.food.filter(food => {
        const dx = food.x - cell.x
        const dy = food.y - cell.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < cell.radius) {
          cell.mass += 1
          cell.radius = Math.sqrt(cell.mass / Math.PI) * 8
          return false // Remove food
        }
        return true
      })
    })
    
    // Update total mass
    player.mass = player.cells.reduce((total, cell) => total + cell.mass, 0)
  })
  
  // Replenish food
  while (gameState.food.length < 200) {
    gameState.food.push({
      id: Math.random().toString(36),
      x: Math.random() * 3000 - 1500,
      y: Math.random() * 3000 - 1500,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    })
  }
  
  // Broadcast game state
  if (gameState.players.size > 0) {
    broadcast({
      type: 'gameState',
      players: Array.from(gameState.players.values()),
      food: gameState.food,
      timestamp: now
    })
  }
  
  gameState.lastUpdate = now
}

// Initialize and start
initializeFood()

// Start HTTP server
server.listen(PORT, HOST, () => {
  console.log('✅ Server started successfully!')
  console.log(`🎮 Game server ready for connections`)
  console.log(`📊 Initial food count: ${gameState.food.length}`)
  
  // Start game loop
  setInterval(gameLoop, 1000 / 30) // 30 FPS
  console.log('🔄 Game loop started at 30 FPS')
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed successfully')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed successfully')
    process.exit(0)
  })
})

console.log('🎯 TurfLoot Hathora Server fully initialized!')