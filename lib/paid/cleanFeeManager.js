/**
 * Clean Fee Manager for Privy 3.0 + Helius
 * Simple, no fallbacks, production-ready
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'

const LAMPORTS_PER_SOL = 1_000_000_000
const DEFAULT_USD_PER_SOL = 150
const DEFAULT_FEE_PERCENTAGE = 10
export const DEFAULT_SERVER_WALLET_ADDRESS = 'GrYLV9QSnkDwEQ3saypgM9LLHwE36QPZrYCRJceyQfTa'

/**
 * Get Helius RPC connection
 */
export const getHeliusConnection = () => {
  const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY
  const heliusRpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC || 'https://mainnet.helius-rpc.com'
  
  const rpcUrl = heliusApiKey 
    ? `${heliusRpcUrl}/?api-key=${heliusApiKey}`
    : heliusRpcUrl
  
  console.log('🌐 Connecting to Helius:', rpcUrl.replace(heliusApiKey, '***'))
  
  return new Connection(rpcUrl, 'confirmed')
}

/**
 * Calculate fee costs in USD and SOL
 */
export const calculateFees = (entryFeeUsd, usdPerSol = DEFAULT_USD_PER_SOL) => {
  const entryFee = parseFloat(entryFeeUsd)
  const serverFee = entryFee * (DEFAULT_FEE_PERCENTAGE / 100)
  const totalUsd = entryFee + serverFee
  
  // Convert to SOL
  const totalSol = totalUsd / usdPerSol
  const entrySol = entryFee / usdPerSol
  const serverSol = serverFee / usdPerSol
  
  // Convert to lamports
  const totalLamports = Math.round(totalSol * LAMPORTS_PER_SOL)
  const entryLamports = Math.round(entrySol * LAMPORTS_PER_SOL)
  const serverLamports = Math.round(serverSol * LAMPORTS_PER_SOL)
  
  return {
    entryFeeUsd: entryFee,
    serverFeeUsd: serverFee,
    totalUsd,
    entrySol,
    serverSol,
    totalSol,
    entryLamports,
    serverLamports,
    totalLamports,
    usdPerSol
  }
}

/**
 * Build Solana transaction for room entry fee
 * Returns a Uint8Array ready for Privy signing
 */
export const buildEntryFeeTransaction = async ({
  entryFeeUsd,
  userWalletAddress,
  serverWalletAddress,
  usdPerSol = DEFAULT_USD_PER_SOL
}) => {
  if (!serverWalletAddress) {
    throw new Error('Server wallet address is required to build the arena entry transaction.')
  }

  console.log('🔨 Building entry fee transaction:', {
    entryFeeUsd,
    userWalletAddress,
    serverWalletAddress,
    usdPerSol
  })
  
  // Calculate fees
  const fees = calculateFees(entryFeeUsd, usdPerSol)
  console.log('💰 Fee calculation:', fees)
  
  // Get Helius connection
  const connection = getHeliusConnection()
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  console.log('✅ Got blockhash:', blockhash)
  
  // Create public keys
  const fromPubkey = new PublicKey(userWalletAddress)
  const toPubkey = new PublicKey(serverWalletAddress)
  
  const transferLamports = fees.totalLamports
  if (transferLamports <= 0) {
    throw new Error('Invalid transfer amount calculated for room fee transaction')
  }

  const instructions = [
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: transferLamports
    })
  ]

  console.log(
    `✅ Added combined transfer: ${transferLamports} lamports (${fees.totalSol} SOL)`
  )

  const messageV0 = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash: blockhash,
    instructions
  }).compileToV0Message()

  const transaction = new VersionedTransaction(messageV0)

  // Serialize to Uint8Array for Privy (helpful for debugging/analytics)
  const serialized = Uint8Array.from(
    transaction.serialize()
  )

  console.log('✅ Transaction built and serialized')

  return {
    transaction,
    serialized,
    fees,
    connection
  }
}

/**
 * Confirm transaction on Solana
 */
export const confirmTransaction = async (connection, signature) => {
  console.log('⏳ Confirming transaction:', signature)
  
  const confirmation = await connection.confirmTransaction(signature, 'confirmed')
  
  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
  }
  
  console.log('✅ Transaction confirmed:', signature)
  return signature
}

/**
 * Get server wallet address from environment
 */
export const getServerWalletAddress = () => {
  return process.env.NEXT_PUBLIC_SERVER_WALLET_ADDRESS ||
         process.env.SERVER_WALLET_ADDRESS ||
         DEFAULT_SERVER_WALLET_ADDRESS
}
