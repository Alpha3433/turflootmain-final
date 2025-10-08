'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { Component, useState, useEffect, useMemo } from 'react'

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
      const { appearance, embeddedWallets, externalWallets = {}, solana } = config || {}

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
        solanaChains: Object.keys(solana?.rpcs || {})
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

  const solanaChain = useMemo(() => {
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta').toLowerCase()
    if (network.startsWith('solana:')) return network
    if (network === 'mainnet' || network === 'mainnet-beta') return 'solana:mainnet'
    if (network === 'devnet') return 'solana:devnet'
    if (network === 'testnet') return 'solana:testnet'
    return 'solana:mainnet'
  }, [])

  const solanaRpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    process.env.NEXT_PUBLIC_HELIUS_RPC ||
    'https://api.mainnet-beta.solana.com'

  const solanaWsUrl =
    process.env.NEXT_PUBLIC_SOLANA_WS ||
    process.env.NEXT_PUBLIC_HELIUS_WS ||
    solanaRpcUrl.replace(/^http/, 'ws')

  // Validate required environment variables
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is required')
    return <div>Error: Privy App ID not configured</div>
  }

  console.log('🔧 Initializing Privy with App ID:', appId.substring(0, 10) + '...')

  // 🚀 Privy 3.0 Configuration - SOLANA ONLY
  const debugInfo = useMemo(
    () => ({ solanaChain, solanaRpcUrl, solanaWsUrl }),
    [solanaChain, solanaRpcUrl, solanaWsUrl]
  )

  const emptySolanaConnectors = useMemo(
    () => ({
      onMount: () => {},
      onUnmount: () => {},
      get: () => []
    }),
    []
  )

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

    // 🎯 PRIVY 3.0: Embedded Wallets configuration scoped per chain
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      requireUserPasswordOnCreate: false,
      priceDisplay: {
        primary: 'native-token'
      }
    },

    // 🎯 PRIVY 3.0: Solana RPC configuration
    solana: {
      rpcs: {
        [solanaChain]: solanaRpcUrl
      }
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