'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { useEffect } from 'react'

export default function PrivyAuthProvider({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  
  console.log('🔍 Privy configuration:', {
    appId: appId,
    hasAppId: !!appId,
    appIdLength: appId?.length,
    environment: process.env.NODE_ENV
  })
  
  useEffect(() => {
    console.log('🔍 Privy Provider mounted with App ID:', appId)
    
    // Test network connectivity to Privy
    if (typeof window !== 'undefined') {
      fetch('https://auth.privy.io/health', { method: 'HEAD' })
        .then(() => console.log('✅ Privy servers are reachable'))
        .catch(err => console.error('❌ Cannot reach Privy servers:', err))
    }
  }, [appId])
  
  const config = {
    appearance: {
      theme: 'dark',
      accentColor: '#14F195',
      logo: '/turfloot-new-brand-logo.png',
    },
    loginMethods: ['email', 'wallet', 'google'],
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
    },
    fiatOnRamp: {
      enabled: true,
      defaultCryptoAmount: 0.01,
      defaultFiatAmount: 100,
      defaultCurrency: 'USD',
    },
  }

  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is not configured!')
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
          <p className="text-gray-400">Privy App ID is not configured. Please check your environment variables.</p>
          <div className="mt-4">
            <a href="/test-env" className="bg-blue-600 px-4 py-2 rounded">Test Environment</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PrivyProvider
      appId={appId}
      config={config}
      onSuccess={(user) => {
        console.log('✅ Privy login successful:', user)
      }}
      onError={(error) => {
        console.error('❌ Privy error:', error)
      }}
    >
      {children}
    </PrivyProvider>
  )
}