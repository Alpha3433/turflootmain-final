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
  @type("number") spawnProtectionTime: number = 4000; // 4 seconds protection
  
  // Cash out state for multiplayer visibility
  @type("boolean") isCashingOut: boolean = false; // Whether player is cashing out
  @type("number") cashOutProgress: number = 0; // Cash out progress (0-100)
  @type("number") cashOutStartTime: number = 0; // When cash out started
  
  // Server-side skin properties for multiplayer visibility
  @type("string") skinId: string = "default";
  @type("string") skinName: string = "Default Warrior";
  @type("string") skinColor: string = "#4A90E2";
  @type("string") skinType: string = "circle";
  @type("string") skinPattern: string = "solid";
  
  // Split piece tracking - Agar.io style
  @type("string") ownerSessionId: string = ""; // Session ID of the owner (empty for main player)
  @type("boolean") isSplitPiece: boolean = false; // Whether this is a split piece
  @type("number") splitTime: number = 0; // When this piece was created
  @type("number") targetX: number = 0; // Target position for split piece
  @type("number") targetY: number = 0; // Target position for split piece
  @type("number") momentumX: number = 0; // Momentum velocity X
  @type("number") momentumY: number = 0; // Momentum velocity Y
  @type("number") noMergeUntil: number = 0; // Timestamp when merge is allowed
  @type("number") lastSplitTime: number = 0; // Last time this player split (for cooldown)
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
  @type("number") worldSize: number = 8000;
  @type("number") timestamp: number = 0;
}

export class ArenaRoom extends Room<GameState> {
  maxClients = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '50');
  
  // Game configuration
  worldSize = parseInt(process.env.WORLD_SIZE || '8000');
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
    
    this.onMessage("cashOutStart", (client: Client, message: any) => {
      this.handleCashOutStart(client, message);
    });
    
    this.onMessage("cashOutStop", (client: Client, message: any) => {
      this.handleCashOutStop(client, message);
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
    
    console.log(`🎮 NEW PLAYER SPAWN: mass=${player.mass}, radius=${player.radius.toFixed(1)}px at (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`);
    
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
    player.spawnProtectionTime = 4000; // 4 seconds protection
    
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
    console.log(`🚀 SPLIT COMMAND RECEIVED - Session: ${client.sessionId}`);
    
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) {
        console.log(`⚠️ Split ignored - player not found or dead`);
        return;
      }

      // Validation 1: Check minimum mass (40 = MIN_SPLIT_MASS * 2)
      if (player.mass < 40) {
        console.log(`⚠️ Split denied - insufficient mass: ${player.mass} < 40`);
        return;
      }

      // Validation 2: Get and validate target coordinates
      const { targetX, targetY } = message;
      if (typeof targetX !== 'number' || typeof targetY !== 'number' || 
          !isFinite(targetX) || !isFinite(targetY)) {
        console.log(`⚠️ Split denied - invalid coordinates: ${targetX}, ${targetY}`);
        return;
      }

      // Validation 3: Enforce 500ms cooldown
      const now = Date.now();
      if (player.lastSplitTime > 0 && (now - player.lastSplitTime) < 500) {
        console.log(`⚠️ Split denied - cooldown active (${now - player.lastSplitTime}ms / 500ms)`);
        return;
      }

      // Validation 4: Count player's pieces (main + splits) and enforce 16 piece limit
      let pieceCount = 1; // Main player counts as 1
      this.state.players.forEach((p) => {
        if (p.isSplitPiece && p.ownerSessionId === client.sessionId && p.alive) {
          pieceCount++;
        }
      });
      
      if (pieceCount >= 16) {
        console.log(`⚠️ Split denied - max pieces reached: ${pieceCount}/16`);
        return;
      }

      // Calculate split direction
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 1) {
        console.log(`⚠️ Split denied - target too close`);
        return;
      }

      // Normalize direction
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Halve the owner's mass
      const originalMass = player.mass;
      const newMass = Math.floor(originalMass / 2);
      player.mass = newMass;
      player.radius = Math.sqrt(player.mass) * 3;
      player.lastSplitTime = now;

      // Reset movement targets and clear any residual momentum so the owner stays put
      player.vx = player.x;
      player.vy = player.y;
      player.momentumX = 0;
      player.momentumY = 0;
      
      console.log(`📊 Mass halved: ${originalMass} → ${newMass}`);

      // Create new split piece with unique ID
      const splitPieceId = `split_${Date.now()}_${client.sessionId}`;
      const splitPiece = new Player();
      
      // Copy basic properties from owner
      splitPiece.name = player.name;
      splitPiece.color = player.color;
      splitPiece.skinId = player.skinId;
      splitPiece.skinName = player.skinName;
      splitPiece.skinColor = player.skinColor;
      splitPiece.skinType = player.skinType;
      splitPiece.skinPattern = player.skinPattern;
      
      // Set split piece properties
      splitPiece.mass = newMass;
      splitPiece.radius = Math.sqrt(newMass) * 3;
      splitPiece.x = player.x;
      splitPiece.y = player.y;
      splitPiece.alive = true;
      
      // Split piece metadata
      splitPiece.isSplitPiece = true;
      splitPiece.ownerSessionId = client.sessionId;
      splitPiece.splitTime = now;
      
      // Apply initial momentum (SPEED_SPLIT = 1100)
      const SPEED_SPLIT = 1100;
      splitPiece.momentumX = dirX * SPEED_SPLIT;
      splitPiece.momentumY = dirY * SPEED_SPLIT;
      
      // Set merge timer (NO_MERGE_MS = 12000 = 12 seconds)
      const NO_MERGE_MS = 12000;
      splitPiece.noMergeUntil = now + NO_MERGE_MS;
      player.noMergeUntil = now + NO_MERGE_MS;
      
      // Add split piece to game state
      this.state.players.set(splitPieceId, splitPiece);
      
      console.log(`✅ Split completed - created piece ${splitPieceId}`);
      console.log(`📍 Owner at (${player.x.toFixed(1)}, ${player.y.toFixed(1)}) mass=${player.mass}`);
      console.log(`📍 Piece at (${splitPiece.x.toFixed(1)}, ${splitPiece.y.toFixed(1)}) mass=${splitPiece.mass}`);
      console.log(`🚀 Initial momentum: (${splitPiece.momentumX.toFixed(1)}, ${splitPiece.momentumY.toFixed(1)})`);
      
    } catch (error: any) {
      console.error(`❌ Split error:`, error);
    }
  }

  handleCashOutStart(client: Client, message: any) {
    console.log(`💰 CASH OUT START received from ${client.sessionId}`);
    
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) {
      console.log(`⚠️ Cash out start ignored - player not found or dead for session: ${client.sessionId}`);
      return;
    }

    // Start cash out process
    player.isCashingOut = true;
    player.cashOutProgress = 0;
    player.cashOutStartTime = Date.now();
    
    console.log(`💰 Cash out started for ${player.name} (${client.sessionId})`);
  }

  handleCashOutStop(client: Client, message: any) {
    console.log(`💰 CASH OUT STOP received from ${client.sessionId}`);
    
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) {
      console.log(`⚠️ Cash out stop ignored - player not found or dead for session: ${client.sessionId}`);
      return;
    }

    // Stop cash out process
    player.isCashingOut = false;
    player.cashOutProgress = 0;
    player.cashOutStartTime = 0;
    
    console.log(`💰 Cash out stopped for ${player.name} (${client.sessionId})`);
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
      
      // Update cash out progress
      if (player.isCashingOut && player.cashOutStartTime > 0) {
        const cashOutDuration = 5000; // 5 seconds to complete cash out
        const elapsedTime = now - player.cashOutStartTime;
        const progress = Math.min((elapsedTime / cashOutDuration) * 100, 100);
        
        player.cashOutProgress = progress;
        
        // Complete cash out when progress reaches 100%
        if (progress >= 100) {
          player.isCashingOut = false;
          player.cashOutProgress = 0;
          player.cashOutStartTime = 0;
          console.log(`💰 Cash out completed for ${player.name} - score: ${player.score}`);
          // Here you could add logic to actually cash out the player's score
        }
      }
      
      // ARENA BOUNDARY ENFORCEMENT CONSTANTS - declare at function scope
      const centerX = this.worldSize / 4; // 2000 - playable area center X
      const centerY = this.worldSize / 4; // 2000 - playable area center Y
      const playableRadius = 1800; // Match the red divider radius exactly
      const maxRadius = playableRadius - player.radius; // Player edge stops at red divider
      
      // SPLIT PIECE PHYSICS: Handle momentum-based movement for split pieces
      if (player.isSplitPiece) {
        const splitAge = now - player.splitTime;
        const DRAG = 4.5;
        
        // Apply drag to momentum (velocity decay)
        const dragFactor = Math.pow(1 - DRAG / 100, deltaTime * 60);
        player.momentumX *= dragFactor;
        player.momentumY *= dragFactor;
        
        // Move based on momentum
        player.x += player.momentumX * deltaTime;
        player.y += player.momentumY * deltaTime;
        
        // Keep within boundaries
        const distFromCenter = Math.sqrt(
          Math.pow(player.x - centerX, 2) + 
          Math.pow(player.y - centerY, 2)
        );
        
        if (distFromCenter > maxRadius) {
          const angle = Math.atan2(player.y - centerY, player.x - centerX);
          player.x = centerX + Math.cos(angle) * maxRadius;
          player.y = centerY + Math.sin(angle) * maxRadius;
          // Stop momentum when hitting boundary
          player.momentumX = 0;
          player.momentumY = 0;
        }
        
        // Check for merge with owner after 5 seconds (matching test expectations)
        if (splitAge >= 5000 && now >= player.noMergeUntil) {
          const owner = this.state.players.get(player.ownerSessionId);
          if (owner && owner.alive) {
            const dx = player.x - owner.x;
            const dy = player.y - owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const touchDistance = player.radius + owner.radius;
            
            if (distance < touchDistance) {
              console.log(`🔄 Auto-merging split piece ${sessionId} into owner ${player.ownerSessionId}`);
              owner.mass += player.mass;
              owner.radius = Math.sqrt(owner.mass) * 3;
              player.alive = false;
              this.state.players.delete(sessionId);
              return;
            }
          }
        }
      } else {
        // NORMAL PLAYER MOVEMENT: Smooth movement toward target (vx and vy are being used as targetX and targetY)
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
          
          // Calculate proposed new position
          const moveX = (dx / distance) * actualMoveDistance;
          const moveY = (dy / distance) * actualMoveDistance;
          const newX = player.x + moveX;
          const newY = player.y + moveY;
          
          // Check if new position would violate boundary
          const newDistanceFromCenter = Math.sqrt(
            Math.pow(newX - centerX, 2) + 
            Math.pow(newY - centerY, 2)
          );
          
          if (newDistanceFromCenter > maxRadius) {
            // Move player to boundary edge instead
            const angle = Math.atan2(newY - centerY, newX - centerX);
            player.x = centerX + Math.cos(angle) * maxRadius;
            player.y = centerY + Math.sin(angle) * maxRadius;
          } else {
            // Safe to move - apply normal movement
            player.x = newX;
            player.y = newY;
          }
        }
        
        // ADDITIONAL SAFETY CHECK: Ensure player is always within bounds
        const currentDistance = Math.sqrt(
          Math.pow(player.x - centerX, 2) + 
          Math.pow(player.y - centerY, 2)
        );
        
        if (currentDistance > maxRadius) {
          // Force player back within boundary
          const angle = Math.atan2(player.y - centerY, player.x - centerX);
          player.x = centerX + Math.cos(angle) * maxRadius;
          player.y = centerY + Math.sin(angle) * maxRadius;
        }
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
    const originalMass = player.mass;
    
    this.state.viruses.forEach((virus, virusId) => {
      if (!virus || virus.radius <= 0) return; // Skip invalid viruses
      
      const dx = player.x - virus.x;
      const dy = player.y - virus.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.radius + virus.radius) {
        // Collision detected - calculate virus mass from radius for comparison
        const virusMass = Math.pow(virus.radius / 3, 2); // Reverse of radius = sqrt(mass) * 3
        
        console.log(`🦠 VIRUS COLLISION DETECTED:`, {
          playerName: player.name,
          playerMass: player.mass.toFixed(1),
          virusRadius: virus.radius.toFixed(1),
          virusMass: virusMass.toFixed(1),
          threshold: (virus.radius * 2).toFixed(1),
          canEat: player.mass > virus.radius * 2
        });
        
        if (player.mass > virus.radius * 2) {
          // Player eats virus
          const massGain = 10; // Fixed score gain
          player.score += massGain;
          this.state.viruses.delete(virusId);
          this.spawnVirus();
          
          console.log(`🍽️ PLAYER EATS VIRUS:`, {
            playerName: player.name,
            scoreGain: massGain,
            newScore: player.score
          });
        } else {
          // Player gets damaged by virus
          const oldMass = player.mass;
          const reducedMass = player.mass * 0.8;
          const newMass = Math.max(25, reducedMass);
          player.mass = newMass;
          player.radius = Math.sqrt(player.mass) * 3; // Match agario radius formula
          
          console.log(`💥 PLAYER HIT BY VIRUS:`, {
            playerName: player.name,
            oldMass: oldMass.toFixed(1),
            reducedTo: reducedMass.toFixed(1),
            finalMass: newMass.toFixed(1),
            reduction: (oldMass - newMass).toFixed(1),
            minimumEnforced: newMass === 25,
            formula: `max(25, ${oldMass.toFixed(1)} * 0.8) = max(25, ${reducedMass.toFixed(1)}) = ${newMass.toFixed(1)}`
          });
        }
      }
    });
    
    // Log any unexpected mass changes
    if (player.mass !== originalMass && player.mass === 50) {
      console.log(`⚠️ SUSPICIOUS MASS CHANGE TO 50:`, {
        playerName: player.name,
        originalMass: originalMass.toFixed(1),
        newMass: player.mass.toFixed(1),
        stackTrace: new Error().stack
      });
    }
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
        // Simple player collision - no complex split logic
        if (player.mass > otherPlayer.mass * 1.2) {
          player.mass += otherPlayer.mass * 0.8;
          player.score += otherPlayer.score * 0.5;
          player.radius = Math.sqrt(player.mass) * 3; // Match agario radius formula
          
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

          const eliminatedClient = this.clients.find(c => c.sessionId === otherSessionId);
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
    player.spawnProtectionTime = 4000; // 4 seconds protection
    
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
    const centerX = this.worldSize / 4; // 2000 for 8000x8000 world - moved to left side
    const centerY = this.worldSize / 4; // 2000 for 8000x8000 world - moved to top side
    
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
    const centerX = this.worldSize / 4; // 2000 for 8000x8000 world - moved to left side
    const centerY = this.worldSize / 4; // 2000 for 8000x8000 world - moved to top side
    
    // Use conservative radius to ensure players never spawn in red zone
    const safeZoneRadius = 1800; // Expanded to match minimap and local agario (full playable area)
    
    // Generate random point within safe circular area
    const angle = Math.random() * Math.PI * 2; // Random angle
    const distance = Math.sqrt(Math.random()) * safeZoneRadius; // Square root for uniform distribution
    
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    console.log(`🎯 SAFE SPAWN: Player spawned at (${x.toFixed(1)}, ${y.toFixed(1)}) - distance ${distance.toFixed(1)} from center (${centerX}, ${centerY}) (safe radius: ${safeZoneRadius})`);
    console.log(`🎯 SPAWN VERIFICATION: World size: ${this.worldSize}x${this.worldSize}, Playable area: ${safeZoneRadius}px radius from center`);
    console.log(`🎯 SPAWN BOUNDS: X range: ${(centerX - safeZoneRadius).toFixed(1)} to ${(centerX + safeZoneRadius).toFixed(1)}, Y range: ${(centerY - safeZoneRadius).toFixed(1)} to ${(centerY + safeZoneRadius).toFixed(1)}`);
    
    return { x, y };
  }

  onDispose() {
    console.log('🛑 Arena room disposed');
  }
}