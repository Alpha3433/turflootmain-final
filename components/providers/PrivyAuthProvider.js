'use client'

import { PrivyProvider, usePrivy, useFundWallet } from '@privy-io/react-auth'
import { Component, useState, useEffect } from 'react'

// Simple success handler
const handleSuccess = (user) => {
  console.log('✅ Privy authentication successful for user:', user.id)
}

// Simple error handler
const handleError = (error) => {
  console.log('⚠️ Privy authentication error:', error)
  // Don't throw errors, just log them
}

// Client-side wrapper to prevent SSR issues with Privy Lit Elements
function ClientOnlyPrivyProvider({ children, appId, config }) {
  const [isClient, setIsClient] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Small delay to ensure proper hydration
    const timer = setTimeout(() => setIsReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Show loading state during hydration to prevent mismatch
  if (!isClient || !isReady) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    )
  }

  // Render with Privy provider on client-side after hydration
  return (
    <PrivyProvider
      appId={appId}
      config={config}
      onSuccess={handleSuccess}
      onError={handleError}
    >
      <PrivyBridge>
        {children}
      </PrivyBridge>
    </PrivyProvider>
  )
}

// Bridge component to expose Privy functions globally
function PrivyBridge({ children }) {
  const privy = usePrivy()
  const { fundWallet } = useFundWallet()
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Expose Privy functions globally for the main page to access
      window.__TURFLOOT_PRIVY__ = {
        login: async () => {
          console.log('🔗 Bridge login called - executing Privy login')
          try {
            if (typeof privy.login === 'function') {
              return await privy.login()
            } else {
              console.error('❌ Privy login is not a function:', typeof privy.login)
              throw new Error('Privy login function not available')
            }
          } catch (error) {
            console.error('❌ Bridge login error:', error)
            throw error
          }
        },
        logout: async () => {
          console.log('🔗 Bridge logout called - executing Privy logout')
          try {
            if (typeof privy.logout === 'function') {
              const result = await privy.logout()
              console.log('✅ Privy logout completed')
              return result
            } else {
              console.error('❌ Privy logout is not a function:', typeof privy.logout)
              throw new Error('Privy logout function not available')
            }
          } catch (error) {
            console.error('❌ Bridge logout error:', error)
            throw error
          }
        },
        fundWallet: async (wallet, options) => {
          console.log('💰 Bridge fundWallet called - executing Privy Solana fund wallet')
          try {
            if (typeof fundWallet === 'function') {
              // Call fundWallet specifically for Solana deposits
              console.log('🔗 Calling Privy fundWallet for Solana deposits...')
              return await fundWallet(wallet, options)
            } else {
              console.error('❌ Privy fundWallet is not a function:', typeof fundWallet)
              throw new Error('Privy Solana fundWallet function not available')
            }
          } catch (error) {
            console.error('❌ Bridge Solana fundWallet error:', error)
            throw error
          }
        },
        ready: privy.ready,
        authenticated: privy.authenticated,
        user: privy.user,
        // Add raw privy object for debugging
        _rawPrivy: privy,
        _rawFundWallet: fundWallet,
        // Force refresh auth state
        refreshAuth: () => {
          console.log('🔄 Forcing authentication state refresh')
          window.__TURFLOOT_PRIVY__.ready = privy.ready
          window.__TURFLOOT_PRIVY__.authenticated = privy.authenticated
          window.__TURFLOOT_PRIVY__.user = privy.user
        }
      }
      
      console.log('🔗 Privy bridge established - functions exposed globally')
      console.log('🔍 Privy state:', {
        ready: privy.ready,
        authenticated: privy.authenticated,
        hasLogin: typeof privy.login === 'function',
        hasLogout: typeof privy.logout === 'function',
        hasFundWallet: typeof fundWallet === 'function'
      })
    }
  }, [privy, fundWallet])
  
  return children
}

// Error boundary to catch and suppress Privy authentication errors
class PrivyErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Check if it's a Privy-related fetch error
    if (error.message && error.message.includes('Failed to fetch')) {
      console.warn('🔇 Suppressed non-critical Privy authentication error:', error.message)
      return { hasError: false } // Don't show error UI for fetch errors
    }
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log Privy errors but don't break the UI
    if (error.message && error.message.includes('Failed to fetch')) {
      console.warn('🔇 Privy fetch error caught and suppressed')
      return
    }
    console.error('🚨 Critical error in PrivyAuthProvider:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Don't show error UI, just log and continue
      console.warn('⚠️ Privy error caught by boundary:', this.state.error?.message)
      return this.props.children // Continue rendering instead of showing error
    }

    return this.props.children
  }
}

export default function PrivyAuthProvider({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  
  console.log('🔍 Privy Provider - App ID:', appId ? `${appId.substring(0, 10)}...` : 'MISSING')
  
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is not configured!')
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">🔑 Authentication Setup Required</h1>
        <p className="text-gray-400">Privy App ID is not configured.</p>
      </div>
    </div>
  }

  const config = {
    appearance: {
      theme: 'dark',
      accentColor: '#14F195', // TurfLoot green
      logo: undefined,
      showWalletLoginFirst: false,
    },
    loginMethods: ['google', 'email', 'wallet'],
    embeddedWallets: {
      createOnLogin: 'all-users',
      requireUserPasswordOnCreate: false,
    },
    mfa: {
      noPromptOnMfaRequired: false,
    },
    // Add Solana wallet configuration for CNR-2 format compatibility
    solanaClusters: [
      {
        name: 'mainnet-beta',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
      },
    ],
    // Configure funding with Coinbase Onramp
    fundingMethodConfig: {
      moonpay: {
        useSandbox: false,
      },
      coinbaseOnramp: {
        useSandbox: false,
      },
    },
  }

  return (
    <PrivyErrorBoundary>
      <ClientOnlyPrivyProvider appId={appId} config={config}>
        {children}
      </ClientOnlyPrivyProvider>
    </PrivyErrorBoundary>
  )
}