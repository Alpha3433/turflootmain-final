import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";

// Player state schema
export class Player extends Schema {
  @type("string") name: string = "Player";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") mass: number = 25; // Fixed default mass to 25
  @type("number") radius: number = 20;
  @type("string") color: string = "#FF6B6B";
  @type("number") score: number = 0;
  @type("number") lastSeq: number = 0;
  @type("boolean") alive: boolean = true;
  @type("boolean") spawnProtection: boolean = false; // Spawn protection status
  @type("number") spawnProtectionStart: number = 0; // When protection started
  @type("number") spawnProtectionTime: number = 6000; // 6 seconds protection
  
  // Server-side skin properties for multiplayer visibility
  @type("string") skinId: string = "default";
  @type("string") skinName: string = "Default Warrior";
  @type("string") skinColor: string = "#4A90E2";
  @type("string") skinType: string = "circle";
  @type("string") skinPattern: string = "solid";
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
  worldSize = parseInt(process.env.WORLD_SIZE || '6000');
  maxCoins = 1000; // Increased from 100 to match local agario density
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
    
    // Store client metadata FIRST (before deduplication check)
    (client as any).userData = {
      privyUserId,
      playerName,
      lastInputTime: Date.now()
    };
    
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
          const oldPlayerName = existingPlayer.name;
          if (oldPlayerName !== playerName) {
            console.log(`⚠️ DUPLICATE by privyUserId with NAME CHANGE: ${privyUserId} "${oldPlayerName}" -> "${playerName}" (existing: ${existingSessionId}, new: ${client.sessionId})`);
          } else {
            console.log(`⚠️ DUPLICATE by privyUserId: ${privyUserId} (existing: ${existingSessionId}, new: ${client.sessionId})`);
          }
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
    
    // Generate spawn position within circular playable area
    const spawnPosition = this.generateCircularSpawnPosition();
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    
    player.vx = 0;
    player.vy = 0;
    player.mass = 25; // Updated to 25 to match user requirement
    player.radius = Math.sqrt(player.mass) * 3; // Use proper formula: √25 * 3 = 15
    
    // Apply skin data from client options (server-side storage for multiplayer visibility)
    const selectedSkin = options.selectedSkin || {};
    player.skinId = selectedSkin.id || "default";
    player.skinName = selectedSkin.name || "Default Warrior";
    player.skinColor = selectedSkin.color || "#4A90E2";
    player.skinType = selectedSkin.type || "circle";
    player.skinPattern = selectedSkin.pattern || "solid";
    
    // Use skin color as player color for consistent appearance
    player.color = player.skinColor;
    
    player.score = 0;
    player.lastSeq = 0;
    player.alive = true;
    
    // Initialize spawn protection
    player.spawnProtection = true;
    player.spawnProtectionStart = Date.now();
    player.spawnProtectionTime = 6000; // 6 seconds protection
    
    console.log(`🎨 Player ${playerName} joined with skin: ${player.skinName} (${player.skinColor})`);
    
    // Add player to game state
    this.state.players.set(client.sessionId, player);
    
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
    
    // Set target position instead of direct velocity (matching local agario)
    const moveSpeed = 500; // Base move speed matching local agario
    
    // Calculate target position based on input direction
    const targetX = player.x + dx * moveSpeed;
    const targetY = player.y + dy * moveSpeed;
    
    // Store target in velocity fields for now (we'll use them as target storage)
    player.vx = targetX;
    player.vy = targetY;
    
    console.log(`✅ Set movement target for ${player.name}:`, {
      input: { dx: dx.toFixed(3), dy: dy.toFixed(3) },
      currentPos: { x: player.x.toFixed(1), y: player.y.toFixed(1) },
      targetPos: { x: targetX.toFixed(1), y: targetY.toFixed(1) }
    });
  }

  handleSplit(client: Client, message: any) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) {
        console.log(`⚠️ Split ignored - player not found or dead for session: ${client.sessionId}`);
        return;
      }

      // Validate message format and data
      if (!message || typeof message !== 'object') {
        console.log(`⚠️ Split ignored - invalid message format for session: ${client.sessionId}`, message);
        return;
      }

      const { targetX, targetY } = message;
      
      // Validate coordinates are numbers
      if (typeof targetX !== 'number' || typeof targetY !== 'number' || 
          !isFinite(targetX) || !isFinite(targetY)) {
        console.log(`⚠️ Split ignored - invalid coordinates for session: ${client.sessionId}`, { targetX, targetY });
        return;
      }
    
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
    
    // Position split piece safely
    const spawnDistance = Math.max(player.radius + 30, 80); // Safe spawn distance
    splitPlayer.x = player.x + dirX * spawnDistance;
    splitPlayer.y = player.y + dirY * spawnDistance;
    
    // Keep split piece in bounds
    // Keep split player in circular bounds
    const centerX = this.worldSize / 2;
    const centerY = this.worldSize / 2;
    const playableRadius = 2500;
    const maxRadius = playableRadius - splitPlayer.radius;
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(splitPlayer.x - centerX, 2) + 
      Math.pow(splitPlayer.y - centerY, 2)
    );
    
    if (distanceFromCenter > maxRadius) {
      const angle = Math.atan2(splitPlayer.y - centerY, splitPlayer.x - centerX);
      splitPlayer.x = centerX + Math.cos(angle) * maxRadius;
      splitPlayer.y = centerY + Math.sin(angle) * maxRadius;
    }
    
    // Set split piece properties
    splitPlayer.vx = 0; // Use target positioning instead of velocity
    splitPlayer.vy = 0;
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
      
      if (splitPiece && mainPlayer && splitPiece.alive && mainPlayer.alive) {
        console.log(`🔄 Auto-merging split piece for ${mainPlayer.name}`);
        mainPlayer.mass += splitPiece.mass;
        mainPlayer.radius = Math.sqrt(mainPlayer.mass) * 3; // Match agario radius formula
        this.state.players.delete(splitId);
      }
    }, 5000);
    } catch (error) {
      console.error(`❌ Error handling split for session ${client.sessionId}:`, error);
      // Don't disconnect the client, just log the error and continue
    }
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
    const now = Date.now();
    
    // Update all players with smooth movement and spawn protection
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      
      // Update spawn protection status
      if (player.spawnProtection) {
        if (now - player.spawnProtectionStart >= player.spawnProtectionTime) {
          player.spawnProtection = false;
          console.log(`🛡️ Spawn protection ended for ${player.name}`);
        }
      }
      
      // Smooth movement toward target (vx and vy are being used as targetX and targetY)
      const targetX = player.vx;
      const targetY = player.vy;
      
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 1) { // Only move if target is far enough
        // Calculate dynamic speed based on mass (matching local agario formula)
        const baseSpeed = 6.0;
        const massSpeedFactor = Math.sqrt(player.mass / 20);
        const dynamicSpeed = Math.max(1.5, baseSpeed / massSpeedFactor);
        
        // Calculate move distance based on speed and delta time
        const moveDistance = dynamicSpeed * deltaTime * 60; // 60 for frame rate normalization
        
        // Clamp movement to not overshoot target
        const actualMoveDistance = Math.min(moveDistance, distance);
        
        // Normalize direction and apply smooth movement
        const moveX = (dx / distance) * actualMoveDistance;
        const moveY = (dy / distance) * actualMoveDistance;
        
        player.x += moveX;
        player.y += moveY;
      }
      
      // Keep player in circular bounds (matching client-side circular boundary)
      const centerX = this.worldSize / 2;
      const centerY = this.worldSize / 2;
      const playableRadius = 2500; // Match client-side maxPlayableRadius
      const maxRadius = playableRadius - player.radius;
      
      const distanceFromCenter = Math.sqrt(
        Math.pow(player.x - centerX, 2) + 
        Math.pow(player.y - centerY, 2)
      );
      
      if (distanceFromCenter > maxRadius) {
        // Clamp player to circular boundary (server-side enforcement)
        const angle = Math.atan2(player.y - centerY, player.x - centerX);
        player.x = centerX + Math.cos(angle) * maxRadius;
        player.y = centerY + Math.sin(angle) * maxRadius;
      }
      
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
      
      // Skip collision if either player has spawn protection
      if (player.spawnProtection || otherPlayer.spawnProtection) {
        return;
      }
      
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
    // Generate respawn position within circular playable area
    const spawnPosition = this.generateCircularSpawnPosition();
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    
    player.vx = 0;
    player.vy = 0;
    player.mass = 25; // Updated to 25 to match user requirement
    player.radius = Math.sqrt(player.mass) * 3; // Use proper formula: √25 * 3 = 15
    player.alive = true;
    
    // Enable spawn protection on respawn
    player.spawnProtection = true;
    player.spawnProtectionStart = Date.now();
    player.spawnProtectionTime = 6000; // 6 seconds protection
    
    console.log(`🔄 Player respawned: ${player.name} at (${player.x.toFixed(1)}, ${player.y.toFixed(1)}) with spawn protection`);
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

  // Generate safe spawn position within circular playable area (avoiding red zone)
  generateSafeSpawnPosition(): { x: number, y: number } {
    const centerX = this.worldSize / 2; // 2000 for 4000x4000 world
    const centerY = this.worldSize / 2; // 2000 for 4000x4000 world
    
    // Use conservative radius to ensure objects never spawn in red zone
    const safeZoneRadius = 1800; // Expanded to match minimap and local agario (full playable area)
    
    // Generate random point within safe circular area
    const angle = Math.random() * Math.PI * 2; // Random angle
    const distance = Math.sqrt(Math.random()) * safeZoneRadius; // Square root for uniform distribution
    
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    return { x, y };
  }

  spawnCoin() {
    const coinId = `coin_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const coin = new Coin();
    
    // Use safe spawn position to avoid red zone
    const safePos = this.generateSafeSpawnPosition();
    coin.x = safePos.x;
    coin.y = safePos.y;
    coin.value = 1;
    coin.radius = 8;
    coin.color = "#FFD700";
    
    this.state.coins.set(coinId, coin);
  }

  spawnVirus() {
    const virusId = `virus_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const virus = new Virus();
    
    // Use safe spawn position to avoid red zone
    const safePos = this.generateSafeSpawnPosition();
    virus.x = safePos.x;
    virus.y = safePos.y;
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

  // Generate random spawn position within circular playable area
  generateCircularSpawnPosition(): { x: number, y: number } {
    const centerX = this.worldSize / 2; // 2000 for 4000x4000 world
    const centerY = this.worldSize / 2; // 2000 for 4000x4000 world
    
    // Use conservative radius to ensure players never spawn in red zone
    const safeZoneRadius = 1800; // Expanded to match minimap and local agario (full playable area)
    
    // Generate random point within safe circular area
    const angle = Math.random() * Math.PI * 2; // Random angle
    const distance = Math.sqrt(Math.random()) * safeZoneRadius; // Square root for uniform distribution
    
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    console.log(`🎯 SAFE SPAWN: Player spawned at (${x.toFixed(1)}, ${y.toFixed(1)}) - distance ${distance.toFixed(1)} from center (safe radius: ${safeZoneRadius})`);
    
    return { x, y };
  }

  onDispose() {
    console.log('🛑 Arena room disposed');
  }
}