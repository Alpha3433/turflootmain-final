'use client'

import { useState, useEffect } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'

// Privy configuration
const privyConfig = {
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    noPromptOnSignature: false
  },
  loginMethods: ['email', 'google', 'discord'],
  appearance: {
    theme: 'dark',
    accentColor: '#14F195',
    logo: undefined
  }
}

export default function ClientOnlyPrivyWrapper({ children }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">TurfLoot</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmdycgltk007ljs0bpjbjqx0a'}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  )
}