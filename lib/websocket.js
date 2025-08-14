// WebSocket server for real-time multiplayer functionality
import { Server } from 'socket.io'
import { verifyToken } from './auth.js'
import { MongoClient } from 'mongodb'
import { lobbyManager } from './lobby/LobbyManager.js'
import { initializeLobbyHandlers } from './lobby/socketHandlers.js'

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = process.env.DB_NAME || 'turfloot_db'

let io = null
let client = null

// Game rooms storage
const gameRooms = new Map()
const playerRooms = new Map()

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URL)
    await client.connect()
  }
  return client.db(DB_NAME)
}

// Initialize WebSocket server
export function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  console.log('🔌 Socket.IO server initialized')

  // Initialize lobby manager
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017'
  lobbyManager.initialize(io, mongoUrl)
    .then(() => {
      console.log('✅ Lobby manager connected to database')
    })
    .catch(err => {
      console.error('❌ Lobby manager database connection failed:', err)
    })

  // Initialize lobby event handlers
  initializeLobbyHandlers(io)
  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        throw new Error('No token provided')
      }
      
      const { user } = await verifyToken(token)
      socket.user = user
      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  })
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`)
    
    // Handle joining game rooms
    socket.on('join_game', async (data) => {
      await handleJoinGame(socket, data)
    })
    
    // Handle leaving game rooms
    socket.on('leave_game', async (data) => {
      await handleLeaveGame(socket, data)
    })
    
    // Handle game state updates
    socket.on('game_update', async (data) => {
      await handleGameUpdate(socket, data)
    })
    
    // Handle territory updates
    socket.on('territory_update', async (data) => {
      await handleTerritoryUpdate(socket, data)
    })
    
    // Handle cash out
    socket.on('cash_out', async (data) => {
      await handleCashOut(socket, data)
    })
    
    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect(socket)
    })
  })
  
  return io
}

// Handle player joining a game
async function handleJoinGame(socket, { stake, gameMode = 'territory' }) {
  try {
    const roomId = findOrCreateRoom(stake, gameMode)
    const room = gameRooms.get(roomId)
    
    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      socket.emit('join_error', { message: 'Room is full' })
      return
    }
    
    // Add player to room
    const player = {
      id: socket.user.id,
      socketId: socket.id,
      username: socket.user.username,
      wallet_address: socket.user.wallet_address,
      territory: 0,
      position: { x: 0, y: 0 },
      trail: [],
      status: 'active',
      joinedAt: Date.now()
    }
    
    room.players.push(player)
    playerRooms.set(socket.id, roomId)
    
    // Join socket room
    socket.join(roomId)
    
    // Notify player
    socket.emit('game_joined', {
      roomId,
      player,
      gameState: room.gameState,
      players: room.players
    })
    
    // Notify other players
    socket.to(roomId).emit('player_joined', player)
    
    // Start game if minimum players reached
    if (room.players.length >= room.minPlayers && room.status === 'waiting') {
      await startGame(roomId)
    }
    
    console.log(`Player ${socket.user.username} joined room ${roomId}`)
  } catch (error) {
    console.error('Error joining game:', error)
    socket.emit('join_error', { message: 'Failed to join game' })
  }
}

// Handle player leaving a game
async function handleLeaveGame(socket, { roomId }) {
  try {
    const room = gameRooms.get(roomId)
    if (!room) return
    
    // Remove player from room
    room.players = room.players.filter(p => p.socketId !== socket.id)
    playerRooms.delete(socket.id)
    
    // Leave socket room
    socket.leave(roomId)
    
    // Notify other players
    socket.to(roomId).emit('player_left', { playerId: socket.user.id })
    
    // End game if no players left
    if (room.players.length === 0) {
      gameRooms.delete(roomId)
    } else if (room.players.length < room.minPlayers && room.status === 'active') {
      await endGame(roomId, 'insufficient_players')
    }
    
    console.log(`Player ${socket.user.username} left room ${roomId}`)
  } catch (error) {
    console.error('Error leaving game:', error)
  }
}

// Handle game state updates
async function handleGameUpdate(socket, { roomId, gameState }) {
  try {
    const room = gameRooms.get(roomId)
    if (!room || room.status !== 'active') return
    
    // Validate player is in room
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player) return
    
    // Update player data
    if (gameState.position) {
      player.position = gameState.position
    }
    
    if (gameState.trail) {
      player.trail = gameState.trail
    }
    
    // Broadcast to other players
    socket.to(roomId).emit('player_update', {
      playerId: socket.user.id,
      gameState: {
        position: player.position,
        trail: player.trail
      }
    })
  } catch (error) {
    console.error('Error updating game state:', error)
  }
}

// Handle territory updates
async function handleTerritoryUpdate(socket, { roomId, territory }) {
  try {
    const room = gameRooms.get(roomId)
    if (!room || room.status !== 'active') return
    
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player) return
    
    // Validate territory update (basic anti-cheat)
    const territoryIncrease = territory - player.territory
    if (territoryIncrease > 10) { // Max 10% increase per update
      console.warn(`Suspicious territory increase from ${socket.user.username}`)
      return
    }
    
    player.territory = territory
    
    // Broadcast territory update
    io.to(roomId).emit('territory_update', {
      playerId: socket.user.id,
      territory
    })
    
    // Check win condition
    if (territory >= 50) { // 50% territory wins
      await endGame(roomId, 'territory_win', player)
    }
  } catch (error) {
    console.error('Error updating territory:', error)
  }
}

// Handle cash out
async function handleCashOut(socket, { roomId }) {
  try {
    const room = gameRooms.get(roomId)
    if (!room || room.status !== 'active') return
    
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player) return
    
    // Calculate payout based on territory
    const payout = calculatePayout(room.stake, player.territory)
    
    // Remove player from game
    room.players = room.players.filter(p => p.socketId !== socket.id)
    
    // Record game result
    await recordGameResult(socket.user.id, roomId, {
      result: 'cash_out',
      territory: player.territory,
      payout,
      duration: Date.now() - player.joinedAt
    })
    
    // Notify player
    socket.emit('cash_out_success', { payout, territory: player.territory })
    
    // Notify other players
    socket.to(roomId).emit('player_cashed_out', {
      playerId: socket.user.id,
      territory: player.territory
    })
    
    console.log(`Player ${socket.user.username} cashed out with ${player.territory}% territory`)
  } catch (error) {
    console.error('Error processing cash out:', error)
    socket.emit('cash_out_error', { message: 'Failed to cash out' })
  }
}

// Handle player disconnect
function handleDisconnect(socket) {
  const roomId = playerRooms.get(socket.id)
  if (roomId) {
    handleLeaveGame(socket, { roomId })
  }
  console.log(`User disconnected: ${socket.user?.username || 'Unknown'} (${socket.id})`)
}

// Find or create a game room
function findOrCreateRoom(stake, gameMode) {
  // Look for existing room with space
  for (const [roomId, room] of gameRooms.entries()) {
    if (room.stake === stake && 
        room.gameMode === gameMode && 
        room.players.length < room.maxPlayers && 
        room.status === 'waiting') {
      return roomId
    }
  }
  
  // Create new room
  const roomId = `room_${stake}_${Date.now()}`
  const room = {
    id: roomId,
    stake,
    gameMode,
    players: [],
    maxPlayers: 8,
    minPlayers: 2,
    status: 'waiting',
    gameState: {
      startTime: null,
      duration: 120, // 2 minutes
      grid: initializeGrid(),
      prizePool: 0
    },
    createdAt: Date.now()
  }
  
  gameRooms.set(roomId, room)
  return roomId
}

// Start a game
async function startGame(roomId) {
  const room = gameRooms.get(roomId)
  if (!room) return
  
  room.status = 'active'
  room.gameState.startTime = Date.now()
  room.gameState.prizePool = room.stake * room.players.length * 0.95 // 5% house edge
  
  // Assign starting positions to players
  room.players.forEach((player, index) => {
    const startPos = getStartingPosition(index, room.players.length)
    player.position = startPos
    player.territory = 0
  })
  
  io.to(roomId).emit('game_started', {
    gameState: room.gameState,
    players: room.players
  })
  
  // Set game timer
  setTimeout(() => {
    endGame(roomId, 'time_up')
  }, room.gameState.duration * 1000)
  
  console.log(`Game started in room ${roomId} with ${room.players.length} players`)
}

// End a game
async function endGame(roomId, reason, winner = null) {
  const room = gameRooms.get(roomId)
  if (!room) return
  
  room.status = 'finished'
  
  // Determine winner if not provided
  if (!winner && room.players.length > 0) {
    winner = room.players.reduce((prev, current) => 
      (prev.territory > current.territory) ? prev : current
    )
  }
  
  // Calculate payouts
  const payouts = calculateGamePayouts(room, winner)
  
  // Record results for all players
  await Promise.all(room.players.map(player => 
    recordGameResult(player.id, roomId, {
      result: player === winner ? 'win' : 'loss',
      territory: player.territory,
      payout: payouts[player.id] || 0,
      duration: Date.now() - player.joinedAt
    })
  ))
  
  // Notify players
  io.to(roomId).emit('game_ended', {
    reason,
    winner: winner ? {
      id: winner.id,
      username: winner.username,
      territory: winner.territory
    } : null,
    payouts,
    finalStandings: room.players.sort((a, b) => b.territory - a.territory)
  })
  
  // Clean up room after delay
  setTimeout(() => {
    gameRooms.delete(roomId)
  }, 30000) // 30 seconds delay
  
  console.log(`Game ended in room ${roomId}. Reason: ${reason}`)
}

// Helper functions
function initializeGrid() {
  return Array(100).fill().map(() => Array(100).fill(0))
}

function getStartingPosition(index, totalPlayers) {
  const positions = [
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 10, y: 90 },
    { x: 90, y: 90 },
    { x: 50, y: 10 },
    { x: 50, y: 90 },
    { x: 10, y: 50 },
    { x: 90, y: 50 }
  ]
  return positions[index % positions.length]
}

function calculatePayout(stake, territory) {
  return stake * 0.95 * (territory / 100) // 95% of stake proportional to territory
}

function calculateGamePayouts(room, winner) {
  const payouts = {}
  const totalPrize = room.gameState.prizePool
  
  if (winner) {
    // Winner takes larger share, others get proportional to territory
    const winnerShare = totalPrize * 0.6
    const remainingShare = totalPrize * 0.4
    
    payouts[winner.id] = winnerShare
    
    const totalOtherTerritory = room.players
      .filter(p => p !== winner)
      .reduce((sum, p) => sum + p.territory, 0)
    
    room.players.filter(p => p !== winner).forEach(player => {
      if (totalOtherTerritory > 0) {
        payouts[player.id] = remainingShare * (player.territory / totalOtherTerritory)
      }
    })
  }
  
  return payouts
}

async function recordGameResult(playerId, roomId, result) {
  try {
    const db = await getDb()
    const games = db.collection('games')
    const users = db.collection('users')
    
    // Record game
    await games.insertOne({
      id: crypto.randomUUID(),
      player_id: playerId,
      room_id: roomId,
      stake: result.stake || 0,
      territory_percent: result.territory,
      result: result.result,
      payout: result.payout,
      duration: result.duration,
      created_at: new Date()
    })
    
    // Update user stats
    await users.updateOne(
      { id: playerId },
      {
        $inc: {
          'profile.stats.games_played': 1,
          'profile.stats.games_won': result.result === 'win' ? 1 : 0,
          'profile.stats.total_territory_captured': result.territory,
          'profile.stats.total_time_played': result.duration,
          'profile.total_winnings': result.payout
        },
        $max: {
          'profile.stats.best_territory_percent': result.territory,
          'profile.stats.longest_game_duration': result.duration
        },
        $set: {
          updated_at: new Date()
        }
      }
    )
  } catch (error) {
    console.error('Error recording game result:', error)
  }
}

export { gameRooms, playerRooms }