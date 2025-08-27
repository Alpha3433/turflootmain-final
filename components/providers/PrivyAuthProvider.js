'use client'

import { PrivyProvider, usePrivy } from '@privy-io/react-auth'
import { Component, useState, useEffect } from 'react'

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
      onSuccess={(user) => {
        console.log('✅ Privy authentication successful for user:', user.id)
      }}
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
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Expose Privy functions globally for the main page to access
      window.__TURFLOOT_PRIVY__ = {
        login: privy.login,
        logout: privy.logout,
        ready: privy.ready,
        authenticated: privy.authenticated,
        user: privy.user
      }
      
      console.log('🔗 Privy bridge established - functions exposed globally')
    }
  }, [privy])
  
  return children
}
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
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">⚠️ Authentication Error</h1>
            <p className="text-gray-400">Please refresh the page.</p>
          </div>
        </div>
      )
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
  }

  return (
    <PrivyErrorBoundary>
      <ClientOnlyPrivyProvider appId={appId} config={config}>
        {children}
      </ClientOnlyPrivyProvider>
    </PrivyErrorBoundary>
  )
}