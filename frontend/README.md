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

# Primary RPC used by the client (falls back to cluster defaults when not set)
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Optional private RPC (Helius, Triton, etc.) that is tried before public endpoints
NEXT_PUBLIC_SOLANA_PRIVATE_RPC=https://mainnet.helius-rpc.com/?api-key=your-helius-key

# Optional comma-separated list of additional priority RPCs
NEXT_PUBLIC_SOLANA_RPC_PRIORITY_LIST=https://another-rpc.example.com,https://backup-rpc.example.com

NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_GAME_MODE=multiplayer
NEXT_PUBLIC_MAX_PLAYERS=6
```

Private RPC URLs are automatically sanitised (query strings removed) in application logs so that API keys are never written to the console.

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