import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { createUser, authenticateUser, verifyToken, requireAuth, updateUserProfile, getUserStats } from '@/lib/auth'
import { getSolBalance, getTokenAccounts } from '@/lib/solana'

const JWT_SECRET = process.env.JWT_SECRET || 'turfloot-secret-key-change-in-production'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

console.log('🔑 Google Client ID loaded:', GOOGLE_CLIENT_ID ? 'YES' : 'NO')

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

    // Blockchain routes
    if (route.startsWith('wallet/')) {
      const walletAddress = route.split('/')[1]
      
      if (route.endsWith('/balance')) {
        const balance = await getSolBalance(walletAddress)
        return NextResponse.json({
          wallet_address: walletAddress,
          sol_balance: balance,
          usd_value: balance * 210, // Approximate SOL price
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
      
      if (route.endsWith('/tokens')) {
        const tokens = await getTokenAccounts(walletAddress)
        return NextResponse.json({
          wallet_address: walletAddress,
          tokens,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
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

    // Leaderboard routes
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
    if (route === 'auth/google' || route === 'auth/wallet' || route === 'auth/google-callback') {
      return NextResponse.json(
        { 
          error: 'This authentication method has been deprecated. Please use Privy authentication instead.',
          redirect: 'Use the LOGIN TO PLAY button for unified authentication.'
        },
        { status: 410, headers: corsHeaders }
      )
    }
        
        // Generate JWT token for consistent auth system
        const jwtToken = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            username: user.username,
            google_id: googleId,
            auth_method: 'google'
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        )
        
        console.log('🎉 Google authentication successful for:', email)
        
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile: user.profile,
            auth_method: 'google'
          },
          token: jwtToken
        }, { 
          headers: {
            ...corsHeaders,
            'Set-Cookie': `auth_token=${jwtToken}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
          }
        })
        
      } catch (error) {
        console.error('❌ Google authentication error:', error.message)
        return NextResponse.json(
          { error: 'Google authentication failed: ' + error.message },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Privy authentication endpoint
    if (route === 'auth/privy') {
      console.log('🔑 Privy auth request received')
      
      const { access_token, privy_user } = body || {}
      
      if (!access_token) {
        console.log('❌ Missing Privy access token in request body:', body)
        return NextResponse.json(
          { error: 'Missing Privy access token' },
          { status: 400, headers: corsHeaders }
        )
      }
      
      if (!privy_user) {
        console.log('❌ Missing Privy user data in request body:', body)
        return NextResponse.json(
          { error: 'Missing Privy user data' },
          { status: 400, headers: corsHeaders }
        )
      }
      
      try {
        console.log('🔍 Processing Privy authentication for user:', privy_user.id)
        
        // Extract user info from Privy user object
        const privyId = privy_user.id
        const email = privy_user.email?.address || 
                     privy_user.google?.email || 
                     privy_user.twitter?.email
        const name = privy_user.google?.name || 
                    privy_user.twitter?.name || 
                    privy_user.email?.address?.split('@')[0] ||
                    `user_${Date.now()}`
        const picture = privy_user.google?.picture || 
                       privy_user.twitter?.profilePictureUrl
        
        if (!email && !privyId) {
          throw new Error('Unable to extract user identifier from Privy data')
        }
        
        // Find or create user in MongoDB
        const db = await getDb()
        const users = db.collection('users')
        
        let user = await users.findOne({ 
          $or: [
            { email: email },
            { privy_id: privyId },
            ...(email ? [{ email }] : [])
          ].filter(Boolean)
        })
        
        if (!user) {
          // Create new user with Privy data
          console.log('👤 Creating new user for Privy user:', privyId)
          user = {
            id: crypto.randomUUID(),
            email,
            username: name || `privy_user_${Date.now()}`,
            privy_id: privyId,
            wallet_address: privy_user.wallet?.address || null,
            profile: {
              avatar_url: picture || null,
              display_name: name || (email ? email.split('@')[0] : 'Anonymous'),
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
            auth_method: 'privy',
            created_at: new Date(),
            updated_at: new Date(),
            last_login: new Date(),
            status: 'active'
          }
          
          await users.insertOne(user)
          console.log('✅ New Privy user created:', user.id)
        } else {
          // Update existing user
          console.log('🔄 Updating existing Privy user:', user.email || user.privy_id)
          await users.updateOne(
            { $or: [{ email }, { privy_id: privyId }].filter(Boolean) },
            {
              $set: {
                privy_id: privyId,
                last_login: new Date(),
                updated_at: new Date(),
                wallet_address: privy_user.wallet?.address || user.wallet_address,
                'profile.avatar_url': picture || user.profile?.avatar_url,
                'profile.display_name': name || user.profile?.display_name || (email ? email.split('@')[0] : 'Anonymous')
              }
            }
          )
          console.log('✅ Privy user updated')
        }
        
        // Generate JWT token for consistent auth system
        const jwtToken = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            username: user.username,
            privy_id: privyId,
            auth_method: 'privy'
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        )
        
        console.log('🎉 Privy authentication successful for:', email || privyId)
        
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile: user.profile,
            auth_method: 'privy',
            wallet_address: user.wallet_address
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

    // Legacy Google callback endpoint (to be removed)
    if (route === 'auth/google-callback') {
      return NextResponse.json(
        { error: 'This endpoint is deprecated. Use /api/auth/google instead.' },
        { status: 410, headers: corsHeaders }
      )
    }

    if (route === 'auth/register') {
      const user = await createUser(body)
      const { password_hash, ...publicUser } = user
      
      return NextResponse.json({
        success: true,
        user: publicUser
      }, { headers: corsHeaders })
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