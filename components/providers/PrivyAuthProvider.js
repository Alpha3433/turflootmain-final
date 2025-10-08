'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
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
    console.log('📋 Config:', JSON.stringify({
      appearance: config.appearance,
      embeddedWallets: config.embeddedWallets,
      externalWallets: config.externalWallets,
      solanaChains: Object.keys(config.solana?.rpcs || {})
    }, null, 2))
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
      ethereum: {
        createOnLogin: 'off'
      },
      solana: {
        createOnLogin: 'users-without-wallets'
      },
      showWalletUIs: true
    },

    // 🎯 PRIVY 3.0: External Wallets - leverage Wallet Standard connectors
    externalWallets: {
      solana: {
        connectors: toSolanaWalletConnectors({ shouldAutoConnect: false })
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