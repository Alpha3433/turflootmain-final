import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'
import { createUser, requireAuth, updateUserProfile, getUserStats } from '../../../lib/auth.js'

const JWT_SECRET = process.env.JWT_SECRET || 'turfloot-secret-key-change-in-production'

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = process.env.DB_NAME || 'turfloot_db'

let client = null

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URL)
    await client.connect()
  }
  return client.db(DB_NAME)
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
      return requireAuth(async (req) => {
        const db = await getDb()
        const users = db.collection('users')
        
        const user = await users.findOne({ 
          $or: [
            { id: req.user.id },
            { privy_id: req.user.privyId }
          ]
        })
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404, headers: corsHeaders }
          )
        }
        
        return NextResponse.json({
          balance: user.balance || 0,
          currency: 'USD',
          sol_balance: user.sol_balance || 0,
          usdc_balance: user.usdc_balance || 0
        }, { headers: corsHeaders })
      })(request)
    }

    // Transaction history endpoint (GET)
    if (route === 'wallet/transactions') {
      return requireAuth(async (req) => {
        const db = await getDb()
        const transactions = db.collection('transactions')
        
        const userTransactions = await transactions
          .find({ user_id: req.user.id })
          .sort({ created_at: -1 })
          .limit(50)
          .toArray()
        
        return NextResponse.json({
          transactions: userTransactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            created_at: tx.created_at,
            transaction_hash: tx.transaction_hash,
            recipient_address: tx.recipient_address,
            fee_amount: tx.fee_amount,
            net_amount: tx.net_amount
          }))
        }, { headers: corsHeaders })
      })(request)
    }

    // Legacy wallet endpoints - deprecated in favor of Privy wallet functionality
    if (route.startsWith('wallet/') && !['wallet/balance', 'wallet/transactions'].includes(route)) {
      return NextResponse.json(
        { 
          error: 'Direct wallet endpoints are deprecated. Wallet data is now managed through Privy authentication.',
          redirect: 'Use the unified Privy authentication system.'
        },
        { status: 410, headers: corsHeaders }
      )
    }

    // Game pots endpoint
    if (route === 'pots') {
      const db = await getDb()
      const games = db.collection('games')
      
      // Get active game statistics
      const stats = await games.aggregate([
        {
          $match: {
            created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          }
        },
        {
          $group: {
            _id: '$stake',
            totalPot: { $sum: '$stake' },
            playerCount: { $sum: 1 }
          }
        }
      ]).toArray()
      
      const pots = [
        { 
          table: '$1', 
          pot: stats.find(s => s._id === 1)?.totalPot || 127, 
          players: stats.find(s => s._id === 1)?.playerCount || 45 
        },
        { 
          table: '$5', 
          pot: stats.find(s => s._id === 5)?.totalPot || 892, 
          players: stats.find(s => s._id === 5)?.playerCount || 23 
        },
        { 
          table: '$20', 
          pot: stats.find(s => s._id === 20)?.totalPot || 3456, 
          players: stats.find(s => s._id === 20)?.playerCount || 12 
        }
      ]
      
      return NextResponse.json(pots, { headers: corsHeaders })
    }

    // User routes
    if (route.startsWith('users/')) {
      const userId = route.split('/')[1]
      
      if (request.method === 'GET') {
        const db = await getDb()
        const users = db.collection('users')
        
        const user = await users.findOne({ 
          $or: [
            { id: userId },
            { wallet_address: userId }
          ]
        })
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404, headers: corsHeaders }
          )
        }
        
        // Remove sensitive data
        const { password_hash, ...publicUser } = user
        
        return NextResponse.json(publicUser, { headers: corsHeaders })
      }
    }

    // Games routes
    if (route === 'games') {
      return requireAuth(async (req) => {
        const db = await getDb()
        const games = db.collection('games')
        
        const userGames = await games.find({ player_id: req.user.id })
          .sort({ created_at: -1 })
          .limit(20)
          .toArray()
        
        return NextResponse.json(userGames, { headers: corsHeaders })
      })(request)
    }

    if (route.startsWith('games/') && route.split('/').length === 2) {
      const gameId = route.split('/')[1]
      
      const db = await getDb()
      const games = db.collection('games')
      
      const game = await games.findOne({ id: gameId })
      
      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404, headers: corsHeaders }
        )
      }
      
      return NextResponse.json(game, { headers: corsHeaders })
    }

    // Debug endpoint for authentication testing
    if (route === 'debug/auth-test') {
      const jwtSecret = process.env.JWT_SECRET
      
      return NextResponse.json({
        jwt_secret_exists: !!jwtSecret,
        jwt_secret_length: jwtSecret?.length,
        jwt_secret_preview: jwtSecret ? jwtSecret.substring(0, 20) + '...' : null,
        node_env: process.env.NODE_ENV,
        test_token_creation: (() => {
          try {
            if (!jwtSecret) return 'No JWT_SECRET'
            
            const testToken = jwt.sign({
              userId: 'debug-test',
              privyId: 'debug-privy',
              email: 'debug@test.com'
            }, jwtSecret, { expiresIn: '1h' })
            
            const decoded = jwt.verify(testToken, jwtSecret)
            
            return {
              token_created: true,
              token_length: testToken.length,
              token_preview: testToken.substring(0, 50) + '...',
              decoded_payload: decoded
            }
          } catch (error) {
            return { error: error.message }
          }
        })()
      }, { headers: corsHeaders })
    }
    if (route === 'leaderboard') {
      const db = await getDb()
      const users = db.collection('users')
      
      const leaderboard = await users.find({})
        .sort({ 'profile.total_winnings': -1 })
        .limit(100)
        .project({
          id: 1,
          username: 1,
          'profile.display_name': 1,
          'profile.total_winnings': 1,
          'profile.stats.games_played': 1,
          'profile.stats.games_won': 1,
          'profile.stats.win_rate': 1
        })
        .toArray()
      
      return NextResponse.json(leaderboard, { headers: corsHeaders })
    }

    // Live statistics endpoints
    if (route === 'stats/live-players') {
      try {
        const db = await getDb()
        const gamesCollection = db.collection('games')
        
        // Count active games or players
        const activeGames = await gamesCollection.countDocuments({
          status: 'active',
          updated_at: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        })
        
        // For now, estimate players as active games * average players per game (e.g., 2)
        const estimatedPlayers = activeGames * 2
        
        return NextResponse.json({
          count: estimatedPlayers,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error fetching live players:', error)
        return NextResponse.json({ count: 0 }, { headers: corsHeaders })
      }
    }

    if (route === 'stats/global-winnings') {
      try {
        const db = await getDb()
        const usersCollection = db.collection('users')
        
        // Sum all user winnings
        const result = await usersCollection.aggregate([
          {
            $group: {
              _id: null,
              totalWinnings: { $sum: '$stats.total_winnings' }
            }
          }
        ]).toArray()
        
        const total = result.length > 0 ? result[0].totalWinnings || 0 : 0
        
        return NextResponse.json({
          total: total,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error fetching global winnings:', error)
        return NextResponse.json({ total: 0 }, { headers: corsHeaders })
      }
    }

    // Social features API endpoints
    if (route === 'users/leaderboard') {
      try {
        const db = await getDb()
        const users = db.collection('users')
        
        // Get top users with real stats, excluding sensitive data
        const leaderboard = await users.find({
          'stats.games_played': { $gt: 0 } // Only users who have played games
        })
        .sort({ 'stats.total_earnings': -1 }) // Sort by earnings by default
        .limit(50)
        .project({
          id: 1,
          custom_name: 1,
          email: 1,
          stats: 1,
          created_at: 1
        })
        .toArray()
        
        return NextResponse.json({
          users: leaderboard
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
        return NextResponse.json({ users: [] }, { headers: corsHeaders })
      }
    }

    if (route === 'users/friends') {
      return requireAuth(async (req) => {
        try {
          const db = await getDb()
          const friends = db.collection('friends')
          const users = db.collection('users')
          
          // Get user's friends list
          const friendsList = await friends.find({
            user_id: req.user.id,
            status: 'accepted'
          }).toArray()
          
          // Get detailed friend information
          const friendIds = friendsList.map(f => f.friend_id)
          const friendsData = await users.find({
            id: { $in: friendIds }
          })
          .project({
            id: 1,
            custom_name: 1,
            email: 1,
            stats: 1,
            online_status: 1,
            last_seen: 1
          })
          .toArray()
          
          return NextResponse.json({
            friends: friendsData
          }, { headers: corsHeaders })
        } catch (error) {
          console.error('Error fetching friends:', error)
          return NextResponse.json({ friends: [] }, { headers: corsHeaders })
        }
      })(request)
    }

    // User search endpoint
    if (route === 'users/search') {
      try {
        const query = url.searchParams.get('q')
        const limit = parseInt(url.searchParams.get('limit')) || 10
        
        if (!query || query.trim().length < 2) {
          return NextResponse.json({
            users: [],
            message: 'Query must be at least 2 characters'
          }, { headers: corsHeaders })
        }
        
        const db = await getDb()
        const users = db.collection('users')
        
        // Search users by custom name or email
        const searchResults = await users.find({
          $or: [
            { custom_name: { $regex: query, $options: 'i' } },
            { 'email': { $regex: query, $options: 'i' } },
            { id: { $regex: query, $options: 'i' } }
          ]
        })
        .limit(parseInt(limit))
        .project({
          id: 1,
          custom_name: 1,
          email: 1,
          stats: 1,
          online_status: 1,
          last_seen: 1,
          created_at: 1
        })
        .toArray()
        
        return NextResponse.json({
          users: searchResults
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Error searching users:', error)
        return NextResponse.json({ users: [] }, { headers: corsHeaders })
      }
    }

    return NextResponse.json(
      { error: 'Endpoint not found' },
      { status: 404, headers: corsHeaders }
    )

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request, { params }) {
  const { path } = params
  
  try {
    const route = path.join('/')
    const body = await request.json()

    // Update user custom name
    if (route === 'users/profile/update-name') {
      console.log('📝 Custom name update request:', body)
      
      const { userId, customName, privyId } = body
      
      if (!userId || !customName) {
        console.log('❌ Missing required fields:', { userId: !!userId, customName: !!customName })
        return NextResponse.json(
          { error: 'Missing userId or customName' },
          { status: 400, headers: corsHeaders }
        )
      }
      
      try {
        console.log('🔍 Attempting to connect to database...')
        const db = await getDb()
        const usersCollection = db.collection('users')
        
        console.log('🔍 Searching for user with:', { userId, privyId })
        
        // First, let's see if the user exists
        const existingUser = await usersCollection.findOne({
          $or: [
            { id: userId },
            { privy_id: privyId },
            { privy_id: userId },
            { id: privyId },
            // Also try email-based matching for Privy users
            ...(userId.includes('@') ? [{ email: userId }] : []),
            ...(privyId && privyId.includes('@') ? [{ email: privyId }] : [])
          ]
        })
        
        console.log('👤 Found existing user:', existingUser ? 'YES' : 'NO')
        
        if (!existingUser) {
          console.log('❌ User not found, creating new user record...')
          
          // Create a new user record if it doesn't exist
          const newUser = {
            id: userId,
            privy_id: privyId || userId,
            email: userId.includes('@') ? userId : null,
            custom_name: customName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            stats: {
              games_played: 0,
              games_won: 0,
              total_winnings: 0
            },
            achievements: [],
            preferences: {
              sound_enabled: true,
              notifications_enabled: true
            }
          }
          
          const insertResult = await usersCollection.insertOne(newUser)
          console.log('✅ New user created:', insertResult.insertedId)
        } else {
          // Update the user's custom name
          const updateResult = await usersCollection.updateOne(
            { _id: existingUser._id },
            { 
              $set: { 
                custom_name: customName,
                updated_at: new Date().toISOString()
              } 
            }
          )
          
          console.log('🔄 User update result:', { 
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount 
          })
        }
        
        console.log('✅ Custom name updated successfully for user:', userId)
        return NextResponse.json({
          success: true,
          message: 'Custom name updated successfully',
          customName: customName
        }, { headers: corsHeaders })
        
      } catch (error) {
        console.error('❌ Error updating custom name:', error)
        console.error('❌ Error stack:', error.stack)
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          code: error.code
        })
        
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // UNIFIED PRIVY AUTHENTICATION - Handles Google OAuth, Email OTP, and Wallet connections
    if (route === 'auth/privy') {
      console.log('🔑 Privy authentication request received')
      
      const { privy_user, access_token } = body || {}
      
      if (!privy_user) {
        console.log('❌ Missing Privy user data in request body:', body)
        return NextResponse.json(
          { error: 'Missing Privy user data' },
          { status: 400, headers: corsHeaders }
        )
      }
      
      try {
        console.log('🔍 Processing Privy authentication for user:', privy_user.id)
        console.log('🔍 Auth method:', privy_user.google ? 'Google OAuth' : privy_user.email ? 'Email OTP' : privy_user.wallet ? 'Wallet' : 'Unknown')
        
        // Extract unified user info from Privy user object
        const privyId = privy_user.id
        let email = null
        let username = null
        let avatar_url = null
        let wallet_address = null
        let auth_method = 'privy'
        
        // Handle Google OAuth authentication
        if (privy_user.google) {
          email = privy_user.google.email
          username = privy_user.google.name || privy_user.google.email?.split('@')[0]
          avatar_url = privy_user.google.picture
          auth_method = 'google'
          console.log('📱 Google OAuth user:', email)
        }
        
        // Handle Email OTP authentication
        if (privy_user.email && !privy_user.google) {
          email = privy_user.email.address
          username = email?.split('@')[0] || `user_${Date.now()}`
          auth_method = 'email'
          console.log('✉️ Email OTP user:', email)
        }
        
        // Handle Wallet authentication (via Privy)
        if (privy_user.wallet) {
          wallet_address = privy_user.wallet.address
          console.log('🔗 Wallet connected:', wallet_address)
          if (!email && !privy_user.google && !privy_user.email) {
            // Wallet-only authentication
            username = `wallet_${wallet_address.slice(0, 8)}`
            auth_method = 'wallet'
            console.log('💰 Wallet-only user:', wallet_address)
          }
        }
        
        // Validate we have enough info to create/find user
        if (!email && !wallet_address && !privyId) {
          throw new Error('Unable to extract user identifier from Privy data')
        }
        
        // Find or create user in MongoDB
        const db = await getDb()
        const users = db.collection('users')
        
        // Search for existing user by multiple identifiers
        let user = await users.findOne({ 
          $or: [
            { privy_id: privyId },
            ...(email ? [{ email }] : []),
            ...(wallet_address ? [{ wallet_address }] : [])
          ].filter(Boolean)
        })
        
        if (!user) {
          // Create new user with unified Privy data
          console.log('👤 Creating new user for Privy ID:', privyId)
          user = {
            id: crypto.randomUUID(),
            privy_id: privyId,
            email,
            username: username || `user_${Date.now()}`,
            wallet_address,
            auth_method,
            profile: {
              avatar_url: avatar_url || null,
              display_name: username || (email ? email.split('@')[0] : 'Anonymous'),
              bio: '',
              total_games: 0,
              total_winnings: 0,
              win_rate: 0,
              favorite_stake: 1,
              achievements: [],
              stats: {
                games_played: 0,
                games_won: 0,
                total_territory_captured: 0,
                best_territory_percent: 0,
                longest_game_duration: 0,
                total_time_played: 0
              }
            },
            preferences: {
              theme: 'dark',
              notifications: true,
              sound_effects: true,
              auto_cash_out: false,
              auto_cash_out_threshold: 50
            },
            created_at: new Date(),
            updated_at: new Date(),
            last_login: new Date(),
            status: 'active'
          }
          
          await users.insertOne(user)
          console.log('✅ New user created via Privy:', user.id)
        } else {
          // Update existing user with latest Privy data
          console.log('🔄 Updating existing user:', user.email || user.wallet_address || user.privy_id)
          await users.updateOne(
            { $or: [{ privy_id: privyId }, { email }, { wallet_address }].filter(Boolean) },
            {
              $set: {
                privy_id: privyId,
                email: email || user.email,
                wallet_address: wallet_address || user.wallet_address,
                auth_method,
                last_login: new Date(),
                updated_at: new Date(),
                'profile.avatar_url': avatar_url || user.profile?.avatar_url,
                'profile.display_name': username || user.profile?.display_name || (email ? email.split('@')[0] : 'Anonymous')
              }
            }
          )
          
          // Refresh user data
          user = await users.findOne({ privy_id: privyId })
          console.log('✅ User updated via Privy')
        }
        
        // Generate unified JWT token
        const jwtToken = jwt.sign(
          {
            userId: user.id,
            privyId: user.privy_id,
            email: user.email,
            username: user.username,
            walletAddress: user.wallet_address,
            authMethod: user.auth_method
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        )
        
        console.log(`🎉 Privy authentication successful - Method: ${auth_method}, User: ${email || wallet_address || privyId}`)
        
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            privy_id: user.privy_id,
            email: user.email,
            username: user.username,
            wallet_address: user.wallet_address,
            profile: user.profile,
            auth_method: user.auth_method
          },
          token: jwtToken
        }, { 
          headers: {
            ...corsHeaders,
            'Set-Cookie': `auth_token=${jwtToken}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
          }
        })
        
      } catch (error) {
        console.error('❌ Privy authentication error:', error.message)
        return NextResponse.json(
          { error: 'Privy authentication failed: ' + error.message },
          { status: 400, headers: corsHeaders }
        )
      }
    }
    // Deprecated authentication endpoints
    if (route === 'auth/google' || route === 'auth/wallet' || route === 'auth/google-callback' || route === 'auth/register') {
      return NextResponse.json(
        { 
          error: 'This authentication method has been deprecated. Please use Privy authentication instead.',
          redirect: 'Use the LOGIN TO PLAY button for unified authentication.'
        },
        { status: 410, headers: corsHeaders }
      )
    }

    // Create user
    if (route === 'users') {
      const user = await createUser(body)
      const { password_hash, ...publicUser } = user
      
      return NextResponse.json(publicUser, { headers: corsHeaders })
    }

    // Create game session
    if (route === 'games') {
      return requireAuth(async (req) => {
        const { stake, game_mode } = body
        
        if (!stake || stake <= 0) {
          return NextResponse.json(
            { error: 'Invalid stake amount' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        const db = await getDb()
        const games = db.collection('games')
        
        const game = {
          id: crypto.randomUUID(),
          player_id: req.user.id,
          stake: parseFloat(stake),
          game_mode: game_mode || 'territory',
          territory_percent: 0,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }
        
        await games.insertOne(game)
        
        return NextResponse.json(game, { headers: corsHeaders })
      })(request)
    }

    // Add funds to game balance
    if (route === 'wallet/add-funds') {
      return requireAuth(async (req) => {
        const { amount, currency, transaction_hash } = body
        
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid deposit amount' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        const minDepositSol = parseFloat(process.env.MIN_DEPOSIT_SOL) || 0.01
        
        if (currency === 'SOL' && amount < minDepositSol) {
          return NextResponse.json(
            { error: `Minimum deposit is ${minDepositSol} SOL` },
            { status: 400, headers: corsHeaders }
          )
        }
        
        if (!transaction_hash) {
          return NextResponse.json(
            { error: 'Transaction hash required' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        const db = await getDb()
        const users = db.collection('users')
        const transactions = db.collection('transactions')
        
        // Check if transaction already processed
        const existingTx = await transactions.findOne({ transaction_hash })
        if (existingTx) {
          return NextResponse.json(
            { error: 'Transaction already processed' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        // Convert to USD for game balance
        const usdAmount = currency === 'SOL' ? amount * 100 : amount // Mock conversion
        
        const transaction = {
          id: crypto.randomUUID(),
          user_id: req.user.id,
          type: 'deposit',
          amount,
          currency,
          usd_amount: usdAmount,
          transaction_hash,
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        }
        
        await transactions.insertOne(transaction)
        
        // Update user balance
        const updateField = currency === 'SOL' ? 'sol_balance' : 'usdc_balance'
        await users.updateOne(
          { 
            $or: [
              { id: req.user.id },
              { privy_id: req.user.privyId }
            ]
          },
          { 
            $inc: { 
              balance: usdAmount,
              [updateField]: amount
            },
            $set: { updated_at: new Date() }
          }
        )
        
        return NextResponse.json({
          success: true,
          transaction_id: transaction.id,
          new_balance: usdAmount,
          message: `Successfully added ${amount} ${currency} to your game balance`
        }, { headers: corsHeaders })
      })(request)
    }

    // Cash out from game balance
    if (route === 'wallet/cash-out') {
      return requireAuth(async (req) => {
        const { amount, currency, recipient_address } = body
        
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid withdrawal amount' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        const minCashoutSol = parseFloat(process.env.MIN_CASHOUT_SOL) || 0.05
        
        if (currency === 'SOL' && amount < minCashoutSol) {
          return NextResponse.json(
            { error: `Minimum cash out is ${minCashoutSol} SOL` },
            { status: 400, headers: corsHeaders }
          )
        }
        
        if (!recipient_address) {
          return NextResponse.json(
            { error: 'Recipient wallet address required' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        const platformFee = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 10
        const feeAmount = (amount * platformFee) / 100
        const netAmount = amount - feeAmount
        
        const db = await getDb()
        const users = db.collection('users')
        const transactions = db.collection('transactions')
        
        // Get user current balance
        const user = await users.findOne({ 
          $or: [
            { id: req.user.id },
            { privy_id: req.user.privyId }
          ]
        })
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404, headers: corsHeaders }
          )
        }
        
        const currentBalance = user.balance || 0
        const usdAmount = currency === 'SOL' ? amount * 100 : amount // Mock conversion
        
        if (currentBalance < usdAmount) {
          return NextResponse.json(
            { error: 'Insufficient balance' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        const transaction = {
          id: crypto.randomUUID(),
          user_id: req.user.id,
          type: 'withdrawal',
          amount,
          currency,
          usd_amount: usdAmount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          recipient_address,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }
        
        await transactions.insertOne(transaction)
        
        // Update user balance (deduct immediately)
        const updateField = currency === 'SOL' ? 'sol_balance' : 'usdc_balance'
        await users.updateOne(
          { 
            $or: [
              { id: req.user.id },
              { privy_id: req.user.privyId }
            ]
          },
          { 
            $inc: { 
              balance: -usdAmount,
              [updateField]: -amount
            },
            $set: { updated_at: new Date() }
          }
        )
        
        return NextResponse.json({
          success: true,
          transaction_id: transaction.id,
          amount_requested: amount,
          platform_fee: feeAmount,
          net_amount: netAmount,
          status: 'pending',
          message: `Cash out request for ${netAmount} ${currency} created successfully. Platform fee: ${feeAmount} ${currency} (${platformFee}%)`
        }, { headers: corsHeaders })
      })(request)
    }

    // TEST ENDPOINT - Create test session for development
    if (route === 'test/create-session') {
      const { userId, email, username } = body
      
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Test endpoints not available in production' },
          { status: 403, headers: corsHeaders }
        )
      }

      try {
        // Create a simple test token (not JWT for now)
        const testToken = Buffer.from(JSON.stringify({
          userId: userId,
          privyId: userId,
          email: { address: email },
          username: username,
          timestamp: Date.now(),
          isTestUser: true
        })).toString('base64')

        return NextResponse.json({
          success: true,
          token: testToken,
          user: {
            id: userId,
            email,
            username
          }
        }, { headers: corsHeaders })
      } catch (error) {
        console.error('Test session error:', error)
        return NextResponse.json(
          { error: 'Failed to create test session: ' + error.message },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Withdrawal request
    if (route === 'withdraw') {
      return requireAuth(async (req) => {
        const { amount } = body
        
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid withdrawal amount' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        const db = await getDb()
        const withdrawals = db.collection('withdrawals')
        
        const withdrawal = {
          id: crypto.randomUUID(),
          user_id: req.user.id,
          wallet_address: req.user.wallet_address,
          amount: parseFloat(amount),
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }
        
        await withdrawals.insertOne(withdrawal)
        
        return NextResponse.json({
          success: true,
          withdrawal_id: withdrawal.id,
          message: `Withdrawal of ${amount} SOL requested successfully`
        }, { headers: corsHeaders })
      })(request)
    }

    // Privy webhook
    if (route === 'onramp/webhook') {
      const signature = request.headers.get('x-privy-signature')
      
      // In production, verify the signature properly
      console.log('Privy webhook received:', body)
      
      const db = await getDb()
      const privyEvents = db.collection('privy_onramp_events')
      
      const event = {
        id: crypto.randomUUID(),
        event_type: body.event_type,
        data: body.data,
        signature,
        processed: false,
        created_at: new Date()
      }
      
      await privyEvents.insertOne(event)
      
      // Process the event based on type
      if (body.event_type === 'fiat_onramp.completed') {
        // Credit user balance or handle successful onramp
        console.log('Onramp completed:', body.data)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully'
      }, { headers: corsHeaders })
    }

    return NextResponse.json(
      { error: 'Endpoint not found' },
      { status: 404, headers: corsHeaders }
    )

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function PUT(request, { params }) {
  const { path } = params
  
  try {
    const route = path.join('/')
    const body = await request.json()

    // Update user profile
    if (route.startsWith('users/') && route.endsWith('/profile')) {
      const userId = route.split('/')[1]
      
      return requireAuth(async (req) => {
        if (req.user.id !== userId) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403, headers: corsHeaders }
          )
        }
        
        const success = await updateUserProfile(userId, body)
        
        if (!success) {
          return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 400, headers: corsHeaders }
          )
        }
        
        return NextResponse.json({
          success: true,
          message: 'Profile updated successfully'
        }, { headers: corsHeaders })
      })(request)
    }

    // Update game progress
    if (route.startsWith('games/')) {
      const gameId = route.split('/')[1]
      
      return requireAuth(async (req) => {
        const db = await getDb()
        const games = db.collection('games')
        
        const game = await games.findOne({ id: gameId, player_id: req.user.id })
        
        if (!game) {
          return NextResponse.json(
            { error: 'Game not found' },
            { status: 404, headers: corsHeaders }
          )
        }
        
        const updateData = {
          ...body,
          updated_at: new Date()
        }
        
        await games.updateOne(
          { id: gameId },
          { $set: updateData }
        )
        
        return NextResponse.json({
          success: true,
          message: 'Game updated successfully'
        }, { headers: corsHeaders })
      })(request)
    }

    return NextResponse.json(
      { error: 'Endpoint not found' },
      { status: 404, headers: corsHeaders }
    )

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  })
}