import { Room, Client } from "@colyseus/core";
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
  maxClients = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '50');
  
  // Game configuration
  worldSize = parseInt(process.env.WORLD_SIZE || '4000');
  maxCoins = 100;
  maxViruses = 15;
  tickRate = parseInt(process.env.TICK_RATE || '20'); // TPS server logic
  
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
    
    this.onMessage("split", (client: Client, message: any) => {
      this.handleSplit(client, message);
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
    
    console.log(`👋 Player attempting to join: ${playerName} (${client.sessionId}) - privyUserId: ${privyUserId}`);
    
    // ROBUST DEDUPLICATION: Check existing players in game state directly
    let duplicateSessions: string[] = [];
    
    this.state.players.forEach((existingPlayer, existingSessionId) => {
      // Skip checking against self
      if (existingSessionId === client.sessionId) return;
      
      let isDuplicate = false;
      
      // Method 1: Check by privyUserId for authenticated users
      if (!privyUserId.startsWith('anonymous_')) {
        const existingClient = this.clients.find(c => c.sessionId === existingSessionId);
        if (existingClient && (existingClient as any).userData?.privyUserId === privyUserId) {
          isDuplicate = true;
          console.log(`⚠️ DUPLICATE by privyUserId: ${privyUserId} (existing: ${existingSessionId}, new: ${client.sessionId})`);
        }
      }
      
      // Method 2: Check by playerName (always, as fallback)
      if (!isDuplicate && existingPlayer.name === playerName) {
        isDuplicate = true;
        console.log(`⚠️ DUPLICATE by playerName: ${playerName} (existing: ${existingSessionId}, new: ${client.sessionId})`);
      }
      
      if (isDuplicate) {
        duplicateSessions.push(existingSessionId);
      }
    });
    
    // Remove ALL duplicate players found
    if (duplicateSessions.length > 0) {
      console.log(`🧹 Removing ${duplicateSessions.length} duplicate player(s) to prevent confusion`);
      duplicateSessions.forEach(sessionId => {
        console.log(`🧹 Removing duplicate player: ${sessionId}`);
        this.state.players.delete(sessionId);
        
        // Also disconnect the old client
        const oldClient = this.clients.find(c => c.sessionId === sessionId);
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
    player.vx = 0;
    player.vy = 0;
    player.mass = 25; // Updated to 25 to match user requirement
    player.radius = Math.sqrt(player.mass) * 3; // Use proper formula: √25 * 3 = 15
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
    
    console.log(`✅ Player spawned at (${Math.round(player.x)}, ${Math.round(player.y)}) - No duplicates!`);
  }

  handleInput(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) {
      console.log(`⚠️ Input ignored - player not found or dead for session: ${client.sessionId}`);
      return;
    }

    const { seq, dx, dy } = message;
    
    console.log(`📥 Received input from ${player.name} (${client.sessionId}):`, {
      sequence: seq,
      direction: { dx: dx?.toFixed(3), dy: dy?.toFixed(3) },
      currentPos: { x: player.x?.toFixed(1), y: player.y?.toFixed(1) }
    });
    
    // Validate input sequence to prevent replay attacks
    if (seq <= player.lastSeq) {
      console.log(`⚠️ Ignoring old input sequence: ${seq} <= ${player.lastSeq}`);
      return; // Ignore old inputs
    }
    
    player.lastSeq = seq;
    (client as any).userData.lastInputTime = Date.now();
    
    // Apply movement using local agario speed formula
    const baseSpeed = 6.0;  // Base speed for small players (matching local agario)
    const massSpeedFactor = Math.sqrt(player.mass / 20); // Gradual slowdown (matching local agario)
    const dynamicSpeed = Math.max(1.5, baseSpeed / massSpeedFactor); // Minimum speed of 1.5 (matching local agario)
    
    const newVx = dx * dynamicSpeed;
    const newVy = dy * dynamicSpeed;
    
    player.vx = newVx;
    player.vy = newVy;
    
    console.log(`✅ Applied movement to ${player.name}:`, {
      baseSpeed: baseSpeed.toFixed(2),
      massSpeedFactor: massSpeedFactor.toFixed(2), 
      dynamicSpeed: dynamicSpeed.toFixed(2),
      velocity: { vx: newVx.toFixed(2), vy: newVy.toFixed(2) }
    });
  }

  handleSplit(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) {
      console.log(`⚠️ Split ignored - player not found or dead for session: ${client.sessionId}`);
      return;
    }

    const { targetX, targetY } = message;
    
    console.log(`🔄 Split requested by ${player.name} (${client.sessionId}) toward:`, {
      target: { x: targetX?.toFixed(1), y: targetY?.toFixed(1) },
      currentPos: { x: player.x?.toFixed(1), y: player.y?.toFixed(1) },
      mass: player.mass
    });
    
    // Check if player can split (minimum mass requirement - adjusted for smaller starting size)
    if (player.mass < 40) {
      console.log(`⚠️ Split denied - insufficient mass: ${player.mass} < 40`);
      return;
    }
    
    // Calculate direction from player to target
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 10) {
      console.log(`⚠️ Split denied - target too close: ${distance}`);
      return;
    }
    
    // Normalize direction
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Split the player mass
    const originalMass = player.mass;
    const splitMass = Math.floor(originalMass / 2);
    
    // Update original player
    player.mass = originalMass - splitMass;
    player.radius = Math.sqrt(player.mass) * 3; // Match agario radius formula
    
    // Create split piece
    const splitId = `${client.sessionId}_split_${Date.now()}`;
    const splitPlayer = new Player();
    splitPlayer.name = `${player.name}*`;
    splitPlayer.x = player.x + dirX * (player.radius + 50); // Spawn split piece ahead
    splitPlayer.y = player.y + dirY * (player.radius + 50);
    splitPlayer.vx = dirX * 15; // Give initial velocity toward target
    splitPlayer.vy = dirY * 15;
    splitPlayer.mass = splitMass;
    splitPlayer.radius = Math.sqrt(splitPlayer.mass) * 3; // Match agario radius formula
    splitPlayer.color = player.color;
    splitPlayer.score = Math.floor(player.score / 2);
    splitPlayer.alive = true;
    
    // Add split piece to game (temporary - it will merge back after 5 seconds)
    this.state.players.set(splitId, splitPlayer);
    
    console.log(`✅ Split completed for ${player.name}:`, {
      originalMass: originalMass,
      remainingMass: player.mass,
      splitMass: splitMass,
      splitPosition: { x: splitPlayer.x.toFixed(1), y: splitPlayer.y.toFixed(1) }
    });
    
    // Auto-merge the split piece back after 5 seconds
    setTimeout(() => {
      const splitPiece = this.state.players.get(splitId);
      const mainPlayer = this.state.players.get(client.sessionId);
      
      if (splitPiece && mainPlayer) {
        console.log(`🔄 Auto-merging split piece for ${player.name}`);
        mainPlayer.mass += splitPiece.mass;
        mainPlayer.radius = Math.sqrt(mainPlayer.mass) * 3; // Match agario radius formula
        this.state.players.delete(splitId);
      }
    }, 5000);
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
        player.radius = Math.sqrt(player.mass) * 3; // Match agario radius formula
        
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
          player.mass = Math.max(25, player.mass * 0.8); // Minimum mass is now 25 (matching starting mass)
          player.radius = Math.sqrt(player.mass) * 3; // Match agario radius formula
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
          player.radius = Math.sqrt(player.mass) * 3; // Match agario radius formula
          
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

  respawnPlayer(player: Player) {
    player.x = Math.random() * this.worldSize;
    player.y = Math.random() * this.worldSize;
    player.vx = 0;
    player.vy = 0;
    player.mass = 25; // Updated to 25 to match user requirement
    player.radius = Math.sqrt(player.mass) * 3; // Use proper formula: √25 * 3 = 15
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