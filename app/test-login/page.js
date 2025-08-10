'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestLogin() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">TurfLoot Testing</h1>
        
        <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl mb-6">
          <h2 className="text-xl font-bold mb-4 text-green-400">✅ Account Ready for Testing!</h2>
          <div className="text-left space-y-2 text-sm text-gray-300 mb-6">
            <div><strong>Email:</strong> james.paradisis@gmail.com</div>
            <div><strong>Balance:</strong> $10,000</div>
            <div><strong>SOL:</strong> 50.0</div>
            <div><strong>USDC:</strong> 5000.0</div>
          </div>
          
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-4">
              Your real Privy account now has maximum money for testing!
            </p>
            <p className="text-cyan-400 text-sm">
              Use normal Privy login on the main page
            </p>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 hover:scale-105"
          >
            Go to Main Page & Login with Privy
          </button>
        </div>

        <div className="mt-6 text-gray-400 text-sm">
          <p>🎮 Ready to test all cash game features</p>
          <p>💰 $10,000 balance available for gameplay</p>
        </div>
      </div>
    </div>
  )
}