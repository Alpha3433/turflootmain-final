/**
 * Helius Webhook Handler - Direct Deposit Mode
 * Processes deposits TO platform wallet and credits users
 */

import { completePendingDeposit } from './directDeposit.js'
import { markSignatureProcessed, isSignatureProcessed } from './transactionManager.js'

/**
 * Verify Helius webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  const expectedSignature = process.env.HELIUS_WEBHOOK_SECRET
  
  if (!expectedSignature) {
    console.warn('⚠️ HELIUS_WEBHOOK_SECRET not configured')
    return false
  }
  
  return signature === expectedSignature
}

/**
 * Convert lamports to SOL
 */
function lamportsToSol(lamports) {
  return lamports / 1_000_000_000
}

/**
 * Convert SOL to USD (mock rate for now)
 */
function solToUsd(sol) {
  const USD_PER_SOL = parseFloat(process.env.USD_PER_SOL || '150')
  return sol * USD_PER_SOL
}

/**
 * Process Helius webhook transaction
 * Credits users who deposit to platform wallet
 */
export async function processHeliusWebhook(webhookData) {
  try {
    console.log('📥 Processing Helius webhook for direct deposits...')
    
    const transactions = Array.isArray(webhookData) ? webhookData : [webhookData]
    const results = []
    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS
    
    if (!platformWallet) {
      throw new Error('PLATFORM_WALLET_ADDRESS not configured')
    }
    
    for (const tx of transactions) {
      try {
        const signature = tx.signature
        
        if (!signature) {
          console.warn('⚠️ No signature in webhook data')
          continue
        }
        
        // Check if already processed
        if (await isSignatureProcessed(signature)) {
          console.log(`✅ Signature ${signature} already processed`)
          results.push({ signature, status: 'duplicate' })
          continue
        }
        
        const nativeTransfers = tx.nativeTransfers || []
        const tokenTransfers = tx.tokenTransfers || []
        
        console.log(`📝 Transaction ${signature}`)
        console.log(`📝 Native transfers: ${nativeTransfers.length}`)
        
        // Process native SOL transfers TO platform wallet
        for (const transfer of nativeTransfers) {
          const toAddress = transfer.toUserAccount
          const fromAddress = transfer.fromUserAccount
          const amountLamports = transfer.amount
          
          if (!toAddress || !amountLamports || !fromAddress) {
            continue
          }
          
          // Only process deposits TO platform wallet
          if (toAddress.toLowerCase() !== platformWallet.toLowerCase()) {
            console.log(`⏩ Skipping - not to platform wallet (to: ${toAddress})`)
            continue
          }
          
          const solAmount = lamportsToSol(amountLamports)
          const usdAmount = solToUsd(solAmount)
          
          console.log(`💰 Direct Deposit Detected!`)
          console.log(`   From: ${fromAddress}`)
          console.log(`   To: ${toAddress} (Platform Wallet)`)
          console.log(`   Amount: ${solAmount.toFixed(4)} SOL (≈$${usdAmount.toFixed(2)})`)
          
          try {
            // Credit the user who sent the funds
            const result = await completePendingDeposit(
              fromAddress,
              usdAmount,
              signature
            )
            
            console.log(`✅ Credited $${result.amount.toFixed(2)} to ${fromAddress}`)
            
            results.push({
              signature,
              status: 'success',
              user: fromAddress,
              amount_usd: result.amount,
              amount_sol: solAmount,
              matched_pending: !!result.deposit
            })
            
          } catch (balanceError) {
            console.error(`❌ Failed to credit balance:`, balanceError)
            results.push({
              signature,
              status: 'error',
              user: fromAddress,
              error: balanceError.message
            })
          }
        }
        
        // Process token transfers (USDC, etc.) TO platform wallet
        for (const transfer of tokenTransfers) {
          const toAddress = transfer.toUserAccount
          const fromAddress = transfer.fromUserAccount
          const tokenAmount = transfer.tokenAmount
          const mint = transfer.mint
          
          if (!toAddress || !tokenAmount || !fromAddress) {
            continue
          }
          
          // Only process to platform wallet
          if (toAddress.toLowerCase() !== platformWallet.toLowerCase()) {
            console.log(`⏩ Skipping token transfer - not to platform wallet`)
            continue
          }
          
          const usdAmount = tokenAmount // Assume 1:1 for USDC
          
          console.log(`💰 Token Deposit to Platform!`)
          console.log(`   From: ${fromAddress}`)
          console.log(`   Amount: ${tokenAmount} tokens`)
          console.log(`   Mint: ${mint}`)
          
          try {
            const result = await completePendingDeposit(
              fromAddress,
              usdAmount,
              signature
            )
            
            console.log(`✅ Credited $${result.amount.toFixed(2)} to ${fromAddress}`)
            
            results.push({
              signature,
              status: 'success',
              user: fromAddress,
              amount_usd: result.amount,
              token: mint,
              matched_pending: !!result.deposit
            })
            
          } catch (balanceError) {
            console.error(`❌ Failed to credit token balance:`, balanceError)
            results.push({
              signature,
              status: 'error',
              user: fromAddress,
              error: balanceError.message
            })
          }
        }
        
        // Mark signature as processed
        await markSignatureProcessed(signature, {
          type: tx.type,
          processed_at: new Date(),
          transfers_to_platform: nativeTransfers.length + tokenTransfers.length
        })
        
      } catch (txError) {
        console.error(`❌ Error processing transaction:`, txError)
        results.push({
          signature: tx.signature,
          status: 'error',
          error: txError.message
        })
      }
    }
    
    return {
      success: true,
      processed: results.length,
      results
    }
    
  } catch (error) {
    console.error('❌ Helius webhook processing error:', error)
    throw error
  }
}
