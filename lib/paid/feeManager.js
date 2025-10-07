import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js'

export const SERVER_WALLET_ADDRESS = 'GrYLV9QSnkDwEQ3saypgM9LLHwE36QPZrYCRJceyQfTa'

const DEFAULT_USD_PER_SOL = 150
const DEFAULT_FEE_PERCENTAGE = 10

const asNumber = (value, fallback = 0) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const calculatePaidRoomCosts = (entryFeeUsd, feePercentage = DEFAULT_FEE_PERCENTAGE) => {
  const entryFee = asNumber(entryFeeUsd, 0)
  const percentage = Number.isFinite(feePercentage) ? feePercentage : DEFAULT_FEE_PERCENTAGE
  const serverFee = entryFee * (percentage / 100)
  return {
    entryFee,
    serverFee,
    totalCost: entryFee + serverFee,
    feePercentage: percentage
  }
}

export const deriveUsdPerSol = ({ usdBalance, solBalance, usdPerSolFallback = DEFAULT_USD_PER_SOL }) => {
  const usd = Math.max(0, asNumber(usdBalance, 0))
  const sol = Math.max(0, asNumber(solBalance, 0))
  if (sol > 0.0000001) {
    const inferred = usd / sol
    if (Number.isFinite(inferred) && inferred > 0) {
      return inferred
    }
  }
  return usdPerSolFallback
}

const normaliseList = (value) =>
  (value || '')
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

export const buildSolanaRpcEndpointList = ({
  network = 'mainnet-beta',
  primary,
  list = '',
  fallbacks = ''
} = {}) => {
  const endpoints = []
  if (primary) {
    endpoints.push(primary.trim())
  }
  endpoints.push(...normaliseList(list))
  endpoints.push(...normaliseList(fallbacks))

  try {
    endpoints.push(clusterApiUrl(network.trim()))
  } catch (error) {
    console.warn('⚠️ Unable to derive Solana RPC endpoint from network config:', error)
  }

  const defaultFallbacks = network === 'mainnet-beta'
    ? [
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.publicnode.com/solana',
        'https://1rpc.io/solana'
      ]
    : [
        'https://api.devnet.solana.com',
        'https://rpc.publicnode.com/solana-devnet'
      ]

  endpoints.push(...defaultFallbacks)

  return Array.from(
    new Set(
      endpoints.filter((endpoint) => typeof endpoint === 'string' && /^https?:\/\//.test(endpoint))
    )
  )
}

const selectSendTransaction = (solanaWallet, privyUser) => {
  if (!solanaWallet) {
    return null
  }

  const candidates = [
    solanaWallet.sendTransaction,
    solanaWallet.signAndSendTransaction,
    solanaWallet?.walletClient?.solana?.sendTransaction,
    solanaWallet?.walletClient?.solana?.signAndSendTransaction
  ]

  for (const fn of candidates) {
    if (typeof fn === 'function') {
      return fn.bind(fn === solanaWallet?.walletClient?.solana?.sendTransaction || fn === solanaWallet?.walletClient?.solana?.signAndSendTransaction ? solanaWallet.walletClient.solana : solanaWallet)
    }
  }

  if (typeof solanaWallet.getProvider === 'function') {
    return async (...args) => {
      const provider = await solanaWallet.getProvider()
      if (provider?.sendTransaction) {
        return provider.sendTransaction(...args)
      }
      if (provider?.signAndSendTransaction) {
        return provider.signAndSendTransaction(...args)
      }
      throw new Error('Connected provider does not expose a transaction sender.')
    }
  }

  if (privyUser?.wallet?.walletClient?.solana?.sendTransaction) {
    return privyUser.wallet.walletClient.solana.sendTransaction.bind(privyUser.wallet.walletClient.solana)
  }

  if (privyUser?.wallet?.walletClient?.solana?.signAndSendTransaction) {
    return privyUser.wallet.walletClient.solana.signAndSendTransaction.bind(privyUser.wallet.walletClient.solana)
  }

  return null
}

const connectToSolana = async (rpcEndpoints = []) => {
  const errors = []
  for (const endpoint of rpcEndpoints) {
    try {
      const connection = new Connection(endpoint, 'confirmed')
      const latestBlockhash = await connection.getLatestBlockhash()
      return { connection, latestBlockhash, endpoint }
    } catch (error) {
      console.error(`⚠️ RPC endpoint failed (${endpoint}):`, error)
      errors.push(`${endpoint}: ${error?.message || error}`)
    }
  }

  throw new Error(`Unable to connect to Solana RPC endpoint. Tried: ${errors.join(' | ')}`)
}

export const deductPaidRoomFee = async ({
  entryFeeUsd,
  feePercentage = DEFAULT_FEE_PERCENTAGE,
  walletBalance = {},
  solanaWallet,
  privyUser,
  walletAddress: walletAddressOverride,
  rpcEndpoints,
  usdPerSolFallback = DEFAULT_USD_PER_SOL,
  serverWalletAddress = SERVER_WALLET_ADDRESS,
  logger = console
}) => {
  const log = logger || console
  const costs = calculatePaidRoomCosts(entryFeeUsd, feePercentage)

  log.log?.('💰 Calculated paid room costs:', {
    entryFee: costs.entryFee,
    serverFee: costs.serverFee,
    totalCost: costs.totalCost,
    feePercentage: costs.feePercentage
  })

  const currentUsdBalance = asNumber(walletBalance.usd, 0)
  if (currentUsdBalance < costs.totalCost) {
    throw new Error(`Insufficient USD balance. Need $${costs.totalCost.toFixed(3)}, have $${currentUsdBalance.toFixed(2)}`)
  }

  const currentSolBalance = asNumber(walletBalance.sol, 0)
  const usdPerSol = deriveUsdPerSol({
    usdBalance: currentUsdBalance,
    solBalance: currentSolBalance,
    usdPerSolFallback
  })

  const totalCostSol = costs.totalCost / usdPerSol

  if (currentSolBalance > 0 && currentSolBalance < totalCostSol) {
    throw new Error(`Insufficient SOL balance. Need ${totalCostSol.toFixed(6)} SOL, have ${currentSolBalance.toFixed(6)} SOL`)
  }

  const walletAddress = walletAddressOverride || solanaWallet?.address || solanaWallet?.publicKey || privyUser?.wallet?.address

  if (!walletAddress) {
    throw new Error('No Solana wallet address available for fee deduction.')
  }

  const lamports = Math.round(totalCostSol * LAMPORTS_PER_SOL)
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error(`Invalid transfer amount calculated (${lamports} lamports).`)
  }

  const { connection, latestBlockhash, endpoint } = await connectToSolana(rpcEndpoints)
  log.log?.('🌐 Using Solana RPC endpoint:', endpoint)

  const fromPublicKey = new PublicKey(walletAddress)
  const toPublicKey = new PublicKey(serverWalletAddress)

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: toPublicKey,
      lamports
    })
  )

  transaction.recentBlockhash = latestBlockhash.blockhash
  transaction.feePayer = fromPublicKey

  const sendTransaction = selectSendTransaction(solanaWallet, privyUser)

  if (!sendTransaction) {
    throw new Error('Unable to access signing capabilities for the connected Solana wallet.')
  }

  log.log?.('🔄 Processing Solana transaction via Privy...', {
    lamports,
    totalCostSol,
    usdPerSol,
    walletAddress,
    serverWallet: serverWalletAddress
  })

  const signature = await sendTransaction(transaction, connection, {
    preflightCommitment: 'confirmed'
  })

  log.log?.('📝 Transaction submitted. Awaiting confirmation…', signature)

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    },
    'confirmed'
  )

  log.log?.('✅ Solana transaction confirmed!')

  return {
    signature,
    lamports,
    totalCostSol,
    costs,
    rpcEndpoint: endpoint,
    walletAddress,
    serverWallet: serverWalletAddress
  }
}

export default {
  SERVER_WALLET_ADDRESS,
  calculatePaidRoomCosts,
  deriveUsdPerSol,
  buildSolanaRpcEndpointList,
  deductPaidRoomFee
}
