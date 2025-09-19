import colyseusPackage from "colyseus";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { ArenaRoom } from "./src/ArenaRoom.mjs";
import dotenv from "dotenv";

const { Server } = colyseusPackage;

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 2567;

// Enable CORS for all routes
app.use(cors());

// Create HTTP server
const server = createServer(app);

// Create Colyseus server
const gameServer = new Server({
  server: server,
  express: app,
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
    rooms: gameServer.presence.channels.size
  });
});

// Start the server
gameServer.listen(port, '0.0.0.0');

console.log('🚀 TurfLoot Colyseus Server Starting...');
console.log(`📡 Server listening on port ${port}`);
console.log(`🎮 Arena room available at ws://localhost:${port}`);
console.log(`🏥 Health check: http://localhost:${port}/health`);