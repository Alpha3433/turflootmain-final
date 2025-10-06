"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArenaRoom = exports.GameState = exports.Virus = exports.Coin = exports.Player = exports.MERGE_ATTRACTION_SPACING = exports.MERGE_ATTRACTION_MAX = exports.MERGE_ATTRACTION_RATE = void 0;
const core_1 = require("@colyseus/core");
const schema_1 = require("@colyseus/schema");
const mongodb_1 = require("mongodb");
const crypto_1 = __importDefault(require("crypto"));
const MIN_SPLIT_MASS = 40;
const MAX_SPLIT_PIECES = 16;
const SPLIT_COOLDOWN_MS = 500;
const SPEED_SPLIT = 800;
const MOMENTUM_DRAG = 1.2;
const NO_MERGE_MS = 12000;
const MOMENTUM_THRESHOLD = 0.1;
exports.MERGE_ATTRACTION_RATE = 0.02;
exports.MERGE_ATTRACTION_MAX = 120;
exports.MERGE_ATTRACTION_SPACING = 0.05;
const USERS_COLLECTION = "users";
const TRANSACTIONS_COLLECTION = "transactions";
let cachedMongoClient = null;
let cachedDb = null;
async function getDatabase() {
    if (!process.env.MONGO_URL) {
        console.warn("⚠️ Arena wallet integration disabled - MONGO_URL not configured");
        return null;
    }
    if (cachedDb) {
        return cachedDb;
    }
    if (!cachedMongoClient) {
        cachedMongoClient = new mongodb_1.MongoClient(process.env.MONGO_URL, {
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
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.name = "Player";
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.mass = 25;
        this.radius = 20;
        this.color = "#FF6B6B";
        this.score = 0;
        this.lastSeq = 0;
        this.alive = true;
        this.ownerSessionId = "";
        this.isSplitPiece = false;
        this.splitTime = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.momentumX = 0;
        this.momentumY = 0;
        this.noMergeUntil = 0;
        this.lastSplitTime = 0;
        this.stake = 0;
        this.userId = "";
        this.walletEarnings = 0;
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "vx", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "vy", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "mass", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "radius", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "score", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "lastSeq", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "alive", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "ownerSessionId", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isSplitPiece", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "splitTime", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "targetX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "targetY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "momentumX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "momentumY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "noMergeUntil", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "lastSplitTime", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "stake", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "userId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "walletEarnings", void 0);
// Coin state schema
class Coin extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.value = 1;
        this.radius = 8;
        this.color = "#FFD700";
    }
}
exports.Coin = Coin;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Coin.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Coin.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Coin.prototype, "value", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Coin.prototype, "radius", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Coin.prototype, "color", void 0);
// Virus state schema
class Virus extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.radius = 60;
        this.color = "#FF6B6B";
    }
}
exports.Virus = Virus;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Virus.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Virus.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Virus.prototype, "radius", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Virus.prototype, "color", void 0);
// Game state schema
class GameState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.coins = new schema_1.MapSchema();
        this.viruses = new schema_1.MapSchema();
        this.worldSize = 4000;
        this.playableRadius = 1800;
        this.timestamp = 0;
    }
}
exports.GameState = GameState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: Coin }),
    __metadata("design:type", Object)
], GameState.prototype, "coins", void 0);
__decorate([
    (0, schema_1.type)({ map: Virus }),
    __metadata("design:type", Object)
], GameState.prototype, "viruses", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "worldSize", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "playableRadius", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "timestamp", void 0);
class ArenaRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '50');
        // Game configuration
        this.worldSize = parseInt(process.env.WORLD_SIZE || '4000');
        this.playableRadius = parseInt(process.env.PLAYABLE_RADIUS || '1800');
        this.maxCoins = 300; // Triple the original 100-coin cap for higher arena density
        this.maxViruses = 30; // Double the spike count to intensify arena hazards
        this.tickRate = parseInt(process.env.TICK_RATE || '20'); // TPS server logic
    }
    normalizeStake(raw) {
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
    buildUserFilter(userId) {
        return {
            $or: [
                { id: userId },
                { privy_id: userId },
                { user_id: userId },
                { wallet_address: userId }
            ]
        };
    }
    async reserveStake(userId, amount) {
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
            id: crypto_1.default.randomUUID(),
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
    async refundStake(userId, amount) {
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
            id: crypto_1.default.randomUUID(),
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
    async transferStakeToWinner(winnerId, loserId, amount, winnerName, loserName) {
        if (amount <= 0) {
            return false;
        }
        const db = await getDatabase();
        if (!db) {
            return false;
        }
        const users = db.collection(USERS_COLLECTION);
        const transactions = db.collection(TRANSACTIONS_COLLECTION);
        const operations = [];
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
            id: crypto_1.default.randomUUID(),
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
    resolveControllingPlayer(player, sessionId) {
        if (player.isSplitPiece && player.ownerSessionId) {
            return this.state.players.get(player.ownerSessionId);
        }
        return this.state.players.get(sessionId) || player;
    }
    findClient(sessionId) {
        if (!sessionId) {
            return undefined;
        }
        return this.clients.find((client) => client.sessionId === sessionId);
    }
    broadcastStakeTransfer(amount, winnerName, loserName, winnerSessionId, loserSessionId) {
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
        this.onMessage("input", (client, message) => {
            this.handleInput(client, message);
        });
        this.onMessage("split", (client, message) => {
            this.handleSplit(client, message);
        });
        this.onMessage("ping", (client, message) => {
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
    getNextSpawnPosition(padding = 0) {
        const spawn = this.samplePositionWithinPlayableRadius(padding);
        console.log(`🎯 ARENA SPAWN SLOT: Assigned random spawn at (${spawn.x.toFixed(1)}, ${spawn.y.toFixed(1)}) within playable radius ${this.playableRadius}`);
        return spawn;
    }
    samplePositionWithinPlayableRadius(padding) {
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
    enforcePlayableBoundary(player, resetMotion = false) {
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
    async onJoin(client, options = {}) {
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
        client.userData = {
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
                    client.userData.stakeReserved = stakeAmount;
                }
                else {
                    console.warn(`⚠️ Stake reservation failed for ${privyUserId} - continuing without wallet lock`);
                }
            }
            catch (error) {
                console.error(`❌ Error reserving stake for user ${privyUserId}:`, error);
            }
        }
        console.log(`✅ Player spawned at (${Math.round(player.x)}, ${Math.round(player.y)})`);
    }
    handleInput(client, message) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.alive)
            return;
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
    handleSplit(client, message) {
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
        if (typeof targetX !== "number" ||
            typeof targetY !== "number" ||
            !isFinite(targetX) ||
            !isFinite(targetY)) {
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
    async onLeave(client, consented) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
            if (player.alive && player.stake > 0 && player.userId) {
                try {
                    await this.refundStake(player.userId, player.stake);
                }
                catch (error) {
                    console.error(`❌ Failed to refund stake for ${player.userId}:`, error);
                }
            }
            console.log(`👋 Player left: ${player.name} (${client.sessionId})`);
            this.state.players.delete(client.sessionId);
        }
    }
    update() {
        const deltaTime = 1 / this.tickRate; // Fixed timestep
        const now = Date.now();
        this.state.timestamp = now;
        const alivePlayers = [];
        const ownerIds = new Set();
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
            // Apply friction
            player.vx *= 0.95;
            player.vy *= 0.95;
            // Check collisions
            this.checkCollisions(player, sessionId);
        });
        this.handleSplitMerging(now);
    }
    checkCollisions(player, sessionId) {
        // Check coin collisions
        this.checkCoinCollisions(player);
        // Check virus collisions
        this.checkVirusCollisions(player);
        // Check player collisions
        this.checkPlayerCollisions(player, sessionId);
    }
    getOwnedCells(ownerSessionId) {
        const cells = [];
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
    checkCoinCollisions(player) {
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
                }
                else {
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
    checkPlayerCollisions(player, sessionId) {
        this.state.players.forEach((otherPlayer, otherSessionId) => {
            if (sessionId === otherSessionId || !otherPlayer.alive)
                return;
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
                        }
                        catch (error) {
                            console.log(`⚠️ Failed to send gameOver to ${otherPlayer.name} (${otherSessionId}):`, error);
                        }
                    }
                    else {
                        console.log(`⚠️ No active client found for eliminated player ${otherPlayer.name} (${otherSessionId})`);
                    }
                    this.state.players.delete(otherSessionId);
                    const splitPiecesToRemove = [];
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
                        this.transferStakeToWinner(winnerUserId, loserUserId, loserStake, winnerName, loserName).then((success) => {
                            if (success) {
                                if (controllingWinner) {
                                    controllingWinner.walletEarnings += loserStake;
                                }
                                this.broadcastStakeTransfer(loserStake, winnerName, loserName, winnerSessionOwnerId, otherSessionId);
                            }
                        }).catch((error) => {
                            console.error("❌ Failed to transfer stake after elimination:", error);
                        });
                    }
                    if (eliminatedClient) {
                        try {
                            eliminatedClient.leave(1000, "Eliminated from arena");
                        }
                        catch (error) {
                            console.log(`⚠️ Failed to disconnect eliminated player ${otherPlayer.name} (${otherSessionId}):`, error);
                        }
                    }
                }
            }
        });
    }
    countOwnedPieces(ownerSessionId) {
        let count = 0;
        this.state.players.forEach((player, sessionId) => {
            const owner = player.isSplitPiece ? player.ownerSessionId : sessionId;
            if (owner === ownerSessionId) {
                count++;
            }
        });
        return count;
    }
    applyMomentum(player, deltaTime) {
        if (Math.abs(player.momentumX) < MOMENTUM_THRESHOLD &&
            Math.abs(player.momentumY) < MOMENTUM_THRESHOLD) {
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
    applySplitAttraction(cells, deltaTime) {
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
            const spacing = cell.radius * exports.MERGE_ATTRACTION_SPACING;
            const distanceAfterSpacing = Math.max(0, distance - spacing);
            if (distanceAfterSpacing <= 0) {
                return;
            }
            const dirX = dx / distance;
            const dirY = dy / distance;
            const attraction = distanceAfterSpacing * totalMass * exports.MERGE_ATTRACTION_RATE;
            const cappedAttraction = Math.min(exports.MERGE_ATTRACTION_MAX, attraction);
            const acceleration = cappedAttraction * deltaTime;
            cell.momentumX += dirX * acceleration;
            cell.momentumY += dirY * acceleration;
        });
    }
    handleSplitMerging(currentTime) {
        const piecesToRemove = [];
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
    areSameOwner(player, sessionId, otherPlayer, otherSessionId) {
        const ownerA = player.isSplitPiece ? player.ownerSessionId : sessionId;
        const ownerB = otherPlayer.isSplitPiece ? otherPlayer.ownerSessionId : otherSessionId;
        return ownerA !== "" && ownerA === ownerB;
    }
    calculateRadius(mass) {
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
exports.ArenaRoom = ArenaRoom;
//# sourceMappingURL=ArenaRoom.js.map