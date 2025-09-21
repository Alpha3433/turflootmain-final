"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = __importDefault(require("@colyseus/tools"));
const ArenaRoom_js_1 = require("./rooms/ArenaRoom.js");
exports.default = (0, tools_1.default)({
    initializeGameServer: (gameServer) => {
        // Define room types
        gameServer.define("arena", ArenaRoom_js_1.ArenaRoom);
    },
    initializeExpress: (app) => {
        // Health check endpoint
        app.get("/health", (req, res) => {
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
        app.get("/", (req, res) => {
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
//# sourceMappingURL=app.config.js.map