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
    
    // Call Privy's login directly - this will show the interface
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
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}></div>
      </div>

      {/* Header matching DAMNBRUH design */}
      <header className="relative z-10 flex justify-between items-center p-6">
        {/* Left side - Welcome message */}
        <div className="flex items-center space-x-3">
          {/* Snake/Game icon */}
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full relative">
              <div className="absolute top-1 left-1 w-1 h-1 bg-black rounded-full"></div>
            </div>
          </div>
          <span className="text-white text-lg font-medium">Welcome, bruh!</span>
        </div>

        {/* Right side - Login button */}
        <button 
          onClick={handleLoginClick}
          disabled={!ready}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black px-6 py-2 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 shadow-lg"
        >
          {ready ? 'Login' : 'Loading...'}
        </button>
      </header>

      {/* Main Content - Centered branding */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        {/* Main Title */}
        <div className="mb-4">
          <h1 className="text-8xl font-black tracking-tight">
            <span className="text-white">TURF</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">LOOT</span>
          </h1>
          <p className="text-gray-300 text-xl font-bold tracking-wider mt-2">
            SKILL-BASED TERRITORY GAME
          </p>
        </div>

        {/* User Status */}
        {userProfile && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-yellow-500/30">
            <p className="text-green-400">✅ Logged in as: {userProfile.username || userProfile.email}</p>
          </div>
        )}
        
        {authenticated && user && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-yellow-500/30">
            <p className="text-green-400">✅ Authenticated via Privy</p>
            <p className="text-sm text-gray-300">User ID: {user.id}</p>
          </div>
        )}
      </div>

      {/* Background decorative elements */}
      <div className="absolute bottom-10 right-10 opacity-20">
        <div className="w-32 h-32 border-4 border-yellow-400 rounded-full"></div>
      </div>
      <div className="absolute top-32 left-10 opacity-20">
        <div className="w-20 h-20 border-2 border-orange-400 rounded-lg rotate-45"></div>
      </div>
    </div>
  )
}
