import bs58 from 'bs58'
import {
  buildEntryFeeTransaction,
  confirmTransaction,
  getServerWalletAddress,
  calculateFees
} from '../paid/cleanFeeManager'

const normalizeAddress = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'object' && typeof value.toString === 'function') {
    const stringValue = value.toString()
    if (stringValue && stringValue !== '[object Object]') {
      return stringValue
    }
  }
  return null
}

const lower = (value) => (typeof value === 'string' ? value.toLowerCase() : null)

const collectUserSolanaAddresses = (privyUser) => {
  const addresses = []

  const pushAddress = (candidate) => {
    const normalized = normalizeAddress(candidate)
    if (normalized && !addresses.includes(normalized)) {
      addresses.push(normalized)
    }
  }

  if (!privyUser) {
    return addresses
  }

  pushAddress(privyUser?.wallet?.address)

  if (Array.isArray(privyUser?.linkedAccounts)) {
    privyUser.linkedAccounts.forEach((account) => {
      if (!account) return
      const isWallet = account.type === 'wallet'
      const isSolana =
        !account.chainType || account.chainType === 'solana' || lower(account.chainType)?.startsWith('solana')
      if (isWallet && isSolana) {
        pushAddress(account.address)
      }
    })
  }

  if (Array.isArray(privyUser?.accounts)) {
    privyUser.accounts.forEach((account) => {
      if (account?.type === 'wallet') {
        pushAddress(account.address)
      }
    })
  }

  return addresses
}

const deriveWalletAddress = (wallet) => {
  if (!wallet) return null

  if (wallet.address) {
    const normalized = normalizeAddress(wallet.address)
    if (normalized) return normalized
  }

  if (wallet.publicKey) {
    const normalized = normalizeAddress(
      typeof wallet.publicKey === 'string' ? wallet.publicKey : wallet.publicKey?.toString?.()
    )
    if (normalized) return normalized
  }

  if (typeof wallet.getAddress === 'function') {
    try {
      const resolved = wallet.getAddress()
      const normalized = normalizeAddress(resolved)
      if (normalized) return normalized
    } catch (error) {
      console.warn('⚠️ Unable to resolve wallet.getAddress()', error)
    }
  }

  return null
}

const isSameAddress = (a, b) => {
  if (!a || !b) return false
  return lower(normalizeAddress(a)) === lower(normalizeAddress(b))
}

const findSigningWallet = (wallets, expectedAddress) => {
  if (!expectedAddress) return null
  const normalized = lower(expectedAddress)
  if (!Array.isArray(wallets) || !normalized) return null

  for (const wallet of wallets) {
    const walletAddress = lower(deriveWalletAddress(wallet))
    if (walletAddress && walletAddress === normalized) {
      return wallet
    }
  }

  return null
}

const normaliseSignature = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Uint8Array) return bs58.encode(value)
  if (Array.isArray(value)) return bs58.encode(Uint8Array.from(value))
  if (typeof value === 'object') {
    if (value.signature) return normaliseSignature(value.signature)
    if (value.data) return normaliseSignature(value.data)
  }
  return null
}

const resolveChain = (chain) => {
  if (typeof chain === 'string' && chain.trim().length > 0) {
    return chain
  }
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet').toLowerCase()
  if (network.includes('devnet')) return 'solana:devnet'
  if (network.includes('testnet')) return 'solana:testnet'
  return 'solana:mainnet'
}

export const determinePrivyyWallet = ({ privyUser, wallets }) => {
  const addresses = collectUserSolanaAddresses(privyUser)
  let primaryAddress = addresses[0] || null

  if (!primaryAddress && Array.isArray(wallets)) {
    for (const wallet of wallets) {
      const address = deriveWalletAddress(wallet)
      if (address) {
        primaryAddress = address
        break
      }
    }
  }

  const signingWallet = findSigningWallet(wallets, primaryAddress)

  return {
    address: primaryAddress,
    signingWallet,
    hasEmbeddedWallet: Boolean(
      privyUser?.wallet?.address && lower(privyUser.wallet.address) === lower(primaryAddress)
    ),
    candidateAddresses: addresses
  }
}

export const executePrivyyArenaEntry = async ({
  entryFeeUsd,
  privyUser,
  wallets,
  signAndSendTransaction,
  chain,
  usdPerSol,
  serverWalletAddress,
  privyOptions,
  feePercentage
}) => {
  if (!entryFeeUsd || Number(entryFeeUsd) <= 0) {
    return {
      success: false,
      error: 'Invalid entry fee amount provided for arena entry.'
    }
  }

  const resolved = determinePrivyyWallet({ privyUser, wallets })
  const userWalletAddress = resolved.address

  if (!userWalletAddress) {
    return {
      success: false,
      error: 'No Solana wallet is available. Connect or create a wallet before joining paid arenas.'
    }
  }

  const destinationWallet = serverWalletAddress || getServerWalletAddress()

  let transactionPackage
  try {
    transactionPackage = await buildEntryFeeTransaction({
      entryFeeUsd,
      userWalletAddress,
      serverWalletAddress: destinationWallet,
      usdPerSol
    })
  } catch (error) {
    console.error('❌ Failed to build Privyy arena entry transaction:', error)
    return {
      success: false,
      error: error?.message || 'Unable to build arena entry transaction.'
    }
  }

  const { transaction, serialized, fees, connection } = transactionPackage
  const targetChain = resolveChain(chain)

  const options = {
    uiOptions: {
      showWalletUIs: false,
      isCancellable: false,
      description: `TurfLoot arena entry – $${Number(entryFeeUsd).toFixed(2)}`
    },
    commitment: 'confirmed'
  }

  if (privyOptions && typeof privyOptions === 'object') {
    if (privyOptions.uiOptions) {
      options.uiOptions = { ...options.uiOptions, ...privyOptions.uiOptions }
    }
    Object.entries(privyOptions).forEach(([key, value]) => {
      if (key === 'uiOptions') return
      options[key] = value
    })
  }

  let signature = null
  let signingError = null
  let attemptedMethod = 'none'

  const buildPrivyRequest = () => {
    const request = {
      transaction: serialized,
      chain: targetChain,
      options
    }

    if (resolved.signingWallet) {
      request.wallet = resolved.signingWallet

      if (resolved.signingWallet.address && !request.address) {
        request.address = resolved.signingWallet.address
      }

      const walletIdentifier =
        resolved.signingWallet.id ||
        resolved.signingWallet.walletId ||
        resolved.signingWallet?.metadata?.id ||
        resolved.signingWallet?.clientId

      if (walletIdentifier && !request.walletId) {
        request.walletId = walletIdentifier
      }
    } else if (userWalletAddress) {
      request.address = userWalletAddress
    }

    if (!request.address && userWalletAddress) {
      request.address = userWalletAddress
    }

    return request
  }

  try {
    if (typeof signAndSendTransaction === 'function') {
      attemptedMethod = 'privy.signAndSendTransaction'
      const result = await signAndSendTransaction(buildPrivyRequest())
      signature = normaliseSignature(result)
    } else if (resolved.signingWallet && typeof resolved.signingWallet.signAndSendTransaction === 'function') {
      attemptedMethod = 'wallet.signAndSendTransaction'
      const result = await resolved.signingWallet.signAndSendTransaction(transaction, {
        chain: targetChain,
        sendOptions: { skipPreflight: false }
      })
      signature = normaliseSignature(result)
    } else {
      attemptedMethod = 'none'
      signingError = new Error('No compatible Privy signing method available.')
    }
  } catch (error) {
    signingError = error
  }

  if (!signature) {
    const failureError = signingError || new Error('No Privy transaction signing method available.')
    console.error('❌ Privyy signing failed:', {
      error: failureError,
      attemptedMethod,
      walletAddress: userWalletAddress,
      candidateAddresses: resolved.candidateAddresses,
      hasEmbeddedWallet: resolved.hasEmbeddedWallet
    })
    const message = failureError?.message || failureError?.toString?.() || 'Arena entry transaction was rejected.'
    const normalized = message.toLowerCase()
    const cancelled =
      normalized.includes('user rejected') ||
      normalized.includes('rejected the request') ||
      normalized.includes('cancelled') ||
      normalized.includes('canceled') ||
      normalized.includes('closed the modal') ||
      normalized.includes('failed to connect to wallet')

    return {
      success: false,
      cancelled,
      error: cancelled ? 'Transaction cancelled.' : message,
      details: {
        attemptedMethod,
        walletAddress: userWalletAddress,
        hasEmbeddedWallet: resolved.hasEmbeddedWallet,
        candidateAddresses: resolved.candidateAddresses
      }
    }
  }

  try {
    await confirmTransaction(connection, signature)
  } catch (error) {
    console.warn('⚠️ Confirmation error for Privyy arena entry transaction:', error)
  }

  const usdCosts = {
    currency: 'USD',
    entryFee: fees.entryFeeUsd,
    serverFee: fees.serverFeeUsd,
    totalCost: fees.totalUsd,
    feePercentage
  }

  const solCosts = {
    currency: 'SOL',
    entryFee: fees.entrySol,
    serverFee: fees.serverSol,
    totalCost: fees.totalSol,
    feePercentage
  }

  return {
    success: true,
    signature,
    fees,
    walletAddress: userWalletAddress,
    serverWalletAddress: destinationWallet,
    chain: targetChain,
    costs: {
      usd: usdCosts,
      sol: solCosts,
      entryFee: usdCosts.entryFee,
      serverFee: usdCosts.serverFee,
      totalCost: usdCosts.totalCost,
      currency: usdCosts.currency,
      feePercentage
    },
    feePercentage
  }
}

export const computeArenaEntryPreview = ({ entryFeeUsd, usdPerSol, feePercentage }) => {
  const fees = calculateFees(entryFeeUsd, usdPerSol)
  const appliedFeePercentage = typeof feePercentage === 'number' ? feePercentage : undefined
  return {
    fees,
    costs: {
      usd: {
        currency: 'USD',
        entryFee: fees.entryFeeUsd,
        serverFee: fees.serverFeeUsd,
        totalCost: fees.totalUsd,
        feePercentage: appliedFeePercentage
      },
      sol: {
        currency: 'SOL',
        entryFee: fees.entrySol,
        serverFee: fees.serverSol,
        totalCost: fees.totalSol,
        feePercentage: appliedFeePercentage
      }
    }
  }
}
