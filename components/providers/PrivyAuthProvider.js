'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyAuthProvider({ children }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      onSuccess={(user) => {
        console.log('✅ Privy authentication successful for user:', user.id)
      }}
      config={{
        loginMethods: ['google', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#14F195', // Solana green
          logo: undefined,
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          createOnLogin: 'all-users',
          requireUserPasswordOnCreate: false,
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}