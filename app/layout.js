import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'
import { GameSettingsProvider } from '@/components/providers/GameSettingsProvider'

// Import PrivyAuthProvider dynamically with SSR disabled to fix HTMLElement SSR error
// while preserving authentication functionality
const PrivyAuthProvider = dynamic(
  () => import('@/components/providers/PrivyAuthProvider'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ visibility: 'hidden' }}>
        {/* Hidden loading state to prevent layout shift */}
      </div>
    )
  }
)

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata = {
  title: 'TurfLoot – Real-time blockchain skill gaming',
  description: 'Compete in skill-based territory battles. Earn real SOL rewards. 100% skill, 0% luck.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'TurfLoot – Real-time blockchain skill gaming',
    description: 'Compete in skill-based territory battles. Earn real SOL rewards.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.webmanifest',
  other: {
    // iOS PWA Meta Tags
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'TurfLoot',
    'mobile-web-app-capable': 'yes',
    // Viewport meta for mobile
    'viewport': 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#1E1E1E] text-white antialiased">
        <PrivyAuthProvider>
          <GameSettingsProvider>
            {children}
          </GameSettingsProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  )
}