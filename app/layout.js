import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata = {
  title: 'TurfLoot – Skill-based crypto land battles',
  description: 'Capture with skill. Cash-out in crypto. 100% skill, 0% luck.',
  openGraph: {
    title: 'TurfLoot – Skill-based crypto land battles',
    description: 'Capture with skill. Cash-out in crypto.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#1E1E1E] text-white antialiased">
        {/* Persistent compliance banner */}
        <div className="bg-[#14F195]/10 border-b border-[#14F195]/20 px-4 py-2 text-center text-sm">
          <span className="text-[#14F195]">⚠️</span> TurfLoot prizes are determined solely by player skill. Play responsibly.
        </div>
        {children}
      </body>
    </html>
  )
}