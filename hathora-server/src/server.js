const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const { validateToken, getUserInfo } = require('./auth');
const TurfLootGame = require('./game');
require('dotenv').config();

// Get port from environment or default to 8080
const PORT = process.env.PORT || 8080;

console.log('🚀 TurfLoot Hathora Game Server Starting...');
console.log(`📡 Port: ${PORT}`);

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  // Basic health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      players: game.getPlayerCount(),
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TurfLoot Hathora Game Server');
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// Create WebSocket server with token validation
const wss = new WebSocket.Server({ 
  server,
  path: '/ws',
  verifyClient: (info) => {
    try {
      // Parse URL to get query parameters
      const { query } = url.parse(info.req.url, true);
      
      // Validate JWT token
      const token = query.token;
      const user = validateToken(token);
      
      if (!user) {
        console.log('❌ Connection rejected: Invalid or missing token');
        return false;
      }
      
      // Store user data in request object for later use
      info.req.user = user;
      console.log(`✅ Connection approved for: ${user.name || user.id}`);
      return true;
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return false;
    }
  }
});

// Initialize game
const game = new TurfLootGame();

// Store active connections
const connections = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  // Get user data from the validated token
  const user = req.user;
  const userInfo = getUserInfo(user);
  const playerId = userInfo.id;
  const playerName = userInfo.name;
  
  console.log(`🎮 Player connected: ${playerName} (${playerId})`);
  
  // Store connection
  connections.set(playerId, ws);
  ws.playerId = playerId;
  ws.playerName = playerName;
  ws.isAlive = true;
  
  // Add player to game
  const player = game.addPlayer(playerId, playerName);
  
  // Send initial game state to the new player
  ws.send(JSON.stringify({
    type: 'init',
    player: player,
    gameState: game.getGameState(),
    timestamp: Date.now()
  }));
  
  // Broadcast new player joined to all other clients
  broadcastToOthers(playerId, {
    type: 'player_joined',
    player: player,
    timestamp: Date.now()
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: `Welcome to TurfLoot, ${playerName}!`,
    playerCount: game.getPlayerCount(),
    timestamp: Date.now()
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'move':
          // Update player movement target
          const updatedPlayer = game.updatePlayerTarget(playerId, data.x, data.y);
          if (updatedPlayer) {
            // Don't broadcast every move, let the game loop handle updates
          }
          break;
          
        case 'ping':
          // Respond to ping with pong for latency measurement
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
            clientTimestamp: data.timestamp
          }));
          break;
          
        case 'chat':
          // Broadcast chat message
          broadcastToAll({
            type: 'chat',
            playerId: playerId,
            playerName: playerName,
            message: data.message,
            timestamp: Date.now()
          });
          break;
          
        case 'join_room':
          // Handle room join request from client (already handled by connection logic)
          console.log(`🏠 Room join request from ${playerName} for room: ${data.roomId}`);
          // No action needed - player is already added to game
          break;
          
        default:
          console.warn(`⚠️ Unknown message type from ${playerName}: ${data.type}`);
      }
    } catch (error) {
      console.error(`❌ Error processing message from ${playerName}:`, error);
    }
  });
  
  // Handle ping/pong for connection health
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle disconnection
  ws.on('close', (code, reason) => {
    console.log(`👋 Player disconnected: ${playerName} (${code}: ${reason})`);
    
    // Remove player from game
    game.removePlayer(playerId);
    connections.delete(playerId);
    
    // Broadcast player left to all clients
    broadcastToAll({
      type: 'player_left',
      playerId: playerId,
      playerName: playerName,
      timestamp: Date.now()
    });
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${playerName}:`, error);
  });
});

// Broadcast message to all connected clients
function broadcastToAll(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  connections.forEach((ws, playerId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
      sentCount++;
    }
  });
  
  if (sentCount > 0) {
    console.log(`📡 Broadcasted ${message.type} to ${sentCount} players`);
  }
}

// Broadcast message to all clients except the sender
function broadcastToOthers(senderId, message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  connections.forEach((ws, playerId) => {
    if (playerId !== senderId && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
      sentCount++;
    }
  });
  
  if (sentCount > 0) {
    console.log(`📡 Broadcasted ${message.type} to ${sentCount} others (excluding ${senderId})`);
  }
}

// Periodic game state broadcast (every 100ms for smooth gameplay)
setInterval(() => {
  const gameState = game.getGameState();
  const leaderboard = game.getLeaderboard();
  
  broadcastToAll({
    type: 'game_update',
    players: gameState.players,
    leaderboard: leaderboard,
    timestamp: Date.now()
  });
}, 100); // 10 FPS for game state updates

// Connection health check - ping clients every 30 seconds
const heartbeat = setInterval(() => {
  connections.forEach((ws, playerId) => {
    if (ws.isAlive === false) {
      console.log(`💀 Terminating dead connection: ${playerId}`);
      ws.terminate();
      connections.delete(playerId);
      game.removePlayer(playerId);
      return;
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Handle server shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  clearInterval(heartbeat);
  wss.close();
  server.close();
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🎮 TurfLoot Hathora Game Server ready!');
  console.log(`📡 WebSocket server running on ws://0.0.0.0:${PORT}/ws`);
  console.log(`🏥 Health check available at http://0.0.0.0:${PORT}/health`);
});