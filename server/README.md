# TurfLoot Colyseus Server

## Colyseus Cloud Deployment

This server is designed to deploy to Colyseus Cloud with the following configuration:

### Colyseus Cloud Settings
- **Root Directory**: `/server`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18+

### Environment Variables
```
NODE_ENV=production
PORT=2567
```

### Build Output
- TypeScript compiles to `/build` directory
- Entry point: `build/index.js`
- Uses `@colyseus/tools listen(app)` for cloud compatibility

### Game Features
- Real-time multiplayer arena gameplay
- Player movement and collision detection
- Coin collection and virus mechanics  
- Leaderboard and scoring system
- WebSocket communication with 20 TPS

### Room Type
- **Arena Room**: `arena`
- **Max Players**: 50
- **Tick Rate**: 20 TPS
- **World Size**: 4000x4000px

### Local Development
```bash
npm install
npm run dev
# Server runs on http://localhost:2567
```