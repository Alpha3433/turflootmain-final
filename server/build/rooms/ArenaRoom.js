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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArenaRoom = exports.GameState = exports.Virus = exports.Coin = exports.Player = exports.MERGE_ATTRACTION_SPACING = exports.MERGE_ATTRACTION_MAX = exports.MERGE_ATTRACTION_RATE = void 0;
const core_1 = require("@colyseus/core");
const schema_1 = require("@colyseus/schema");
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
    onJoin(client, options = {}) {
        const privyUserId = options.privyUserId || `anonymous_${Date.now()}`;
        const playerName = options.playerName || `Player_${Math.random().toString(36).substring(7)}`;
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
        this.state.players.set(splitId, splitPlayer);
        console.log(`✅ Split created for ${client.sessionId} -> ${splitId}`);
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
                    player.mass = Math.max(50, player.mass * 0.8);
                    player.radius = this.calculateRadius(player.mass);
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
    respawnPlayer(player) {
        player.mass = 25;
        player.radius = this.calculateRadius(player.mass);
        const spawnPosition = this.getNextSpawnPosition(player.radius);
        player.x = spawnPosition.x;
        player.y = spawnPosition.y;
        player.vx = 0;
        player.vy = 0;
        player.alive = true;
        player.isSplitPiece = false;
        player.splitTime = 0;
        player.targetX = spawnPosition.x;
        player.targetY = spawnPosition.y;
        player.momentumX = 0;
        player.momentumY = 0;
        player.noMergeUntil = 0;
        player.lastSplitTime = 0;
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