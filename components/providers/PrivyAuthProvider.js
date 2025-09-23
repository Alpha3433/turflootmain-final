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
  
  // Validate required environment variables
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is required')
    return <div>Error: Privy App ID not configured</div>
  }

  console.log('🔧 Initializing Privy with App ID:', appId.substring(0, 10) + '...')

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
    
    // 🎯 CRITICAL: External Wallets - SOLANA ONLY  
    externalWallets: {
      // ✅ ONLY Solana external wallet connectors
      solana: {
        wallets: ['phantom', 'solflare']
      }
      // ❌ NO ethereum section = no MetaMask, WalletConnect, etc.
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