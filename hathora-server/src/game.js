const { v4: uuidv4 } = require('uuid');

class TurfLootGame {
  constructor() {
    this.players = new Map(); // Map of player ID to player object
    this.coins = new Map();   // Map of coin ID to coin object
    this.viruses = new Map(); // Map of virus ID to virus object
    this.worldSize = 4000;    // World dimensions (matches client)
    this.maxCoins = 500;      // Maximum coin items
    this.maxViruses = 15;     // Maximum virus items
    this.tickRate = 60;       // Server tick rate (60 FPS)
    this.lastTick = Date.now();
    
    // Initialize world objects
    this.generateCoins();
    this.generateViruses();
    
    // Start game loop
    this.startGameLoop();
    
    console.log('🎮 TurfLoot game initialized');
    console.log(`🌍 World size: ${this.worldSize}x${this.worldSize}`);
    console.log(`🪙 Coins: ${this.maxCoins}, 🦠 Viruses: ${this.maxViruses}`);
  }

  // Generate initial coins
  generateCoins() {
    for (let i = 0; i < this.maxCoins; i++) {
      this.spawnCoin();
    }
  }

  // Generate initial viruses
  generateViruses() {
    for (let i = 0; i < this.maxViruses; i++) {
      this.spawnVirus();
    }
  }

  // Spawn a single coin
  spawnCoin() {
    const coinId = uuidv4();
    const coin = {
      id: coinId,
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize,
      value: 1,
      radius: 8,
      color: '#FFD700', // Gold
      type: 'coin'
    };
    this.coins.set(coinId, coin);
    return coin;
  }

  // Spawn a single virus
  spawnVirus() {
    const virusId = uuidv4();
    const virus = {
      id: virusId,
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize,
      radius: 60 + Math.random() * 40, // Random size
      color: '#FF6B6B', // Red
      type: 'virus'
    };
    this.viruses.set(virusId, virus);
    return virus;
  }

  // Add a new player to the game
  addPlayer(id, name) {
    const player = {
      id,
      name,
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize,
      targetX: 0,
      targetY: 0,
      mass: 100, // Starting mass
      radius: Math.sqrt(100 / Math.PI) * 10, // Calculate radius from mass
      color: this.generatePlayerColor(),
      score: 0,
      speed: 5,
      lastUpdate: Date.now(),
      alive: true
    };
    
    this.players.set(id, player);
    console.log(`➕ Player added: ${name} (${id})`);
    return player;
  }

  // Generate a random color for player
  generatePlayerColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Remove a player from the game
  removePlayer(id) {
    const player = this.players.get(id);
    if (player) {
      console.log(`➖ Player removed: ${player.name} (${id})`);
      this.players.delete(id);
    }
  }

  // Update player movement target
  updatePlayerTarget(id, targetX, targetY) {
    const player = this.players.get(id);
    if (player && player.alive) {
      player.targetX = Math.max(0, Math.min(this.worldSize, targetX));
      player.targetY = Math.max(0, Math.min(this.worldSize, targetY));
      player.lastUpdate = Date.now();
    }
    return player;
  }

  // Game physics update
  updateGamePhysics() {
    const now = Date.now();
    const deltaTime = (now - this.lastTick) / 1000; // Convert to seconds
    
    // Update all players
    for (const [id, player] of this.players.entries()) {
      if (!player.alive) continue;
      
      // Calculate movement towards target
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 1) {
        // Calculate speed based on mass (bigger = slower)
        const speed = Math.max(1, player.speed * (100 / player.mass));
        const moveDistance = speed * deltaTime * 60; // 60 FPS normalization
        
        if (moveDistance < distance) {
          player.x += (dx / distance) * moveDistance;
          player.y += (dy / distance) * moveDistance;
        } else {
          player.x = player.targetX;
          player.y = player.targetY;
        }
      }
      
      // Check collisions
      this.checkCollisions(player);
    }
    
    this.lastTick = now;
  }

  // Check all collisions for a player
  checkCollisions(player) {
    // Check coin collisions
    this.checkCoinCollisions(player);
    
    // Check virus collisions
    this.checkVirusCollisions(player);
    
    // Check player collisions
    this.checkPlayerCollisions(player);
  }

  // Check if player collides with coins
  checkCoinCollisions(player) {
    const consumedCoins = [];
    
    for (const [coinId, coin] of this.coins.entries()) {
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If player radius touches coin, consume it
      if (distance < player.radius + coin.radius) {
        // Increase player mass and score
        player.mass += coin.value;
        player.score += coin.value;
        player.radius = Math.sqrt(player.mass / Math.PI) * 10;
        
        // Remove consumed coin and spawn new one
        this.coins.delete(coinId);
        consumedCoins.push(coin);
        this.spawnCoin();
      }
    }
    
    return consumedCoins;
  }

  // Check if player collides with viruses
  checkVirusCollisions(player) {
    for (const [virusId, virus] of this.viruses.entries()) {
      const dx = player.x - virus.x;
      const dy = player.y - virus.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If player is big enough and touches virus
      if (distance < player.radius + virus.radius) {
        if (player.mass > virus.radius * 2) {
          // Player destroys virus
          this.viruses.delete(virusId);
          this.spawnVirus();
          player.score += 10; // Bonus for destroying virus
        } else {
          // Player gets split or damaged
          player.mass = Math.max(50, player.mass * 0.8);
          player.radius = Math.sqrt(player.mass / Math.PI) * 10;
        }
      }
    }
  }

  // Check player vs player collisions
  checkPlayerCollisions(player) {
    for (const [otherId, otherPlayer] of this.players.entries()) {
      if (otherId === player.id || !otherPlayer.alive) continue;
      
      const dx = player.x - otherPlayer.x;
      const dy = player.y - otherPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if players are overlapping
      if (distance < player.radius + otherPlayer.radius) {
        // Larger player absorbs smaller player
        if (player.mass > otherPlayer.mass * 1.2) {
          player.mass += otherPlayer.mass * 0.8;
          player.score += otherPlayer.score * 0.5;
          player.radius = Math.sqrt(player.mass / Math.PI) * 10;
          
          // Mark other player as eliminated
          otherPlayer.alive = false;
          console.log(`💀 ${player.name} eliminated ${otherPlayer.name}`);
        }
      }
    }
  }

  // Get current game state
  getGameState() {
    return {
      players: Array.from(this.players.values()).filter(p => p.alive),
      coins: Array.from(this.coins.values()),
      viruses: Array.from(this.viruses.values()),
      worldSize: this.worldSize,
      timestamp: Date.now()
    };
  }

  // Get leaderboard
  getLeaderboard() {
    const alivePlayers = Array.from(this.players.values())
      .filter(p => p.alive)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    return alivePlayers.map(p => ({
      name: p.name,
      score: p.score,
      mass: Math.round(p.mass)
    }));
  }

  // Start the game loop
  startGameLoop() {
    setInterval(() => {
      this.updateGamePhysics();
    }, 1000 / this.tickRate); // 60 FPS
    
    console.log(`🔄 Game loop started at ${this.tickRate} FPS`);
  }

  // Get player count
  getPlayerCount() {
    return Array.from(this.players.values()).filter(p => p.alive).length;
  }
}

module.exports = TurfLootGame;