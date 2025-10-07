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

const bindHandler = (fn, context) => (typeof fn === 'function' ? fn.bind(context) : null)

const callWithOptionalArgs = (handler, transaction, connection, options) => {
  if (typeof handler !== 'function') {
    throw new Error('Invalid Solana transaction handler provided.')
  }

  const expectedArgs = Number.isInteger(handler.length) ? handler.length : 0

  if (expectedArgs >= 3) {
    return handler(transaction, connection, options)
  }
  if (expectedArgs === 2) {
    return handler(transaction, connection)
  }

  return handler(transaction)
}

const selectSendTransaction = async (solanaWallet, privyUser) => {
  if (!solanaWallet) {
    return null
  }

  const sendCandidates = [
    bindHandler(solanaWallet.sendTransaction, solanaWallet),
    bindHandler(solanaWallet.signAndSendTransaction, solanaWallet),
    bindHandler(solanaWallet?.walletClient?.solana?.sendTransaction, solanaWallet?.walletClient?.solana),
    bindHandler(solanaWallet?.walletClient?.solana?.signAndSendTransaction, solanaWallet?.walletClient?.solana)
  ]

  for (const candidate of sendCandidates) {
    if (candidate) {
      return { mode: 'send', handler: candidate }
    }
  }

  const signCandidates = [
    bindHandler(solanaWallet.signTransaction, solanaWallet),
    bindHandler(solanaWallet?.walletClient?.solana?.signTransaction, solanaWallet?.walletClient?.solana),
    bindHandler(privyUser?.wallet?.walletClient?.solana?.signTransaction, privyUser?.wallet?.walletClient?.solana)
  ]

  for (const candidate of signCandidates) {
    if (candidate) {
      return { mode: 'sign', handler: candidate }
    }
  }

  if (typeof solanaWallet.getProvider === 'function') {
    try {
      const provider = await solanaWallet.getProvider()
      const providerSendCandidates = [
        bindHandler(provider?.sendTransaction, provider),
        bindHandler(provider?.signAndSendTransaction, provider)
      ]

      for (const candidate of providerSendCandidates) {
        if (candidate) {
          return { mode: 'send', handler: candidate }
        }
      }

      const providerSignCandidate = bindHandler(provider?.signTransaction, provider)
      if (providerSignCandidate) {
        return { mode: 'sign', handler: providerSignCandidate }
      }
    } catch (error) {
      console.warn('⚠️ Failed to resolve Solana provider from wallet:', error)
    }
  }

  if (privyUser?.wallet?.walletClient?.solana?.sendTransaction) {
    return {
      mode: 'send',
      handler: privyUser.wallet.walletClient.solana.sendTransaction.bind(privyUser.wallet.walletClient.solana)
    }
  }

  if (privyUser?.wallet?.walletClient?.solana?.signAndSendTransaction) {
    return {
      mode: 'send',
      handler: privyUser.wallet.walletClient.solana.signAndSendTransaction.bind(privyUser.wallet.walletClient.solana)
    }
  }

  if (privyUser?.wallet?.walletClient?.solana?.signTransaction) {
    return {
      mode: 'sign',
      handler: privyUser.wallet.walletClient.solana.signTransaction.bind(privyUser.wallet.walletClient.solana)
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

  return null
}

const normaliseSignedTransaction = (signedResult) => {
  if (!signedResult) {
    throw new Error('Wallet did not return a signed transaction.')
  }

  const candidate =
    signedResult?.signedTransaction || signedResult?.transaction || signedResult?.rawTransaction || signedResult

  if (typeof candidate === 'string') {
    return { signature: candidate }
  }

  if (candidate?.serialize) {
    const serialised = candidate.serialize()
    const raw = toUint8Array(serialised)
    if (!raw) {
      throw new Error('Unable to serialise signed transaction from wallet response.')
    }
    return { raw, transaction: candidate }
  }

  const rawCandidate = toUint8Array(candidate)
  if (rawCandidate) {
    return { raw: rawCandidate }
  }

  throw new Error('Wallet did not provide a serializable signed transaction.')
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

  const transactionHandler = await selectSendTransaction(solanaWallet, privyUser)

  if (!transactionHandler || !transactionHandler.handler || !transactionHandler.mode) {
    throw new Error('Unable to access signing capabilities for the connected Solana wallet.')
  }

  log.log?.('🔄 Processing Solana transaction via Privy...', {
    lamports,
    totalCostSol,
    usdPerSol,
    walletAddress,
    serverWallet: serverWalletAddress
  })

  let signature
  let signedTransactionRaw

  if (transactionHandler.mode === 'send') {
    const sendResult = await callWithOptionalArgs(
      transactionHandler.handler,
      transaction,
      connection,
      { preflightCommitment: 'confirmed' }
    )

    if (typeof sendResult === 'string') {
      signature = sendResult
    } else if (sendResult?.signature) {
      signature = sendResult.signature
      signedTransactionRaw = sendResult?.rawTransaction
    } else if (sendResult) {
      if (typeof sendResult === 'object') {
        throw new Error('Unexpected response from Solana wallet when sending transaction.')
      }
      signature = String(sendResult)
    }
  } else if (transactionHandler.mode === 'sign') {
    const signedResult = await callWithOptionalArgs(transactionHandler.handler, transaction, connection, {
      preflightCommitment: 'confirmed'
    })

    const { raw, signature: providedSignature } = normaliseSignedTransaction(signedResult)

    if (providedSignature) {
      signature = providedSignature
    }

    if (raw && !signedTransactionRaw) {
      signedTransactionRaw = raw
    }

    if (!signature) {
      signature = await connection.sendRawTransaction(raw, {
        preflightCommitment: 'confirmed'
      })
    }
  } else {
    throw new Error('Unsupported Solana wallet signing mode encountered.')
  }

  if (!signature) {
    throw new Error('Failed to obtain a Solana transaction signature from the wallet.')
  }

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
    serverWallet: serverWalletAddress,
    rawTransaction: signedTransactionRaw
  }
}

export default {
  SERVER_WALLET_ADDRESS,
  calculatePaidRoomCosts,
  deriveUsdPerSol,
  buildSolanaRpcEndpointList,
  deductPaidRoomFee
}
