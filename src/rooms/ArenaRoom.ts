import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";

const BASE_MOVEMENT_SPEED = 5.5;
const MIN_MOVEMENT_SPEED = 2.0;
const MASS_SPEED_EXPONENT = 0.3;
const MIN_SPEED_MASS = 25;

const computeMassMovementSpeed = (mass: number): number => {
  const normalizedMass = Math.max(mass, MIN_SPEED_MASS);
  const falloff = Math.pow(normalizedMass / MIN_SPEED_MASS, MASS_SPEED_EXPONENT);
  return Math.max(MIN_MOVEMENT_SPEED, BASE_MOVEMENT_SPEED / falloff);
};

// Player state schema
export class Player extends Schema {
  @type("string") name: string = "Player";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") moveTargetX: number = 0; // Smoothed movement target X
  @type("number") moveTargetY: number = 0; // Smoothed movement target Y
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
  @type("boolean") cashOutComplete: boolean = false; // Whether cash out has been completed
  
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
  
  // Money indicator for paid arenas
  @type("number") currentValue: number = 0; // Current USD value based on mass (for display)
  @type("number") cashOutValue: number = 0; // Accumulated cash-out value (entry fee + eliminated players)
  @type("boolean") isPaidArena: boolean = false; // Whether this is a paid arena
  @type("string") userWalletAddress: string = ""; // User's Solana wallet address for cash-outs
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
  maxCoins = 3000; // Tripled coin density within the playable arena
  maxViruses = 30; // Doubled virus (spike) density for arena mode
  tickRate = parseInt(process.env.TICK_RATE || '20'); // TPS server logic
  
  // Paid arena configuration
  private isPaidArena: boolean = false;
  private entryFee: number = 0;

  private spawnOffsets: Array<{ x: number, y: number }> = [
    { x: 0, y: 0 },
    { x: 1200, y: 0 },
    { x: -1200, y: 0 },
    { x: 0, y: 1200 },
    { x: 0, y: -1200 },
    { x: 850, y: 850 },
    { x: -850, y: 850 },
    { x: 850, y: -850 }
  ];
  private nextSpawnIndex = 0;
  
  onCreate(options: any = {}) {
    console.log("🌍 Arena room initialized");
    console.log("📋 Room creation options:", JSON.stringify(options, null, 2));
    
    // Determine if this is a paid arena from roomName or options
    const roomName = options.roomName || '';
    
    // Parse entry fee from room name (e.g., "colyseus-cash-050-au" -> $0.50)
    // or from options
    if (roomName.includes('cash-')) {
      const match = roomName.match(/cash-(\d+)/);
      if (match) {
        const feeStr = match[1]; // e.g., "050", "002", "065"
        this.entryFee = parseInt(feeStr) / 100; // Convert "050" to 0.50
        this.isPaidArena = true;
        console.log(`💰 Parsed from roomName: Entry fee $${this.entryFee.toFixed(2)}`);
      }
    } else if (options.entryFee > 0) {
      // Fallback to options
      this.isPaidArena = true;
      this.entryFee = options.entryFee;
      console.log(`💰 From options: Entry fee $${this.entryFee.toFixed(2)}`);
    } else {
      this.isPaidArena = false;
      this.entryFee = 0;
    }
    
    if (this.isPaidArena) {
      console.log(`✅ Paid Arena Initialized: Entry fee $${this.entryFee.toFixed(2)}`);
    } else {
      console.log(`✅ Free Practice Arena Initialized`);
    }

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

  private getNextSpawnPosition(): { x: number, y: number } {
    const centerX = this.worldSize / 4; // 2000 for 8000x8000 world - moved to left side
    const centerY = this.worldSize / 4; // 2000 for 8000x8000 world - moved to top side
    const currentIndex = this.nextSpawnIndex;
    const offset = this.spawnOffsets[currentIndex];
    this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.spawnOffsets.length;

    const x = centerX + offset.x;
    const y = centerY + offset.y;

    console.log(
      `🎯 SAFE SPAWN SLOT: Player assigned slot ${currentIndex} at (${x.toFixed(1)}, ${y.toFixed(1)}) relative to center (${centerX}, ${centerY})`
    );
    console.log(
      `🎯 SPAWN BOUNDS: X range: ${(centerX - 1800).toFixed(1)} to ${(centerX + 1800).toFixed(1)}, Y range: ${(centerY - 1800).toFixed(1)} to ${(centerY + 1800).toFixed(1)}`
    );

    return { x, y };
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
    const spawnPosition = this.getNextSpawnPosition();
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;

    player.vx = 0;
    player.vy = 0;
    player.moveTargetX = player.x;
    player.moveTargetY = player.y;
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
    
    // Set paid arena flag and initial value
    player.isPaidArena = this.isPaidArena;
    if (this.isPaidArena) {
      // Calculate starting balance: entry fee minus 10% platform fee (user gets 90%)
      const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee
      const startingBalance = this.entryFee * (1 - PLATFORM_FEE_PERCENTAGE);
      
      // Initialize with net balance after platform fee
      player.currentValue = startingBalance;
      player.cashOutValue = startingBalance; // Start with entry fee minus platform fee
      
      // Store user's wallet address for cash-outs
      player.userWalletAddress = options.userWalletAddress || "";
      
      console.log(`💰 Player ${playerName} paid $${this.entryFee.toFixed(2)} entry fee`);
      console.log(`💰 After 10% platform fee, starting balance: $${player.cashOutValue.toFixed(2)}`);
      console.log(`👛 User wallet address: ${player.userWalletAddress || 'NOT PROVIDED'}`);
    }
    
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

    if (typeof dx !== "number" || typeof dy !== "number" || !isFinite(dx) || !isFinite(dy)) {
      console.log(`⚠️ Input ignored - invalid direction for ${client.sessionId}`);
      return;
    }
    
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

    player.moveTargetX = targetX;
    player.moveTargetY = targetY;

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
      player.vx = 0;
      player.vy = 0;
      player.moveTargetX = player.x;
      player.moveTargetY = player.y;
      player.momentumX = 0;
      player.momentumY = 0;
      
      console.log(`📊 Mass halved: ${originalMass} → ${newMass}`);

      const centerX = this.worldSize / 4;
      const centerY = this.worldSize / 4;
      const playableRadius = 1800;

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
      splitPiece.moveTargetX = splitPiece.x;
      splitPiece.moveTargetY = splitPiece.y;
      splitPiece.alive = true;
      
      // Split piece metadata
      splitPiece.isSplitPiece = true;
      splitPiece.ownerSessionId = client.sessionId;
      splitPiece.splitTime = now;
      
      // Apply initial momentum (SPEED_SPLIT = 800)
      const SPEED_SPLIT = 800;
      splitPiece.momentumX = dirX * SPEED_SPLIT;
      splitPiece.momentumY = dirY * SPEED_SPLIT;
      
      // Set merge timer (NO_MERGE_MS = 12000 = 12 seconds)
      const NO_MERGE_MS = 12000;
      splitPiece.noMergeUntil = now + NO_MERGE_MS;
      player.noMergeUntil = now + NO_MERGE_MS;
      
      const clampToPlayableArea = (x: number, y: number, radius: number) => {
        const maxRadius = playableRadius - radius;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxRadius) {
          const angle = Math.atan2(dy, dx);
          return {
            x: centerX + Math.cos(angle) * maxRadius,
            y: centerY + Math.sin(angle) * maxRadius
          };
        }

        return { x, y };
      };

      const ownerStartX = player.x;
      const ownerStartY = player.y;
      const desiredSeparation = player.radius + splitPiece.radius + 4; // leave a small buffer

      // Initial placement aims directly along the split direction with desired spacing
      let proposedSplitX = ownerStartX + dirX * desiredSeparation;
      let proposedSplitY = ownerStartY + dirY * desiredSeparation;

      const clampedSplit = clampToPlayableArea(proposedSplitX, proposedSplitY, splitPiece.radius);
      proposedSplitX = clampedSplit.x;
      proposedSplitY = clampedSplit.y;

      splitPiece.x = proposedSplitX;
      splitPiece.y = proposedSplitY;

      let ownerFinalX = ownerStartX;
      let ownerFinalY = ownerStartY;

      const ensureMinimumSeparation = () => {
        const dxPieces = splitPiece.x - ownerFinalX;
        const dyPieces = splitPiece.y - ownerFinalY;
        const distance = Math.sqrt(dxPieces * dxPieces + dyPieces * dyPieces);
        const minimumAllowed = player.radius + splitPiece.radius + 1; // ensure no overlap

        if (distance >= minimumAllowed) {
          return;
        }

        const normX = distance > 0 ? dxPieces / distance : dirX;
        const normY = distance > 0 ? dyPieces / distance : dirY;
        const separationShortfall = minimumAllowed - distance;

        // First try pulling the owner slightly backward to increase the gap
        ownerFinalX -= normX * separationShortfall;
        ownerFinalY -= normY * separationShortfall;

        const clampedOwner = clampToPlayableArea(ownerFinalX, ownerFinalY, player.radius);
        ownerFinalX = clampedOwner.x;
        ownerFinalY = clampedOwner.y;

        // Recalculate separation after adjusting the owner
        const newDx = splitPiece.x - ownerFinalX;
        const newDy = splitPiece.y - ownerFinalY;
        const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);

        if (newDistance >= minimumAllowed) {
          return;
        }

        const remainingShortfall = minimumAllowed - newDistance;

        // As a fallback, nudge the split piece forward along the separation axis
        splitPiece.x += normX * remainingShortfall;
        splitPiece.y += normY * remainingShortfall;

        const fallbackSplit = clampToPlayableArea(splitPiece.x, splitPiece.y, splitPiece.radius);
        splitPiece.x = fallbackSplit.x;
        splitPiece.y = fallbackSplit.y;
      };

      ensureMinimumSeparation();

      // Update owner position/targets if it was nudged for spacing
      player.x = ownerFinalX;
      player.y = ownerFinalY;
      player.moveTargetX = ownerFinalX;
      player.moveTargetY = ownerFinalY;

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
        if (progress >= 100 && !player.cashOutComplete) {
          player.isCashingOut = false;
          player.cashOutProgress = 0;
          player.cashOutStartTime = 0;
          player.cashOutComplete = true; // Mark as complete to prevent multiple calls
          
          console.log(`💰 Cash out completed for ${player.name} - score: ${player.score}`);
          
          // Process real money cash-out for paid arenas
          if (this.isPaidArena && player.isPaidArena && player.cashOutValue > 0) {
            this.processCashOut(player, ownerSessionId).catch(error => {
              console.error(`❌ Cash-out processing error for ${player.name}:`, error.message);
            });
          }
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
        // NORMAL PLAYER MOVEMENT: Smooth movement toward target with velocity smoothing
        const targetX = player.moveTargetX ?? player.x;
        const targetY = player.moveTargetY ?? player.y;

        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate dynamic speed based on mass using a softened falloff curve
        const dynamicSpeed = computeMassMovementSpeed(player.mass);
        const desiredSpeedPerSecond = dynamicSpeed * 60; // Convert to units per second

        if (distance > 0.5) {
          // Smooth acceleration toward desired velocity to remove abrupt direction changes
          const dirX = dx / distance;
          const dirY = dy / distance;
          const desiredVx = dirX * desiredSpeedPerSecond;
          const desiredVy = dirY * desiredSpeedPerSecond;

          const accelerationRate = 10; // Higher values accelerate faster
          const accelLerp = 1 - Math.exp(-accelerationRate * deltaTime);

          player.vx += (desiredVx - player.vx) * accelLerp;
          player.vy += (desiredVy - player.vy) * accelLerp;
        } else {
          // Close to target - gently slow down to avoid jitter
          const dampingRate = 14;
          const dampingFactor = Math.exp(-dampingRate * deltaTime);
          player.vx *= dampingFactor;
          player.vy *= dampingFactor;

          if (distance <= 0.1) {
            player.moveTargetX = player.x;
            player.moveTargetY = player.y;
          }
        }

        let newX = player.x + player.vx * deltaTime;
        let newY = player.y + player.vy * deltaTime;

        // Check if new position would violate boundary
        const newDistanceFromCenter = Math.sqrt(
          Math.pow(newX - centerX, 2) +
          Math.pow(newY - centerY, 2)
        );

        if (newDistanceFromCenter > maxRadius) {
          // Move player to boundary edge instead and clear velocity to prevent sliding
          const angle = Math.atan2(newY - centerY, newX - centerX);
          newX = centerX + Math.cos(angle) * maxRadius;
          newY = centerY + Math.sin(angle) * maxRadius;
          player.vx = 0;
          player.vy = 0;
        }

        player.x = newX;
        player.y = newY;

        // ADDITIONAL SAFETY CHECK: Ensure player is always within bounds
        const currentDistance = Math.sqrt(
          Math.pow(player.x - centerX, 2) +
          Math.pow(player.y - centerY, 2)
        );

        if (currentDistance > maxRadius) {
          // Force player back within boundary and zero velocity when clamped
          const angle = Math.atan2(player.y - centerY, player.x - centerX);
          player.x = centerX + Math.cos(angle) * maxRadius;
          player.y = centerY + Math.sin(angle) * maxRadius;
          player.vx = 0;
          player.vy = 0;
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

  // Calculate player's current USD value based on mass growth in paid arenas
  private updatePlayerValue(player: Player) {
    if (!this.isPaidArena || !player.isPaidArena) return;
    
    // Calculate value based on mass growth
    // Starting mass is 25, entry fee is the base value
    // Formula: currentValue = entryFee * (currentMass / startingMass)
    const startingMass = 25;
    const massRatio = player.mass / startingMass;
    player.currentValue = this.entryFee * massRatio;
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
        
        // Note: Cash-out value is NOT affected by coins, only by eliminating other players
        
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
          const enforceFloor = !player.isSplitPiece && oldMass >= 25;
          const newMass = enforceFloor
            ? Math.max(25, reducedMass)
            : Math.max(0, reducedMass);
          player.mass = newMass;
          player.radius = Math.sqrt(player.mass) * 3; // Match agario radius formula

          console.log(`💥 PLAYER HIT BY VIRUS:`, {
            playerName: player.name,
            oldMass: oldMass.toFixed(1),
            reducedTo: reducedMass.toFixed(1),
            finalMass: newMass.toFixed(1),
            reduction: (oldMass - newMass).toFixed(1),
            minimumEnforced: enforceFloor && newMass === 25,
            formula: `${enforceFloor ? "max(25," : ""}${oldMass.toFixed(1)} * 0.8${enforceFloor ? ")" : ""} = ${newMass.toFixed(1)}`,
            wasSplitPiece: player.isSplitPiece,
            wasBelowSpawnMass: oldMass < 25
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
          
          // Update player value in paid arenas
          this.updatePlayerValue(player);
          
          // Transfer cash-out value in paid arenas
          if (this.isPaidArena && player.isPaidArena && otherPlayer.isPaidArena) {
            const eliminatedBalance = otherPlayer.cashOutValue;
            player.cashOutValue += eliminatedBalance;
            player.currentValue = player.cashOutValue; // Update display value to match cash-out value
            console.log(`💰 ${player.name} gained $${eliminatedBalance.toFixed(2)} from ${otherPlayer.name}. New balance: $${player.cashOutValue.toFixed(2)}`);
          }
          
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

  async processCashOut(player: Player, sessionId: string) {
    try {
      console.log(`💰 Processing cash-out for ${player.name}...`);
      console.log(`   Cash-out value: $${player.cashOutValue.toFixed(2)}`);
      console.log(`   User wallet: ${player.userWalletAddress || 'NOT PROVIDED'}`);

      // Validate wallet address
      if (!player.userWalletAddress) {
        throw new Error('User wallet address not available');
      }

      // Get Privy user ID from client
      const client = this.clients.find(c => c.sessionId === sessionId);
      const privyUserId = (client as any)?.userData?.privyUserId || 'unknown';

      // Call cash-out API
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const cashOutUrl = `${baseUrl}/api/cashout`;

      console.log(`📡 Calling cash-out API: ${cashOutUrl}`);

      const response = await fetch(cashOutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWalletAddress: player.userWalletAddress,
          cashOutValueUSD: player.cashOutValue,
          privyUserId: privyUserId,
          playerName: player.name
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Cash-out API request failed');
      }

      console.log(`✅ Cash-out successful for ${player.name}!`);
      console.log(`   Transaction signature: ${result.signature}`);
      console.log(`   Payout: $${result.payoutUSD} (${result.payoutSOL} SOL)`);
      console.log(`   Platform fee: $${result.platformFeeUSD} (10%)`);

      // Broadcast success message to client
      if (client) {
        this.broadcast('cashOutSuccess', {
          playerName: player.name,
          payoutUSD: result.payoutUSD,
          payoutSOL: result.payoutSOL,
          signature: result.signature
        });
      }

    } catch (error) {
      console.error(`❌ Cash-out failed for ${player.name}:`, error.message);
      
      // Broadcast error to client
      const client = this.clients.find(c => c.sessionId === sessionId);
      if (client) {
        this.broadcast('cashOutError', {
          playerName: player.name,
          error: error.message
        });
      }
    }
  }

  onDispose() {
    console.log('🛑 Arena room disposed');
  }
}