'use client'

import { useState } from 'react'
import LoginModal from '@/components/auth/LoginModal'

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData)
    setUserProfile(userData)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">TurfLoot</h1>
        <div className="text-center">
          <button 
            onClick={() => {
              console.log('🔍 LOGIN TO PLAY button clicked!')
              setShowLoginModal(true)
            }}
            className="bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-lg font-bold"
          >
            LOGIN TO PLAY
          </button>
          
          {userProfile && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-green-400">✅ Logged in as: {userProfile.username || userProfile.email}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Privy Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
