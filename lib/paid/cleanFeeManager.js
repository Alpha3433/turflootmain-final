/**
 * Clean Fee Manager for Privy 3.0 + Helius
 * Simple, no fallbacks, production-ready
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'

const LAMPORTS_PER_SOL = 1_000_000_000
const DEFAULT_USD_PER_SOL = 150
const DEFAULT_FEE_PERCENTAGE = 10

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
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  console.log('✅ Got blockhash:', blockhash, 'lastValidBlockHeight:', lastValidBlockHeight)
  
  // Create public keys
  const fromPubkey = new PublicKey(userWalletAddress)
  const toPubkey = new PublicKey(serverWalletAddress)

  const instructions = []

  if (fees.entryLamports > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: fees.entryLamports
      })
    )
    console.log(`✅ Added entry fee: ${fees.entryLamports} lamports (${fees.entrySol} SOL)`)
  }

  if (fees.serverLamports > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: fees.serverLamports
      })
    )
    console.log(`✅ Added server fee: ${fees.serverLamports} lamports (${fees.serverSol} SOL)`)
  }

  if (instructions.length === 0) {
    throw new Error('No fee instructions generated for transaction')
  }

  const legacyTransaction = new Transaction({
    feePayer: fromPubkey,
    recentBlockhash: blockhash
  }).add(...instructions)

  const messageV0 = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash: blockhash,
    instructions: legacyTransaction.instructions
  }).compileToV0Message()

  const versionedTransaction = new VersionedTransaction(messageV0)
  const serialized = versionedTransaction.serialize()

  console.log('✅ Transaction built and serialized (versioned)')

  return {
    transaction: serialized,
    fees,
    connection,
    latestBlockhash: { blockhash, lastValidBlockHeight }
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
         '7vWLfwtq4KZrcEoZhMQFfHTNPF4oVqBx4JmUUFXDJ6wy'
}