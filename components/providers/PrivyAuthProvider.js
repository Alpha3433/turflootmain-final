'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyAuthProvider({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  
  console.log('🔍 Privy Provider - App ID:', appId ? `${appId.substring(0, 10)}...` : 'MISSING')
  
  // If no app ID or app ID is invalid, show instructions
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is not configured!')
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">🔑 Authentication Setup Required</h1>
          <p className="text-gray-400 mb-4">Privy App ID is not configured.</p>
          <p className="text-sm text-gray-500">
            Please set NEXT_PUBLIC_PRIVY_APP_ID in your .env file with a valid Privy App ID.
          </p>
        </div>
      </div>
    )
  }

  const config = {
    appearance: {
      theme: 'dark',
      accentColor: '#14F195', // TurfLoot green
      logo: undefined,
      showWalletLoginFirst: false,
    },
    loginMethods: ['google', 'email'],
    embeddedWallets: {
      createOnLogin: 'all-users',
      requireUserPasswordOnCreate: false,
    },
    mfa: {
      noPromptOnMfaRequired: false,
    },
  }

  return (
    <PrivyProvider
      appId={appId}
      config={config}
      onSuccess={(user) => {
        console.log('✅ Privy authentication successful for user:', user.id)
      }}
    >
      {children}
    </PrivyProvider>
  )
}