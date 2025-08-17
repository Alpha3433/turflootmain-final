import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import PrivyAuthProvider from '@/components/providers/PrivyAuthProvider'
import { GameSettingsProvider } from '@/components/providers/GameSettingsProvider'

export const dynamic = 'force-dynamic'

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