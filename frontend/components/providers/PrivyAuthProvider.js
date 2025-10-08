'use client'

import { PrivyProvider } from '@privy-io/react-auth'
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
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      )
    }

    return this.props.children
  }
}

// Client-side wrapper for Privy to prevent SSR issues
function ClientOnlyPrivyProvider({ children, appId, config }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    console.log('🔧 Privy Solana-Only Configuration Loading...')
    console.log('📋 App ID:', appId ? `${appId.substring(0, 10)}...` : 'MISSING')
    console.log('📋 Solana RPC:', process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com')
    console.log('📋 Config:', JSON.stringify({
      embeddedWallets: config.embeddedWallets,
      externalWallets: config.externalWallets,
      solanaClusters: config.solanaClusters
    }, null, 2))
  }, [config, appId])

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
  
  // Validate required environment variables
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is required')
    return <div>Error: Privy App ID not configured</div>
  }

  // SOLANA-ONLY Privy Configuration - UPDATED for v2.24.0 fundWallet compatibility
  const config = {
    // UI Appearance
    appearance: {
      theme: 'dark',
      accentColor: '#14F195', // TurfLoot green
      logo: undefined,
      showWalletLoginFirst: false,
    },
    
    // Authentication methods
    loginMethods: ['google', 'email', 'wallet'],
    
    // 🎯 CRITICAL: Embedded Wallets - SOLANA ONLY
    embeddedWallets: {
      // ❌ EXPLICITLY DISABLE all Ethereum/EVM embedded wallets
      ethereum: {
        createOnLogin: 'off'
      },
      // ✅ ENABLE ONLY Solana embedded wallets for new users
      solana: {
        createOnLogin: 'users-without-wallets'
      }
    },
    
    // ❌ Disable all external wallet connectors – embedded only
    externalWallets: {
      solana: {
        wallets: []
      }
    },
    
    // 🎯 CRITICAL: supportedChains for v2.24.0 fundWallet compatibility
    supportedChains: [
      {
        id: 101, // Solana Mainnet chain ID
        name: 'Solana',
        network: 'mainnet-beta',
        nativeCurrency: {
          name: 'Solana',
          symbol: 'SOL',
          decimals: 9,
        },
        rpcUrls: {
          default: {
            http: [process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com']
          }
        }
      }
    ],
    
    // 🎯 CRITICAL: Solana Network Configuration (keeping for backward compatibility)
    solanaClusters: [
      {
        name: 'mainnet-beta',
        rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
      }
    ],
    
    // Security & MFA
    mfa: {
      noPromptOnMfaRequired: false,
    },
    
    // 🎯 CRITICAL: Explicitly disable Smart Wallets (they're EVM-based)
    smartWallets: {
      enabled: false
    },
    
    // 🎯 CRITICAL: Default chain should be Solana
    defaultChain: {
      id: 101,
      name: 'Solana'
    }
  }

  return (
    <PrivyErrorBoundary>
      <ClientOnlyPrivyProvider appId={appId} config={config}>
        {children}
      </ClientOnlyPrivyProvider>
    </PrivyErrorBoundary>
  )
}