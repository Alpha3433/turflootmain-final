"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const tools_1 = require("@colyseus/tools");
const app_config_1 = __importDefault(require("./app.config"));
const port = Number(process.env.PORT || 2567);
console.log(`🚀 Starting TurfLoot Colyseus Server on port ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🎮 Server ready for arena battles!`);
(0, tools_1.listen)(app_config_1.default, port);
//# sourceMappingURL=index.js.map