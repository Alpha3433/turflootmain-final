import { NextResponse } from 'next/server'

export async function GET(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  try {
    console.log('🎯 WALLET TRANSACTIONS ENDPOINT REACHED!')
    
    // Get Authorization header
    const authHeader = request.headers.get('authorization')
    let token = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    
    console.log('🔍 Wallet transactions request - Token present:', !!token)
    
    // For now, return empty transactions array since we're in testing phase
    // In production, this would fetch real blockchain transactions using Helius API
    const transactionsResponse = {
      transactions: [],
      total_count: 0,
      wallet_address: 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG', // Default for testing
      timestamp: new Date().toISOString()
    }
    
    console.log('📊 Returning transactions data:', transactionsResponse)
    return NextResponse.json(transactionsResponse, { headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Error in wallet transactions endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      transactions: [],
      total_count: 0
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