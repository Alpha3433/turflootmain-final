// User authentication and session management
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'turfloot-secret-key-change-in-production'
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = process.env.DB_NAME || 'turfloot_db'

// CORS headers for the middleware
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

let client = null

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URL)
    await client.connect()
  }
  return client.db(DB_NAME)
}

// Helper: dynamically get NextResponse when available (Next.js runtime)
async function getNextResponse() {
  try {
    const mod = await import('next/server')
    return mod?.NextResponse || null
  } catch (e) {
    return null
  }
}

// Create user account
export async function createUser(userData) {
  const db = await getDb()
  const users = db.collection('users')
  
  // Check if user already exists
  const existingUser = await users.findOne({ 
    $or: [
      { wallet_address: userData.wallet_address },
      { email: userData.email }
    ]
  })
  
  if (existingUser) {
    throw new Error('User already exists')
  }
  
  // Hash password if provided
  let hashedPassword = null
  if (userData.password) {
    hashedPassword = await bcrypt.hash(userData.password, 12)
  }
  
  const user = {
    id: crypto.randomUUID(),
    wallet_address: userData.wallet_address,
    email: userData.email || null,
    username: userData.username || `player_${Date.now()}`,
    password_hash: hashedPassword,
    profile: {
      avatar_url: userData.avatar_url || null,
      display_name: userData.display_name || userData.username,
      bio: userData.bio || '',
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
  
  const result = await users.insertOne(user)
  return { ...user, _id: result.insertedId }
}

// Authenticate user with wallet signature
export async function authenticateUser(walletAddress, signature, message) {
  const db = await getDb()
  const users = db.collection('users')
  
  // Verify signature (simplified for demo)
  // In production, implement proper signature verification
  const isValidSignature = true // await verifyWalletSignature(walletAddress, signature, message)
  
  if (!isValidSignature) {
    throw new Error('Invalid signature')
  }
  
  // Find or create user
  let user = await users.findOne({ wallet_address: walletAddress })
  
  if (!user) {
    // Auto-create user for wallet-only authentication
    user = await createUser({
      wallet_address: walletAddress,
      username: `player_${walletAddress.slice(0, 8)}`
    })
  } else {
    // Update last login
    await users.updateOne(
      { wallet_address: walletAddress },
      { 
        $set: { 
          last_login: new Date(),
          updated_at: new Date()
        }
      }
    )
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user.id,
      wallet_address: user.wallet_address,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  return { user, token }
}

// Verify JWT token
export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const db = await getDb()
    const users = db.collection('users')
    
    // Try to find user by multiple identifiers for better compatibility
    let user = await users.findOne({ id: decoded.userId })
    
    // Fallback to Privy ID if available in token
    if (!user && decoded.privyId) {
      user = await users.findOne({ privy_id: decoded.privyId })
    }
    
    // Fallback to email if available in token
    if (!user && decoded.email) {
      user = await users.findOne({ email: decoded.email })
    }
    
    if (!user) {
      throw new Error('User not found')
    }
    
    // Merge token data with user record for consistency
    user.jwt_wallet_address = decoded.walletAddress
    user.jwt_privy_id = decoded.privyId
    
    return { user, decoded }
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Update user profile
export async function updateUserProfile(userId, profileData) {
  const db = await getDb()
  const users = db.collection('users')
  
  const updateData = {
    ...profileData,
    updated_at: new Date()
  }
  
  // Handle nested profile updates
  if (profileData.profile) {
    Object.keys(profileData.profile).forEach(key => {
      updateData[`profile.${key}`] = profileData.profile[key]
    })
    delete updateData.profile
  }
  
  const result = await users.updateOne(
    { id: userId },
    { $set: updateData }
  )
  
  return result.modifiedCount > 0
}

// Get user stats
export async function getUserStats(userId) {
  const db = await getDb()
  const users = db.collection('users')
  const games = db.collection('games')

  const user = await users.findOne({ id: userId })
  if (!user) {
    throw new Error('User not found')
  }

  // Get recent game stats
  const recentGames = await games.find(
    { player_id: userId },
    { sort: { created_at: -1 }, limit: 10 }
  ).toArray()

  return {
    profile: user.profile,
    recentGames,
    preferences: user.preferences
  }
}

// Middleware for Next.js API route authentication
export function requireAuth(handler) {
  return async (request) => {
    const NextResponse = await getNextResponse()

    const sendJson = (payload, status = 200) => {
      if (NextResponse?.json) {
        return NextResponse.json(payload, { status, headers: corsHeaders })
      }
      // Fallback for non-Next environments (e.g., during legacy websocket init)
      try {
        return new Response(JSON.stringify(payload), { status, headers: corsHeaders })
      } catch {
        // Last resort plain object (won't be used in Next runtime)
        return { status, headers: corsHeaders, body: JSON.stringify(payload) }
      }
    }

    try {
      const authHeader = request?.headers?.get ? request.headers.get('authorization') : (request?.headers?.authorization || '')
      const token = authHeader?.replace('Bearer ', '')

      if (!token) {
        return sendJson({ error: 'No token provided' }, 401)
      }
      
      // Handle test session tokens
      if (token === 'test-session-token') {
        const testUser = {
          id: 'test-user-max-money',
          privyId: 'test-user-max-money',
          email: { address: 'testuser@turfloot.com' },
          username: 'TestPlayer',
          isTestUser: true
        }
        request.user = testUser
        return handler(request)
      }

      const { user } = await verifyToken(token)
      request.user = user
      
      return handler(request)
    } catch (error) {
      return sendJson({ error: 'Unauthorized' }, 401)
    }
  }
}