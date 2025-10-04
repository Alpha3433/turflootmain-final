import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";

// Player state schema
export class Player extends Schema {
  @type("string") name: string = "Player";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") mass: number = 100;
  @type("number") radius: number = 20;
  @type("string") color: string = "#FF6B6B";
  @type("number") score: number = 0;
  @type("number") lastSeq: number = 0;
  @type("boolean") alive: boolean = true;
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
  maxClients = 50;

  // Game configuration
  worldSize = 4000;
  maxCoins = 1500; // Triple the previous coin cap for denser arenas
  maxViruses = 30; // Double the spike (virus) count for increased challenge
  tickRate = 20; // 20 TPS server logic

  private spawnOffsets: Array<{ x: number, y: number }> = [
    { x: 0, y: 0 },
    { x: 1500, y: 0 },
    { x: -1500, y: 0 },
    { x: 0, y: 1500 },
    { x: 0, y: -1500 },
    { x: 1100, y: 1100 },
    { x: -1100, y: 1100 },
    { x: 1100, y: -1100 }
  ];
  private nextSpawnIndex = 0;
  
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
    
    console.log(`🪙 Generated ${this.maxCoins} coins`);
    console.log(`🦠 Generated ${this.maxViruses} viruses`);
    console.log(`🔄 Game loop started at ${this.tickRate} TPS`);
  }

  private getNextSpawnPosition(): { x: number, y: number } {
    const centerX = this.worldSize / 2;
    const centerY = this.worldSize / 2;
    const currentIndex = this.nextSpawnIndex;
    const offset = this.spawnOffsets[currentIndex];
    this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.spawnOffsets.length;

    const x = centerX + offset.x;
    const y = centerY + offset.y;

    console.log(
      `🎯 ARENA SPAWN SLOT: Assigned slot ${currentIndex} at (${x.toFixed(1)}, ${y.toFixed(1)}) relative to center (${centerX}, ${centerY})`
    );

    return { x, y };
  }

  onJoin(client: Client, options: any = {}) {
    const privyUserId = options.privyUserId || `anonymous_${Date.now()}`;
    const playerName = options.playerName || `Player_${Math.random().toString(36).substring(7)}`;
    
    console.log(`👋 Player joined: ${playerName} (${client.sessionId})`);
    
    // Create new player
    const player = new Player();
    player.name = playerName;
    const spawnPosition = this.getNextSpawnPosition();
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
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
    const speed = Math.max(1, 5 * (100 / player.mass)); // Speed inversely proportional to mass
    player.vx = dx * speed;
    player.vy = dy * speed;
  }

  onLeave(client: Client, consented?: boolean) {
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

  checkPlayerCollisions(player: Player, sessionId: string) {
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

          if (otherPlayer.isSplitPiece) {
            console.log(`🧩 Removing split piece ${otherSessionId} owned by ${otherPlayer.ownerSessionId}`);
            this.state.players.delete(otherSessionId);
            return;
          }

          const eliminatedBy = player.name;
          const finalScore = otherPlayer.score;
          const finalMass = otherPlayer.mass;

          const eliminatedClient = this.clients.find(client => client.sessionId === otherSessionId);
          if (eliminatedClient) {
            try {
              eliminatedClient.send("gameOver", {
                finalScore,
                finalMass,
                eliminatedBy
              });
            } catch (error) {
              console.log(`⚠️ Failed to send gameOver to ${otherPlayer.name} (${otherSessionId}):`, error);
            }
          } else {
            console.log(`⚠️ No active client found for eliminated player ${otherPlayer.name} (${otherSessionId})`);
          }

          this.state.players.delete(otherSessionId);

          const splitPiecesToRemove: string[] = [];
          this.state.players.forEach((candidate, candidateSessionId) => {
            if (candidate.isSplitPiece && candidate.ownerSessionId === otherSessionId) {
              splitPiecesToRemove.push(candidateSessionId);
            }
          });

          splitPiecesToRemove.forEach(splitSessionId => {
            console.log(`🧹 Removing split piece ${splitSessionId} for eliminated player ${otherSessionId}`);
            this.state.players.delete(splitSessionId);
          });

          if (eliminatedClient) {
            try {
              eliminatedClient.leave(1000, "Eliminated from arena");
            } catch (error) {
              console.log(`⚠️ Failed to disconnect eliminated player ${otherPlayer.name} (${otherSessionId}):`, error);
            }
          }
        }
      }
    });
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