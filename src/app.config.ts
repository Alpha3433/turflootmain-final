import config from "@colyseus/tools";
import { ArenaRoom } from "./rooms/ArenaRoom";

export default config({
  initializeGameServer: (gameServer) => {
    // Define your room handlers
    gameServer.define("arena", ArenaRoom);
  },

  initializeExpress: (app) => {
    // Custom Express middleware and routes
    app.get("/health", (req: any, res: any) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      });
    });
  },

  beforeListen: () => {
    // Anything you want to do before server starts listening
    console.log("🚀 TurfLoot Arena Server starting...");
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Region: ${process.env.REGION || 'default'}`);
    console.log(`🎮 Max Players: ${process.env.MAX_PLAYERS_PER_ROOM || '50'}`);
    console.log(`⚡ Tick Rate: ${process.env.TICK_RATE || '20'} TPS`);
    console.log(`🗺️ World Size: ${process.env.WORLD_SIZE || '4000'}px`);
  }
});