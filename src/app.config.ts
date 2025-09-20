import config from "@colyseus/tools";
import { ArenaRoom } from "./rooms/ArenaRoom";

export default config({
  initializeGameServer: (gameServer) => {
    // Define your room handlers
    gameServer.define("arena", ArenaRoom, {
      maxClients: 50,
    });
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
  }
});