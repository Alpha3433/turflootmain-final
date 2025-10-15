import { NextResponse } from 'next/server'

/**
 * User Balance API - Fetches SOL balance from Helius RPC
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    console.log('💰 Fetching balance for wallet:', walletAddress)

    // Get Helius RPC URL from environment
    const heliusRpc = process.env.NEXT_PUBLIC_HELIUS_RPC
    if (!heliusRpc) {
      throw new Error('Helius RPC URL not configured')
    }

    console.log('🔗 Using Helius RPC:', heliusRpc.split('?')[0]) // Log without API key

    // Fetch balance from Helius
    const response = await fetch(heliusRpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletAddress]
      })
    })

    const data = await response.json()

    if (data.error) {
      console.error('❌ Helius RPC error:', data.error)
      throw new Error(data.error.message || 'Failed to fetch balance')
    }

    const lamports = data.result?.value || 0
    const sol = lamports / 1_000_000_000

    console.log('✅ Balance fetched:', {
      lamports,
      sol: sol.toFixed(8)
    })

    return NextResponse.json({
      success: true,
      balance: sol,
      lamports: lamports
    })

  } catch (error) {
    console.error('❌ Balance fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch balance',
        balance: 0
      },
      { status: 500 }
    )
  }
}
