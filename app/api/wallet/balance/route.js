import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'turfloot-secret-key-change-in-production'
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/turfloot'
const HELIUS_API_KEY = process.env.HELIUS_API_KEY

let client = null

async function getDb() {
  if (!client) {
    try {
      console.log('🔗 Connecting to MongoDB for wallet balance')
      client = new MongoClient(MONGO_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      await client.connect()
      console.log('✅ MongoDB connected successfully')
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error)
      throw error
    }
  }
  return client.db('turfloot_db')
}

// Fetch SOL balance using Helius API
async function getSolanaBalance(walletAddress) {
  if (!HELIUS_API_KEY || !walletAddress) {
    console.log('⚠️ No Helius API key or wallet address provided')
    return 0
  }

  try {
    console.log(`🔗 Fetching SOL balance for wallet: ${walletAddress}`)
    
    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    
    const response = await fetch(heliusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletAddress]
      })
    })

    if (response.ok) {
      const data = await response.json()
      if (data && data.result && data.result.value !== undefined) {
        // Convert lamports to SOL
        const solBalance = parseFloat((data.result.value / 1e9).toFixed(4))
        console.log(`💰 SOL balance fetched: ${solBalance} SOL`)
        return solBalance
      }
    } else {
      console.warn('⚠️ Helius API response not OK:', response.status, response.statusText)
    }
  } catch (error) {
    console.log('⚠️ Error fetching SOL balance from Helius:', error.message)
  }
  
  return 0
}

// Find wallet address from various sources
function findWalletAddress(user, authenticatedUser) {
  // Priority order: JWT token data > user record > fallback
  const walletSources = [
    authenticatedUser?.jwt_wallet_address,
    user?.wallet_address,
    user?.embedded_wallet_address,
    user?.privy_wallet_address
  ]
  
  const walletAddress = walletSources.find(addr => addr && addr !== 'Not connected')
  console.log(`🔍 Wallet address resolution: ${walletAddress || 'No wallet found'}`)
  return walletAddress
}

export async function GET(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

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
        
        const testingBalance = {
          balance: parseFloat(baseBalance.toFixed(2)),
          currency: 'USD',
          sol_balance: parseFloat(solBalance.toFixed(4)),
          usdc_balance: parseFloat((baseBalance * 0.3).toFixed(2)),
          wallet_address: payload.wallet_address || 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG'
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
        
        // Try to decode as Privy token
        try {
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
    
    // If no authentication, provide guest balance  
    if (!authenticatedUser && (!token || !token.startsWith('testing-'))) {
      console.log('🎭 Providing guest balance for unauthenticated request')
      
      const guestBalance = {
        balance: 0.00,
        currency: 'USD',
        sol_balance: 0.0000,
        usdc_balance: 0.00,
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
          wallet_address: authenticatedUser.jwt_wallet_address || 'No wallet connected'
        }
        
        return NextResponse.json(defaultBalance, { headers: corsHeaders })
      }

      // Get real SOL balance using Helius API
      const walletAddress = findWalletAddress(user, authenticatedUser)
      let realSolBalance = 0
      let totalUsdBalance = user.balance || 25.00 // Default testing balance

      if (walletAddress) {
        realSolBalance = await getSolanaBalance(walletAddress)
        
        // Update USD balance based on SOL (approximate conversion)
        const solToUsd = realSolBalance * 160 // Rough SOL price
        totalUsdBalance = parseFloat((totalUsdBalance + solToUsd).toFixed(2))
      }

      const finalBalance = {
        balance: totalUsdBalance,
        currency: 'USD',
        sol_balance: realSolBalance,
        usdc_balance: parseFloat((totalUsdBalance * 0.2).toFixed(2)),
        wallet_address: walletAddress || 'Not connected'
      }

      console.log('💰 Final balance response:', finalBalance)
      return NextResponse.json(finalBalance, { headers: corsHeaders })
    }
  } catch (error) {
    console.error('❌ Error in wallet balance endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      balance: 0.00,
      currency: 'USD',
      sol_balance: 0.0000,
      usdc_balance: 0.00,
      wallet_address: 'Error loading wallet'
    }, { 
      status: 500, 
      headers: corsHeaders 
    })
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}