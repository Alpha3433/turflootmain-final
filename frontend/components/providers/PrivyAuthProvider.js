'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { useSolanaFundingPlugin } from '@privy-io/react-auth/solana'
import { Component, useState, useEffect, useMemo } from 'react'

const DEFAULT_SOLANA_NETWORK = 'mainnet-beta'
let hasWarnedAboutUnsupportedSolanaNetwork = false
let hasWarnedAboutDevnetRpcEndpoint = false

const resolveSolanaNetwork = (network) => {
  const candidate = typeof network === 'string' ? network.trim().toLowerCase() : ''

  if (!candidate) {
    return DEFAULT_SOLANA_NETWORK
  }

  if (candidate.startsWith('solana:')) {
    return resolveSolanaNetwork(candidate.split(':').slice(1).join(':'))
  }

  if (candidate === 'mainnet' || candidate === 'mainnet-beta') {
    return DEFAULT_SOLANA_NETWORK
  }

  if (!hasWarnedAboutUnsupportedSolanaNetwork) {
    console.warn(
      `⚠️ Unsupported Solana network "${candidate}" configured. Paid rooms require mainnet; defaulting to ${DEFAULT_SOLANA_NETWORK}.`
    )
    hasWarnedAboutUnsupportedSolanaNetwork = true
  }

  return DEFAULT_SOLANA_NETWORK
}

const sanitiseSolanaRpcEndpoint = (endpoint) => {
  if (typeof endpoint !== 'string') {
    return undefined
  }

  const trimmed = endpoint.trim()
  if (!trimmed) {
    return undefined
  }

  if (/devnet/i.test(trimmed)) {
    if (!hasWarnedAboutDevnetRpcEndpoint) {
      console.warn(
        '⚠️ Devnet RPC endpoint detected in configuration. Paid rooms require mainnet; ignoring devnet endpoint.'
      )
      hasWarnedAboutDevnetRpcEndpoint = true
    }
    return undefined
  }

  return trimmed
}

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

  useEffect(() => {
    if (!isClient) return

    const closePrivyModal = () => {
      if (typeof window !== 'undefined') {
        const privy = window.privy
        if (privy) {
          if (typeof privy.close === 'function') {
            privy.close()
            return
          }
          if (typeof privy.closePrivyModal === 'function') {
            privy.closePrivyModal()
            return
          }
        }
      }

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
      })
      document.dispatchEvent(escapeEvent)
    }

    const handleOutsideInteraction = (event) => {
      const modalContent =
        document.getElementById('privy-modal-content') ||
        document.querySelector('[data-privy-component="dialog"], [data-privy-component="content"]')

      if (!modalContent) {
        return
      }

      const target = event.target
      if (!(target instanceof EventTarget)) {
        return
      }

      if (
        (target instanceof Node && modalContent.contains(target)) ||
        (typeof event.composedPath === 'function' && event.composedPath().includes(modalContent))
      ) {
        return
      }

      const backdrop = document.getElementById('privy-dialog-backdrop')
      if (backdrop && target instanceof Node && !backdrop.contains(target)) {
        return
      }

      closePrivyModal()
    }

    document.addEventListener('mousedown', handleOutsideInteraction)
    document.addEventListener('touchstart', handleOutsideInteraction)

    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction)
      document.removeEventListener('touchstart', handleOutsideInteraction)
    }
  }, [isClient])

  // Simple hydration check - no delays
  if (!isClient) {
    return null // Don't render anything on server
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

  const solanaChain = useMemo(() => {
    const network = resolveSolanaNetwork(process.env.NEXT_PUBLIC_SOLANA_NETWORK)

    if (network === 'mainnet-beta') {
      return 'solana:mainnet'
    }

    return `solana:${network}`
  }, [])

  const solanaRpcUrl =
    sanitiseSolanaRpcEndpoint(process.env.NEXT_PUBLIC_SOLANA_RPC) ||
    sanitiseSolanaRpcEndpoint(process.env.NEXT_PUBLIC_HELIUS_RPC) ||
    'https://api.mainnet-beta.solana.com'

  const solanaWsUrl =
    process.env.NEXT_PUBLIC_SOLANA_WS ||
    process.env.NEXT_PUBLIC_HELIUS_WS ||
    solanaRpcUrl.replace(/^http/, 'ws')

  const solanaFundingConfig = useMemo(
    () => ({
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
    }),
    [solanaChain]
  )

  // Validate required environment variables
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is required')
    return <div>Error: Privy App ID not configured</div>
  }

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

    // Embedded wallet configuration
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      requireUserPasswordOnCreate: false,
      priceDisplay: {
        primary: 'native-token',
        secondary: 'fiat-currency'
      }
    },

    // Solana RPC configuration
    solana: {
      rpcs: {
        [solanaChain]: solanaRpcUrl
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
