import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { ArenaRoom } from "./ArenaRoom";

const app = express();
const port = Number(process.env.PORT) || 2567;

// Enable CORS for all routes
app.use(cors());

// Create HTTP server
const server = createServer(app);

// Create Colyseus server
const gameServer = new Server({
  server: server,
});

// Define the arena room with 20 TPS (50ms intervals)
gameServer.define("arena", ArenaRoom, {
  maxClients: 50,
  patchRate: 50, // Send patches every 50ms (20 TPS)
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rooms: Object.keys(gameServer.rooms).length
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TurfLoot Colyseus Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Start the server
gameServer.listen(port);

console.log('🚀 TurfLoot Colyseus Server Starting...');
console.log(`📡 Server listening on port ${port}`);
console.log(`🎮 Arena room available`);
console.log(`🏥 Health check: http://localhost:${port}/health`);