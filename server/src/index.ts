import 'dotenv/config';
import { listen } from '@colyseus/tools';
import app from './app.config';

const port = Number(process.env.PORT || 2567);

console.log(`🚀 Starting TurfLoot Colyseus Server on port ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🎮 Server ready for arena battles!`);

listen(app, port);