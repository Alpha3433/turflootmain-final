import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} from '@solana/web3.js'
import bs58 from 'bs58'

export const SERVER_WALLET_ADDRESS = 'GrYLV9QSnkDwEQ3saypgM9LLHwE36QPZrYCRJceyQfTa'

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

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

const resolveEnv = (key) => {
  if (typeof process === 'undefined') {
    return undefined
  }
  return process?.env?.[key]
}

const normaliseHeliusNetwork = (network) => {
  if (!network) {
    return 'mainnet'
  }

  const trimmed = network.trim().toLowerCase()

  if (trimmed === 'mainnet-beta' || trimmed === 'mainnet') {
    return 'mainnet'
  }
  if (trimmed === 'devnet') {
    return 'devnet'
  }
  if (trimmed === 'testnet') {
    return 'testnet'
  }

  return trimmed
}

export const buildSolanaRpcEndpointList = ({
  network = 'mainnet-beta',
  primary,
  list = '',
  fallbacks = '',
  heliusApiKey,
  heliusRpcUrl
} = {}) => {
  const endpoints = []

  const envHeliusRpcUrl = heliusRpcUrl || resolveEnv('NEXT_PUBLIC_HELIUS_RPC_URL') || resolveEnv('HELIUS_RPC_URL')
  const envHeliusApiKey = heliusApiKey || resolveEnv('NEXT_PUBLIC_HELIUS_API_KEY') || resolveEnv('HELIUS_API_KEY')

  if (envHeliusRpcUrl) {
    endpoints.push(envHeliusRpcUrl.trim())
  } else if (envHeliusApiKey) {
    const heliusNetwork = normaliseHeliusNetwork(network)
    const heliusEndpoint = `https://${heliusNetwork}.helius-rpc.com/?api-key=${envHeliusApiKey.trim()}`
    endpoints.push(heliusEndpoint)
  }

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

const deriveSolanaChainIdentifier = (chain) => {
  if (!chain) {
    return 'solana:mainnet'
  }

  const normalised = String(chain).trim().toLowerCase()

  if (normalised.startsWith('solana:')) {
    return normalised
  }

  if (normalised === 'mainnet' || normalised === 'mainnet-beta') {
    return 'solana:mainnet'
  }

  if (normalised === 'devnet') {
    return 'solana:devnet'
  }

  if (normalised === 'testnet') {
    return 'solana:testnet'
  }

  return `solana:${normalised}`
}

const normaliseSignature = (value) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  const bytes = toUint8Array(value)
  if (bytes) {
    return bs58.encode(bytes)
  }

  return null
}

const decodeBase64 = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const trimmed = value.trim()

  try {
    if (typeof Buffer !== 'undefined') {
      const decoded = Buffer.from(trimmed, 'base64')
      if (decoded?.length) {
        return new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength)
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to decode base64 transaction string via Buffer:', error)
  }

  if (typeof atob === 'function') {
    try {
      const binary = atob(trimmed)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    } catch (error) {
      console.warn('⚠️ Failed to decode base64 transaction string via atob:', error)
    }
  }

  return null
}

const toUint8Array = (value) => {
  if (!value) {
    return null
  }

  if (value instanceof Uint8Array) {
    return value
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (Array.isArray(value)) {
    return Uint8Array.from(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return null
    }

    try {
      const decoded = bs58.decode(trimmed)
      if (decoded?.length) {
        return new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength)
      }
    } catch (error) {
      // Not a valid base58 string, fall back to base64 attempt below
    }

    return decodeBase64(trimmed)
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

const resolveWalletSignAndSend = (wallet) => {
  if (!wallet || typeof wallet !== 'object') {
    return null
  }

  const candidates = [
    { target: wallet, label: 'wallet' },
    { target: wallet.wallet, label: 'wallet.wallet' },
    { target: wallet.adapter, label: 'wallet.adapter' }
  ]

  for (const { target, label } of candidates) {
    if (!target) {
      continue
    }

    if (typeof target.signAndSendTransaction === 'function') {
      return {
        sender: target.signAndSendTransaction.bind(target),
        source: `${label}.signAndSendTransaction`
      }
    }

    if (typeof target.signAndSend === 'function') {
      return {
        sender: target.signAndSend.bind(target),
        source: `${label}.signAndSend`
      }
    }
  }

  return null
}

const sendTransactionWithPrivy = async ({
  transaction,
  chain,
  solanaWallet,
  signAndSendTransactionFn,
  options
}) => {
  if (!transaction) {
    throw new Error('A transaction is required before calling signAndSendTransaction.')
  }

  if (typeof transaction.serialize !== 'function') {
    throw new Error('Provided transaction is not serializable.')
  }

  const serialised = transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
  const transactionBytes = new Uint8Array(serialised)

  const request = {
    chain,
    transaction: transactionBytes
  }

  if (options) {
    request.options = options
  }

  if (solanaWallet?.address && !request.address) {
    request.address = solanaWallet.address
  }

  const direct = resolveWalletSignAndSend(solanaWallet)
  if (direct?.sender) {
    const response =
      request.options !== undefined
        ? await direct.sender(transaction, request.options)
        : await direct.sender(transaction)
    return {
      signature: normaliseSignature(response?.signature || response),
      rawTransaction: toUint8Array(response?.rawTransaction),
      source: direct.source
    }
  }

  if (typeof signAndSendTransactionFn === 'function') {
    const response = await signAndSendTransactionFn(request)
    return {
      signature: normaliseSignature(response?.signature || response),
      rawTransaction: toUint8Array(response?.rawTransaction),
      source: 'privy:signAndSendTransaction'
    }
  }

  throw new Error('No Privy signAndSendTransaction function available for the connected wallet.')
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
  prizeVaultAddress,
  feeVaultAddress,
  entryLamports: entryLamportsOverride,
  feeLamports: feeLamportsOverride,
  memo,
  logger = console,
  signAndSendTransactionFn,
  solanaChain
}) => {
  const log = logger || console
  const costs = calculatePaidRoomCosts(entryFeeUsd, feePercentage)
  const currentUsdBalance = asNumber(walletBalance.usd, 0)
  const currentSolBalance = asNumber(walletBalance.sol, 0)
  const usdPerSol = deriveUsdPerSol({
    usdBalance: currentUsdBalance,
    solBalance: currentSolBalance,
    usdPerSolFallback
  })

  let entryLamports = Number.isFinite(entryLamportsOverride) ? Math.floor(entryLamportsOverride) : null
  if (entryLamports === null || entryLamports < 0) {
    entryLamports = Math.max(0, Math.round((costs.entryFee / usdPerSol) * LAMPORTS_PER_SOL))
  }

  let feeLamports = Number.isFinite(feeLamportsOverride) ? Math.floor(feeLamportsOverride) : null
  const effectiveFeePercentage = Number.isFinite(feePercentage) ? feePercentage : costs.feePercentage
  if (feeLamports === null || feeLamports < 0) {
    feeLamports = Math.max(0, Math.ceil(entryLamports * (effectiveFeePercentage / 100)))
  }

  const totalLamports = entryLamports + feeLamports
  const totalCostSol = totalLamports / LAMPORTS_PER_SOL

  const effectiveCosts = {
    entryFee: (entryLamports / LAMPORTS_PER_SOL) * usdPerSol,
    serverFee: (feeLamports / LAMPORTS_PER_SOL) * usdPerSol,
    totalCost: (totalLamports / LAMPORTS_PER_SOL) * usdPerSol,
    feePercentage: effectiveFeePercentage
  }

  log.log?.('💰 Calculated paid room costs:', {
    entryFeeUsd: effectiveCosts.entryFee,
    serverFeeUsd: effectiveCosts.serverFee,
    totalCostUsd: effectiveCosts.totalCost,
    feePercentage: effectiveCosts.feePercentage,
    entryLamports,
    feeLamports,
    totalLamports,
    totalCostSol
  })

  if (currentUsdBalance < effectiveCosts.totalCost) {
    throw new Error(`Insufficient USD balance. Need $${effectiveCosts.totalCost.toFixed(3)}, have $${currentUsdBalance.toFixed(2)}`)
  }

  if (currentSolBalance > 0 && currentSolBalance < totalCostSol) {
    throw new Error(`Insufficient SOL balance. Need ${totalCostSol.toFixed(6)} SOL, have ${currentSolBalance.toFixed(6)} SOL`)
  }

  const walletAddress = walletAddressOverride || solanaWallet?.address || solanaWallet?.publicKey || privyUser?.wallet?.address

  if (!walletAddress) {
    throw new Error('No Solana wallet address available for fee deduction.')
  }

  if (!Number.isFinite(totalLamports) || totalLamports <= 0) {
    throw new Error(`Invalid transfer amount calculated (${totalLamports} lamports).`)
  }

  const prizeVault = prizeVaultAddress || serverWalletAddress
  const feeVault = feeVaultAddress || serverWalletAddress

  if (!prizeVault) {
    throw new Error('No prize vault wallet configured for paid room transfer.')
  }

  if (!feeVault) {
    throw new Error('No fee vault wallet configured for paid room transfer.')
  }

  const { connection, latestBlockhash, endpoint } = await connectToSolana(rpcEndpoints)
  log.log?.('🌐 Using Solana RPC endpoint:', endpoint)

  const fromPublicKey = new PublicKey(walletAddress)
  const prizeVaultPublicKey = new PublicKey(prizeVault)
  const feeVaultPublicKey = new PublicKey(feeVault)
  const memoPayload = memo
    ? typeof memo === 'string'
      ? memo
      : JSON.stringify(memo)
    : null

  const buildTransaction = () => {
    const tx = new Transaction()

    if (entryLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: prizeVaultPublicKey,
          lamports: entryLamports
        })
      )
    }

    if (feeLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: feeVaultPublicKey,
          lamports: feeLamports
        })
      )
    }

    if (memoPayload) {
      const memoData = typeof Buffer !== 'undefined' ? Buffer.from(memoPayload, 'utf8') : new TextEncoder().encode(memoPayload)
      tx.add(
        new TransactionInstruction({
          keys: [],
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: memoData
        })
      )
    }

    tx.recentBlockhash = latestBlockhash.blockhash
    tx.feePayer = fromPublicKey

    return tx
  }

  const chainIdentifier = deriveSolanaChainIdentifier(solanaChain)
  const preflightOptions = { preflightCommitment: 'confirmed' }

  const logContext = {
    entryLamports,
    feeLamports,
    totalLamports,
    totalCostSol,
    usdPerSol,
    walletAddress,
    prizeVault,
    feeVault,
    chain: chainIdentifier,
    memoAttached: Boolean(memoPayload)
  }

  log.log?.('🔄 Sending Solana transaction via Privy...', logContext)

  let signature
  let rawTransactionBytes = null
  let signingMode = null

  try {
    const transaction = buildTransaction()
    const sendResult = await sendTransactionWithPrivy({
      transaction,
      chain: chainIdentifier,
      solanaWallet,
      signAndSendTransactionFn,
      options: preflightOptions
    })

    signature = sendResult.signature || null
    rawTransactionBytes = sendResult.rawTransaction || null
    signingMode = sendResult.source || 'privy:signAndSendTransaction'

    if (!signature) {
      throw new Error('Privy wallet did not return a transaction signature.')
    }

    await connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash
      },
      'confirmed'
    )

    log.log?.('✅ Solana transaction confirmed via Privy', {
      ...logContext,
      signature,
      rpcEndpoint: endpoint,
      signingMode
    })
  } catch (error) {
    log.error?.('❌ Failed to process Solana transaction with Privy.', error)
    throw error
  }

  return {
    signature,
    lamports: totalLamports,
    entryLamports,
    feeLamports,
    totalCostSol,
    costs: effectiveCosts,
    rpcEndpoint: endpoint,
    walletAddress,
    prizeVault,
    feeVault,
    memo: memo ?? memoPayload,
    rawTransaction: rawTransactionBytes,
    signingMode
  }
}

export default {
  SERVER_WALLET_ADDRESS,
  calculatePaidRoomCosts,
  deriveUsdPerSol,
  buildSolanaRpcEndpointList,
  deductPaidRoomFee
}
