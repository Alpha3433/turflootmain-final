'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyAuthProvider({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  
  console.log('🔍 Privy Provider - App ID:', appId ? `${appId.substring(0, 10)}...` : 'MISSING')
  
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is not configured!')
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
          <p className="text-gray-400">Privy App ID is not configured.</p>
        </div>
      </div>
    )
  }

  const config = {
    appearance: {
      theme: 'dark',
      accentColor: '#14F195',
    },
    loginMethods: ['email', 'wallet'],
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
    },
  }

  return (
    <PrivyProvider
      appId={appId}
      config={config}
    >
      {children}
    </PrivyProvider>
  )
}