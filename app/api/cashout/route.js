import { NextResponse } from 'next/server'

/**
 * Cash-out API - Sends SOL from platform wallet to user's wallet
 * Takes 10% platform fee and sends remaining 90% to user
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { userWalletAddress, cashOutValueUSD, privyUserId, playerName, prepareOnly } = body

    // Validate required fields
    if (!userWalletAddress || !cashOutValueUSD || !privyUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('💰 Cash-out request:', {
      user: playerName || privyUserId,
      wallet: userWalletAddress,
      amount: `$${cashOutValueUSD.toFixed(2)}`
    })

    // NO platform fee on cashout - user gets 100% of their balance
    const payoutUSD = cashOutValueUSD

    console.log('💵 Cashout amount:', {
      userBalance: `$${cashOutValueUSD.toFixed(2)}`,
      payout: `$${payoutUSD.toFixed(2)} (100% - no fee on cashout)`
    })

    // Convert USD to SOL using the same rate as transactions
    const USD_PER_SOL = 18.18
    const payoutSOL = payoutUSD / USD_PER_SOL
    const lamportsToSend = Math.floor(payoutSOL * 1_000_000_000)

    console.log('🔄 SOL conversion:', {
      usdAmount: `$${payoutUSD.toFixed(2)}`,
      solAmount: payoutSOL.toFixed(8),
      lamports: lamportsToSend,
      rateUsed: `$${USD_PER_SOL}/SOL`
    })

    // Import Solana libraries
    const { Connection, PublicKey, Transaction, SystemProgram, Keypair } = await import('@solana/web3.js')
    const bs58 = await import('bs58')

    // Get platform wallet private key from environment
    const platformPrivateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY
    if (!platformPrivateKey) {
      throw new Error('Platform wallet private key not configured')
    }

    // Create connection to Helius RPC
    const heliusRpc = process.env.NEXT_PUBLIC_HELIUS_RPC
    const connection = new Connection(heliusRpc, 'confirmed')

    // Load platform wallet keypair
    const platformKeypair = Keypair.fromSecretKey(bs58.default.decode(platformPrivateKey))
    const platformWallet = platformKeypair.publicKey
    
    console.log('🏦 Platform wallet:', platformWallet.toBase58())

    // Check platform wallet balance
    const platformBalance = await connection.getBalance(platformWallet)
    const platformBalanceSOL = platformBalance / 1_000_000_000

    console.log('💰 Platform wallet balance:', platformBalanceSOL.toFixed(8), 'SOL')

    // Check if platform wallet has enough balance
    const RENT_EXEMPT_MINIMUM = 890880 // lamports
    const TRANSACTION_FEE = 5000 // lamports
    const requiredBalance = lamportsToSend + RENT_EXEMPT_MINIMUM + TRANSACTION_FEE

    if (platformBalance < requiredBalance) {
      const shortfall = (requiredBalance - platformBalance) / 1_000_000_000
      throw new Error(
        `Insufficient platform wallet balance. Need ${(requiredBalance / 1_000_000_000).toFixed(8)} SOL, ` +
        `have ${platformBalanceSOL.toFixed(8)} SOL. Shortfall: ${shortfall.toFixed(8)} SOL`
      )
    }

    // Create transfer instruction
    const userPubkey = new PublicKey(userWalletAddress)
    
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: platformWallet,
      toPubkey: userPubkey,
      lamports: lamportsToSend
    })

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed')

    // Create and sign transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: platformWallet
    }).add(transferInstruction)

    // Sign transaction with platform wallet
    transaction.sign(platformKeypair)

    // If prepareOnly flag is set, return the serialized transaction for Privy
    if (prepareOnly) {
      const serializedTransaction = transaction.serialize().toString('base64')
      console.log('✅ Transaction prepared (not sent), returning for Privy approval')
      
      return NextResponse.json({
        success: true,
        serializedTransaction,
        payoutUSD,
        payoutSOL,
        message: 'Transaction prepared, awaiting user approval via Privy'
      })
    }

    console.log('📤 Sending transaction...')

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    })

    console.log('✅ Transaction sent! Signature:', signature)

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed')

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
    }

    console.log('✅ Cash-out successful!', {
      signature,
      user: playerName || privyUserId,
      amount: `$${payoutUSD.toFixed(2)} (${payoutSOL.toFixed(8)} SOL)`
    })

    // Return success response
    return NextResponse.json({
      success: true,
      signature,
      payoutUSD: payoutUSD.toFixed(2),
      payoutSOL: payoutSOL.toFixed(8),
      platformFeeUSD: platformFeeUSD.toFixed(2),
      message: `Successfully sent ${payoutSOL.toFixed(6)} SOL to ${userWalletAddress}`
    })

  } catch (error) {
    console.error('❌ Cash-out error:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Cash-out failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
