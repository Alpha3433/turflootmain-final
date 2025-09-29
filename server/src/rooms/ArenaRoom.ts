import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";

const INITIAL_MASS = 25;

// Player state schema
export class Player extends Schema {
  @type("string") name: string = "Player";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") mass: number = INITIAL_MASS;
  @type("number") radius: number = 20;
  @type("string") color: string = "#FF6B6B";
  @type("number") score: number = 0;
  @type("number") lastSeq: number = 0;
  @type("boolean") alive: boolean = true;
  @type("boolean") spawnProtection: boolean = false;
  @type("number") spawnProtectionEndTime: number = 0;
}

// Coin state schema
export class Coin extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") value: number = 1;
  @type("number") radius: number = 8;
  @type("string") color: string = "#FFD700";
}

// Virus state schema
export class Virus extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") radius: number = 60;
  @type("string") color: string = "#FF6B6B";
}

// Game state schema
export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Coin }) coins = new MapSchema<Coin>();
  @type({ map: Virus }) viruses = new MapSchema<Virus>();
  @type("number") worldSize: number = 4000;
  @type("number") timestamp: number = 0;
}

export class ArenaRoom extends Room<GameState> {
  maxClients = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '50');

  // Game configuration
  worldSize = parseInt(process.env.WORLD_SIZE || '4000');
  maxCoins = 100;
  maxViruses = 15;
  tickRate = parseInt(process.env.TICK_RATE || '20'); // TPS server logic
  private readonly spawnProtectionDurationMs = 5000;
  private spawnProtectionEndTimes = new Map<string, number>();

  private getRandomPlayablePosition(buffer: number) {
    const center = this.worldSize / 2;
    const maxRadius = Math.max(0, center - buffer);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * maxRadius;

    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    };
  }
  
  onCreate() {
    console.log("🌍 Arena room initialized");
    
    // Initialize game state
    this.setState(new GameState());
    this.state.worldSize = this.worldSize;
    
    // Generate initial world objects
    this.generateCoins();
    this.generateViruses();
    
    // Set up message handlers
    this.onMessage("input", (client: Client, message: any) => {
      this.handleInput(client, message);
    });
    
    this.onMessage("ping", (client: Client, message: any) => {
      client.send("pong", {
        timestamp: Date.now(),
        clientTimestamp: message.timestamp
      });
    });
    
    // Start game loop at 20 TPS
    this.setSimulationInterval(() => this.update(), 1000 / this.tickRate);
    
    console.log(`🪙 Generated ${this.maxCoins} coins`);
    console.log(`🦠 Generated ${this.maxViruses} viruses`);
    console.log(`🔄 Game loop started at ${this.tickRate} TPS`);
  }

  onJoin(client: Client, options: any = {}) {
    const privyUserId = options.privyUserId || `anonymous_${Date.now()}`;
    const playerName = options.playerName || `Player_${Math.random().toString(36).substring(7)}`;
    
    console.log(`👋 Player joined: ${playerName} (${client.sessionId})`);
    
    // Create new player
    const player = new Player();
    player.name = playerName;
    const spawnPosition = this.getRandomPlayablePosition(50);
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    player.vx = 0;
    player.vy = 0;
    player.mass = INITIAL_MASS;
    player.radius = Math.sqrt(player.mass / Math.PI) * 10;
    player.color = this.generatePlayerColor();
    player.score = 0;
    player.lastSeq = 0;
    player.alive = true;
    player.spawnProtection = true;
    player.spawnProtectionEndTime = Date.now() + this.spawnProtectionDurationMs;
    this.spawnProtectionEndTimes.set(client.sessionId, player.spawnProtectionEndTime);
    
    // Add player to game state
    this.state.players.set(client.sessionId, player);
    
    // Store client metadata
    (client as any).userData = {
      privyUserId,
      playerName,
      lastInputTime: Date.now()
    };
    
    console.log(`✅ Player spawned at (${Math.round(player.x)}, ${Math.round(player.y)})`);
  }

  handleInput(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) return;

    const { seq, dx, dy } = message;
    
    // Validate input sequence to prevent replay attacks
    if (seq <= player.lastSeq) {
      return; // Ignore old inputs
    }
    
    player.lastSeq = seq;
    (client as any).userData.lastInputTime = Date.now();
    
    // Apply movement (dx, dy are normalized direction vectors)
    const speed = Math.max(1, 5 * (INITIAL_MASS / player.mass)); // Speed inversely proportional to mass
    player.vx = dx * speed;
    player.vy = dy * speed;
  }

  onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 Player left: ${player.name} (${client.sessionId})`);
      this.state.players.delete(client.sessionId);
    }
    this.spawnProtectionEndTimes.delete(client.sessionId);
  }

  update() {
    const deltaTime = 1 / this.tickRate; // Fixed timestep
    this.state.timestamp = Date.now();
    const now = this.state.timestamp;

    // Update all players
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;

      const protectionEnd = this.spawnProtectionEndTimes.get(sessionId);
      if (player.spawnProtection && protectionEnd !== undefined && now >= protectionEnd) {
        player.spawnProtection = false;
        player.spawnProtectionEndTime = 0;
        this.spawnProtectionEndTimes.delete(sessionId);
      }

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

  checkCollisions(player: Player, sessionId: string) {
    // Check coin collisions
    this.checkCoinCollisions(player);
    
    // Check virus collisions
    this.checkVirusCollisions(player);
    
    // Check player collisions
    this.checkPlayerCollisions(player, sessionId);
  }

  checkCoinCollisions(player: Player) {
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

  checkVirusCollisions(player: Player) {
    this.state.viruses.forEach((virus, virusId) => {
      if (player.spawnProtection) {
        return;
      }

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
          player.mass = Math.max(INITIAL_MASS, player.mass * 0.8);
          player.radius = Math.sqrt(player.mass / Math.PI) * 10;
        }
      }
    });
  }

  checkPlayerCollisions(player: Player, sessionId: string) {
    this.state.players.forEach((otherPlayer, otherSessionId) => {
      if (sessionId === otherSessionId || !otherPlayer.alive) return;
      
      const dx = player.x - otherPlayer.x;
      const dy = player.y - otherPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.radius + otherPlayer.radius) {
        if (player.spawnProtection || otherPlayer.spawnProtection) {
          return;
        }
        // Larger player absorbs smaller player
        if (player.mass > otherPlayer.mass * 1.2) {
          player.mass += otherPlayer.mass * 0.8;
          player.score += otherPlayer.score * 0.5;
          player.radius = Math.sqrt(player.mass / Math.PI) * 10;
          
          // Eliminate other player
          otherPlayer.alive = false;
          otherPlayer.spawnProtection = false;
          otherPlayer.spawnProtectionEndTime = 0;
          this.spawnProtectionEndTimes.delete(otherSessionId);
          console.log(`💀 ${player.name} eliminated ${otherPlayer.name}`);
          
          // Respawn eliminated player after 3 seconds
          setTimeout(() => {
            if (this.state.players.has(otherSessionId)) {
              this.respawnPlayer(otherPlayer, otherSessionId);
            }
          }, 3000);
        }
      }
    });
  }

  respawnPlayer(player: Player, sessionId: string) {
    const spawnPosition = this.getRandomPlayablePosition(50);
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    player.vx = 0;
    player.vy = 0;
    player.mass = INITIAL_MASS;
    player.radius = Math.sqrt(player.mass / Math.PI) * 10;
    player.alive = true;
    player.spawnProtection = true;
    player.spawnProtectionEndTime = Date.now() + this.spawnProtectionDurationMs;
    this.spawnProtectionEndTimes.set(sessionId, player.spawnProtectionEndTime);
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
    const position = this.getRandomPlayablePosition(20);
    coin.x = position.x;
    coin.y = position.y;
    coin.value = 1;
    coin.radius = 8;
    coin.color = "#FFD700";

    this.state.coins.set(coinId, coin);
  }

  spawnVirus() {
    const virusId = `virus_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const virus = new Virus();
    const position = this.getRandomPlayablePosition(100);
    virus.x = position.x;
    virus.y = position.y;
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