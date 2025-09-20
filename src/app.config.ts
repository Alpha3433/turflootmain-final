import config from "@colyseus/tools";
import { ArenaRoom } from "./rooms/ArenaRoom";

export default config({
  // Define your room handlers
  rooms: [
    {
      name: "arena",
      handler: ArenaRoom,
      maxClients: 50,
    }
  ],

  // Express middleware and routes
  express: {
    // Custom Express middleware
    middleware: [
      // Add CORS if needed
      // cors({ origin: true })
    ],
    
    // Custom routes
    routes: [
      {
        method: "get",
        path: "/health",
        handler: (req, res) => {
          res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: "1.0.0"
          });
        }
      }
    ]
  },

  // Development options
  options: {
    // Presence server for room listing (optional)
    // presence: "redis://localhost:6379",
    
    // Driver for matchmaker (optional)
    // driver: new MongooseDriver("mongodb://localhost:27017/colyseus")
  }
});