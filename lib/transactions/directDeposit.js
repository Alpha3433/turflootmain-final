/**
 * Direct Deposit Manager
 * Users deposit directly to platform wallet, no embedded wallets needed
 */

import { v4 as uuidv4 } from 'uuid'
import { adjustBalance } from './transactionManager.js'

/**
 * Get MongoDB connection
 */
const getDb = async () => {
  const { MongoClient } = await import('mongodb')
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  return { client, db: client.db() }
}

/**
 * Create pending deposit record
 * Used to track which user initiated a deposit
 */
export async function createPendingDeposit(userId, amountUsd) {
  const { client, db } = await getDb()
  
  try {
    const pendingDeposits = db.collection('pending_deposits')
    
    const deposit = {
      _id: uuidv4(),
      user_id: userId,
      user_wallet: userId, // Store wallet address
      amount_usd: amountUsd,
      status: 'pending',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }
    
    await pendingDeposits.insertOne(deposit)
    
    console.log('📝 Created pending deposit:', deposit._id)
    
    return deposit
    
  } finally {
    await client.close()
  }
}

/**
 * Find and complete pending deposit
 * Matches deposit by user and amount within time window
 */
export async function completePendingDeposit(userId, amountUsd, signature) {
  const { client, db } = await getDb()
  
  try {
    const pendingDeposits = db.collection('pending_deposits')
    
    // Find pending deposit for this user with similar amount
    // Allow 5% variance for exchange rate fluctuations
    const minAmount = amountUsd * 0.95
    const maxAmount = amountUsd * 1.05
    
    const deposit = await pendingDeposits.findOne({
      user_id: userId,
      status: 'pending',
      amount_usd: { $gte: minAmount, $lte: maxAmount },
      expires_at: { $gt: new Date() }
    })
    
    if (!deposit) {
      console.warn('⚠️ No matching pending deposit found')
      // Still credit the user even without pending record
      // This handles cases where deposit came from external wallet
      console.log('💰 Crediting user directly without pending record')
      
      await adjustBalance(
        userId,
        amountUsd,
        'deposit',
        'completed',
        signature,
        `Direct deposit: $${amountUsd.toFixed(2)}`,
        { direct_deposit: true, no_pending_record: true }
      )
      
      return { credited: true, amount: amountUsd }
    }
    
    // Mark deposit as completed
    await pendingDeposits.updateOne(
      { _id: deposit._id },
      { 
        $set: { 
          status: 'completed',
          signature,
          completed_at: new Date(),
          actual_amount: amountUsd
        } 
      }
    )
    
    // Credit user's mock balance
    await adjustBalance(
      userId,
      amountUsd,
      'deposit',
      'completed',
      signature,
      `Direct deposit: $${amountUsd.toFixed(2)}`,
      { 
        direct_deposit: true,
        pending_deposit_id: deposit._id,
        expected_amount: deposit.amount_usd,
        actual_amount: amountUsd
      }
    )
    
    console.log('✅ Completed pending deposit and credited balance')
    
    return { credited: true, amount: amountUsd, deposit }
    
  } finally {
    await client.close()
  }
}

/**
 * Clean up expired pending deposits
 */
export async function cleanupExpiredDeposits() {
  const { client, db } = await getDb()
  
  try {
    const pendingDeposits = db.collection('pending_deposits')
    
    const result = await pendingDeposits.updateMany(
      {
        status: 'pending',
        expires_at: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    )
    
    console.log(`🧹 Marked ${result.modifiedCount} deposits as expired`)
    
    return result.modifiedCount
    
  } finally {
    await client.close()
  }
}

/**
 * Get pending deposits for user
 */
export async function getUserPendingDeposits(userId) {
  const { client, db } = await getDb()
  
  try {
    const pendingDeposits = db.collection('pending_deposits')
    
    const deposits = await pendingDeposits
      .find({
        user_id: userId,
        status: 'pending'
      })
      .sort({ created_at: -1 })
      .toArray()
    
    return deposits
    
  } finally {
    await client.close()
  }
}