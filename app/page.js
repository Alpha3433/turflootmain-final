'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy, useCreateWallet } from '@privy-io/react-auth'
import {
  useWallets as useSolanaWallets,
  useSignTransaction,
  useSignAndSendTransaction,
  useFundWallet,
  useSolanaFundingPlugin
} from '@privy-io/react-auth/solana'
import bs58 from 'bs58'
import ServerBrowserModal from '../components/ServerBrowserModalNew'
import { executePrivyyArenaEntry } from '../lib/privyy/arenaEntry'
import { buildSolanaRpcEndpointList } from '../lib/paid/feeManager'

const getWalletAddress = (wallet) => {
  if (!wallet) {
    return undefined
  }

  if (typeof wallet.address === 'string') {
    return wallet.address
  }

  if (wallet.address) {
    try {
      if (typeof wallet.address.toBase58 === 'function') {
        const address = wallet.address.toBase58()
        if (address) {
          return address
        }
      }

      if (typeof wallet.address.toString === 'function') {
        const address = wallet.address.toString()
        if (address && address !== '[object Object]') {
          return address
        }
      }
    } catch (error) {
      console.warn('⚠️ Unable to normalize wallet.address value', error)
    }
  }

  if (typeof wallet.getAddress === 'function') {
    try {
      const address = wallet.getAddress()
      if (typeof address === 'string') {
        return address
      }
      if (address?.toBase58) {
        return address.toBase58()
      }
      if (typeof address?.toString === 'function') {
        const normalized = address.toString()
        if (normalized && normalized !== '[object Object]') {
          return normalized
        }
      }
    } catch (error) {
      console.warn('⚠️ Unable to resolve wallet.getAddress()', error)
    }
  }

  if (wallet.publicKey) {
    if (typeof wallet.publicKey === 'string') {
      return wallet.publicKey
    }

    try {
      if (typeof wallet.publicKey.toBase58 === 'function') {
        const address = wallet.publicKey.toBase58()
        if (address) {
          return address
        }
      }

      if (typeof wallet.publicKey.toString === 'function') {
        const address = wallet.publicKey.toString()
        if (address && address !== '[object Object]') {
          return address
        }
      }
    } catch (error) {
      console.warn('⚠️ Unable to normalize wallet.publicKey value', error)
    }
  }

  return undefined
}

const normalizeAddress = (address) =>
  typeof address === 'string' ? address.trim() : undefined

const isSolanaChain = (chainType) =>
  typeof chainType === 'string' && chainType.toLowerCase().startsWith('solana')

const isSolanaAddress = (address) =>
  typeof address === 'string' && !address.toLowerCase().startsWith('0x') && address.length >= 32

const isPrivyEmbeddedWallet = (wallet) => {
  if (!wallet) {
    return false
  }

  const clientType = (wallet.walletClientType || wallet.type || '').toLowerCase()
  if (clientType.includes('privy')) {
    return true
  }

  if (!wallet.connectorType && clientType.includes('embedded')) {
    return true
  }

  return false
}

export default function TurfLootTactical() {
  const router = useRouter()

  // Privy hooks - restored for authentication
  // Privy 3.0 hooks
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout
  } = usePrivy()
  const { createWallet } = useCreateWallet()
  const { wallets, ready: walletsReady } = useSolanaWallets()
  const { signTransaction } = useSignTransaction()
  const signAndSendTransactionResponse = useSignAndSendTransaction()
  const privySignAndSendTransaction = useMemo(() => {
    if (typeof signAndSendTransactionResponse === 'function') {
      return signAndSendTransactionResponse
    }

    if (
      signAndSendTransactionResponse &&
      typeof signAndSendTransactionResponse.signAndSendTransaction === 'function'
    ) {
      return signAndSendTransactionResponse.signAndSendTransaction
    }

    if (
      signAndSendTransactionResponse &&
      typeof signAndSendTransactionResponse.sendTransaction === 'function'
    ) {
      return signAndSendTransactionResponse.sendTransaction
    }

    if (
      signAndSendTransactionResponse &&
      typeof signAndSendTransactionResponse === 'object'
    ) {
      const firstFunctionKey = Object.keys(signAndSendTransactionResponse).find(
        (key) => typeof signAndSendTransactionResponse[key] === 'function'
      )

      if (firstFunctionKey) {
        return signAndSendTransactionResponse[firstFunctionKey]
      }
    }

    return undefined
  }, [signAndSendTransactionResponse])
  useSolanaFundingPlugin()

  const { fundWallet } = useFundWallet()

  const walletsRef = useRef([])
  const walletsReadyRef = useRef(false)
  
  // Debug what these hooks return
  useEffect(() => {
    if (typeof window !== 'undefined' && authenticated) {
      const signTxKeys = signTransaction ? Object.keys(signTransaction) : []
      const signAndSendValue = signAndSendTransactionResponse
      const signAndSendType = typeof signAndSendValue
      const signAndSendKeys =
        signAndSendValue && typeof signAndSendValue === 'object'
          ? Object.keys(signAndSendValue)
          : []
      
      console.log('🔍 Privy Hooks Debug:', {
        signTransactionType: typeof signTransaction,
        signAndSendTransactionType: signAndSendType,
        signTransactionKeys: signTxKeys,
        signAndSendKeys: signAndSendKeys,
        signTransactionFirstKey: signTxKeys[0],
        signAndSendFirstKey: signAndSendKeys[0],
        signTransactionFn: signTransaction?.[signTxKeys[0]],
        signAndSendFn:
          signAndSendType === 'function'
            ? signAndSendValue
            : signAndSendValue?.[signAndSendKeys[0]]
      })
    }
  }, [signTransaction, signAndSendTransactionResponse, authenticated])
  
  // Get embedded Privy wallet
  const embeddedWallet = useMemo(() => {
    return wallets?.find(w => w.walletClientType === 'privy')
  }, [wallets])
  
  // Get embedded Privy wallet from useWallets
  const privyEmbeddedWallet = useMemo(() => {
    return wallets?.find(w => w.walletClientType === 'privy' || w.connectorType === 'embedded')
  }, [wallets])

  useEffect(() => {
    walletsRef.current = Array.isArray(wallets) ? [...wallets] : []
  }, [wallets])

  useEffect(() => {
    walletsReadyRef.current = !!walletsReady
  }, [walletsReady])

  // Debug log
  useEffect(() => {
    if (typeof window !== 'undefined' && authenticated) {
      console.log('🔍 Privy Wallet Debug:', {
        walletsCount: wallets?.length,
        wallets: wallets?.map(w => ({
          name: w.name,
          walletClientType: w.walletClientType,
          connectorType: w.connectorType,
          address: w.address
        })),
        privyEmbeddedWallet: privyEmbeddedWallet ? {
          address: privyEmbeddedWallet.address,
          walletClientType: privyEmbeddedWallet.walletClientType
        } : null,
        ready,
        walletsReady,
        authenticated
      })
    }
  }, [wallets, privyEmbeddedWallet, authenticated, ready, walletsReady])
  const walletAddressesSignature = useMemo(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return ''
    }

    const addresses = []

    // Include Privy embedded wallet exposed on privyUser.wallet (Privy 3.0)
    if (privyUser?.wallet?.address) {
      addresses.push(privyUser.wallet.address)
    }

    // Add addresses from embedded wallets (linkedAccounts)
    if (privyUser?.linkedAccounts) {
      privyUser.linkedAccounts
        .filter(account => account?.type === 'wallet' && account?.address)
        .forEach(account => addresses.push(account.address))
    }

    // Remove duplicates and join
    return [...new Set(addresses)].join('|')
  }, [privyUser])
  
  // LOYALTY SYSTEM STATE
  const [loyaltyData, setLoyaltyData] = useState(null)
  const [tierUpgradeNotification, setTierUpgradeNotification] = useState(null)
  
  // CASH OUT NOTIFICATIONS STATE
  const [cashOutNotifications, setCashOutNotifications] = useState([])
  
  // Loyalty code moved to after state declarations to fix initialization error
  
  // PAID ROOMS SYSTEM - Balance checking and validation with dynamic server fees
  
  const parseStakeAmount = (stakeString) => {
    // Convert stake string to USD number (e.g., "$0.02" -> 0.02, "$0.50" -> 0.50, "$0.65" -> 0.65)
    return parseFloat(stakeString.replace('$', '')) || 0
  }
  
  // Calculate total cost including dynamic server fee based on loyalty tier
  const calculateTotalCost = (entryFee, feePercentageOverride = null, options = {}) => {
    const defaultFeePercentage = loyaltyData?.feePercentage ?? 10
    const feePercentage = feePercentageOverride ?? defaultFeePercentage
    return calculatePaidRoomCosts(entryFee, feePercentage, options)
  }

  const SOLANA_RPC_ENDPOINTS = useMemo(
    () =>
      buildSolanaRpcEndpointList({
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta',
        privateRpc:
          process.env.NEXT_PUBLIC_SOLANA_PRIVATE_RPC ||
          process.env.NEXT_PUBLIC_SOLANA_HELIUS_RPC ||
          process.env.NEXT_PUBLIC_SOLANA_RPC_PRIVATE ||
          process.env.NEXT_PUBLIC_SOLANA_RPC_HELIUS ||
          process.env.NEXT_PUBLIC_HELIUS_RPC ||
          (process.env.NEXT_PUBLIC_HELIUS_API_KEY
            ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
            : undefined),
        primary: process.env.NEXT_PUBLIC_SOLANA_RPC || process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
        list: process.env.NEXT_PUBLIC_SOLANA_RPC_LIST,
        fallbacks: process.env.NEXT_PUBLIC_SOLANA_RPC_FALLBACKS
      }),
    []
  )
  const USD_PER_SOL_FALLBACK = parseFloat(process.env.NEXT_PUBLIC_USD_PER_SOL || '150')
  const SOLANA_CHAIN = useMemo(() => {
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta').toLowerCase()
    if (network.startsWith('solana:')) {
      return network
    }
    if (network === 'devnet') {
      return 'solana:devnet'
    }
    if (network === 'testnet') {
      return 'solana:testnet'
    }
    return 'solana:mainnet'
  }, [])

  // 🚀 Privy 3.0: Auto-create embedded Solana wallet on login
  useEffect(() => {
    if (!authenticated || !privyUser || !ready) return
    
    // Check if user already has embedded Solana wallet
    const hasSolanaWallet = privyUser.linkedAccounts?.some(
      account => account.type === 'wallet' && account.chainType === 'solana'
    )
    
    if (hasSolanaWallet) {
      const wallet = privyUser.linkedAccounts.find(
        account => account.type === 'wallet' && account.chainType === 'solana'
      )
      console.log('✅ Privy embedded Solana wallet ready:', wallet.address)
      return
    }
    
    // Create embedded Solana wallet
    console.log('🔨 Creating Privy embedded Solana wallet...')
    createWallet({ chainType: 'solana' })
      .then(wallet => {
        console.log('✅ Embedded wallet created:', wallet.address)
      })
      .catch(error => {
        console.error('❌ Failed to create wallet:', error)
      })
  }, [authenticated, privyUser, ready, createWallet])

  // 🚀 Paid Room Entry: Deduct SOL from embedded wallet based on room cost
  const deductRoomFees = async (roomCostUsd, _userWalletAddress = null, feePercentageOverride = null) => {
    console.log('💰 Starting Privy SOL Payment')
    console.log('   Room Cost: $' + roomCostUsd)

    try {
      // Get embedded wallet address
      const embeddedWallet = privyUser?.linkedAccounts?.find(
        account => account.type === 'wallet' && account.chainType === 'solana'
      )

      if (!embeddedWallet) {
        throw new Error('No Solana wallet found')
      }

      const userWalletAddress = embeddedWallet.address
      console.log('   From Wallet:', userWalletAddress)

      // Import Solana libraries
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
      
      // Setup connection
      const heliusRpc = process.env.NEXT_PUBLIC_HELIUS_RPC || 'https://mainnet.helius-rpc.com/?api-key=solana-gaming'
      const connection = new Connection(heliusRpc, 'confirmed')
      console.log('✅ Connected to Solana')

      // CRITICAL: Solana rent-exempt minimum (~0.00089088 SOL must remain in account)
      const RENT_EXEMPT_MINIMUM = 890880 // lamports (~0.00089088 SOL)
      const TRANSACTION_FEE_ESTIMATE = 5000 // lamports (~0.000005 SOL) - safety buffer
      const MINIMUM_RESERVE = RENT_EXEMPT_MINIMUM + TRANSACTION_FEE_ESTIMATE // Total we must keep in account
      
      console.log('🔒 Solana Account Requirements:')
      console.log('   Rent-Exempt Minimum:', (RENT_EXEMPT_MINIMUM / LAMPORTS_PER_SOL).toFixed(8), 'SOL')
      console.log('   Transaction Fee Buffer:', (TRANSACTION_FEE_ESTIMATE / LAMPORTS_PER_SOL).toFixed(8), 'SOL')
      console.log('   Total Reserve Required:', (MINIMUM_RESERVE / LAMPORTS_PER_SOL).toFixed(8), 'SOL')

      // Check current balance
      const fromPubkey = new PublicKey(userWalletAddress)
      const currentBalanceLamports = await connection.getBalance(fromPubkey)
      const currentBalanceSol = currentBalanceLamports / LAMPORTS_PER_SOL
      
      console.log('💰 Current Balance:', currentBalanceSol.toFixed(8), 'SOL')
      console.log('   Available to spend:', ((currentBalanceLamports - MINIMUM_RESERVE) / LAMPORTS_PER_SOL).toFixed(8), 'SOL')

      // Calculate SOL amount for payment
      const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS || 'GrYLV9QSnkDwEQ3saypgM9LLHwE36QPZrYCRJceyQfTa'
      const USD_PER_SOL = 18.18 // Adjusted to give ~0.0011 SOL for $0.02 stake
      const solAmount = roomCostUsd / USD_PER_SOL
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL)
      
      console.log('💵 Payment Details:')
      console.log('   SOL Amount:', solAmount.toFixed(6), 'SOL')
      console.log('   Lamports:', lamports)
      console.log('   To Platform:', platformWallet)

      // CRITICAL CHECK: Ensure we're not violating rent-exempt minimum
      const remainingBalance = currentBalanceLamports - lamports - TRANSACTION_FEE_ESTIMATE
      
      if (remainingBalance < RENT_EXEMPT_MINIMUM) {
        const shortfall = (RENT_EXEMPT_MINIMUM - remainingBalance) / LAMPORTS_PER_SOL
        const neededTotal = (lamports + MINIMUM_RESERVE) / LAMPORTS_PER_SOL
        
        console.error('❌ Transaction would violate rent-exempt minimum!')
        console.error('   Current balance:', currentBalanceSol.toFixed(8), 'SOL')
        console.error('   Trying to send:', solAmount.toFixed(8), 'SOL')
        console.error('   Would remain:', (remainingBalance / LAMPORTS_PER_SOL).toFixed(8), 'SOL')
        console.error('   Minimum required:', (RENT_EXEMPT_MINIMUM / LAMPORTS_PER_SOL).toFixed(8), 'SOL')
        console.error('   Shortfall:', shortfall.toFixed(8), 'SOL')
        
        throw new Error(
          `Insufficient balance. You need at least ${neededTotal.toFixed(6)} SOL total (${solAmount.toFixed(6)} SOL for room + ${(MINIMUM_RESERVE / LAMPORTS_PER_SOL).toFixed(6)} SOL minimum balance). ` +
          `Current balance: ${currentBalanceSol.toFixed(6)} SOL. Please deposit at least ${shortfall.toFixed(6)} more SOL.`
        )
      }
      
      console.log('✅ Balance check passed - sufficient funds available')
      console.log('   After transaction:', (remainingBalance / LAMPORTS_PER_SOL).toFixed(8), 'SOL will remain')

      // Build transaction
      const toPubkey = new PublicKey(platformWallet)
      
      const transferIx = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports
      })

      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey
      }).add(transferIx)

      // Serialize transaction - CRITICAL: Must be Uint8Array for Privy
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })
      
      // Force convert to proper Uint8Array (not Buffer)
      const txBytes = Uint8Array.from(serializedTx)
      
      console.log('📦 Transaction ready:', txBytes.length, 'bytes (Uint8Array)')

      // Sign and send with Privy v3.0 - Use hook method directly
      console.log('🔐 Signing with Privy v3.0...')
      console.log('   Hook available:', !!privySignAndSendTransaction)
      
      if (!privySignAndSendTransaction) {
        throw new Error('Privy signAndSendTransaction hook not available')
      }
      
      // Get the embedded wallet object from useWallets  
      const embeddedWalletObj = wallets.find(w => {
        const addr = w.address || w.publicKey?.toString() || w.publicKey?.toBase58?.()
        return addr === userWalletAddress
      })
      
      console.log('   Wallet for signing:', embeddedWalletObj ? 'Found' : 'Not found')
      
      if (!embeddedWalletObj) {
        throw new Error('Embedded wallet not found for transaction signing')
      }
      
      console.log('🚀 Attempting Privy transaction signature...')
      
      // Use Privy v3.0 hook method with wallet context
      const result = await privySignAndSendTransaction({
        transaction: txBytes,
        wallet: embeddedWalletObj
      })
      
      const signature = result.signature || result
      console.log('✅ Privy transaction result:', signature)
      
      console.log('✅ Transaction sent! Signature:', signature)

      // Confirm on-chain
      try {
        await connection.confirmTransaction(signature, 'confirmed')
        console.log('✅ Confirmed on Solana blockchain')
      } catch (confirmError) {
        console.warn('⚠️ Confirmation pending')
      }

      // Update balance
      const currentSolBalance = parseFloat(walletBalance?.sol) || 0
      const updatedSolBalance = Math.max(0, currentSolBalance - solAmount)
      const updatedUsdBalance = updatedSolBalance * USD_PER_SOL

      setWalletBalance({
        sol: updatedSolBalance.toFixed(6),
        usd: updatedUsdBalance.toFixed(2),
        loading: false
      })

      return {
        success: true,
        signature,
        fees: {
          totalSol: solAmount,
          totalUsd: roomCostUsd
        },
        costs: {
          totalCost: roomCostUsd
        },
        newBalance: updatedUsdBalance,
        newBalanceSol: updatedSolBalance
      }
    } catch (error) {
      console.error('❌ Privy payment failed:', error)
      
      // Handle specific wallet balance errors
      let errorMessage = 'Transaction failed'
      if (error.message && error.message.includes('getBalance')) {
        errorMessage = 'Wallet balance check failed. Please ensure your wallet is properly connected and try again.'
      } else if (error.message && error.message.includes('signAndSendTransaction')) {
        errorMessage = 'Transaction signing failed. Please ensure your wallet is unlocked and try again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }
  // SMART MATCHMAKING SYSTEM with HATHORA INTEGRATION
  // ========================================
  // REMOVED: findOrCreateRoom - REPLACED WITH HATHORA-FIRST ARCHITECTURE
  // All multiplayer games now use initializeHathoraGame() directly
  // ========================================
  
  const checkSufficientFunds = (requiredAmount) => {
    const currentBalance = parseFloat(walletBalance.usd) || 0
    console.log(`💰 Balance check: Required $${requiredAmount}, Available $${currentBalance}`)
    return currentBalance >= requiredAmount
  }
  
  const showInsufficientFundsNotification = (requiredAmount, currentBalance) => {
    const notification = {
      requiredAmount,
      currentBalance,
      timestamp: Date.now()
    }
    
    console.log(`🚫 Insufficient funds: Need $${requiredAmount}, Have $${currentBalance}`)
    setInsufficientFundsNotification(notification)
    
    // Auto-hide notification after 8 seconds
    setTimeout(() => {
      setInsufficientFundsNotification(null)
    }, 8000)
  }
  
  const validatePaidRoom = (actionName = 'join paid room') => {
    // Get room cost (no additional fees, just the direct cost)
    const roomCost = parseStakeAmount(selectedStake)
    const currentBalance = parseFloat(walletBalance.usd) || 0
    
    console.log(`💰 Validating paid room access for ${actionName}:`)
    console.log(`   Room Cost: $${roomCost.toFixed(2)}`)
    console.log(`   Current Balance: $${currentBalance.toFixed(2)}`)
    
    if (currentBalance < roomCost) {
      console.log(`❌ Insufficient funds: Need $${roomCost.toFixed(2)}, have $${currentBalance.toFixed(2)}`)
      
      // Simple notification showing room cost
      const message = `💰 Insufficient Balance\n\nRequired for ${selectedStake} room: $${roomCost.toFixed(2)}\nYour Balance: $${currentBalance.toFixed(2)}\nShortfall: $${(roomCost - currentBalance).toFixed(2)}\n\nPlease deposit more SOL to play.`
      
      alert(message)
      return false
    }
    
    console.log(`✅ Sufficient funds for ${actionName}: $${currentBalance.toFixed(2)} >= $${roomCost.toFixed(2)}`)
    return true
  }

  // STEP 1: Watch authentication and find wallet address
  const findWalletAddress = () => {
    if (!authenticated || !privyUser) {
      console.log('👛 findWalletAddress: User not authenticated')
      return null
    }

    console.log('🔍 findWalletAddress: Starting search for Solana wallet...')
    console.log('🔍 findWalletAddress: privyUser.id =', privyUser?.id)

    // Privy 3.0: Embedded wallets are exposed via privyUser.wallet
    if (privyUser?.wallet?.address) {
      const embeddedAddress = normalizeAddress(privyUser.wallet.address)
      const chainHint = privyUser.wallet.chainType || privyUser.wallet.walletClientType || privyUser.wallet.type
      const isSolanaWallet =
        isSolanaAddress(embeddedAddress) ||
        (typeof chainHint === 'string' && chainHint.toLowerCase().includes('solana'))

      console.log('🔍 findWalletAddress: privyUser.wallet exists:', {
        address: embeddedAddress,
        chainHint: chainHint,
        isSolanaAddress: isSolanaAddress(embeddedAddress),
        isSolanaWallet: isSolanaWallet
      })

      if (embeddedAddress && isSolanaWallet) {
        console.log('✅ findWalletAddress: Found Privy embedded Solana wallet:', embeddedAddress)
        return embeddedAddress
      }

      console.log('ℹ️ findWalletAddress: Embedded wallet found but NOT recognized as Solana:', {
        address: embeddedAddress,
        chainType: privyUser.wallet.chainType,
        walletClientType: privyUser.wallet.walletClientType,
        type: privyUser.wallet.type
      })
    } else {
      console.log('ℹ️ findWalletAddress: privyUser.wallet does not exist or has no address')
    }

    // Privy 3.0: Check embedded wallets in linkedAccounts (embedded wallets don't appear in useWallets)
    console.log('🔍 findWalletAddress: Checking linkedAccounts, count:', privyUser?.linkedAccounts?.length || 0)
    
    const linkedSolana = privyUser?.linkedAccounts?.find(
      account =>
        account?.type === 'wallet' &&
        account?.address &&
        (account?.chainType === 'solana' || isSolanaAddress(account?.address))
    )

    if (linkedSolana?.address) {
      console.log('✅ findWalletAddress: Found embedded Solana wallet in linkedAccounts:', linkedSolana.address)
      return linkedSolana.address
    }

    console.log('❌ findWalletAddress: No Solana wallet found')
    console.log('🧪 findWalletAddress: Full debug info:', {
      embeddedWallet: privyUser?.wallet ? {
        address: privyUser.wallet.address,
        chainType: privyUser.wallet.chainType,
        walletClientType: privyUser.wallet.walletClientType,
        type: privyUser.wallet.type
      } : 'NO EMBEDDED WALLET',
      linkedAccountsCount: privyUser?.linkedAccounts?.length || 0,
      linkedAccounts: privyUser?.linkedAccounts?.map(a => ({
        type: a.type,
        chainType: a.chainType,
        address: a.address ? `${a.address.substring(0, 8)}...` : 'NO ADDRESS'
      }))
    })
    return null
  }

  useEffect(() => {
    if (ready && typeof window !== 'undefined') {
      console.log('🔧 Privy 3.0 - Debug Info (Embedded Wallets):', {
        ready,
        authenticated,
        privyUser: privyUser ? {
          id: privyUser.id,
          wallets: privyUser.linkedAccounts?.filter(account => account.type === 'wallet'),
          hasEmbeddedWallet: !!privyUser.wallet,
          embeddedWalletAddress: privyUser.wallet?.address,
          embeddedWalletChainType: privyUser.wallet?.chainType || privyUser.wallet?.walletClientType,
          linkedAccountsCount: privyUser.linkedAccounts?.length || 0,
          allLinkedAccounts: privyUser.linkedAccounts?.map(acc => ({
            type: acc.type,
            address: acc.address,
            chainType: acc.chainType,
            walletClientType: acc.walletClientType
          }))
        } : null
      })
      
      // Log the specific Solana wallet we're looking for
      console.log('🎯 Looking for Solana wallet: F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG')
      
      // Check if wallet exists in linked accounts
      if (privyUser?.linkedAccounts) {
        const solanaAccounts = privyUser.linkedAccounts.filter(acc =>
          acc.type === 'wallet' &&
          (isSolanaChain(acc.chainType) || acc.address === 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG') &&
          isSolanaAddress(acc.address)
        )
        console.log('🔍 Solana accounts found in linkedAccounts:', solanaAccounts)
      }
      
      // Check if wallet exists in user.wallet (embedded)
      if (privyUser?.wallet) {
        console.log('💳 Embedded wallet info:', {
          address: privyUser.wallet.address,
          chainType: privyUser.wallet.chainType || 'ethereum', // default
          walletClientType: privyUser.wallet.walletClientType
        })
      }
    }
  }, [ready, authenticated, privyUser])
  
  // Real-time Solana balance tracking
  const [selectedStake, setSelectedStake] = useState('$0.02')
  const [liveStats, setLiveStats] = useState({ players: 0, winnings: 0 })
  const [userName, setUserName] = useState('PLAYER')
  const [isMobile, setIsMobile] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0) // Force re-render for responsive positioning
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 })
  
  // Orientation state for mobile
  const [showOrientationModal, setShowOrientationModal] = useState(false)
  const [pendingGameUrl, setPendingGameUrl] = useState(null)
  const [orientationModalLoading, setOrientationModalLoading] = useState(false)
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false)
  const [desktopWithdrawalModalVisible, setDesktopWithdrawalModalVisible] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [activeFriends, setActiveFriends] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [customUsername, setCustomUsername] = useState('')
  const [serverSelectorOpen, setServerSelectorOpen] = useState(false)
  const [selectedServer, setSelectedServer] = useState('') // Start empty, will be set by API
  const [serverOptions, setServerOptions] = useState([])
  const [serverDataLoading, setServerDataLoading] = useState(false)
  
  // Fetch real-time server data
  const fetchServerData = async () => {
    setServerDataLoading(true)
    try {
      const response = await fetch('/api/servers')
      if (response.ok) {
        const data = await response.json()
        console.log('📡 Fetched server data:', data)
        
        // Transform the server data into our selector format with grouped regions
        const transformedServers = data.servers?.map(server => {
          // Map specific regions to broader geographic groups
          const getRegionGroup = (regionId) => {
            const region = regionId?.toLowerCase() || ''
            
            if (region.includes('washington') || region.includes('seattle') || region.includes('chicago') || region.includes('us-')) {
              return { code: 'US', name: 'United States' }
            } else if (region.includes('london') || region.includes('frankfurt') || region.includes('eu-') || region.includes('europe')) {
              return { code: 'EU', name: 'Europe' }
            } else if (region.includes('sydney') || region.includes('australia') || region.includes('oceania')) {
              return { code: 'OCE', name: 'Oceania' }
            } else if (region.includes('singapore') || region.includes('tokyo') || region.includes('mumbai') || region.includes('asia')) {
              return { code: 'SEA', name: 'Asia Pacific' }
            } else {
              return { code: 'GLOBAL', name: 'Global' }
            }
          }
          
          const regionGroup = getRegionGroup(server.regionId)
          
          return {
            code: regionGroup.code,
            name: regionGroup.name,
            ping: server.ping || 0,
            players: server.players || 0,
            status: server.status || 'online'
          }
        }) || []
        
        // Add some additional mock regions if needed
        const defaultServers = [
          { code: 'US', name: 'United States', ping: 12, players: 24, status: 'online' },
          { code: 'EU', name: 'Europe', ping: 28, players: 18, status: 'online' },
          { code: 'OCE', name: 'Oceania', ping: 45, players: 8, status: 'online' },
          { code: 'SEA', name: 'Asia Pacific', ping: 67, players: 12, status: 'online' }
        ]
        
        // Use real data if available, otherwise fall back to defaults
        const finalServerOptions = transformedServers.length > 0 ? transformedServers : defaultServers
        setServerOptions(finalServerOptions)
        
        // Update selected server to the first available server from real data
        if (finalServerOptions.length > 0) {
          setSelectedServer(finalServerOptions[0].code)
        }
      } else {
        console.warn('Failed to fetch server data, using fallback')
        // Fallback to default servers
        const fallbackServers = [
          { code: 'US', name: 'United States', ping: 12, players: 24, status: 'online' },
          { code: 'EU', name: 'Europe', ping: 28, players: 18, status: 'online' },
          { code: 'OCE', name: 'Oceania', ping: 45, players: 8, status: 'online' },
          { code: 'SEA', name: 'Asia Pacific', ping: 67, players: 12, status: 'online' }
        ]
        setServerOptions(fallbackServers)
        setSelectedServer(fallbackServers[0].code)
      }
    } catch (error) {
      console.error('Error fetching server data:', error)
      // Fallback to default servers on error
      const errorFallbackServers = [
        { code: 'US', name: 'United States', ping: 12, players: 24, status: 'online' },
        { code: 'EU', name: 'Europe', ping: 28, players: 18, status: 'online' },
        { code: 'OCE', name: 'Oceania', ping: 45, players: 8, status: 'online' },
        { code: 'SEA', name: 'Asia Pacific', ping: 67, players: 12, status: 'online' }
      ]
      setServerOptions(errorFallbackServers)
      setSelectedServer(errorFallbackServers[0].code)
    } finally {
      setServerDataLoading(false)
    }
  }
  
  // Fetch server data on component mount and refresh every 30 seconds
  useEffect(() => {
    fetchServerData()
    const interval = setInterval(fetchServerData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])
  
  // Sync Privy authentication state with local state
  useEffect(() => {
    if (ready) {
      console.log('🔍 Privy state updated:', { authenticated, user: privyUser?.id })
      setIsAuthenticated(authenticated)
      setUser(privyUser)
      
      // Update username from Privy user data
      if (privyUser) {
        const privyUsername = privyUser.email?.address || 
                             privyUser.phone?.number || 
                             privyUser.wallet?.address?.slice(0, 8) || 
                             'PLAYER'
        setUserName(privyUsername.toUpperCase())
      }
    }
  }, [ready, authenticated, privyUser])

  // Fetch loyalty data with fallback (moved here to fix initialization error)
  useEffect(() => {
    const fetchLoyaltyData = async () => {
      if (!isAuthenticated || !privyUser) return
      
      try {
        const userIdentifier = privyUser.wallet?.address || privyUser.id
        const response = await fetch(`/api/loyalty?userIdentifier=${userIdentifier}`)
        if (response.ok) {
          const data = await response.json()
          setLoyaltyData(data)
        } else {
          // For authenticated users, show real starting values (not mock data)
          console.log('🔄 Database unavailable - showing actual account starting state')
          
          // Use real account starting values (0 games, $0 wagered for new accounts)
          const realUserStats = { gamesPlayed: 0, totalWagered: 0 }
          
          const mockResponse = await fetch('/api/loyalty/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'calculate_tier',
              userStats: realUserStats
            })
          })
          if (mockResponse.ok) {
            const realData = await mockResponse.json()
            setLoyaltyData(realData)
          }
        }
      } catch (error) {
        console.error('Error fetching loyalty data:', error)
        // Set realistic starting values for authenticated user account
        const actualGamesPlayed = 0 // Real account starting point
        const actualTotalWagered = 0 // Real account starting point
        
        setLoyaltyData({
          currentTier: 'BRONZE',
          feePercentage: 10,
          tierInfo: {
            name: 'Bronze',
            feePercentage: 10,
            color: '#CD7F32',
            icon: '🥉',
            benefits: ['Standard gameplay', '10% server fee']
          },
          progress: {
            currentTier: 'BRONZE',
            nextTier: 'SILVER',
            progress: {
              gamesProgress: { 
                current: actualGamesPlayed, 
                required: 50, 
                percentage: (actualGamesPlayed / 50) * 100 
              },
              wageredProgress: { 
                current: actualTotalWagered, 
                required: 100, 
                percentage: (actualTotalWagered / 100) * 100 
              }
            },
            isMaxTier: false
          },
          userStats: { 
            gamesPlayed: actualGamesPlayed, 
            totalWagered: actualTotalWagered 
          }
        })
      }
    }
    
    if (isAuthenticated && privyUser) {
      fetchLoyaltyData()
    }
  }, [isAuthenticated, privyUser])
  
  // Update loyalty stats after a PAID game only (not practice games)
  const updateLoyaltyStats = async (gameData) => {
    if (!isAuthenticated || !privyUser) return
    
    // Only track paid games for loyalty progression
    if (!gameData.isPaidGame || gameData.stake <= 0) {
      console.log('🎯 Skipping loyalty update - practice game or no stake')
      return
    }
    
    try {
      const userIdentifier = privyUser.wallet?.address || privyUser.id
      const response = await fetch('/api/loyalty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIdentifier,
          gameData: {
            ...gameData,
            gameType: 'paid',
            stake: gameData.stake || 0
          }
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('💰 Paid game loyalty stats updated:', result)
        
        // Update local loyalty data with new stats
        setLoyaltyData(prev => ({
          ...prev,
          userStats: result.userStats,
          currentTier: result.newTier,
          feePercentage: result.feePercentage,
          progress: result.progress
        }))
        
        // Show tier upgrade notification if applicable
        if (result.tierUpgrade.isUpgrade) {
          setTierUpgradeNotification(result)
        }
      }
    } catch (error) {
      console.error('Error updating paid game loyalty stats:', error)
    }
  }
  
  // Demo function to simulate completing a paid game (for testing)
  const simulatePaidGameCompletion = async (stakeAmount = 5) => {
    if (!isAuthenticated || !privyUser) return
    
    console.log(`🎮 Simulating paid game completion with $${stakeAmount} stake`)
    
    await updateLoyaltyStats({
      isPaidGame: true,
      stake: stakeAmount,
      gameResult: 'completed',
      duration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
      timestamp: Date.now()
    })
  }

  // Challenge tracking system
  const updateChallengeProgress = (challengeType, amount = 1) => {
    try {
      // Get user-specific key
      const userKey = isAuthenticated ? 
        `challenges_${(user?.wallet?.address || user?.email?.address || user?.id || 'guest').substring(0, 10)}` :
        'challenges_guest'
      
      // Load current challenges
      let challengesData = {}
      try {
        const saved = localStorage.getItem(userKey)
        challengesData = saved ? JSON.parse(saved) : {}
      } catch (error) {
        console.error('Error loading challenges for update:', error)
      }

      // Map challenge types to challenge IDs
      const challengeMapping = {
        'coins_eaten': 'eat_50_coins',
        'survival_time': 'survive_5_minutes',
        'max_mass': 'reach_mass_200',
        'cashout': 'cashout_5_times',
        'eliminations': 'eliminate_50_players'
      }

      const challengeId = challengeMapping[challengeType]
      if (!challengeId) return

      // Update progress
      if (!challengesData[challengeId]) {
        challengesData[challengeId] = { current: 0, completed: false, claimed: false }
      }

      // For max_mass, set to highest value achieved, for others, increment
      if (challengeType === 'max_mass') {
        challengesData[challengeId].current = Math.max(challengesData[challengeId].current, amount)
      } else if (challengeType === 'survival_time') {
        challengesData[challengeId].current = Math.max(challengesData[challengeId].current, amount)
      } else {
        challengesData[challengeId].current = (challengesData[challengeId].current || 0) + amount
      }

      // Check completion based on targets
      const targets = {
        'eat_50_coins': 50,
        'survive_5_minutes': 300, // 5 minutes in seconds
        'reach_mass_200': 200,
        'cashout_5_times': 5,
        'eliminate_50_players': 50
      }

      if (challengesData[challengeId].current >= targets[challengeId]) {
        challengesData[challengeId].completed = true
      }

      // Save updated data
      localStorage.setItem(userKey, JSON.stringify(challengesData))
      
      console.log(`📈 Challenge updated: ${challengeType} = ${challengesData[challengeId].current}`)
      
      // Check if challenge was just completed for notification
      if (challengesData[challengeId].completed && !challengesData[challengeId].notified) {
        challengesData[challengeId].notified = true
        localStorage.setItem(userKey, JSON.stringify(challengesData))
        
        // Show completion notification
        const challengeNames = {
          'eat_50_coins': 'Coin Collector',
          'survive_5_minutes': 'Survivor',
          'reach_mass_200': 'Growing Strong',
          'cashout_5_times': 'Cash Master',
          'eliminate_50_players': 'Executioner'
        }
        
        const rewards = {
          'eat_50_coins': 100,
          'survive_5_minutes': 150,
          'reach_mass_200': 200,
          'cashout_5_times': 250,
          'eliminate_50_players': 750
        }

        // Show notification toast
        if (typeof document === 'undefined') return
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          top: 100px;
          right: 20px;
          background: linear-gradient(45deg, rgba(104, 211, 145, 0.95) 0%, rgba(72, 187, 120, 0.95) 100%);
          border: 2px solid #68d391;
          border-radius: 12px;
          padding: 16px 20px;
          max-width: 300px;
          z-index: 9999;
          box-shadow: 0 8px 32px rgba(104, 211, 145, 0.4);
          backdrop-filter: blur(10px);
          animation: slideInFromRight 0.5s ease-out;
          font-family: "Rajdhani", sans-serif;
          color: white;
        `
        
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">🎉</div>
            <div>
              <div style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">
                Challenge Completed!
              </div>
              <div style="font-size: 14px; opacity: 0.9;">
                ${challengeNames[challengeId]} - +${rewards[challengeId]} coins
              </div>
            </div>
          </div>
        `
        
        if (typeof document !== 'undefined') {
          document.body.appendChild(notification)
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove()
          }
        }, 5000)
        
        console.log(`🎉 Challenge completed: ${challengeNames[challengeId]} (+${rewards[challengeId]} coins)`)
      }

    } catch (error) {
      console.error('Error updating challenge progress:', error)
    }
  }

  // Challenge carousel state
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0)

  // Expose challenge update function for game integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.updateChallengeProgress = updateChallengeProgress
      console.log('🎯 Challenge tracking system initialized')
      console.log('Usage: window.updateChallengeProgress("coins_eaten", 1)')
      console.log('       window.updateChallengeProgress("survival_time", seconds)')
      console.log('       window.updateChallengeProgress("max_mass", mass)')
      console.log('       window.updateChallengeProgress("cashout")')
    }
  }, [isAuthenticated, user])

  // Cash Out Notifications System
  useEffect(() => {
    const countries = [
      '🇺🇸 USA', '🇨🇦 Canada', '🇬🇧 UK', '🇩🇪 Germany', '🇫🇷 France', 
      '🇮🇹 Italy', '🇪🇸 Spain', '🇦🇺 Australia', '🇯🇵 Japan', '🇰🇷 Korea',
      '🇧🇷 Brazil', '🇲🇽 Mexico', '🇳🇱 Netherlands', '🇸🇪 Sweden', '🇳🇴 Norway',
      '🇩🇰 Denmark', '🇫🇮 Finland', '🇨🇭 Switzerland', '🇦🇹 Austria', '🇧🇪 Belgium'
    ]
    
    const cashOutAmounts = [1, 5, 10, 20, 25, 50, 75, 100, 150, 200]
    const playerNames = [
      'CryptoKing', 'SniperElite', 'NinjaWarrior', 'DiamondHands', 'MoonRocket',
      'GameMaster', 'PixelHunter', 'StealthMode', 'TechNinja', 'CyberWolf',
      'QuantumGamer', 'NeonBlade', 'VortexPlayer', 'PhantomStrike', 'CosmicRider'
    ]
    
    const generateNotification = () => {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)]
      const randomAmount = cashOutAmounts[Math.floor(Math.random() * cashOutAmounts.length)]
      const randomPlayer = playerNames[Math.floor(Math.random() * playerNames.length)]
      
      const notification = {
        id: Date.now() + Math.random(),
        player: randomPlayer,
        country: randomCountry,
        amount: randomAmount,
        timestamp: Date.now()
      }
      
      setCashOutNotifications(prev => {
        const newNotifications = [notification, ...prev.slice(0, 4)] // Keep max 5 notifications
        return newNotifications
      })
      
      // Auto-remove notification after 8 seconds
      setTimeout(() => {
        setCashOutNotifications(prev => 
          prev.filter(n => n.id !== notification.id)
        )
      }, 8000)
    }
    
    // Generate initial notification
    generateNotification()
    
    // Generate new notifications every 3-7 seconds
    const interval = setInterval(() => {
      const randomDelay = 3000 + Math.random() * 4000 // 3-7 seconds
      setTimeout(generateNotification, Math.random() * 1000) // Small random offset
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Username persistence functions
  const saveUsernameToPrivy = async (username) => {
    if (!username.trim()) return false
    
    try {
      console.log('💾 Saving username to Privy account:', username)
      
      // Get current user identifier
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (userIdentifier && userIdentifier !== 'guest') {
        // Save to localStorage with user-specific key for persistence
        const userKey = `turfloot_username_${userIdentifier.slice(0, 10)}`
        localStorage.setItem(userKey, username)
        
        // Also save to a general authenticated user key
        localStorage.setItem('turfloot_auth_username', username)
        
        console.log('✅ Username saved successfully for user:', userKey)
        return true
      } else {
        // Save as guest username
        localStorage.setItem('turfloot_guest_username', username)
        console.log('✅ Username saved as guest:', username)
        return true
      }
    } catch (error) {
      console.error('❌ Error saving username:', error)
      return false
    }
  }

  const loadUsernameFromPrivy = () => {
    try {
      console.log('📖 Loading username from Privy account')
      
      // Get current user identifier
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (userIdentifier && userIdentifier !== 'guest') {
        // Try user-specific key first
        const userKey = `turfloot_username_${userIdentifier.slice(0, 10)}`
        const savedUsername = localStorage.getItem(userKey) || 
                            localStorage.getItem('turfloot_auth_username')
        
        if (savedUsername) {
          console.log('✅ Loaded username for authenticated user:', savedUsername)
          return savedUsername
        }
      } else {
        // Load guest username
        const guestUsername = localStorage.getItem('turfloot_guest_username')
        if (guestUsername) {
          console.log('✅ Loaded guest username:', guestUsername)
          return guestUsername
        }
      }
      
      console.log('ℹ️ No saved username found, using default')
      return null
    } catch (error) {
      console.error('❌ Error loading username:', error)
      return null
    }
  }

  const getDisplayUsername = () => {
    // Priority: customUsername > saved username > default based on auth status
    if (customUsername.trim()) {
      return customUsername.trim()
    }
    
    const savedUsername = loadUsernameFromPrivy()
    if (savedUsername) {
      return savedUsername
    }
    
    // Generate default username based on auth status
    if (isAuthenticated && user) {
      if (user.email?.address) {
        return user.email.address.split('@')[0].toUpperCase()
      } else if (user.wallet?.address) {
        return `PLAYER_${user.wallet.address.slice(-4).toUpperCase()}`
      } else {
        return 'AUTHENTICATED_USER'
      }
    } else {
      return userName || 'PLAYER'
    }
  }

  // Load username when authentication state changes and register Privy user
  useEffect(() => {
    console.log('🔄 Auth state changed:', { isAuthenticated, hasUser: !!user })
    const savedUsername = loadUsernameFromPrivy()
    if (savedUsername && !customUsername) {
      setCustomUsername(savedUsername)
      console.log('✅ Username loaded and set:', savedUsername)
    }

    // Register/update Privy user in database when authenticated
    if (isAuthenticated && user) {
      console.log('📝 Registering authenticated user...')
      registerPrivyUser()
    }
  }, [isAuthenticated, user])

  const registerPrivyUser = async () => {
    try {
      if (!user) {
        console.log('⚠️ No user object available for registration')
        return
      }

      const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id
      if (!userIdentifier) {
        console.log('⚠️ No valid userIdentifier found:', { 
          wallet: user?.wallet?.address,
          email: user?.email?.address,
          id: user?.id
        })
        return
      }

      // Generate a unique skin based on user identifier
      const generateUserSkin = (identifier) => {
        const colors = [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
          '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ];
        const patterns = ['solid', 'gradient', 'stripes'];
        
        // Use user identifier to deterministically select skin
        const colorIndex = Math.abs(identifier.slice(-2).charCodeAt(0)) % colors.length;
        const patternIndex = Math.abs(identifier.slice(-3).charCodeAt(0)) % patterns.length;
        
        return {
          type: 'circle',
          color: colors[colorIndex],
          pattern: patterns[patternIndex]
        };
      };

      const userData = {
        username: getDisplayUsername(),
        displayName: getDisplayUsername(),
        email: user?.email?.address,
        walletAddress: user?.wallet?.address,
        equippedSkin: generateUserSkin(userIdentifier)
      }

      console.log('📝 Registering Privy user with skin:', userIdentifier, userData)

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'register_user',
          userIdentifier,
          userData
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Privy user registered successfully with custom skin')
      } else {
        console.error('❌ Failed to register Privy user:', result.error)
      }
    } catch (error) {
      console.error('❌ Error registering Privy user:', error)
    }
  }

  // Save username whenever customUsername changes
  useEffect(() => {
    if (customUsername.trim()) {
      const timeoutId = setTimeout(() => {
        saveUsernameToPrivy(customUsername)
      }, 1000) // Debounce saving by 1 second
      
      return () => clearTimeout(timeoutId)
    }
  }, [customUsername, isAuthenticated, user])
  const [isServerBrowserOpen, setIsServerBrowserOpen] = useState(false)
  const [localPracticeLoading, setLocalPracticeLoading] = useState(false) // Loading state for local practice
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false)
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false)
  const [friendsList, setFriendsList] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] })
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [currentParty, setCurrentParty] = useState(null)
  const [loadingParty, setLoadingParty] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Load friends when modal opens
  useEffect(() => {
    if (isFriendsModalOpen && isAuthenticated) {
      loadFriendsList()
      loadFriendRequests()
    }
  }, [isFriendsModalOpen, isAuthenticated])

  // Load available users when Add Friend modal opens
  useEffect(() => {
    if (isAddFriendModalOpen) {
      loadAvailableUsers()
    }
  }, [isAddFriendModalOpen, isAuthenticated])
  // Load friends list and requests on authentication change
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFriendsList()
      loadFriendRequests()
      loadCurrentParty()
    } else {
      // Reset state for guest users
      setFriendsList([])
      setFriendRequests({ sent: [], received: [] })
      setCurrentParty(null)
    }
  }, [isAuthenticated, user])
  
  // Auto-refresh friend requests every 30 seconds to catch new invites
  useEffect(() => {
    if (!isAuthenticated || !user) return
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing friend requests and party invites...')
      loadFriendRequests()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [isAuthenticated, user])

  const loadAvailableUsers = async () => {
    setLoadingUsers(true)
    try {
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      const response = await fetch(`/api/friends?userIdentifier=${encodeURIComponent(userIdentifier)}&type=users`)
      const result = await response.json()
      
      if (result.success) {
        setAvailableUsers(result.users)
        console.log('✅ Available users loaded:', result.users.length, 'users')
      } else {
        console.error('❌ Failed to load users:', result.error)
      }
    } catch (error) {
      console.error('❌ Error loading users:', error)
    }
    setLoadingUsers(false)
  }

  const loadFriendsList = async () => {
    try {
      setLoadingFriends(true)
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      console.log('👥 Loading friends list for user:', userIdentifier)
      
      const response = await fetch(`/api/friends?userIdentifier=${userIdentifier}&type=friends`)
      const result = await response.json()
      
      if (result.success) {
        setFriendsList(result.friends)
        console.log('✅ Friends list loaded:', result.friends.length, 'friends')
      } else {
        console.error('❌ Failed to load friends:', result.error)
        setFriendsList([])
      }
    } catch (error) {
      console.error('❌ Error loading friends:', error)
      setFriendsList([])
    } finally {
      setLoadingFriends(false)
    }
  }

  // Function to create skin avatar style based on equipped skin
  const getSkinAvatarStyle = (skin, size = 32, isOnline = false) => {
    const baseStyle = {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      fontSize: `${size * 0.4}px`,
      fontWeight: 'bold',
      border: `2px solid ${isOnline ? '#68d391' : '#6b7280'}`,
      boxShadow: isOnline ? '0 0 10px rgba(104, 211, 145, 0.4)' : 'none'
    };

    // Generate background based on skin type and color
    if (skin?.type === 'circle') {
      const color = skin.color || '#3b82f6';
      if (skin.pattern === 'gradient') {
        baseStyle.background = `linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -20)} 100%)`;
      } else if (skin.pattern === 'stripes') {
        baseStyle.background = `repeating-linear-gradient(45deg, ${color}, ${color} 10px, ${adjustColorBrightness(color, -20)} 10px, ${adjustColorBrightness(color, -20)} 20px)`;
      } else {
        baseStyle.background = color;
      }
    } else {
      // Default skin
      baseStyle.background = 'linear-gradient(135deg, rgba(104, 211, 145, 0.3) 0%, rgba(104, 211, 145, 0.6) 100%)';
    }

    return baseStyle;
  };

  // Helper function to adjust color brightness
  const adjustColorBrightness = (color, percent) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const createPartyAndSendInvites = async (partyData, selectedFriends) => {
    try {
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (!userIdentifier || userIdentifier === 'guest') {
        console.error('❌ User not authenticated for party creation')
        return
      }

      console.log('🎯 Creating party and sending invites:', {
        party: partyData,
        invitedFriends: selectedFriends.length,
        userIdentifier
      })

      // Create party and send invites via API
      const response = await fetch('/api/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_and_invite',
          userIdentifier,
          partyData,
          invitedFriends: selectedFriends
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Party created and invites sent successfully')
        
        // Update UI to show party status
        await loadFriendsList()
        await loadCurrentParty() // Refresh party status
        
        return { success: true, result }
      } else {
        console.error('❌ Failed to create party:', result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Error creating party:', error)
      return { success: false, error: error.message }
    }
  }

  const loadFriendRequests = async () => {
    try {
      setLoadingRequests(true)
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      console.log('📬 Loading requests and invites for user:', userIdentifier)
      
      // Load both friend requests and party invites
      const [friendResponse, partyResponse] = await Promise.all([
        fetch(`/api/friends?userIdentifier=${userIdentifier}&type=requests`),
        fetch(`/api/party?userIdentifier=${userIdentifier}&type=invites`).catch(() => ({ json: () => ({ success: false, invites: [] }) }))
      ])
      
      const friendResult = await friendResponse.json()
      const partyResult = await partyResponse.json()
      
      if (friendResult.success) {
        // Combine friend requests and party invites
        const combinedRequests = {
          sent: friendResult.requests.sent || [],
          received: (friendResult.requests.received || []).concat(partyResult.invites || [])
        }
        
        setFriendRequests(combinedRequests)
        console.log('✅ Requests and invites loaded:', {
          friendRequests: friendResult.requests,
          partyInvites: partyResult.invites?.length || 0
        })
      } else {
        console.error('❌ Failed to load requests:', friendResult.error)
        setFriendRequests({ sent: [], received: [] })
      }
    } catch (error) {
      console.error('❌ Error loading requests and invites:', error)
      setFriendRequests({ sent: [], received: [] })
    } finally {
      setLoadingRequests(false)
    }
  }

  const loadCurrentParty = async () => {
    try {
      setLoadingParty(true)
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (userIdentifier === 'guest') {
        setCurrentParty(null)
        return
      }
      
      console.log('🎯 Loading current party for user:', userIdentifier)
      
      const response = await fetch(`/api/party?userIdentifier=${userIdentifier}&type=current`)
      const result = await response.json()
      
      if (result.success && result.party) {
        setCurrentParty(result.party)
        console.log('✅ Current party loaded:', result.party)
      } else {
        setCurrentParty(null)
        console.log('ℹ️ No current party found')
      }
    } catch (error) {
      console.error('❌ Error loading current party:', error)
      setCurrentParty(null)
    } finally {
      setLoadingParty(false)
    }
  }
  // Loading state removed - integrated into orientation modal
  
  // Mouse tracking for interactive eyes
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const circleRef = useRef(null)

  // Currency system for skin store (matches the game page)
  const [currency, setCurrency] = useState(0) // Coins for purchasing skins
  
  // Load user-specific currency based on authentication state
  useEffect(() => {
    const loadUserCurrency = () => {
      if (isAuthenticated && user) {
        // Create a unique key for this user based on wallet address or email
        const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id || 'unknown'
        const userCurrencyKey = `userCurrency_${userIdentifier}`
        
        console.log('🪙 Loading currency for authenticated user:', userIdentifier.substring(0, 8) + '...')
        
        const savedUserCurrency = localStorage.getItem(userCurrencyKey)
        if (savedUserCurrency) {
          try {
            const parsedCurrency = parseInt(savedUserCurrency)
            setCurrency(parsedCurrency)
            console.log(`💰 Loaded user currency: ${parsedCurrency} coins`)
          } catch (error) {
            console.log('Error loading user currency:', error)
            // Set default coins for new authenticated users
            setCurrency(100) // Starting amount for new authenticated users
            localStorage.setItem(userCurrencyKey, '100')
          }
        } else {
          // New authenticated user - give them starter coins
          console.log('🎁 New authenticated user - granting starter coins (100)')
          setCurrency(100)
          localStorage.setItem(userCurrencyKey, '100')
        }
      } else {
        // Non-authenticated user - use guest currency (0 to encourage authentication)
        console.log('👤 Loading guest currency')
        const guestCurrency = localStorage.getItem('guestCurrency')
        if (guestCurrency) {
          try {
            const parsedCurrency = parseInt(guestCurrency)
            setCurrency(parsedCurrency)
          } catch (error) {
            setCurrency(0) // No coins for guest users
            localStorage.setItem('guestCurrency', '0')
          }
        } else {
          setCurrency(0) // No coins for guest users
          localStorage.setItem('guestCurrency', '0')
        }
      }
    }

    // Load currency when authentication state or user changes
    loadUserCurrency()
  }, [isAuthenticated, user])

  // Save currency to appropriate localStorage key whenever it changes
  useEffect(() => {
    if (currency > 0) {
      if (isAuthenticated && user) {
        // Save to user-specific key
        const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id || 'unknown'
        const userCurrencyKey = `userCurrency_${userIdentifier}`
        localStorage.setItem(userCurrencyKey, currency.toString())
        console.log(`💾 Saved user currency: ${currency} coins for ${userIdentifier.substring(0, 8)}...`)
      } else {
        // Save to guest key
        localStorage.setItem('guestCurrency', currency.toString())
        console.log(`💾 Saved guest currency: ${currency} coins`)
      }
    }
  }, [currency, isAuthenticated, user])
  
  // Selected skin system for cross-component synchronization
  const [selectedSkin, setSelectedSkin] = useState({
    id: 'default',
    name: 'Default Warrior', 
    color: '#4A90E2'
  })

  // Load saved skin from localStorage on component mount
  useEffect(() => {
    const savedSkin = localStorage.getItem('selectedSkin')
    if (savedSkin) {
      try {
        const parsedSkin = JSON.parse(savedSkin)
        setSelectedSkin(parsedSkin)
      } catch (error) {
        console.log('Error loading saved skin:', error)
      }
    }
  }, [])

  // Track mouse movement for interactive eyes
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove)
      return () => window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  // Eye tracking scroll effect for mobile CUSTOMIZE panel
  useEffect(() => {
    if (!isMobile) return

    const handleScroll = () => {
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0
      const scrollProgress = Math.min(scrollY / (windowHeight * 0.5), 1)
      
      // Calculate eye movement based on scroll position
      const maxEyeMovement = 2 // Maximum pixels the eyes can move
      const eyeX = Math.sin(scrollProgress * Math.PI * 2) * maxEyeMovement
      const eyeY = (scrollProgress - 0.5) * maxEyeMovement * 2
      
      setEyePosition({ x: eyeX, y: Math.max(-maxEyeMovement, Math.min(maxEyeMovement, eyeY)) })
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile])

  // Improved orientation detection function
  const detectLandscapeMode = () => {
    // Multiple methods to detect landscape mode for better reliability
    const screenOrientation = screen.orientation?.angle || window.orientation || 0
    const dimensionCheck = window.innerWidth > window.innerHeight
    const aspectRatio = window.innerWidth / window.innerHeight
    
    // Consider landscape if:
    // 1. Screen orientation is 90 or 270 degrees (landscape)
    // 2. Width is significantly greater than height (aspect ratio > 1.2)
    const isLandscapeByOrientation = Math.abs(screenOrientation) === 90
    const isLandscapeByDimensions = dimensionCheck && aspectRatio > 1.2
    
    const isLandscape = isLandscapeByOrientation || isLandscapeByDimensions
    
    console.log('🔍 Orientation Detection:', {
      screenOrientation,
      dimensionCheck,
      aspectRatio: aspectRatio.toFixed(2),
      isLandscapeByOrientation,
      isLandscapeByDimensions,
      finalResult: isLandscape
    })
    
    return isLandscape
  }

  // Orientation detection and game entry for mobile
  const checkOrientationAndEnterGame = (gameUrl) => {
    if (!isMobile) {
      // Desktop: Navigate immediately and dismiss loading popup
      console.log('🖥️ Desktop detected - navigating directly to game')
      setLocalPracticeLoading(false) // Dismiss loading popup before navigation
      window.location.href = gameUrl
      return
    }

    // Mobile: Check orientation with improved detection
    const isLandscape = detectLandscapeMode()
    
    if (isLandscape) {
      // Already in landscape: Show loading then navigate
      console.log('📱 Mobile device already in landscape - showing loading and entering game')
      setPendingGameUrl(gameUrl)
      setShowOrientationModal(true)
      setOrientationModalLoading(true)
      
      // Show loading for a brief moment then navigate
      setTimeout(() => {
        console.log('🎮 Navigating to game:', gameUrl)
        window.location.href = gameUrl
      }, 1000)
    } else {
      // Portrait mode: Show orientation modal without loading
      console.log('📱 Mobile device in portrait - requesting landscape rotation')
      setPendingGameUrl(gameUrl)
      setShowOrientationModal(true)
      setOrientationModalLoading(false)
    }
  }

  // Listen for orientation changes when modal is open
  useEffect(() => {
    if (!showOrientationModal || !isMobile) return

    const handleOrientationChange = () => {
      // Add a small delay to allow browser to update dimensions
      setTimeout(() => {
        const isLandscape = detectLandscapeMode()
        
        if (isLandscape && pendingGameUrl) {
          console.log('📱 Device rotated to landscape - showing loading and entering game')
          setOrientationModalLoading(true)
          // Show loading then navigate
          setTimeout(() => {
            console.log('🎮 Navigating to game after orientation change:', pendingGameUrl)
            window.location.href = pendingGameUrl
          }, 1000)
        }
      }, 100) // Small delay to ensure accurate dimension readings
    }

    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [showOrientationModal, pendingGameUrl, isMobile])

  // Calculate eye positions based on mouse position
  const getEyePositions = () => {
    if (typeof window === 'undefined' || !circleRef.current) {
      return { leftEye: { x: 18, y: 22 }, rightEye: { x: 54, y: 22 } }
    }

    try {
      const rect = circleRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Calculate angle from circle center to mouse
      const angle = Math.atan2(mousePosition.y - centerY, mousePosition.x - centerX)
      
      // Limit eye movement within the circle (max 4px from default position for subtle movement)
      const maxDistance = 4
      const eyeOffsetX = Math.cos(angle) * maxDistance
      const eyeOffsetY = Math.sin(angle) * maxDistance
      
      return {
        leftEye: { 
          x: 25 + eyeOffsetX, // Moved closer to center (was 18)
          y: 22 + eyeOffsetY 
        },
        rightEye: { 
          x: 47 + eyeOffsetX, // Moved closer to center (was 54)
          y: 22 + eyeOffsetY 
        }
      }
    } catch (error) {
      // Fallback to default positions
      return { leftEye: { x: 18, y: 22 }, rightEye: { x: 54, y: 22 } }
    }
  }

  const eyePositions = getEyePositions()

  // Memoized background styles to prevent resets on state changes
  const mobileBackgroundStyles = useMemo(() => ({
    backgroundContainer: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 1,
      overflow: 'hidden'
    },
    mobileGrid: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '120%',
      height: '120%',
      opacity: 0.3,
      backgroundImage: `
        linear-gradient(rgba(104, 211, 145, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(104, 211, 145, 0.3) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      animation: 'tacticalGrid 35s linear infinite'
    }
  }), []) // Empty dependency array - these styles never change

  // Stable random values for background animations (client-side only)
  const [floatingElements, setFloatingElements] = useState([])
  const [codeElements, setCodeElements] = useState([])

  // Initialize random elements after component mounts (client-side only)
  useEffect(() => {
    setFloatingElements(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        width: Math.random() * 4 + 1,
        height: Math.random() * 4 + 1,
        color: ['#68d391', '#f6ad55', '#fc8181'][Math.floor(Math.random() * 3)],
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: Math.random() * 0.7 + 0.2,
        animationDuration: Math.random() * 8 + 6,
        isCircle: Math.random() > 0.5
      }))
    )
    setCodeElements(
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        height: Math.random() * 300 + 100,
        animationDuration: Math.random() * 5 + 3,
        animationDelay: Math.random() * 3
      }))
    )
  }, []) // Only run once after mount

  useEffect(() => {
    // Enhanced laptop-friendly device detection
    const checkMobile = () => {
      // Screen dimensions - be more specific about what constitutes mobile
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const minDimension = Math.min(screenWidth, screenHeight)
      const aspectRatio = screenWidth / screenHeight
      
      // Touch and user agent detection (for real devices)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // Laptop detection - prioritize laptop characteristics
      const isLikelyLaptop = !isMobileUA && screenWidth >= 1024 && screenHeight >= 600
      const hasLaptopAspectRatio = aspectRatio >= 1.2 && aspectRatio <= 2.5 // Typical laptop ratios
      
      // Mobile phone detection (portrait phones)
      const isPhonePortrait = screenWidth < 768 && aspectRatio < 1
      
      // Mobile phone detection (landscape phones)  
      const isPhoneLandscape = screenHeight < 500 && aspectRatio >= 1.5 && screenWidth < 900
      
      // Tablet detection (larger touch devices)
      const isTablet = isTouchDevice && isMobileUA && minDimension >= 768 && minDimension < 1024
      
      // Very small screens (definitely mobile)
      const isTinyScreen = screenWidth < 600 && screenHeight < 600
      
      // LAPTOP PRIORITY: If it looks like a laptop, treat as desktop
      if (isLikelyLaptop && hasLaptopAspectRatio && !isMobileUA) {
        console.log('💻 LAPTOP DETECTED - Using desktop layout')
        const mobile = false
        
        console.log('📱 Enhanced Device Detection (LAPTOP):', {
          screenWidth,
          screenHeight,
          minDimension,
          aspectRatio: aspectRatio.toFixed(2),
          isTouchDevice,
          isMobileUA,
          isLikelyLaptop,
          hasLaptopAspectRatio,
          result: mobile,
          '*** FINAL DECISION ***': mobile ? 'MOBILE LAYOUT' : 'DESKTOP LAYOUT'
        })
        
        setIsMobile(mobile)
        return
      }
      
      // Device is mobile if ANY of these mobile conditions are true:
      const mobile = isPhonePortrait || isPhoneLandscape || isTablet || isTinyScreen || 
                     (isTouchDevice && isMobileUA && screenWidth < 1024)
      
      console.log('📱 Enhanced Device Detection:', {
        screenWidth,
        screenHeight, 
        minDimension,
        aspectRatio: aspectRatio.toFixed(2),
        isTouchDevice,
        isMobileUA,
        isLikelyLaptop,
        hasLaptopAspectRatio,
        isPhonePortrait,
        isPhoneLandscape,
        isTablet,
        isTinyScreen,
        result: mobile,
        '*** FINAL DECISION ***': mobile ? 'MOBILE LAYOUT' : 'DESKTOP LAYOUT'
      })
      
      setIsMobile(mobile)
    }
    
    // Force component re-render when screen size changes to update responsive positioning
    const handleResize = () => {
      checkMobile()
      // Trigger re-render for responsive panel positioning
      setForceUpdate(prev => prev + 1)
    }
    
    checkMobile()
    window.addEventListener('resize', handleResize)
    
    // Live stats will be updated when users join/leave games and cash out
    
    // Simulate friends coming online after a delay
    const friendsTimer = setTimeout(() => {
      setActiveFriends(2) // Simulate 2 friends coming online
    }, 5000) // After 5 seconds
    
    // Leaderboard will be populated when users actually cash out
    // For now, it remains empty to show "LOADING LEADERBOARD..." state
    
    // Check for Privy authentication state with improved logic
    const checkPrivyAuth = () => {
      if (typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
        const privyState = window.__TURFLOOT_PRIVY__
        
        // Debug logging to track authentication state changes
        console.log('🔍 Privy Auth Check:', {
          ready: privyState.ready,
          authenticated: privyState.authenticated,
          hasUser: !!privyState.user,
          userEmail: privyState.user?.email?.address,
          userWallet: privyState.user?.wallet?.address?.slice(0, 8) + '...',
          userId: privyState.user?.id,
          userKeys: privyState.user ? Object.keys(privyState.user) : []
        })
        
        // Only update state if Privy is ready to avoid false negatives
        if (privyState.ready !== undefined) {
          const newAuthState = privyState.authenticated || false
          const newUser = privyState.user || null
          
          // Only update if state actually changed to reduce unnecessary re-renders
          setIsAuthenticated(prevAuth => {
            if (prevAuth !== newAuthState) {
              console.log('🔄 Authentication state changed:', prevAuth, '->', newAuthState)
              return newAuthState
            }
            return prevAuth
          })
          
          setUser(prevUser => {
            // Check if user object has meaningful changes
            const prevUserStr = JSON.stringify(prevUser)
            const newUserStr = JSON.stringify(newUser)
            if (prevUserStr !== newUserStr) {
              console.log('👤 User state changed:', {
                prev: prevUser ? { id: prevUser.id, wallet: prevUser.wallet?.address } : null,
                new: newUser ? { id: newUser.id, wallet: newUser.wallet?.address } : null
              })
              return newUser
            }
            return prevUser
          })
        }
      } else {
        console.log('⏳ Privy bridge not yet available, waiting...')
      }
    }
    
    // Initial auth check
    checkPrivyAuth()
    
    // More frequent initial checks to catch Privy user loading, then less frequent maintenance checks
    let checkCount = 0
    const authCheckInterval = setInterval(() => {
      checkPrivyAuth()
      checkCount++
      
      // After 50 checks (10 seconds at 200ms), reduce frequency to every 3 seconds
      if (checkCount >= 50) {
        clearInterval(authCheckInterval)
        const maintCheckInterval = setInterval(checkPrivyAuth, 3000)
        
        // Clean up maintenance interval on unmount
        return () => {
          clearInterval(maintCheckInterval)
        }
      }
    }, 200) // Check every 200ms initially
    
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(friendsTimer)
      clearInterval(authCheckInterval)
    }
  }, [])

  const handleJoinGame = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  // ========================================
  // HATHORA-FIRST MULTIPLAYER ARCHITECTURE
  // ========================================
  
  const initializeColyseusGame = async (serverData) => {
    console.log('🚀 Connecting to Colyseus server...')
    console.log('📊 Server details:', serverData)
    
    try {
      // Colyseus server configuration – always prefer the endpoint provided by the
      // server browser payload so we join the exact deployment the user selected.
      const fallbackEndpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'ws://localhost:2567'
      const resolvedEndpoint = serverData.endpoint || fallbackEndpoint

      const colyseusServerInfo = {
        endpoint: resolvedEndpoint,
        roomType: 'arena',
        region: serverData.region || 'global'
      }
      
      console.log('🎮 Using Colyseus server configuration:', colyseusServerInfo)
      
      // Return server configuration for handleJoinLobby to use
      console.log('✅ Colyseus server configuration ready for navigation')
      
      const resolvedRoomId = serverData.roomId || serverData.id || 'colyseus-arena'

      return {
        roomId: resolvedRoomId,
        endpoint: colyseusServerInfo.endpoint,
        roomType: colyseusServerInfo.roomType,
        region: colyseusServerInfo.region,
        entryFee: serverData.entryFee || 0,
        maxPlayers: 50,
        gameMode: 'colyseus-multiplayer',
        isColyseusRoom: true,
        connectionInfo: {
          endpoint: colyseusServerInfo.endpoint,
          roomType: colyseusServerInfo.roomType
        }
      }
      
    } catch (error) {
      console.error('❌ initializeColyseusGame failed:', error)
      throw error
    }
  }

  const handleJoinLobby = async (serverData) => {
    console.log('🎮 HANDLEFNLOBIOY - Starting Colyseus game with server data:', serverData)
    
    try {
      // Validate server data
      if (!serverData) {
        throw new Error('No server data provided')
      }
      
      const resolvedRoomId = serverData.roomId || serverData.id || 'colyseus-arena-global'
      const identifiersToCheck = [serverData.id, serverData.roomId, resolvedRoomId].filter(Boolean)

      console.log('📊 Server configuration for Colyseus game:', {
        id: serverData.id,
        roomId: resolvedRoomId,
        name: serverData.name,
        region: serverData.region,
        entryFee: serverData.entryFee,
        maxPlayers: serverData.maxPlayers,
        serverType: serverData.serverType || 'colyseus',
        mode: serverData.mode || 'colyseus-multiplayer'
      })

      const paidRoomConfigs = [
        {
          idMatches: ['turfloot-au-5'],
          nameMatches: ['Turfloot $5 Room - Australia'],
          entryFee: 0.05,
          minBalance: 0.05,
          feePercentage: 10
        },
        {
          idMatches: ['turfloot-au-20'],
          nameMatches: ['Turfloot $20 Room - Australia'],
          entryFee: 0.10,
          minBalance: 0.10,
          feePercentage: 10
        }
      ]

      const paidRoomConfig = paidRoomConfigs.find(config => {
        const matchesId = config.idMatches?.some(id => identifiersToCheck.includes(id))
        const matchesName = config.nameMatches?.some(name => name === serverData.name)
        return matchesId || matchesName
      })

      let feeResult = null
      let feeForQuery = serverData.entryFee || 0
      let appliedFeePercentage = null
      let minBalanceRequirement = null

      if (paidRoomConfig) {
        console.log('💰 Paid room detected. Applying wallet validation rules:', paidRoomConfig)

        if (!ready || !authenticated) {
          console.log('🔐 Privy session not ready for paid room entry, opening login modal.')
          if (typeof login === 'function') {
            try {
              login()
            } catch (loginError) {
              console.warn('⚠️ Failed to trigger Privy login flow automatically:', loginError)
            }
          }
          return
        }

        const currentBalance = parseFloat(walletBalance.usd || 0)
        if (currentBalance < paidRoomConfig.minBalance) {
          const shortfall = Math.max(0, paidRoomConfig.minBalance - currentBalance)
          alert(`Insufficient balance for this room.\n\nRequired: $${paidRoomConfig.minBalance.toFixed(2)}\nAvailable: $${currentBalance.toFixed(2)}\nShortfall: $${shortfall.toFixed(2)}\n\nPlease top up your wallet to join.`)
          return
        }

        const userWalletAddress = findWalletAddress()
        if (!userWalletAddress) {
          console.log('👛 No Solana wallet detected, prompting Privy modal for wallet linking.')
          if (typeof login === 'function') {
            try {
              login()
            } catch (loginError) {
              console.warn('⚠️ Failed to trigger Privy login flow for wallet linking:', loginError)
            }
          }
          return
        }

        feeResult = await deductRoomFees(
          paidRoomConfig.entryFee,
          userWalletAddress,
          paidRoomConfig.feePercentage
        )

        if (!feeResult.success) {
          if (feeResult.cancelled) {
            console.log('🚫 Paid room fee flow cancelled by user.')
            return
          }

          console.error('❌ Paid room fee deduction failed:', feeResult.error)
          alert(`Failed to process room entry fee: ${feeResult.error}`)
          return
        }

        feeForQuery = paidRoomConfig.entryFee
        appliedFeePercentage = paidRoomConfig.feePercentage
        minBalanceRequirement = paidRoomConfig.minBalance

        serverData.entryFee = feeForQuery
        serverData.totalCost = feeResult.costs.totalCost
        serverData.paidRoom = true

        console.log('✅ Paid room fee processed successfully:', feeResult)
      }
      
      // Get Privy user info for proper identification in game
      let playerDisplayName = 'Anonymous Player'
      
      // Use custom username first, then try to extract from email, then fallback
      if (customUsername) {
        playerDisplayName = customUsername
      } else if (user?.email && typeof user.email === 'string') {
        try {
          playerDisplayName = user.email.split('@')[0]
        } catch (error) {
          console.warn('Failed to extract username from email:', error)
          playerDisplayName = 'Privy User'
        }
      }
      
      const privyUserData = {
        privyUserId: user?.id || 'anonymous-' + Date.now(),
        playerName: playerDisplayName,
        walletAddress: user?.wallet?.address || null
      }
      
      console.log('👤 Passing Privy user data to game:', privyUserData)
      
      // Build URL parameters for Colyseus multiplayer game
      const queryParams = {
        roomId: resolvedRoomId,
        mode: 'colyseus-multiplayer', // Force Colyseus multiplayer
        server: 'colyseus', // Explicitly set server type
        serverType: 'colyseus', // Additional server type identifier
        multiplayer: 'true', // Force multiplayer flag
        fee: feeForQuery.toString(),
        region: serverData.region || 'Australia',
        regionId: serverData.regionId || 'au-syd',
        maxPlayers: (serverData.maxPlayers || 50).toString(),
        name: encodeURIComponent(serverData.name || 'TurfLoot Arena'),
        gameType: encodeURIComponent(serverData.gameType || 'Arena Battle'),
        // Add Privy user data
        privyUserId: privyUserData.privyUserId,
        playerName: encodeURIComponent(privyUserData.playerName),
        walletAddress: privyUserData.walletAddress || ''
      }

      if (serverData.endpoint) {
        queryParams.endpoint = serverData.endpoint
      }

      if (appliedFeePercentage !== null && feeResult) {
        queryParams.feePercentage = appliedFeePercentage.toString()
        queryParams.totalCost = feeResult.costs.totalCost.toFixed(3)
        queryParams.minBalance = minBalanceRequirement.toFixed(2)
        queryParams.paidRoom = 'true'
      }

      const gameParams = new URLSearchParams(queryParams)
      
      console.log('🔗 Colyseus game URL parameters:', gameParams.toString())
      
      const gameUrl = `/arena?${gameParams.toString()}`
      console.log('🚀 Navigating to dedicated multiplayer arena:', gameUrl)
      
      // Navigate to dedicated multiplayer arena (pure Colyseus)
      router.push(gameUrl)
      
    } catch (error) {
      console.error('❌ Failed to start Colyseus game:', error)
      alert(`Failed to join Colyseus game: ${error.message}`)
    }
  }

  const createDesktopLeaderboardPopup = async () => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing leaderboard popup
    const existing = document.getElementById('desktop-leaderboard-popup')
    if (existing) existing.remove()

    // Fetch leaderboard data
    let leaderboardData = []
    try {
      console.log('🏆 Fetching leaderboard data...')
      const response = await fetch('/api/users/leaderboard')
      if (response.ok) {
        const data = await response.json()
        leaderboardData = data.users?.slice(0, 10) || [] // Top 10 players
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-leaderboard-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999999 !important;
      pointer-events: auto !important;
    `

    // Create the modal content
    const modal = document.createElement('div')
    modal.style.cssText = `
      background-color: #1a202c !important;
      border: 3px solid #68d391 !important;
      border-radius: 12px !important;
      max-width: 900px !important;
      width: 90% !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      padding: 0 !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(104, 211, 145, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Generate leaderboard HTML
    const leaderboardHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #68d391; background: linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #68d391 0%, #48bb78 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🏆
            </div>
            <div>
              <h2 style="color: #68d391; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(104, 211, 145, 0.6);">
                GLOBAL LEADERBOARD
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Top players by performance • Live Rankings
              </p>
            </div>
          </div>
          <button id="close-leaderboard" style="background: rgba(252, 129, 129, 0.2); border: 2px solid #fc8181; border-radius: 8px; padding: 12px; color: #fc8181; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 24px;">
        ${leaderboardData.length > 0 ? `
          <div style="display: grid; grid-template-columns: 60px 1fr 120px 120px 120px; gap: 16px; padding: 16px; background: rgba(104, 211, 145, 0.1); border-radius: 8px; font-size: 14px; font-weight: 700; color: #68d391; text-transform: uppercase; margin-bottom: 16px;">
            <div>RANK</div>
            <div>PLAYER</div>
            <div>GAMES WON</div>
            <div>GAMES PLAYED</div>
            <div>WIN RATE</div>
          </div>
          ${leaderboardData.map((player, index) => {
            const winRate = player.gamesPlayed > 0 ? ((player.gamesWon / player.gamesPlayed) * 100).toFixed(1) : '0.0'
            const rankColor = index < 3 ? (index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32') : '#68d391'
            return `
              <div style="display: grid; grid-template-columns: 60px 1fr 120px 120px 120px; gap: 16px; padding: 16px; background: ${index % 2 === 0 ? 'rgba(45, 55, 72, 0.3)' : 'rgba(26, 32, 44, 0.3)'}; border-radius: 8px; border-left: 4px solid ${rankColor}; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: ${rankColor}; display: flex; align-items: center;">
                  #${index + 1}
                </div>
                <div style="font-size: 16px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center;">
                  ${player.username || 'Anonymous'}
                </div>
                <div style="font-size: 16px; color: #68d391; font-weight: 600; display: flex; align-items: center;">
                  ${player.gamesWon || 0}
                </div>
                <div style="font-size: 16px; color: #a0aec0; display: flex; align-items: center;">
                  ${player.gamesPlayed || 0}
                </div>
                <div style="font-size: 16px; color: ${parseFloat(winRate) >= 70 ? '#68d391' : parseFloat(winRate) >= 50 ? '#f6ad55' : '#fc8181'}; font-weight: 600; display: flex; align-items: center;">
                  ${winRate}%
                </div>
              </div>
            `
          }).join('')}
        ` : `
          <div style="text-align: center; padding: 60px 20px; color: #a0aec0;">
            <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
            <div style="font-size: 18px; margin-bottom: 8px;">NO LEADERBOARD DATA</div>
            <div style="font-size: 14px;">Play some games to see the rankings!</div>
          </div>
        `}
      </div>

      <div style="padding: 16px 24px; background: rgba(26, 32, 44, 0.8); border-top: 2px solid rgba(104, 211, 145, 0.2); text-align: center; border-radius: 0 0 8px 8px;">
        <div style="font-size: 12px; color: #68d391; text-transform: uppercase;">
          🔄 Live Rankings • Updated: ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `

    modal.innerHTML = leaderboardHTML

    // Add close functionality
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'close-leaderboard') {
        popup.remove()
      }
    })

    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove()
      }
    })

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        popup.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)

    popup.appendChild(modal)
    document.body.appendChild(popup)

    console.log('🏆 Desktop leaderboard popup created with direct DOM manipulation')
  }

  // REAL-TIME SOLANA BALANCE SYSTEM WITH 10% DEPOSIT FEE + PAID ROOMS
  
  // State for wallet balance display
  const [walletBalance, setWalletBalance] = useState({
    usd: null,
    sol: null,
    loading: false
  })

  const getMockBalanceStorageKey = useCallback(() => {
    if (typeof window === 'undefined') {
      return null
    }

    if (!authenticated || !privyUser?.id) {
      return null
    }

    return `turfloot_mock_balance_${privyUser.id}`
  }, [authenticated, privyUser?.id])

  const readMockBalanceFromStorage = useCallback(() => {
    const key = getMockBalanceStorageKey()
    if (!key) {
      return 0
    }

    try {
      const stored = window.localStorage.getItem(key)
      if (!stored) {
        return 0
      }

      const parsed = parseFloat(stored)
      return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
    } catch (error) {
      console.warn('⚠️ Unable to read mock balance from storage:', error)
      return 0
    }
  }, [getMockBalanceStorageKey])

  const persistMockBalanceToStorage = useCallback((solAmount) => {
    const key = getMockBalanceStorageKey()
    if (!key || typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, solAmount.toString())
    } catch (error) {
      console.warn('⚠️ Unable to persist mock balance to storage:', error)
    }
  }, [getMockBalanceStorageKey])

  const setMockBalanceState = useCallback((solAmount) => {
    const normalizedSol = Number.isFinite(solAmount) ? Math.max(solAmount, 0) : 0
    const usdValue = (normalizedSol * 150).toFixed(2)
    const solValue = normalizedSol.toFixed(4)

    persistMockBalanceToStorage(normalizedSol)
    setWalletBalance({
      sol: solValue,
      usd: usdValue,
      loading: false
    })
  }, [persistMockBalanceToStorage])

  const incrementMockBalance = useCallback((deltaSol) => {
    if (!Number.isFinite(deltaSol)) {
      return
    }

    const currentSol = readMockBalanceFromStorage()
    const nextSol = Math.max(0, currentSol + deltaSol)
    setMockBalanceState(nextSol)
  }, [readMockBalanceFromStorage, setMockBalanceState])

  const checkSolanaBalance = useCallback(async (walletAddress = null) => {
    if (!walletAddress) {
      console.log('⚠️ No wallet address provided')
      return 0
    }

    if (!isSolanaAddress(walletAddress)) {
      console.log('⚠️ Provided wallet address does not appear to be Solana compatible:', walletAddress)
      return 0
    }

    const rpcCandidates = (SOLANA_RPC_ENDPOINTS || []).filter(Boolean)
    const endpointsToTry = rpcCandidates.length > 0
      ? rpcCandidates
      : [
          'https://mainnet.helius-rpc.com',
          'https://api.mainnet-beta.solana.com',
          'https://rpc.ankr.com/solana'
        ]

    const sanitiseForLog = (endpoint) => {
      try {
        const url = new URL(endpoint)
        if (url.searchParams.has('api-key')) {
          url.searchParams.set('api-key', '***')
        }
        return url.toString()
      } catch (error) {
        return endpoint.split('?')[0]
      }
    }

    let solanaWeb3
    try {
      solanaWeb3 = await import('@solana/web3.js')
    } catch (importError) {
      console.warn('⚠️ Unable to load @solana/web3.js, falling back to direct RPC fetch', importError)
    }

    for (const endpoint of endpointsToTry) {
      const rpcUrl = typeof endpoint === 'string' ? endpoint.trim() : ''
      if (!rpcUrl) {
        continue
      }

      const logEndpoint = sanitiseForLog(rpcUrl)
      console.log('🔍 Checking Solana balance via RPC:', logEndpoint)

      if (solanaWeb3?.Connection && solanaWeb3?.PublicKey) {
        try {
          const connection = new solanaWeb3.Connection(rpcUrl, 'confirmed')
          const publicKey = new solanaWeb3.PublicKey(walletAddress)
          const lamports = await connection.getBalance(publicKey)
          const solBalance = lamports / 1_000_000_000

          console.log('✅ RPC balance fetched via @solana/web3.js:', {
            rpc: logEndpoint,
            sol: solBalance
          })

          return solBalance
        } catch (rpcError) {
          console.error('❌ RPC connection error:', {
            rpc: logEndpoint,
            message: rpcError?.message || rpcError
          })
        }
      }

      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [walletAddress]
          }),
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
        })

        if (response.ok) {
          const data = await response.json()
          console.log('📡 Helius API response data:', JSON.stringify(data).substring(0, 200))
          
          const lamports = data?.result?.value ?? 0
          const solBalance = lamports / 1_000_000_000

          console.log('✅ RPC balance fetched via HTTP POST:', {
            rpc: logEndpoint,
            sol: solBalance
          })

          return solBalance
        }

        console.error('❌ RPC HTTP error:', {
          rpc: logEndpoint,
          status: response.status
        })
      } catch (httpError) {
        console.error('❌ RPC fetch error:', {
          rpc: logEndpoint,
          message: httpError?.message || httpError
        })
      }
    }

    console.log('📡 All Solana RPC endpoints failed, defaulting balance to 0')
    return 0
  }, [SOLANA_RPC_ENDPOINTS])

  // Balance check interval reference
  const balanceInterval = useRef(null)

  // Current wallet address being monitored
  const [currentWalletAddress, setCurrentWalletAddress] = useState(null)

  // Paid rooms system state
  const [insufficientFundsNotification, setInsufficientFundsNotification] = useState(null)

  // STEP 4: Expose balance to the page - Real SOL balance only
  const fetchWalletBalance = useCallback(async (addressOverride = null) => {
    console.log('💰 fetchWalletBalance called:', {
      authenticated,
      walletsReady,
      walletsCount: wallets.length,
      currentWalletAddress,
      addressOverride
    })

    const walletAddress = addressOverride || currentWalletAddress

    if (!walletAddress) {
      console.log('👛 fetchWalletBalance: No wallet address - skipping balance check')
      return
    }

    if (!authenticated) {
      console.log('⚠️ fetchWalletBalance: User not authenticated yet - skipping balance check')
      return
    }

    if (!walletsReady || wallets.length === 0) {
      console.log('⚠️ fetchWalletBalance: Wallets not ready yet - skipping balance check')
      return
    }

    console.log('🚀 fetchWalletBalance: Fetching real SOL balance for authenticated user:', walletAddress)

    // Set loading state
    setWalletBalance(prev => ({ ...prev, loading: true }))

    try {
      // Get real SOL balance from blockchain
      console.log('📞 fetchWalletBalance: Calling checkSolanaBalance with address:', walletAddress)
      const totalSolBalance = await checkSolanaBalance(walletAddress)
      console.log('📞 fetchWalletBalance: checkSolanaBalance returned:', totalSolBalance, 'SOL')

      // CRITICAL: Calculate available balance (total - rent-exempt minimum)
      // Solana requires ~0.00089088 SOL minimum + transaction fees
      const RENT_EXEMPT_MINIMUM_SOL = 0.00089088
      const TRANSACTION_FEE_BUFFER_SOL = 0.000005
      const MINIMUM_RESERVE_SOL = RENT_EXEMPT_MINIMUM_SOL + TRANSACTION_FEE_BUFFER_SOL
      
      // Available balance = total balance - minimum reserve
      const availableSolBalance = Math.max(0, totalSolBalance - MINIMUM_RESERVE_SOL)
      
      console.log('💰 Balance Breakdown:')
      console.log('   Total SOL:', totalSolBalance.toFixed(8))
      console.log('   Reserved (rent-exempt + fees):', MINIMUM_RESERVE_SOL.toFixed(8))
      console.log('   Available to spend:', availableSolBalance.toFixed(8))

      // Convert AVAILABLE balance to USD (using real market rate to match Privy display)
      const USD_PER_SOL_MARKET = 150 // Real market rate for balance display
      const availableUsdBalance = (availableSolBalance * USD_PER_SOL_MARKET).toFixed(2)

      // Update UI state with AVAILABLE balance (what user can actually spend)
      setWalletBalance({
        sol: availableSolBalance.toFixed(4),
        usd: availableUsdBalance,
        loading: false
      })

      console.log('✅ fetchWalletBalance: Available balance updated successfully:', { 
        totalSol: totalSolBalance,
        availableSol: availableSolBalance, 
        availableUsd: availableUsdBalance,
        walletAddress: walletAddress
      })

    } catch (error) {
      console.error('❌ fetchWalletBalance: Error caught:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200)
      })
      // Don't reset balance on error - keep previous value
    }
  }, [currentWalletAddress, checkSolanaBalance, authenticated, walletsReady, wallets.length])

  // STEP 3: Watch authentication and wallet availability
  useEffect(() => {
    console.log('🔄 Authentication state changed:', {
      ready,
      authenticated,
      hasUser: !!privyUser,
      walletAddressesSignature
    })

    if (!ready) {
      console.log('⏳ Privy not ready yet')
      if (currentWalletAddress !== null) {
        setCurrentWalletAddress(null)
      }
      return
    }

    if (!authenticated || !privyUser) {
      console.log('👛 User not authenticated')
      if (currentWalletAddress !== null) {
        setCurrentWalletAddress(null)
      }
      return
    }

    const walletAddress = findWalletAddress()
    const monitorKey = walletAddress || 'mock-balance'

    if (monitorKey !== currentWalletAddress) {
      console.log('✅ Starting balance monitoring for:', monitorKey)
      setCurrentWalletAddress(monitorKey)
    }

    fetchWalletBalance()
  }, [
    ready,
    authenticated,
    privyUser,
    walletAddressesSignature,
    currentWalletAddress,
    fetchWalletBalance
  ])

  // STEP 3b: Refresh periodically once we know the active wallet
  useEffect(() => {
    if (!currentWalletAddress) {
      if (balanceInterval.current) {
        clearInterval(balanceInterval.current)
        balanceInterval.current = null
        console.log('🧹 Cleared balance interval (no active wallet)')
      }
      return
    }

    console.log('🔄 Balance monitoring active for wallet key:', currentWalletAddress)
    fetchWalletBalance()

    balanceInterval.current = setInterval(() => {
      console.log('⏰ Periodic balance check triggered (60s interval)')
      fetchWalletBalance()
    }, 60000)

    return () => {
      if (balanceInterval.current) {
        clearInterval(balanceInterval.current)
        balanceInterval.current = null
        console.log('🧹 Cleaned up balance interval')
      }
    }
  }, [currentWalletAddress, fetchWalletBalance])

  // Manual balance update feature (for testing without RPC provider)
  const updateBalanceManually = (amount) => {
    if (!Number.isFinite(amount)) {
      return
    }

    console.log(`💾 Manual mock balance update: ${amount} SOL`)
    setMockBalanceState(amount)
  }

  // Expose to window for testing (remove in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.updateSolBalance = updateBalanceManually
      console.log('🧪 Testing functions available:')
      console.log('  - window.updateSolBalance(0.5) // Sets mock balance to 0.5 SOL')
      console.log('🎯 Challenge Testing Functions:')
      console.log('  - window.updateChallengeProgress("coins_eaten", 10) // Add 10 coins eaten')
      console.log('  - window.updateChallengeProgress("survival_time", 180) // 3 minutes survived') 
      console.log('  - window.updateChallengeProgress("max_mass", 150) // Reached mass 150')
      console.log('  - window.updateChallengeProgress("cashout") // Cashed out once')
      
      // Show fee configuration
      const feePercentage = process.env.NEXT_PUBLIC_DEPOSIT_FEE_PERCENTAGE || 10
      const siteWallet = process.env.NEXT_PUBLIC_SITE_FEE_WALLET
      console.log(`💰 Fee Configuration: ${feePercentage}% → ${siteWallet}`)
      
      // Add demo function for testing challenges
      window.testChallengeCompletion = () => {
        console.log('🧪 Testing challenge completion...')
        window.updateChallengeProgress("coins_eaten", 50) // Complete coin collector
        setTimeout(() => window.updateChallengeProgress("survival_time", 300), 1000) // Complete survivor
        setTimeout(() => window.updateChallengeProgress("cashout"), 2000) // Add cashout progress
      }
      console.log('  - window.testChallengeCompletion() // Complete some challenges for testing')
    }
  }, [currentWalletAddress])

  // Handle balance refresh
  const handleBalanceRefresh = () => {
    console.log('🔄 Manual balance refresh triggered')
    fetchWalletBalance()
  }

  // Copy wallet address to clipboard
  const handleCopyAddress = async () => {
    try {
      console.log('📋 Copy address button clicked')
      
      // Check if Privy is available and user is authenticated
      if (!window.__TURFLOOT_PRIVY__ || !window.__TURFLOOT_PRIVY__.authenticated) {
        alert('Please login first to copy your wallet address.')
        return
      }
      
      const privy = window.__TURFLOOT_PRIVY__
      const user = privy.user
      
      if (!user || !user.wallet || !user.wallet.address) {
        alert('No wallet address found. Please ensure your wallet is connected.')
        return
      }
      
      const walletAddress = user.wallet.address
      console.log('📋 Copying wallet address:', walletAddress)
      
      // Copy to clipboard using modern API
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(walletAddress)
          console.log('✅ Address copied to clipboard via Clipboard API')
          
          // Show success feedback
          alert(`Wallet address copied to clipboard!\n\n${walletAddress}`)
        } catch (clipboardError) {
          console.log('⚠️ Clipboard API failed, trying fallback method')
          copyToClipboardFallback(walletAddress)
        }
      } else {
        // Fallback for older browsers or non-secure contexts
        copyToClipboardFallback(walletAddress)
      }
      
    } catch (error) {
      console.error('❌ Error copying wallet address:', error)
      alert('Failed to copy wallet address. Please try again.')
    }
  }

  // Fallback clipboard copy method
  const copyToClipboardFallback = (text) => {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        console.log('✅ Address copied to clipboard via fallback method')
        alert(`Wallet address copied to clipboard!\n\n${text}`)
      } else {
        console.log('❌ Fallback copy method failed')
        alert(`Failed to copy automatically. Your wallet address is:\n\n${text}\n\nPlease copy it manually.`)
      }
    } catch (fallbackError) {
      console.error('❌ Fallback copy method error:', fallbackError)
      alert(`Failed to copy automatically. Your wallet address is:\n\n${text}\n\nPlease copy it manually.`)
    }
  }

  // SIMPLE DEPOSIT: Just fund user's embedded wallet via Privy
  const handleDeposit = async () => {
    console.log('💰 DEPOSIT SOL clicked - opening Privy funding modal!')
    
    try {
      // Ensure user is authenticated
      if (!authenticated) {
        console.log('⚠️ User not authenticated')
        await login()
        return
      }
      
      if (!ready) {
        console.log('⚠️ Privy not ready')
        return
      }
      
      // Get the embedded Solana wallet address
      const embeddedWallet = privyUser?.linkedAccounts?.find(
        account => account.type === 'wallet' && account.chainType === 'solana'
      )
      
      if (!embeddedWallet) {
        console.error('❌ No embedded Solana wallet found')
        alert('No Solana wallet found. Please refresh and try again.')
        return
      }
      
      console.log('✅ Opening Privy funding modal for embedded wallet:', embeddedWallet.address)
      
      // Open Privy funding modal - user funds their own embedded wallet
      await fundWallet({ address: embeddedWallet.address })
      
      console.log('✅ Privy funding modal opened!')
      
      // Balance will auto-update via polling
      
    } catch (error) {
      console.error('❌ Error opening funding modal:', error)
      
      if (!error.message?.includes('User') && !error.message?.includes('cancel')) {
        alert(`Error: ${error.message}`)
      }
    }
  }
  const handleWithdraw = async () => {
    try {
      console.log('💸 WITHDRAW button clicked - Desktop/Mobile')
      console.log('🔍 Current authentication state:', { authenticated, privyUser: !!privyUser })
      console.log('🔍 withdrawalModalVisible current state:', withdrawalModalVisible)
      
      // Check authentication using Privy hooks directly
      if (!authenticated || !privyUser) {
        console.log('❌ User not authenticated, triggering login')
        if (typeof login === 'function') {
          await login()
          return
        } else {
          alert('Please log in first to access withdrawal functionality.')
          return
        }
      }
      
      console.log('✅ User authenticated via Privy, opening withdrawal modal')
      console.log('👤 User wallet:', privyUser.wallet?.address || 'No wallet')
      
      // Decide which withdrawal modal to show based on responsive state & viewport
      const shouldUseMobileModal =
        isMobile || (typeof window !== 'undefined' && window.innerWidth < 768)

      if (shouldUseMobileModal) {
        console.log('📱 Opening mobile withdrawal modal')
        setWithdrawalModalVisible(true)
        setDesktopWithdrawalModalVisible(false)
      } else {
        console.log('🖥️ Opening desktop withdrawal modal')
        setDesktopWithdrawalModalVisible(true)
        setWithdrawalModalVisible(false)
      }
      
    } catch (error) {
      console.error('❌ Withdraw error:', error)
      
      // More specific error handling
      if (error.message?.includes('invalid address')) {
        alert('Wallet address error. Please try logging out and back in to refresh your wallet connection.')
      } else if (error.message?.includes('network')) {
        alert('Network error. Please check your connection and try again.')
      } else {
        alert(`Withdrawal error: ${error.message || 'Unknown error occurred'}. Please try again or contact support.`)
      }
    }
  }



  const createWithdrawPopup = (user) => {
    // Remove any existing withdraw popup
    const existing = document.getElementById('withdraw-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'withdraw-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 2px solid #fc8181 !important;
      border-radius: 16px !important;
      width: 500px !important;
      max-width: 90vw !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(252, 129, 129, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    const walletAddress = user?.wallet?.address || 'No wallet connected'
    const shortAddress = walletAddress.length > 10 ? 
      `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 
      walletAddress

    const withdrawHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #fc8181; background: linear-gradient(45deg, rgba(252, 129, 129, 0.1) 0%, rgba(252, 129, 129, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              💸
            </div>
            <div>
              <h2 style="color: #fc8181; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(252, 129, 129, 0.6);">
                WITHDRAW FUNDS
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Withdraw funds from your TurfLoot wallet
              </p>
            </div>
          </div>
          <button id="close-withdraw" style="background: rgba(252, 129, 129, 0.2); border: 2px solid #fc8181; border-radius: 8px; padding: 12px; color: #fc8181; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Wallet Info -->
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(45, 55, 72, 0.5); border: 1px solid #fc8181; border-radius: 8px;">
          <div style="color: #fc8181; font-size: 14px; font-weight: 600; margin-bottom: 8px;">CONNECTED WALLET</div>
          <div style="color: #e2e8f0; font-size: 16px; font-family: monospace;">${shortAddress}</div>
        </div>

        <!-- Current Balance -->
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(246, 173, 85, 0.1); border: 1px solid #f6ad55; border-radius: 8px;">
          <div style="color: #f6ad55; font-size: 14px; font-weight: 600; margin-bottom: 8px;">AVAILABLE BALANCE</div>
          <div style="color: #e2e8f0; font-size: 24px; font-weight: 700;">
            ${walletBalance.loading ? 'Loading...' : `$${walletBalance.usd} USD`}
          </div>
          <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">
            ${walletBalance.loading ? 'Fetching balance...' : `${walletBalance.sol} SOL available`}
          </div>
        </div>

        <!-- Withdraw Amount -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            WITHDRAW AMOUNT
          </label>
          <div style="display: flex; gap: 12px;">
            <input 
              id="withdraw-amount" 
              type="number" 
              placeholder="0.00" 
              min="0"
              step="0.01"
              style="flex: 1; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
            />
            <select id="withdraw-currency" style="padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif;">
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        <!-- Destination Address -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            DESTINATION ADDRESS (OPTIONAL)
          </label>
          <input 
            id="withdraw-address" 
            type="text" 
            placeholder="Use connected wallet address"
            style="width: 100%; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 14px; font-family: monospace; box-sizing: border-box;"
          />
          <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">Leave empty to withdraw to your connected wallet</div>
        </div>

        <!-- Important Notice -->
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(252, 129, 129, 0.1); border: 1px solid #fc8181; border-radius: 8px;">
          <div style="color: #fc8181; font-size: 14px; font-weight: 600; margin-bottom: 8px;">⚠️ WITHDRAWAL TERMS</div>
          <div style="color: #e2e8f0; font-size: 12px; line-height: 1.4;">
            • Minimum withdrawal: 0.01 SOL<br>
            • Network fees will be deducted from withdrawal amount<br>
            • Processing time: 1-5 minutes<br>
            • Withdrawals are final and cannot be reversed
          </div>
        </div>

        <!-- Invite Friends Section -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
            👥 INVITE FRIENDS
          </label>
          
          <!-- Friends Search -->
          <div style="margin-bottom: 16px;">
            <input 
              id="friend-search-input" 
              type="text" 
              placeholder="Search friends..." 
              style="width: 100%; padding: 10px 16px; background: rgba(45, 55, 72, 0.6); border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 14px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
            />
          </div>
          
          <!-- Friends List -->
          <div id="friends-invite-list" style="max-height: 150px; overflow-y: auto; background: rgba(45, 55, 72, 0.3); border: 1px solid #4a5568; border-radius: 6px; padding: 12px;">
            <!-- Friends will be populated dynamically -->
          </div>
          
          <!-- Selected Friends Counter -->
          <div id="selected-friends-counter" style="margin-top: 8px; color: #a0aec0; font-size: 12px; text-align: center;">
            0 friends selected for invitation
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="cancel-withdraw" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CANCEL
          </button>
          <button id="confirm-withdraw" style="flex: 1; padding: 16px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border: 2px solid #fc8181; border-radius: 8px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; box-shadow: 0 0 20px rgba(252, 129, 129, 0.4);">
            WITHDRAW FUNDS
          </button>
        </div>
      </div>
    `

    modal.innerHTML = withdrawHTML

    // Add interactivity
    const confirmBtn = modal.querySelector('#confirm-withdraw')
    confirmBtn.addEventListener('click', async () => {
      const amount = parseFloat(modal.querySelector('#withdraw-amount').value)
      const currency = modal.querySelector('#withdraw-currency').value
      const address = modal.querySelector('#withdraw-address').value.trim()
      
      if (!amount || amount <= 0) {
        alert('Please enter a valid withdrawal amount')
        return
      }
      
      if (amount < 0.01) {
        alert('Minimum withdrawal amount is 0.01')
        return
      }
      
      const destinationAddress = address || walletAddress
      
      console.log('💸 Processing withdrawal:', { amount, currency, address: destinationAddress, user: user.id })
      
      // Here you would integrate with Privy's wallet functionality
      // For now, show success message
      alert(`Withdrawal initiated: ${amount} ${currency}\n\nDestination: ${destinationAddress.substring(0, 10)}...\n\nProcessing time: 1-5 minutes`)
      popup.remove()
      
      // In a real implementation, you would:
      // 1. Verify user has sufficient balance
      // 2. Create and sign the withdrawal transaction
      // 3. Submit to blockchain
      // 4. Update user balance via API
    })

    // Close handlers
    const closeBtn = modal.querySelector('#close-withdraw')
    const cancelBtn = modal.querySelector('#cancel-withdraw')
    
    const closePopup = () => popup.remove()
    
    closeBtn.addEventListener('click', closePopup)
    cancelBtn.addEventListener('click', closePopup)
    
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closePopup()
    })

    popup.appendChild(modal)
    document.body.appendChild(popup)
    
    console.log('💸 Withdraw popup created')
  }

  const createGameLoadingPopup = () => {
    // Remove any existing loading popup
    const existing = document.getElementById('game-loading-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'game-loading-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.98) !important;
      backdrop-filter: blur(15px) !important;
      z-index: 10000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 3px solid #68d391 !important;
      border-radius: 20px !important;
      width: 600px !important;
      max-width: 90vw !important;
      color: white !important;
      box-shadow: 0 0 60px rgba(104, 211, 145, 0.6) !important;
      font-family: "Rajdhani", sans-serif !important;
      overflow: hidden !important;
    `

    const loadingHTML = `
      <div style="padding: 32px; text-align: center;">
        <!-- Game Logo/Icon -->
        <div style="margin-bottom: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto; border: 4px solid #68d391; animation: pulse 2s infinite;">
            🎮
          </div>
        </div>

        <!-- Loading Title -->
        <h2 style="color: #68d391; font-size: 32px; font-weight: 700; margin: 0 0 16px 0; text-transform: uppercase; text-shadow: 0 0 15px rgba(104, 211, 145, 0.8);">
          LOADING GAME
        </h2>
        
        <!-- Status Message -->
        <div id="loading-status" style="color: #a0aec0; font-size: 16px; margin-bottom: 32px; min-height: 24px;">
          Initializing multiplayer connection...
        </div>

        <!-- Progress Bar Container -->
        <div style="background: rgba(45, 55, 72, 0.8); border: 2px solid #4a5568; border-radius: 12px; height: 24px; margin-bottom: 24px; overflow: hidden; position: relative;">
          <div id="progress-bar" style="
            background: linear-gradient(90deg, #68d391 0%, #38a169 50%, #68d391 100%);
            height: 100%;
            width: 0%;
            transition: width 0.5s ease;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(104, 211, 145, 0.5);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
              animation: shimmer 2s infinite;
            "></div>
          </div>
        </div>

        <!-- Progress Percentage -->
        <div id="progress-text" style="color: #68d391; font-size: 18px; font-weight: 700; margin-bottom: 24px;">
          0%
        </div>

        <!-- Game Tips -->
        <div style="background: rgba(104, 211, 145, 0.1); border: 1px solid #68d391; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="color: #68d391; font-size: 14px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase;">
            🎯 GAME TIP
          </div>
          <div id="game-tip" style="color: #e2e8f0; font-size: 14px; line-height: 1.6;">
            Collect smaller players to grow larger and dominate the battlefield!
          </div>
        </div>

        <!-- Cancel Button -->
        <button id="cancel-loading" style="
          padding: 12px 24px; 
          background: rgba(252, 129, 129, 0.2); 
          border: 2px solid #fc8181; 
          border-radius: 8px; 
          color: #fc8181; 
          font-size: 14px; 
          font-weight: 700; 
          cursor: pointer; 
          font-family: 'Rajdhani', sans-serif; 
          text-transform: uppercase;
          transition: all 0.3s ease;
        ">
          CANCEL
        </button>
      </div>

      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(104, 211, 145, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(104, 211, 145, 0.8); }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      </style>
    `

    modal.innerHTML = loadingHTML
    popup.appendChild(modal)

    // Game tips array
    const gameTips = [
      "Collect smaller players to grow larger and dominate the battlefield!",
      "Split your cell with SPACE to catch smaller players or escape danger!",
      "Press W to eject mass and feed teammates or sacrifice for speed!",
      "Avoid larger players - they can absorb you in one bite!",
      "Use viruses strategically - they split large players into smaller pieces!",
      "Team up with friends for better survival and tactical advantages!",
      "Stay near the edges to avoid being surrounded by larger players!",
      "The leaderboard shows the top 10 players - climb your way up!"
    ]

    // Loading states and messages
    const loadingStates = [
      { progress: 10, message: "Connecting to Hathora servers...", delay: 800 },
      { progress: 25, message: "Authenticating player credentials...", delay: 1000 },
      { progress: 40, message: "Joining multiplayer lobby...", delay: 1200 },
      { progress: 55, message: "Loading game assets...", delay: 900 },
      { progress: 70, message: "Synchronizing with other players...", delay: 1100 },
      { progress: 85, message: "Initializing game world...", delay: 800 },
      { progress: 95, message: "Preparing battlefield...", delay: 600 },
      { progress: 100, message: "Ready to play! Launching game...", delay: 500 }
    ]

    let currentStateIndex = 0
    let currentTipIndex = 0

    // Update progress function
    const updateProgress = () => {
      if (currentStateIndex >= loadingStates.length) return

      const state = loadingStates[currentStateIndex]
      const progressBar = modal.querySelector('#progress-bar')
      const progressText = modal.querySelector('#progress-text')
      const statusMessage = modal.querySelector('#loading-status')

      // Update progress bar and text
      progressBar.style.width = `${state.progress}%`
      progressText.textContent = `${state.progress}%`
      statusMessage.textContent = state.message

      console.log(`🎮 Loading Progress: ${state.progress}% - ${state.message}`)

      currentStateIndex++

      // If loading is complete, proceed to game
      if (state.progress === 100) {
        setTimeout(() => {
          console.log('✅ Loading complete - proceeding to game')
          // The actual redirect happens in the calling function
        }, state.delay)
      } else {
        // Schedule next update
        setTimeout(updateProgress, state.delay)
      }
    }

    // Rotate game tips
    const rotateTips = () => {
      const tipElement = modal.querySelector('#game-tip')
      currentTipIndex = (currentTipIndex + 1) % gameTips.length
      tipElement.textContent = gameTips[currentTipIndex]
    }

    // Cancel button handler
    const cancelButton = modal.querySelector('#cancel-loading')
    cancelButton.addEventListener('click', () => {
      console.log('❌ Game loading cancelled by user')
      popup.remove()
    })

    // Add hover effect to cancel button
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.background = 'rgba(252, 129, 129, 0.3)'
      cancelButton.style.boxShadow = '0 0 15px rgba(252, 129, 129, 0.4)'
    })

    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.background = 'rgba(252, 129, 129, 0.2)'
      cancelButton.style.boxShadow = 'none'
    })

    // Start loading animation
    setTimeout(updateProgress, 500)

    // Start tip rotation
    const tipInterval = setInterval(rotateTips, 3000)

    // Store cleanup function
    popup.cleanup = () => {
      clearInterval(tipInterval)
      popup.remove()
    }

    // Add popup to DOM
    document.body.appendChild(popup)

    console.log('🎮 Game loading popup created')
    return popup
  }

  const createSkinStorePopup = (currentCurrency, setCurrencyCallback, selectedSkinData, setSelectedSkinCallback, defaultTab = 'owned') => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing skin store popup
    const existing = document.getElementById('desktop-skin-store-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-skin-store-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 2px solid #f6ad55 !important;
      border-radius: 16px !important;
      width: 900px !important;
      max-width: 90vw !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(246, 173, 85, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Mock skin data - in production this would come from API
    const availableSkins = [
      // Owned skins
      { id: 'default', name: 'Default Warrior', price: 0, owned: true, rarity: 'common', color: '#4A90E2' },
      { id: 'stealth', name: 'Stealth Operative', price: 150, owned: true, rarity: 'common', color: '#2C3E50' },
      { id: 'flame', name: 'Flame Guardian', price: 300, owned: true, rarity: 'common', color: '#E74C3C' },
      { id: 'toxic', name: 'Toxic Assassin', price: 250, owned: true, rarity: 'common', color: '#27AE60' },
      { id: 'electric', name: 'Electric Storm', price: 500, owned: true, rarity: 'common', color: '#F39C12' },
      { id: 'shadow', name: 'Shadow Reaper', price: 450, owned: true, rarity: 'common', color: '#8E44AD' },
      
      // Shop skins - Common tier
      { id: 'coral', name: 'Coral Reef', price: 100, owned: false, rarity: 'common', color: '#FF7F7F' },
      { id: 'forest', name: 'Forest Spirit', price: 120, owned: false, rarity: 'common', color: '#228B22' },
      
      // Shop skins - Uncommon tier  
      { id: 'crimson', name: 'Crimson Blade', price: 200, owned: false, rarity: 'uncommon', color: '#DC143C' },
      { id: 'ocean', name: 'Ocean Depths', price: 180, owned: false, rarity: 'uncommon', color: '#1E90FF' },
      { id: 'mint', name: 'Mint Fresh', price: 160, owned: false, rarity: 'uncommon', color: '#00FA9A' },
      
      // Shop skins - Rare tier
      { id: 'midnight', name: 'Midnight Oil', price: 350, owned: false, rarity: 'rare', color: '#191970' },
      { id: 'magma', name: 'Magma Core', price: 400, owned: false, rarity: 'rare', color: '#FF4500' },
      { id: 'arctic', name: 'Arctic Frost', price: 380, owned: false, rarity: 'rare', color: '#B0E0E6' },
      
      // Shop skins - Epic tier
      { id: 'plasma', name: 'Plasma Fury', price: 600, owned: false, rarity: 'epic', color: '#FF1493' },
      { id: 'void', name: 'Void Walker', price: 650, owned: false, rarity: 'epic', color: '#483D8B' },
      { id: 'neon', name: 'Neon Pulse', price: 700, owned: false, rarity: 'epic', color: '#00FF00' },
      
      // Shop skins - Legendary tier
      { id: 'golden', name: 'Golden Emperor', price: 1000, owned: false, rarity: 'legendary', color: '#FFD700' },
      { id: 'diamond', name: 'Diamond Elite', price: 2000, owned: false, rarity: 'legendary', color: '#E8F4FD' },
      { id: 'rainbow', name: 'Rainbow Prism', price: 1500, owned: false, rarity: 'legendary', color: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1)' },
      { id: 'cosmic', name: 'Cosmic Entity', price: 2500, owned: false, rarity: 'legendary', color: '#4B0082' }
    ]

    let currentSkin = selectedSkinData.id || 'default' // Initialize with current selected skin
    // Use dynamic currency from missions system instead of hardcoded value

    const skinStoreHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #f6ad55; background: linear-gradient(45deg, rgba(246, 173, 85, 0.1) 0%, rgba(246, 173, 85, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #f6ad55 0%, #ed8936 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🛒
            </div>
            <div>
              <h2 style="color: #f6ad55; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(246, 173, 85, 0.6);">
                SKIN STORE
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Customize your warrior with exclusive skins
              </p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(246, 173, 85, 0.1); border: 1px solid #f6ad55; border-radius: 8px;">
              <div style="color: #f6ad55; font-size: 20px;">💰</div>
              <div style="color: #f6ad55; font-size: 18px; font-weight: 700;" id="player-coins">${currentCurrency}</div>
            </div>
            <button id="close-skin-store" style="background: rgba(246, 173, 85, 0.2); border: 2px solid #f6ad55; border-radius: 8px; padding: 12px; color: #f6ad55; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ✕
            </button>
          </div>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Skin Categories -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <button class="category-tab" data-category="all" style="flex: 1; padding: 12px; background: linear-gradient(45deg, #f6ad55 0%, #ed8936 100%); border: 2px solid #f6ad55; border-radius: 8px; color: white; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              ALL SKINS
            </button>
            <button class="category-tab" data-category="owned" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              OWNED
            </button>
            <button class="category-tab" data-category="shop" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              SHOP
            </button>
          </div>
        </div>

        <!-- Skins Grid -->
        <div id="skins-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; max-height: 400px; overflow-y: auto;">
          <!-- Skins will be populated here -->
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="close-store" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CLOSE STORE
          </button>
        </div>
      </div>
    `

    modal.innerHTML = skinStoreHTML
    popup.appendChild(modal)

    // Add interactivity
    let currentCategory = defaultTab // Use the passed defaultTab parameter
    
    // Rarity colors
    const rarityColors = {
      common: '#a0aec0',
      uncommon: '#68d391', 
      rare: '#3182ce',
      epic: '#9f7aea',
      legendary: '#f6ad55'
    }

    // Tab switching
    const categoryTabs = modal.querySelectorAll('.category-tab')
    
    const switchCategory = (category) => {
      currentCategory = category
      
      // Update tab styles
      categoryTabs.forEach(tab => {
        if (tab.dataset.category === category) {
          tab.style.background = 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)'
          tab.style.border = '2px solid #f6ad55'
          tab.style.color = 'white'
        } else {
          tab.style.background = 'rgba(45, 55, 72, 0.5)'
          tab.style.border = '2px solid #4a5568'
          tab.style.color = '#a0aec0'
        }
      })
      
      renderSkins()
    }
    
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => switchCategory(tab.dataset.category))
    })

    // Render skins function
    const renderSkins = () => {
      const skinsGrid = modal.querySelector('#skins-grid')
      
      let filteredSkins = availableSkins
      if (currentCategory === 'owned') {
        filteredSkins = availableSkins.filter(skin => skin.owned)
      } else if (currentCategory === 'shop') {
        filteredSkins = availableSkins.filter(skin => !skin.owned)
      }
      
      skinsGrid.innerHTML = filteredSkins.map(skin => {
        const rarityColor = rarityColors[skin.rarity]
        const isEquipped = skin.id === selectedSkinData.id // Use the current selected skin instead of static currentSkin
        const canAfford = currentCurrency >= skin.price
        
        return `
          <div class="skin-card" data-skin-id="${skin.id}" style="
            padding: 16px; 
            background: rgba(45, 55, 72, 0.5); 
            border: 2px solid ${isEquipped ? '#68d391' : '#4a5568'}; 
            border-radius: 12px; 
            cursor: pointer; 
            transition: all 0.3s ease;
            ${isEquipped ? 'box-shadow: 0 0 20px rgba(104, 211, 145, 0.4);' : ''}
          ">
            <div style="text-align: center; margin-bottom: 12px;">
              <div style="width: 80px; height: 80px; background: ${skin.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 3px solid #ffffff; position: relative; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">
                <!-- Black Eyes - Same as in-game character -->
                <div style="position: absolute; width: 8px; height: 8px; background: #000000; border-radius: 50%; left: 22px; top: 26px;"></div>
                <div style="position: absolute; width: 8px; height: 8px; background: #000000; border-radius: 50%; right: 22px; top: 26px;"></div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <div style="color: ${rarityColor}; font-size: 16px; font-weight: 700; margin-bottom: 4px;">
                ${skin.name}
              </div>
              <div style="color: ${rarityColor}; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">
                ${skin.rarity}
              </div>
              
              ${skin.owned ? 
                (isEquipped ? 
                  '<div style="color: #68d391; font-size: 12px; font-weight: 600;">✓ EQUIPPED</div>' :
                  '<button class="equip-skin-btn" data-skin-id="' + skin.id + '" style="width: 100%; padding: 8px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border: 2px solid #68d391; border-radius: 6px; color: white; font-size: 12px; font-weight: 700; cursor: pointer; font-family: \'Rajdhani\', sans-serif; text-transform: uppercase;">EQUIP</button>'
                ) : 
                `<button class="buy-skin-btn" data-skin-id="${skin.id}" style="width: 100%; padding: 8px; background: ${canAfford ? 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)' : 'rgba(74, 85, 104, 0.5)'}; border: 2px solid ${canAfford ? '#f6ad55' : '#4a5568'}; border-radius: 6px; color: ${canAfford ? 'white' : '#a0aec0'}; font-size: 12px; font-weight: 700; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
                  🪙 ${skin.price} COINS
                </button>`
              }
            </div>
          </div>
        `
      }).join('')
      
      // Add click handlers
      const skinCards = skinsGrid.querySelectorAll('.skin-card')
      const equipButtons = skinsGrid.querySelectorAll('.equip-skin-btn')
      const buyButtons = skinsGrid.querySelectorAll('.buy-skin-btn')
      
      // Skin card hover effects
      skinCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
          if (card.dataset.skinId !== currentSkin) {
            card.style.border = '2px solid #f6ad55'
            card.style.background = 'rgba(246, 173, 85, 0.1)'
          }
        })
        
        card.addEventListener('mouseleave', () => {
          if (card.dataset.skinId !== currentSkin) {
            card.style.border = '2px solid #4a5568'
            card.style.background = 'rgba(45, 55, 72, 0.5)'
          }
        })
      })
      
      // Equip skin buttons
      console.log('🔧 Found equip buttons:', equipButtons.length)
      
      equipButtons.forEach((btn, index) => {
        console.log(`🔧 Attaching event listener to button ${index + 1}:`, btn.dataset.skinId)
        btn.addEventListener('click', async (e) => {
          console.log('🎯 EQUIP button clicked!', btn.dataset.skinId)
          e.stopPropagation()
          const skinId = btn.dataset.skinId
          const skin = availableSkins.find(s => s.id === skinId)
          
          if (!skin) {
            console.error('❌ Skin not found for ID:', skinId)
            return
          }
          
          console.log('✅ Found skin to equip:', skin.name, skin.id)
          
          currentSkin = skinId
          
          // Update current skin display and landing page preview
          const currentSkinPreview = modal.querySelector('#current-skin-preview')
          const currentSkinName = modal.querySelector('#current-skin-name')
          
          // Only update preview elements if they exist
          if (currentSkinPreview) {
            currentSkinPreview.style.background = skin.color
            currentSkinPreview.innerHTML = `
              <div style="position: absolute; width: 6px; height: 6px; background: #000000; border-radius: 50%; left: 16px; top: 20px;"></div>
              <div style="position: absolute; width: 6px; height: 6px; background: #000000; border-radius: 50%; right: 16px; top: 20px;"></div>
            `
          }
          
          if (currentSkinName) {
            currentSkinName.textContent = skin.name
          }
          
          // Update landing page preview circle and state
          setSelectedSkinCallback({
            id: skin.id,
            name: skin.name,
            color: skin.color,
            type: skin.type || 'circle',
            pattern: skin.pattern || 'solid'
          })
          
          // Update the selected skin state
          setSelectedSkin({
            id: skin.id,
            name: skin.name,
            color: skin.color,
            type: skin.type || 'circle',
            pattern: skin.pattern || 'solid'
          })
          
          // Save equipped skin to localStorage
          localStorage.setItem('selectedSkin', JSON.stringify({
            id: skin.id,
            name: skin.name,
            color: skin.color,
            type: skin.type || 'circle',
            pattern: skin.pattern || 'solid'
          }))
          
          const applyEquipUiFeedback = () => {
            btn.textContent = 'EQUIPPED!'
            btn.style.background = 'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)'
            btn.style.borderColor = '#22c55e'
          }

          const refreshSkinStore = (logMessage = '🔄 Skin store UI refreshed to show new equipped status') => {
            renderSkins()
            console.log(logMessage)
          }

          applyEquipUiFeedback()
          refreshSkinStore()

          // Show feedback for 2 seconds, then update the entire store again
          setTimeout(() => {
            refreshSkinStore('🔄 Skin store UI refreshed to show new equipped status (delayed)')
          }, 2000)

          // Save equipped skin to backend/database
          if (isAuthenticated && user) {
            const userIdentifier = user.wallet?.address || user.email || user.id

            try {
              console.log('💾 Saving equipped skin to backend for user:', userIdentifier)

              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/friends`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'update_equipped_skin',
                  userIdentifier: userIdentifier,
                  equippedSkin: {
                    id: skin.id,
                    name: skin.name,
                    color: skin.color,
                    type: skin.type || 'circle',
                    pattern: skin.pattern || 'solid'
                  }
                })
              })

              if (response.ok) {
                console.log('✅ Equipped skin saved to backend successfully')

                // Refresh party data to show updated skin
                console.log('🔄 Refreshing party data to show updated skin...')
                await loadCurrentParty()

              } else {
                console.error('❌ Failed to save equipped skin to backend:', response.status)
              }
            } catch (error) {
              console.error('❌ Error saving equipped skin to backend:', error)
            } finally {
              refreshSkinStore('🔄 Skin store UI refreshed after backend sync attempt')
            }
          }

          console.log('✅ Skin equipped successfully:', {
            skinId: skin.id,
            skinName: skin.name,
            skinColor: skin.color
          })
          
          // Save to localStorage for persistence across sessions
          localStorage.setItem('selectedSkin', JSON.stringify({
            id: skin.id,
            name: skin.name,
            color: skin.color
          }))
          
          console.log('🎨 Equipped skin:', skin.name)
          // Removed popup notification for smoother UX
        })
      })
      
      // Buy skin buttons
      buyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const skinId = btn.dataset.skinId
          const skin = availableSkins.find(s => s.id === skinId)
          
          if (currentCurrency >= skin.price) {
            // Purchase skin
            setCurrencyCallback(prev => prev - skin.price)
            skin.owned = true
            
            // Update UI display immediately
            const coinsDisplay = modal.querySelector('#player-coins')
            coinsDisplay.textContent = currentCurrency - skin.price
            
            console.log('🛒 Purchased skin:', skin.name, 'for', skin.price, 'coins')
            alert(`Successfully purchased ${skin.name} for ${skin.price} coins!`)
            
            renderSkins() // Re-render to show as owned
          } else {
            alert(`Not enough coins! You need ${skin.price - currentCurrency} more coins.`)
          }
        })
      })
    }

    // Close popup handlers
    const closeButton = modal.querySelector('#close-skin-store')
    const closeStoreButton = modal.querySelector('#close-store')
    
    const closePopup = () => {
      popup.remove()
    }
    
    closeButton.addEventListener('click', closePopup)
    closeStoreButton.addEventListener('click', closePopup)
    
    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closePopup()
      }
    })

    // Initialize the correct tab based on defaultTab parameter
    const allTab = modal.querySelector('[data-category="all"]')
    const ownedTab = modal.querySelector('[data-category="owned"]')
    const shopTab = modal.querySelector('[data-category="shop"]')
    
    // Reset all tabs to inactive state
    ;[allTab, ownedTab, shopTab].forEach(tab => {
      if (tab) {
        tab.style.background = 'rgba(45, 55, 72, 0.5)'
        tab.style.border = '2px solid #4a5568'
        tab.style.color = '#a0aec0'
      }
    })
    
    // Set the default tab to active state
    const defaultTabElement = modal.querySelector(`[data-category="${defaultTab}"]`)
    if (defaultTabElement) {
      defaultTabElement.style.background = 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)'
      defaultTabElement.style.border = '2px solid #f6ad55'
      defaultTabElement.style.color = 'white'
    }

    // Initial render
    renderSkins()

    // Add popup to DOM
    document.body.appendChild(popup)

    console.log('🛒 Skin store popup created with direct DOM manipulation')
  }

  // DEPRECATED: Old DOM-based server browser - DISABLED to prevent conflicts
  const createDesktopServerBrowserPopup = () => {
    console.log('🚫 Old DOM server browser disabled - using React modal instead')
    // This function has been replaced by the React ServerBrowserModal
    // to prevent region mapping conflicts and improve user experience
    return
  }

  const createDesktopJoinPartyPopup = () => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing join party popup
    const existing = document.getElementById('desktop-join-party-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-join-party-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 2px solid #68d391 !important;
      border-radius: 16px !important;
      width: 600px !important;
      max-width: 90vw !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(104, 211, 145, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Generate party join HTML
    const joinPartyHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #68d391; background: linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🚀
            </div>
            <div>
              <h2 style="color: #68d391; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(104, 211, 145, 0.6);">
                JOIN PARTY
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Join existing parties or friends' squads
              </p>
            </div>
          </div>
          <button id="close-join-party" style="background: rgba(104, 211, 145, 0.2); border: 2px solid #68d391; border-radius: 8px; padding: 12px; color: #68d391; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Search Party Input -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #68d391; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            SEARCH PARTIES
          </label>
          <input 
            id="party-search-input" 
            type="text" 
            placeholder="Search by party name or player..." 
            style="width: 100%; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #68d391; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
          />
        </div>

        <!-- Party Type Tabs -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button id="public-parties-tab" class="party-type-tab" data-type="public" style="flex: 1; padding: 12px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border: 2px solid #68d391; border-radius: 8px; color: white; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              PUBLIC PARTIES
            </button>
            <button id="friends-parties-tab" class="party-type-tab" data-type="friends" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              FRIENDS PARTIES
            </button>
          </div>
        </div>

        <!-- Parties List -->
        <div id="parties-list" style="margin-bottom: 24px; max-height: 300px; overflow-y: auto;">
          <!-- This will be populated dynamically -->
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="cancel-join-party" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CANCEL
          </button>
          <button id="refresh-parties-btn" style="flex: 1; padding: 16px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border: 2px solid #68d391; border-radius: 8px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; box-shadow: 0 0 20px rgba(104, 211, 145, 0.4);">
            REFRESH PARTIES
          </button>
        </div>
      </div>
    `

    modal.innerHTML = joinPartyHTML
    popup.appendChild(modal)

    // Add interactivity
    let currentTab = 'public'
    let selectedParty = null
    let currentParties = [] // Store parties data for party selection
    
    // Tab switching
    const publicTab = modal.querySelector('#public-parties-tab')
    const friendsTab = modal.querySelector('#friends-parties-tab')
    
    const switchTab = (tabType) => {
      currentTab = tabType
      if (tabType === 'public') {
        publicTab.style.background = 'linear-gradient(45deg, #68d391 0%, #38a169 100%)'
        publicTab.style.border = '2px solid #68d391'
        publicTab.style.color = 'white'
        friendsTab.style.background = 'rgba(45, 55, 72, 0.5)'
        friendsTab.style.border = '2px solid #4a5568'
        friendsTab.style.color = '#a0aec0'
      } else {
        friendsTab.style.background = 'linear-gradient(45deg, #68d391 0%, #38a169 100%)'
        friendsTab.style.border = '2px solid #68d391'
        friendsTab.style.color = 'white'
        publicTab.style.background = 'rgba(45, 55, 72, 0.5)'
        publicTab.style.border = '2px solid #4a5568'
        publicTab.style.color = '#a0aec0'
      }
      loadParties()
    }
    
    publicTab.addEventListener('click', () => switchTab('public'))
    friendsTab.addEventListener('click', () => switchTab('friends'))

    // Load parties function
    const loadParties = async () => {
      const partiesList = modal.querySelector('#parties-list')
      
      try {
        // Determine current tab
        const currentTab = modal.querySelector('.party-type-tab[style*="68d391"]')?.dataset?.type || 'public'
        
        // Build API URL based on current tab
        let apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/party?type=${currentTab}`
        
        // For friends parties, we need to pass the user identifier
        if (currentTab === 'friends' && isAuthenticated && user) {
          const userIdentifier = user.wallet?.address || user.email || user.id
          apiUrl += `&userIdentifier=${userIdentifier}`
        }
        
        console.log('🔍 Fetching parties from:', apiUrl)
        
        // Fetch parties from API based on current tab
        const response = await fetch(apiUrl)
        const partiesData = await response.json()
        
        if (!partiesData.success) {
          console.warn('Failed to fetch parties:', partiesData.error)
          showEmptyState()
          return
        }
        
        const parties = partiesData.parties || []
        console.log(`✅ Loaded ${parties.length} ${currentTab} parties:`, parties)
        
        if (parties.length === 0) {
          showEmptyState()
          return
        }
        
        // Render parties
        renderParties(parties)
        
      } catch (error) {
        console.error('Error fetching parties:', error)
        showEmptyState()
      }
    }
    
    const showEmptyState = () => {
      const partiesList = modal.querySelector('#parties-list')
      const currentTab = modal.querySelector('.party-type-tab[style*="68d391"]')?.dataset?.type || 'public'
      
      partiesList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #9ca3af;">
          <div style="font-size: 48px; margin-bottom: 16px;">🏠</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #ffffff;">
            No ${currentTab === 'public' ? 'Public' : 'Friends'} Parties Available
          </div>
          <div style="font-size: 14px; line-height: 1.4;">
            ${currentTab === 'public' 
              ? 'No active public lobbies found. Be the first to create one!' 
              : 'Your friends haven\'t created any private parties yet.'}
          </div>
        </div>
      `
    }
    
    const renderParties = (parties) => {
      const partiesList = modal.querySelector('#parties-list')
      
      // Store parties data for selection
      currentParties = parties
      
      partiesList.innerHTML = parties.map(party => `
        <div class="party-item" data-party-id="${party.id}" style="
          padding: 16px; 
          margin-bottom: 12px; 
          background: rgba(45, 55, 72, 0.5); 
          border: 2px solid #4a5568; 
          border-radius: 8px; 
          cursor: pointer; 
          transition: all 0.3s ease;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="color: #68d391; font-size: 18px; font-weight: 700;">
                  ${party.name}
                </div>
                <div style="padding: 4px 8px; background: rgba(104, 211, 145, 0.2); border: 1px solid #68d391; border-radius: 4px; font-size: 10px; color: #68d391; text-transform: uppercase;">
                  ${party.privacy}
                </div>
              </div>
              <div style="color: #a0aec0; font-size: 14px;">
                Host: ${party.createdByUsername || 'Unknown'} • Members: ${party.currentPlayerCount || 0}/${party.maxPlayers || 2}
              </div>
            </div>
            <div style="color: #68d391; font-size: 24px;">
              ${party.privacy === 'private' ? '🔒' : '🌐'}
            </div>
          </div>
        </div>
      `).join('')
      
      // Add click handlers to party items
      const partyItems = partiesList.querySelectorAll('.party-item')
      partyItems.forEach(item => {
        item.addEventListener('click', () => {
          // Remove selection from all items
          partyItems.forEach(p => {
            p.style.border = '2px solid #4a5568'
            p.style.background = 'rgba(45, 55, 72, 0.5)'
          })
          
          // Select this item
          item.style.border = '2px solid #68d391'
          item.style.background = 'rgba(104, 211, 145, 0.1)'
          
          // Store the full party object instead of just the ID
          const partyId = item.dataset.partyId
          selectedParty = currentParties.find(p => p.id === partyId)
          
          console.log('🎯 Party selected:', selectedParty)
          
          // Show join button
          const joinButton = modal.querySelector('#join-selected-party-btn')
          if (joinButton) {
            joinButton.style.display = 'block'
          } else {
            // Create join button
            const buttonContainer = modal.querySelector('.action-buttons-container')
            if (buttonContainer) {
              const joinButton = document.createElement('button')
              joinButton.id = 'join-selected-party-btn'
              joinButton.innerHTML = 'JOIN SELECTED PARTY'
              joinButton.style.cssText = `
                width: 100%; 
                padding: 16px; 
                background: linear-gradient(45deg, #f6ad55 0%, #ed8936 100%); 
                border: 2px solid #f6ad55; 
                border-radius: 8px; 
                color: white; 
                font-size: 16px; 
                font-weight: 700; 
                cursor: pointer; 
                font-family: 'Rajdhani', sans-serif; 
                text-transform: uppercase; 
                box-shadow: 0 0 20px rgba(246, 173, 85, 0.4);
                margin-top: 12px;
              `
              joinButton.addEventListener('click', async () => {
                console.log('🚀 Joining party:', selectedParty)
                
                try {
                  if (!isAuthenticated || !user) {
                    alert('Please log in to join a party!')
                    return
                  }
                  
                  const userIdentifier = user.wallet?.address || user.email || user.id
                  console.log('🎯 User joining party:', userIdentifier, 'Party ID:', selectedParty.id)
                  
                  // Show loading state
                  joinButton.textContent = 'JOINING...'
                  joinButton.disabled = true
                  
                  // API call to join the party
                  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/party`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action: 'join_party',
                      userIdentifier: userIdentifier,
                      partyId: selectedParty.id
                    })
                  })
                  
                  const result = await response.json()
                  
                  if (response.ok && result.success) {
                    console.log('✅ Successfully joined party:', result)
                    
                    // Update current party state
                    setCurrentParty({
                      id: selectedParty.id,
                      name: selectedParty.name,
                      members: result.party?.members || [],
                      maxPlayers: selectedParty.maxPlayers,
                      privacy: selectedParty.privacy
                    })
                    
                    // Show success message
                    alert(`🎉 Successfully joined "${selectedParty.name}"! You are now part of the party.`)
                    
                    // Close the popup
                    popup.remove()
                    
                    // Refresh party data to show updated state
                    await loadCurrentParty()
                    
                  } else {
                    console.error('❌ Failed to join party:', result.error)
                    alert(`Failed to join party: ${result.error || 'Unknown error'}`)
                    
                    // Reset button
                    joinButton.textContent = 'JOIN SELECTED PARTY'
                    joinButton.disabled = false
                  }
                  
                } catch (error) {
                  console.error('❌ Error joining party:', error)
                  alert('Error joining party. Please try again.')
                  
                  // Reset button
                  joinButton.textContent = 'JOIN SELECTED PARTY'
                  joinButton.disabled = false
                }
              })
              buttonContainer.appendChild(joinButton)
            }
          }
        })
        
        // Add hover effects
        item.addEventListener('mouseenter', () => {
          if (!selectedParty || selectedParty.id !== item.dataset.partyId) {
            item.style.background = 'rgba(45, 55, 72, 0.8)'
          }
        })
        
        item.addEventListener('mouseleave', () => {
          if (!selectedParty || selectedParty.id !== item.dataset.partyId) {
            item.style.background = 'rgba(45, 55, 72, 0.5)'
          }
        })
      })
    }

    // Search functionality
    const searchInput = modal.querySelector('#party-search-input')
    searchInput.addEventListener('input', () => {
      // Implement search filtering logic here
      // For now, just reload parties
      loadParties()
    })

    // Close popup handlers
    const closeButton = modal.querySelector('#close-join-party')
    const cancelButton = modal.querySelector('#cancel-join-party')
    
    const closePopup = () => {
      popup.remove()
    }
    
    closeButton.addEventListener('click', closePopup)
    cancelButton.addEventListener('click', closePopup)
    
    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closePopup()
      }
    })

    // Refresh parties button
    const refreshButton = modal.querySelector('#refresh-parties-btn')
    refreshButton.addEventListener('click', () => {
      console.log('🔄 Refreshing parties...')
      loadParties()
    })

    // Create action buttons container for join button
    const actionButtonsContainer = modal.querySelector('div[style*="display: flex; gap: 12px"]:last-child')
    actionButtonsContainer.classList.add('action-buttons-container')

    // Initial load
    loadParties()

    // Add popup to DOM
    document.body.appendChild(popup)

    console.log('🚀 Desktop join party popup created with direct DOM manipulation')
  }

  const createDesktopCreatePartyPopup = () => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing create party popup
    const existing = document.getElementById('desktop-create-party-popup')
    if (existing) existing.remove()

    // Get the current friends list
    const currentFriends = friendsList.filter(f => f.status === 'accepted') || []
    console.log('🎯 Loading friends for party creation:', {
      totalFriendsInList: friendsList.length,
      acceptedFriends: currentFriends.length,
      allFriends: friendsList,
      acceptedFriendsData: currentFriends
    })

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-create-party-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999999 !important;
      pointer-events: auto !important;
    `

    // Create the modal content
    const modal = document.createElement('div')
    modal.style.cssText = `
      background-color: #1a202c !important;
      border: 3px solid #fc8181 !important;
      border-radius: 12px !important;
      max-width: 600px !important;
      width: 90% !important;
      padding: 0 !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(252, 129, 129, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Generate party creation HTML
    const partyHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #fc8181; background: linear-gradient(45deg, rgba(252, 129, 129, 0.1) 0%, rgba(252, 129, 129, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              👥
            </div>
            <div>
              <h2 style="color: #fc8181; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(252, 129, 129, 0.6);">
                CREATE PARTY
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Set up your squad for tactical gameplay
              </p>
            </div>
          </div>
          <button id="close-create-party" style="background: rgba(252, 129, 129, 0.2); border: 2px solid #fc8181; border-radius: 8px; padding: 12px; color: #fc8181; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Party Name Input -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            PARTY NAME
          </label>
          <input 
            id="party-name-input" 
            type="text" 
            placeholder="Enter party name..." 
            maxlength="20"
            style="width: 100%; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
          />
        </div>

        <!-- Party Privacy Settings -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
            PRIVACY SETTINGS
          </label>
          <div style="display: flex; gap: 12px;">
            <div style="flex: 1; padding: 16px; background: rgba(45, 55, 72, 0.5); border: 2px solid #68d391; border-radius: 8px; cursor: pointer; text-align: center;" id="public-option">
              <div style="font-size: 18px; margin-bottom: 8px;">🌐</div>
              <div style="color: #68d391; font-weight: 600; font-size: 14px; text-transform: uppercase;">PUBLIC</div>
              <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">Anyone can join</div>
            </div>
            <div style="flex: 1; padding: 16px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; cursor: pointer; text-align: center;" id="private-option">
              <div style="font-size: 18px; margin-bottom: 8px;">🔒</div>
              <div style="color: #a0aec0; font-weight: 600; font-size: 14px; text-transform: uppercase;">PRIVATE</div>
              <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">Invite only</div>
            </div>
          </div>
        </div>

        <!-- Invite Friends Section -->
        <div style="margin-bottom: 24px;">
          <label id="friends-section-label" style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
            👥 INVITE FRIENDS
          </label>
          
          <!-- Friends Search -->
          <div style="margin-bottom: 16px;">
            <input 
              id="friend-search-input" 
              type="text" 
              placeholder="Search friends..." 
              style="width: 100%; padding: 10px 16px; background: rgba(45, 55, 72, 0.6); border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 14px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
            />
          </div>
          
          <!-- Friends List -->
          <div id="friends-invite-list" style="max-height: 150px; overflow-y: auto; background: rgba(45, 55, 72, 0.3); border: 1px solid #4a5568; border-radius: 6px; padding: 16px;">
            <!-- Empty state for friends list -->
            <div style="text-align: center; color: #a0aec0; font-size: 14px; padding: 20px 0;">
              <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;">👥</div>
              <div style="margin-bottom: 4px;">No friends to invite</div>
              <div style="font-size: 12px; opacity: 0.7;">Add friends to see them here</div>
            </div>
          </div>
          
          <!-- Selected Friends Counter -->
          <div id="selected-friends-counter" style="margin-top: 8px; color: #a0aec0; font-size: 12px; text-align: center;">
            0 friends selected for invitation
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="cancel-create-party" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CANCEL
          </button>
          <button id="create-party-btn" style="flex: 1; padding: 16px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border: 2px solid #fc8181; border-radius: 8px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; box-shadow: 0 0 20px rgba(252, 129, 129, 0.4);">
            CREATE PARTY
          </button>
        </div>
      </div>
    `

    modal.innerHTML = partyHTML

    // Populate friends list dynamically
    const friendsListContainer = modal.querySelector('#friends-invite-list')
    if (currentFriends.length > 0) {
      // Clear the container and add friends
      friendsListContainer.innerHTML = ''
      
      currentFriends.forEach(friend => {
        const friendItem = document.createElement('div')
        friendItem.className = 'friend-invite-item'
        friendItem.dataset.friendId = friend.id
        friendItem.style.cssText = `
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 10px 12px; 
          margin-bottom: 8px; 
          background: rgba(26, 32, 44, 0.6); 
          border-radius: 6px; 
          border: 1px solid rgba(104, 211, 145, 0.2);
        `
        
        friendItem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${friend.isOnline ? '#22c55e' : '#6b7280'}; ${friend.isOnline ? 'box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);' : ''}"></div>
            <span style="color: ${friend.isOnline ? '#e2e8f0' : '#9ca3af'}; font-size: 14px; font-weight: 500;">${friend.username}</span>
            <span style="color: #a0aec0; font-size: 11px; opacity: 0.7;">${friend.isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <input type="checkbox" class="friend-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #fc8181;" />
        `
        
        friendsListContainer.appendChild(friendItem)
      })
      
      console.log('✅ Populated friends list with', currentFriends.length, 'friends')
    } else {
      // Show empty state
      friendsListContainer.innerHTML = `
        <div style="text-align: center; color: #a0aec0; font-size: 14px; padding: 20px 0;">
          <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;">👥</div>
          <div style="margin-bottom: 4px;">No friends to invite</div>
          <div style="font-size: 12px; opacity: 0.7;">Add friends to see them here</div>
        </div>
      `
      console.log('ℹ️ No friends available, showing empty state')
    }
    
    // Update the friends section label
    const friendsLabel = modal.querySelector('#friends-section-label')
    if (friendsLabel) {
      friendsLabel.textContent = `👥 INVITE FRIENDS`
    }

    // Add interactivity
    let selectedPrivacy = 'public'

    // Privacy option selection
    const publicOption = modal.querySelector('#public-option')
    const privateOption = modal.querySelector('#private-option')
    
    publicOption.addEventListener('click', () => {
      selectedPrivacy = 'public'
      publicOption.style.border = '2px solid #68d391'
      publicOption.querySelector('div:nth-child(2)').style.color = '#68d391'
      privateOption.style.border = '2px solid #4a5568'
      privateOption.querySelector('div:nth-child(2)').style.color = '#a0aec0'
    })
    
    privateOption.addEventListener('click', () => {
      selectedPrivacy = 'private'
      privateOption.style.border = '2px solid #fc8181'
      privateOption.querySelector('div:nth-child(2)').style.color = '#fc8181'
      publicOption.style.border = '2px solid #4a5568'
      publicOption.querySelector('div:nth-child(2)').style.color = '#a0aec0'
    })

    // Close functionality
    const closeButtons = modal.querySelectorAll('#close-create-party, #cancel-create-party')
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => popup.remove())
    })

    // Create party functionality
    modal.querySelector('#create-party-btn').addEventListener('click', async () => {
      const partyName = modal.querySelector('#party-name-input').value.trim()
      
      // Get selected friends with better error handling
      const checkedBoxes = modal.querySelectorAll('.friend-checkbox:checked')
      console.log('🔍 Debug: Found checked boxes:', checkedBoxes.length)
      
      const selectedFriends = Array.from(checkedBoxes).map(cb => {
        const item = cb.closest('.friend-invite-item')
        const friendId = item ? item.dataset.friendId : null
        const friendName = item ? item.querySelector('span').textContent : 'Unknown'
        console.log('🔍 Debug: Processing friend:', { friendId, friendName })
        return {
          id: friendId,
          username: friendName
        }
      }).filter(friend => friend.id) // Remove any invalid entries
      
      console.log('🎯 Debug: Selected friends for invitation:', selectedFriends)
      
      if (!partyName) {
        modal.querySelector('#party-name-input').style.border = '2px solid #e53e3e'
        modal.querySelector('#party-name-input').focus()
        return
      }
      
      // Only require friend selection for private parties
      if (selectedPrivacy === 'private' && selectedFriends.length === 0) {
        alert('Please select at least one friend to invite to your private party!')
        return
      }
      
      // For public parties, no friend selection is required - anyone can join

      // Party is always limited to 2 players maximum
      const partyData = {
        name: partyName,
        privacy: selectedPrivacy,
        maxPlayers: 2
      }
      
      console.log('🎯 Creating party:', partyData)
      console.log('🎯 Invited friends:', selectedFriends)
      
      // Create the party and send invitations
      const result = await createPartyAndSendInvites(partyData, selectedFriends)
      
      if (result && result.success) {
        // Show different success messages based on party type and invites
        if (selectedPrivacy === 'public' && selectedFriends.length === 0) {
          alert(`🎯 Public party "${partyData.name}" created successfully! Other players can now find and join your party.`)
        } else if (selectedFriends.length > 0) {
          alert(`🎯 Party "${partyData.name}" created successfully! Invites sent to ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}.`)
        } else {
          alert(`🎯 Party "${partyData.name}" created successfully!`)
        }
      }
      
      popup.remove()
    })

    // Friends search functionality
    modal.querySelector('#friend-search-input').addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase()
      const friendItems = modal.querySelectorAll('.friend-invite-item')
      
      friendItems.forEach(item => {
        const friendName = item.querySelector('span').textContent.toLowerCase()
        if (friendName.includes(searchTerm)) {
          item.style.display = 'flex'
        } else {
          item.style.display = 'none'
        }
      })
    })

    // Friends selection counter
    const updateSelectedCounter = () => {
      const selectedCount = modal.querySelectorAll('.friend-checkbox:checked').length
      const counter = modal.querySelector('#selected-friends-counter')
      counter.textContent = `${selectedCount} friend${selectedCount !== 1 ? 's' : ''} selected for invitation`
    }

    // Add event listeners to all friend checkboxes (now dynamically generated)
    modal.querySelectorAll('.friend-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectedCounter)
    })
    
    // Update the initial counter display
    updateSelectedCounter()

    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove()
      }
    })

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        popup.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)

    // Focus on party name input
    setTimeout(() => {
      modal.querySelector('#party-name-input').focus()
    }, 100)

    popup.appendChild(modal)
    document.body.appendChild(popup)

    console.log('🎯 Desktop create party popup created with direct DOM manipulation')
  }

  // Authentication check function - FIXED to use Privy hooks
  const requireAuthentication = async (actionName) => {
    if (typeof window === 'undefined') return false
    
    console.log(`🔐 Authentication check for: ${actionName}`)
    console.log('🔍 Privy state:', {
      ready,
      authenticated,
      hasUser: !!privyUser,
      userDisplay: privyUser?.id || 'No user'
    })
    
    // Check if Privy is ready
    if (!ready) {
      console.log('⚠️ Privy not ready yet for:', actionName)
      alert('Authentication service is loading. Please wait a moment and try again.')
      return false
    }

    // Check if user is authenticated via Privy hooks
    if (authenticated && privyUser) {
      console.log('✅ User authenticated via Privy hooks for:', actionName)
      console.log('👤 User details:', {
        id: privyUser.id,
        walletAddress: privyUser.wallet?.address || 'No wallet',
        linkedAccounts: privyUser.linkedAccounts?.length || 0
      })
      
      // Update legacy state variables for compatibility
      setIsAuthenticated(true)
      setUser(privyUser)
      return true
    }

    // User is not authenticated
    console.log('❌ User not authenticated for:', actionName)
    console.log('🔐 Triggering login process...')
    
    try {
      if (typeof login === 'function') {
        await login()
        console.log('✅ Login process completed for:', actionName)
        return true
      } else {
        console.error('❌ Login function not available')
        alert('Authentication service not ready. Please refresh the page and try again.')
        return false
      }
    } catch (error) {
      console.error('❌ Login error for:', actionName, error)
      alert('Login failed. Please try again.')
      return false
    }
  }

  const handleLogin = async () => {
    try {
      console.log('🔐 LOGIN BUTTON CLICKED - Attempting Privy login...')
      console.log('🔍 Privy state check:', {
        ready,
        authenticated,
        loginFunctionAvailable: typeof login === 'function',
        privyUserExists: !!privyUser
      })
      
      if (!ready) {
        console.log('⚠️ Privy not ready yet, please wait...')
        alert('Authentication service is loading. Please wait a moment and try again.')
        return
      }
      
      if (typeof login !== 'function') {
        console.error('❌ Privy login function not available')
        console.log('🔧 Debugging Privy hooks:', { ready, authenticated, login, logout })
        alert('Authentication service not ready. Please refresh the page and try again.')
        return
      }
      
      console.log('🚀 Calling Privy login function...')
      await login()
      console.log('✅ Privy login call completed successfully!')
      
    } catch (error) {
      console.error('❌ Login error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      if (error.message?.includes('User rejected')) {
        console.log('ℹ️ User cancelled the login process')
        // Don't show alert for user cancellation
      } else {
        alert(`Login failed: ${error.message || 'Please try again or refresh the page.'}`)
      }
    }
  }

  const handleLogout = async () => {
    try {
      console.log('🔐 Attempting Privy logout with proper hooks...')
      if (typeof logout === 'function') {
        await logout()
        console.log('✅ Privy logout completed')
        // Clear local state
        setIsAuthenticated(false)
        setUser(null)
        setUserName('PLAYER')
      } else {
        console.error('❌ Privy logout hook not available')
      }
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    height: '100vh', // Lock height to viewport to prevent layout changes from height adjustments
    width: '100vw',
    margin: 0,
    padding: 0,
    background: 'radial-gradient(ellipse at center, #2d3748 0%, #1a202c 50%, #0d1117 100%)',
    color: '#e2e8f0',
    overflow: isMobile ? 'auto' : 'hidden',
    position: 'relative',
    fontFamily: '"Rajdhani", "Arial Black", sans-serif',
    ...(isMobile && {
      paddingBottom: '20px',
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
    })
  }

  const mobileContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: '15px',
    gap: '20px',
    position: 'relative',
    zIndex: 20
  }

  const tacticalPanelStyle = {
    background: 'linear-gradient(135deg, rgba(45, 55, 72, 0.9) 0%, rgba(26, 32, 44, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: isMobile ? '4px' : '6px',
    border: '2px solid #68d391',
    boxShadow: `
      0 0 20px rgba(104, 211, 145, 0.4),
      0 0 40px rgba(104, 211, 145, 0.2),
      inset 0 1px 0 rgba(104, 211, 145, 0.1)
    `,
    padding: isMobile ? '16px' : '20px',
    position: 'relative',
    overflow: 'hidden'
  }

  const ambrerPanelStyle = {
    background: 'linear-gradient(135deg, rgba(45, 55, 72, 0.9) 0%, rgba(26, 32, 44, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: isMobile ? '4px' : '6px',
    border: '2px solid #f6ad55',
    boxShadow: `
      0 0 20px rgba(246, 173, 85, 0.4),
      0 0 40px rgba(246, 173, 85, 0.2),
      inset 0 1px 0 rgba(246, 173, 85, 0.1)
    `,
    padding: isMobile ? '16px' : '20px',
    overflow: 'hidden'
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? '0' : '20px 40px',
    zIndex: 30,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0
    })
  }

  const titleStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: '100px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const mainTitleStyle = {
    fontSize: typeof window !== 'undefined' ?
      (isMobile ? '3rem' :
        window.innerWidth >= 1600 ? '5.5rem' : // Large screens: original size
        window.innerWidth >= 1200 ? '4.5rem' : // Laptop screens: smaller but prominent
        '4rem') : '5.5rem', // Fallback for server-side rendering
    fontWeight: '900',
    margin: '0 0 8px 0',
    background: 'linear-gradient(45deg, #68d391 0%, #f6ad55 50%, #fc8181 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(104, 211, 145, 0.6)',
    letterSpacing: '0.05em',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase'
  }

  const subtitleStyle = {
    color: '#68d391',
    fontWeight: '700',
    fontSize: typeof window !== 'undefined' ?
      (isMobile ? '12px' :
        window.innerWidth >= 1600 ? '16px' : // Large screens: original size
        window.innerWidth >= 1200 ? '14px' : // Laptop screens: slightly smaller
        '12px') : '16px', // Fallback for server-side rendering
    letterSpacing: '0.3em',
    margin: isMobile ? 0 : '-8px 0 0 0', // Move up slightly on desktop only
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
    fontFamily: '"Rajdhani", sans-serif'
  }

  const centerControlsStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -35%)'
    })
  }

  const nameInputStyle = {
    background: 'rgba(26, 32, 44, 0.9)',
    border: '2px solid #68d391',
    borderRadius: '4px',
    padding: typeof window !== 'undefined' ?
      (isMobile ? '12px 16px' :
        window.innerWidth >= 1600 ? '14px 20px' : // Large screens: original padding
        window.innerWidth >= 1200 ? '12px 18px' : // Laptop screens: slightly smaller
        '10px 16px') : '14px 20px', // Fallback for server-side rendering
    color: '#68d391',
    fontWeight: '700',
    textAlign: 'center',
    width: typeof window !== 'undefined' ?
      (isMobile ? '160px' :
        window.innerWidth >= 1600 ? '200px' : // Large screens: original width
        window.innerWidth >= 1200 ? '180px' : // Laptop screens: slightly smaller
        '160px') : '200px', // Fallback for server-side rendering
    fontSize: typeof window !== 'undefined' ?
      (isMobile ? '14px' :
        window.innerWidth >= 1600 ? '16px' : // Large screens: original size
        window.innerWidth >= 1200 ? '15px' : // Laptop screens: slightly smaller
        '14px') : '16px', // Fallback for server-side rendering
    boxShadow: '0 0 20px rgba(104, 211, 145, 0.3), inset 0 0 10px rgba(104, 211, 145, 0.1)',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }

  const stakeButtonStyle = {
    padding: typeof window !== 'undefined' ?
      (isMobile ? '12px 20px' :
        window.innerWidth >= 1600 ? '16px 32px' : // Large screens: original padding
        window.innerWidth >= 1200 ? '14px 28px' : // Laptop screens: slightly smaller
        '12px 24px') : '16px 32px', // Fallback for server-side rendering
    borderRadius: '4px',
    fontWeight: '700',
    fontSize: typeof window !== 'undefined' ?
      (isMobile ? '14px' :
        window.innerWidth >= 1600 ? '16px' : // Large screens: original size
        window.innerWidth >= 1200 ? '15px' : // Laptop screens: slightly smaller
        '14px') : '16px', // Fallback for server-side rendering
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid',
    margin: typeof window !== 'undefined' ?
      (isMobile ? '0 4px' :
        window.innerWidth >= 1600 ? '0 8px' : // Large screens: original margin
        window.innerWidth >= 1200 ? '0 6px' : // Laptop screens: slightly smaller
        '0 4px') : '0 8px', // Fallback for server-side rendering
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    position: 'relative',
    overflow: 'hidden'
  }

  const activeStakeStyle = {
    ...stakeButtonStyle,
    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
    color: '#1a202c',
    borderColor: '#68d391',
    boxShadow: '0 0 30px rgba(104, 211, 145, 0.6), 0 0 60px rgba(104, 211, 145, 0.3)',
    transform: 'scale(1.05)'
  }

  const inactiveStakeStyle = {
    ...stakeButtonStyle,
    background: 'rgba(26, 32, 44, 0.8)',
    color: '#f6ad55',
    borderColor: '#f6ad55',
    boxShadow: '0 0 15px rgba(246, 173, 85, 0.3)'
  }

  const deployButtonStyle = {
    background: 'linear-gradient(45deg, #fc8181 0%, #f56565 50%, #e53e3e 100%)',
    color: '#ffffff',
    fontWeight: '900',
    padding: typeof window !== 'undefined' ?
      (isMobile ? '16px 48px' :
        window.innerWidth >= 1600 ? '20px 64px' : // Large screens: original padding
        window.innerWidth >= 1200 ? '18px 56px' : // Laptop screens: slightly smaller
        '16px 48px') : '20px 64px', // Fallback for server-side rendering
    borderRadius: '6px',
    fontSize: typeof window !== 'undefined' ?
      (isMobile ? '16px' :
        window.innerWidth >= 1600 ? '20px' : // Large screens: original size
        window.innerWidth >= 1200 ? '18px' : // Laptop screens: slightly smaller
        '16px') : '20px', // Fallback for server-side rendering
    marginBottom: typeof window !== 'undefined' ?
      (isMobile ? '20px' :
        window.innerWidth >= 1600 ? '32px' : // Large screens: original margin
        window.innerWidth >= 1200 ? '28px' : // Laptop screens: slightly smaller
        '24px') : '32px', // Fallback for server-side rendering
    cursor: 'pointer',
    border: '2px solid #fc8181',
    boxShadow: '0 0 40px rgba(252, 129, 129, 0.6), 0 0 80px rgba(252, 129, 129, 0.3)',
    transition: 'all 0.3s ease',
    letterSpacing: '0.1em',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    position: 'relative',
    overflow: 'hidden'
  }

  const secondaryButtonStyle = {
    padding: typeof window !== 'undefined' ?
      (isMobile ? '10px 20px' :
        window.innerWidth >= 1600 ? '12px 24px' : // Large screens: original padding
        window.innerWidth >= 1200 ? '11px 22px' : // Laptop screens: slightly smaller
        '10px 20px') : '12px 24px', // Fallback for server-side rendering
    background: 'rgba(26, 32, 44, 0.8)',
    border: '2px solid #68d391',
    borderRadius: '4px',
    color: '#68d391',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    margin: typeof window !== 'undefined' ?
      (isMobile ? '0 6px' :
        window.innerWidth >= 1600 ? '0 10px' : // Large screens: original margin
        window.innerWidth >= 1200 ? '0 8px' : // Laptop screens: slightly smaller
        '0 6px') : '0 10px', // Fallback for server-side rendering
    fontWeight: '600',
    fontSize: typeof window !== 'undefined' ?
      (isMobile ? '12px' :
        window.innerWidth >= 1600 ? '14px' : // Large screens: original size
        window.innerWidth >= 1200 ? '13px' : // Laptop screens: slightly smaller
        '12px') : '14px', // Fallback for server-side rendering
    boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const iconStyle = {
    width: isMobile ? '24px' : '32px',
    height: isMobile ? '24px' : '32px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '12px' : '16px',
    fontWeight: '700'
  }

  const statsStyle = {
    textAlign: 'center',
    display: 'flex',
    gap: typeof window !== 'undefined' ?
      (isMobile ? '48px' :
        window.innerWidth >= 1600 ? '80px' : // Large screens: original gap
        window.innerWidth >= 1200 ? '60px' : // Laptop screens: smaller gap
        '48px') : '80px', // Fallback for server-side rendering
    justifyContent: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const statItemStyle = {
    textAlign: 'center'
  }

  const statNumberStyle = {
    fontSize: typeof window !== 'undefined' ?
      (isMobile ? '28px' :
        window.innerWidth >= 1600 ? '42px' : // Large screens: original size
        window.innerWidth >= 1200 ? '36px' : // Laptop screens: smaller but prominent
        '32px') : '42px', // Fallback for server-side rendering
    fontWeight: '900',
    background: 'linear-gradient(45deg, #68d391 0%, #f6ad55 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '4px',
    textShadow: '0 0 20px rgba(104, 211, 145, 0.5)',
    fontFamily: '"Rajdhani", sans-serif'
  }

  const statLabelStyle = {
    color: '#68d391',
    fontSize: isMobile ? '11px' : '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    textShadow: '0 0 10px rgba(104, 211, 145, 0.5)',
    fontFamily: '"Rajdhani", sans-serif'
  }

  const mobileGridStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%'
  }

  // Desktop Layout
  if (!isMobile) {
    return (
      <div style={containerStyle}>
        
        {/* Insufficient Funds Notification Banner - Non-Intrusive */}
        {insufficientFundsNotification && (
          <div style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'linear-gradient(45deg, rgba(252, 129, 129, 0.95) 0%, rgba(245, 101, 101, 0.95) 100%)',
            border: '2px solid #fc8181',
            borderRadius: '12px',
            padding: '12px 20px',
            maxWidth: '500px',
            minWidth: '320px',
            boxShadow: '0 8px 32px rgba(252, 129, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            animation: 'slideInFromTop 0.5s ease-out',
            fontFamily: '"Rajdhani", sans-serif'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                💰
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>
                  Insufficient Funds
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  Need ${insufficientFundsNotification.requiredAmount} • You have ${insufficientFundsNotification.currentBalance} • 
                  <span style={{ fontWeight: '700', color: '#fef5e7' }}> Deposit more SOL to play!</span>
                </div>
              </div>
              <button
                onClick={() => setInsufficientFundsNotification(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Tactical Animated Background */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '-20px',
          width: 'calc(100% + 40px)',
          height: 'calc(100% + 40px)',
          zIndex: 1,
          overflow: 'hidden'
        }}>
          
          {/* Animated Background Layers */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            left: '-50px',
            width: 'calc(100% + 100px)',
            height: 'calc(100% + 100px)',
            background: `
              radial-gradient(circle at 20% 80%, rgba(104, 211, 145, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(246, 173, 85, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(252, 129, 129, 0.02) 0%, transparent 50%),
              radial-gradient(ellipse at center, #2d3748 0%, #1a202c 50%, #0d1117 100%)
            `,
            animation: 'backgroundPulse 20s ease-in-out infinite'
          }} />

          {/* Moving Scan Lines */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #68d391 50%, transparent 100%)',
            animation: 'scanLineVertical 8s linear infinite'
          }} />
          
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '2px',
            height: '100%',
            background: 'linear-gradient(0deg, transparent 0%, #f6ad55 50%, transparent 100%)',
            animation: 'scanLineHorizontal 12s linear infinite'
          }} />

          {/* Enhanced Radar Sweep */}
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: '300px',
            height: '300px',
            border: '2px solid rgba(104, 211, 145, 0.3)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 70%, rgba(104, 211, 145, 0.1) 100%)',
            animation: 'radarSweep 4s linear infinite'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '2px',
              height: '150px',
              background: 'linear-gradient(to bottom, #68d391, transparent)',
              transformOrigin: 'top center',
              transform: 'translate(-50%, -100%)',
              animation: 'radarLine 4s linear infinite'
            }} />
            {/* Enhanced Radar Blips */}
            <div style={{
              position: 'absolute',
              top: '30%',
              left: '60%',
              width: '4px',
              height: '4px',
              background: '#f6ad55',
              borderRadius: '50%',
              boxShadow: '0 0 10px #f6ad55',
              animation: 'radarBlip 4s linear infinite'
            }} />
            <div style={{
              position: 'absolute',
              top: '70%',
              left: '40%',
              width: '3px',
              height: '3px',
              background: '#fc8181',
              borderRadius: '50%',
              boxShadow: '0 0 8px #fc8181',
              animation: 'radarBlip 4s linear infinite 1s'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '80%',
              width: '2px',
              height: '2px',
              background: '#68d391',
              borderRadius: '50%',
              boxShadow: '0 0 6px #68d391',
              animation: 'radarBlip 4s linear infinite 2s'
            }} />
          </div>

          {/* Animated Tactical Grid */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '150%',
            height: '150%',
            opacity: 0.4,
            backgroundImage: `
              linear-gradient(rgba(104, 211, 145, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(104, 211, 145, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            animation: 'tacticalGrid 30s linear infinite'
          }} />

          {/* Secondary Moving Grid */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '150%',
            height: '150%',
            opacity: 0.2,
            backgroundImage: `
              linear-gradient(rgba(246, 173, 85, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(246, 173, 85, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'tacticalGrid 45s linear infinite reverse'
          }} />

          {/* Pulsing Data Streams */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '80%',
            width: '2px',
            height: '200px',
            background: 'linear-gradient(to bottom, #fc8181, transparent)',
            animation: 'dataStream 3s ease-in-out infinite'
          }} />
          
          <div style={{
            position: 'absolute',
            top: '60%',
            left: '5%',
            width: '150px',
            height: '2px',
            background: 'linear-gradient(to right, #68d391, transparent)',
            animation: 'dataStream 4s ease-in-out infinite 1s'
          }} />

          {/* Enhanced HUD Elements */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '5%',
            width: '200px',
            height: '100px',
            border: '2px solid rgba(246, 173, 85, 0.6)',
            borderRadius: '4px',
            background: 'rgba(26, 32, 44, 0.7)',
            animation: 'hudFlicker 6s ease-in-out infinite'
          }}>
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              color: '#f6ad55',
              fontSize: '12px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '700'
            }}>SECTOR: ALPHA-7</div>
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              color: '#68d391',
              fontSize: '10px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '600'
            }}>STATUS: ACTIVE</div>
            {/* Animated progress bar */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '5px',
              right: '5px',
              height: '4px',
              background: 'rgba(104, 211, 145, 0.2)',
              borderRadius: '2px'
            }}>
              <div style={{
                height: '100%',
                background: '#68d391',
                borderRadius: '2px',
                animation: 'progressBar 5s ease-in-out infinite',
                boxShadow: '0 0 8px #68d391'
              }} />
            </div>
          </div>

          {/* Secondary HUD Element */}
          <div style={{
            position: 'absolute',
            bottom: '15%',
            right: '5%',
            width: '150px',
            height: '80px',
            border: '2px solid rgba(252, 129, 129, 0.6)',
            borderRadius: '4px',
            background: 'rgba(26, 32, 44, 0.7)',
            animation: 'hudFlicker 4s ease-in-out infinite 2s'
          }}>
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              color: '#fc8181',
              fontSize: '10px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '700'
            }}>THREAT: LOW</div>
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              color: '#68d391',
              fontSize: '8px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '600'
            }}>SECURED</div>
          </div>

          {/* Enhanced Floating Tactical Elements */}
          {floatingElements.map((element) => (
            <div
              key={`tactical-${element.id}`}
              style={{
                position: 'absolute',
                width: element.width + 'px',
                height: element.height + 'px',
                background: element.color,
                left: element.left + '%',
                top: element.top + '%',
                opacity: element.opacity,
                animation: `tacticalFloat ${element.animationDuration}s ease-in-out infinite`,
                boxShadow: `0 0 8px currentColor`,
                zIndex: 5,
                borderRadius: element.isCircle ? '50%' : '0'
              }}
            />
          ))}

          {/* Matrix-style Code Rain */}
          {codeElements.map((element) => (
            <div
              key={`code-${element.id}`}
              style={{
                position: 'absolute',
                left: `${element.left}%`,
                top: '-20px',
                width: '2px',
                height: `${element.height}px`,
                background: `linear-gradient(to bottom, transparent, #68d391, transparent)`,
                opacity: 0.3,
                animation: `codeMatrix ${element.animationDuration}s linear infinite ${element.animationDelay}s`
              }}
            />
          ))}

          {/* Enhanced Crosshairs */}
          <div style={{
            position: 'absolute',
            top: '40%',
            left: '15%',
            width: '40px',
            height: '40px',
            border: '2px solid rgba(252, 129, 129, 0.6)',
            borderRadius: '50%',
            animation: 'crosshairPulse 3s ease-in-out infinite'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '-10px',
              right: '-10px',
              height: '2px',
              background: '#fc8181',
              transform: 'translateY(-50%)'
            }} />
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '-10px',
              bottom: '-10px',
              width: '2px',
              background: '#fc8181',
              transform: 'translateX(-50%)'
            }} />
          </div>

          {/* Secondary Crosshair */}
          <div style={{
            position: 'absolute',
            top: '70%',
            right: '20%',
            width: '30px',
            height: '30px',
            border: '1px solid rgba(104, 211, 145, 0.5)',
            borderRadius: '50%',
            animation: 'crosshairPulse 4s ease-in-out infinite 1.5s'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '-8px',
              right: '-8px',
              height: '1px',
              background: '#68d391',
              transform: 'translateY(-50%)'
            }} />
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '-8px',
              bottom: '-8px',
              width: '1px',
              background: '#68d391',
              transform: 'translateX(-50%)'
            }} />
          </div>

          {/* Scanning Beams */}
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '70%',
            width: '200px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, #f6ad55 50%, transparent 100%)',
            animation: 'scanBeam 6s ease-in-out infinite',
            transformOrigin: 'left center'
          }} />
        </div>

        {/* Desktop Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              color: '#68d391', 
              fontWeight: '700', 
              fontSize: '16px',
              textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  PLAYER: {isAuthenticated ? 
                    (customUsername || user?.email?.address?.split('@')[0] || user?.wallet?.address?.slice(0, 8) || 'USER').toUpperCase() : 
                    (customUsername || userName).toUpperCase()
                  }
                </span>
                <span style={{
                  backgroundColor: '#CD7F32',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}>
                  🥉 Bronze
                </span>
              </div>
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Navigation Icons */}
            <div 
              style={{ 
                width: 'auto', 
                minWidth: '32px',
                height: '32px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '4px',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                padding: '0 8px',
                gap: '4px'
              }}
              title="Wallet"
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              <span style={{ fontSize: '16px' }}>💰</span>
              <span style={{ 
                color: '#68d391', 
                fontFamily: '"Rajdhani", sans-serif',
                fontWeight: '700',
                fontSize: '12px'
              }}>
                {currency.toLocaleString()}
              </span>
            </div>
            <div 
              style={{ 
                position: 'relative',
                width: '32px', 
                height: '32px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '4px',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '16px'
              }}
              title="Friends"
              onClick={() => {
                console.log('👥 Friends icon clicked!')
                if (!authenticated) {
                  console.log('⚠️ User not authenticated, opening Privy login')
                  if (typeof login === 'function') {
                    login()
                  }
                  return
                }
                setIsFriendsModalOpen(true)
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              👥
              {/* Notification Badge */}
              {friendRequests.received.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                  border: '2px solid rgba(26, 32, 44, 1)',
                  zIndex: 10
                }}>
                  {friendRequests.received.length > 9 ? '9+' : friendRequests.received.length}
                </div>
              )}
            </div>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '4px',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '16px'
              }}
              title="User Profile"
              onClick={() => {
                console.log('👤 Profile icon clicked!')
                if (!authenticated) {
                  console.log('⚠️ User not authenticated, opening Privy login')
                  if (typeof login === 'function') {
                    login()
                  }
                  return
                }
                setIsProfileModalOpen(true)
                console.log('🔍 Setting profile modal to true')
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              👤
            </div>
            
            {/* Login/Logout Button - FIXED HEIGHT */}
            {authenticated ? (
              <button
                onClick={handleLogout}
                style={{
                  height: '32px',
                  padding: '0 16px',
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '4px',
                  color: '#fc8181',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 15px rgba(252, 129, 129, 0.4)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.boxShadow = '0 0 20px rgba(252, 129, 129, 0.6)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.boxShadow = '0 0 15px rgba(252, 129, 129, 0.4)'
                }}
              >
                LOGOUT
              </button>
            ) : (
              <button
                onClick={handleLogin}
                style={{
                  height: '32px',
                  padding: '0 16px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  border: '2px solid #68d391',
                  borderRadius: '4px',
                  color: '#1a202c',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 30px rgba(104, 211, 145, 0.6)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.4)'
                }}
              >
                LOGIN
              </button>
            )}
          </div>
        </div>

        {/* Desktop Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ 
              background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Desktop Center Controls */}
        <div style={centerControlsStyle}>
          {/* Stats - Moved Above Username */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '80px',
            marginBottom: '40px',
            zIndex: 25
          }}>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>{liveStats.players}</div>
              <div style={statLabelStyle}>PLAYERS ONLINE</div>
            </div>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
              <div style={statLabelStyle}>TOTAL WINNINGS</div>
            </div>
          </div>

          {/* Player Name Input */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => setServerSelectorOpen(!serverSelectorOpen)}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1a202c',
                    fontWeight: '800',
                    fontSize: '12px',
                    boxShadow: '0 0 30px rgba(246, 173, 85, 0.6)',
                    border: '2px solid #f6ad55',
                    fontFamily: '"Rajdhani", sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(246, 173, 85, 0.8)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(246, 173, 85, 0.6)'
                  }}
                >
                  {selectedServer || '...'}
                </div>
                
                {/* Server Dropdown */}
                {serverSelectorOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '64px',
                    left: '0',
                    width: '200px',
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '2px solid #f6ad55',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
                    zIndex: 1000,
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      padding: '8px 0',
                      fontFamily: '"Rajdhani", sans-serif'
                    }}>
                      {serverDataLoading ? (
                        <div style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '14px'
                        }}>
                          <div style={{ fontSize: '18px', marginBottom: '8px' }}>⏳</div>
                          Refreshing servers...
                        </div>
                      ) : (
                        serverOptions.map((server) => (
                          <div
                            key={server.code}
                            onClick={() => {
                              setSelectedServer(server.code)
                              setServerSelectorOpen(false)
                              console.log(`🌐 Selected server: ${server.name} (${server.code}) - ${server.players} players, ${server.ping}ms`)
                            }}
                            style={{
                              padding: '12px 16px',
                              color: selectedServer === server.code ? '#f6ad55' : '#ffffff',
                              backgroundColor: selectedServer === server.code ? 'rgba(246, 173, 85, 0.1)' : 'transparent',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                              borderLeft: selectedServer === server.code ? '3px solid #f6ad55' : '3px solid transparent',
                              opacity: server.status === 'offline' ? 0.5 : 1
                            }}
                            onMouseOver={(e) => {
                              if (selectedServer !== server.code) {
                                e.currentTarget.style.backgroundColor = 'rgba(246, 173, 85, 0.05)'
                                e.currentTarget.style.color = '#f6ad55'
                              }
                            }}
                            onMouseOut={(e) => {
                              if (selectedServer !== server.code) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = '#ffffff'
                              }
                            }}
                          >
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '2px' 
                            }}>
                              <span style={{ fontWeight: '700' }}>
                                {server.name}
                              </span>
                              {server.status === 'offline' && (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#ef4444',
                                  fontWeight: '400'
                                }}>
                                  OFFLINE
                                </span>
                              )}
                              {server.status === 'online' && (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#10b981',
                                  fontWeight: '400'
                                }}>
                                  ONLINE
                                </span>
                              )}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#a0aec0',
                              fontWeight: '400',
                              textAlign: 'left'
                            }}>
                              {server.ping}ms • {server.players} players
                            </div>
                          </div>
                        ))
                      )}
                      
                      {/* Refresh button */}
                      <div style={{
                        borderTop: '1px solid rgba(246, 173, 85, 0.2)',
                        margin: '8px 0 0 0'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            fetchServerData()
                          }}
                          disabled={serverDataLoading}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: serverDataLoading ? '#6b7280' : '#f6ad55',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: serverDataLoading ? 'not-allowed' : 'pointer',
                            fontFamily: '"Rajdhani", sans-serif',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (!serverDataLoading) {
                              e.target.style.backgroundColor = 'rgba(246, 173, 85, 0.1)'
                            }
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent'
                          }}
                        >
                          {serverDataLoading ? '⟳ Refreshing...' : 'Refresh Servers'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Click outside to close */}
                {serverSelectorOpen && (
                  <div 
                    onClick={() => setServerSelectorOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      zIndex: 999
                    }}
                  />
                )}
              </div>
              <input 
                type="text" 
                value={customUsername || userName}
                onChange={(e) => setCustomUsername(e.target.value)}
                style={nameInputStyle}
                placeholder="USERNAME"
                onFocus={(e) => {
                  e.target.style.borderColor = '#f6ad55'
                  e.target.style.boxShadow = '0 0 30px rgba(246, 173, 85, 0.6), inset 0 0 15px rgba(246, 173, 85, 0.1)'
                  e.target.style.color = '#f6ad55'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#68d391'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.3), inset 0 0 10px rgba(104, 211, 145, 0.1)'
                  e.target.style.color = '#68d391'
                }}
              />
              <div 
                onClick={() => {
                  // Username confirmed - set the custom username to override any authenticated name
                  const currentInputValue = customUsername || userName
                  setCustomUsername(currentInputValue)
                  console.log('Username confirmed and set:', currentInputValue)
                }}
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a202c',
                  fontWeight: '600',
                  boxShadow: '0 0 20px rgba(104, 211, 145, 0.6)',
                  border: '2px solid #68d391',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 30px rgba(104, 211, 145, 0.8)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.6)'
                }}
              >
                ✓
              </div>
            </div>
          </div>

          {/* Stakes */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', justifyContent: 'center' }}>
            {['$0.02', '$0.50', '$0.65'].map((stake) => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                style={selectedStake === stake ? activeStakeStyle : inactiveStakeStyle}
                onMouseOver={(e) => {
                  if (selectedStake !== stake) {
                    e.target.style.transform = 'scale(1.02)'
                    e.target.style.boxShadow = '0 0 25px rgba(246, 173, 85, 0.5)'
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedStake !== stake) {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 0 15px rgba(246, 173, 85, 0.3)'
                  }
                }}
              >
                {stake}
              </button>
            ))}
          </div>

          {/* Loyalty Progress Bar - Minimalistic Design */}
          {isAuthenticated && loyaltyData && (
            <div style={{ 
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#10b981'
            }}>
              {!loyaltyData.progress?.isMaxTier ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <span>
                    {loyaltyData.userStats?.gamesPlayed || 0}/
                    {loyaltyData.progress?.progress?.gamesProgress?.required || 50} games • 
                    ${(loyaltyData.userStats?.totalWagered || 0).toFixed(2)}/
                    ${loyaltyData.progress?.progress?.wageredProgress?.required || 100} wagered
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>
                    → {loyaltyData.progress?.nextTier === 'SILVER' ? '🥈 9%' : '🥇 8%'} fees
                  </span>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  🏆 {loyaltyData.tierInfo?.name} ({loyaltyData.feePercentage}% fees)
                </div>
              )}
            </div>
          )}
          
          {/* Minimalistic login prompt */}
          {!isAuthenticated && (
            <div style={{ 
              marginBottom: '12px',
              padding: '6px 12px',
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              Login to reduce fees with loyalty tiers
            </div>
          )}
          
          {/* Main Deploy Button - UPDATED with Paid Rooms Validation */}
          <button 
            onClick={async () => {
              console.log('▶ PLAY NOW button clicked!')
              console.log(`💰 Selected stake: ${selectedStake}`)
              console.log(`🌍 Selected server: ${selectedServer}`)
              
              const authenticated = await requireAuthentication('PLAY NOW')
              if (authenticated) {
                console.log('🎮 User authenticated, starting smart matchmaking...')
                
                // Check if user has sufficient funds for selected stake
                const stakeAmount = parseStakeAmount(selectedStake)
                
                if (stakeAmount === 0) {
                  // Free play mode - use existing global practice room
                  console.log('🎮 Free play mode - joining global practice room')
                  router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
                } else {
                  // Paid room - validate balance and use smart matchmaking
                  if (validatePaidRoom(`PLAY NOW with ${selectedStake} stake`)) {
                    console.log(`✅ Sufficient funds confirmed for ${selectedStake} stake`)
                    console.log(`🎯 Starting smart matchmaking for ${selectedServer} region...`)
                    
                    try {
                      // HATHORA-FIRST: Create room directly using initializeHathoraGame
                      const serverData = {
                        regionId: selectedServer,
                        region: selectedServer,
                        entryFee: stakeAmount,
                        name: `${selectedServer} $${stakeAmount} Cash Game`,
                        stake: stakeAmount
                      }
                      
                      const matchResult = await initializeHathoraGame(serverData)
                      
                      if (matchResult) {
                        const { roomId } = matchResult
                        const action = 'created_hathora_direct'
                        
                        console.log(`🎯 Hathora room created successfully!`)
                        console.log(`📍 Action: ${action}`)
                        console.log(`🏠 Room ID: ${roomId}`)
                        console.log(`🎮 Server: ${serverData.name}`)
                        console.log(`🌍 Region: ${matchResult.region}`)
                        console.log(`💰 Entry Fee: $${matchResult.entryFee}`)
                        
                        // DEDUCT ENTRY FEE + 10% SERVER FEE BEFORE JOINING
                        console.log(`💰 Deducting entry fee + server fee before joining room...`)
                        
                        const userWalletAddress = privyUser?.wallet?.address || 'unknown'
                        const feeResult = await deductRoomFees(stakeAmount, userWalletAddress)
                        
                        if (!feeResult.success) {
                          console.error(`❌ Fee deduction failed: ${feeResult.error}`)
                          alert(`Failed to join room: ${feeResult.error}\n\nPlease try again or contact support.`)
                          return
                        }
                        
                        console.log(`✅ Fees deducted successfully!`)
                        const feeCurrency = feeResult.costs.currency === 'SOL' ? 'SOL' : 'USD'
                        const formatAmount = (value, currency) =>
                          currency === 'SOL' ? `${value.toFixed(4)} SOL` : `$${value.toFixed(3)}`

                        console.log(`💰 Entry Fee: ${formatAmount(feeResult.costs.entryFee, feeCurrency)}`)
                        console.log(`🏦 Server Fee: ${formatAmount(feeResult.costs.serverFee, feeCurrency)} → ${SERVER_WALLET_ADDRESS}`)
                        console.log(`💳 Total Deducted: ${formatAmount(feeResult.costs.totalCost, feeCurrency)}`)
                        console.log(`💵 New Balance: $${feeResult.newBalance.toFixed(3)}`)

                        // Show Hathora room creation result to user
                        const message = `🆕 Created new Hathora room - you're the first player!\n💰 Paid: ${formatAmount(feeResult.costs.totalCost, feeCurrency)} (entry + server fee)`
                        
                        // Brief notification showing payment confirmation
                        console.log(`🎯 ${message}`)
                        alert(`💰 Payment Confirmed!\n\n${message}`)
                        
                        // Navigate to arena game with the paid room
                        router.push(`/arena?roomId=${roomId}&mode=competitive&fee=${stakeAmount}&region=${selectedServer}&paid=true`)
                        
                      } else {
                        console.error('❌ Hathora room creation failed')
                        alert('Failed to create multiplayer room. Please try again.')
                      }
                      
                    } catch (hathoraError) {
                      console.error('❌ Hathora room creation error:', hathoraError)
                      alert('Failed to create multiplayer room. Please try again.')
                    }
                    
                  } else {
                    console.log(`❌ Insufficient funds for ${selectedStake} stake`)
                    // Notification is already shown by validatePaidRoom function
                  }
                }
              } else {
                console.log('❌ Authentication failed, blocking access to PLAY NOW')
              }
            }}
            style={deployButtonStyle}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 60px rgba(252, 129, 129, 0.8), 0 0 100px rgba(252, 129, 129, 0.4)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 40px rgba(252, 129, 129, 0.6), 0 0 80px rgba(252, 129, 129, 0.3)'
            }}
          >
            ▶ PLAY NOW
          </button>

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginLeft: '40px' }}>
            <button 
              style={secondaryButtonStyle}
              onClick={async () => {
                console.log('SERVER BROWSER button clicked!')
                const authenticated = await requireAuthentication('SERVER BROWSER')
                if (authenticated) {
                  console.log('🌐 User authenticated, opening server browser...')
                  setIsServerBrowserOpen(true)
                } else {
                  console.log('❌ Authentication failed, blocking access to SERVER BROWSER')
                }
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(104, 211, 145, 0.1)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 0 25px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(26, 32, 44, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              SERVER BROWSER
            </button>
            <button 
              style={{
                ...secondaryButtonStyle,
                background: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'rgba(107, 114, 128, 0.3)' : 'rgba(59, 130, 246, 0.1)',
                border: (currentParty && currentParty.members && currentParty.members.length > 1) ? '2px solid #6b7280' : '2px solid #3b82f6',
                color: (currentParty && currentParty.members && currentParty.members.length > 1) ? '#9ca3af' : '#3b82f6',
                cursor: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'not-allowed' : 'pointer',
                opacity: (currentParty && currentParty.members && currentParty.members.length > 1) ? 0.6 : 1
              }}
              onClick={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  console.log('🔒 LOCAL PRACTICE blocked - user is in a duo')
                  e.preventDefault()
                  return
                }
                
                console.log('🤖 LOCAL PRACTICE button clicked!')
                
                // Show loading popup on desktop only
                console.log('📏 Window width:', window.innerWidth)
                if (window.innerWidth >= 768) {
                  console.log('🖥️ Desktop detected - showing loading popup')
                  setLocalPracticeLoading(true)
                } else {
                  console.log('📱 Mobile detected - skipping loading popup')
                }
                
                // Create completely local room with bots - no Hathora charges
                const localRoomId = 'local-bots-' + Math.random().toString(36).substring(2, 10)
                const gameUrl = `/agario?roomId=${localRoomId}&mode=local&fee=0&region=local&multiplayer=offline&server=local&bots=true`
                console.log('🎮 Starting local practice with bots:', gameUrl)
                
                // Add delay to show loading popup, then navigate
                setTimeout(() => {
                  console.log('⏰ Timeout reached - starting game navigation')
                  // Don't immediately navigate - give time for the loading popup to show
                  if (window.innerWidth >= 768) {
                    // Desktop: show loading for 2 seconds, then navigate
                    setTimeout(() => {
                      console.log('🎮 Loading complete - navigating to game')
                      setLocalPracticeLoading(false) // Dismiss loading popup before navigation
                      window.location.href = gameUrl
                    }, 2000)
                  } else {
                    // Mobile: use normal flow
                    checkOrientationAndEnterGame(gameUrl)
                  }
                }, 200) // Reduced initial delay
              }}
              onMouseOver={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  // Show tooltip for disabled state
                  const tooltip = document.createElement('div')
                  tooltip.id = 'local-practice-tooltip'
                  tooltip.textContent = 'Local Practice is only available for solo players. Leave your party to play offline with bots.'
                  tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    max-width: 250px;
                    z-index: 10000;
                    pointer-events: none;
                    border: 1px solid #374151;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                  `
                  
                  // Position tooltip above the button
                  const rect = e.target.getBoundingClientRect()
                  tooltip.style.left = `${rect.left}px`
                  tooltip.style.top = `${rect.top - 60}px`
                  
                  document.body.appendChild(tooltip)
                } else {
                  e.target.style.background = 'rgba(59, 130, 246, 0.2)'
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.5)'
                }
              }}
              onMouseOut={(e) => {
                // Remove tooltip
                const tooltip = document.getElementById('local-practice-tooltip')
                if (tooltip) {
                  tooltip.remove()
                }
                
                if (!(currentParty && currentParty.members && currentParty.members.length > 1)) {
                  e.target.style.background = 'rgba(59, 130, 246, 0.1)'
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.3)'
                }
              }}
              disabled={currentParty && currentParty.members && currentParty.members.length > 1}
            >
              {(currentParty && currentParty.members && currentParty.members.length > 1) ? '🔒 LOCAL PRACTICE' : 'LOCAL PRACTICE'}
            </button>
            <button 
              style={secondaryButtonStyle}
              onClick={async () => {
                console.log('HOW TO PLAY button clicked!')
                const authenticated = await requireAuthentication('HOW TO PLAY')
                if (authenticated) {
                  console.log('📖 User authenticated, showing how to play...')
                  // Add your how to play functionality here
                  alert('HOW TO PLAY: Move with mouse, collect coins to grow, hold E to cash out!')
                } else {
                  console.log('❌ Authentication failed, blocking access to HOW TO PLAY')
                }
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(104, 211, 145, 0.1)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 0 25px rgba(104, 211, 145, 0.4)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(26, 32, 44, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              HOW TO PLAY
            </button>
          </div>
        </div>



        {/* Desktop 4-Panel Layout - Laptop Optimized */}
        {/* Top Left - Command (Leaderboard) */}
        <div style={{
          position: 'absolute',
          left: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '200px' : // Large screens: original positioning
             window.innerWidth >= 1200 ? Math.max(30, window.innerWidth * 0.015) + 'px' : // Laptop screens: 1.5% margin, min 30px
             '20px') : '200px', // Fallback for server-side rendering
          top: '160px',
          width: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '280px' : // Large screens: original width
             window.innerWidth >= 1200 ? Math.max(240, Math.min(280, window.innerWidth * 0.18)) + 'px' : // Laptop screens: 18% width, 240-280px range
             '240px') : '280px', // Fallback for server-side rendering
          zIndex: 20,
          ...tacticalPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#68d391',
            borderRadius: '50%',
            boxShadow: '0 0 10px #68d391',
            animation: 'statusBlink 2s ease-in-out infinite'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(246, 173, 85, 0.6)', textTransform: 'uppercase' }}>LEADERBOARD</h3>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{
                padding: '4px 10px',
                background: 'rgba(104, 211, 145, 0.2)',
                color: '#68d391',
                fontSize: '12px',
                borderRadius: '3px',
                border: '1px solid #68d391',
                fontWeight: '600',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                ACTIVE
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            {leaderboard.map((player, index) => (
              <div key={player.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: index < leaderboard.length - 1 ? '1px solid rgba(104, 211, 145, 0.3)' : 'none' }}>
                <span style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
                  {String(index + 1).padStart(2, '0')}. {player.name}
                </span>
                <span style={{ 
                  color: '#f6ad55', 
                  fontWeight: '700', 
                  fontSize: '15px',
                  textShadow: '0 0 10px rgba(246, 173, 85, 0.6)',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  ${player.cashout.toLocaleString()}
                </span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#68d391', fontSize: '14px', fontFamily: '"Rajdhani", sans-serif' }}>
                LOADING LEADERBOARD...
              </div>
            )}
          </div>
          
          <button 
            onClick={() => createDesktopLeaderboardPopup()}
            style={{
            width: '100%',
            padding: '6px',
            background: 'rgba(26, 32, 44, 0.8)',
            border: '2px solid #68d391',
            borderRadius: '4px',
            color: '#68d391',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            VIEW LEADERBOARD
          </button>
        </div>

        {/* Top Right - Arsenal (Wallet) */}
        <div style={{
          position: 'absolute',
          right: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '200px' : // Large screens: original positioning
             window.innerWidth >= 1200 ? Math.max(30, window.innerWidth * 0.015) + 'px' : // Laptop screens: 1.5% margin, min 30px
             '20px') : '200px', // Fallback for server-side rendering
          top: '160px',
          width: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '280px' : // Large screens: original width
             window.innerWidth >= 1200 ? Math.max(240, Math.min(280, window.innerWidth * 0.18)) + 'px' : // Laptop screens: 18% width, 240-280px range
             '240px') : '280px', // Fallback for server-side rendering
          zIndex: 20,
          ...ambrerPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#f6ad55',
            borderRadius: '50%',
            boxShadow: '0 0 10px #f6ad55',
            animation: 'statusBlink 2s ease-in-out infinite 0.5s'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(246, 173, 85, 0.6)', textTransform: 'uppercase' }}>WALLET</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleCopyAddress}
                style={{ 
                  fontSize: '11px', 
                  color: '#f6ad55', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontFamily: '"Rajdhani", sans-serif',
                  textDecoration: 'none',
                  padding: '0'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#fbb040'
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#f6ad55'
                }}
              >
                📋 COPY ADDRESS
              </button>
              <button 
                onClick={handleBalanceRefresh}
                style={{ 
                  fontSize: '11px', 
                  color: '#f6ad55', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontFamily: '"Rajdhani", sans-serif',
                  textDecoration: 'none',
                  padding: '0'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#fbb040'
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#f6ad55'
                }}
              >
                [↻] REFRESH BALANCE
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: '800', 
              background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
              textShadow: '0 0 20px rgba(246, 173, 85, 0.6)',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              {walletBalance.loading ? 'Loading...' : walletBalance.usd !== null ? `$${walletBalance.usd}` : '--'}
            </div>
            <div style={{ color: '#f6ad55', fontSize: '14px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
              {walletBalance.loading ? 'Loading...' : walletBalance.sol !== null ? `${walletBalance.sol} SOL` : '--'}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleDeposit}
              style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(104, 211, 145, 0.2)',
              border: '2px solid #68d391',
              borderRadius: '4px',
              color: '#68d391',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              DEPOSIT SOL
            </button>
            <button 
              onClick={handleWithdraw}
              style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(252, 129, 129, 0.2)',
              border: '2px solid #fc8181',
              borderRadius: '4px',
              color: '#fc8181',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(252, 129, 129, 0.3)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              WITHDRAW
            </button>
          </div>
        </div>

        {/* Bottom Left - Challenges */}
        <div style={{
          position: 'absolute',
          left: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '200px' : // Large screens: original positioning
             window.innerWidth >= 1200 ? Math.max(30, window.innerWidth * 0.015) + 'px' : // Laptop screens: 1.5% margin, min 30px
             '20px') : '200px', // Fallback for server-side rendering 
          top: '210px',
          width: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '280px' : // Large screens: original width
             window.innerWidth >= 1200 ? Math.max(240, Math.min(280, window.innerWidth * 0.18)) + 'px' : // Laptop screens: 18% width, 240-280px range
             '240px') : '280px', // Fallback for server-side rendering
          zIndex: 20,
          ...tacticalPanelStyle // Restored original tacticalPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#fc8181',
            borderRadius: '50%',
            boxShadow: '0 0 10px #fc8181',
            animation: 'statusBlink 2s ease-in-out infinite 1s'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ 
              color: '#fc8181', 
              fontWeight: '700', 
              fontSize: '18px', 
              margin: 0, 
              fontFamily: '"Rajdhani", sans-serif', // Restored Rajdhani font
              textShadow: '0 0 10px rgba(252, 129, 129, 0.6)', 
              textTransform: 'uppercase' 
            }}>
              CHALLENGES
            </h3>
            <div style={{ marginLeft: 'auto' }}>
              <button 
                onClick={async () => {
                  console.log('🔄 CHALLENGES REFRESH button clicked - refreshing challenge data...')
                  
                  try {
                    // Refresh challenges data from localStorage
                    const userKey = isAuthenticated ? 
                      `challenges_${(user?.wallet?.address || user?.email?.address || user?.id || 'guest').substring(0, 10)}` :
                      'challenges_guest'
                    
                    const savedChallenges = localStorage.getItem(userKey)
                    if (savedChallenges) {
                      const challengesData = JSON.parse(savedChallenges)
                      console.log('✅ Challenge data refreshed:', challengesData)
                    } else {
                      console.log('ℹ️ No existing challenge data found')
                    }
                    
                    // Force re-render by updating a timestamp
                    const refreshKey = `challenges_refresh_${Date.now()}`
                    localStorage.setItem(refreshKey, 'true')
                    setTimeout(() => localStorage.removeItem(refreshKey), 1000)
                    
                  } catch (error) {
                    console.error('❌ Error refreshing challenge data:', error)
                  }
                }}
                style={{ 
                  fontSize: '10px', 
                  color: '#fc8181', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontFamily: '"Rajdhani", sans-serif',
                  textDecoration: 'none',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#fbb6b6'
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#fc8181'
                }}
                title="Refresh challenge progress"
              >
                🔄 REFRESH
              </button>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(26, 32, 44, 0.8)', 
            borderRadius: '8px', 
            padding: '12px', // Reduced from 16px
            border: '2px solid rgba(252, 129, 129, 0.3)',
            marginBottom: '12px', // Reduced from 16px
            position: 'relative',
            minHeight: '120px' // Reduced from 140px
          }}>
            {/* Challenge Cycle */}
            {(() => {
              // Get user-specific challenges data
              const userKey = isAuthenticated ? 
                `challenges_${(user?.wallet?.address || user?.email?.address || user?.id || 'guest').substring(0, 10)}` :
                'challenges_guest'
              
              let challengesData = {}
              try {
                const saved = localStorage.getItem(userKey)
                challengesData = saved ? JSON.parse(saved) : {}
              } catch (error) {
                console.error('Error loading challenges:', error)
              }
              
              // Default challenges for Agar.io game
              const defaultChallenges = [
                { 
                  id: 'eat_50_coins', 
                  name: 'Coin Collector', 
                  description: 'Eat 50 coins', 
                  target: 50, 
                  reward: 100,
                  icon: '💰', // Changed from 🪙 to 💰
                  type: 'daily'
                },
                { 
                  id: 'survive_5_minutes', 
                  name: 'Survivor', 
                  description: 'Survive for 5 minutes', 
                  target: 300, // seconds
                  reward: 150,
                  icon: '⏱️',
                  type: 'daily'
                },
                { 
                  id: 'reach_mass_200', 
                  name: 'Growing Strong', 
                  description: 'Reach mass 200', 
                  target: 200, 
                  reward: 200,
                  icon: '📈', // Changed back to chart emoji
                  type: 'weekly'
                },
                { 
                  id: 'cashout_5_times', 
                  name: 'Cash Master', 
                  description: 'Cash out 5 times', 
                  target: 5, 
                  reward: 250,
                  icon: '💰',
                  type: 'weekly'
                }
              ]
              
              const currentChallenge = defaultChallenges[currentChallengeIndex] || defaultChallenges[0]
              const progress = challengesData[currentChallenge.id] || { current: 0, completed: false }
              const progressPercent = Math.min((progress.current / currentChallenge.target) * 100, 100)
              const isCompleted = progress.completed || progress.current >= currentChallenge.target
              
              return (
                <div style={{ position: 'relative' }}>
                  {/* Challenge Card - Compact Design */}
                  <div style={{
                    padding: '12px', // Reduced from 16px
                    background: isCompleted ? 'rgba(104, 211, 145, 0.1)' : 'rgba(45, 55, 72, 0.5)',
                    borderRadius: '8px',
                    border: `2px solid ${isCompleted ? '#68d391' : 'rgba(252, 129, 129, 0.3)'}`,
                    position: 'relative',
                    textAlign: 'center'
                  }}>
                    {/* Challenge Header */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: '8px',
                      marginBottom: '8px', // Reduced from 12px
                      width: '100%'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flex: '1',
                        minWidth: 0
                      }}>
                        <span style={{ 
                          fontSize: '20px',
                          flexShrink: 0
                        }}>
                          {currentChallenge.icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px', // Slightly reduced from 14px
                            fontWeight: '700',
                            color: isCompleted ? '#68d391' : '#e2e8f0',
                            fontFamily: '"Rajdhani", sans-serif',
                            textTransform: 'uppercase',
                            marginBottom: '2px', // Reduced from 4px
                            whiteSpace: 'nowrap',
                            overflow: 'visible', // Changed from 'hidden' to 'visible'
                            width: 'auto', // Allow natural width
                            maxWidth: 'none' // Remove max width restriction
                          }}>
                            {currentChallenge.name}
                          </div>
                          <div style={{
                            fontSize: '10px', // Reduced from 11px
                            color: '#a0aec0',
                            fontFamily: '"Rajdhani", sans-serif',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {currentChallenge.description}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 6px',
                        background: currentChallenge.type === 'daily' ? 'rgba(246, 173, 85, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                        border: `1px solid ${currentChallenge.type === 'daily' ? '#f6ad55' : '#8b5cf6'}`,
                        borderRadius: '3px',
                        fontSize: '9px',
                        color: currentChallenge.type === 'daily' ? '#f6ad55' : '#8b5cf6',
                        textTransform: 'uppercase',
                        fontFamily: '"Rajdhani", sans-serif',
                        fontWeight: '600',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}>
                        {currentChallenge.type}
                      </div>
                    </div>
                    
                    {/* Animated Progress Bar */}
                    <div style={{
                      background: 'rgba(45, 55, 72, 0.8)',
                      borderRadius: '10px',
                      height: '6px',
                      overflow: 'hidden',
                      marginBottom: '8px', // Reduced from 12px
                      position: 'relative',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{
                        background: isCompleted ? 
                          'linear-gradient(90deg, #68d391 0%, #48bb78 50%, #68d391 100%)' : 
                          'linear-gradient(90deg, #fc8181 0%, #f56565 50%, #fc8181 100%)',
                        height: '100%',
                        width: `${progressPercent}%`,
                        transition: 'width 0.8s ease-in-out',
                        borderRadius: '10px',
                        boxShadow: isCompleted ? 
                          '0 0 8px rgba(104, 211, 145, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : 
                          `0 0 8px rgba(252, 129, 129, ${Math.max(0.3, progressPercent / 100 * 0.8)}), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                        position: 'relative'
                      }}>
                        {/* Glow animation for active progress */}
                        {!isCompleted && progressPercent > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: '-4px',
                            width: '8px',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(252, 129, 129, 0.8), transparent)',
                            borderRadius: '10px',
                            animation: 'progressGlow 2s ease-in-out infinite'
                          }} />
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Text & Reward */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px' // Reduced from 12px
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: '#a0aec0',
                        fontFamily: '"Rajdhani", sans-serif',
                        fontWeight: '600'
                      }}>
                        {isCompleted ? 'COMPLETED' : `${Math.round(progressPercent)}% Complete`}
                      </span>
                      <span style={{
                        fontSize: '16px',
                        color: '#fbbf24',
                        fontFamily: '"Rajdhani", sans-serif',
                        fontWeight: '800',
                        textShadow: '0 0 12px rgba(251, 191, 36, 0.8), 0 0 6px rgba(251, 191, 36, 0.6)',
                        animation: isCompleted ? 'goldPulse 2s ease-in-out infinite' : 'none'
                      }}>
                        {isCompleted ? '✅ REWARD READY' : `+${currentChallenge.reward} coins`}
                      </span>
                    </div>
                    
                    {/* Completion Overlay */}
                    {isCompleted && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#68d391',
                        color: '#1a202c',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        boxShadow: '0 0 8px rgba(104, 211, 145, 0.6)'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                  
                  {/* Navigation with Arrows and Dots */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px' // Reduced from 12px
                  }}>
                    {/* Left Arrow */}
                    <button
                      onClick={() => {
                        const newIndex = currentChallengeIndex === 0 ? defaultChallenges.length - 1 : currentChallengeIndex - 1
                        setCurrentChallengeIndex(newIndex)
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 0 8px rgba(252, 129, 129, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#ffffff',
                        fontWeight: 'bold'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'linear-gradient(90deg, #f56565 0%, #e53e3e 100%)'
                        e.target.style.transform = 'scale(1.1)'
                        e.target.style.boxShadow = '0 0 12px rgba(252, 129, 129, 0.8)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)'
                        e.target.style.transform = 'scale(1)'
                        e.target.style.boxShadow = '0 0 8px rgba(252, 129, 129, 0.4)'
                      }}
                    >
                      ‹
                    </button>

                    {defaultChallenges.map((_, index) => {
                      const challengeProgress = challengesData[defaultChallenges[index].id] || { current: 0, completed: false }
                      const challengeCompleted = challengeProgress.completed || challengeProgress.current >= defaultChallenges[index].target
                      const isActive = index === currentChallengeIndex
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setCurrentChallengeIndex(index)}
                          style={{
                            width: isActive ? '24px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            border: 'none',
                            background: challengeCompleted ? 
                              'linear-gradient(90deg, #68d391 0%, #48bb78 100%)' : 
                              (isActive ? 
                                'linear-gradient(90deg, #fc8181 0%, #f56565 100%)' : 
                                'rgba(148, 163, 184, 0.4)'),
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: isActive ? 
                              (challengeCompleted ? 
                                '0 0 8px rgba(104, 211, 145, 0.6)' : 
                                '0 0 8px rgba(252, 129, 129, 0.6)') : 
                              'none',
                            transform: isActive ? 'scale(1.1)' : 'scale(1)'
                          }}
                          onMouseOver={(e) => {
                            if (!isActive) {
                              e.target.style.background = challengeCompleted ? 
                                'linear-gradient(90deg, #68d391 0%, #48bb78 100%)' : 
                                'rgba(252, 129, 129, 0.6)'
                              e.target.style.transform = 'scale(1.05)'
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isActive) {
                              e.target.style.background = challengeCompleted ? 
                                'linear-gradient(90deg, #68d391 0%, #48bb78 100%)' : 
                                'rgba(148, 163, 184, 0.4)'
                              e.target.style.transform = 'scale(1)'
                            }
                          }}
                        />
                      )
                    })}

                    {/* Right Arrow */}
                    <button
                      onClick={() => {
                        const newIndex = currentChallengeIndex === defaultChallenges.length - 1 ? 0 : currentChallengeIndex + 1
                        setCurrentChallengeIndex(newIndex)
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 0 8px rgba(252, 129, 129, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#ffffff',
                        fontWeight: 'bold'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'linear-gradient(90deg, #f56565 0%, #e53e3e 100%)'
                        e.target.style.transform = 'scale(1.1)'
                        e.target.style.boxShadow = '0 0 12px rgba(252, 129, 129, 0.8)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)'
                        e.target.style.transform = 'scale(1)'
                        e.target.style.boxShadow = '0 0 8px rgba(252, 129, 129, 0.4)'
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
          
          <button 
            onClick={async () => {
              console.log('VIEW ALL CHALLENGES button clicked!')
              const authenticated = await requireAuthentication('VIEW ALL CHALLENGES')
              if (authenticated) {
                console.log('🎯 User authenticated, opening challenges modal...')
                
                // Create enhanced challenges modal
                const modal = document.createElement('div')
                modal.style.cssText = `
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100vw;
                  height: 100vh;
                  background: rgba(0, 0, 0, 0.8);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 10000;
                  backdrop-filter: blur(5px);
                `
                
                modal.innerHTML = `
                  <div id="challenges-modal" style="
                    background: linear-gradient(145deg, #1a202c 0%, #2d3748 100%);
                    border: 2px solid #fc8181;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 80vh;
                    overflow: hidden;
                    box-shadow: 0 0 30px rgba(252, 129, 129, 0.4);
                    position: relative;
                  ">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                      <h2 style="color: #fc8181; font-family: 'Rajdhani', sans-serif; font-size: 24px; font-weight: 700; margin: 0; text-transform: uppercase;">
                        🎯 ALL CHALLENGES
                      </h2>
                      <button onclick="document.body.removeChild(this.closest('#challenges-modal').parentElement)" style="
                        background: rgba(252, 129, 129, 0.2);
                        border: 1px solid #fc8181;
                        border-radius: 4px;
                        color: #fc8181;
                        cursor: pointer;
                        padding: 8px 12px;
                        font-family: 'Rajdhani', sans-serif;
                        font-weight: 600;
                        font-size: 12px;
                        transition: all 0.2s ease;
                      " onmouseover="this.style.background='rgba(252, 129, 129, 0.4)'" onmouseout="this.style.background='rgba(252, 129, 129, 0.2)'">CLOSE</button>
                    </div>
                    
                    <!-- Tabs -->
                    <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 2px solid rgba(252, 129, 129, 0.3); padding-bottom: 16px;">
                      <button class="challenge-tab active-tab" data-tab="daily" style="
                        flex: 1;
                        background: linear-gradient(45deg, #fc8181 0%, #f56565 100%);
                        border: none;
                        border-radius: 6px;
                        color: white;
                        cursor: pointer;
                        padding: 12px 8px;
                        font-family: 'Rajdhani', sans-serif;
                        font-weight: 600;
                        font-size: 14px;
                        text-transform: uppercase;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 8px rgba(252, 129, 129, 0.4);
                        text-align: center;
                      ">
                        Daily
                        <div style="font-size: 10px; opacity: 0.9; margin-top: 4px; font-weight: 500;" id="daily-timer">Resets in: 12h 45m</div>
                      </button>
                      <button class="challenge-tab" data-tab="weekly" style="
                        flex: 1;
                        background: rgba(139, 92, 246, 0.3);
                        border: 1px solid #8b5cf6;
                        border-radius: 6px;
                        color: #8b5cf6;
                        cursor: pointer;
                        padding: 12px 8px;
                        font-family: 'Rajdhani', sans-serif;
                        font-weight: 600;
                        font-size: 14px;
                        text-transform: uppercase;
                        transition: all 0.3s ease;
                        text-align: center;
                      ">
                        Weekly
                        <div style="font-size: 10px; opacity: 0.9; margin-top: 4px; font-weight: 500;" id="weekly-timer">Resets in: 5d 11h</div>
                      </button>
                      <button class="challenge-tab" data-tab="seasonal" style="
                        flex: 1;
                        background: rgba(246, 173, 85, 0.3);
                        border: 1px solid #f6ad55;
                        border-radius: 6px;
                        color: #f6ad55;
                        cursor: pointer;
                        padding: 12px 8px;
                        font-family: 'Rajdhani', sans-serif;
                        font-weight: 600;
                        font-size: 14px;
                        text-transform: uppercase;
                        transition: all 0.3s ease;
                        text-align: center;
                      ">
                        Seasonal
                        <div style="font-size: 10px; opacity: 0.9; margin-top: 4px; font-weight: 500;" id="seasonal-timer">Resets in: 28d 5h</div>
                      </button>
                    </div>
                    
                    <!-- Challenge Content -->
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
                      <div id="challenges-grid" style="
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 12px;
                      ">
                        <!-- Challenges will be populated here -->
                      </div>
                    </div>
                  </div>
                `
                
                document.body.appendChild(modal)
                
                // Get user challenges data
                const userKey = isAuthenticated ? 
                  'challenges_' + (user?.wallet?.address || user?.email?.address || user?.id || 'guest').substring(0, 10) :
                  'challenges_guest'
                
                let challengesData = {}
                try {
                  const saved = localStorage.getItem(userKey)
                  challengesData = saved ? JSON.parse(saved) : {}
                } catch (error) {
                  console.error('Error loading challenges:', error)
                }
                
                // Define all challenges with categories
                const allChallenges = {
                  daily: [
                    { 
                      id: 'eat_50_coins', 
                      name: 'Coin Collector', 
                      description: 'Eat 50 coins', 
                      target: 50, 
                      reward: 100,
                      icon: '💰', // Changed from 🪙 to 💰
                      type: 'daily'
                    },
                    { 
                      id: 'survive_5_minutes', 
                      name: 'Survivor', 
                      description: 'Survive for 5 minutes', 
                      target: 300,
                      reward: 150,
                      icon: '⏱️',
                      type: 'daily'
                    }
                  ],
                  weekly: [
                    { 
                      id: 'reach_mass_200', 
                      name: 'Growing Strong', 
                      description: 'Reach mass 200', 
                      target: 200, 
                      reward: 200,
                      icon: '📈', // Changed back to chart emoji which should render better
                      type: 'weekly'
                    },
                    { 
                      id: 'cashout_5_times', 
                      name: 'Cash Master', 
                      description: 'Cash out 5 times', 
                      target: 5, 
                      reward: 250,
                      icon: '💰',
                      type: 'weekly'
                    }
                  ],
                  seasonal: [
                    {
                      id: 'seasonal_champion',
                      name: 'Arena Champion',
                      description: 'Win 25 multiplayer games',
                      target: 25,
                      reward: 500,
                      icon: '🏆',
                      type: 'seasonal'
                    },
                    {
                      id: 'seasonal_collector',
                      name: 'Ultimate Collector',
                      description: 'Collect 1000 coins total',
                      target: 1000,
                      reward: 1000,
                      icon: '👑',
                      type: 'seasonal'
                    }
                  ]
                }
                
                // Function to render challenges
                function renderChallenges(category) {
                  const grid = document.getElementById('challenges-grid')
                  const challenges = allChallenges[category] || []
                  
                  grid.innerHTML = challenges.map(challenge => {
                    const progress = challengesData[challenge.id] || { current: 0, completed: false, claimed: false }
                    const progressPercent = Math.min((progress.current / challenge.target) * 100, 100)
                    const isCompleted = progress.completed || progress.current >= challenge.target
                    const canClaim = isCompleted && !progress.claimed
                    
                    return `
                      <div style="
                        background: ${isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(45, 55, 72, 0.5)'};
                        border: 2px solid ${isCompleted ? '#22c55e' : 'rgba(148, 163, 184, 0.3)'};
                        border-radius: 8px;
                        padding: 16px;
                        display: grid;
                        grid-template-columns: auto 1fr auto;
                        gap: 12px;
                        align-items: center;
                        transition: all 0.3s ease;
                      ">
                        <!-- Icon -->
                        <div style="
                          width: 48px;
                          height: 48px;
                          background: ${isCompleted ? 'rgba(34, 197, 94, 0.2)' : 'rgba(252, 129, 129, 0.2)'};
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-size: 24px;
                          border: 2px solid ${isCompleted ? '#22c55e' : '#fc8181'};
                        ">
                          ${challenge.icon}
                        </div>
                        
                        <!-- Content -->
                        <div>
                          <div style="
                            font-size: 16px;
                            font-weight: 700;
                            color: ${isCompleted ? '#22c55e' : '#e2e8f0'};
                            font-family: 'Rajdhani', sans-serif;
                            text-transform: uppercase;
                            margin-bottom: 4px;
                          ">
                            ${challenge.name}
                          </div>
                          <div style="
                            font-size: 12px;
                            color: #94a3b8;
                            font-family: 'Rajdhani', sans-serif;
                            margin-bottom: 8px;
                          ">
                            ${challenge.description}
                          </div>
                          
                          <!-- Progress Bar -->
                          <div style="
                            background: rgba(30, 41, 59, 0.8);
                            border-radius: 4px;
                            height: 6px;
                            overflow: hidden;
                            margin-bottom: 6px;
                            position: relative;
                          ">
                            <div style="
                              background: ${isCompleted ? 
                                'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' : 
                                'linear-gradient(90deg, #fc8181 0%, #f87171 100)'};
                              height: 100%;
                              width: ${progressPercent}%;
                              transition: width 0.3s ease;
                            "></div>
                          </div>
                          
                          <!-- Progress Text -->
                          <div style="
                            font-size: 11px;
                            color: #64748b;
                            font-family: 'Rajdhani', sans-serif;
                            font-weight: 600;
                          ">
                            ${progress.current}/${challenge.target} (${Math.round(progressPercent)}%)
                          </div>
                        </div>
                        
                        <!-- Reward & Claim -->
                        <div style="text-align: center;">
                          <div style="
                            font-size: 14px;
                            color: #fbbf24;
                            font-family: 'Rajdhani', sans-serif;
                            font-weight: 800;
                            text-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
                            margin-bottom: 8px;
                          ">
                            +${challenge.reward} coins
                          </div>
                          
                          ${canClaim ? `
                            <button onclick="claimReward('${challenge.id}', ${challenge.reward})" style="
                              background: linear-gradient(45deg, #22c55e 0%, #16a34a 100%);
                              border: none;
                              border-radius: 6px;
                              color: white;
                              cursor: pointer;
                              padding: 8px 16px;
                              font-family: 'Rajdhani', sans-serif;
                              font-weight: 700;
                              font-size: 12px;
                              text-transform: uppercase;
                              box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
                              transition: all 0.2s ease;
                              animation: claimGlow 2s ease-in-out infinite;
                            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                              🎉 CLAIM
                            </button>
                          ` : (isCompleted ? `
                            <div style="
                              color: #22c55e;
                              font-size: 12px;
                              font-family: 'Rajdhani', sans-serif;
                              font-weight: 600;
                            ">
                              ✅ CLAIMED
                            </div>
                          ` : `
                            <div style="
                              color: #64748b;
                              font-size: 11px;
                              font-family: 'Rajdhani', sans-serif;
                              font-weight: 600;
                            ">
                              In Progress
                            </div>
                          `)}
                        </div>
                      </div>
                    `
                  }).join('')
                }
                
                // Claim reward function
                window.claimReward = function(challengeId, rewardAmount) {
                  try {
                    challengesData[challengeId] = {
                      ...challengesData[challengeId],
                      claimed: true
                    }
                    localStorage.setItem(userKey, JSON.stringify(challengesData))
                    setCurrency(prev => prev + rewardAmount)
                    
                    // Re-render current tab
                    const activeTab = document.querySelector('.active-tab')
                    if (activeTab) {
                      renderChallenges(activeTab.dataset.tab)
                    }
                    
                    console.log('✅ Claimed ' + rewardAmount + ' coins for challenge ' + challengeId)
                  } catch (error) {
                    console.error('Error claiming reward:', error)
                  }
                }
                
                // Tab switching functionality
                document.querySelectorAll('.challenge-tab').forEach(tab => {
                  tab.addEventListener('click', () => {
                    // Remove active class from all tabs
                    document.querySelectorAll('.challenge-tab').forEach(t => {
                      t.classList.remove('active-tab')
                      t.style.background = t.dataset.tab === 'daily' ? 'rgba(252, 129, 129, 0.3)' : 
                                         t.dataset.tab === 'weekly' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(246, 173, 85, 0.3)'
                      t.style.color = t.dataset.tab === 'daily' ? '#fc8181' : 
                                     t.dataset.tab === 'weekly' ? '#8b5cf6' : '#f6ad55'
                      t.style.boxShadow = 'none'
                    })
                    
                    // Add active class to clicked tab
                    tab.classList.add('active-tab')
                    tab.style.background = tab.dataset.tab === 'daily' ? 'linear-gradient(45deg, #fc8181 0%, #f56565 100%)' : 
                                          tab.dataset.tab === 'weekly' ? 'linear-gradient(45deg, #8b5cf6 0%, #7c3aed 100%)' : 
                                          'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)'
                    tab.style.color = 'white'
                    tab.style.boxShadow = '0 4px 8px ' + (tab.dataset.tab === 'daily' ? 'rgba(252, 129, 129, 0.4)' : 
                                                      tab.dataset.tab === 'weekly' ? 'rgba(139, 92, 246, 0.4)' : 
                                                      'rgba(246, 173, 85, 0.4)')
                    
                    // Render challenges for selected tab
                    renderChallenges(tab.dataset.tab)
                  })
                })
                
                // Add CSS animation for claim button glow
                const style = document.createElement('style')
                style.textContent = `
                  @keyframes claimGlow {
                    0% { box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4); }
                    50% { box-shadow: 0 6px 20px rgba(34, 197, 94, 0.7); }
                    100% { box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4); }
                  }
                `
                document.head.appendChild(style)
                
                // Initial render - daily tab
                renderChallenges('daily')
                
              } else {
                console.log('❌ Authentication failed, blocking access to VIEW ALL CHALLENGES')
              }
            }}
            style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(26, 32, 44, 0.8)',
            border: '2px solid #fc8181', // Restored 2px border
            borderRadius: '4px',
            color: '#fc8181',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(252, 129, 129, 0.3)',
            fontFamily: '"Rajdhani", sans-serif', // Restored Rajdhani font
            textTransform: 'uppercase'
          }}>
            VIEW ALL CHALLENGES
          </button>
        </div>

        {/* Bottom Right - Loadout */}
        <div style={{
          position: 'absolute',
          right: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '200px' : // Large screens: original positioning
             window.innerWidth >= 1200 ? Math.max(30, window.innerWidth * 0.015) + 'px' : // Laptop screens: 1.5% margin, min 30px
             '20px') : '200px', // Fallback for server-side rendering
          bottom: '160px',
          width: typeof window !== 'undefined' ? 
            (window.innerWidth >= 1600 ? '280px' : // Large screens: original width
             window.innerWidth >= 1200 ? Math.max(240, Math.min(280, window.innerWidth * 0.18)) + 'px' : // Laptop screens: 18% width, 240-280px range
             '240px') : '280px', // Fallback for server-side rendering  
          zIndex: 20,
          ...ambrerPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#68d391',
            borderRadius: '50%',
            boxShadow: '0 0 10px #68d391',
            animation: 'statusBlink 2s ease-in-out infinite 1.5s'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ color: '#8b5cf6', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(139, 92, 246, 0.6)', textTransform: 'uppercase' }}>CUSTOMIZE</h3>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {/* Interactive Game Circle Preview */}
            <div 
              ref={circleRef}
              style={{
                width: '72px',
                height: '72px',
                backgroundColor: selectedSkin.color, // Dynamic skin color instead of hardcoded blue
                border: '3px solid #ffffff', // White border like in-game
                borderRadius: '50%',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.3s ease, background-color 0.3s ease', // Added transition for skin changes
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
              }}
            >
              {/* Smooth Interactive Black Eyes */}
              <div style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                left: `${eyePositions.leftEye.x}px`,
                top: `${eyePositions.leftEye.y}px`,
                transform: 'translate(-50%, -50%)'
              }} />
              <div style={{
                position: 'absolute', 
                width: '8px',
                height: '8px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                left: `${eyePositions.rightEye.x}px`,
                top: `${eyePositions.rightEye.y}px`,
                transform: 'translate(-50%, -50%)'
              }} />
            </div>
          </div>
          
          <button 
            onClick={async () => {
              console.log('VIEW STORE button clicked!')
              const authenticated = await requireAuthentication('VIEW STORE')
              if (authenticated) {
                console.log('🛒 User authenticated, opening view store...')
                createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'shop')
              } else {
                console.log('❌ Authentication failed, blocking access to VIEW STORE')
              }
            }}
            style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
            color: '#1a202c',
            fontWeight: '700',
            borderRadius: '4px',
            border: '2px solid #f6ad55',
            cursor: 'pointer',
            marginBottom: '12px',
            boxShadow: '0 0 20px rgba(246, 173, 85, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            VIEW STORE
          </button>
          
          <button 
            onClick={async () => {
              console.log('CHANGE SKIN button clicked!')
              const authenticated = await requireAuthentication('CHANGE SKIN')
              if (authenticated) {
                console.log('🎨 User authenticated, opening change skin...')
                createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'owned')
              } else {
                console.log('❌ Authentication failed, blocking access to CHANGE SKIN')
              }
            }}
            style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(26, 32, 44, 0.8)',
            border: '2px solid #f6ad55',
            borderRadius: '4px',
            color: '#f6ad55',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(246, 173, 85, 0.3)',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            CHANGE SKIN
          </button>
        </div>



        {/* Communications Button - Moved to Bottom Left */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 20
        }}>
          <button 
            onClick={() => window.open('https://discord.gg/WbGTJPPTPs', '_blank')}
            style={{
            padding: '12px 24px',
            background: 'linear-gradient(45deg, #5865f2 0%, #4338ca 100%)',
            color: '#ffffff',
            fontWeight: '700',
            borderRadius: '4px',
            border: '2px solid #5865f2',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 25px rgba(88, 101, 242, 0.5)',
            transition: 'all 0.3s ease',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 35px rgba(88, 101, 242, 0.7)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 25px rgba(88, 101, 242, 0.5)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            DISCORD
          </button>
        </div>

        {/* Cash Out Notifications - Bottom Right - Tactical HUD Style */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          {cashOutNotifications.map((notification, index) => (
            <div
              key={notification.id}
              style={{
                position: 'relative',
                backgroundColor: 'rgba(26, 32, 44, 0.95)',
                border: '2px solid #10b981',
                borderRadius: '4px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(15px)',
                minWidth: '240px',
                maxWidth: '260px',
                fontFamily: '"Rajdhani", sans-serif',
                animation: `slideInRight 0.5s ease-out ${index * 0.1}s both`,
                opacity: 1 - (index * 0.15), // Fade older notifications
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {/* Status Indicator */}
              <div style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                background: '#10b981',
                borderRadius: '50%',
                boxShadow: '0 0 10px #10b981',
                animation: 'statusBlink 2s ease-in-out infinite'
              }} />
              
              {/* Header with Player and Amount */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
                paddingBottom: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#10b981',
                    transform: 'rotate(45deg)'
                  }} />
                  <span style={{ 
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#10b981'
                  }}>
                    CASH OUT
                  </span>
                </div>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '700',
                  color: '#ffd700',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                }}>
                  ${notification.amount}
                </span>
              </div>
              
              {/* Player Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    background: '#68d391',
                    borderRadius: '50%'
                  }} />
                  <span style={{ 
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    {notification.player}
                  </span>
                </div>
                <span style={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '11px'
                }}>
                  {notification.country}
                </span>
              </div>
              
              {/* Corner Accents */}
              <div style={{
                position: 'absolute',
                top: '-1px',
                left: '-1px',
                width: '12px',
                height: '12px',
                borderTop: '2px solid #10b981',
                borderLeft: '2px solid #10b981'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '12px',
                height: '12px',
                borderBottom: '2px solid #10b981',
                borderRight: '2px solid #10b981'
              }} />
            </div>
          ))}
        </div>

        {/* Enhanced CSS Animations */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&display=swap');
          
          html, body {
            margin: 0;
            padding: 0;
            background: #0d1117;
            overflow-x: hidden;
          }
          
          @keyframes backgroundPulse {
            0%, 100% { 
              opacity: 0.3;
            }
            50% { 
              opacity: 0.6;
            }
          }
          
          @keyframes slideInFromTop {
            0% { 
              transform: translateX(-50%) translateY(-100%);
              opacity: 0;
            }
            100% { 
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes scanLineVertical {
            0% { 
              transform: translateY(-100vh);
              opacity: 0;
            }
            5% { 
              opacity: 1;
            }
            95% { 
              opacity: 1;
            }
            100% { 
              transform: translateY(100vh);
              opacity: 0;
            }
          }
          
          @keyframes scanLineHorizontal {
            0% { 
              transform: translateX(-100vw);
              opacity: 0;
            }
            5% { 
              opacity: 1;
            }
            95% { 
              opacity: 1;
            }
            100% { 
              transform: translateX(100vw);
              opacity: 0;
            }
          }
          
          @keyframes dataStream {
            0%, 100% { 
              opacity: 0.2;
              transform: scaleY(0.5);
            }
            50% { 
              opacity: 0.8;
              transform: scaleY(1);
            }
          }
          
          @keyframes progressBar {
            0% { 
              width: 0%;
            }
            50% { 
              width: 70%;
            }
            100% { 
              width: 100%;
            }
          }
          
          @keyframes codeMatrix {
            0% { 
              transform: translateY(-100px);
              opacity: 0;
            }
            10% { 
              opacity: 0.5;
            }
            90% { 
              opacity: 0.5;
            }
            100% { 
              transform: translateY(100vh);
              opacity: 0;
            }
          }
          
          @keyframes scanBeam {
            0%, 100% { 
              transform: rotate(-20deg);
              opacity: 0.3;
            }
            50% { 
              transform: rotate(20deg);
              opacity: 0.8;
            }
          }
          
          @keyframes radarSweep {
            0% { 
              transform: rotate(0deg);
            }
            100% { 
              transform: rotate(360deg);
            }
          }
          
          @keyframes radarLine {
            0% { 
              transform: translate(-50%, -100%) rotate(0deg);
              opacity: 1;
            }
            100% { 
              transform: translate(-50%, -100%) rotate(360deg);
              opacity: 1;
            }
          }
          
          @keyframes radarBlip {
            0%, 85% { 
              opacity: 0;
              transform: scale(0.3);
            }
            90% { 
              opacity: 1;
              transform: scale(1.2);
            }
            95%, 100% { 
              opacity: 0.8;
              transform: scale(1);
            }
          }
          
          @keyframes tacticalGrid {
            0% { 
              transform: translateX(0) translateY(0);
            }
            100% { 
              transform: translateX(-80px) translateY(-80px);
            }
          }
          
          @keyframes tacticalFloat {
            0%, 100% { 
              transform: translateY(0px) translateX(0px) rotate(0deg);
              opacity: 0.3;
            }
            25% { 
              transform: translateY(-20px) translateX(15px) rotate(90deg);
              opacity: 0.8;
            }
            50% { 
              transform: translateY(-35px) translateX(-10px) rotate(180deg);
              opacity: 1;
            }
            75% { 
              transform: translateY(-15px) translateX(12px) rotate(270deg);
              opacity: 0.6;
            }
          }
          
          @keyframes hudFlicker {
            0%, 100% { 
              opacity: 0.7;
              boxShadow: 0 0 10px rgba(246, 173, 85, 0.3);
            }
            15% { 
              opacity: 0.4;
            }
            30% { 
              opacity: 1;
              boxShadow: 0 0 20px rgba(246, 173, 85, 0.6);
            }
            45% { 
              opacity: 0.8;
            }
            60% { 
              opacity: 0.9;
            }
            75% { 
              opacity: 0.6;
            }
            90% { 
              opacity: 1;
              boxShadow: 0 0 15px rgba(246, 173, 85, 0.5);
            }
          }
          
          @keyframes crosshairPulse {
            0%, 100% { 
              transform: scale(1) rotate(0deg);
              opacity: 0.6;
            }
            25% { 
              transform: scale(1.1) rotate(90deg);
              opacity: 0.8;
            }
            50% { 
              transform: scale(1.3) rotate(180deg);
              opacity: 1;
            }
            75% { 
              transform: scale(1.1) rotate(270deg);
              opacity: 0.8;
            }
          }
          
          @keyframes statusBlink {
            0%, 100% { 
              opacity: 0.4;
              boxShadow: 0 0 5px currentColor;
            }
            50% { 
              opacity: 1;
              boxShadow: 0 0 15px currentColor;
            }
          }
          
          @keyframes slideInRight {
            0% {
              transform: translateX(100%);
              opacity: 0;
            }
            100% {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>

        {/* Desktop Server Browser Modal */}
        <ServerBrowserModal
          isOpen={isServerBrowserOpen && !isMobile}
          onClose={() => {
            console.log('Closing desktop server browser modal')
            setIsServerBrowserOpen(false)
          }}
          onJoinLobby={handleJoinLobby}
        />

        {/* User Profile Modal */}
        {isProfileModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsProfileModalOpen(false)
              }
            }}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
                border: '3px solid #68d391',
                borderRadius: '16px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif'
              }}
            >
              {/* Header - Fixed */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
                background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
                borderRadius: '13px 13px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#1a202c',
                    fontWeight: '700',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                  }}>
                    👤
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '24px',
                      fontWeight: '700',
                      textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      USER PROFILE
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      color: '#a0aec0',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      TACTICAL OPERATIVE
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  style={{
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '8px',
                    color: '#fc8181',
                    fontSize: '20px',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                    e.target.style.transform = 'scale(1.1)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                
                {/* Identity Section */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    marginBottom: '20px'
                  }}>
                    {/* Avatar/Skin Preview */}
                    <div style={{
                      width: '120px',
                      height: '120px',
                      background: selectedSkin.color,
                      borderRadius: '50%',
                      border: '4px solid #68d391',
                      boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      flexShrink: 0
                    }}>
                      {/* Eyes like in-game */}
                      <div style={{
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        background: '#1a202c',
                        borderRadius: '50%',
                        top: '35px',
                        left: '35px'
                      }} />
                      <div style={{
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        background: '#1a202c',
                        borderRadius: '50%',
                        top: '35px',
                        right: '35px'
                      }} />
                    </div>
                    
                    {/* User Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        color: '#68d391',
                        fontSize: '24px',
                        fontWeight: '700',
                        wordBreak: 'break-word'
                      }}>
                        {getDisplayUsername().toUpperCase()}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isAuthenticated ? '#68d391' : '#f6ad55'
                        }} />
                        <span style={{
                          color: isAuthenticated ? '#68d391' : '#f6ad55',
                          fontSize: '14px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {isAuthenticated ? 'ONLINE' : 'GUEST'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          // Handle edit profile
                        }}
                        style={{
                          background: 'rgba(104, 211, 145, 0.2)',
                          border: '2px solid #68d391',
                          borderRadius: '8px',
                          color: '#68d391',
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        📝 EDIT PROFILE
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats & Progression */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    color: '#f6ad55',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📊 STATS & PROGRESSION
                  </h4>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#f6ad55', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Games Played</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#68d391', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Wins</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#9f7aea', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Highest Size</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#fc8181', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Win Streak</div>
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '12px',
                    background: 'rgba(246, 173, 85, 0.1)',
                    border: '1px solid rgba(246, 173, 85, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: '#f6ad55', fontSize: '14px', fontWeight: '600' }}>
                      💰 LIFETIME EARNINGS: $0.00
                    </span>
                  </div>
                </div>

                {/* Wallet Snapshot */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    color: '#f6ad55',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    💰 WALLET SNAPSHOT
                  </h4>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(104, 211, 145, 0.1)',
                      border: '1px solid rgba(104, 211, 145, 0.3)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#68d391', fontSize: '24px', fontWeight: '700' }}>{currency.toLocaleString()}</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>COINS</div>
                    </div>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(159, 122, 234, 0.1)',
                      border: '1px solid rgba(159, 122, 234, 0.3)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#9f7aea', fontSize: '24px', fontWeight: '700' }}>0.0000</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>SOL</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleDeposit}
                      style={{
                        flex: 1,
                        background: 'rgba(104, 211, 145, 0.2)',
                        border: '2px solid #68d391',
                        borderRadius: '8px',
                        color: '#68d391',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      💳 DEPOSIT SOL
                    </button>
                    <button
                      onClick={() => {
                        // Handle withdraw
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(252, 129, 129, 0.2)',
                        border: '2px solid #fc8181',
                        borderRadius: '8px',
                        color: '#fc8181',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      💸 WITHDRAW
                    </button>
                  </div>
                </div>

                {/* Customization */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    color: '#9f7aea',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🎨 CUSTOMIZATION
                  </h4>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        // Open customization
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(159, 122, 234, 0.2)',
                        border: '2px solid #9f7aea',
                        borderRadius: '8px',
                        color: '#9f7aea',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      🎯 CHANGE SKIN
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        // Open store
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(246, 173, 85, 0.2)',
                        border: '2px solid #f6ad55',
                        borderRadius: '8px',
                        color: '#f6ad55',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      🛒 VIEW STORE
                    </button>
                  </div>
                </div>

                {/* Social & Party */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    color: '#68d391',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    👥 SOCIAL & PARTY
                  </h4>
                  
                  <div style={{
                    color: '#a0aec0',
                    fontSize: '12px',
                    marginBottom: '16px',
                    textTransform: 'uppercase'
                  }}>
                    FRIENDS ONLINE (0/0)
                  </div>
                  
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#a0aec0',
                    fontSize: '14px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>👥</div>
                    <div>No friends online</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Add friends to see them here
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {/* Privacy Policy and Terms & Conditions Buttons */}
                  <button
                    onClick={() => window.open('https://drive.google.com/file/d/1dE-KZMxTAWtxVP-_Sff_SWqJh-1L_lq0/view?usp=sharing', '_blank')}
                    style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '8px',
                      color: '#68d391',
                      padding: '12px 20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    <span>📋</span>
                    <span>Privacy Policy</span>
                  </button>
                  
                  <button
                    onClick={() => window.open('https://drive.google.com/file/d/1l8n6nR2YzwywFQkPaephYUIJAbFghXt-/view?usp=sharing', '_blank')}
                    style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '8px',
                      color: '#68d391',
                      padding: '12px 20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    <span>📜</span>
                    <span>Terms & Conditions</span>
                  </button>
                  
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        handleLogout()
                      }}
                      style={{
                        background: 'rgba(252, 129, 129, 0.2)',
                        border: '2px solid #fc8181',
                        borderRadius: '8px',
                        color: '#fc8181',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: '120px'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                        e.target.style.transform = 'translateY(-2px)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      🚪 LOGOUT
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        handleLogin()
                      }}
                      style={{
                        background: 'rgba(104, 211, 145, 0.2)',
                        border: '2px solid #68d391',
                        borderRadius: '8px',
                        color: '#68d391',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: '120px'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                        e.target.style.transform = 'translateY(-2px)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      LOGIN
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Friends Modal */}
        {isFriendsModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsFriendsModalOpen(false)
              }
            }}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
                border: '3px solid #68d391',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif'
              }}
            >
              {/* Header - Fixed */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
                background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
                borderRadius: '13px 13px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#1a202c',
                    fontWeight: '700',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                  }}>
                    👥
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '24px',
                      fontWeight: '700',
                      textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      SOCIAL
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      color: '#a0aec0',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      CONNECT & PLAY
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFriendsModalOpen(false)}
                  style={{
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '8px',
                    color: '#fc8181',
                    fontSize: '20px',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                    e.target.style.transform = 'scale(1.1)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                
                {/* Quick Actions */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => {
                      console.log('Add Friend clicked')
                      setIsAddFriendModalOpen(true)
                    }}
                    style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '8px',
                      color: '#68d391',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    👤 ADD FRIEND
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🎯 CREATE PARTY button clicked from Friends modal!')
                      const authenticated = await requireAuthentication('CREATE PARTY')
                      if (authenticated) {
                        console.log('🎯 User authenticated, opening create party popup immediately...')
                        
                        // Close friends modal first
                        const existingModal = document.querySelector('.friends-modal')
                        if (existingModal) {
                          existingModal.remove()
                        }
                        
                        // Open party modal immediately for better UX
                        createDesktopCreatePartyPopup()
                        
                        // Load friends asynchronously in background if needed
                        if (friendsList.length === 0 && !loadingFriends) {
                          console.log('🔄 Loading friends list in background...')
                          loadFriendsList().catch(error => {
                            console.error('❌ Background friends loading failed:', error)
                          })
                        }
                        
                        console.log('✅ Party modal opened immediately - friends loading in background')
                      } else {
                        console.log('❌ Authentication failed, blocking access to CREATE PARTY')
                      }
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      color: '#3b82f6',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(59, 130, 246, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(59, 130, 246, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🎯 CREATE PARTY
                  </button>
                </div>

                {/* Friend Requests Section */}
                <div style={{
                  padding: '12px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(246, 173, 85, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#f6ad55',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      📬 REQUESTS & INVITES
                    </h3>
                    <span style={{
                      color: '#a0aec0',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {friendRequests.received.length} PENDING
                    </span>
                  </div>
                  
                  {loadingRequests ? (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>⏳</div>
                      <div style={{ fontSize: '11px' }}>Loading requests...</div>
                    </div>
                  ) : friendRequests.received.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {friendRequests.received.slice(0, 2).map((request) => (
                        <div key={request.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: request.type === 'party_invite' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(246, 173, 85, 0.1)',
                          borderRadius: '6px',
                          border: request.type === 'party_invite' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(246, 173, 85, 0.3)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: request.type === 'party_invite' ? '#3b82f6' : '#f6ad55',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px'
                            }}>
                              {request.type === 'party_invite' ? '🎯' : '👥'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ 
                                color: '#e2e8f0', 
                                fontSize: '12px', 
                                fontWeight: '600' 
                              }}>
                                {request.fromUsername}
                              </div>
                              {request.type === 'party_invite' && (
                                <div style={{ 
                                  color: '#a0aec0', 
                                  fontSize: '10px'
                                }}>
                                  Party: "{request.partyName}"
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={async () => {
                                try {
                                  const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id
                                  
                                  if (request.type === 'party_invite') {
                                    // Handle party invite acceptance
                                    const response = await fetch('/api/party', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'accept_invite',
                                        userIdentifier,
                                        inviteId: request.id,
                                        partyId: request.partyId
                                      })
                                    })
                                    
                                    const result = await response.json()
                                    if (result.success) {
                                      alert(`🎯 Joined party "${request.partyName}"!`)
                                      loadFriendRequests()
                                      loadCurrentParty() // Refresh party status
                                    } else {
                                      alert(`❌ Failed to join party: ${result.error}`)
                                    }
                                  } else {
                                    // Handle friend request acceptance
                                    const response = await fetch('/api/friends', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'accept_request',
                                        userIdentifier,
                                        requestId: request.id
                                      })
                                    })
                                    
                                    const result = await response.json()
                                    if (result.success) {
                                      alert(`✅ ${request.fromUsername} is now your friend!`)
                                      loadFriendRequests()
                                      loadFriendsList()
                                    } else {
                                      alert(`❌ Failed to accept request: ${result.error}`)
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error accepting request/invite:', error)
                                  alert('❌ Failed to accept request/invite')
                                }
                              }}
                              style={{
                                background: request.type === 'party_invite' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                border: request.type === 'party_invite' ? '1px solid #3b82f6' : '1px solid #22c55e',
                                borderRadius: '3px',
                                color: request.type === 'party_invite' ? '#3b82f6' : '#22c55e',
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              {request.type === 'party_invite' ? 'JOIN' : '✓'}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id
                                  const response = await fetch('/api/friends', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      action: 'decline_request',
                                      userIdentifier,
                                      requestId: request.id
                                    })
                                  })
                                  
                                  const result = await response.json()
                                  if (result.success) {
                                    alert(`❌ Friend request from ${request.fromUsername} declined`)
                                    loadFriendRequests()
                                  } else {
                                    alert(`❌ Failed to decline request: ${result.error}`)
                                  }
                                } catch (error) {
                                  console.error('Error declining friend request:', error)
                                  alert('❌ Failed to decline friend request')
                                }
                              }}
                              style={{
                                background: 'rgba(252, 129, 129, 0.2)',
                                border: '1px solid #fc8181',
                                borderRadius: '3px',
                                color: '#fc8181',
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              ✗
                            </button>
                          </div>
                        </div>
                      ))}
                      {friendRequests.received.length > 2 && (
                        <div style={{
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '11px',
                          padding: '4px'
                        }}>
                          +{friendRequests.received.length - 2} more requests
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.6 }}>📤</div>
                      <div style={{ fontSize: '11px' }}>No pending requests</div>
                    </div>
                  )}
                </div>

                {/* Online Friends - Compact */}
                <div style={{
                  padding: '12px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      🟢 ONLINE FRIENDS
                    </h3>
                    <span style={{
                      color: '#a0aec0',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {friendsList.filter(f => f.isOnline && f.status === 'accepted').length} ONLINE
                    </span>
                  </div>
                  
                  {loadingFriends ? (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>⏳</div>
                      <div style={{ fontSize: '11px' }}>Loading...</div>
                    </div>
                  ) : friendsList.filter(f => f.isOnline && f.status === 'accepted').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {friendsList.filter(f => f.isOnline && f.status === 'accepted').slice(0, 3).map((friend) => (
                        <div key={friend.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'rgba(26, 32, 44, 0.5)',
                          borderRadius: '6px',
                          border: '1px solid rgba(104, 211, 145, 0.2)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#22c55e',
                              boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)'
                            }} />
                            <div style={{ 
                              color: '#e2e8f0', 
                              fontSize: '12px', 
                              fontWeight: '600' 
                            }}>
                              {friend.username}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              console.log('Inviting friend to party:', friend.username)
                              alert(`🎯 Party invite sent to ${friend.username}!`)
                            }}
                            style={{
                              background: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              color: '#3b82f6',
                              padding: '4px 8px',
                              fontSize: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              textTransform: 'uppercase'
                            }}
                          >
                            INVITE
                          </button>
                        </div>
                      ))}
                      {friendsList.filter(f => f.isOnline && f.status === 'accepted').length > 3 && (
                        <div style={{
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '11px',
                          padding: '4px'
                        }}>
                          +{friendsList.filter(f => f.isOnline && f.status === 'accepted').length - 3} more online
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.6 }}>👥</div>
                      <div style={{ fontSize: '11px' }}>No friends online</div>
                    </div>
                  )}
                </div>

                {/* All Friends - Compact */}
                <div style={{
                  padding: '12px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#9f7aea',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      👤 ALL FRIENDS
                    </h3>
                    <span style={{
                      color: '#a0aec0',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {friendsList.filter(f => f.status === 'accepted').length} TOTAL
                    </span>
                  </div>
                  
                  {friendsList.filter(f => f.status === 'accepted').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {friendsList.filter(f => f.status === 'accepted').slice(0, 3).map((friend) => (
                        <div key={friend.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'rgba(26, 32, 44, 0.5)',
                          borderRadius: '6px',
                          border: '1px solid rgba(159, 122, 234, 0.2)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: friend.isOnline ? '#22c55e' : '#6b7280'
                            }} />
                            <div style={{ 
                              color: friend.isOnline ? '#e2e8f0' : '#9ca3af', 
                              fontSize: '12px', 
                              fontWeight: '500' 
                            }}>
                              {friend.username}
                            </div>
                          </div>
                          <div style={{
                            color: friend.isOnline ? '#22c55e' : '#6b7280',
                            fontSize: '10px',
                            fontWeight: '500',
                            textTransform: 'uppercase'
                          }}>
                            {friend.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </div>
                        </div>
                      ))}
                      {friendsList.filter(f => f.status === 'accepted').length > 3 && (
                        <div style={{
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '11px',
                          padding: '4px'
                        }}>
                          +{friendsList.filter(f => f.status === 'accepted').length - 3} more friends
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.6 }}>🤝</div>
                      <div style={{ fontSize: '11px', marginBottom: '8px' }}>Your friends list is empty</div>
                      <button
                        onClick={() => {
                          console.log('Add first friend clicked')
                          setIsAddFriendModalOpen(true)
                        }}
                        style={{
                          background: 'rgba(104, 211, 145, 0.2)',
                          border: '1px solid #68d391',
                          borderRadius: '4px',
                          color: '#68d391',
                          padding: '6px 12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                        }}
                      >
                        👤 ADD YOUR FIRST FRIEND
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Friend Modal */}
        {isAddFriendModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 10001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAddFriendModalOpen(false)
              }
            }}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
                border: '3px solid #68d391',
                borderRadius: '16px',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
                background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
                borderRadius: '13px 13px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#1a202c',
                    fontWeight: '700',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                  }}>
                    👤
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '24px',
                      fontWeight: '700',
                      textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      ADD FRIEND
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      color: '#a0aec0',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      EXPAND YOUR NETWORK
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddFriendModalOpen(false)}
                  style={{
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '8px',
                    color: '#fc8181',
                    fontSize: '20px',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                    e.target.style.transform = 'scale(1.1)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                
                {/* TurfLoot Users List */}
                <div style={{
                  marginBottom: '24px'
                }}>
                  <label style={{
                    display: 'block',
                    color: '#68d391',
                    fontSize: '14px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    letterSpacing: '0.05em'
                  }}>
                    Authenticated Users ({availableUsers.length} Available)
                  </label>
                  
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '2px solid rgba(104, 211, 145, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(26, 32, 44, 0.8)'
                  }}>
                    {loadingUsers ? (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#a0aec0',
                        fontSize: '14px'
                      }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                        Loading TurfLoot users...
                      </div>
                    ) : availableUsers.length > 0 ? (
                      <div style={{ padding: '8px' }}>
                        {availableUsers.map((user, index) => (
                          <div key={user.username} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            margin: '4px 0',
                            background: 'rgba(45, 55, 72, 0.6)',
                            borderRadius: '8px',
                            border: '1px solid rgba(104, 211, 145, 0.2)',
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Status Indicator */}
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: user.status === 'online' ? '#22c55e' : 
                                           user.status === 'in-game' ? '#f59e0b' : '#6b7280',
                                boxShadow: user.status === 'online' ? '0 0 8px rgba(34, 197, 94, 0.6)' :
                                          user.status === 'in-game' ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none'
                              }} />
                              
                              {/* User Info */}
                              <div>
                                <div style={{
                                  color: '#e2e8f0',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  marginBottom: '2px'
                                }}>
                                  {user.username}
                                </div>
                                <div style={{
                                  color: user.status === 'online' ? '#22c55e' : 
                                        user.status === 'in-game' ? '#f59e0b' : '#6b7280',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  textTransform: 'uppercase',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  {user.status === 'online' ? '🟢 ONLINE' :
                                   user.status === 'in-game' ? '🎮 IN GAME' : '⚫ OFFLINE'}
                                  <span style={{ color: '#a0aec0', fontSize: '11px' }}>
                                    • {user.gamesPlayed} games
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Add Friend Button */}
                            <button
                              onClick={async () => {
                                try {
                                  console.log('🔍 Friend request debug:', {
                                    isAuthenticated,
                                    user: user ? {
                                      id: user.id,
                                      wallet: user.wallet?.address,
                                      email: user.email?.address
                                    } : null
                                  })
                                  
                                  // Check if user is authenticated AND user object is loaded
                                  if (!isAuthenticated) {
                                    alert('Please log in to add friends')
                                    return
                                  }
                                  
                                  // Try to get user identifier from multiple sources including Privy bridge
                                  let userIdentifier = null
                                  
                                  // Method 1: From user object
                                  if (user && (user.wallet?.address || user.email?.address || user.id)) {
                                    userIdentifier = user.wallet?.address || user.email?.address || user.id
                                  }
                                  
                                  // Method 2: Try getting from Privy bridge directly
                                  if (!userIdentifier && typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
                                    const privyUser = window.__TURFLOOT_PRIVY__.user
                                    if (privyUser) {
                                      userIdentifier = privyUser.wallet?.address || privyUser.email?.address || privyUser.id
                                    }
                                  }
                                  
                                  console.log('🔍 Computed userIdentifier:', userIdentifier)
                                  console.log('🔍 User object state:', user ? Object.keys(user) : 'null')
                                  
                                  if (!userIdentifier) {
                                    alert('Unable to identify your account. Please try refreshing the page or logging out and back in.')
                                    return
                                  }
                                  
                                  // Ensure current user is registered in database
                                  await registerPrivyUser()
                                  
                                  const response = await fetch('/api/friends', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                      action: 'send_request',
                                      userIdentifier,
                                      friendUsername: user.username,
                                      friendIdentifier: null
                                    })
                                  })
                                  
                                  const result = await response.json()
                                  
                                  if (result.success) {
                                    alert(`✅ Friend request sent to ${user.username}!`)
                                    console.log('✅ Friend request sent successfully:', result)
                                    
                                    // Refresh available users and friend requests
                                    loadAvailableUsers()
                                    if (isFriendsModalOpen) {
                                      loadFriendRequests()
                                    }
                                  } else {
                                    alert(`❌ Failed to send friend request: ${result.error}`)
                                    console.error('❌ Friend request failed:', result.error)
                                  }
                                  
                                } catch (error) {
                                  console.error('❌ Error sending friend request:', error)
                                  alert('❌ Failed to send friend request. Please try again.')
                                }
                              }}
                              style={{
                                background: 'rgba(104, 211, 145, 0.2)',
                                border: '2px solid #68d391',
                                borderRadius: '6px',
                                color: '#68d391',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                transition: 'all 0.3s ease',
                                minWidth: '80px'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                                e.target.style.transform = 'translateY(-1px)'
                                e.target.parentElement.parentElement.style.background = 'rgba(45, 55, 72, 0.8)'
                                e.target.parentElement.parentElement.style.borderColor = 'rgba(104, 211, 145, 0.4)'
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                                e.target.style.transform = 'translateY(0)'
                                e.target.parentElement.parentElement.style.background = 'rgba(45, 55, 72, 0.6)'
                                e.target.parentElement.parentElement.style.borderColor = 'rgba(104, 211, 145, 0.2)'
                              }}
                            >
                              👤 ADD
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#a0aec0',
                        fontSize: '14px'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.6 }}>👥</div>
                        <div style={{ marginBottom: '4px' }}>No TurfLoot users available</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                          {isAuthenticated ? 
                            'No other authenticated users have signed up yet. Invite friends to join TurfLoot!' :
                            'Please log in to see other TurfLoot users'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => {
                      // Close modal
                      setIsAddFriendModalOpen(false)
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(160, 174, 192, 0.2)',
                      border: '2px solid #a0aec0',
                      borderRadius: '8px',
                      color: '#a0aec0',
                      padding: '14px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(160, 174, 192, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(160, 174, 192, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    ❌ CLOSE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // Mobile Layout
  return (
    <div style={containerStyle}>
      
      {/* Insufficient Funds Notification Banner - Mobile */}
      {insufficientFundsNotification && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: '10px',
          right: '10px',
          zIndex: 9999,
          background: 'linear-gradient(45deg, rgba(252, 129, 129, 0.95) 0%, rgba(245, 101, 101, 0.95) 100%)',
          border: '2px solid #fc8181',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(252, 129, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          animation: 'slideInFromTop 0.5s ease-out',
          fontFamily: '"Rajdhani", sans-serif'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0
            }}>
              💰
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>
                Insufficient Funds
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.3' }}>
                Need ${insufficientFundsNotification.requiredAmount} • You have ${insufficientFundsNotification.currentBalance}
                <br />
                <span style={{ fontWeight: '700', color: '#fef5e7' }}>Deposit more SOL to play!</span>
              </div>
            </div>
            <button
              onClick={() => setInsufficientFundsNotification(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mobile Tactical Background (Simplified) */}
      <div style={mobileBackgroundStyles.backgroundContainer}>
        
        {/* Mobile Grid */}
        <div style={mobileBackgroundStyles.mobileGrid} />

        {/* Mobile Radar (Smaller) */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '80px',
          height: '80px',
          border: '1px solid rgba(104, 211, 145, 0.4)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, transparent 70%, rgba(104, 211, 145, 0.05) 100%)',
          animation: 'radarSweep 6s linear infinite'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '1px',
            height: '40px',
            background: 'linear-gradient(to bottom, #68d391, transparent)',
            transformOrigin: 'top center',
            transform: 'translate(-50%, -100%)',
            animation: 'radarLine 6s linear infinite'
          }} />
        </div>

        {/* Mobile Particles (Fewer) */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`tactical-${i}`}
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              background: ['#68d391', '#f6ad55'][Math.floor(Math.random() * 2)],
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.2,
              animation: `tacticalFloat ${Math.random() * 8 + 10}s ease-in-out infinite`,
              boxShadow: `0 0 6px currentColor`,
              zIndex: 5
            }}
          />
        ))}
      </div>

      {/* Mobile Content Container */}
      <div className="mobile-container" style={mobileContainerStyle}>
        
        {/* Mobile Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              color: '#68d391', 
              fontWeight: '700', 
              fontSize: '12px',
              textShadow: '0 0 8px rgba(104, 211, 145, 0.6)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  PLAYER: {isAuthenticated ? 
                    (customUsername || user?.email?.address?.split('@')[0] || user?.wallet?.address?.slice(0, 8) || 'USER').toUpperCase() : 
                    (customUsername || userName).toUpperCase()
                  }
                </span>
                <span style={{
                  backgroundColor: '#CD7F32',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}>
                  🥉 Bronze
                </span>
              </div>
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Mobile Navigation Icons */}
            <div 
              style={{ 
                width: 'auto', 
                minWidth: '24px',
                height: '24px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '3px',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '10px',
                padding: '0 6px',
                gap: '3px'
              }}
              title="Wallet"
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
              }}
            >
              <span style={{ fontSize: '12px' }}>💰</span>
              <span style={{ 
                color: '#68d391', 
                fontFamily: '"Rajdhani", sans-serif',
                fontWeight: '700',
                fontSize: '10px'
              }}>
                {currency.toLocaleString()}
              </span>
            </div>
            <div 
              style={{ 
                position: 'relative',
                width: '24px', 
                height: '24px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '3px',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '12px'
              }}
              title="Friends"
              onClick={() => {
                console.log('👥 Friends icon clicked!')
                if (!authenticated) {
                  console.log('⚠️ User not authenticated, opening Privy login')
                  if (typeof login === 'function') {
                    login()
                  }
                  return
                }
                setIsFriendsModalOpen(true)
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
              }}
            >
              👥
              {/* Notification Badge - Mobile */}
              {friendRequests.received.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
                  border: '1px solid rgba(26, 32, 44, 1)',
                  zIndex: 10
                }}>
                  {friendRequests.received.length > 9 ? '9+' : friendRequests.received.length}
                </div>
              )}
            </div>
            <div 
              style={{ 
                width: '24px', 
                height: '24px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '3px',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '12px'
              }}
              title="User Profile"
              onClick={() => {
                console.log('👤 Profile icon clicked!')
                if (!authenticated) {
                  console.log('⚠️ User not authenticated, opening Privy login')
                  if (typeof login === 'function') {
                    login()
                  }
                  return
                }
                setIsProfileModalOpen(true)
                console.log('🔍 Setting profile modal to true')
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
              }}
            >
              👤
            </div>
            
            {/* Login/Logout Button - Mobile FIXED HEIGHT */}
            {authenticated ? (
              <button
                onClick={handleLogout}
                style={{
                  height: '20px',
                  padding: '0 8px',
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '3px',
                  color: '#fc8181',
                  fontSize: '9px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 10px rgba(252, 129, 129, 0.3)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.boxShadow = '0 0 15px rgba(252, 129, 129, 0.5)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.boxShadow = '0 0 10px rgba(252, 129, 129, 0.3)'
                }}
              >
                LOGOUT
              </button>
            ) : (
              <button
                onClick={handleLogin}
                style={{
                  height: '20px',
                  padding: '0 8px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  border: '2px solid #68d391',
                  borderRadius: '3px',
                  color: '#1a202c',
                  fontSize: '9px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
                }}
              >
                LOGIN
              </button>
            )}
          </div>
        </div>

        {/* Mobile Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ 
              background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Mobile Game Controls */}
        <div style={centerControlsStyle}>
          {/* Mobile Stats - Moved above username input */}
          <div style={statsStyle}>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>{liveStats.players}</div>
              <div style={statLabelStyle}>PLAYERS</div>
            </div>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
              <div style={statLabelStyle}>TOTAL WINNINGS</div>
            </div>
          </div>

          {/* Player Name Input */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a202c',
                fontWeight: '800',
                fontSize: '18px',
                boxShadow: '0 0 20px rgba(246, 173, 85, 0.6)',
                border: '2px solid #f6ad55',
                fontFamily: '"Rajdhani", sans-serif'
              }}>
                0
              </div>
              <input 
                type="text" 
                value={getDisplayUsername()}
                onChange={(e) => {
                  const newUsername = e.target.value
                  setCustomUsername(newUsername)
                  console.log('🎮 Username updated:', newUsername)
                }}
                style={nameInputStyle}
                placeholder="USERNAME"
              />
              <div 
                onClick={async () => {
                  const currentUsername = getDisplayUsername()
                  const saved = await saveUsernameToPrivy(currentUsername)
                  
                  if (saved) {
                    console.log('✅ Username confirmed and saved:', currentUsername)
                    // Visual feedback
                    const confirmButton = event.target
                    const originalBg = confirmButton.style.background
                    confirmButton.style.background = 'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)'
                    confirmButton.innerHTML = '✓'
                    
                    setTimeout(() => {
                      confirmButton.style.background = originalBg
                      confirmButton.innerHTML = '→'
                    }, 1000)
                  } else {
                    console.log('❌ Failed to save username')
                  }
                }}
                style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a202c',
                fontWeight: '600',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.6)',
                border: '2px solid #68d391',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.8)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.6)'
                }}
              >
                ✓
              </div>
            </div>
          </div>

          {/* Stakes */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
            {['$0.02', '$0.50', '$0.65'].map((stake) => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                style={selectedStake === stake ? activeStakeStyle : inactiveStakeStyle}
              >
                {stake}
              </button>
            ))}
          </div>

          {/* Main Deploy Button */}
          <button 
            onClick={handleJoinGame}
            style={deployButtonStyle}
          >
            ▶ PLAY
          </button>

          {/* Secondary Buttons - Enhanced with Desktop Features */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              style={{
                ...secondaryButtonStyle,
                fontSize: '10px',
                padding: '8px 12px'
              }}
              onClick={async () => {
                console.log('SERVER BROWSER button clicked!')
                const authenticated = await requireAuthentication('SERVER BROWSER')
                if (authenticated) {
                  console.log('🌐 User authenticated, opening server browser...')
                  setIsServerBrowserOpen(true)
                } else {
                  console.log('❌ Authentication failed, blocking access to SERVER BROWSER')
                }
              }}
            >
              SERVER BROWSER
            </button>
            <button 
              style={{
                ...secondaryButtonStyle,
                background: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'rgba(107, 114, 128, 0.3)' : 'rgba(59, 130, 246, 0.1)',
                border: (currentParty && currentParty.members && currentParty.members.length > 1) ? '1px solid #6b7280' : '1px solid #3b82f6',
                color: (currentParty && currentParty.members && currentParty.members.length > 1) ? '#9ca3af' : '#3b82f6',
                fontSize: '10px',
                padding: '8px 12px',
                cursor: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'not-allowed' : 'pointer',
                opacity: (currentParty && currentParty.members && currentParty.members.length > 1) ? 0.6 : 1
              }}
              onClick={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  console.log('🔒 MOBILE LOCAL PRACTICE blocked - user is in a duo')
                  e.preventDefault()
                  return
                }
                
                console.log('🤖 MOBILE LOCAL PRACTICE button clicked!')
                
                // Create completely local room with bots - no Hathora charges
                const localRoomId = 'local-bots-' + Math.random().toString(36).substring(2, 10)
                const gameUrl = `/agario?roomId=${localRoomId}&mode=local&fee=0&region=local&multiplayer=offline&server=local&bots=true`
                console.log('🎮 Starting mobile local practice with bots:', gameUrl)
                checkOrientationAndEnterGame(gameUrl)
              }}
              onMouseOver={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  // Show tooltip for disabled state on mobile
                  const tooltip = document.createElement('div')
                  tooltip.id = 'mobile-local-practice-tooltip'
                  tooltip.textContent = 'Local Practice is only available for solo players. Leave your party to play offline with bots.'
                  tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 500;
                    max-width: 200px;
                    z-index: 10000;
                    pointer-events: none;
                    border: 1px solid #374151;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                  `
                  
                  // Position tooltip above the button (mobile optimized)
                  const rect = e.target.getBoundingClientRect()
                  tooltip.style.left = `${Math.max(10, rect.left)}px`
                  tooltip.style.top = `${rect.top - 70}px`
                  
                  document.body.appendChild(tooltip)
                }
              }}
              onMouseOut={(e) => {
                // Remove mobile tooltip
                const tooltip = document.getElementById('mobile-local-practice-tooltip')
                if (tooltip) {
                  tooltip.remove()
                }
              }}
              disabled={currentParty && currentParty.members && currentParty.members.length > 1}
            >
              {(currentParty && currentParty.members && currentParty.members.length > 1) ? '🔒 LOCAL PRACTICE' : 'LOCAL PRACTICE'}
            </button>
            <button 
              style={{
                ...secondaryButtonStyle,
                fontSize: '10px',
                padding: '8px 12px'
              }}
              onClick={async () => {
                console.log('HOW TO PLAY button clicked!')
                const authenticated = await requireAuthentication('HOW TO PLAY')
                if (authenticated) {
                  console.log('📖 User authenticated, showing how to play...')
                  alert('HOW TO PLAY: Move with mouse, collect coins to grow, hold E to cash out!')
                } else {
                  console.log('❌ Authentication failed, blocking access to HOW TO PLAY')
                }
              }}
            >
              HOW TO PLAY
            </button>
          </div>
        </div>

        {/* Mobile Panels Grid */}
        <div style={mobileGridStyle}>
          {/* Arsenal Panel - Enhanced with Desktop Features */}
          <div style={ambrerPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>WALLET</h3>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                <button 
                  onClick={handleCopyAddress}
                  style={{ 
                    fontSize: '8px', 
                    color: '#f6ad55', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    textDecoration: 'none',
                    padding: '0'
                  }}
                >
                  📋
                </button>
                <button 
                  onClick={handleBalanceRefresh}
                  style={{ 
                    fontSize: '8px', 
                    color: '#f6ad55', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    textDecoration: 'none',
                    padding: '0'
                  }}
                >
                  ↻
                </button>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '2px',
                fontFamily: '"Rajdhani", sans-serif'
              }}>
                {walletBalance.loading ? 'Loading...' : walletBalance.usd !== null ? `$${walletBalance.usd}` : '--'}
              </div>
              <div style={{ color: '#f6ad55', fontSize: '9px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
                {walletBalance.loading ? 'Loading...' : walletBalance.sol !== null ? `${walletBalance.sol} SOL` : '--'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={handleDeposit}
                style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(104, 211, 145, 0.2)',
                border: '1px solid #68d391',
                borderRadius: '3px',
                color: '#68d391',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                DEPOSIT SOL
              </button>
              <button 
                onClick={handleWithdraw}
                style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(252, 129, 129, 0.2)',
                border: '1px solid #fc8181',
                borderRadius: '3px',
                color: '#fc8181',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                WITHDRAW
              </button>
            </div>
          </div>

          {/* Loadout Panel */}
          <div style={ambrerPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#8b5cf6', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>CUSTOMIZE</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {/* Blue character circle */}
                <div style={{
                  width: '45px',
                  height: '45px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {/* Black dot eyes */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '4px',
                      backgroundColor: '#000000',
                      borderRadius: '50%',
                      transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
                      transition: 'transform 0.1s ease-out'
                    }} />
                    <div style={{
                      width: '4px',  
                      height: '4px',
                      backgroundColor: '#000000',
                      borderRadius: '50%',
                      transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
                      transition: 'transform 0.1s ease-out'
                    }} />
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={async () => {
                console.log('VIEW STORE button clicked!')
                const authenticated = await requireAuthentication('VIEW STORE')
                if (authenticated) {
                  console.log('🛒 User authenticated, opening view store...')
                  createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'shop')
                } else {
                  console.log('❌ Authentication failed, blocking access to VIEW STORE')
                }
              }}
              style={{
              width: '100%',
              padding: '8px',
              background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
              color: '#1a202c',
              fontWeight: '700',
              borderRadius: '3px',
              border: '1px solid #f6ad55',
              cursor: 'pointer',
              marginBottom: '6px',
              fontSize: '9px',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              VIEW STORE
            </button>
            
            <button 
              onClick={async () => {
                console.log('CHANGE SKIN button clicked!')
                const authenticated = await requireAuthentication('CHANGE SKIN')
                if (authenticated) {
                  console.log('🎨 User authenticated, opening change skin...')
                  createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'owned')
                } else {
                  console.log('❌ Authentication failed, blocking access to CHANGE SKIN')
                }
              }}
              style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(26, 32, 44, 0.8)',
              border: '1px solid #f6ad55',
              borderRadius: '3px',
              color: '#f6ad55',
              fontSize: '9px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              CHANGE SKIN
            </button>
          </div>

          {/* Command Panel - Enhanced Leaderboard */}
          <div style={tacticalPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#68d391', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>LEADERBOARD</h3>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{
                  padding: '2px 4px',
                  background: 'rgba(104, 211, 145, 0.2)',
                  color: '#68d391',
                  fontSize: '8px',
                  borderRadius: '2px',
                  border: '1px solid #68d391',
                  fontWeight: '600',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase'
                }}>
                  LIVE
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '12px', fontSize: '11px' }}>
              {leaderboard.slice(0, 3).map((player, index) => (
                <div key={player.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: index < 2 ? '1px solid rgba(104, 211, 145, 0.2)' : 'none' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
                    {String(index + 1).padStart(2, '0')}. {player.name}
                  </span>
                  <span style={{ color: '#f6ad55', fontWeight: '700', fontFamily: '"Rajdhani", sans-serif' }}>
                    ${player.cashout.toLocaleString()}
                  </span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#68d391', fontSize: '10px', fontFamily: '"Rajdhani", sans-serif' }}>
                  LOADING LEADERBOARD...
                </div>
              )}
            </div>
            
            <button 
              onClick={() => createDesktopLeaderboardPopup()}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(26, 32, 44, 0.8)',
                border: '1px solid #68d391',
                borderRadius: '3px',
                color: '#68d391',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
              VIEW LEADERBOARD
            </button>
          </div>

          {/* Missions Panel - Mobile Version (replacing PARTY) */}
          <div style={{
            ...tacticalPanelStyle,
            border: '2px solid rgba(252, 129, 129, 0.3)',
            position: 'relative'
          }}>
            {/* Status Indicator */}
            <div style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              width: '8px',
              height: '8px',
              background: '#fc8181',
              borderRadius: '50%',
              boxShadow: '0 0 10px #fc8181',
              animation: 'statusBlink 2s ease-in-out infinite 1s'
            }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ 
                color: '#fc8181', 
                fontWeight: '700', 
                fontSize: '12px', 
                margin: 0, 
                fontFamily: '"Rajdhani", sans-serif',
                textShadow: '0 0 10px rgba(252, 129, 129, 0.6)',
                textTransform: 'uppercase'
              }}>
                MISSIONS
              </h3>
              <div style={{ marginLeft: 'auto' }}>
                <button 
                  onClick={async () => {
                    console.log('🔄 Mobile MISSIONS REFRESH button clicked - refreshing mission data...')
                    
                    try {
                      // Refresh challenges data from localStorage
                      const userKey = isAuthenticated ? 
                        `challenges_${(user?.wallet?.address || user?.email?.address || user?.id || 'guest').substring(0, 10)}` :
                        'challenges_guest'
                      
                      const savedChallenges = localStorage.getItem(userKey)
                      if (savedChallenges) {
                        const challengesData = JSON.parse(savedChallenges)
                        console.log('✅ Mission data refreshed:', challengesData)
                      } else {
                        console.log('ℹ️ No existing mission data found')
                      }
                      
                      // Force re-render by updating a timestamp
                      const refreshKey = `missions_refresh_${Date.now()}`
                      localStorage.setItem(refreshKey, 'true')
                      setTimeout(() => localStorage.removeItem(refreshKey), 1000)
                      
                    } catch (error) {
                      console.error('❌ Error refreshing mission data:', error)
                    }
                  }}
                  style={{ 
                    fontSize: '10px', 
                    color: '#fc8181', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    textDecoration: 'none',
                    padding: '2px 4px',
                    borderRadius: '2px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.color = '#fbb6b6'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.color = '#fc8181'
                  }}
                  title="Refresh mission progress"
                >
                  🔄 REFRESH
                </button>
                
                {/* Mobile View All Missions Button */}
                <button 
                  onClick={async () => {
                    console.log('📱 Mobile ALL MISSIONS button clicked')
                    
                    // Check authentication first
                    const authenticated = await requireAuthentication('VIEW ALL MISSIONS')
                    if (!authenticated) {
                      console.log('❌ Authentication failed, blocking access to mobile missions modal')
                      return
                    }
                    
                    console.log('🎯 User authenticated, opening mobile missions modal...')
                    
                    // Create mobile-optimized missions modal
                    const modal = document.createElement('div')
                    modal.style.cssText = `
                      position: fixed;
                      top: 0;
                      left: 0;
                      width: 100vw;
                      height: 100vh;
                      background: rgba(0, 0, 0, 0.9);
                      display: flex;
                      align-items: flex-end;
                      justify-content: center;
                      z-index: 10000;
                      backdrop-filter: blur(5px);
                      animation: mobileModalFadeIn 0.3s ease-out;
                    `
                    
                    modal.innerHTML = `
                      <div id="mobile-missions-modal" style="
                        background: linear-gradient(145deg, #1a202c 0%, #2d3748 100%);
                        border: 2px solid #fc8181;
                        border-radius: 16px 16px 0 0;
                        padding: 16px;
                        width: 100%;
                        max-height: 85vh;
                        overflow: hidden;
                        box-shadow: 0 -5px 30px rgba(252, 129, 129, 0.4);
                        position: relative;
                        transform: translateY(100%);
                        animation: mobileSlideUp 0.4s ease-out forwards;
                      ">
                        <!-- Mobile Header -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(252, 129, 129, 0.3);">
                          <h2 style="color: #fc8181; font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(252, 129, 129, 0.6);">
                            🎯 ALL MISSIONS
                          </h2>
                          <button onclick="this.closest('#mobile-missions-modal').parentElement.style.animation = 'mobileModalFadeOut 0.3s ease-out forwards'; setTimeout(() => document.body.removeChild(this.closest('#mobile-missions-modal').parentElement), 300)" style="
                            background: rgba(252, 129, 129, 0.2);
                            border: 1px solid #fc8181;
                            border-radius: 6px;
                            color: #fc8181;
                            cursor: pointer;
                            padding: 6px 10px;
                            font-family: 'Rajdhani', sans-serif;
                            font-weight: 600;
                            font-size: 14px;
                            transition: all 0.2s ease;
                          " onmouseover="this.style.background='rgba(252, 129, 129, 0.3)'" onmouseout="this.style.background='rgba(252, 129, 129, 0.2)'">
                            ✕
                          </button>
                        </div>
                        
                        <!-- Mobile Tab Navigation -->
                        <div style="display: flex; gap: 4px; margin-bottom: 16px;">
                          <button id="mobile-daily-tab" onclick="mobileSwitchTab('daily')" style="
                            flex: 1;
                            padding: 8px;
                            background: linear-gradient(90deg, #f6ad55 0%, #ed8936 100%);
                            border: 2px solid #f6ad55;
                            border-radius: 6px;
                            color: #1a202c;
                            font-size: 12px;
                            font-weight: 700;
                            cursor: pointer;
                            font-family: 'Rajdhani', sans-serif;
                            text-transform: uppercase;
                            transition: all 0.2s ease;
                            box-shadow: 0 0 8px rgba(246, 173, 85, 0.4);
                          ">
                            📅 DAILY
                          </button>
                          <button id="mobile-weekly-tab" onclick="mobileSwitchTab('weekly')" style="
                            flex: 1;
                            padding: 8px;
                            background: rgba(139, 92, 246, 0.2);
                            border: 2px solid #8b5cf6;
                            border-radius: 6px;
                            color: #8b5cf6;
                            font-size: 12px;
                            font-weight: 700;
                            cursor: pointer;
                            font-family: 'Rajdhani', sans-serif;
                            text-transform: uppercase;
                            transition: all 0.2s ease;
                          ">
                            🗓️ WEEKLY
                          </button>
                          <button id="mobile-special-tab" onclick="mobileSwitchTab('special')" style="
                            flex: 1;
                            padding: 8px;
                            background: rgba(236, 72, 153, 0.2);
                            border: 2px solid #ec4899;
                            border-radius: 6px;
                            color: #ec4899;
                            font-size: 12px;
                            font-weight: 700;
                            cursor: pointer;
                            font-family: 'Rajdhani', sans-serif;
                            text-transform: uppercase;
                            transition: all 0.2s ease;
                          ">
                            ⭐ SPECIAL
                          </button>
                        </div>
                        
                        <!-- Mobile Missions Container -->
                        <div id="mobile-missions-container" style="
                          max-height: 60vh;
                          overflow-y: auto;
                          padding-right: 8px;
                        ">
                          <!-- Missions will be rendered here -->
                        </div>
                      </div>
                    `
                    
                    document.body.appendChild(modal)
                    
                    // Get user challenges data
                    const userKey = isAuthenticated ? 
                      'challenges_' + (user?.wallet?.address || user?.email?.address || user?.id || 'guest').substring(0, 10) :
                      'challenges_guest'
                    
                    let challengesData = {}
                    try {
                      const saved = localStorage.getItem(userKey)
                      challengesData = saved ? JSON.parse(saved) : {}
                    } catch (error) {
                      console.error('Error loading mobile challenges:', error)
                    }
                    
                    // Mobile-optimized challenges data
                    const mobileAllChallenges = {
                      daily: [
                        { 
                          id: 'eat_50_coins', 
                          name: 'Coin Collector', 
                          description: 'Eat 50 coins in any game mode', 
                          target: 50, 
                          reward: 100,
                          icon: '💰',
                          type: 'daily'
                        },
                        { 
                          id: 'survive_5_minutes', 
                          name: 'Survivor', 
                          description: 'Survive for 5 minutes without dying', 
                          target: 300,
                          reward: 150,
                          icon: '⏱️',
                          type: 'daily'
                        },
                        { 
                          id: 'eat_10_viruses', 
                          name: 'Virus Hunter', 
                          description: 'Consume 10 green viruses', 
                          target: 10, 
                          reward: 120,
                          icon: '🦠',
                          type: 'daily'
                        },
                        { 
                          id: 'use_split_10_times', 
                          name: 'Split Master', 
                          description: 'Use split ability 10 times', 
                          target: 10, 
                          reward: 80,
                          icon: '🔄',
                          type: 'daily'
                        }
                      ],
                      weekly: [
                        { 
                          id: 'reach_mass_200', 
                          name: 'Growing Strong', 
                          description: 'Reach a mass of 200 in any single game', 
                          target: 200, 
                          reward: 200,
                          icon: '📈',
                          type: 'weekly'
                        },
                        { 
                          id: 'cashout_5_times', 
                          name: 'Cash Master', 
                          description: 'Successfully cash out 5 times', 
                          target: 5, 
                          reward: 250,
                          icon: '💰',
                          type: 'weekly'
                        },
                        { 
                          id: 'win_3_matches', 
                          name: 'Champion', 
                          description: 'Win 3 multiplayer matches', 
                          target: 3, 
                          reward: 300,
                          icon: '🏆',
                          type: 'weekly'
                        },
                        { 
                          id: 'play_10_arena_games', 
                          name: 'Arena Warrior', 
                          description: 'Play 10 arena mode games', 
                          target: 10, 
                          reward: 180,
                          icon: '⚔️',
                          type: 'weekly'
                        }
                      ],
                      special: [
                        { 
                          id: 'first_victory', 
                          name: 'First Blood', 
                          description: 'Win your first multiplayer match', 
                          target: 1, 
                          reward: 500,
                          icon: '🥇',
                          type: 'special'
                        },
                        { 
                          id: 'mass_500', 
                          name: 'Titan', 
                          description: 'Reach a mass of 500 in any game', 
                          target: 500, 
                          reward: 1000,
                          icon: '👹',
                          type: 'special'
                        },
                        { 
                          id: 'eliminate_50_players', 
                          name: 'Executioner', 
                          description: 'Eliminate 50 other players', 
                          target: 50, 
                          reward: 750,
                          icon: '💀',
                          type: 'special'
                        }
                      ]
                    }
                    
                    // Mobile render function
                    window.mobileRenderChallenges = (category) => {
                      const container = document.getElementById('mobile-missions-container')
                      if (!container) return
                      
                      const challenges = mobileAllChallenges[category] || []
                      
                      container.innerHTML = challenges.map(challenge => {
                        const progress = challengesData[challenge.id] || { current: 0, completed: false }
                        const progressPercent = Math.min((progress.current / challenge.target) * 100, 100)
                        const isCompleted = progress.completed || progress.current >= challenge.target
                        
                        return '<div style="' +
                          'background: ' + (isCompleted ? 'rgba(104, 211, 145, 0.1)' : 'rgba(45, 55, 72, 0.5)') + ';' +
                          'border: 2px solid ' + (isCompleted ? '#68d391' : 'rgba(252, 129, 129, 0.3)') + ';' +
                          'border-radius: 8px;' +
                          'padding: 12px;' +
                          'margin-bottom: 12px;' +
                          'position: relative;' +
                        '">' +
                          '<!-- Mobile Mission Header -->' +
                          '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">' +
                            '<span style="font-size: 20px; flex-shrink: 0;">' + challenge.icon + '</span>' +
                            '<div style="flex: 1; min-width: 0;">' +
                              '<div style="' +
                                'font-size: 14px;' +
                                'font-weight: 700;' +
                                'color: ' + (isCompleted ? '#68d391' : '#e2e8f0') + ';' +
                                'font-family: \'Rajdhani\', sans-serif;' +
                                'text-transform: uppercase;' +
                                'margin-bottom: 2px;' +
                              '">' + challenge.name + '</div>' +
                              '<div style="' +
                                'font-size: 11px;' +
                                'color: #a0aec0;' +
                                'font-family: \'Rajdhani\', sans-serif;' +
                                'line-height: 1.2;' +
                              '">' + challenge.description + '</div>' +
                            '</div>' +
                            '<div style="' +
                              'padding: 3px 6px;' +
                              'background: ' + (challenge.type === 'daily' ? 'rgba(246, 173, 85, 0.2)' : 
                                               challenge.type === 'weekly' ? 'rgba(139, 92, 246, 0.2)' : 
                                               'rgba(236, 72, 153, 0.2)') + ';' +
                              'border: 1px solid ' + (challenge.type === 'daily' ? '#f6ad55' : 
                                                     challenge.type === 'weekly' ? '#8b5cf6' : 
                                                     '#ec4899') + ';' +
                              'border-radius: 4px;' +
                              'font-size: 9px;' +
                              'color: ' + (challenge.type === 'daily' ? '#f6ad55' : 
                                         challenge.type === 'weekly' ? '#8b5cf6' : 
                                         '#ec4899') + ';' +
                              'text-transform: uppercase;' +
                              'font-family: \'Rajdhani\', sans-serif;' +
                              'font-weight: 600;' +
                            '">' + challenge.type + '</div>' +
                          '</div>' +
                          
                          '<!-- Mobile Progress Bar -->' +
                          '<div style="' +
                            'background: rgba(45, 55, 72, 0.8);' +
                            'border-radius: 8px;' +
                            'height: 6px;' +
                            'overflow: hidden;' +
                            'margin-bottom: 8px;' +
                            'border: 1px solid rgba(148, 163, 184, 0.2);' +
                          '">' +
                            '<div style="' +
                              'background: ' + (isCompleted ? 
                                'linear-gradient(90deg, #68d391 0%, #48bb78 50%, #68d391 100%)' : 
                                'linear-gradient(90deg, #fc8181 0%, #f56565 50%, #fc8181 100%)') + ';' +
                              'height: 100%;' +
                              'width: ' + progressPercent + '%;' +
                              'transition: width 0.8s ease-in-out;' +
                              'border-radius: 8px;' +
                              'box-shadow: ' + (isCompleted ? 
                                '0 0 8px rgba(104, 211, 145, 0.6)' : 
                                '0 0 8px rgba(252, 129, 129, ' + Math.max(0.3, progressPercent / 100 * 0.8) + ')') + ';' +
                            '"></div>' +
                          '</div>' +
                          
                          '<!-- Mobile Progress Text & Reward -->' +
                          '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<span style="' +
                              'font-size: 11px;' +
                              'color: #a0aec0;' +
                              'font-family: \'Rajdhani\', sans-serif;' +
                              'font-weight: 600;' +
                            '">' + progress.current + '/' + challenge.target + ' (' + Math.round(progressPercent) + '%)</span>' +
                            '<span style="' +
                              'font-size: 14px;' +
                              'color: #fbbf24;' +
                              'font-family: \'Rajdhani\', sans-serif;' +
                              'font-weight: 800;' +
                              'text-shadow: 0 0 8px rgba(251, 191, 36, 0.8);' +
                            '">+' + challenge.reward + ' 💰</span>' +
                          '</div>' +
                          
                          '<!-- Mobile Completion Badge -->' +
                          (isCompleted ? 
                            '<div style="' +
                              'position: absolute;' +
                              'top: 8px;' +
                              'right: 8px;' +
                              'background: #68d391;' +
                              'color: #1a202c;' +
                              'border-radius: 50%;' +
                              'width: 20px;' +
                              'height: 20px;' +
                              'display: flex;' +
                              'align-items: center;' +
                              'justify-content: center;' +
                              'font-size: 12px;' +
                              'font-weight: bold;' +
                              'box-shadow: 0 0 8px rgba(104, 211, 145, 0.6);' +
                              'animation: completionPulse 2s ease-in-out infinite;' +
                            '">✓</div>' : '') +
                        '</div>'
                      }).join('')
                      
                      // Update tab active states
                      document.querySelectorAll('[id$="-tab"]').forEach(tab => {
                        const isActive = tab.id === 'mobile-' + category + '-tab'
                        if (isActive) {
                          tab.style.background = category === 'daily' ? 'linear-gradient(90deg, #f6ad55 0%, #ed8936 100%)' :
                                                category === 'weekly' ? 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)' :
                                                'linear-gradient(90deg, #ec4899 0%, #db2777 100%)'
                          tab.style.color = '#1a202c'
                          tab.style.boxShadow = category === 'daily' ? '0 0 8px rgba(246, 173, 85, 0.4)' :
                                               category === 'weekly' ? '0 0 8px rgba(139, 92, 246, 0.4)' :
                                               '0 0 8px rgba(236, 72, 153, 0.4)'
                        } else {
                          tab.style.background = category === 'daily' ? 'rgba(246, 173, 85, 0.2)' :
                                                category === 'weekly' ? 'rgba(139, 92, 246, 0.2)' :
                                                'rgba(236, 72, 153, 0.2)'
                          tab.style.color = category === 'daily' ? '#f6ad55' :
                                           category === 'weekly' ? '#8b5cf6' :
                                           '#ec4899'
                          tab.style.boxShadow = 'none'
                        }
                      })
                    }
                    
                    // Mobile tab switching function
                    window.mobileSwitchTab = (category) => {
                      mobileRenderChallenges(category)
                    }
                    
                    // Add mobile animations
                    const mobileStyle = document.createElement('style')
                    mobileStyle.textContent = 
                      '@keyframes mobileModalFadeIn {' +
                        'from { opacity: 0; }' +
                        'to { opacity: 1; }' +
                      '}' +
                      '@keyframes mobileModalFadeOut {' +
                        'from { opacity: 1; }' +
                        'to { opacity: 0; }' +
                      '}' +
                      '@keyframes mobileSlideUp {' +
                        'from { transform: translateY(100%); }' +
                        'to { transform: translateY(0); }' +
                      '}' +
                      '@keyframes completionPulse {' +
                        '0%, 100% { transform: scale(1); }' +
                        '50% { transform: scale(1.1); }' +
                      '}'
                    document.head.appendChild(mobileStyle)
                    
                    // Initial render - daily tab
                    mobileRenderChallenges('daily')
                    
                    console.log('✅ Mobile missions modal created successfully')
                  }}
                  style={{ 
                    fontSize: '9px', 
                    color: '#fc8181', 
                    background: 'rgba(252, 129, 129, 0.1)', 
                    border: '1px solid rgba(252, 129, 129, 0.3)', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    marginLeft: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                    e.target.style.borderColor = '#fc8181'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.1)'
                    e.target.style.borderColor = 'rgba(252, 129, 129, 0.3)'
                  }}
                >
                  ALL
                </button>
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(26, 32, 44, 0.8)', 
              borderRadius: '8px', 
              padding: '10px', 
              border: '2px solid rgba(252, 129, 129, 0.3)',
              marginBottom: '8px',
              position: 'relative',
              minHeight: '100px'
            }}>
              {/* Mobile Mission Cycle */}
              {(() => {
                // Get user-specific challenges data
                const userKey = isAuthenticated ? 
                  `challenges_${(user?.wallet?.address || user?.email?.address || user?.id || 'guest').substring(0, 10)}` :
                  'challenges_guest'
                
                let challengesData = {}
                try {
                  const saved = localStorage.getItem(userKey)
                  challengesData = saved ? JSON.parse(saved) : {}
                } catch (error) {
                  console.error('Error loading challenges:', error)
                }
                
                // Mobile-optimized challenges
                const mobileDefaultChallenges = [
                  { 
                    id: 'eat_50_coins', 
                    name: 'Coin Collector', 
                    description: 'Eat 50 coins', 
                    target: 50, 
                    reward: 100,
                    icon: '💰',
                    type: 'daily'
                  },
                  { 
                    id: 'survive_5_minutes', 
                    name: 'Survivor', 
                    description: 'Survive 5 mins', 
                    target: 300,
                    reward: 150,
                    icon: '⏱️',
                    type: 'daily'
                  },
                  { 
                    id: 'reach_mass_200', 
                    name: 'Growing Strong', 
                    description: 'Reach mass 200', 
                    target: 200, 
                    reward: 200,
                    icon: '📈',
                    type: 'weekly'
                  },
                  { 
                    id: 'cashout_5_times', 
                    name: 'Cash Master', 
                    description: 'Cash out 5 times', 
                    target: 5, 
                    reward: 250,
                    icon: '💰',
                    type: 'weekly'
                  }
                ]
                
                const currentChallenge = mobileDefaultChallenges[currentChallengeIndex] || mobileDefaultChallenges[0]
                const progress = challengesData[currentChallenge.id] || { current: 0, completed: false }
                const progressPercent = Math.min((progress.current / currentChallenge.target) * 100, 100)
                const isCompleted = progress.completed || progress.current >= currentChallenge.target
                
                return (
                  <div style={{ position: 'relative' }}>
                    {/* Mobile Mission Card */}
                    <div style={{
                      padding: '8px',
                      background: isCompleted ? 'rgba(104, 211, 145, 0.1)' : 'rgba(45, 55, 72, 0.5)',
                      borderRadius: '6px',
                      border: `2px solid ${isCompleted ? '#68d391' : 'rgba(252, 129, 129, 0.3)'}`,
                      position: 'relative',
                      textAlign: 'center'
                    }}>
                      {/* Mission Header - Mobile Optimized */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '6px',
                        marginBottom: '6px',
                        width: '100%'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flex: '1',
                          minWidth: 0
                        }}>
                          <span style={{ 
                            fontSize: '16px',
                            flexShrink: 0
                          }}>
                            {currentChallenge.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: isCompleted ? '#68d391' : '#e2e8f0',
                              fontFamily: '"Rajdhani", sans-serif',
                              textTransform: 'uppercase',
                              marginBottom: '1px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {currentChallenge.name}
                            </div>
                            <div style={{
                              fontSize: '9px',
                              color: '#a0aec0',
                              fontFamily: '"Rajdhani", sans-serif',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {currentChallenge.description}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          padding: '2px 4px',
                          background: currentChallenge.type === 'daily' ? 'rgba(246, 173, 85, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                          border: `1px solid ${currentChallenge.type === 'daily' ? '#f6ad55' : '#8b5cf6'}`,
                          borderRadius: '2px',
                          fontSize: '8px',
                          color: currentChallenge.type === 'daily' ? '#f6ad55' : '#8b5cf6',
                          textTransform: 'uppercase',
                          fontFamily: '"Rajdhani", sans-serif',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {currentChallenge.type}
                        </div>
                      </div>
                      
                      {/* Mobile Progress Bar */}
                      <div style={{
                        background: 'rgba(45, 55, 72, 0.8)',
                        borderRadius: '8px',
                        height: '4px',
                        overflow: 'hidden',
                        marginBottom: '6px',
                        position: 'relative',
                        border: '1px solid rgba(148, 163, 184, 0.2)'
                      }}>
                        <div style={{
                          background: isCompleted ? 
                            'linear-gradient(90deg, #68d391 0%, #48bb78 50%, #68d391 100%)' : 
                            'linear-gradient(90deg, #fc8181 0%, #f56565 50%, #fc8181 100%)',
                          height: '100%',
                          width: `${progressPercent}%`,
                          transition: 'width 0.8s ease-in-out',
                          borderRadius: '8px',
                          boxShadow: isCompleted ? 
                            '0 0 6px rgba(104, 211, 145, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : 
                            `0 0 6px rgba(252, 129, 129, ${Math.max(0.3, progressPercent / 100 * 0.8)}), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                          position: 'relative'
                        }}>
                          {!isCompleted && progressPercent > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              right: '-3px',
                              width: '6px',
                              height: '100%',
                              background: 'linear-gradient(90deg, transparent, rgba(252, 129, 129, 0.8), transparent)',
                              borderRadius: '8px',
                              animation: 'progressGlow 2s ease-in-out infinite'
                            }} />
                          )}
                        </div>
                      </div>
                      
                      {/* Mobile Progress Text & Reward */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '6px'
                      }}>
                        <span style={{
                          fontSize: '10px',
                          color: '#a0aec0',
                          fontFamily: '"Rajdhani", sans-serif',
                          fontWeight: '600'
                        }}>
                          {isCompleted ? 'COMPLETED' : `${Math.round(progressPercent)}%`}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#fbbf24',
                          fontFamily: '"Rajdhani", sans-serif',
                          fontWeight: '800',
                          textShadow: '0 0 8px rgba(251, 191, 36, 0.8)',
                          animation: isCompleted ? 'goldPulse 2s ease-in-out infinite' : 'none'
                        }}>
                          {isCompleted ? '✅ READY' : `+${currentChallenge.reward}`}
                        </span>
                      </div>
                      
                      {/* Completion Overlay */}
                      {isCompleted && (
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: '#68d391',
                          color: '#1a202c',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          boxShadow: '0 0 6px rgba(104, 211, 145, 0.6)'
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    
                    {/* Mobile Navigation with Arrows and Dots */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '6px'
                    }}>
                      {/* Left Arrow - Mobile */}
                      <button
                        onClick={() => {
                          const newIndex = currentChallengeIndex === 0 ? mobileDefaultChallenges.length - 1 : currentChallengeIndex - 1
                          setCurrentChallengeIndex(newIndex)
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          border: 'none',
                          background: 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 0 6px rgba(252, 129, 129, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#ffffff',
                          fontWeight: 'bold'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'linear-gradient(90deg, #f56565 0%, #e53e3e 100%)'
                          e.target.style.transform = 'scale(1.1)'
                          e.target.style.boxShadow = '0 0 8px rgba(252, 129, 129, 0.8)'
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)'
                          e.target.style.transform = 'scale(1)'
                          e.target.style.boxShadow = '0 0 6px rgba(252, 129, 129, 0.4)'
                        }}
                      >
                        ‹
                      </button>

                      {mobileDefaultChallenges.map((_, index) => {
                        const challengeProgress = challengesData[mobileDefaultChallenges[index].id] || { current: 0, completed: false }
                        const challengeCompleted = challengeProgress.completed || challengeProgress.current >= mobileDefaultChallenges[index].target
                        const isActive = index === currentChallengeIndex
                        
                        return (
                          <button
                            key={index}
                            onClick={() => setCurrentChallengeIndex(index)}
                            style={{
                              width: isActive ? '18px' : '6px',
                              height: '6px',
                              borderRadius: '3px',
                              border: 'none',
                              background: challengeCompleted ? 
                                'linear-gradient(90deg, #68d391 0%, #48bb78 100%)' : 
                                (isActive ? 
                                  'linear-gradient(90deg, #fc8181 0%, #f56565 100%)' : 
                                  'rgba(148, 163, 184, 0.4)'),
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: isActive ? 
                                (challengeCompleted ? 
                                  '0 0 6px rgba(104, 211, 145, 0.6)' : 
                                  '0 0 6px rgba(252, 129, 129, 0.6)') : 
                                'none',
                              transform: isActive ? 'scale(1.1)' : 'scale(1)'
                            }}
                            onMouseOver={(e) => {
                              if (!isActive) {
                                e.target.style.background = challengeCompleted ? 
                                  'linear-gradient(90deg, #68d391 0%, #48bb78 100%)' : 
                                  'rgba(252, 129, 129, 0.6)'
                                e.target.style.transform = 'scale(1.05)'
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isActive) {
                                e.target.style.background = challengeCompleted ? 
                                  'linear-gradient(90deg, #68d391 0%, #48bb78 100%)' : 
                                  'rgba(148, 163, 184, 0.4)'
                                e.target.style.transform = 'scale(1)'
                              }
                            }}
                          />
                        )
                      })}

                      {/* Right Arrow - Mobile */}
                      <button
                        onClick={() => {
                          const newIndex = currentChallengeIndex === mobileDefaultChallenges.length - 1 ? 0 : currentChallengeIndex + 1
                          setCurrentChallengeIndex(newIndex)
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          border: 'none',
                          background: 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 0 6px rgba(252, 129, 129, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#ffffff',
                          fontWeight: 'bold'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'linear-gradient(90deg, #f56565 0%, #e53e3e 100%)'
                          e.target.style.transform = 'scale(1.1)'
                          e.target.style.boxShadow = '0 0 8px rgba(252, 129, 129, 0.8)'
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)'
                          e.target.style.transform = 'scale(1)'
                          e.target.style.boxShadow = '0 0 6px rgba(252, 129, 129, 0.4)'
                        }}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Mobile Communications Button */}
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => window.open('https://discord.gg/WbGTJPPTPs', '_blank')}
            style={{
            padding: '12px 20px',
            background: 'linear-gradient(45deg, #5865f2 0%, #4338ca 100%)',
            color: '#ffffff',
            fontWeight: '700',
            borderRadius: '4px',
            border: '2px solid #5865f2',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(88, 101, 242, 0.5)',
            fontSize: '12px',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 30px rgba(88, 101, 242, 0.7)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 20px rgba(88, 101, 242, 0.5)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            DISCORD
          </button>
        </div>
      </div>

      {/* Mobile CSS Animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&display=swap');
        
        html, body {
          margin: 0;
          padding: 0;
          background: #0d1117;
          overflow-x: hidden;
        }
        
        /* Mobile scrolling support */
        @media (max-width: 768px) {
          html, body {
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            height: auto;
            min-height: 100vh;
          }
        }
        
        @keyframes radarSweep {
          0% { 
            transform: rotate(0deg);
          }
          100% { 
            transform: rotate(360deg);
          }
        }
        
        @keyframes progressGlow {
          0% { 
            opacity: 0.6;
            transform: translateX(-4px);
          }
          50% { 
            opacity: 1;
            transform: translateX(0px);
          }
          100% { 
            opacity: 0.6;
            transform: translateX(4px);
          }
        }
        
        @keyframes goldPulse {
          0% { 
            textShadow: 0 0 12px rgba(251, 191, 36, 0.8), 0 0 6px rgba(251, 191, 36, 0.6);
          }
          50% { 
            textShadow: 0 0 20px rgba(251, 191, 36, 1), 0 0 10px rgba(251, 191, 36, 0.8), 0 0 30px rgba(251, 191, 36, 0.4);
          }
          100% { 
            textShadow: 0 0 12px rgba(251, 191, 36, 0.8), 0 0 6px rgba(251, 191, 36, 0.6);
          }
        }
        
        @keyframes radarLine {
          0% { 
            transform: translate(-50%, -100%) rotate(0deg);
          }
          100% { 
            transform: translate(-50%, -100%) rotate(360deg);
          }
        }
        
        @keyframes tacticalGrid {
          0% { 
            transform: translateX(0) translateY(0);
          }
          100% { 
            transform: translateX(-40px) translateY(-40px);
          }
        }
        
        @keyframes tacticalFloat {
          0%, 100% { 
            transform: translateY(0px);
            opacity: 0.2;
          }
          50% { 
            transform: translateY(-20px);
            opacity: 0.5;
          }
        }
        
        @keyframes statusBlink {
          0%, 100% { 
            opacity: 0.4;
          }
          50% { 
            opacity: 1;
          }
        }
        
        @keyframes rotatePhone {
          0% { 
            transform: rotate(0deg);
          }
          100% { 
            transform: rotate(15deg);
          }
        }
        
        /* Smaller placeholder text for wallet address input */
        .wallet-address-input::placeholder {
          font-size: var(--placeholder-font-size, 14px) !important;
          color: rgba(156, 163, 175, 0.7) !important;
        }
      `}</style>

      {/* Mobile Server Browser Modal - Dedicated instance for mobile */}
      <ServerBrowserModal
        isOpen={isServerBrowserOpen && isMobile}
        onClose={() => {
          console.log('Closing mobile server browser modal')
          setIsServerBrowserOpen(false)
        }}
        onJoinLobby={handleJoinLobby}
      />

      {/* Mobile Orientation Modal */}
      {showOrientationModal && isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.95)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {orientationModalLoading ? (
            // Loading State
            <>
              {/* Loading Spinner */}
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(59, 130, 246, 0.3)',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                marginBottom: '30px',
                animation: 'spin 1s linear infinite'
              }} />
              
              {/* Loading Text */}
              <h2 style={{
                color: '#3b82f6',
                fontSize: '24px',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '12px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase',
                textShadow: '0 0 10px rgba(59, 130, 246, 0.6)'
              }}>
                Loading Practice
              </h2>
              
              <p style={{
                color: '#a0aec0',
                fontSize: '16px',
                textAlign: 'center',
                marginBottom: '30px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Initializing Local World...
              </p>
              
              {/* Loading Dots */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'loadingDot 1.4s ease-in-out infinite'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'rgba(59, 130, 246, 0.6)',
                  borderRadius: '50%',
                  animation: 'loadingDot 1.4s ease-in-out infinite 0.16s'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'rgba(59, 130, 246, 0.3)',
                  borderRadius: '50%',
                  animation: 'loadingDot 1.4s ease-in-out infinite 0.32s'
                }} />
              </div>
            </>
          ) : (
            // Orientation Request State
            <>
              {/* Rotate Phone Icon */}
              <div style={{
                fontSize: '80px',
                marginBottom: '30px',
                animation: 'rotatePhone 2s ease-in-out infinite alternate'
              }}>
                📱➡️📲
              </div>
              
              {/* Instructions */}
              <h2 style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '20px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                Rotate Your Device
              </h2>
              
              <p style={{
                color: '#e2e8f0',
                fontSize: '16px',
                textAlign: 'center',
                lineHeight: '1.5',
                marginBottom: '30px',
                fontFamily: '"Rajdhani", sans-serif',
                maxWidth: '300px'
              }}>
                For the best gaming experience, please rotate your device to landscape mode.
              </p>
              
              {/* Visual Indicator */}
              <div style={{
                width: '120px',
                height: '60px',
                border: '3px solid #68d391',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                background: 'rgba(104, 211, 145, 0.1)'
              }}>
                <span style={{
                  color: '#68d391',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  LANDSCAPE
                </span>
              </div>
              
              
              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowOrientationModal(false)
                  setPendingGameUrl(null)
                  setOrientationModalLoading(false)
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '6px',
                  color: '#fc8181',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.transform = 'scale(1.05)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {isProfileModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProfileModalOpen(false)
            }
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
              border: '3px solid #68d391',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
              fontFamily: '"Rajdhani", sans-serif'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
              background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
              borderRadius: '13px 13px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#1a202c',
                  fontWeight: '700',
                  boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                }}>
                  👤
                </div>
                <div>
                  <h2 style={{
                    margin: 0,
                    color: '#68d391',
                    fontSize: '24px',
                    fontWeight: '700',
                    textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    USER PROFILE
                  </h2>
                  <p style={{
                    margin: '4px 0 0 0',
                    color: '#a0aec0',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    TACTICAL OPERATIVE
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                style={{
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '8px',
                  color: '#fc8181',
                  fontSize: '20px',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.transform = 'scale(1.1)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              
              {/* Identity Section */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(104, 211, 145, 0.2)',
                borderRadius: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  marginBottom: '20px'
                }}>
                  {/* Avatar/Skin Preview */}
                  <div style={{
                    width: '120px',
                    height: '120px',
                    background: selectedSkin.color,
                    borderRadius: '50%',
                    border: '4px solid #68d391',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {/* Eyes like in-game */}
                    <div style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      background: '#1a202c',
                      borderRadius: '50%',
                      top: '35px',
                      left: '35px'
                    }} />
                    <div style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      background: '#1a202c',
                      borderRadius: '50%',
                      top: '35px',
                      right: '35px'
                    }} />
                  </div>
                  
                  {/* Status & Info */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: '0 0 8px 0',
                      color: '#e2e8f0',
                      fontSize: '20px',
                      fontWeight: '700'
                    }}>
                      {isAuthenticated ? 
                        (customUsername || user?.email?.address?.split('@')[0] || user?.wallet?.address?.slice(0, 8) || 'USER').toUpperCase() : 
                        (customUsername || userName).toUpperCase()
                      }
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: '#68d391',
                        borderRadius: '50%',
                        boxShadow: '0 0 8px #68d391',
                        animation: 'pulse 2s infinite'
                      }} />
                      <span style={{
                        color: '#68d391',
                        fontSize: '14px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        ONLINE
                      </span>
                    </div>
                    <button style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '6px',
                      color: '#68d391',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      transition: 'all 0.3s ease'
                    }}>
                      ✏️ EDIT PROFILE
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats & Progression */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(246, 173, 85, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#f6ad55',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📊 STATS & PROGRESSION
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f6ad55', fontSize: '24px', fontWeight: '700' }}>127</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Games Played</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#68d391', fontSize: '24px', fontWeight: '700' }}>34</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Wins</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#9f7aea', fontSize: '24px', fontWeight: '700' }}>2,847</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Highest Size</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#fc8181', fontSize: '24px', fontWeight: '700' }}>7</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Win Streak</div>
                  </div>
                </div>
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(246, 173, 85, 0.1)',
                  border: '1px solid rgba(246, 173, 85, 0.3)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#f6ad55', fontSize: '16px', fontWeight: '600' }}>
                    💰 LIFETIME EARNINGS: $2,847.50
                  </div>
                </div>
              </div>

              {/* Wallet Snapshot */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(104, 211, 145, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#68d391',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💰 WALLET SNAPSHOT
                </h3>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    background: 'rgba(104, 211, 145, 0.1)',
                    border: '1px solid rgba(104, 211, 145, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#68d391', fontSize: '20px', fontWeight: '700' }}>
                      {currency.toLocaleString()}
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Coins</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    background: 'rgba(159, 122, 234, 0.1)',
                    border: '1px solid rgba(159, 122, 234, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#9f7aea', fontSize: '20px', fontWeight: '700' }}>0.0000</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>SOL</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{
                    flex: 1,
                    background: 'rgba(104, 211, 145, 0.2)',
                    border: '2px solid #68d391',
                    borderRadius: '6px',
                    color: '#68d391',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    💳 DEPOSIT SOL
                  </button>
                  <button style={{
                    flex: 1,
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '6px',
                    color: '#fc8181',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    💸 WITHDRAW
                  </button>
                  <button style={{
                    background: 'rgba(74, 85, 104, 0.5)',
                    border: '2px solid #4a5568',
                    borderRadius: '6px',
                    color: '#a0aec0',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    minWidth: '40px'
                  }}>
                    📋
                  </button>
                </div>
              </div>

              {/* Customization */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(159, 122, 234, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#9f7aea',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🎨 CUSTOMIZATION
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{
                    flex: 1,
                    background: 'rgba(159, 122, 234, 0.2)',
                    border: '2px solid #9f7aea',
                    borderRadius: '6px',
                    color: '#9f7aea',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    🎨 CHANGE SKIN
                  </button>
                  <button style={{
                    flex: 1,
                    background: 'rgba(246, 173, 85, 0.2)',
                    border: '2px solid #f6ad55',
                    borderRadius: '6px',
                    color: '#f6ad55',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    🛒 VIEW STORE
                  </button>
                </div>
              </div>

              {/* Social/Party */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(66, 153, 225, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#4299e1',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  👥 SOCIAL & PARTY
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    color: '#a0aec0',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    FRIENDS ONLINE (3/24)
                  </div>
                  {['TacticalAce', 'SniperPro', 'StealthOp'].map((friend, index) => (
                    <div key={friend} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(66, 153, 225, 0.1)',
                      border: '1px solid rgba(66, 153, 225, 0.2)',
                      borderRadius: '6px',
                      marginBottom: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          background: '#68d391',
                          borderRadius: '50%',
                          boxShadow: '0 0 6px #68d391'
                        }} />
                        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{friend}</span>
                      </div>
                      <button style={{
                        background: 'rgba(66, 153, 225, 0.2)',
                        border: '1px solid #4299e1',
                        borderRadius: '4px',
                        color: '#4299e1',
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}>
                        INVITE
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings Shortcuts */}
              <div style={{
                marginBottom: '24px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(74, 85, 104, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#a0aec0',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⚙️ SETTINGS
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button style={{
                    background: 'rgba(74, 85, 104, 0.5)',
                    border: '2px solid #4a5568',
                    borderRadius: '6px',
                    color: '#a0aec0',
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    👤 ACCOUNT
                  </button>
                  <button style={{
                    background: 'rgba(74, 85, 104, 0.5)',
                    border: '2px solid #4a5568',
                    borderRadius: '6px',
                    color: '#a0aec0',
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    🎮 GAME
                  </button>
                </div>
                <button 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '6px',
                    color: '#fc8181',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  🚪 LOGOUT
                </button>
              </div>

              {/* Fair Play Notice */}
              <div style={{
                padding: '16px',
                background: 'rgba(252, 129, 129, 0.1)',
                border: '1px solid rgba(252, 129, 129, 0.3)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  color: '#fc8181',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  🔒 FAIR PLAY COMMITMENT
                </div>
                <div style={{
                  color: '#a0aec0',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}>
                  Zero tolerance for cheats. Report suspicious players to maintain competitive integrity.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Loading Local Practice Modal - REMOVED: Integrated into orientation modal */}
      
      {/* Withdrawal Modal */}
      {withdrawalModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999999999,
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto'
        }}>
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.98)',
            border: '2px solid #10b981',
            borderRadius: isMobile ? '12px' : '16px',
            maxWidth: isMobile ? '340px' : '500px',
            width: '90%',
            padding: '0',
            color: 'white',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(16, 185, 129, 0.4)',
            fontFamily: '"Rajdhani", sans-serif',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              padding: isMobile ? '16px' : '20px',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>

                <h2 style={{
                  color: '#10b981',
                  fontSize: isMobile ? '18px' : '22px',
                  fontWeight: '700',
                  margin: '0',
                  fontFamily: '"Rajdhani", sans-serif',
                  textShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                }}>
                  Cash Out
                </h2>
              </div>
              <button
                onClick={() => setWithdrawalModalVisible(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body Content */}
            <div style={{ padding: isMobile ? '16px' : '20px' }}>
              {/* Available Balance Section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isMobile ? '16px' : '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ 
                    color: '#e5e7eb', 
                    fontSize: isMobile ? '14px' : '16px', 
                    fontWeight: '600'
                  }}>
                    Available Balance
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    color: parseFloat(walletBalance.usd || 0) > 0 ? '#10b981' : '#ef4444',
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: '700',
                    fontFamily: '"Rajdhani", sans-serif',
                    textShadow: parseFloat(walletBalance.usd || 0) > 0 ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(239, 68, 68, 0.4)'
                  }}>
                    ${parseFloat(walletBalance.usd || 0).toFixed(2)}
                  </div>
                  <div style={{
                    color: '#6b7280',
                    fontSize: isMobile ? '11px' : '12px',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}>
                    {parseFloat(walletBalance.sol || 0).toFixed(6)} SOL
                  </div>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {parseFloat(walletBalance.usd || 0) < 0.21 && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: isMobile ? '12px' : '16px',
                  marginBottom: isMobile ? '16px' : '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#ef4444', fontSize: '16px' }}>⚠</span>
                  <div>
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: isMobile ? '12px' : '14px', 
                      fontWeight: '600',
                      fontFamily: '"Rajdhani", sans-serif'
                    }}>
                      Insufficient balance for cashout. Minimum $0.20 + $0.01 required.
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  max={parseFloat(walletBalance.usd || 0)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: '600',
                    padding: isMobile ? '12px 16px' : '16px 20px',
                    outline: 'none',
                    textAlign: 'right',
                    boxSizing: 'border-box',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981'
                    e.target.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(16, 185, 129, 0.3)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px'
                }}>
                  <span style={{
                    color: '#9ca3af',
                    fontSize: isMobile ? '12px' : '14px'
                  }}>
                    USD
                  </span>
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button 
                      onClick={() => {
                        const maxBalance = parseFloat(walletBalance.usd || 0);
                        const halfAmount = (maxBalance / 2).toFixed(2);
                        setWithdrawalAmount(halfAmount);
                      }}
                      style={{
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: '"Rajdhani", sans-serif'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#059669'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#10b981'
                      }}
                    >
                      ½
                    </button>
                    <button 
                      onClick={() => {
                        const maxBalance = parseFloat(walletBalance.usd || 0);
                        setWithdrawalAmount(maxBalance.toFixed(2));
                      }}
                      style={{
                        backgroundColor: '#f59e0b',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: '"Rajdhani", sans-serif'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#d97706'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#f59e0b'
                      }}
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div style={{
                  color: '#6b7280',
                  fontSize: isMobile ? '12px' : '14px',
                  textAlign: 'center',
                  marginTop: '8px',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  {(() => {
                    const maxBalance = parseFloat(walletBalance.usd || 0);
                    const currentAmount = parseFloat(withdrawalAmount || 0);
                    const percentage = maxBalance > 0 ? ((currentAmount / maxBalance) * 100).toFixed(0) : 0;
                    return `${percentage}% of available balance`;
                  })()}
                </div>
              </div>

              {/* Destination Address */}
              <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
                <div style={{ 
                  color: '#e5e7eb', 
                  fontSize: isMobile ? '14px' : '16px', 
                  fontWeight: '600',
                  marginBottom: '8px',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  Destination Wallet Address
                </div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Enter Solana wallet address..."
                    value={destinationAddress || ''}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: isMobile ? '14px' : '16px',
                      padding: isMobile ? '12px 70px 12px 16px' : '16px 80px 16px 20px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                      '--placeholder-font-size': isMobile ? '12px' : '14px'
                    }}
                    className="wallet-address-input"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#10b981'
                      e.target.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.3)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(16, 185, 129, 0.3)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setDestinationAddress(text);
                          console.log('✅ Pasted wallet address from clipboard');
                        }
                      } catch (err) {
                        console.log('❌ Failed to read clipboard:', err);
                        // Fallback: show a message to the user
                        alert('Unable to paste from clipboard. Please manually enter your wallet address.');
                      }
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: isMobile ? '10px' : '12px',
                      fontWeight: '600',
                      padding: isMobile ? '6px 8px' : '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#059669'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#10b981'
                    }}
                  >
                    PASTE
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: isMobile ? '12px' : '16px',
                flexDirection: 'row'
              }}>
                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setWithdrawalModalVisible(false)
                    setWithdrawalAmount('')
                  }}
                  style={{
                    flex: '1',
                    backgroundColor: 'rgba(55, 65, 81, 0.8)',
                    border: '1px solid rgba(75, 85, 99, 0.8)',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '600',
                    padding: isMobile ? '12px' : '16px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(75, 85, 99, 0.8)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.8)'
                  }}
                >
                  Cancel
                </button>
                
                {/* Cash Out Button */}
                <button
                  onClick={() => {
                    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
                      alert('Please enter a valid amount to cash out.')
                      return
                    }
                    if (parseFloat(withdrawalAmount) > parseFloat(walletBalance.usd || 0)) {
                      alert('Amount exceeds available balance.')
                      return
                    }
                    // TODO: Implement actual cash out functionality
                    alert(`Cash out of $${withdrawalAmount} will be implemented here!`)
                  }}
                  disabled={parseFloat(walletBalance.usd || 0) < 0.21}
                  style={{
                    flex: '1',
                    backgroundColor: parseFloat(walletBalance.usd || 0) >= 0.21 ? '#10b981' : 'rgba(107, 114, 128, 0.5)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '700',
                    padding: isMobile ? '12px' : '16px',
                    cursor: parseFloat(walletBalance.usd || 0) >= 0.21 ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms',
                    fontFamily: '"Rajdhani", sans-serif',
                    opacity: parseFloat(walletBalance.usd || 0) >= 0.21 ? 1 : 0.6,
                    textShadow: parseFloat(walletBalance.usd || 0) >= 0.21 ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#059669'
                      e.target.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#10b981'
                      e.target.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  Cash Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Withdrawal Modal */}
      {desktopWithdrawalModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000000000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #10b981',
            borderRadius: '12px',
            width: '480px',
            padding: '0',
            fontFamily: '"Rajdhani", sans-serif',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <h2 style={{
                color: '#10b981',
                fontSize: '24px',
                fontWeight: '700',
                margin: '0',
                textShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
              }}>
                Cash Out
              </h2>
              <button
                onClick={() => setDesktopWithdrawalModalVisible(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = 'rgba(156, 163, 175, 0.1)'
                  e.target.style.color = '#ffffff'
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                  e.target.style.color = '#9ca3af'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Available Balance */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  color: parseFloat(walletBalance.usd || 0) > 0 ? '#10b981' : '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Available Balance
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: '700',
                  marginBottom: '4px'
                }}>
                  ${parseFloat(walletBalance.usd || 0).toFixed(2)}
                </div>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '14px'
                }}>
                  {parseFloat(walletBalance.sol || 0).toFixed(6)} SOL
                </div>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(17, 24, 39, 0.8)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '0'
                }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    style={{
                      flex: '1',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: '600',
                      padding: '16px 20px',
                      outline: 'none',
                      fontFamily: '"Rajdhani", sans-serif'
                    }}
                  />
                  <div style={{
                    color: '#9ca3af',
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '0 20px'
                  }}>
                    USD
                  </div>
                </div>
                
                {/* Quick Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '12px'
                }}>
                  <button
                    onClick={() => {
                      const halfAmount = (parseFloat(walletBalance.usd || 0) / 2).toFixed(2)
                      setWithdrawalAmount(halfAmount)
                    }}
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      color: '#10b981',
                      fontSize: '14px',
                      fontWeight: '600',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: '"Rajdhani", sans-serif',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
                    }}
                  >
                    ½
                  </button>
                  <button
                    onClick={() => {
                      setWithdrawalAmount((parseFloat(walletBalance.usd || 0)).toFixed(2))
                    }}
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      color: '#10b981',
                      fontSize: '14px',
                      fontWeight: '600',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: '"Rajdhani", sans-serif',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
                    }}
                  >
                    MAX
                  </button>
                </div>

                {/* Percentage Display */}
                <div style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginTop: '8px'
                }}>
                  {withdrawalAmount && parseFloat(walletBalance.usd || 0) > 0 
                    ? `${((parseFloat(withdrawalAmount) / parseFloat(walletBalance.usd || 0)) * 100).toFixed(0)}% of available balance`
                    : '0% of available balance'
                  }
                </div>
              </div>

              {/* Destination Address */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Destination Wallet Address
                </div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Enter Solana wallet address..."
                    value={destinationAddress || ''}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '12px 80px 12px 16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#10b981'
                      e.target.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.3)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(16, 185, 129, 0.3)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setDestinationAddress(text);
                          console.log('✅ Pasted wallet address from clipboard');
                        }
                      } catch (err) {
                        console.log('❌ Failed to read clipboard:', err);
                        alert('Unable to paste from clipboard. Please manually enter your wallet address.');
                      }
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#059669'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#10b981'
                    }}
                  >
                    PASTE
                  </button>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {parseFloat(walletBalance.usd || 0) < 0.21 && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Insufficient balance for withdrawal. Minimum $0.21 required.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                <button
                  onClick={() => setDesktopWithdrawalModalVisible(false)}
                  style={{
                    flex: '1',
                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                    border: '1px solid rgba(107, 114, 128, 0.3)',
                    borderRadius: '8px',
                    color: '#9ca3af',
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '16px',
                    cursor: 'pointer',
                    fontFamily: '"Rajdhani", sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.3)'
                    e.target.style.color = '#ffffff'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.2)'
                    e.target.style.color = '#9ca3af'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
                      alert('Please enter a valid amount to cash out.')
                      return
                    }
                    if (parseFloat(withdrawalAmount) > parseFloat(walletBalance.usd || 0)) {
                      alert('Amount exceeds available balance.')
                      return
                    }
                    if (!destinationAddress || destinationAddress.trim() === '') {
                      alert('Please enter a destination wallet address.')
                      return
                    }
                    // TODO: Implement actual cash out functionality
                    alert(`Cash out of $${withdrawalAmount} to ${destinationAddress} will be implemented here!`)
                    setDesktopWithdrawalModalVisible(false)
                  }}
                  disabled={parseFloat(walletBalance.usd || 0) < 0.21}
                  style={{
                    flex: '1',
                    backgroundColor: parseFloat(walletBalance.usd || 0) >= 0.21 ? '#10b981' : 'rgba(107, 114, 128, 0.3)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '700',
                    padding: '16px',
                    cursor: parseFloat(walletBalance.usd || 0) >= 0.21 ? 'pointer' : 'not-allowed',
                    fontFamily: '"Rajdhani", sans-serif',
                    opacity: parseFloat(walletBalance.usd || 0) >= 0.21 ? '1' : '0.6',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#059669'
                      e.target.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#10b981'
                      e.target.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  Cash Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tier Upgrade Notifications - Simplified for demo */}
      {tierUpgradeNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#FFD700',
          color: '#1a202c',
          padding: '16px',
          borderRadius: '8px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          🎉 Tier Upgrade! {tierUpgradeNotification.newTier}
        </div>
      )}
      
      {/* Debug message removed */}
      
      {/* Debug: Local Practice Loading State - REMOVED FOR MOBILE */}

      {/* Local Practice Loading Popup - Desktop Only - SIMPLIFIED */}
      {localPracticeLoading && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999, // Even higher z-index
            fontFamily: '"Rajdhani", sans-serif'
          }}
        >
          <div style={{
            backgroundColor: '#111827',
            border: '2px solid #10b981',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{
              color: '#10b981',
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: '16px'
            }}>
              🤖 LOCAL PRACTICE
            </div>
            <div style={{
              color: '#e2e8f0',
              fontSize: '16px',
              marginBottom: '20px'
            }}>
              Loading offline bot training...
            </div>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(16, 185, 129, 0.2)',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              margin: '0 auto',
              animationName: 'spin',
              animationDuration: '1s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite'
            }}></div>
            
            {/* Add CSS animation */}
            <style dangerouslySetInnerHTML={{
              __html: `
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
