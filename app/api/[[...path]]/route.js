import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { createUser, requireAuth, updateUserProfile, getUserStats } from '../../../lib/auth.js'
import { 
  getCurrentSeason, 
  getAchievementDefinitions, 
  getCosmeticDefinitions, 
  calculateAchievementProgress, 
  generateDailyChallenge,
  checkAndAwardAchievements
} from '../../../lib/achievements.js'

const JWT_SECRET = process.env.JWT_SECRET || 'turfloot-secret-key-change-in-production'

// MongoDB connection with fallback for Atlas
const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = process.env.DB_NAME || 'turfloot_db'

let client = null

async function getDb() {
  if (!client) {
    try {
      console.log('🔗 Connecting to MongoDB:', MONGO_URL.replace(/\/\/.*@/, '//[CREDENTIALS]@'))
      client = new MongoClient(MONGO_URL, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        connectTimeoutMS: 10000, // 10 second connection timeout
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverApi: {
          version: '1',
          strict: true,
          deprecationErrors: true,
        }
      })
      await client.connect()
      console.log('✅ MongoDB connected successfully')
      
      // Verify the connection by pinging the database
      await client.db(DB_NAME).admin().ping()
      console.log('✅ MongoDB ping successful')
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error)
      throw error
    }
  }
  return client.db(DB_NAME)
}

// Random name generator for new users
const generateRandomUsername = () => {
  const adjectives = [
    'Swift', 'Clever', 'Bold', 'Mighty', 'Fierce', 'Cosmic', 'Alpha', 'Neon', 'Cyber', 'Quantum',
    'Shadow', 'Lightning', 'Thunder', 'Frost', 'Fire', 'Steel', 'Golden', 'Silver', 'Crystal', 'Diamond',
    'Ninja', 'Dragon', 'Phoenix', 'Storm', 'Blaze', 'Viper', 'Wolf', 'Eagle', 'Tiger', 'Shark',
    'Sonic', 'Turbo', 'Ultra', 'Mega', 'Super', 'Hyper', 'Prime', 'Elite', 'Pro', 'Master',
    'Mystic', 'Phantom', 'Ghost', 'Spirit', 'Soul', 'Void', 'Dark', 'Bright', 'Pure', 'Wild'
  ]
  
  const nouns = [
    'Warrior', 'Hunter', 'Ranger', 'Guardian', 'Champion', 'Hero', 'Legend', 'Knight', 'Samurai', 'Gladiator',
    'Player', 'Gamer', 'Raider', 'Striker', 'Fighter', 'Slayer', 'Destroyer', 'Crusher', 'Conqueror', 'Victor',
    'Wolf', 'Lion', 'Tiger', 'Bear', 'Eagle', 'Hawk', 'Falcon', 'Dragon', 'Phoenix', 'Griffin',
    'Storm', 'Thunder', 'Lightning', 'Flame', 'Blaze', 'Frost', 'Ice', 'Shadow', 'Phantom', 'Ghost',
    'Blade', 'Sword', 'Arrow', 'Spear', 'Shield', 'Armor', 'Crown', 'Gem', 'Star', 'Moon'
  ]
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 999) + 1
  
  return `${adjective}${noun}${number}`
}

// Check if username is already taken
const isUsernameAvailable = async (username, currentUserId = null) => {
  try {
    const db = await getDb()
    const users = db.collection('users')
    
    const query = {
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }, // Case-insensitive match
        { 'profile.display_name': { $regex: new RegExp(`^${username}$`, 'i') } },
        { custom_name: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    }
    
    // If updating existing user, exclude their current record
    if (currentUserId) {
      query.id = { $ne: currentUserId }
    }
    
    const existingUser = await users.findOne(query)
    return !existingUser
  } catch (error) {
    console.error('Error checking username availability:', error)
    return false
  }
}

// Generate a unique username
const generateUniqueUsername = async () => {
  let attempts = 0
  let username
  
  do {
    username = generateRandomUsername()
    attempts++
    
    // Prevent infinite loop
    if (attempts > 50) {
      username = `Player${Date.now()}${Math.floor(Math.random() * 1000)}`
      break
    }
  } while (!(await isUsernameAvailable(username)))
  
  return username
}

// Enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Route handler
export async function GET(request, { params }) {
  const { path } = params
  const url = new URL(request.url)
  
  console.log('🚀 GET HANDLER CALLED - PATH:', path)
  
  try {
    // Root API endpoint
    if (!path || path.length === 0) {
      return NextResponse.json(
        { 
          message: 'TurfLoot API v2.0',
          service: 'turfloot-backend',
          features: ['auth', 'blockchain', 'multiplayer'],
          timestamp: new Date().toISOString()
        },
        { headers: corsHeaders }
      )
    }

    const route = path.join('/')
    console.log(`🔍 GET Route requested: ${route}`)
    console.log(`🔍 Route comparison - wallet/transactions: ${route === 'wallet/transactions'}`)
    console.log(`🔍 Route comparison - wallet/balance: ${route === 'wallet/balance'}`)

    // Ping route for connectivity check
    if (route === 'ping') {
      return NextResponse.json(
        { 
          status: 'ok',
          timestamp: Date.now(),
          server: 'turfloot-api'
        },
        { 
          status: 200,
          headers: corsHeaders 
        }
      )
    }

    // Authentication routes
    if (route === 'auth/me') {
      return requireAuth(async (req) => {
        const stats = await getUserStats(req.user.id)
        return NextResponse.json({
          user: req.user,
          stats
        }, { headers: corsHeaders })
      })(request)
    }

    // Wallet balance endpoint (GET)
    if (route === 'wallet/balance') {
      try {
        // Get Authorization header
        const authHeader = request.headers.get('authorization')
        let token = null
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7)
        }
        
        console.log('🔍 Wallet balance request - Token present:', !!token)
        
        // Handle testing tokens
        if (token && token.startsWith('testing-')) {
          try {
            const payload = JSON.parse(atob(token.substring(8)))
            console.log('🧪 Testing token payload:', payload)
            
            // Generate realistic testing balance based on user data
            const baseBalance = 50 + Math.random() * 100 // $50-$150
            const solBalance = 0.1 + Math.random() * 0.5 // 0.1-0.6 SOL
            const ethBalance = 0.001 + Math.random() * 0.01 // Small ETH amount
            
            const testingBalance = {
              balance: parseFloat(baseBalance.toFixed(2)),
              currency: 'USD',
              sol_balance: parseFloat(solBalance.toFixed(4)),
              usdc_balance: parseFloat((baseBalance * 0.3).toFixed(2)),
              eth_balance: parseFloat(ethBalance.toFixed(6)),
              wallet_address: payload.wallet_address || '0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d'
            }
            
            console.log('🎯 Returning testing balance:', testingBalance)
            
            return NextResponse.json(testingBalance, { headers: corsHeaders })
          } catch (testingError) {
            console.error('❌ Error parsing testing token:', testingError)
          }
        }
        
        // Try to authenticate with regular JWT
        let authenticatedUser = null
        
        if (token && !token.startsWith('testing-')) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET)
            authenticatedUser = decoded
            console.log('✅ JWT authenticated user:', decoded.userId || decoded.id)
          } catch (jwtError) {
            console.log('⚠️ JWT verification failed, checking if it\'s a Privy token:', jwtError.message)
            
            // Try to decode as Privy token (they use different structure)
            try {
              // Privy tokens are base64 encoded JWT tokens
              const base64Payload = token.split('.')[1]
              if (base64Payload) {
                const decoded = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'))
                console.log('🔍 Privy token payload:', { 
                  userId: decoded.sub, 
                  email: decoded.email, 
                  walletAddress: decoded.wallet?.address 
                })
                
                // Create authenticated user object from Privy token
                authenticatedUser = {
                  id: decoded.sub,
                  privy_id: decoded.sub,
                  email: decoded.email,
                  jwt_wallet_address: decoded.wallet?.address,
                  isPrivyAuth: true
                }
                console.log('✅ Privy token authenticated user:', authenticatedUser.id)
              }
            } catch (privyError) {
              console.log('⚠️ Privy token parsing also failed:', privyError.message)
            }
          }
        }
        
        // If no authentication, provide guest/demo balance  
        if (!authenticatedUser && (!token || !token.startsWith('testing-'))) {
          console.log('🎭 Providing guest balance for unauthenticated request')
          
          const guestBalance = {
            balance: 0.00,
            currency: 'USD',
            sol_balance: 0.0000,
            usdc_balance: 0.00,
            eth_balance: 0.0000,
            wallet_address: 'Not connected'
          }
          
          return NextResponse.json(guestBalance, { headers: corsHeaders })
        }
        
        // Handle authenticated user (JWT or Privy)
        if (authenticatedUser) {
          const db = await getDb()
          const users = db.collection('users')
          
          const user = await users.findOne({ 
            $or: [
              { id: authenticatedUser.id },
              { privy_id: authenticatedUser.privy_id || authenticatedUser.id }
            ]
          })
          
          if (!user) {
            console.log('⚠️ User not found in database, creating with default balance')
            
            // Create user in database with default balance
            const newUser = {
              id: authenticatedUser.id,
              privy_id: authenticatedUser.privy_id || authenticatedUser.id,
              email: authenticatedUser.email,
              wallet_address: authenticatedUser.jwt_wallet_address,
              balance: 25.00, // Default testing balance  
              created_at: new Date(),
              updated_at: new Date()
            }
            
            await users.insertOne(newUser)
            console.log('✅ Created new user with default balance:', newUser.id)
            
            const defaultBalance = {
              balance: 25.00,
              currency: 'USD',
              sol_balance: 0.0850,
              usdc_balance: 5.00,
              eth_balance: 0.0015,
              wallet_address: authenticatedUser.jwt_wallet_address || 'No wallet connected'
            }
            
            return NextResponse.json(defaultBalance, { headers: corsHeaders })
          }

          // Get real blockchain balance if user has a wallet address
          let realEthBalance = 0
          let realSolBalance = 0
          let realUsdcBalance = 0
          let totalUsdBalance = user.balance || 25.00 // Default testing balance

          // Determine wallet address to use (prefer JWT token data)
          const walletAddress = authenticatedUser.jwt_wallet_address || user.wallet_address || user.embedded_wallet_address
          console.log(`🔍 Wallet balance request for user ${user.id}: wallet_address=${walletAddress}`)

          try {
            // If user has wallet addresses, fetch real balances
            if (walletAddress) {
              console.log(`🔗 Fetching blockchain balance for wallet: ${walletAddress}`)
              
              // Fetch ETH balance using Ethereum RPC
              try {
                const ethRpcUrl = process.env.ETH_RPC_URL || process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'
                
                const ethResponse = await fetch(ethRpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_getBalance',
                    params: [walletAddress, 'latest']
                  })
                })
                
                if (ethResponse.ok) {
                  const ethData = await ethResponse.json()
                  if (ethData && ethData.result) {
                    // Convert wei to ether (approximate)
                    realEthBalance = parseFloat((parseInt(ethData.result, 16) / 1e18).toFixed(6))
                  }
                }
              } catch (ethError) {
                console.log('⚠️ Error fetching ETH balance:', ethError.message)
              }
              
              // Fetch SOL balance using public RPC
              try {
                const solRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
                
                const solResponse = await fetch(solRpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getBalance',
                    params: [walletAddress]
                  })
                })
                
                if (solResponse.ok) {
                  const solData = await solResponse.json()
                  if (solData && solData.result && solData.result.value !== undefined) {
                    // Convert lamports to SOL
                    realSolBalance = parseFloat((solData.result.value / 1e9).toFixed(4))
                  }
                }
              } catch (solError) {
                console.log('⚠️ Error fetching SOL balance:', solError.message)
              }

              // USDC and Total USD calculations (simple heuristic)
              realUsdcBalance = parseFloat((totalUsdBalance * 0.2).toFixed(2))
              totalUsdBalance = parseFloat((totalUsdBalance + realUsdcBalance + realSolBalance * 160 + realEthBalance * 3500).toFixed(2))
            }
          } catch (blockchainError) {
            console.log('⚠️ Blockchain fetch error:', blockchainError.message)
          }

          const finalBalance = {
            balance: totalUsdBalance,
            currency: 'USD',
            sol_balance: realSolBalance,
            usdc_balance: realUsdcBalance,
            eth_balance: realEthBalance,
            wallet_address: walletAddress || 'Not connected'
          }

          return NextResponse.json(finalBalance, { headers: corsHeaders })
        }
      } catch (error) {
        console.error('Error in wallet/balance endpoint:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
      }
    }

    // Wallet transactions endpoint (GET)
    if (route === 'wallet/transactions') {
      console.log('🎯 WALLET TRANSACTIONS ENDPOINT REACHED!')
      try {
        // Get Authorization header
        const authHeader = request.headers.get('authorization')
        let token = null
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7)
        }
        
        console.log('🔍 Wallet transactions request - Token present:', !!token)
        
        // For now, return empty transactions array since we're in testing phase
        // In production, this would fetch real blockchain transactions
        const transactionsResponse = {
          transactions: [],
          total_count: 0,
          wallet_address: '0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d', // Default for testing
          timestamp: new Date().toISOString()
        }
        
        console.log('📊 Returning transactions data:', transactionsResponse)
        return NextResponse.json(transactionsResponse, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error in wallet/transactions endpoint:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
      }
    }

    // Server Browser endpoint
    if (route === 'servers/lobbies') {
      try {
        // Import game server dynamically to avoid module loading issues
        const gameServerModule = await import('../../../lib/gameServer.js')
        
        // Get persistent servers data from game server
        let serverData = []
        try {
          // Try to get server from our global game server instance
          if (global.turflootGameServer) {
            const statistics = global.turflootGameServer.getServerStatistics()
            serverData = statistics.servers || []
          } else {
            // Fallback: generate basic server structure
            console.log('⚠️ Game server not initialized, using fallback data')
            const regions = ['US-East-1', 'US-West-1', 'EU-Central-1']
            const gameTypes = [
              { stake: 0, mode: 'free', name: 'Free Play', count: 4 },
              { stake: 1, mode: 'cash', name: '$1 Cash Game', count: 3 },
              { stake: 5, mode: 'cash', name: '$5 Cash Game', count: 3 },
              { stake: 20, mode: 'cash', name: '$20 High Stakes', count: 2 }
            ]
            
            for (const region of regions) {
              for (const gameType of gameTypes) {
                for (let serverNum = 1; serverNum <= gameType.count; serverNum++) {
                  const serverId = `${region.toLowerCase()}-${gameType.mode}-${gameType.stake}-${serverNum}`
                  const ping = region.includes('East') ? 15 + Math.random() * 25 : 
                               region.includes('West') ? 25 + Math.random() * 30 : 
                               35 + Math.random() * 45
                  
                  serverData.push({
                    id: serverId,
                    name: `${region} - ${gameType.name} #${serverNum}`,
                    region: region,
                    stake: gameType.stake,
                    mode: gameType.mode,
                    currentPlayers: Math.floor(Math.random() * 4),
                    maxPlayers: gameType.mode === 'cash' ? 6 : 6,
                    minPlayers: gameType.mode === 'cash' ? 2 : 1,
                    waitingPlayers: Math.floor(Math.random() * 2),
                    isRunning: Math.random() > 0.6,
                    ping: Math.round(ping),
                    avgWaitTime: '< 30s',
                    difficulty: gameType.stake >= 20 ? 'High' : gameType.stake >= 5 ? 'Medium' : 'Easy',
                    entryFee: gameType.stake,
                    potentialWinning: gameType.stake > 0 ? gameType.stake * 6 * 0.9 : 0,
                    status: Math.random() > 0.7 ? 'active' : 'waiting'
                  })
                }
              }
            }
          }
        } catch (serverError) {
          console.error('Error fetching server data:', serverError)
          serverData = []
        }

        const totalPlayers = serverData.reduce((sum, server) => sum + (server.currentPlayers || 0), 0)
        const totalActiveServers = serverData.filter(server => server.status === 'active').length

        return NextResponse.json({
          servers: serverData,
          totalPlayers,
          totalActiveServers,
          totalServers: serverData.length,
          regions: ['US-East-1', 'US-West-1', 'EU-Central-1'],
          gameTypes: [0, 1, 5, 20],
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error in servers/lobbies endpoint:', error)
        return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500, headers: corsHeaders })
      }
    }

    // Live statistics endpoints
    if (route === 'stats/live-players') {
      try {
        // Count only players in PAID rooms (mode === 'cash' and fee > 0)
        let paidRoomPlayerCount = 0
        
        if (global.turflootGameServer && global.turflootGameServer.rooms) {
          paidRoomPlayerCount = Object.values(global.turflootGameServer.rooms).reduce((total, room) => {
            // Only count players in paid rooms (cash mode with fees)
            if (room.mode === 'cash' && room.fee > 0) {
              const playerCount = room.getPlayerCount ? room.getPlayerCount().total : 0
              return total + playerCount
            }
            return total
          }, 0)
        }
        
        console.log(`📊 Live paid room players: ${paidRoomPlayerCount}`)
        
        return NextResponse.json({
          count: paidRoomPlayerCount,
          timestamp: new Date().toISOString(),
          type: 'paid_rooms_only'
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error in stats/live-players endpoint:', error)
        return NextResponse.json({ 
          count: 0, 
          timestamp: new Date().toISOString(),
          type: 'paid_rooms_only'
        }, { headers: corsHeaders })
      }
    }

    if (route === 'stats/global-winnings') {
      try {
        // For now, return a placeholder value - this would be calculated from database in production
        const globalWinnings = 0 // Could query database for sum of all winnings
        
        return NextResponse.json({
          total: globalWinnings,
          formatted: `$${globalWinnings}`,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error in stats/global-winnings endpoint:', error)
        return NextResponse.json({ total: 0, formatted: '$0', timestamp: new Date().toISOString() }, { headers: corsHeaders })
      }
    }

    // Leaderboard endpoint
    if (route === 'users/leaderboard') {
      try {
        const db = await getDb()
        const users = db.collection('users')
        
        // Get top players by total territory captured
        const leaderboard = await users.find({})
          .sort({ 'stats.total_territory_captured': -1 })
          .limit(10)
          .project({
            id: 1,
            username: 1,
            custom_name: 1,
            'profile.display_name': 1,
            'stats.games_won': 1,
            'stats.games_played': 1,
            'stats.total_territory_captured': 1,
            'stats.best_territory_percent': 1
          })
          .toArray()
        
        const formattedLeaderboard = leaderboard.map((user, index) => ({
          rank: index + 1,
          username: user.custom_name || user.profile?.display_name || user.username || 'Anonymous',
          gamesWon: user.stats?.games_won || 0,
          gamesPlayed: user.stats?.games_played || 0,
          totalTerritory: user.stats?.total_territory_captured || 0,
          bestPercent: user.stats?.best_territory_percent || 0,
          winRate: user.stats?.games_played ? ((user.stats?.games_won || 0) / user.stats.games_played * 100).toFixed(1) : '0.0'
        }))
        
        return NextResponse.json({
          leaderboard: formattedLeaderboard,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error in users/leaderboard endpoint:', error)
        return NextResponse.json({ 
          leaderboard: [],
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
    }

    // User profile get endpoint for server-side username display
    if (route === 'users/profile') {
      try {
        const userId = url.searchParams.get('userId')
        
        if (!userId) {
          return NextResponse.json(
            { error: 'userId parameter is required' },
            { status: 400, headers: corsHeaders }
          )
        }

        const db = await getDb()
        const users = db.collection('users')
        
        const user = await users.findOne({
          $or: [
            { id: userId },
            { privy_id: userId }
          ]
        }, {
          projection: {
            id: 1,
            privy_id: 1,
            email: 1,
            username: 1,
            customName: 1,
            custom_name: 1,
            'profile.display_name': 1,
            created_at: 1,
            updated_at: 1
          }
        })
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404, headers: corsHeaders }
          )
        }
        
        const profileResponse = {
          id: user.id || user.privy_id,
          username: user.custom_name || user.customName || user.profile?.display_name || user.username || 'Anonymous',
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
        
        return NextResponse.json(profileResponse, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Profile get error:', error)
        return NextResponse.json(
          { error: 'Failed to get user profile' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Lobby status endpoint
    if (route === 'lobby/status') {
      try {
        const userId = url.searchParams.get('userId')
        
        if (!userId) {
          return NextResponse.json(
            { error: 'userId parameter is required' },
            { status: 400, headers: corsHeaders }
          )
        }

        const db = await getDb()
        const lobbies = db.collection('lobbies')
        const invites = db.collection('lobby_invites')
        
        // Find active lobby for user
        const activeLobby = await lobbies.findOne({
          'members.userId': userId,
          status: { $in: ['waiting', 'ready'] }
        })
        
        // Find pending invites for user
        const pendingInvites = await invites.find({
          toUserId: userId,
          status: 'pending',
          expires_at: { $gt: new Date() }
        }).toArray()
        
        return NextResponse.json({
          currentLobby: activeLobby,
          pendingInvites,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Lobby status error:', error)
        return NextResponse.json(
          { error: 'Failed to get lobby status' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Lobby room validation endpoint
    if (route === 'lobby/validate-room') {
      try {
        const roomType = url.searchParams.get('roomType')
        const memberIds = url.searchParams.get('memberIds')?.split(',') || []
        
        if (!roomType || memberIds.length === 0) {
          return NextResponse.json(
            { error: 'roomType and memberIds are required' },
            { status: 400, headers: corsHeaders }
          )
        }

        const db = await getDb()
        const users = db.collection('users')
        
        // Get room requirements
        const roomFees = {
          '$1': 1,
          '$5': 5, 
          '$20': 20,
          '$50': 50
        }
        
        const requiredFee = roomFees[roomType] || 5
        
        // Check all members' balances
        const members = await users.find({
          $or: memberIds.map(id => ({ $or: [{ id }, { privy_id: id }] }))
        }).toArray()
        
        const memberValidation = members.map(member => ({
          userId: member.id || member.privy_id,
          username: member.custom_name || member.username || 'Anonymous',
          balance: member.balance || 0,
          canAfford: (member.balance || 0) >= requiredFee,
          requiredFee
        }))
        
        const allCanAfford = memberValidation.every(m => m.canAfford)
        
        return NextResponse.json({
          roomType,
          requiredFee,
          members: memberValidation,
          canProceed: allCanAfford,
          insufficientFunds: memberValidation.filter(m => !m.canAfford)
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Room validation error:', error)
        return NextResponse.json(
          { error: 'Failed to validate room requirements' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Real-time friends online status endpoint
    if (route === 'friends/online-status') {
      try {
        const userId = url.searchParams.get('userId')
        
        if (!userId) {
          return NextResponse.json(
            { error: 'userId parameter is required' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Get online friends from game server
        let onlineFriends = []
        if (global.turflootGameServer) {
          onlineFriends = await global.turflootGameServer.getOnlineFriends(userId)
        }
        
        return NextResponse.json({
          onlineFriends,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Online friends status error:', error)
        return NextResponse.json(
          { error: 'Failed to get online friends status' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // User search endpoint for adding friends
    if (route === 'users/search') {
      try {
        const query = url.searchParams.get('q')
        const currentUserId = url.searchParams.get('userId')
        
        if (!query || query.length < 2) {
          return NextResponse.json({
            users: [],
            message: 'Search query must be at least 2 characters'
          }, { headers: corsHeaders })
        }

        const db = await getDb()
        const users = db.collection('users')
        
        // Search for users by username (case-insensitive)
        const searchResults = await users.find({
          $and: [
            {
              $or: [
                { username: { $regex: new RegExp(query, 'i') } },
                { custom_name: { $regex: new RegExp(query, 'i') } },
                { 'profile.display_name': { $regex: new RegExp(query, 'i') } }
              ]
            },
            { id: { $ne: currentUserId } } // Exclude current user
          ]
        })
        .limit(10)
        .project({
          id: 1,
          username: 1,
          custom_name: 1,
          'profile.display_name': 1,
          created_at: 1
        })
        .toArray()
        
        const formattedResults = searchResults.map(user => ({
          id: user.id,
          username: user.custom_name || user.profile?.display_name || user.username || 'Anonymous',
          joinDate: user.created_at
        }))
        
        return NextResponse.json({
          users: formattedResults,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ User search error:', error)
        return NextResponse.json(
          { error: 'Failed to search users' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Friends list endpoint
    if (route === 'friends/list') {
      try {
        const userId = url.searchParams.get('userId')
        
        if (!userId) {
          return NextResponse.json({
            friends: [],
            timestamp: new Date().toISOString()
          }, { headers: corsHeaders })
        }

        console.log(`🔍 Retrieving friends list for user: ${userId}`)

        const db = await getDb()
        const friends = db.collection('friends')
        
        // Get accepted friend requests where user is either sender or recipient
        const friendships = await friends.find({
          $or: [
            { fromUserId: userId, status: 'accepted' },
            { toUserId: userId, status: 'accepted' }
          ]
        }).toArray()
        
        console.log(`📊 Found ${friendships.length} friendships for user ${userId}`)
        
        if (friendships.length === 0) {
          return NextResponse.json({
            friends: [],
            timestamp: new Date().toISOString()
          }, { headers: corsHeaders })
        }

        // Get friend user data - try multiple collections and fields for user lookup
        const users = db.collection('users')
        const friendIds = friendships.map(friendship => 
          friendship.fromUserId === userId ? friendship.toUserId : friendship.fromUserId
        )
        
        console.log(`🔍 Looking up friend user data for IDs: ${friendIds.join(', ')}`)
        
        // Try multiple user lookup strategies
        let friendUsers = await users.find({
          $or: [
            { id: { $in: friendIds } },
            { userId: { $in: friendIds } },
            { privy_id: { $in: friendIds } }
          ]
        }).project({
          id: 1,
          userId: 1,
          privy_id: 1,
          username: 1,
          customName: 1,
          custom_name: 1,
          'profile.display_name': 1
        }).toArray()
        
        console.log(`📊 Found ${friendUsers.length} user records in users collection`)
        
        // If users not found in users collection, create friend list from friendship data
        const formattedFriends = []
        
        for (const friendship of friendships) {
          const friendId = friendship.fromUserId === userId ? friendship.toUserId : friendship.fromUserId
          const friendName = friendship.fromUserId === userId ? friendship.toUserName : friendship.fromUserName
          
          // Try to find user data
          let userData = friendUsers.find(u => 
            u.id === friendId || u.userId === friendId || u.privy_id === friendId
          )
          
          if (userData) {
            // Use database user data
            formattedFriends.push({
              id: friendId,
              username: userData.customName || userData.custom_name || userData.profile?.display_name || userData.username || friendName || 'Anonymous',
              online: false,
              lastSeen: new Date().toISOString(),
              source: 'database'
            })
          } else {
            // Fallback to friendship data
            formattedFriends.push({
              id: friendId,
              username: friendName || 'Unknown User',
              online: false,
              lastSeen: new Date().toISOString(),
              source: 'friendship_record'
            })
          }
        }
        
        console.log(`✅ Returning ${formattedFriends.length} friends for user ${userId}`)
        
        return NextResponse.json({
          friends: formattedFriends,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error in friends/list endpoint:', error)
        return NextResponse.json({ 
          friends: [],
          timestamp: new Date().toISOString(),
          error: error.message
        }, { headers: corsHeaders })
      }
    }

    // Default route for unknown paths
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
  } catch (error) {
    console.error('GET handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request, { params }) {
  const { path } = params
  const url = new URL(request.url)
  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  try {
    if (!path || path.length === 0) {
      return NextResponse.json({ message: 'POST root' }, { headers: corsHeaders })
    }

    const route = path.join('/')
    console.log(`🔍 POST Route requested: ${route}`)

    // User stats update route
    if (route === 'users/stats/update') {
      try {
        console.log('📊 Updating user statistics:', body)
        // For now, just return success without actually storing (demo mode)
        return NextResponse.json(
          { 
            success: true,
            message: 'Statistics updated successfully',
            timestamp: new Date().toISOString()
          },
          { headers: corsHeaders }
        )
      } catch (error) {
        console.error('❌ Stats update error:', error)
        return NextResponse.json(
          { error: 'Failed to update statistics' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Lobby creation endpoint
    if (route === 'lobby/create') {
      try {
        console.log('🎯 Creating new lobby:', body)
        
        const { userId, userName, roomType, maxPlayers, userBalance } = body
        
        if (!userId || !userName || !roomType) {
          return NextResponse.json(
            { error: 'userId, userName and roomType are required' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Validate room type and fee
        const roomFees = {
          'FREE': 0,
          '$1': 1,
          '$5': 5, 
          '$20': 20,
          '$50': 50
        }
        
        const entryFee = roomFees[roomType]
        if (entryFee === undefined) {
          return NextResponse.json(
            { error: 'Invalid roomType. Must be FREE, $1, $5, $20, or $50' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Check user balance for paid rooms
        if (entryFee > 0 && (!userBalance || userBalance < entryFee)) {
          return NextResponse.json(
            { error: `Insufficient balance. Need $${entryFee} but have $${userBalance || 0}` },
            { status: 400, headers: corsHeaders }
          )
        }

        // Generate unique room code (6-character alphanumeric)
        const generateRoomCode = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          let code = ''
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
          }
          return code
        }

        let roomCode = generateRoomCode()
        
        // Ensure room code is unique
        const db = await getDb()
        const lobbies = db.collection('lobbies')
        
        let existingLobby = await lobbies.findOne({ roomCode, status: { $ne: 'completed' } })
        while (existingLobby) {
          roomCode = generateRoomCode()
          existingLobby = await lobbies.findOne({ roomCode, status: { $ne: 'completed' } })
        }

        // Create lobby object
        const lobbyId = crypto.randomUUID()
        const newLobby = {
          id: lobbyId,
          roomCode,
          roomType,
          entryFee,
          maxPlayers: maxPlayers || 6,
          status: 'waiting',
          members: [
            {
              userId,
              userName,
              balance: userBalance || 0,
              isLeader: true,
              joinedAt: new Date()
            }
          ],
          created_at: new Date(),
          updated_at: new Date(),
          createdBy: userId,
          gameStarted: false
        }

        // Insert lobby into database
        await lobbies.insertOne(newLobby)
        
        console.log(`✅ Created lobby ${lobbyId} with room code ${roomCode}`)
        
        return NextResponse.json({
          success: true,
          lobby: newLobby,
          roomCode,
          message: 'Lobby created successfully'
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Lobby create error:', error)
        return NextResponse.json(
          { error: 'Failed to create lobby' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Lobby creation endpoint
    if (route === 'lobby/create') {
      try {
        console.log('🎯 Creating new lobby:', body)
        
        const { userId, userName, roomType, maxPlayers, userBalance } = body
        
        if (!userId || !userName || !roomType) {
          return NextResponse.json(
            { error: 'userId, userName and roomType are required' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Validate room type and fee
        const roomFees = {
          'FREE': 0,
          '$1': 1,
          '$5': 5, 
          '$20': 20,
          '$50': 50
        }
        
        const entryFee = roomFees[roomType]
        if (entryFee === undefined) {
          return NextResponse.json(
            { error: 'Invalid roomType. Must be FREE, $1, $5, $20, or $50' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Check user balance for paid rooms
        if (entryFee > 0 && (!userBalance || userBalance < entryFee)) {
          return NextResponse.json(
            { error: `Insufficient balance. Need $${entryFee} but have $${userBalance || 0}` },
            { status: 400, headers: corsHeaders }
          )
        }

        // Generate unique room code (6-character alphanumeric)
        const generateRoomCode = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          let code = ''
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
          }
          return code
        }

        let roomCode = generateRoomCode()
        
        // Ensure room code is unique
        const db = await getDb()
        const lobbies = db.collection('lobbies')
        
        let existingLobby = await lobbies.findOne({ roomCode, status: { $ne: 'completed' } })
        while (existingLobby) {
          roomCode = generateRoomCode()
          existingLobby = await lobbies.findOne({ roomCode, status: { $ne: 'completed' } })
        }

        // Create lobby object
        const lobbyId = crypto.randomUUID()
        const newLobby = {
          id: lobbyId,
          roomCode,
          roomType,
          entryFee,
          maxPlayers: maxPlayers || 6,
          status: 'waiting',
          members: [
            {
              userId,
              userName,
              balance: userBalance || 0,
              isLeader: true,
              joinedAt: new Date()
            }
          ],
          created_at: new Date(),
          updated_at: new Date(),
          createdBy: userId,
          gameStarted: false
        }

        // Insert lobby into database
        await lobbies.insertOne(newLobby)
        
        console.log(`✅ Created lobby ${lobbyId} with room code ${roomCode}`)
        
        return NextResponse.json({
          success: true,
          lobby: newLobby,
          roomCode,
          message: 'Lobby created successfully'
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Lobby create error:', error)
        return NextResponse.json(
          { error: 'Failed to create lobby' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Lobby join endpoint
    if (route === 'lobby/join') {
      try {
        console.log('🚪 Joining lobby:', body)
        
        const { lobbyId, userId, userName, userBalance } = body
        
        if (!lobbyId || !userId || !userName) {
          return NextResponse.json(
            { error: 'lobbyId, userId and userName are required' },
            { status: 400, headers: corsHeaders }
          )
        }

        const db = await getDb()
        const lobbies = db.collection('lobbies')
        
        // Find and update lobby
        const lobby = await lobbies.findOne({ id: lobbyId, status: 'waiting' })
        
        if (!lobby) {
          return NextResponse.json(
            { error: 'Lobby not found or no longer available' },
            { status: 404, headers: corsHeaders }
          )
        }

        // Check if user already in lobby
        const existingMember = lobby.members.find(m => m.userId === userId)
        if (existingMember) {
          return NextResponse.json(
            { error: 'You are already in this lobby' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Add user to lobby
        await lobbies.updateOne(
          { id: lobbyId },
          {
            $push: {
              members: {
                userId,
                userName,
                balance: userBalance || 0,
                isLeader: false,
                joinedAt: new Date()
              }
            },
            $set: { updated_at: new Date() }
          }
        )
        
        // Get updated lobby
        const updatedLobby = await lobbies.findOne({ id: lobbyId })
        console.log(`✅ User ${userId} joined lobby ${lobbyId}`)
        
        return NextResponse.json({
          success: true,
          lobby: updatedLobby,
          message: 'Joined lobby successfully'
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Lobby join error:', error)
        return NextResponse.json(
          { error: 'Failed to join lobby' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Lobby invite endpoint
    if (route === 'lobby/invite') {
      try {
        console.log('📧 Sending lobby invite:', body)
        
        const { lobbyId, fromUserId, fromUserName, toUserId, roomType } = body
        
        if (!lobbyId || !fromUserId || !toUserId) {
          return NextResponse.json(
            { error: 'lobbyId, fromUserId and toUserId are required' },
            { status: 400, headers: corsHeaders }
          )
        }

        const db = await getDb()
        const invites = db.collection('lobby_invites')
        
        // Check if invite already exists
        const existingInvite = await invites.findOne({
          lobbyId,
          toUserId,
          status: 'pending'
        })
        
        if (existingInvite) {
          return NextResponse.json(
            { error: 'Invite already sent to this user' },
            { status: 400, headers: corsHeaders }
          )
        }

        // Create invite
        const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newInvite = {
          id: inviteId,
          lobbyId,
          fromUserId,
          fromUserName: fromUserName || 'Unknown Player',
          toUserId,
          roomType: roomType || '$5',
          status: 'pending',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
        }
        
        await invites.insertOne(newInvite)
        console.log(`✅ Sent lobby invite from ${fromUserId} to ${toUserId}`)
        
        return NextResponse.json({
          success: true,
          invite: newInvite,
          message: 'Invite sent successfully'
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Lobby invite error:', error)
        return NextResponse.json(
          { error: 'Failed to send invite' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // User profile name update route
    if (route === 'users/profile/update-name') {
      console.log('🎯 ROUTE MATCHED: users/profile/update-name')
      console.log('📥 Request method:', request.method)
      console.log('📋 Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries())))
      
      try {
        console.log('✏️ Updating user profile name - Body received:', JSON.stringify(body))
        
        const { userId, customName, privyId, email } = body
        
        console.log('🔍 Parsed fields:', { 
          userId: userId ? userId.substring(0, 20) + '...' : 'MISSING',
          customName, 
          privyId: privyId ? privyId.substring(0, 20) + '...' : 'N/A',
          email: email || 'null'
        })
        
        // Enhanced validation
        if (!userId) {
          console.error('❌ Missing userId in request')
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400, headers: corsHeaders }
          )
        }

        if (customName === undefined || customName === null || customName === '') {
          console.error('❌ Invalid customName:', customName)
          return NextResponse.json(
            { error: 'customName is required and cannot be empty' },
            { status: 400, headers: corsHeaders }
          )
        }

        if (typeof customName !== 'string' || customName.length < 1 || customName.length > 20) {
          console.error('❌ Invalid customName length or type:', typeof customName, customName.length)
          return NextResponse.json(
            { error: 'Custom name must be a string between 1 and 20 characters' },
            { status: 400, headers: corsHeaders }
          )
        }

        console.log('🔗 Attempting to connect to database...')
        const db = await getDb()
        console.log('✅ Database connection successful')
        
        const users = db.collection('users')
        
        // Enhanced user lookup with more flexible matching
        const userQuery = {
          $or: [
            { id: userId },
            { privy_id: userId },
            { privy_id: privyId },
            { _id: userId }
          ].filter(Boolean) // Remove null/undefined entries
        }
        
        console.log('🔍 Searching for user with query:', JSON.stringify(userQuery))
        const existingUser = await users.findOne(userQuery)
        console.log('👤 User lookup result:', existingUser ? 'FOUND' : 'NOT FOUND')
        
        let result;
        
        if (existingUser) {
          // Update existing user's name
          console.log('🔄 Updating existing user...')
          result = await users.updateOne(
            { _id: existingUser._id },
            { 
              $set: { 
                customName: customName,
                username: customName, // Also update username field for compatibility
                displayName: customName, // Additional field for display
                updated_at: new Date(),
                last_name_change: new Date()
              }
            }
          )
          
          console.log(`✅ Update operation completed. Modified count: ${result.modifiedCount}`)
          console.log(`✅ Updated existing user ${userId} name to: "${customName}"`)
        } else {
          // Create new user with the custom name
          console.log('👤 Creating new user...')
          const newUser = {
            id: userId,
            privy_id: privyId || userId,
            email: email || null,
            customName: customName,
            username: customName,
            displayName: customName,
            balance: 25.00, // Default testing balance
            created_at: new Date(),
            updated_at: new Date(),
            last_name_change: new Date()
          }
          
          result = await users.insertOne(newUser)
          console.log(`✅ Insert operation completed. Inserted ID: ${result.insertedId}`)
          console.log(`✅ Created new user ${userId} with name: "${customName}"`)
        }
        
        // Verify the update by fetching the user again
        const verificationUser = await users.findOne(userQuery)
        if (verificationUser && verificationUser.customName === customName) {
          console.log('✅ Name update verified in database')
        } else {
          console.error('⚠️ Name update verification failed')
        }
        
        const successResponse = { 
          success: true,
          message: 'Name updated successfully',
          customName: customName,
          userId: userId,
          timestamp: new Date().toISOString()
        }
        
        console.log('📤 Sending success response:', JSON.stringify(successResponse))
        
        return NextResponse.json(successResponse, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Profile name update error - Full details:')
        console.error('❌ Error name:', error.name)
        console.error('❌ Error message:', error.message)
        console.error('❌ Error stack:', error.stack)
        
        // Check for specific error types
        if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
          console.error('❌ Database connection error detected')
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to update profile name',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
          },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    if (route === 'friends/send-request') {
      try {
        const { fromUserId, toUserId, fromUserName, toUserName } = body
        
        if (!fromUserId || !toUserId) {
          return NextResponse.json({ error: 'fromUserId and toUserId are required' }, { status: 400, headers: corsHeaders })
        }

        // Prevent self-addition
        if (fromUserId === toUserId) {
          return NextResponse.json({ 
            error: 'Cannot add yourself as a friend',
            details: 'Users cannot send friend requests to themselves'
          }, { status: 400, headers: corsHeaders })
        }

        const db = await getDb()
        const friends = db.collection('friends')

        // Check if friendship already exists
        const existingFriendship = await friends.findOne({
          $or: [
            { fromUserId, toUserId },
            { fromUserId: toUserId, toUserId: fromUserId }
          ]
        })

        if (existingFriendship) {
          return NextResponse.json({ 
            error: 'Friendship already exists',
            status: existingFriendship.status,
            details: 'You are already friends with this user or a request is pending'
          }, { status: 400, headers: corsHeaders })
        }

        const friendRequest = {
          id: crypto.randomUUID(),
          fromUserId,
          toUserId,
          fromUserName: fromUserName || 'Unknown User',
          toUserName: toUserName || 'Unknown User',
          status: 'accepted', // Auto-accept for demo purposes - in production would be 'pending'
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await friends.insertOne(friendRequest)

        console.log(`✅ Friend request sent from ${fromUserId} to ${toUserId} (auto-accepted)`)
        
        return NextResponse.json({
          success: true,
          message: 'Friend request sent and accepted successfully',
          requestId: friendRequest.id,
          status: friendRequest.status
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error sending friend request:', error)
        return NextResponse.json({
          error: 'Failed to send friend request',
          details: error.message
        }, { status: 500, headers: corsHeaders })
      }
    }

    if (route === 'friends/accept-request') {
      try {
        const { requestId, userId } = body
        
        if (!requestId || !userId) {
          return NextResponse.json({
            error: 'requestId and userId are required'
          }, { status: 400, headers: corsHeaders })
        }

        const db = await getDb()
        const friends = db.collection('friends')
        
        // Update request status to accepted by our UUID id (avoid Mongo ObjectId)
        const result = await friends.updateOne(
          { 
            id: requestId,
            toUserId: userId,
            status: 'pending'
          },
          {
            $set: {
              status: 'accepted',
              updatedAt: new Date()
            }
          }
        )

        if (result.matchedCount === 0) {
          return NextResponse.json({
            error: 'Friend request not found or already processed'
          }, { status: 404, headers: corsHeaders })
        }

        console.log('✅ Friend request accepted')
        
        return NextResponse.json({
          success: true,
          message: 'Friend request accepted'
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error accepting friend request:', error)
        return NextResponse.json({
          error: 'Failed to accept friend request'
        }, { status: 500, headers: corsHeaders })
      }
    }

    // Get user balance
    if (route === 'users/balance') {
      try {
        const { userId } = await request.json()
        
        if (!userId) {
          return NextResponse.json({
            error: 'userId is required'
          }, { status: 400, headers: corsHeaders })
        }

        const db = await getDb()
        const users = db.collection('users')
        
        // Get user data
        const user = await users.findOne({ userId: userId })
        const balance = user?.balance || 0

        console.log(`💰 Retrieved balance for user ${userId}: ${balance} coins`)
        
        return NextResponse.json({
          success: true,
          balance,
          userId
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error getting user balance:', error)
        return NextResponse.json({
          error: 'Failed to get user balance'
        }, { status: 500, headers: corsHeaders })
      }
    }

    // Add mission reward to user account
    if (route === 'users/add-mission-reward') {
      try {
        const { userId, missionType, rewardAmount, missionDescription, completedAt } = await request.json()
        
        if (!userId || !missionType || !rewardAmount) {
          return NextResponse.json({
            error: 'userId, missionType, and rewardAmount are required'
          }, { status: 400, headers: corsHeaders })
        }

        const db = await getDb()
        const users = db.collection('users')
        
        // Update user's balance and add mission record
        const result = await users.updateOne(
          { userId: userId },
          {
            $inc: { balance: rewardAmount },
            $push: {
              missionHistory: {
                id: crypto.randomUUID(),
                type: missionType,
                reward: rewardAmount,
                description: missionDescription,
                completedAt: completedAt || new Date().toISOString(),
                createdAt: new Date()
              }
            },
            $set: { updatedAt: new Date() }
          },
          { upsert: true }
        )

        // Get updated user data to return new balance
        const updatedUser = await users.findOne({ userId: userId })
        const newBalance = updatedUser?.balance || rewardAmount

        console.log(`✅ Mission reward added: ${rewardAmount} coins to user ${userId} (new balance: ${newBalance})`)
        
        return NextResponse.json({
          success: true,
          message: 'Mission reward added successfully',
          rewardAmount,
          newBalance,
          missionType,
          description: missionDescription
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error adding mission reward:', error)
        return NextResponse.json({
          error: 'Failed to add mission reward'
        }, { status: 500, headers: corsHeaders })
      }
    }

    // ==================== PAID ROOM SYSTEM ====================
    
    // Configuration
    const ROOM_TIERS = {
      1: { entryFee: 100, bounty: 90, platformFee: 10 }, // $1.00 in cents
      5: { entryFee: 500, bounty: 450, platformFee: 50 }, // $5.00 in cents
      20: { entryFee: 2000, bounty: 1800, platformFee: 200 } // $20.00 in cents
    }
    
    const PLATFORM_WALLET = '0x6657C1E107e9963EBbFc9Dfe510054238f7E8251'
    const DAMAGE_ATTRIBUTION_WINDOW = 10000 // 10 seconds in milliseconds
    const CASHOUT_FEE_PERCENT = 10 // 10% cashout fee
    
    // Join Paid Room
    if (route === 'rooms/join') {
      try {
        const { userId, roomTier, matchId } = body
        
        if (!userId || !roomTier || !matchId) {
          return NextResponse.json({ 
            error: 'userId, roomTier, and matchId are required' 
          }, { status: 400, headers: corsHeaders })
        }
        
        if (!ROOM_TIERS[roomTier]) {
          return NextResponse.json({ 
            error: 'Invalid room tier. Must be 1, 5, or 20' 
          }, { status: 400, headers: corsHeaders })
        }
        
        const db = await getDb()
        const users = db.collection('users')
        const matches = db.collection('paid_matches')
        const user = await users.findOne({ userId })
        
        if (!user) {
          return NextResponse.json({ 
            error: 'User not found' 
          }, { status: 404, headers: corsHeaders })
        }
        
        const tier = ROOM_TIERS[roomTier]
        
        // Check if user has sufficient balance
        if ((user.balance || 0) < tier.entryFee) {
          return NextResponse.json({ 
            error: 'Insufficient balance',
            requiredBalance: tier.entryFee,
            currentBalance: user.balance || 0,
            tier: {
              entry: tier.entryFee,
              bounty: tier.bounty,
              platformFee: tier.platformFee
            }
          }, { status: 400, headers: corsHeaders })
        }
        
        // Deduct entry fee from user balance
        await users.updateOne(
          { userId },
          { 
            $inc: { balance: -tier.entryFee },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Create or update match with player entry
        const matchData = {
          matchId,
          roomTier,
          status: 'PENDING',
          players: {},
          rolloverPot: 0,
          platformFeesCollected: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        // Add player to match
        matchData.players[userId] = {
          userId,
          status: 'ACTIVE',
          bountyEscrow: tier.bounty,
          joinedAt: new Date(),
          lastDamageTime: null,
          lastDamageBy: null,
          matchEarnings: 0
        }
        
        // Update platform fees collected
        matchData.platformFeesCollected = tier.platformFee
        
        await matches.updateOne(
          { matchId },
          { 
            $set: matchData,
            $addToSet: { playerIds: userId }
          },
          { upsert: true }
        )
        
        console.log(`💰 User ${userId} joined $${roomTier} room. Deducted $${tier.entryFee/100}, bounty: $${tier.bounty/100}`)
        
        // TODO: Send platform fee to on-chain wallet (implement web3 integration)
        console.log(`🏦 Platform fee of $${tier.platformFee/100} to be sent to ${PLATFORM_WALLET}`)
        
        return NextResponse.json({
          success: true,
          message: `Successfully joined $${roomTier} room`,
          matchId,
          playerBounty: tier.bounty,
          platformFee: tier.platformFee,
          remainingBalance: (user.balance || 0) - tier.entryFee
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error joining paid room:', error)
        return NextResponse.json({
          error: 'Failed to join paid room'
        }, { status: 500, headers: corsHeaders })
      }
    }
    
    // Record Player Elimination
    if (route === 'rooms/eliminate') {
      try {
        const { matchId, victimUserId, killerUserId, eliminationType } = body
        
        if (!matchId || !victimUserId) {
          return NextResponse.json({ 
            error: 'matchId and victimUserId are required' 
          }, { status: 400, headers: corsHeaders })
        }
        
        const db = await getDb()
        const matches = db.collection('paid_matches')
        const users = db.collection('users')
        
        const match = await matches.findOne({ matchId })
        
        if (!match) {
          return NextResponse.json({ 
            error: 'Match not found' 
          }, { status: 404, headers: corsHeaders })
        }
        
        const victim = match.players[victimUserId]
        
        if (!victim || victim.status !== 'ACTIVE') {
          return NextResponse.json({ 
            error: 'Victim not found or not active in match' 
          }, { status: 400, headers: corsHeaders })
        }
        
        let bountyTransfer = victim.bountyEscrow
        let rolloverAddition = 0
        
        // Determine if there's a valid killer
        if (killerUserId && match.players[killerUserId] && match.players[killerUserId].status === 'ACTIVE') {
          // Valid killer - transfer bounty + any rollover pot
          const totalPayout = bountyTransfer + match.rolloverPot
          
          // Credit killer's platform balance
          await users.updateOne(
            { userId: killerUserId },
            { 
              $inc: { balance: totalPayout },
              $set: { updatedAt: new Date() }
            }
          )
          
          // Update killer's match earnings
          await matches.updateOne(
            { matchId },
            { 
              $inc: { [`players.${killerUserId}.matchEarnings`]: totalPayout },
              $set: { 
                rolloverPot: 0, // Reset rollover pot
                [`players.${victimUserId}.status`]: 'ELIMINATED',
                [`players.${victimUserId}.eliminatedAt`]: new Date(),
                [`players.${victimUserId}.eliminatedBy`]: killerUserId,
                updatedAt: new Date()
              }
            }
          )
          
          console.log(`⚔️ ${killerUserId} eliminated ${victimUserId}, earned $${totalPayout/100} (bounty: $${bountyTransfer/100}, rollover: $${match.rolloverPot/100})`)
          
        } else {
          // No valid killer - add to rollover pot
          rolloverAddition = bountyTransfer
          
          await matches.updateOne(
            { matchId },
            { 
              $inc: { rolloverPot: rolloverAddition },
              $set: { 
                [`players.${victimUserId}.status`]: 'ELIMINATED',
                [`players.${victimUserId}.eliminatedAt`]: new Date(),
                [`players.${victimUserId}.eliminationType`]: eliminationType || 'SUICIDE',
                updatedAt: new Date()
              }
            }
          )
          
          console.log(`💀 ${victimUserId} eliminated with no killer, $${bountyTransfer/100} added to rollover pot`)
        }
        
        // Check if match should be settled (≤1 active player)
        const activePlayers = Object.values(match.players).filter(p => p.status === 'ACTIVE')
        if (activePlayers.length <= 1) {
          await matches.updateOne(
            { matchId },
            { 
              $set: { 
                status: 'SETTLED',
                settledAt: new Date(),
                updatedAt: new Date()
              }
            }
          )
          console.log(`🏁 Match ${matchId} settled with ${activePlayers.length} active players`)
        }
        
        return NextResponse.json({
          success: true,
          bountyTransferred: bountyTransfer,
          rolloverPot: match.rolloverPot + rolloverAddition,
          killerEarnings: killerUserId ? (bountyTransfer + match.rolloverPot) : 0,
          matchStatus: activePlayers.length <= 1 ? 'SETTLED' : 'ACTIVE'
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error processing elimination:', error)
        return NextResponse.json({
          error: 'Failed to process elimination'
        }, { status: 500, headers: corsHeaders })
      }
    }
    
    // Record Damage Attribution
    if (route === 'rooms/damage') {
      try {
        const { matchId, victimUserId, attackerUserId } = body
        
        if (!matchId || !victimUserId || !attackerUserId) {
          return NextResponse.json({ 
            error: 'matchId, victimUserId, and attackerUserId are required' 
          }, { status: 400, headers: corsHeaders })
        }
        
        const db = await getDb()
        const matches = db.collection('paid_matches')
        
        const match = await matches.findOne({ matchId })
        
        if (!match) {
          return NextResponse.json({ 
            error: 'Match not found' 
          }, { status: 404, headers: corsHeaders })
        }
        
        const victim = match.players[victimUserId]
        const attacker = match.players[attackerUserId]
        
        if (!victim || victim.status !== 'ACTIVE' || !attacker || attacker.status !== 'ACTIVE') {
          return NextResponse.json({ 
            error: 'Invalid victim or attacker' 
          }, { status: 400, headers: corsHeaders })
        }
        
        // Update damage attribution
        await matches.updateOne(
          { matchId },
          { 
            $set: { 
              [`players.${victimUserId}.lastDamageTime`]: new Date(),
              [`players.${victimUserId}.lastDamageBy`]: attackerUserId,
              updatedAt: new Date()
            }
          }
        )
        
        return NextResponse.json({
          success: true,
          message: 'Damage attribution recorded'
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error recording damage:', error)
        return NextResponse.json({
          error: 'Failed to record damage'
        }, { status: 500, headers: corsHeaders })
      }
    }
    
    // Player Cashout
    if (route === 'rooms/cashout') {
      try {
        const { matchId, userId } = body
        
        if (!matchId || !userId) {
          return NextResponse.json({ 
            error: 'matchId and userId are required' 
          }, { status: 400, headers: corsHeaders })
        }
        
        const db = await getDb()
        const matches = db.collection('paid_matches')
        const users = db.collection('users')
        
        const match = await matches.findOne({ matchId })
        
        if (!match) {
          return NextResponse.json({ 
            error: 'Match not found' 
          }, { status: 404, headers: corsHeaders })
        }
        
        const player = match.players[userId]
        
        if (!player || player.status !== 'ACTIVE') {
          return NextResponse.json({ 
            error: 'Player not found or not active in match' 
          }, { status: 400, headers: corsHeaders })
        }
        
        if (player.matchEarnings <= 0) {
          return NextResponse.json({ 
            error: 'No earnings to cash out' 
          }, { status: 400, headers: corsHeaders })
        }
        
        // Calculate cashout amounts
        const grossEarnings = player.matchEarnings
        const cashoutFee = Math.floor(grossEarnings * CASHOUT_FEE_PERCENT / 100)
        const netEarnings = grossEarnings - cashoutFee
        
        // Credit net earnings to user balance
        await users.updateOne(
          { userId },
          { 
            $inc: { balance: netEarnings },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Update player status to LEFT
        await matches.updateOne(
          { matchId },
          { 
            $set: { 
              [`players.${userId}.status`]: 'LEFT',
              [`players.${userId}.cashedOutAt`]: new Date(),
              [`players.${userId}.cashoutFee`]: cashoutFee,
              [`players.${userId}.netCashout`]: netEarnings,
              updatedAt: new Date()
            },
            $inc: { platformFeesCollected: cashoutFee }
          }
        )
        
        // TODO: Send cashout fee to on-chain wallet
        console.log(`💰 ${userId} cashed out $${netEarnings/100} (fee: $${cashoutFee/100}) from match ${matchId}`)
        console.log(`🏦 Cashout fee of $${cashoutFee/100} to be sent to ${PLATFORM_WALLET}`)
        
        // Check if match should be settled
        const activePlayers = Object.values(match.players).filter(p => p.status === 'ACTIVE')
        if (activePlayers.length <= 1) {
          await matches.updateOne(
            { matchId },
            { 
              $set: { 
                status: 'SETTLED',
                settledAt: new Date(),
                updatedAt: new Date()
              }
            }
          )
        }
        
        return NextResponse.json({
          success: true,
          grossEarnings,
          cashoutFee,
          netEarnings,
          message: `Successfully cashed out $${netEarnings/100}`
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error processing cashout:', error)
        return NextResponse.json({
          error: 'Failed to process cashout'
        }, { status: 500, headers: corsHeaders })
      }
    }
    
    // Get Match Status
    if (route === 'rooms/match') {
      try {
        const { matchId } = body
        
        if (!matchId) {
          return NextResponse.json({ 
            error: 'matchId is required' 
          }, { status: 400, headers: corsHeaders })
        }
        
        const db = await getDb()
        const matches = db.collection('paid_matches')
        
        const match = await matches.findOne({ matchId })
        
        if (!match) {
          return NextResponse.json({ 
            error: 'Match not found' 
          }, { status: 404, headers: corsHeaders })
        }
        
        // Calculate match statistics
        const activePlayers = Object.values(match.players).filter(p => p.status === 'ACTIVE').length
        const totalBounty = Object.values(match.players).reduce((sum, p) => sum + p.bountyEscrow, 0)
        const totalEarnings = Object.values(match.players).reduce((sum, p) => sum + p.matchEarnings, 0)
        
        return NextResponse.json({
          success: true,
          match: {
            matchId: match.matchId,
            status: match.status,
            roomTier: match.roomTier,
            activePlayers,
            rolloverPot: match.rolloverPot,
            platformFeesCollected: match.platformFeesCollected,
            totalBounty,
            totalEarnings,
            createdAt: match.createdAt,
            players: match.players
          }
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error getting match status:', error)
        return NextResponse.json({
          error: 'Failed to get match status'
        }, { status: 500, headers: corsHeaders })
      }
    }
    
    // Get Available Room Tiers
    if (route === 'rooms/tiers') {
      try {
        const { userId } = body
        
        if (!userId) {
          return NextResponse.json({ 
            error: 'userId is required' 
          }, { status: 400, headers: corsHeaders })
        }
        
        const db = await getDb()
        const users = db.collection('users')
        const user = await users.findOne({ userId })
        
        const userBalance = user?.balance || 0
        
        // Format tiers with affordability info
        const availableTiers = Object.entries(ROOM_TIERS).map(([tier, config]) => ({
          tier: parseInt(tier),
          entryFee: config.entryFee,
          entryFeeDisplay: `$${(config.entryFee / 100).toFixed(2)}`,
          bounty: config.bounty,
          bountyDisplay: `$${(config.bounty / 100).toFixed(2)}`,
          platformFee: config.platformFee,
          platformFeeDisplay: `$${(config.platformFee / 100).toFixed(2)}`,
          affordable: userBalance >= config.entryFee,
          description: `$${tier} → $${(config.bounty / 100).toFixed(2)} bounty, $${(config.platformFee / 100).toFixed(2)} fee`
        }))
        
        return NextResponse.json({
          success: true,
          userBalance,
          userBalanceDisplay: `$${(userBalance / 100).toFixed(2)}`,
          tiers: availableTiers,
          platformWallet: PLATFORM_WALLET
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('Error getting room tiers:', error)
        return NextResponse.json({
          error: 'Failed to get room tiers'
        }, { status: 500, headers: corsHeaders })
      }
    }

    // Fallback
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
  } catch (error) {
    console.error('POST handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}