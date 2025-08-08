'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'

export default function Home() {
  const [userProfile, setUserProfile] = useState(null)
  
  // Get Privy hooks
  const { login, ready, authenticated, user } = usePrivy()

  // Handle direct Privy login when button is clicked
  const handleLoginClick = () => {
    console.log('🔍 Starting direct Privy login...')
    
    // Call Privy's login directly - this will show the interface in your screenshot
    login().then(() => {
      console.log('✅ Privy login interface opened')
    }).catch((error) => {
      console.error('❌ Privy login error:', error)
      alert('Login failed. Please try again.')
    })
  }

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
            onClick={handleLoginClick}
            disabled={!ready}
            className="bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-lg font-bold cursor-pointer disabled:opacity-50"
          >
            {ready ? 'LOGIN TO PLAY' : 'Loading...'}
          </button>
          
          {userProfile && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-green-400">✅ Logged in as: {userProfile.username || userProfile.email}</p>
            </div>
          )}
          
          {authenticated && user && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-green-400">✅ Authenticated via Privy</p>
              <p className="text-sm text-gray-300">User ID: {user.id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
