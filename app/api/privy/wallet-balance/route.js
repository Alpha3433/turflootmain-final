import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { walletAddress, walletId } = await request.json()
    
    if (!walletAddress || !walletId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing walletAddress or walletId' 
      }, { status: 400 })
    }
    
    console.log('🔍 Privy REST API balance check for wallet:', walletId, 'address:', walletAddress)
    
    // Privy REST API configuration
    const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
    const privyAppSecret = process.env.PRIVY_APP_SECRET
    
    if (!privyAppId || !privyAppSecret) {
      console.error('❌ Missing Privy credentials')
      return NextResponse.json({ 
        success: false, 
        error: 'Privy credentials not configured' 
      }, { status: 500 })
    }
    
    // Use Privy's official RPC endpoint for getting wallet balance
    const privyApiUrl = `https://api.privy.io/v1/wallets/${walletId}/rpc`
    
    const privyResponse = await fetch(privyApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${privyAppId}:${privyAppSecret}`).toString('base64')}`,
        'privy-app-id': privyAppId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'getBalance',
        network: 'MAINNET' // Solana mainnet
      })
    })
    
    if (!privyResponse.ok) {
      const errorText = await privyResponse.text()
      console.error('❌ Privy API error:', privyResponse.status, errorText)
      return NextResponse.json({ 
        success: false, 
        error: `Privy API error: ${privyResponse.status}` 
      }, { status: 500 })
    }
    
    const privyData = await privyResponse.json()
    console.log('📊 Privy API response:', privyData)
    
    // Parse Solana balance from Privy response
    if (privyData && privyData.balance) {
      const lamports = parseFloat(privyData.balance) || 0
      const solBalance = lamports / 1_000_000_000 // Convert to SOL
      
      console.log('✅ Privy REST API balance:', solBalance, 'SOL')
      
      return NextResponse.json({
        success: true,
        balance: solBalance,
        lamports: lamports,
        walletId,
        walletAddress
      })
    } else {
      console.log('⚠️ No balance data in Privy response')
      return NextResponse.json({
        success: true,
        balance: 0,
        lamports: 0,
        walletId,
        walletAddress
      })
    }
    
  } catch (error) {
    console.error('❌ Privy wallet balance API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}