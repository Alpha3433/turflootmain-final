'use client'

import { useState } from 'react'

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">TurfLoot</h1>
        <div className="text-center">
          <button 
            onClick={() => setShowLoginModal(true)}
            className="bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-lg font-bold"
          >
            LOGIN TO PLAY
          </button>
        </div>
      </div>
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Login Modal</h2>
              <p className="mb-4">Privy Google OAuth integration works here!</p>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
