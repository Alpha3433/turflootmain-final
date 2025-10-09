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
const DEFAULT_NETWORK_FEE_LAMPORTS_BUFFER = 5000

const normaliseCurrency = (value) => {
  if (!value) {
    return 'USD'
  }

  const normalised = String(value).trim().toUpperCase()

  if (normalised === 'SOL' || normalised === 'LAMPORTS' || normalised === 'USD') {
    return normalised
  }

  return 'USD'
}

const asNumber = (value, fallback = 0) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const formatUsd = (value) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return `$${numeric.toFixed(2)}`
  }
  return '$0.00'
}

const formatSol = (value) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return `${numeric.toFixed(6)} SOL`
  }
  return '0.000000 SOL'
}

export const calculatePaidRoomCosts = (
  entryAmount,
  feePercentage = DEFAULT_FEE_PERCENTAGE,
  options = {}
) => {
  const amount = asNumber(entryAmount, 0)
  const percentage = Number.isFinite(feePercentage) ? feePercentage : DEFAULT_FEE_PERCENTAGE
  const currency = normaliseCurrency(options.currency)
  const usdPerSol = Number.isFinite(options.usdPerSol)
    ? Math.max(0, options.usdPerSol)
    : DEFAULT_USD_PER_SOL

  if (currency === 'SOL') {
    const entryFeeSol = amount
    const serverFeeSol = entryFeeSol * (percentage / 100)
    const totalCostSol = entryFeeSol + serverFeeSol
    const entryFeeUsd = entryFeeSol * usdPerSol
    const serverFeeUsd = serverFeeSol * usdPerSol
    const totalCostUsd = totalCostSol * usdPerSol
    const entryLamports = Math.max(0, Math.round(entryFeeSol * LAMPORTS_PER_SOL))
    const feeLamports = Math.max(0, Math.round(serverFeeSol * LAMPORTS_PER_SOL))
    return {
      currency,
      feePercentage: percentage,
      entryFee: entryFeeSol,
      serverFee: serverFeeSol,
      totalCost: totalCostSol,
      entryFeeUsd,
      serverFeeUsd,
      totalCostUsd,
      entryLamports,
      feeLamports,
      totalLamports: entryLamports + feeLamports,
      usdPerSolUsed: usdPerSol
    }
  }

  if (currency === 'LAMPORTS') {
    const entryLamports = Math.max(0, Math.floor(amount))
    const entryFeeSol = entryLamports / LAMPORTS_PER_SOL
    const serverFeeLamports = Math.max(0, Math.ceil(entryLamports * (percentage / 100)))
    const serverFeeSol = serverFeeLamports / LAMPORTS_PER_SOL
    const totalLamports = entryLamports + serverFeeLamports
    const totalCostSol = totalLamports / LAMPORTS_PER_SOL
    const entryFeeUsd = entryFeeSol * usdPerSol
    const serverFeeUsd = serverFeeSol * usdPerSol
    const totalCostUsd = totalCostSol * usdPerSol
    return {
      currency,
      feePercentage: percentage,
      entryFee: entryLamports,
      serverFee: serverFeeLamports,
      totalCost: totalLamports,
      entryFeeUsd,
      serverFeeUsd,
      totalCostUsd,
      entryFeeSol,
      serverFeeSol,
      totalCostSol,
      entryLamports,
      feeLamports: serverFeeLamports,
      totalLamports,
      usdPerSolUsed: usdPerSol
    }
  }

  const entryFeeUsd = amount
  const serverFeeUsd = entryFeeUsd * (percentage / 100)
  const totalCostUsd = entryFeeUsd + serverFeeUsd
  const entryFeeSol = entryFeeUsd / usdPerSol
  const serverFeeSol = serverFeeUsd / usdPerSol
  const totalCostSol = totalCostUsd / usdPerSol
  const entryLamports = Math.max(0, Math.round(entryFeeSol * LAMPORTS_PER_SOL))
  const feeLamports = Math.max(0, Math.round(serverFeeSol * LAMPORTS_PER_SOL))
  return {
    currency: 'USD',
    feePercentage: percentage,
    entryFee: entryFeeUsd,
    serverFee: serverFeeUsd,
    totalCost: totalCostUsd,
    entryFeeUsd,
    serverFeeUsd,
    totalCostUsd,
    entryFeeSol,
    serverFeeSol,
    totalCostSol,
    entryLamports,
    feeLamports,
    totalLamports: entryLamports + feeLamports,
    usdPerSolUsed: usdPerSol
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

const sanitiseRpcEndpoint = (endpoint) => {
  if (!endpoint || typeof endpoint !== 'string') {
    return endpoint
  }

  try {
    const url = new URL(endpoint)
    url.search = ''

    if (url.username) {
      url.username = '***'
    }

    if (url.password) {
      url.password = '***'
    }

    return url.toString()
  } catch (error) {
    return endpoint
      .replace(/(api[-_]?key|auth|token|secret|pass(word)?)=([^&]+)/gi, '$1=***')
      .split('?')[0]
  }
}

const appendEndpoint = (target, value) => {
  if (typeof value !== 'string') {
    return
  }

  const trimmed = value.trim()
  if (trimmed) {
    target.push(trimmed)
  }
}

export const buildSolanaRpcEndpointList = ({
  network = 'mainnet-beta',
  primary,
  privateRpc,
  list = '',
  fallbacks = ''
} = {}) => {
  const endpoints = []

  appendEndpoint(endpoints, privateRpc)

  const envPriorityCandidates = [
    process.env.NEXT_PUBLIC_SOLANA_PRIVATE_RPC,
    process.env.NEXT_PUBLIC_SOLANA_HELIUS_RPC,
    process.env.NEXT_PUBLIC_SOLANA_RPC_PRIVATE,
    process.env.NEXT_PUBLIC_SOLANA_RPC_HELIUS
  ]

  envPriorityCandidates.forEach((candidate) => appendEndpoint(endpoints, candidate))

  appendEndpoint(endpoints, primary)

  const envPriorityLists = [
    process.env.NEXT_PUBLIC_SOLANA_RPC_PRIORITY_LIST,
    process.env.NEXT_PUBLIC_SOLANA_PRIVATE_RPC_LIST,
    process.env.NEXT_PUBLIC_SOLANA_HELIUS_RPC_LIST
  ]

  envPriorityLists
    .map((value) => normaliseList(value))
    .forEach((entries) => endpoints.push(...entries))

  endpoints.push(...normaliseList(list))
  endpoints.push(...normaliseList(fallbacks))

  try {
    endpoints.push(clusterApiUrl(network.trim()))
  } catch (error) {
    console.warn('⚠️ Unable to derive Solana RPC endpoint from network config:', error)
  }

  const defaultFallbacks = network === 'mainnet-beta'
    ? [
        process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.publicnode.com/solana',
        'https://1rpc.io/solana'
      ]
    : [
        process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
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
      const sanitised = sanitiseRpcEndpoint(endpoint)
      console.error(`⚠️ RPC endpoint failed (${sanitised}):`, error)
      errors.push(`${sanitised}: ${error?.message || error}`)
    }
  }

  throw new Error(`Unable to connect to Solana RPC endpoint. Tried: ${errors.join(' | ')}`)
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

  if (solanaWallet) {
    if (typeof solanaWallet.signAndSendTransaction !== 'function') {
      throw new Error('Connected Solana wallet is missing Privy signAndSendTransaction support.')
    }

    if (!request.wallet && typeof solanaWallet === 'object') {
      request.wallet = solanaWallet
    }

    if (solanaWallet?.address && !request.address) {
      request.address = solanaWallet.address
    }

    if (solanaWallet?.id && !request.walletId) {
      request.walletId = solanaWallet.id
    }
  }

  if (typeof signAndSendTransactionFn !== 'function') {
    throw new Error('No Privy signAndSendTransaction function available for the connected wallet.')
  }

  const response = await signAndSendTransactionFn(request)
  return {
    signature: normaliseSignature(response?.signature || response),
    rawTransaction: toUint8Array(response?.rawTransaction),
    source: 'privy:signAndSendTransaction'
  }
}

export const deductPaidRoomFee = async ({
  entryAmount,
  entryFeeUsd,
  entryCurrency = 'USD',
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
  const amount = entryAmount ?? entryFeeUsd ?? 0
  const currentUsdBalance = asNumber(walletBalance.usd, 0)
  const currentSolBalance = asNumber(walletBalance.sol, 0)
  const currency = normaliseCurrency(entryCurrency)
  const usdPerSol = deriveUsdPerSol({
    usdBalance: currentUsdBalance,
    solBalance: currentSolBalance,
    usdPerSolFallback
  })

  const costs = calculatePaidRoomCosts(amount, feePercentage, {
    currency,
    usdPerSol
  })

  let entryLamports = Number.isFinite(entryLamportsOverride) ? Math.floor(entryLamportsOverride) : null
  if (entryLamports === null || entryLamports < 0) {
    entryLamports = costs.entryLamports ?? Math.max(0, Math.round((costs.entryFeeUsd / usdPerSol) * LAMPORTS_PER_SOL))
  }

  let feeLamports = Number.isFinite(feeLamportsOverride) ? Math.floor(feeLamportsOverride) : null
  const effectiveFeePercentage = Number.isFinite(feePercentage) ? feePercentage : costs.feePercentage
  if (feeLamports === null || feeLamports < 0) {
    feeLamports = costs.feeLamports ?? Math.max(0, Math.ceil(entryLamports * (effectiveFeePercentage / 100)))
  }

  const totalLamports = entryLamports + feeLamports
  const totalCostSol = totalLamports / LAMPORTS_PER_SOL
  const totalCostUsd = costs.totalCostUsd ?? totalCostSol * usdPerSol

  const requiredUsdBalance = costs.totalCostUsd ?? totalCostUsd
  const requiredSolBalance = costs.totalCostSol ?? totalCostSol

  const effectiveCosts = {
    currency,
    feePercentage: effectiveFeePercentage,
    entryFee: costs.currency === 'USD' ? costs.entryFeeUsd : costs.entryFee,
    serverFee: costs.currency === 'USD' ? costs.serverFeeUsd : costs.serverFee,
    totalCost: costs.currency === 'USD' ? costs.totalCostUsd : costs.totalCost,
    entryFeeUsd: costs.entryFeeUsd ?? (entryLamports / LAMPORTS_PER_SOL) * usdPerSol,
    serverFeeUsd: costs.serverFeeUsd ?? (feeLamports / LAMPORTS_PER_SOL) * usdPerSol,
    totalCostUsd,
    entryFeeSol: costs.entryFeeSol ?? (entryLamports / LAMPORTS_PER_SOL),
    serverFeeSol: costs.serverFeeSol ?? (feeLamports / LAMPORTS_PER_SOL),
    totalCostSol
  }

  log.log?.('💰 Calculated paid room costs:', {
    currency: effectiveCosts.currency,
    entryFeeValue: effectiveCosts.entryFee,
    serverFeeValue: effectiveCosts.serverFee,
    totalCostValue: effectiveCosts.totalCost,
    entryFeeUsd: effectiveCosts.entryFeeUsd,
    serverFeeUsd: effectiveCosts.serverFeeUsd,
    totalCostUsd: effectiveCosts.totalCostUsd,
    feePercentage: effectiveCosts.feePercentage,
    entryLamports,
    feeLamports,
    totalLamports,
    totalCostSol
  })

  if (currency === 'SOL' || currency === 'LAMPORTS') {
    if (currentSolBalance < requiredSolBalance) {
      throw new Error(
        `Insufficient SOL balance. Need ${requiredSolBalance.toFixed(6)} SOL for room entry (network fees extra), have ${currentSolBalance.toFixed(6)} SOL`
      )
    }
  } else if (currentUsdBalance < requiredUsdBalance) {
    throw new Error(
      `Insufficient USD balance. Need $${requiredUsdBalance.toFixed(3)}, have $${currentUsdBalance.toFixed(2)}`
    )
  }

  if (currentSolBalance > 0 && currentSolBalance < totalCostSol) {
    log.warn?.(
      `⚠️ Wallet SOL balance (${currentSolBalance.toFixed(6)} SOL) is below required transfer total (${totalCostSol.toFixed(6)} SOL). Proceeding with available balance checks.`
    )
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
  const sanitisedEndpoint = sanitiseRpcEndpoint(endpoint)
  log.log?.('🌐 Using Solana RPC endpoint:', sanitisedEndpoint)

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

    const shouldCombineTransfers = prizeVaultPublicKey.equals(feeVaultPublicKey)
    if (shouldCombineTransfers) {
      const totalLamportsForVault = entryLamports + feeLamports
      if (totalLamportsForVault > 0) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: fromPublicKey,
            toPubkey: prizeVaultPublicKey,
            lamports: totalLamportsForVault
          })
        )
      }
    } else {
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

  const transaction = buildTransaction()

  let estimatedNetworkFeeLamports = DEFAULT_NETWORK_FEE_LAMPORTS_BUFFER
  try {
    const feeResult = await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed')
    if (feeResult && typeof feeResult.value === 'number' && feeResult.value > 0) {
      estimatedNetworkFeeLamports = Math.max(feeResult.value, DEFAULT_NETWORK_FEE_LAMPORTS_BUFFER)
    }
  } catch (error) {
    log.warn?.('⚠️ Unable to estimate network fee from RPC response, using default buffer.', error)
  }

  const estimatedNetworkFeeSol = estimatedNetworkFeeLamports / LAMPORTS_PER_SOL

  if (currentSolBalance < totalCostSol + estimatedNetworkFeeSol) {
    const deficit = totalCostSol + estimatedNetworkFeeSol - currentSolBalance
    throw new Error(
      `Insufficient SOL balance. Need ${(totalCostSol + estimatedNetworkFeeSol).toFixed(6)} SOL including network fees, have ${currentSolBalance.toFixed(6)} SOL. Top up at least ${deficit.toFixed(6)} SOL.`
    )
  }

  const chainIdentifier = deriveSolanaChainIdentifier(solanaChain)
  const networkFeeUsdEstimate = estimatedNetworkFeeSol * usdPerSol
  const modalUiOptions = {
    showWalletUIs: true,
    description: `Approve ${formatUsd(effectiveCosts.entryFeeUsd)} entry + ${formatUsd(effectiveCosts.serverFeeUsd)} arena fee (${formatSol(totalCostSol)} total) plus ~${formatUsd(networkFeeUsdEstimate)} network fees.`,
    buttonText: 'Confirm entry',
    transactionInfo: {
      title: 'TurfLoot Arena Entry',
      action: `Join arena (${formatUsd(totalCostUsd)} total)`,
      contractInfo: {
        name: 'TurfLoot Arena Vault',
        url: 'https://turfloot.gg/arena'
      }
    },
    successHeader: 'Arena entry confirmed',
    successDescription: 'You are ready to battle in TurfLoot Arena.'
  }
  const preflightOptions = {
    preflightCommitment: 'confirmed',
    commitment: 'confirmed',
    uiOptions: modalUiOptions
  }

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
    memoAttached: Boolean(memoPayload),
    rpcEndpoint: sanitisedEndpoint,
    estimatedNetworkFeeLamports,
    estimatedNetworkFeeSol
  }

  log.log?.('🔄 Sending Solana transaction via Privy...', logContext)

  let signature
  let rawTransactionBytes = null
  let signingMode = null

  try {
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
      rpcEndpoint: sanitisedEndpoint,
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
    rpcEndpoint: sanitisedEndpoint,
    walletAddress,
    prizeVault,
    feeVault,
    memo: memo ?? memoPayload,
    rawTransaction: rawTransactionBytes,
    signingMode,
    networkFeeLamports: estimatedNetworkFeeLamports,
    networkFeeSol: estimatedNetworkFeeSol
  }
}

export default {
  SERVER_WALLET_ADDRESS,
  calculatePaidRoomCosts,
  deriveUsdPerSol,
  buildSolanaRpcEndpointList,
  deductPaidRoomFee
}
