import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { MongoClient, Db } from "mongodb";
import crypto from "crypto";

const MIN_SPLIT_MASS = 40;
const MAX_SPLIT_PIECES = 16;
const SPLIT_COOLDOWN_MS = 500;
const SPEED_SPLIT = 800;
const MOMENTUM_DRAG = 1.2;
const NO_MERGE_MS = 12000;
const MOMENTUM_THRESHOLD = 0.1;
export const MERGE_ATTRACTION_RATE = 0.02;
export const MERGE_ATTRACTION_MAX = 120;
export const MERGE_ATTRACTION_SPACING = 0.05;
const FRICTION_PER_TICK_60HZ = 0.9830475724915585;

const USERS_COLLECTION = "users";
const TRANSACTIONS_COLLECTION = "transactions";

let cachedMongoClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function getDatabase(): Promise<Db | null> {
  if (!process.env.MONGO_URL) {
    console.warn("⚠️ Arena wallet integration disabled - MONGO_URL not configured");
    return null;
  }

  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedMongoClient) {
    cachedMongoClient = new MongoClient(process.env.MONGO_URL, {
      maxPoolSize: 5
    });
  }

  if (!cachedDb) {
    await cachedMongoClient.connect();
    cachedDb = cachedMongoClient.db(process.env.MONGO_DB_NAME || "turfloot");
  }

  return cachedDb;
}

// Player state schema
export class Player extends Schema {
  @type("string") name: string = "Player";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") mass: number = 25;
  @type("number") radius: number = 20;
  @type("string") color: string = "#FF6B6B";
  @type("number") score: number = 0;
  @type("number") lastSeq: number = 0;
  @type("boolean") alive: boolean = true;
  @type("string") ownerSessionId: string = "";
  @type("boolean") isSplitPiece: boolean = false;
  @type("number") splitTime: number = 0;
  @type("number") targetX: number = 0;
  @type("number") targetY: number = 0;
  @type("number") momentumX: number = 0;
  @type("number") momentumY: number = 0;
  @type("number") noMergeUntil: number = 0;
  @type("number") lastSplitTime: number = 0;
  @type("number") stake: number = 0;
  @type("string") userId: string = "";
  @type("number") walletEarnings: number = 0;
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
  @type("number") playableRadius: number = 1800;
  @type("number") timestamp: number = 0;
}

export class ArenaRoom extends Room<GameState> {
  maxClients = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '50');

  // Game configuration
  worldSize = parseInt(process.env.WORLD_SIZE || '4000');
  playableRadius = parseInt(process.env.PLAYABLE_RADIUS || '1800');
  maxCoins = 300; // Triple the original 100-coin cap for higher arena density
  maxViruses = 30; // Double the spike count to intensify arena hazards
  tickRate = parseInt(process.env.TICK_RATE || '20'); // TPS server logic
  private simulationRate = 60;
  private simulationDelta = 1 / 60;
  private simulationAccumulator = 0;
  private broadcastAccumulator = 0;
  private broadcastInterval = 1 / 20;
  private simulationTimestampMs = Date.now();

  private normalizeStake(raw: unknown): number {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.max(0, raw);
    }

    if (typeof raw === "string") {
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed)) {
        return Math.max(0, parsed);
      }
    }

    return 0;
  }

  private buildUserFilter(userId: string) {
    return {
      $or: [
        { id: userId },
        { privy_id: userId },
        { user_id: userId },
        { wallet_address: userId }
      ]
    };
  }

  private async reserveStake(userId: string, amount: number): Promise<boolean> {
    if (!userId || amount <= 0) {
      return false;
    }

    const db = await getDatabase();
    if (!db) {
      return false;
    }

    const users = db.collection(USERS_COLLECTION);
    const transactions = db.collection(TRANSACTIONS_COLLECTION);

    const filter = this.buildUserFilter(userId);
    const user = await users.findOne(filter);

    const currentBalance = typeof user?.balance === "number"
      ? user.balance
      : parseFloat(user?.balance ?? "0");

    if (!user || !Number.isFinite(currentBalance) || currentBalance < amount) {
      console.warn(`⚠️ Unable to reserve stake for ${userId} - insufficient balance or user missing`);
      return false;
    }

    await users.updateOne(filter, {
      $inc: {
        balance: -amount,
        arena_stake_locked: amount
      },
      $set: { updated_at: new Date() }
    });

    await transactions.insertOne({
      id: crypto.randomUUID(),
      type: "arena_stake_reserved",
      user_id: userId,
      amount,
      currency: "USD",
      game_room: this.roomId,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`💰 Reserved $${amount.toFixed(2)} stake for user ${userId}`);
    return true;
  }

  private async refundStake(userId: string, amount: number) {
    if (!userId || amount <= 0) {
      return;
    }

    const db = await getDatabase();
    if (!db) {
      return;
    }

    const users = db.collection(USERS_COLLECTION);
    const transactions = db.collection(TRANSACTIONS_COLLECTION);
    const filter = this.buildUserFilter(userId);

    await users.updateOne(filter, {
      $inc: {
        balance: amount,
        arena_stake_locked: -amount
      },
      $set: { updated_at: new Date() }
    });

    await transactions.insertOne({
      id: crypto.randomUUID(),
      type: "arena_stake_refund",
      user_id: userId,
      amount,
      currency: "USD",
      game_room: this.roomId,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`↩️ Refunded $${amount.toFixed(2)} stake to user ${userId}`);
  }

  private async transferStakeToWinner(
    winnerId: string | null,
    loserId: string | null,
    amount: number,
    winnerName: string,
    loserName: string
  ): Promise<boolean> {
    if (amount <= 0) {
      return false;
    }

    const db = await getDatabase();
    if (!db) {
      return false;
    }

    const users = db.collection(USERS_COLLECTION);
    const transactions = db.collection(TRANSACTIONS_COLLECTION);

    const operations: Promise<unknown>[] = [];
    const now = new Date();

    if (loserId) {
      operations.push(users.updateOne(this.buildUserFilter(loserId), {
        $inc: {
          arena_stake_locked: -amount,
          arena_losses: amount
        },
        $set: { updated_at: now }
      }));
    }

    if (winnerId) {
      operations.push(users.updateOne(this.buildUserFilter(winnerId), {
        $inc: {
          balance: amount,
          arena_winnings: amount
        },
        $set: { updated_at: now }
      }));
    }

    await Promise.all(operations);

    await transactions.insertOne({
      id: crypto.randomUUID(),
      type: "arena_stake_transfer",
      from_user: loserId,
      to_user: winnerId,
      amount,
      currency: "USD",
      game_room: this.roomId,
      metadata: {
        winnerName,
        loserName
      },
      created_at: now,
      updated_at: now
    });

    console.log(`🏦 Transferred $${amount.toFixed(2)} from ${loserId ?? 'unknown'} to ${winnerId ?? 'unknown'}`);
    return true;
  }

  private resolveControllingPlayer(player: Player, sessionId: string): Player | undefined {
    if (player.isSplitPiece && player.ownerSessionId) {
      return this.state.players.get(player.ownerSessionId);
    }

    return this.state.players.get(sessionId) || player;
  }

  private findClient(sessionId: string | undefined) {
    if (!sessionId) {
      return undefined;
    }

    return this.clients.find((client) => client.sessionId === sessionId);
  }

  private broadcastStakeTransfer(
    amount: number,
    winnerName: string,
    loserName: string,
    winnerSessionId?: string,
    loserSessionId?: string
  ) {
    const payload = {
      amount,
      winner: winnerName,
      loser: loserName,
      timestamp: Date.now()
    };

    this.broadcast("arena_stake_transfer", payload);

    const winnerClient = this.findClient(winnerSessionId);
    const loserClient = this.findClient(loserSessionId);

    winnerClient?.send("wallet_credit", payload);
    loserClient?.send("wallet_debit", payload);
  }

  onCreate() {
    console.log("🌍 Arena room initialized");

    // Initialize game state
    this.setState(new GameState());
    this.state.worldSize = this.worldSize;
    this.state.playableRadius = this.playableRadius;
    
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
    
    // Configure fixed timestep simulation (60 Hz sim, 20 Hz broadcast)
    this.simulationRate = 60;
    this.simulationDelta = 1 / this.simulationRate;
    this.broadcastInterval = 1 / this.tickRate;
    this.simulationAccumulator = 0;
    this.broadcastAccumulator = 0;
    this.simulationTimestampMs = Date.now();

    this.setSimulationInterval((deltaTime?: number) => {
      const deltaSeconds = typeof deltaTime === "number"
        ? Math.min(deltaTime, 250) / 1000
        : this.simulationDelta;
      this.stepSimulation(deltaSeconds);
    }, 1000 / this.simulationRate);

    console.log(`🪙 Generated ${this.maxCoins} coins`);
    console.log(`🦠 Generated ${this.maxViruses} viruses`);
    console.log(`🔄 Game loop started: ${this.simulationRate} Hz sim / ${this.tickRate} TPS broadcast`);
  }

  private getNextSpawnPosition(padding: number = 0): { x: number, y: number } {
    const spawn = this.samplePositionWithinPlayableRadius(padding);

    console.log(
      `🎯 ARENA SPAWN SLOT: Assigned random spawn at (${spawn.x.toFixed(1)}, ${spawn.y.toFixed(1)}) within playable radius ${this.playableRadius}`
    );

    return spawn;
  }

  private samplePositionWithinPlayableRadius(padding: number): { x: number, y: number } {
    const centerX = this.worldSize / 2;
    const centerY = this.worldSize / 2;
    const effectiveRadius = Math.max(0, this.playableRadius - padding);

    if (effectiveRadius === 0) {
      return { x: centerX, y: centerY };
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * effectiveRadius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    return { x, y };
  }

  private enforcePlayableBoundary(player: Player, resetMotion: boolean = false) {
    const centerX = this.worldSize / 2;
    const centerY = this.worldSize / 2;
    const dx = player.x - centerX;
    const dy = player.y - centerY;
    const distanceSq = dx * dx + dy * dy;
    const maxDistance = this.playableRadius - player.radius;

    if (maxDistance <= 0) {
      player.x = centerX;
      player.y = centerY;

      if (resetMotion) {
        player.vx = 0;
        player.vy = 0;
        player.momentumX = 0;
        player.momentumY = 0;
      }

      return;
    }

    const maxDistanceSq = maxDistance * maxDistance;

    if (distanceSq > maxDistanceSq) {
      const distance = Math.sqrt(distanceSq) || 1;
      const scale = maxDistance / distance;
      player.x = centerX + dx * scale;
      player.y = centerY + dy * scale;

      if (resetMotion) {
        player.vx = 0;
        player.vy = 0;
        player.momentumX = 0;
        player.momentumY = 0;
      }
    }
  }

  async onJoin(client: Client, options: any = {}) {
    const privyUserId = typeof options.privyUserId === "string"
      ? options.privyUserId
      : `anonymous_${Date.now()}`;
    const playerName = options.playerName || `Player_${Math.random().toString(36).substring(7)}`;
    const rawStake = options?.stakeAmount ?? options?.stake ?? options?.entryFee ?? 0;
    const stakeAmount = this.normalizeStake(rawStake);
    const isAuthenticated = Boolean(options?.isAuthenticated);

    console.log(`👋 Player joined: ${playerName} (${client.sessionId})`);

    // Create new player
    const player = new Player();
    player.name = playerName;
    player.mass = 25;
    player.radius = this.calculateRadius(player.mass);
    const spawnPosition = this.getNextSpawnPosition(player.radius);
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    player.vx = 0;
    player.vy = 0;
    player.color = this.generatePlayerColor();
    player.score = 0;
    player.lastSeq = 0;
    player.alive = true;
    player.ownerSessionId = client.sessionId;
    player.isSplitPiece = false;
    player.splitTime = 0;
    player.targetX = spawnPosition.x;
    player.targetY = spawnPosition.y;
    player.momentumX = 0;
    player.momentumY = 0;
    player.noMergeUntil = 0;
    player.lastSplitTime = 0;
    player.stake = 0;
    player.userId = privyUserId;
    player.walletEarnings = 0;

    // Add player to game state
    this.state.players.set(client.sessionId, player);

    // Store client metadata
    (client as any).userData = {
      privyUserId,
      playerName,
      lastInputTime: Date.now(),
      stake: stakeAmount,
      isAuthenticated
    };

    if (stakeAmount > 0 && isAuthenticated && privyUserId && privyUserId !== "") {
      try {
        const reserved = await this.reserveStake(privyUserId, stakeAmount);
        if (reserved) {
          player.stake = stakeAmount;
          (client as any).userData.stakeReserved = stakeAmount;
        } else {
          console.warn(`⚠️ Stake reservation failed for ${privyUserId} - continuing without wallet lock`);
        }
      } catch (error) {
        console.error(`❌ Error reserving stake for user ${privyUserId}:`, error);
      }
    }

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

  handleSplit(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.alive) {
      return;
    }

    console.log(`🚀 Split command received from ${client.sessionId}`);

    if (player.isSplitPiece) {
      return;
    }

    if (!message || typeof message !== "object") {
      return;
    }

    const { targetX, targetY } = message;

    if (
      typeof targetX !== "number" ||
      typeof targetY !== "number" ||
      !isFinite(targetX) ||
      !isFinite(targetY)
    ) {
      return;
    }

    const now = Date.now();

    if (player.mass < MIN_SPLIT_MASS) {
      return;
    }

    if (now - player.lastSplitTime < SPLIT_COOLDOWN_MS) {
      return;
    }

    const ownedPieces = this.countOwnedPieces(client.sessionId);
    if (ownedPieces >= MAX_SPLIT_PIECES) {
      return;
    }

    const dirXRaw = targetX - player.x;
    const dirYRaw = targetY - player.y;
    const distance = Math.sqrt(dirXRaw * dirXRaw + dirYRaw * dirYRaw) || 1;
    const dirX = distance === 0 ? 1 : dirXRaw / distance;
    const dirY = distance === 0 ? 0 : dirYRaw / distance;

    const splitMass = player.mass / 2;
    const splitRadius = this.calculateRadius(splitMass);

    player.mass = splitMass;
    player.radius = splitRadius;
    player.splitTime = now;
    player.targetX = targetX;
    player.targetY = targetY;
    player.lastSplitTime = now;
    player.noMergeUntil = now + NO_MERGE_MS;
    player.ownerSessionId = client.sessionId;
    player.momentumX -= dirX * (SPEED_SPLIT * 0.25);
    player.momentumY -= dirY * (SPEED_SPLIT * 0.25);

    const splitId = `split_${now}_${client.sessionId}_${Math.random().toString(36).substring(2, 8)}`;
    const splitPlayer = new Player();
    splitPlayer.name = player.name;
    splitPlayer.x = player.x;
    splitPlayer.y = player.y;
    splitPlayer.vx = player.vx;
    splitPlayer.vy = player.vy;
    splitPlayer.mass = splitMass;
    splitPlayer.radius = splitRadius;
    splitPlayer.color = player.color;
    splitPlayer.score = player.score;
    splitPlayer.lastSeq = player.lastSeq;
    splitPlayer.alive = true;
    splitPlayer.ownerSessionId = client.sessionId;
    splitPlayer.isSplitPiece = true;
    splitPlayer.splitTime = now;
    splitPlayer.targetX = targetX;
    splitPlayer.targetY = targetY;
    splitPlayer.momentumX = dirX * SPEED_SPLIT;
    splitPlayer.momentumY = dirY * SPEED_SPLIT;
    splitPlayer.noMergeUntil = now + NO_MERGE_MS;
    splitPlayer.lastSplitTime = now;
    splitPlayer.stake = 0;
    splitPlayer.userId = player.userId;
    splitPlayer.walletEarnings = 0;

    this.state.players.set(splitId, splitPlayer);

    console.log(`✅ Split created for ${client.sessionId} -> ${splitId}`);
  }

  async onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      if (player.alive && player.stake > 0 && player.userId) {
        try {
          await this.refundStake(player.userId, player.stake);
        } catch (error) {
          console.error(`❌ Failed to refund stake for ${player.userId}:`, error);
        }
      }

      console.log(`👋 Player left: ${player.name} (${client.sessionId})`);
      this.state.players.delete(client.sessionId);
    }
  }

  private stepSimulation(deltaSeconds: number) {
    if (deltaSeconds <= 0) {
      return;
    }

    this.simulationAccumulator += deltaSeconds;

    while (this.simulationAccumulator >= this.simulationDelta) {
      this.simulationTimestampMs += this.simulationDelta * 1000;
      this.simulateTick(this.simulationDelta, this.simulationTimestampMs);
      this.simulationAccumulator -= this.simulationDelta;
      this.broadcastAccumulator += this.simulationDelta;
    }

    while (this.broadcastAccumulator >= this.broadcastInterval) {
      this.broadcastAccumulator -= this.broadcastInterval;
      this.state.timestamp = this.simulationTimestampMs;
    }
  }

  private simulateTick(deltaTime: number, now: number) {
    const alivePlayers: Array<{ player: Player; sessionId: string }> = [];
    const ownerIds = new Set<string>();

    // Update momentum and collect ownership groups
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) {
        return;
      }

      this.applyMomentum(player, deltaTime);

      const ownerId = player.isSplitPiece && player.ownerSessionId
        ? player.ownerSessionId
        : sessionId;

      if (ownerId) {
        ownerIds.add(ownerId);
      }

      alivePlayers.push({ player, sessionId });
    });

    ownerIds.forEach((ownerId) => {
      const ownedCells = this.getOwnedCells(ownerId);
      if (ownedCells.length > 1) {
        this.applySplitAttraction(ownedCells, deltaTime);
      }
    });

    alivePlayers.forEach(({ player, sessionId }) => {
      // Apply movement
      player.x += player.vx * deltaTime * 10; // Scale for game feel
      player.y += player.vy * deltaTime * 10;

      // Keep player in bounds of the playable circle
      this.enforcePlayableBoundary(player, true);

      // Apply friction tuned for 60 Hz simulation
      player.vx *= FRICTION_PER_TICK_60HZ;
      player.vy *= FRICTION_PER_TICK_60HZ;

      // Check collisions
      this.checkCollisions(player, sessionId);
    });

    this.handleSplitMerging(now);
  }

  checkCollisions(player: Player, sessionId: string) {
    // Check coin collisions
    this.checkCoinCollisions(player);

    // Check virus collisions
    this.checkVirusCollisions(player);

    // Check player collisions
    this.checkPlayerCollisions(player, sessionId);
  }

  getOwnedCells(ownerSessionId: string) {
    const cells: Player[] = [];

    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) {
        return;
      }

      const controllingId = player.isSplitPiece && player.ownerSessionId
        ? player.ownerSessionId
        : sessionId;

      if (controllingId === ownerSessionId) {
        cells.push(player);
      }
    });

    return cells;
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
        player.radius = this.calculateRadius(player.mass);
        
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
          const oldMass = player.mass;
          const reducedMass = player.mass * 0.8;
          const enforceFloor = !player.isSplitPiece && oldMass >= 25;
          const newMass = enforceFloor
            ? Math.max(25, reducedMass)
            : Math.max(0, reducedMass);
          player.mass = newMass;
          player.radius = this.calculateRadius(player.mass);

          console.log("💥 Arena virus damage", {
            player: player.name,
            oldMass,
            reducedMass,
            newMass,
            enforceFloor,
            isSplitPiece: player.isSplitPiece,
            wasBelowSpawnMass: oldMass < 25
          });
        }
      }
    });
  }

  checkPlayerCollisions(player: Player, sessionId: string) {
    this.state.players.forEach((otherPlayer, otherSessionId) => {
      if (sessionId === otherSessionId || !otherPlayer.alive) return;

      if (this.areSameOwner(player, sessionId, otherPlayer, otherSessionId)) {
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
          player.radius = this.calculateRadius(player.mass);

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

          const eliminatedClient = this.clients.find((client) => client.sessionId === otherSessionId);
          const controllingWinner = this.resolveControllingPlayer(player, sessionId);
          const controllingLoser = this.resolveControllingPlayer(otherPlayer, otherSessionId);
          const winnerSessionOwnerId = player.isSplitPiece ? player.ownerSessionId : sessionId;
          const winnerName = controllingWinner?.name || player.name;
          const loserName = otherPlayer.name;
          const winnerUserId = controllingWinner?.userId || null;
          const loserUserId = controllingLoser?.userId || null;
          const loserStake = controllingLoser?.stake ?? 0;

          if (controllingLoser) {
            controllingLoser.stake = 0;
          }

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

          splitPiecesToRemove.forEach((splitSessionId) => {
            console.log(`🧹 Removing split piece ${splitSessionId} for eliminated player ${otherSessionId}`);
            this.state.players.delete(splitSessionId);
          });

          if (loserStake > 0 && winnerName) {
            this.transferStakeToWinner(
              winnerUserId,
              loserUserId,
              loserStake,
              winnerName,
              loserName
            ).then((success) => {
              if (success) {
                if (controllingWinner) {
                  controllingWinner.walletEarnings += loserStake;
                }
                this.broadcastStakeTransfer(
                  loserStake,
                  winnerName,
                  loserName,
                  winnerSessionOwnerId,
                  otherSessionId
                );
              }
            }).catch((error) => {
              console.error("❌ Failed to transfer stake after elimination:", error);
            });
          }

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

  countOwnedPieces(ownerSessionId: string) {
    let count = 0;
    this.state.players.forEach((player, sessionId) => {
      const owner = player.isSplitPiece ? player.ownerSessionId : sessionId;
      if (owner === ownerSessionId) {
        count++;
      }
    });
    return count;
  }

  applyMomentum(player: Player, deltaTime: number) {
    if (
      Math.abs(player.momentumX) < MOMENTUM_THRESHOLD &&
      Math.abs(player.momentumY) < MOMENTUM_THRESHOLD
    ) {
      player.momentumX = 0;
      player.momentumY = 0;
      return;
    }

    player.x += player.momentumX * deltaTime;
    player.y += player.momentumY * deltaTime;

    const dragFactor = Math.exp(-MOMENTUM_DRAG * deltaTime);
    player.momentumX *= dragFactor;
    player.momentumY *= dragFactor;

    if (Math.abs(player.momentumX) < MOMENTUM_THRESHOLD) {
      player.momentumX = 0;
    }

    if (Math.abs(player.momentumY) < MOMENTUM_THRESHOLD) {
      player.momentumY = 0;
    }

    this.enforcePlayableBoundary(player, true);
  }

  applySplitAttraction(cells: Player[], deltaTime: number) {
    if (cells.length <= 1) {
      return;
    }

    let totalMass = 0;
    let centroidX = 0;
    let centroidY = 0;

    cells.forEach((cell) => {
      if (!cell.alive || cell.mass <= 0) {
        return;
      }

      totalMass += cell.mass;
      centroidX += cell.x * cell.mass;
      centroidY += cell.y * cell.mass;
    });

    if (totalMass <= 0) {
      return;
    }

    centroidX /= totalMass;
    centroidY /= totalMass;

    cells.forEach((cell) => {
      if (!cell.alive) {
        return;
      }

      const dx = centroidX - cell.x;
      const dy = centroidY - cell.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq <= 0.0001) {
        return;
      }

      const distance = Math.sqrt(distanceSq);
      const spacing = cell.radius * MERGE_ATTRACTION_SPACING;
      const distanceAfterSpacing = Math.max(0, distance - spacing);

      if (distanceAfterSpacing <= 0) {
        return;
      }

      const dirX = dx / distance;
      const dirY = dy / distance;

      const attraction = distanceAfterSpacing * totalMass * MERGE_ATTRACTION_RATE;
      const cappedAttraction = Math.min(MERGE_ATTRACTION_MAX, attraction);
      const acceleration = cappedAttraction * deltaTime;

      cell.momentumX += dirX * acceleration;
      cell.momentumY += dirY * acceleration;
    });
  }

  handleSplitMerging(currentTime: number) {
    const piecesToRemove: string[] = [];

    this.state.players.forEach((player, sessionId) => {
      if (!player.isSplitPiece || !player.alive) {
        return;
      }

      const owner = this.state.players.get(player.ownerSessionId);
      if (!owner || !owner.alive) {
        return;
      }

      if (currentTime < player.noMergeUntil || currentTime < owner.noMergeUntil) {
        return;
      }

      const dx = player.x - owner.x;
      const dy = player.y - owner.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= player.radius + owner.radius) {
        owner.mass += player.mass;
        owner.radius = this.calculateRadius(owner.mass);
        owner.score += player.score;
        owner.momentumX += player.momentumX * 0.2;
        owner.momentumY += player.momentumY * 0.2;
        piecesToRemove.push(sessionId);
      }
    });

    piecesToRemove.forEach((pieceId) => {
      this.state.players.delete(pieceId);
    });
  }

  areSameOwner(player: Player, sessionId: string, otherPlayer: Player, otherSessionId: string) {
    const ownerA = player.isSplitPiece ? player.ownerSessionId : sessionId;
    const ownerB = otherPlayer.isSplitPiece ? otherPlayer.ownerSessionId : otherSessionId;
    return ownerA !== "" && ownerA === ownerB;
  }

  calculateRadius(mass: number) {
    return Math.sqrt(mass / Math.PI) * 10;
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
    coin.value = 1;
    coin.radius = 8;
    coin.color = "#FFD700";

    const position = this.samplePositionWithinPlayableRadius(coin.radius);
    coin.x = position.x;
    coin.y = position.y;

    this.state.coins.set(coinId, coin);
  }

  spawnVirus() {
    const virusId = `virus_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const virus = new Virus();
    virus.radius = 60 + Math.random() * 40;
    virus.color = "#FF6B6B";

    const position = this.samplePositionWithinPlayableRadius(virus.radius);
    virus.x = position.x;
    virus.y = position.y;

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