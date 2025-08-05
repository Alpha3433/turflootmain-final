'use client'

import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <head>
        <title>TurfLoot – Skill-based crypto land battles</title>
        <meta name="description" content="Capture with skill. Cash-out in crypto. 100% skill, 0% luck." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="TurfLoot – Skill-based crypto land battles" />
        <meta property="og:description" content="Capture with skill. Cash-out in crypto." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </head>
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