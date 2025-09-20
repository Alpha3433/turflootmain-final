import { listen } from "@colyseus/tools";
import config from "@colyseus/tools";
import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";

// Minimal state schema
export class MinimalState extends Schema {
  @type("number") playerCount: number = 0;
  @type("string") message: string = "TurfLoot Arena - Minimal Server Working!";
}

// Minimal room implementation
export class MinimalRoom extends Room<MinimalState> {
  maxClients = 10;

  onCreate() {
    console.log("🚀 Minimal TurfLoot room created");
    this.setState(new MinimalState());
    
    // Set up message handlers
    this.onMessage("ping", (client, message) => {
      console.log(`🏓 Ping from ${client.sessionId}`);
      client.send("pong", { timestamp: Date.now() });
    });
  }

  onJoin(client: Client) {
    console.log(`👋 Player joined: ${client.sessionId}`);
    this.state.playerCount++;
  }

  onLeave(client: Client) {
    console.log(`👋 Player left: ${client.sessionId}`);
    this.state.playerCount = Math.max(0, this.state.playerCount - 1);
  }
}

const app = config({
  initializeGameServer: (gameServer) => {
    gameServer.define("arena", MinimalRoom);
  },

  initializeExpress: (app) => {
    app.get("/", (req: any, res: any) => {
      res.json({
        name: "TurfLoot Arena - Minimal Server",
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0-minimal",
        players: 0
      });
    });

    app.get("/health", (req: any, res: any) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        server: "colyseus-minimal"
      });
    });
  },

  beforeListen: () => {
    console.log("🚀 TurfLoot Arena Minimal Server starting...");
    console.log("✅ This is the ultra-minimal version for deployment testing");
  }
});

// Start the server
listen(app);