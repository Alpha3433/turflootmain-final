# TurfLoot Deployment Instructions

## Project Structure
This project has been restructured for independent deployment:

- `/server` - Colyseus game server (for Colyseus Cloud deployment)  
- `/frontend` - Next.js React application (for Vercel/Netlify deployment)

## Server Deployment (Colyseus Cloud)

### Setup
1. **Root Directory**: Set to `/server` in Colyseus Cloud dashboard
2. **Build Command**: `npm ci && npm run build`  
3. **Start Command**: `npm start` (uses ecosystem.config.js)
4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=2567
   ```

### Files Structure
- `server/package.json` - Colyseus dependencies only
- `server/src/index.ts` - Entry point using @colyseus/tools listen()
- `server/src/app.config.ts` - Arena room configuration
- `server/src/rooms/ArenaRoom.ts` - Game room implementation
- `server/ecosystem.config.js` - PM2 process management

## Frontend Deployment (Vercel/Netlify/Render)

### Setup  
1. **Root Directory**: Set to `/frontend`
2. **Build Command**: `npm ci && npm run build`
3. **Start Command**: `npm start`
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_COLYSEUS_ENDPOINT=wss://<your-colyseus-app-id>.colyseus.cloud
   NEXT_PUBLIC_PRIVY_APP_ID=cmdycgltk007ljs0bpjbjqx0a
   NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
   # Optional private RPC (e.g. Helius) that will be tried before public endpoints
   NEXT_PUBLIC_SOLANA_PRIVATE_RPC=https://mainnet.helius-rpc.com/?api-key=your-helius-key
   # Optional comma separated list of extra priority RPC URLs
   NEXT_PUBLIC_SOLANA_RPC_PRIORITY_LIST=https://rpc.backup1.com,https://rpc.backup2.com
   ```

### Files Structure
- `frontend/package.json` - Next.js + React dependencies
- `frontend/app/` - Next.js pages and layouts
- `frontend/components/` - React UI components
- `frontend/lib/colyseus.js` - Colyseus Cloud client connector

## Benefits of This Structure
1. **Independent Deployment** - Server and frontend deploy separately
2. **No Package Conflicts** - Each has its own package.json
3. **Scalable** - Can deploy frontend to CDN, server to Colyseus Cloud
4. **Development Flexibility** - Work on server/frontend independently

## Local Development
```bash
# Start Colyseus server
cd server && npm run dev

# Start Next.js frontend (separate terminal)  
cd frontend && npm run dev
```

## Production URLs
- **Game Server**: `wss://au-syd-ab3eaf4e.colyseus.cloud`
- **Frontend**: Deploy to your preferred platform (Vercel recommended)