# TurfLoot Hathora Game Server

A real-time multiplayer game server for TurfLoot built for Hathora Cloud deployment.

## Features

- **Real-time WebSocket connections** with JWT authentication
- **Agar.io-style gameplay** with players, coins, and viruses
- **Collision detection** and physics simulation
- **Player vs player combat** with mass-based mechanics
- **Leaderboard system** with live updates
- **Health monitoring** and connection management

## Architecture

- **Node.js + WebSocket** server for real-time communication
- **JWT token validation** for secure player authentication
- **60 FPS game loop** with 10 FPS client updates
- **Docker containerized** for Hathora Cloud deployment

## Local Development

1. **Install dependencies:**
   ```bash
   cd hathora-server
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Test with wscat:**
   ```bash
   # Install wscat globally
   npm install -g wscat
   
   # Generate a test JWT token (use the secret: hathora-turfloot-secret)
   # Connect with the token
   wscat -c "ws://localhost:8080/ws?token=YOUR_TEST_TOKEN"
   ```

## Deployment to Hathora

1. **Install Hathora CLI:**
   ```bash
   npm install -g @hathora/cli
   ```

2. **Login to Hathora:**
   ```bash
   hathora login
   ```

3. **Deploy the server:**
   ```bash
   hathora deploy
   ```

## Message Protocol

### Client → Server Messages

```javascript
// Move player towards target position
{
  type: 'move',
  x: 1250,
  y: 800
}

// Ping for latency measurement
{
  type: 'ping',
  timestamp: 1234567890
}

// Send chat message
{
  type: 'chat',
  message: 'Hello world!'
}
```

### Server → Client Messages

```javascript
// Initial game state when player connects
{
  type: 'init',
  player: { id, name, x, y, mass, score, ... },
  gameState: { players: [...], coins: [...], viruses: [...] }
}

// Game state updates (10 FPS)
{
  type: 'game_update',
  players: [...],
  leaderboard: [...]
}

// Player events
{
  type: 'player_joined',
  player: { ... }
}

{
  type: 'player_left',
  playerId: 'player-123'
}
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `JWT_SECRET` - Secret key for JWT token validation
- `NODE_ENV` - Environment (development/production)

## Health Check

The server provides a health check endpoint at `/health` that returns:

```json
{
  "status": "healthy", 
  "players": 5,
  "timestamp": "2025-09-17T17:45:00.000Z"
}
```

## Game Mechanics

- **Movement**: Players move towards mouse/touch position
- **Growth**: Collect coins to increase mass and score
- **Combat**: Larger players can absorb smaller players (must be 20% larger)
- **Viruses**: Large obstacles that split players or provide bonus points
- **Leaderboard**: Top 10 players by score, updated in real-time

## Performance

- **Server tick rate**: 60 FPS for physics simulation
- **Client updates**: 10 FPS for reduced bandwidth
- **Connection health**: 30-second ping/pong cycle
- **Idle timeout**: 5 minutes for empty rooms