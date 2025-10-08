import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'turfloot-secret-key-change-in-production'
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/turfloot'
const HELIUS_API_KEY =
  process.env.HELIUS_API_KEY ||
  process.env.NEXT_PUBLIC_HELIUS_API_KEY ||
  process.env.HELIUS_RPC_API_KEY ||
  '9ce7937c-f2a5-4759-8d79-dd8f9ca63fa5'
const HELIUS_REST_BASE = process.env.HELIUS_REST_BASE || 'https://api.helius.xyz/v0'

let client = null

async function getDb() {
  if (!client) {
    try {
      console.log('🔗 Connecting to MongoDB for wallet transactions')
      client = new MongoClient(MONGO_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      await client.connect()
      console.log('✅ MongoDB connected successfully for transactions')
    } catch (error) {
      console.error('❌ MongoDB connection failed for transactions:', error)
      throw error
    }
  }
  return client.db('turfloot_db')
}

function decodeTestingToken(token) {
  try {
    const encoded = token.substring(8)
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'))
    console.log('🧪 Testing token payload (transactions):', payload)
    return payload
  } catch (error) {
    console.error('❌ Error parsing testing token for transactions:', error)
    return null
  }
}

function decodeAuthToken(token) {
  if (!token) {
    return { type: 'guest' }
  }

  if (token.startsWith('testing-')) {
    const payload = decodeTestingToken(token)
    if (!payload) {
      return { type: 'guest' }
    }
    return { type: 'testing', payload }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log('✅ JWT authenticated user for transactions:', decoded.userId || decoded.id)
    return { type: 'jwt', user: decoded }
  } catch (jwtError) {
    console.log('⚠️ JWT verification failed for transactions, checking Privy token:', jwtError.message)

    try {
      const base64Payload = token.split('.')[1]
      if (!base64Payload) {
        throw new Error('Invalid Privy token format')
      }

      const decoded = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'))
      console.log('🔍 Privy token payload (transactions):', {
        userId: decoded.sub,
        email: decoded.email,
        walletAddress: decoded.wallet?.address,
      })

      const authenticatedUser = {
        id: decoded.sub,
        privy_id: decoded.sub,
        email: decoded.email,
        jwt_wallet_address: decoded.wallet?.address,
        isPrivyAuth: true,
      }

      console.log('✅ Privy token authenticated for transactions:', authenticatedUser.id)
      return { type: 'privy', user: authenticatedUser }
    } catch (privyError) {
      console.log('⚠️ Privy token parsing also failed for transactions:', privyError.message)
      return { type: 'guest' }
    }
  }
}

function findWalletAddress(user, authenticatedUser) {
  const walletSources = [
    authenticatedUser?.jwt_wallet_address,
    user?.wallet_address,
    user?.embedded_wallet_address,
    user?.privy_wallet_address,
  ]

  const walletAddress = walletSources.find((addr) => addr && addr !== 'Not connected')
  console.log(`🔍 Wallet address resolution (transactions): ${walletAddress || 'No wallet found'}`)
  return walletAddress
}

function buildTestingTransactions(payload) {
  const walletAddress = payload.wallet_address || 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG'
  const now = Date.now()

  return [
    {
      signature: 'TEST-HELIUS-IN-1',
      description: 'Test SOL deposit',
      timestamp: new Date(now - 60_000).toISOString(),
      sol_amount: 0.25,
      usd_amount: 40.0,
      direction: 'incoming',
      status: 'confirmed',
      source: 'testing',
    },
    {
      signature: 'TEST-HELIUS-OUT-1',
      description: 'Test SOL withdrawal',
      timestamp: new Date(now - 120_000).toISOString(),
      sol_amount: 0.1,
      usd_amount: 16.0,
      direction: 'outgoing',
      status: 'confirmed',
      source: 'testing',
    },
  ].map((tx, index) => ({
    ...tx,
    index,
    wallet_address: walletAddress,
  }))
}

function lamportsToSol(lamports) {
  return parseFloat(((lamports || 0) / 1e9).toFixed(6))
}

function normaliseHeliusTransactions(rawTransactions, walletAddress) {
  if (!Array.isArray(rawTransactions)) {
    return []
  }

  const lowerWallet = walletAddress.toLowerCase()

  return rawTransactions.map((tx, index) => {
    const nativeTransfers = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : []

    const netLamports = nativeTransfers.reduce((total, transfer) => {
      const amount = Number(transfer.amount || 0)
      if (!amount) {
        return total
      }

      const toAddress = (transfer.toUserAccount || transfer.to || '').toLowerCase()
      const fromAddress = (transfer.fromUserAccount || transfer.from || '').toLowerCase()

      if (toAddress === lowerWallet) {
        return total + amount
      }
      if (fromAddress === lowerWallet) {
        return total - amount
      }

      return total
    }, 0)

    const solAmount = lamportsToSol(Math.abs(netLamports))
    const direction = netLamports >= 0 ? 'incoming' : 'outgoing'
    const usdAmount = parseFloat((solAmount * 160).toFixed(2))
    const timestamp = tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString()

    return {
      signature: tx.signature,
      description: tx.description || tx.type || 'Solana transaction',
      timestamp,
      sol_amount: solAmount,
      usd_amount: usdAmount,
      direction,
      status: tx.status || 'confirmed',
      source: 'helius',
      nativeTransfers,
      index,
    }
  })
}

async function fetchHeliusTransactions(walletAddress) {
  if (!HELIUS_API_KEY || !walletAddress) {
    console.log('⚠️ Missing Helius API key or wallet address for transactions')
    return []
  }

  try {
    const heliusUrl = `${HELIUS_REST_BASE}/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=20`
    console.log('🌐 Fetching Helius transactions from:', heliusUrl)

    const response = await fetch(heliusUrl, { method: 'GET' })
    if (!response.ok) {
      console.warn('⚠️ Helius transactions response not OK:', response.status, response.statusText)
      return []
    }

    const data = await response.json()
    const normalised = normaliseHeliusTransactions(data, walletAddress)
    console.log(`✅ Retrieved ${normalised.length} Helius transactions for wallet ${walletAddress}`)
    return normalised
  } catch (error) {
    console.error('❌ Error fetching transactions from Helius:', error)
    return []
  }
}

export async function GET(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null

    console.log('🔍 Wallet transactions request - Token present:', !!token)

    const authInfo = decodeAuthToken(token)

    if (authInfo.type === 'testing') {
      const transactions = buildTestingTransactions(authInfo.payload)
      const responsePayload = {
        transactions,
        total_count: transactions.length,
        wallet_address: transactions[0]?.wallet_address || authInfo.payload.wallet_address,
        helius_enabled: true,
        privy_authenticated: false,
        timestamp: new Date().toISOString(),
        source: 'testing',
      }

      console.log('🧪 Returning testing transactions response:', responsePayload)
      return NextResponse.json(responsePayload, { headers: corsHeaders })
    }

    if (authInfo.type === 'guest') {
      console.log('🎭 Guest request for transactions - returning empty list')
      return NextResponse.json({
        transactions: [],
        total_count: 0,
        wallet_address: 'Not connected',
        helius_enabled: !!HELIUS_API_KEY,
        privy_authenticated: false,
        timestamp: new Date().toISOString(),
      }, { headers: corsHeaders })
    }

    const authenticatedUser = authInfo.user
    const db = await getDb()
    const users = db.collection('users')

    const user = await users.findOne({
      $or: [
        { id: authenticatedUser.id },
        { privy_id: authenticatedUser.privy_id || authenticatedUser.id },
      ],
    })

    const walletAddress = findWalletAddress(user, authenticatedUser)

    if (!walletAddress) {
      console.log('⚠️ No wallet address found for authenticated user - returning empty transactions')
      return NextResponse.json({
        transactions: [],
        total_count: 0,
        wallet_address: 'Not connected',
        helius_enabled: !!HELIUS_API_KEY,
        privy_authenticated: Boolean(authenticatedUser?.isPrivyAuth),
        timestamp: new Date().toISOString(),
      }, { headers: corsHeaders })
    }

    const transactions = await fetchHeliusTransactions(walletAddress)

    const responsePayload = {
      transactions,
      total_count: transactions.length,
      wallet_address: walletAddress,
      helius_enabled: !!HELIUS_API_KEY,
      privy_authenticated: Boolean(authenticatedUser?.isPrivyAuth),
      timestamp: new Date().toISOString(),
      source: transactions.length ? 'helius' : 'helius-empty',
    }

    console.log('📊 Returning transactions data:', responsePayload)
    return NextResponse.json(responsePayload, { headers: corsHeaders })
  } catch (error) {
    console.error('❌ Error in wallet transactions endpoint:', error)
    return NextResponse.json({
      error: 'Internal Server Error',
      transactions: [],
      total_count: 0,
    }, {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
