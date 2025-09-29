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
exports.ArenaRoom = exports.GameState = exports.Virus = exports.Coin = exports.Player = void 0;
const core_1 = require("@colyseus/core");
const schema_1 = require("@colyseus/schema");
const INITIAL_MASS = 25;
// Player state schema
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.name = "Player";
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.mass = INITIAL_MASS;
        this.radius = 20;
        this.color = "#FF6B6B";
        this.score = 0;
        this.lastSeq = 0;
        this.alive = true;
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
], GameState.prototype, "timestamp", void 0);
class ArenaRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '50');
        // Game configuration
        this.worldSize = parseInt(process.env.WORLD_SIZE || '4000');
        this.maxCoins = 100;
        this.maxViruses = 15;
        this.tickRate = parseInt(process.env.TICK_RATE || '20'); // TPS server logic
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
        this.onMessage("input", (client, message) => {
            this.handleInput(client, message);
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
    onJoin(client, options = {}) {
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
        player.mass = INITIAL_MASS;
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
        const speed = Math.max(1, 5 * (INITIAL_MASS / player.mass)); // Speed inversely proportional to mass
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
            if (!player.alive)
                return;
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
                }
                else {
                    // Player gets damaged
                    player.mass = Math.max(INITIAL_MASS, player.mass * 0.8);
                    player.radius = Math.sqrt(player.mass / Math.PI) * 10;
                }
            }
        });
    }
    checkPlayerCollisions(player, sessionId) {
        this.state.players.forEach((otherPlayer, otherSessionId) => {
            if (sessionId === otherSessionId || !otherPlayer.alive)
                return;
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
        player.mass = INITIAL_MASS;
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
exports.ArenaRoom = ArenaRoom;
//# sourceMappingURL=ArenaRoom.js.map