import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Verify Privy webhook signature
function verifyPrivySignature(payload, signature, secret) {
  // TODO: Implement proper HMAC-SHA256 verification
  const crypto = require('crypto');
  
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.log('[PRIVY] Signature verification error:', error);
    return true; // Allow for development - TODO: Change in production
  }
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ 
        message: "TurfLoot API v1.0",
        service: "Skill-based crypto land battles" 
      }))
    }

    // GET /api/pots - Returns current game pot values
    if (route === '/pots' && method === 'GET') {
      const pots = [
        { table: '$1', pot: 24.50, players: 8 },
        { table: '$5', pot: 87.25, players: 12 },
        { table: '$20', pot: 340.00, players: 15 }
      ]
      
      return handleCORS(NextResponse.json(pots))
    }

    // POST /api/withdraw - Handle SOL cash-out requests
    if (route === '/withdraw' && method === 'POST') {
      const body = await request.json()
      
      if (!body.wallet_address || !body.amount) {
        return handleCORS(NextResponse.json(
          { error: "wallet_address and amount are required" }, 
          { status: 400 }
        ))
      }

      // TODO: Implement Solana Anchor program call
      const withdrawalId = uuidv4()
      const withdrawal = {
        id: withdrawalId,
        wallet_address: body.wallet_address,
        amount: body.amount,
        status: 'pending',
        timestamp: new Date(),
        tx_hash: null // Will be populated after blockchain transaction
      }

      await db.collection('withdrawals').insertOne(withdrawal)
      
      // Simulate withdrawal processing (TODO: Replace with real Solana transaction)
      console.log(`[SOLANA] Processing withdrawal: ${body.amount} SOL to ${body.wallet_address}`)
      
      return handleCORS(NextResponse.json({
        message: "Withdrawal request submitted",
        withdrawal_id: withdrawalId,
        status: "pending"
      }))
    }

    // POST /api/onramp/webhook - Transak webhook handler
    if (route === '/onramp/webhook' && method === 'POST') {
      const body = await request.text()
      const signature = request.headers.get('x-transak-signature')
      
      if (!verifyTransakSignature(body, signature, process.env.TRANSAK_SECRET)) {
        return handleCORS(NextResponse.json(
          { error: "Invalid signature" }, 
          { status: 401 }
        ))
      }

      const webhookData = JSON.parse(body)
      console.log('[TRANSAK] Webhook processed:', webhookData)
      
      // TODO: Credit user balance based on webhook data
      const webhookRecord = {
        id: uuidv4(),
        event_type: webhookData.eventType,
        user_id: webhookData.userData?.id,
        amount: webhookData.cryptoAmount,
        currency: webhookData.cryptoCurrency,
        status: webhookData.status,
        timestamp: new Date(),
        raw_data: webhookData
      }

      await db.collection('onramp_events').insertOne(webhookRecord)
      
      return handleCORS(NextResponse.json({ message: "Webhook processed" }))
    }

    // POST /api/users - Create or update user profile
    if (route === '/users' && method === 'POST') {
      const body = await request.json()
      
      if (!body.wallet_address) {
        return handleCORS(NextResponse.json(
          { error: "wallet_address is required" }, 
          { status: 400 }
        ))
      }

      const existingUser = await db.collection('users').findOne({
        wallet_address: body.wallet_address
      })

      if (existingUser) {
        return handleCORS(NextResponse.json(existingUser))
      }

      const newUser = {
        id: uuidv4(),
        wallet_address: body.wallet_address,
        balance_sol: 0,
        total_winnings: 0,
        games_played: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      await db.collection('users').insertOne(newUser)
      return handleCORS(NextResponse.json(newUser))
    }

    // GET /api/users/:wallet - Get user profile
    if (route.startsWith('/users/') && method === 'GET') {
      const walletAddress = route.split('/')[2]
      
      const user = await db.collection('users').findOne({
        wallet_address: walletAddress
      })

      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json(user))
    }

    // POST /api/games - Create new game session
    if (route === '/games' && method === 'POST') {
      const body = await request.json()
      
      if (!body.wallet_address || !body.stake_amount) {
        return handleCORS(NextResponse.json(
          { error: "wallet_address and stake_amount are required" }, 
          { status: 400 }
        ))
      }

      const gameSession = {
        id: uuidv4(),
        wallet_address: body.wallet_address,
        stake_amount: body.stake_amount,
        territory_percent: 0,
        status: 'active',
        started_at: new Date(),
        ended_at: null,
        final_winnings: null
      }

      await db.collection('games').insertOne(gameSession)
      return handleCORS(NextResponse.json(gameSession))
    }

    // PUT /api/games/:id - Update game progress
    if (route.startsWith('/games/') && method === 'PUT') {
      const gameId = route.split('/')[2]
      const body = await request.json()
      
      const updateData = {
        ...body,
        updated_at: new Date()
      }

      const result = await db.collection('games').updateOne(
        { id: gameId },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Game not found" }, 
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ message: "Game updated successfully" }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute