/**
 * Pending Deposits API
 * Manages deposit initiation and tracking
 */

import { NextResponse } from 'next/server'
import { createPendingDeposit, getUserPendingDeposits } from '../../../../lib/transactions/directDeposit.js'

/**
 * GET - Get user's pending deposits
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }
    
    const deposits = await getUserPendingDeposits(userId)
    
    return NextResponse.json({
      success: true,
      deposits
    })
    
  } catch (error) {
    console.error('❌ Error fetching pending deposits:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch pending deposits' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create new pending deposit
 */
export async function POST(request) {
  try {
    const { userId, amountUsd } = await request.json()
    
    if (!userId || !amountUsd) {
      return NextResponse.json(
        { error: 'Missing userId or amountUsd' },
        { status: 400 }
      )
    }
    
    const deposit = await createPendingDeposit(userId, amountUsd)
    
    return NextResponse.json({
      success: true,
      deposit,
      platformWallet: process.env.PLATFORM_WALLET_ADDRESS
    })
    
  } catch (error) {
    console.error('❌ Error creating pending deposit:', error)
    
    return NextResponse.json(
      { error: 'Failed to create pending deposit' },
      { status: 500 }
    )
  }
}