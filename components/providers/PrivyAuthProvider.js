'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { useSolanaFundingPlugin, toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { Component, useState, useEffect } from 'react'

// Error boundary for Privy-related errors
class PrivyErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Privy Error Boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Wallet Service Error</h2>
          <p>Please refresh the page to reconnect your wallet.</p>
          <button onClick={() => typeof window !== 'undefined' && window.location.reload()}>Refresh Page</button>
        </div>
      )
    }

    return this.props.children
  }
}

// Client-side wrapper for Privy to prevent SSR issues
function ClientOnlyPrivyProvider({ children, appId, config, debugInfo }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    console.log('🔧 Privy Solana-Only Configuration Loading...')
    console.log('📋 App ID:', appId ? `${appId.substring(0, 10)}...` : 'MISSING')
    console.log('📋 Solana RPC:', debugInfo.solanaRpcUrl)
    console.log('📋 Solana WS:', debugInfo.solanaWsUrl)

    try {
      const { appearance, embeddedWallets, externalWallets = {}, solana, funding } = config || {}

      const safeExternalWallets = Object.fromEntries(
        Object.entries(externalWallets).map(([chain, walletConfig = {}]) => {
          const connectors = walletConfig.connectors

          if (Array.isArray(connectors)) {
            return [
              chain,
              connectors.map((connector) => connector?.name || connector?.id || 'custom-connector')
            ]
          }

          if (connectors && typeof connectors === 'object') {
            return [chain, Object.keys(connectors)]
          }

          return [chain, []]
        })
      )

      console.log('📋 Config:', JSON.stringify({
        appearance,
        embeddedWallets,
        externalWallets: safeExternalWallets,
        solanaChains: Object.keys(solana?.rpcs || {}),
        solanaFunding: funding?.solana
      }, null, 2))
    } catch (error) {
      console.warn('⚠️ Unable to serialize Privy config for logging:', error)
    }
  }, [config, appId, debugInfo])

  // Simple hydration check - no delays
  if (!isClient) {
    return <div className="min-h-screen bg-[#1E1E1E]" /> // Empty container to prevent hydration mismatch
  }

  console.log('🚀 Initializing Privy with Solana-Only Configuration')
  return (
    <PrivyProvider appId={appId} config={config}>
      {children}
    </PrivyProvider>
  )
}

export default function PrivyAuthProvider({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  useSolanaFundingPlugin()

  // Compute solanaChain directly without useMemo to avoid SSR issues
  const getSolanaChain = () => {
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta').toLowerCase()
    if (network.startsWith('solana:')) return network
    if (network === 'mainnet' || network === 'mainnet-beta') return 'solana:mainnet'
    if (network === 'devnet') return 'solana:devnet'
    if (network === 'testnet') return 'solana:testnet'
    return 'solana:mainnet'
  }
  const solanaChain = getSolanaChain()

  const solanaRpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    process.env.NEXT_PUBLIC_HELIUS_RPC ||
    'https://api.mainnet-beta.solana.com'

  const solanaWsUrl =
    process.env.NEXT_PUBLIC_SOLANA_WS ||
    process.env.NEXT_PUBLIC_HELIUS_WS ||
    solanaRpcUrl.replace(/^http/, 'ws')

  // Removed useMemo to avoid SSR issues
  const solanaFundingConfig = {
    chain: solanaChain,
    asset: 'native-currency',
    defaultFundingMethod: 'exchange',
    uiConfig: {
      receiveFundsTitle: 'Receive SOL',
      receiveFundsSubtitle: 'Top up your TurfLoot balance with Solana',
      landing: {
        title: 'Choose how you would like to fund your wallet'
      }
    }
  }

  // Validate required environment variables
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is required')
    return <div>Error: Privy App ID not configured</div>
  }

  console.log('🔧 Initializing Privy with App ID:', appId.substring(0, 10) + '...')

  // 🚀 Privy 3.0 Configuration - SOLANA ONLY
  // Removed useMemo to avoid SSR issues
  const debugInfo = { solanaChain, solanaRpcUrl, solanaWsUrl }

  // Removed useMemo to avoid SSR issues
  const emptySolanaConnectors = {
    onMount: () => {},
    onUnmount: () => {},
    get: () => []
  }

  const config = {
    // UI Appearance
    appearance: {
      theme: 'dark',
      accentColor: '#14F195', // TurfLoot green
      logo: undefined,
      showWalletLoginFirst: false,
      walletChainType: 'solana-only'
    },

    // Authentication methods
    loginMethods: ['google', 'email', 'wallet'],

    // 🎯 PRIVY 3.0: Embedded Wallets configuration - ENABLED
    // Users get embedded wallets and use real SOL balance
    embeddedWallets: {
      createOnLogin: 'users-without-wallets', // Create embedded wallet for users
      requireUserPasswordOnCreate: false,
      priceDisplay: {
        primary: 'native-token'
      },
      // Require the embedded wallet confirmation modal to resolve signature issues
      noPromptOnSignature: false
    },

    // 🎯 PRIVY 3.0: Solana RPC configuration
    solana: {
      defaultChain: solanaChain,
      chains: [solanaChain],
      rpcs: {
        [solanaChain]: solanaRpcUrl
      }
    },

    // 🎯 PRIVY 3.0: External Wallet Connectors - SOLANA SUPPORT
    externalWallets: {
      solana: {
        connectors: toSolanaWalletConnectors()
      }
    },

    funding: {
      solana: solanaFundingConfig
    },

    // Security & MFA
    mfa: {
      noPromptOnMfaRequired: false,
    }
  }

  return (
    <PrivyErrorBoundary>
      <ClientOnlyPrivyProvider appId={appId} config={config} debugInfo={debugInfo}>
        {children}
      </ClientOnlyPrivyProvider>
    </PrivyErrorBoundary>
  )
}