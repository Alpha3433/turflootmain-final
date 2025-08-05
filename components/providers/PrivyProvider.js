'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyAuthProvider({ children }) {
  const config = {
    appearance: {
      theme: 'dark',
      accentColor: '#14F195',
      logo: '/logo.png',
    },
    loginMethods: ['email', 'wallet'],
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

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={config}
    >
      {children}
    </PrivyProvider>
  )
}