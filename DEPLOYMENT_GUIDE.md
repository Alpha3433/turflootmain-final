# TurfLoot Colyseus Deployment Guide

## 🚀 Deployment Steps

### 1. Deploy Colyseus Server to Colyseus Cloud

```bash
# Navigate to colyseus server
cd colyseus-server

# Install dependencies
npm install

# Test locally first
npm start
# Server should start on http://localhost:2567
```

**Upload to Colyseus Cloud:**
1. Zip the `/colyseus-server` directory
2. Upload to your Colyseus Cloud dashboard
3. Set entry point: `npm start`
4. Deploy and get your WebSocket URL: `wss://your-app.colyseus.cloud`

### 2. Update Frontend Environment

Update your production environment variables:

```bash
# .env.production or deployment config
NEXT_PUBLIC_COLYSEUS_ENDPOINT=wss://your-app.colyseus.cloud

# Keep existing variables
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
MONGO_URL=your-mongodb-connection-string
HELIUS_API_KEY=your-helius-api-key
# ... other existing vars
```

### 3. Deploy Next.js Frontend

Deploy using your existing process (the frontend is ready):

```bash
# Build and deploy as usual
npm run build
npm start
```

## 🧪 Testing the Migration

### Local Testing:
```bash
# Terminal 1: Start Colyseus server
cd colyseus-server && npm run dev

# Terminal 2: Start Next.js frontend
npm run dev

# Test:
# 1. Go to http://localhost:3000
# 2. Click "SERVER BROWSER"
# 3. Should see "TurfLoot Arena" 
# 4. Click to join and test multiplayer
```

### Production Testing:
1. Deploy Colyseus server first
2. Update NEXT_PUBLIC_COLYSEUS_ENDPOINT 
3. Deploy frontend
4. Test multiplayer functionality

## 📋 Migration Checklist

### ✅ **Completed:**
- [x] Created new Colyseus server (`/colyseus-server/`)
- [x] Updated frontend to use Colyseus client
- [x] Removed all Hathora dependencies
- [x] Updated server browser API
- [x] Preserved all game logic and Privy auth
- [x] Updated navigation and WebSocket connections
- [x] Removed Hathora files and directories

### 🎯 **Next Steps:**
- [ ] Deploy Colyseus server to Colyseus Cloud
- [ ] Update production environment variables
- [ ] Deploy updated frontend
- [ ] Test multiplayer functionality
- [ ] Monitor performance and player experience

## 🔧 **Technical Notes**

### Game Logic Preserved:
- Same player movement (x, y, vx, vy)
- Same input system (seq-based with replay protection)
- Same collision detection (coins, viruses, players)
- Same authoritative server at 20 TPS
- Same Privy authentication flow

### Architecture Changes:
- **Before:** Custom WebSocket + Hathora SDK
- **After:** Colyseus Schema + automatic state sync
- **Benefit:** Simpler, more reliable, better scaling

### Performance:
- 20 TPS server tick rate maintained
- Automatic state patching (more efficient than manual JSON)
- Better connection management
- Built-in room scaling

## 🆘 **Troubleshooting**

### Common Issues:

1. **"Cannot connect to Colyseus server"**
   - Check `NEXT_PUBLIC_COLYSEUS_ENDPOINT` is correct
   - Ensure Colyseus server is deployed and running
   - Test WebSocket URL directly

2. **"Players not syncing"**
   - Check server console for errors
   - Verify Schema definitions are correct
   - Check network connectivity

3. **"Authentication errors"**
   - Privy integration should work unchanged
   - Check console for auth-related errors

## 📞 **Support**

If you encounter issues:
1. Check browser console for client errors
2. Check Colyseus Cloud logs for server errors  
3. Verify environment variables are set correctly
4. Test with local Colyseus server first

---

**Migration Status: READY FOR DEPLOYMENT** ✅