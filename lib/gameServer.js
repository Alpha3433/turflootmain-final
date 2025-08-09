import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

// Game Configuration
const config = {
  tickRate: 30,
  worldSize: 4000,
  foodCount: 400,
  baseSpeed: 180,
  startingMass: 10,
  foodMass: 1,
  radiusPerMass: 1.2,
  cash: { 
    rakePercent: 10, 
    minPlayers: 2, 
    maxPlayers: 6,
    minFee: 1,
    maxFee: 100
  }
}

// TurfLoot Game Room with wallet integration
class TurfLootGameRoom {
  constructor(io, id, mode, fee = 0) {
    this.io = io
    this.id = id
    this.mode = mode // 'free' | 'cash'
    this.fee = fee
    this.players = new Map()
    this.food = []
    this.running = false
    this.started = false
    this.startTime = null
    this.endTime = null
    this.winner = null
    this.spawnFood()
  }

  spawnFood() {
    this.food = []
    for (let i = 0; i < config.foodCount; i++) {
      this.food.push({
        id: 'f' + i,
        x: Math.random() * config.worldSize - config.worldSize / 2,
        y: Math.random() * config.worldSize - config.worldSize / 2
      })
    }
  }

  async addPlayer(socket, userInfo) {
    const player = {
      id: socket.id,
      userId: userInfo.userId,
      nickname: userInfo.nickname?.slice(0, 16) || 'Player',
      x: (Math.random() - 0.5) * config.worldSize * 0.6,
      y: (Math.random() - 0.5) * config.worldSize * 0.6,
      mass: config.startingMass,
      dir: { x: 0, y: 0 },
      alive: true,
      ready: false,
      entryFeePaid: false
    }

    this.players.set(socket.id, player)
    socket.join(this.id)
    socket.emit('joined', { 
      roomId: this.id, 
      mode: this.mode, 
      fee: this.fee,
      playerId: socket.id
    })
    
    this.broadcastRoomInfo()
    this.broadcastState()
  }

  async handlePlayerReady(socket, userInfo) {
    const player = this.players.get(socket.id)
    if (!player) return

    if (this.mode === 'cash' && this.fee > 0) {
      try {
        // Check if user has sufficient balance and deduct entry fee
        const success = await this.deductEntryFee(userInfo.userId, this.fee)
        if (!success) {
          socket.emit('insufficient_balance', { required: this.fee })
          return
        }
        player.entryFeePaid = true
        socket.emit('entry_fee_paid', { fee: this.fee })
      } catch (error) {
        socket.emit('payment_error', { message: error.message })
        return
      }
    }

    player.ready = true
    this.broadcastRoomInfo()
    this.checkStartCondition()
  }

  async deductEntryFee(userId, amount) {
    const db = await getDb()
    const users = db.collection('users')
    const transactions = db.collection('transactions')

    const user = await users.findOne({ 
      $or: [{ id: userId }, { privy_id: userId }]
    })

    if (!user || (user.balance || 0) < amount) {
      return false
    }

    // Create transaction record
    const transaction = {
      id: crypto.randomUUID(),
      user_id: userId,
      type: 'game_entry',
      amount: amount,
      currency: 'USD',
      game_room: this.id,
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date()
    }

    await transactions.insertOne(transaction)

    // Deduct from user balance
    await users.updateOne(
      { $or: [{ id: userId }, { privy_id: userId }] },
      { 
        $inc: { balance: -amount },
        $set: { updated_at: new Date() }
      }
    )

    return true
  }

  checkStartCondition() {
    if (this.running || this.started) return

    const readyPlayers = [...this.players.values()].filter(p => p.ready && p.alive)
    
    if (this.mode === 'cash') {
      const paidPlayers = readyPlayers.filter(p => p.entryFeePaid)
      if (paidPlayers.length >= config.cash.minPlayers) {
        this.startMatch()
      }
    } else {
      if (readyPlayers.length >= 1) { // Free play can start with 1 player
        this.startMatch()
      }
    }
  }

  startMatch() {
    this.running = true
    this.started = true
    this.startTime = new Date()
    this.io.to(this.id).emit('match_start', {
      startTime: this.startTime,
      players: this.getPlayerCount()
    })
    console.log(`🎮 TurfLoot match started in room ${this.id} (${this.mode} mode)`)
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId)
    if (player) {
      this.players.delete(socketId)
      this.broadcastRoomInfo()
      this.checkWinCondition()
    }
  }

  setDirection(socketId, direction) {
    const player = this.players.get(socketId)
    if (!player || !player.alive) return
    player.dir = direction
  }

  radius(mass) {
    return Math.sqrt(mass) * config.radiusPerMass
  }

  tick(deltaTime) {
    if (!this.running) return

    // Move players
    for (const player of this.players.values()) {
      if (!player.alive) continue
      const speed = config.baseSpeed / Math.sqrt(Math.max(player.mass, 1))
      player.x += player.dir.x * speed * deltaTime
      player.y += player.dir.y * speed * deltaTime
      
      // World boundaries
      const halfWorld = config.worldSize / 2
      player.x = Math.max(-halfWorld, Math.min(halfWorld, player.x))
      player.y = Math.max(-halfWorld, Math.min(halfWorld, player.y))
    }

    // Food consumption
    for (let i = this.food.length - 1; i >= 0; i--) {
      const food = this.food[i]
      for (const player of this.players.values()) {
        if (!player.alive) continue
        const radius = this.radius(player.mass)
        const distance = Math.hypot(player.x - food.x, player.y - food.y)
        
        if (distance <= radius) {
          player.mass += config.foodMass
          this.food.splice(i, 1)
          break
        }
      }
    }

    // Replenish food
    while (this.food.length < config.foodCount) {
      this.food.push({
        id: 'f' + Math.random().toString(36).slice(2, 8),
        x: Math.random() * config.worldSize - config.worldSize / 2,
        y: Math.random() * config.worldSize - config.worldSize / 2
      })
    }

    // Player vs Player combat
    const alivePlayers = [...this.players.values()].filter(p => p.alive)
    for (let i = 0; i < alivePlayers.length; i++) {
      for (let j = i + 1; j < alivePlayers.length; j++) {
        const playerA = alivePlayers[i]
        const playerB = alivePlayers[j]
        
        const radiusA = this.radius(playerA.mass)
        const radiusB = this.radius(playerB.mass)
        const distance = Math.hypot(playerA.x - playerB.x, playerA.y - playerB.y)
        
        if (distance < Math.max(radiusA, radiusB)) {
          if (playerA.mass > playerB.mass * 1.1) {
            playerA.mass += playerB.mass * 0.8
            playerB.alive = false
            this.io.to(playerB.id).emit('player_eaten', { eatenBy: playerA.nickname })
          } else if (playerB.mass > playerA.mass * 1.1) {
            playerB.mass += playerA.mass * 0.8
            playerA.alive = false
            this.io.to(playerA.id).emit('player_eaten', { eatenBy: playerB.nickname })
          }
        }
      }
    }

    this.checkWinCondition()
    this.broadcastState()
  }

  broadcastState() {
    const gameState = {
      timestamp: Date.now(),
      players: [...this.players.values()].map(p => ({
        id: p.id,
        nickname: p.nickname,
        x: p.x,
        y: p.y,
        mass: p.mass,
        alive: p.alive
      })),
      food: this.food,
      running: this.running
    }
    
    this.io.to(this.id).emit('game_state', gameState)
  }

  broadcastRoomInfo() {
    const roomInfo = {
      roomId: this.id,
      mode: this.mode,
      fee: this.fee,
      playerCount: this.players.size,
      readyCount: [...this.players.values()].filter(p => p.ready).length,
      running: this.running,
      started: this.started
    }
    
    this.io.to(this.id).emit('room_info', roomInfo)
  }

  async checkWinCondition() {
    if (!this.running) return

    const alivePlayers = [...this.players.values()].filter(p => p.alive)
    
    if (alivePlayers.length <= 1) {
      this.running = false
      this.endTime = new Date()
      const winner = alivePlayers[0] || null
      this.winner = winner

      if (winner && this.mode === 'cash' && this.fee > 0) {
        await this.payoutWinner(winner)
      }

      this.io.to(this.id).emit('match_end', {
        winnerId: winner?.id || null,
        winnerName: winner?.nickname || 'No winner',
        duration: this.endTime - this.startTime,
        mode: this.mode,
        fee: this.fee
      })

      console.log(`🏆 TurfLoot match ended in room ${this.id}, winner: ${winner?.nickname || 'None'}`)
    }
  }

  async payoutWinner(winner) {
    const db = await getDb()
    const users = db.collection('users')
    const transactions = db.collection('transactions')

    const paidPlayers = [...this.players.values()].filter(p => p.entryFeePaid)
    const totalPool = paidPlayers.length * this.fee
    const rakeAmount = Math.floor(totalPool * (config.cash.rakePercent / 100))
    const prizeAmount = totalPool - rakeAmount

    // Award prize to winner
    await users.updateOne(
      { $or: [{ id: winner.userId }, { privy_id: winner.userId }] },
      { 
        $inc: { 
          balance: prizeAmount,
          games_won: 1,
          total_winnings: prizeAmount
        },
        $set: { updated_at: new Date() }
      }
    )

    // Record payout transaction
    const transaction = {
      id: crypto.randomUUID(),
      user_id: winner.userId,
      type: 'game_payout',
      amount: prizeAmount,
      currency: 'USD',
      game_room: this.id,
      total_pool: totalPool,
      rake_amount: rakeAmount,
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date()
    }

    await transactions.insertOne(transaction)

    this.io.to(this.id).emit('payout_complete', {
      winnerId: winner.id,
      prizeAmount,
      totalPool,
      rakeAmount,
      rakePercent: config.cash.rakePercent
    })

    console.log(`💰 Payout completed: $${prizeAmount} to ${winner.nickname} (pool: $${totalPool}, rake: $${rakeAmount})`)
  }

  getPlayerCount() {
    return {
      total: this.players.size,
      ready: [...this.players.values()].filter(p => p.ready).length,
      alive: [...this.players.values()].filter(p => p.alive).length
    }
  }
}

// Game Server Manager
export class TurfLootGameServer {
  constructor() {
    this.io = null
    this.rooms = new Map()
    this.gameLoop = null
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    this.setupSocketHandlers()
    this.startGameLoop()
    console.log('🎮 TurfLoot Game Server initialized')
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Player connected: ${socket.id}`)

      socket.on('join_room', async (data) => {
        try {
          const { roomId, mode, fee, token } = data
          const userInfo = this.verifyToken(token)
          
          if (!userInfo) {
            socket.emit('auth_error', { message: 'Invalid authentication token' })
            return
          }

          const room = this.getOrCreateRoom(roomId, mode, fee)
          await room.addPlayer(socket, userInfo)
          
        } catch (error) {
          console.error('Join room error:', error)
          socket.emit('join_error', { message: error.message })
        }
      })

      socket.on('player_ready', async (data) => {
        try {
          const { token } = data
          const userInfo = this.verifyToken(token)
          
          if (!userInfo) {
            socket.emit('auth_error', { message: 'Invalid authentication token' })
            return
          }

          const room = this.findPlayerRoom(socket.id)
          if (room) {
            await room.handlePlayerReady(socket, userInfo)
          }
        } catch (error) {
          console.error('Player ready error:', error)
          socket.emit('ready_error', { message: error.message })
        }
      })

      socket.on('set_direction', (direction) => {
        const room = this.findPlayerRoom(socket.id)
        if (room) {
          room.setDirection(socket.id, direction)
        }
      })

      socket.on('disconnect', () => {
        console.log(`🔌 Player disconnected: ${socket.id}`)
        const room = this.findPlayerRoom(socket.id)
        if (room) {
          room.removePlayer(socket.id)
        }
      })
    })
  }

  verifyToken(token) {
    try {
      if (!token) return null
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      return {
        userId: decoded.userId || decoded.privyId,
        nickname: decoded.username || decoded.email?.split('@')[0] || 'Player'
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      return null
    }
  }

  getOrCreateRoom(roomId, mode = 'free', fee = 0) {
    if (!this.rooms.has(roomId)) {
      const room = new TurfLootGameRoom(this.io, roomId, mode, fee)
      this.rooms.set(roomId, room)
    }
    return this.rooms.get(roomId)
  }

  findPlayerRoom(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) {
        return room
      }
    }
    return null
  }

  startGameLoop() {
    this.gameLoop = setInterval(() => {
      const deltaTime = 1 / config.tickRate
      for (const room of this.rooms.values()) {
        room.tick(deltaTime)
      }
    }, 1000 / config.tickRate)
  }

  getRoomStats() {
    const stats = []
    for (const [roomId, room] of this.rooms) {
      stats.push({
        roomId,
        mode: room.mode,
        fee: room.fee,
        players: room.getPlayerCount(),
        running: room.running,
        started: room.started
      })
    }
    return stats
  }
}

// Export singleton instance
export const gameServer = new TurfLootGameServer()