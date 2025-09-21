import config from "@colyseus/tools";
import { ArenaRoom } from "./rooms/ArenaRoom.js";
import { Request, Response } from "express";

export default config({
  initializeGameServer: (gameServer) => {
    // Define room types with filtering for shared arena
    gameServer.define("arena", ArenaRoom)
      .filterBy(['roomName'])
      .sortBy({ createdAt: -1 });
  },

  initializeExpress: (app) => {
    // Health check endpoint
    app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        server: "colyseus",
        version: "1.0.0",
        region: process.env.REGION || "default",
        maxPlayers: process.env.MAX_PLAYERS_PER_ROOM || "50"
      });
    });

    // Root endpoint
    app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "TurfLoot Arena",
        status: "running",
        version: "1.0.0",
        server: "colyseus",
        region: process.env.REGION || "default",
        rooms: ["arena"]
      });
    });
  },

  beforeListen: () => {
    console.log("🚀 TurfLoot Arena Server starting...");
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Region: ${process.env.REGION || 'default'}`);
    console.log(`🎮 Max Players: ${process.env.MAX_PLAYERS_PER_ROOM || '50'}`);
    console.log(`⚡ Tick Rate: ${process.env.TICK_RATE || '20'} TPS`);
    console.log(`🗺️ World Size: ${process.env.WORLD_SIZE || '4000'}px`);
  }
});