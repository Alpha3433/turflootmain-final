const { Server } = require("colyseus");
const { Room, Client } = require("colyseus");
const { Schema, MapSchema, type } = require("@colyseus/schema");

// Player state schema
class Player extends Schema {
  constructor() {
    super();
    this.name = "Player";
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.mass = 100;
    this.radius = 20;
    this.color = "#FF6B6B";
    this.score = 0;
    this.lastSeq = 0;
    this.alive = true;
  }
}

// Define schema types
type("string")(Player.prototype, "name");
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "vx");
type("number")(Player.prototype, "vy");
type("number")(Player.prototype, "mass");
type("number")(Player.prototype, "radius");
type("string")(Player.prototype, "color");
type("number")(Player.prototype, "score");
type("number")(Player.prototype, "lastSeq");
type("boolean")(Player.prototype, "alive");

// Coin state schema
class Coin extends Schema {
  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.value = 1;
    this.radius = 8;
    this.color = "#FFD700";
  }
}

type("number")(Coin.prototype, "x");
type("number")(Coin.prototype, "y");
type("number")(Coin.prototype, "value");
type("number")(Coin.prototype, "radius");
type("string")(Coin.prototype, "color");

// Game state schema
class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.coins = new MapSchema();
    this.worldSize = 4000;
    this.timestamp = 0;
  }
}

type({ map: Player })(GameState.prototype, "players");
type({ map: Coin })(GameState.prototype, "coins");
type("number")(GameState.prototype, "worldSize");
type("number")(GameState.prototype, "timestamp");

// Arena Room
class ArenaRoom extends Room {
  constructor() {
    super();
    this.maxClients = 50;
    this.worldSize = 4000;
    this.maxCoins = 100;
    this.tickRate = 20;
  }

  onCreate() {
    console.log("🌍 Arena room created");
    
    // Initialize game state
    this.setState(new GameState());
    this.state.worldSize = this.worldSize;
    
    // Generate initial coins
    this.generateCoins();
    
    // Set up message handlers
    this.onMessage("input", (client, message) => {
      this.handleInput(client, message);
    });
    
    this.onMessage("ping", (client, message) => {
      client.send("pong", {
        timestamp: Date.now(),
        clientTimestamp: message.timestamp
      });
    });
    
    // Start game loop
    this.setSimulationInterval(() => this.update(), 1000 / this.tickRate);
    
    console.log(`🎮 Game loop started at ${this.tickRate} TPS`);
  }

  onJoin(client, options = {}) {
    const privyUserId = options.privyUserId || `anonymous_${Date.now()}`;
    const playerName = options.playerName || `Player_${Math.random().toString(36).substring(7)}`;

    console.log(`👋 Player attempting to join: ${playerName} (${client.sessionId}) - privyUserId: ${privyUserId}`);

    const duplicateSessions = [];

    this.state.players.forEach((existingPlayer, existingSessionId) => {
      if (existingSessionId === client.sessionId) {
        return;
      }

      let isDuplicate = false;

      if (!privyUserId.startsWith('anonymous_')) {
        const existingClient = this.clients.find((c) => c.sessionId === existingSessionId);
        if (existingClient && existingClient.userData && existingClient.userData.privyUserId === privyUserId) {
          isDuplicate = true;
          console.log(`⚠️ DUPLICATE by privyUserId: ${privyUserId} (existing: ${existingSessionId}, new: ${client.sessionId})`);
        }
      }

      if (!isDuplicate && existingPlayer.name === playerName) {
        isDuplicate = true;
        console.log(`⚠️ DUPLICATE by playerName: ${playerName} (existing: ${existingSessionId}, new: ${client.sessionId})`);
      }

      if (isDuplicate) {
        duplicateSessions.push(existingSessionId);
      }
    });

    if (duplicateSessions.length > 0) {
      console.log(`🧹 Removing ${duplicateSessions.length} duplicate player(s) to prevent confusion`);
      duplicateSessions.forEach((sessionId) => {
        console.log(`🧹 Removing duplicate player: ${sessionId}`);
        this.state.players.delete(sessionId);

        const oldClient = this.clients.find((c) => c.sessionId === sessionId);
        if (oldClient) {
          console.log(`🔌 Disconnecting old client: ${sessionId}`);
          try {
            oldClient.leave(1000, 'Duplicate connection detected');
          } catch (error) {
            console.log('⚠️ Error disconnecting old client:', error);
          }
        }
      });
    } else {
      console.log(`✅ No duplicates found for ${playerName} - proceeding with join`);
    }

    // Create new player
    const player = new Player();
    player.name = playerName;
    player.x = Math.random() * this.worldSize;
    player.y = Math.random() * this.worldSize;
    player.mass = 100;
    player.radius = 20;
    player.color = this.generatePlayerColor();
    player.alive = true;

    this.state.players.set(client.sessionId, player);

    client.userData = {
      privyUserId,
      playerName,
      lastInputTime: Date.now()
    };

    console.log(`✅ Player spawned: ${playerName} - No duplicates!`);
  }

  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 Player left: ${player.name}`);
      this.state.players.delete(client.sessionId);
    }
  }

  handleInput(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) return;

    const { seq, dx, dy } = message;
    
    if (seq <= player.lastSeq) return;
    
    player.lastSeq = seq;
    
    const speed = Math.max(1, 5 * (100 / player.mass));
    player.vx = dx * speed;
    player.vy = dy * speed;
  }

  update() {
    const deltaTime = 1 / this.tickRate;
    this.state.timestamp = Date.now();
    
    // Update all players
    this.state.players.forEach((player) => {
      if (!player.alive) return;
      
      // Apply movement
      player.x += player.vx * deltaTime * 10;
      player.y += player.vy * deltaTime * 10;
      
      // Keep in bounds
      player.x = Math.max(player.radius, Math.min(this.worldSize - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(this.worldSize - player.radius, player.y));
      
      // Apply friction
      player.vx *= 0.95;
      player.vy *= 0.95;
      
      // Check coin collisions
      this.checkCoinCollisions(player);
    });
  }

  checkCoinCollisions(player) {
    this.state.coins.forEach((coin, coinId) => {
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.radius + coin.radius) {
        player.mass += coin.value;
        player.score += coin.value;
        player.radius = Math.sqrt(player.mass / Math.PI) * 10;
        
        this.state.coins.delete(coinId);
        this.spawnCoin();
      }
    });
  }

  generateCoins() {
    for (let i = 0; i < this.maxCoins; i++) {
      this.spawnCoin();
    }
  }

  spawnCoin() {
    const coinId = `coin_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const coin = new Coin();
    coin.x = Math.random() * this.worldSize;
    coin.y = Math.random() * this.worldSize;
    coin.value = 1;
    coin.radius = 8;
    coin.color = "#FFD700";
    
    this.state.coins.set(coinId, coin);
  }

  generatePlayerColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Create and start server
const gameServer = new Server();

// Define room
gameServer.define("arena", ArenaRoom);

// Health check
if (gameServer.app) {
  gameServer.app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

// Start server
const port = process.env.PORT || 2567;
gameServer.listen(port);

console.log(`🚀 TurfLoot Arena Server listening on port ${port}`);
console.log(`🎮 Arena room available`);