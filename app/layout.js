import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import { GameSettingsProvider } from '@/components/providers/GameSettingsProvider'
import { PrivyProvider } from '@privy-io/react-auth'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

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

export const metadata = {
  title: 'TurfLoot – Real-time blockchain skill gaming',
  description: 'Compete in skill-based territory battles. Earn real SOL rewards. 100% skill, 0% luck.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'TurfLoot – Real-time blockchain skill gaming',
    description: 'Compete in skill-based territory battles. Earn real SOL rewards.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TurfLoot – Real-time blockchain skill gaming',
    description: 'Compete in skill-based territory battles. Earn real SOL rewards.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TurfLoot',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#1E1E1E] text-white antialiased">
        <GameSettingsProvider>
          <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmdycgltk007ljs0bpjbjqx0a'}
            config={privyConfig}
          >
            <div className="min-h-screen bg-[#1E1E1E] text-white">
              {children}
            </div>
          </PrivyProvider>
        </GameSettingsProvider>
      </body>
    </html>
  )
}