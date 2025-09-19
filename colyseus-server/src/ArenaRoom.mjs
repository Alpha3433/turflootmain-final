import colyseusPackage from "colyseus";
import * as schemaPackage from "@colyseus/schema";

const { Room } = colyseusPackage;
const { Schema, MapSchema, type } = schemaPackage;

// Player state schema
class Player extends Schema {
  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.mass = 100;
    this.radius = 20;
    this.color = "#FF6B6B";
    this.name = "Player";
    this.score = 0;
    this.lastSeq = 0;
    this.alive = true;
  }
}

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

// Virus state schema
class Virus extends Schema {
  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.radius = 60;
    this.color = "#FF6B6B";
  }
}

// Game state schema
class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.coins = new MapSchema();
    this.viruses = new MapSchema();
    this.worldSize = 4000;
    this.timestamp = 0;
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

type("number")(Coin.prototype, "x");
type("number")(Coin.prototype, "y");
type("number")(Coin.prototype, "value");
type("number")(Coin.prototype, "radius");
type("string")(Coin.prototype, "color");

type("number")(Virus.prototype, "x");
type("number")(Virus.prototype, "y");
type("number")(Virus.prototype, "radius");
type("string")(Virus.prototype, "color");

type({ map: Player })(GameState.prototype, "players");
type({ map: Coin })(GameState.prototype, "coins");
type({ map: Virus })(GameState.prototype, "viruses");
type("number")(GameState.prototype, "worldSize");
type("number")(GameState.prototype, "timestamp");

export class ArenaRoom extends Room {
  constructor() {
    super();
    this.maxClients = 50;
    this.patchRate = 50; // 20 TPS
    this.autoDispose = false;
    
    // Game configuration
    this.worldSize = 4000;
    this.maxCoins = 500;
    this.maxViruses = 15;
    this.tickRate = 20; // 20 TPS server logic
    
    console.log('🎮 Arena room created');
  }

  onCreate() {
    console.log('🌍 Arena room initialized');
    
    // Initialize game state
    this.setState(new GameState());
    this.state.worldSize = this.worldSize;
    
    // Generate initial world objects
    this.generateCoins();
    this.generateViruses();
    
    // Start game loop at 20 TPS
    this.setSimulationInterval(() => this.update(), 1000 / this.tickRate);
    
    console.log(`🪙 Generated ${this.maxCoins} coins`);
    console.log(`🦠 Generated ${this.maxViruses} viruses`);
    console.log(`🔄 Game loop started at ${this.tickRate} TPS`);
  }

  onJoin(client, options) {
    const privyUserId = options.privyUserId || `anonymous_${Date.now()}`;
    const playerName = options.playerName || `Player_${Math.random().toString(36).substring(7)}`;
    
    console.log(`👋 Player joined: ${playerName} (${client.sessionId})`);
    
    // Create new player
    const player = new Player();
    player.name = playerName;
    player.x = Math.random() * this.worldSize;
    player.y = Math.random() * this.worldSize;
    player.vx = 0;
    player.vy = 0;
    player.mass = 100;
    player.radius = Math.sqrt(player.mass / Math.PI) * 10;
    player.color = this.generatePlayerColor();
    player.score = 0;
    player.lastSeq = 0;
    player.alive = true;
    
    // Add player to game state
    this.state.players.set(client.sessionId, player);
    
    // Store client metadata
    client.userData = {
      privyUserId,
      playerName,
      lastInputTime: Date.now()
    };
    
    console.log(`✅ Player spawned at (${Math.round(player.x)}, ${Math.round(player.y)})`);
  }

  onMessage(client, type, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) return;

    switch (type) {
      case "input":
        this.handleInput(client, player, message);
        break;
        
      case "ping":
        // Respond with pong for latency measurement
        client.send("pong", {
          timestamp: Date.now(),
          clientTimestamp: message.timestamp
        });
        break;
        
      default:
        console.warn(`⚠️ Unknown message type from ${player.name}: ${type}`);
    }
  }

  handleInput(client, player, message) {
    const { seq, dx, dy } = message;
    
    // Validate input sequence to prevent replay attacks
    if (seq <= player.lastSeq) {
      return; // Ignore old inputs
    }
    
    player.lastSeq = seq;
    client.userData.lastInputTime = Date.now();
    
    // Apply movement (dx, dy are normalized direction vectors)
    const speed = Math.max(1, 5 * (100 / player.mass)); // Speed inversely proportional to mass
    player.vx = dx * speed;
    player.vy = dy * speed;
  }

  onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 Player left: ${player.name} (${client.sessionId})`);
      this.state.players.delete(client.sessionId);
    }
  }

  update() {
    const deltaTime = 1 / this.tickRate; // Fixed timestep
    this.state.timestamp = Date.now();
    
    // Update all players
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      
      // Apply movement
      player.x += player.vx * deltaTime * 10; // Scale for game feel
      player.y += player.vy * deltaTime * 10;
      
      // Keep player in bounds
      player.x = Math.max(player.radius, Math.min(this.worldSize - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(this.worldSize - player.radius, player.y));
      
      // Apply friction
      player.vx *= 0.95;
      player.vy *= 0.95;
      
      // Check collisions
      this.checkCollisions(player, sessionId);
    });
  }

  checkCollisions(player, sessionId) {
    // Check coin collisions
    this.checkCoinCollisions(player);
    
    // Check virus collisions
    this.checkVirusCollisions(player);
    
    // Check player collisions
    this.checkPlayerCollisions(player, sessionId);
  }

  checkCoinCollisions(player) {
    this.state.coins.forEach((coin, coinId) => {
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.radius + coin.radius) {
        // Player consumes coin
        player.mass += coin.value;
        player.score += coin.value;
        player.radius = Math.sqrt(player.mass / Math.PI) * 10;
        
        // Remove coin and spawn new one
        this.state.coins.delete(coinId);
        this.spawnCoin();
      }
    });
  }

  checkVirusCollisions(player) {
    this.state.viruses.forEach((virus, virusId) => {
      const dx = player.x - virus.x;
      const dy = player.y - virus.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.radius + virus.radius) {
        if (player.mass > virus.radius * 2) {
          // Player destroys virus
          this.state.viruses.delete(virusId);
          this.spawnVirus();
          player.score += 10;
        } else {
          // Player gets damaged
          player.mass = Math.max(50, player.mass * 0.8);
          player.radius = Math.sqrt(player.mass / Math.PI) * 10;
        }
      }
    });
  }

  checkPlayerCollisions(player, sessionId) {
    this.state.players.forEach((otherPlayer, otherSessionId) => {
      if (sessionId === otherSessionId || !otherPlayer.alive) return;
      
      const dx = player.x - otherPlayer.x;
      const dy = player.y - otherPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.radius + otherPlayer.radius) {
        // Larger player absorbs smaller player
        if (player.mass > otherPlayer.mass * 1.2) {
          player.mass += otherPlayer.mass * 0.8;
          player.score += otherPlayer.score * 0.5;
          player.radius = Math.sqrt(player.mass / Math.PI) * 10;
          
          // Eliminate other player
          otherPlayer.alive = false;
          console.log(`💀 ${player.name} eliminated ${otherPlayer.name}`);
          
          // Respawn eliminated player after 3 seconds
          setTimeout(() => {
            if (this.state.players.has(otherSessionId)) {
              this.respawnPlayer(otherPlayer);
            }
          }, 3000);
        }
      }
    });
  }

  respawnPlayer(player) {
    player.x = Math.random() * this.worldSize;
    player.y = Math.random() * this.worldSize;
    player.vx = 0;
    player.vy = 0;
    player.mass = 100;
    player.radius = Math.sqrt(player.mass / Math.PI) * 10;
    player.alive = true;
    console.log(`🔄 Player respawned: ${player.name}`);
  }

  generateCoins() {
    for (let i = 0; i < this.maxCoins; i++) {
      this.spawnCoin();
    }
  }

  generateViruses() {
    for (let i = 0; i < this.maxViruses; i++) {
      this.spawnVirus();
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

  spawnVirus() {
    const virusId = `virus_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const virus = new Virus();
    virus.x = Math.random() * this.worldSize;
    virus.y = Math.random() * this.worldSize;
    virus.radius = 60 + Math.random() * 40;
    virus.color = "#FF6B6B";
    
    this.state.viruses.set(virusId, virus);
  }

  generatePlayerColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  onDispose() {
    console.log('🛑 Arena room disposed');
  }
}