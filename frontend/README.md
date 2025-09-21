# TurfLoot Frontend

## Next.js React Application

This frontend connects to the Colyseus Cloud game server for multiplayer gameplay.

### Deployment Platforms
- **Vercel** (recommended)
- **Netlify** 
- **Render**
- **AWS Amplify**

### Environment Variables
```
NEXT_PUBLIC_COLYSEUS_ENDPOINT=wss://au-syd-ab3eaf4e.colyseus.cloud
NEXT_PUBLIC_PRIVY_APP_ID=cmdycgltk007ljs0bpjbjqx0a
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=gameloop-migrate
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_GAME_MODE=multiplayer
NEXT_PUBLIC_MAX_PLAYERS=6
```

### Features
- **Privy Authentication** - Wallet connection and user management
- **Colyseus Integration** - Real-time multiplayer game client
- **Solana Integration** - Blockchain wallet and transactions  
- **Responsive Design** - Mobile and desktop optimized
- **Game UI** - Leaderboard, settings, server browser

### Colyseus Connection
The client automatically connects to Colyseus Cloud:
```javascript
import colyseusClient, { joinArena } from './lib/colyseus.js';

// Join multiplayer arena
const room = await joinArena({ privyUserId: user.id });
```

### Local Development
```bash
npm install
npm run dev  
# Frontend runs on http://localhost:3000
```

### Build & Deploy
```bash
npm run build
npm start
```

### Static Export (optional)
```bash
npm run export
# Outputs to /out directory for static hosting
```