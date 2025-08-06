import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
// import { EnhancedWalletProvider } from '@/components/wallet/EnhancedWalletProvider'
// import { AuthProvider } from '@/components/providers/AuthProvider'
// import { PrivyProvider } from '@/components/providers/PrivyProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata = {
  title: 'TurfLoot – Real-time blockchain skill gaming',
  description: 'Compete in skill-based territory battles. Earn real SOL rewards. 100% skill, 0% luck.',
  openGraph: {
    title: 'TurfLoot – Real-time blockchain skill gaming',
    description: 'Compete in skill-based territory battles. Earn real SOL rewards.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#1E1E1E] text-white antialiased">
        {/* Temporary: Providers commented out for backend testing */}
        {/* <PrivyProvider>
          <EnhancedWalletProvider>
            <AuthProvider> */}
              {/* Persistent compliance banner */}
              <div className="bg-[#14F195]/10 border-b border-[#14F195]/20 px-4 py-2 text-center text-sm">
                <span className="text-[#14F195]">⚠️</span> TurfLoot prizes are determined solely by player skill. Play responsibly.
              </div>
              {children}
            {/* </AuthProvider>
          </EnhancedWalletProvider>
        </PrivyProvider> */}
      </body>
    </html>
  )
}