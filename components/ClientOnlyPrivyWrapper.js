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
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Add a small delay to ensure proper hydration
    const timer = setTimeout(() => {
      setShowContent(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Show loading state during hydration
  if (!isClient || !showContent) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">TurfLoot</h1>
          <p className="text-sm text-gray-400">Loading authentication...</p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto"></div>
          </div>
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