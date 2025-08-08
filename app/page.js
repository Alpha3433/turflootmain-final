'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'

export default function Home() {
  const [userProfile, setUserProfile] = useState(null)
  const [selectedBet, setSelectedBet] = useState(5)
  
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

        {/* Center - Live indicator */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-green-400 font-semibold">Live</span>
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

      {/* Main Title - Keep existing */}
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-8xl font-black tracking-tight">
          <span className="text-white">TURF</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">LOOT</span>
        </h1>
        <p className="text-gray-300 text-xl font-bold tracking-wider mt-2">
          SKILL-BASED TERRITORY GAME
        </p>
      </div>

      {/* Main Gaming Interface */}
      <div className="relative z-10 flex justify-center px-6">
        <div className="grid grid-cols-12 gap-6 max-w-7xl w-full">
          
          {/* Left Panel - Leaderboard */}
          <div className="col-span-3 space-y-6">
            {/* Leaderboard */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-yellow-400">🏆</span>
                <h3 className="text-white font-bold">Leaderboard</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">1. aji</span>
                  <span className="text-yellow-400 font-bold">$1,610.02</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">2. Erion</span>
                  <span className="text-yellow-400 font-bold">$1,380.53</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">3. Hotller</span>
                  <span className="text-yellow-400 font-bold">$1,233.80</span>
                </div>
              </div>
              <button className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium">
                View Full Leaderboard
              </button>
            </div>

            {/* Friends */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-blue-400">👥</span>
                <h3 className="text-white font-bold">Friends</h3>
                <span className="text-gray-400 text-sm">w/ RobtHurt</span>
              </div>
              <div className="text-center py-8">
                <div className="text-6xl text-gray-600 mb-2">0</div>
                <div className="text-gray-400 text-sm">No friends... add some!</div>
              </div>
            </div>
          </div>

          {/* Center Panel - Game Area */}
          <div className="col-span-6 space-y-6">
            {/* User Name Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-yellow-400">?</span>
                <span className="text-gray-300">Login to set your name</span>
              </div>
              <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded">
                <span className="text-white">✏️</span>
              </button>
            </div>

            {/* Betting Options */}
            <div className="flex justify-center space-x-4">
              {[1, 5, 20].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedBet(amount)}
                  className={`px-8 py-4 rounded-lg font-bold text-lg transition-all ${
                    selectedBet === amount
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Join Game Button */}
            <div className="text-center">
              <button className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black px-12 py-6 rounded-lg font-bold text-2xl shadow-lg transition-all duration-200 flex items-center space-x-3 mx-auto">
                <span>▶</span>
                <span>JOIN GAME</span>
              </button>
            </div>

            {/* Game Options */}
            <div className="flex justify-center space-x-4">
              <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-medium">
                UB
              </button>
              <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-medium">
                Browse Lobbies
              </button>
            </div>
          </div>

          {/* Right Panel - Wallet & Customize */}
          <div className="col-span-3 space-y-6">
            {/* Wallet */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">💳</span>
                  <h3 className="text-white font-bold">Wallet</h3>
                </div>
                <div className="flex space-x-2 text-xs">
                  <button className="text-gray-400 hover:text-white">Copy Address</button>
                  <span className="text-gray-600">|</span>
                  <button className="text-gray-400 hover:text-white">Refresh Balance</button>
                </div>
              </div>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white">$0.00</div>
                <div className="text-gray-400 text-sm">0.0000 SOL</div>
              </div>
              <div className="flex space-x-2">
                <button className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded font-medium text-sm">
                  Add Funds
                </button>
                <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium text-sm">
                  Cash Out
                </button>
              </div>
            </div>

            {/* Customize */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-purple-400">🎨</span>
                <h3 className="text-white font-bold">Customize</h3>
              </div>
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-cyan-400 rounded-full relative">
                  {/* Snake character representation */}
                  <div className="absolute inset-2 bg-cyan-300 rounded-full"></div>
                  <div className="absolute right-0 top-1/2 transform translate-x-2 -translate-y-1/2 w-4 h-2 bg-cyan-400 rounded-r-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="relative z-10 flex justify-center space-x-12 mt-8 text-center">
        <div>
          <div className="text-3xl font-bold text-yellow-400">38</div>
          <div className="text-gray-400 text-sm">Players in Game</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-yellow-400">$96,512</div>
          <div className="text-gray-400 text-sm">Global Player Winnings</div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="relative z-10 flex justify-center space-x-4 mt-8 mb-8">
        <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-medium">
          Add Friends
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black rounded font-bold">
          Daily Crate
        </button>
        <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-medium">
          Affiliate
        </button>
        <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-medium">
          Change Appearance
        </button>
      </div>

      {/* Discord Button */}
      <div className="absolute bottom-4 left-4">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium flex items-center space-x-2">
          <span className="text-white">🔗</span>
          <span>Join Discord!</span>
        </button>
      </div>

      {/* User Status Display */}
      {userProfile && (
        <div className="absolute top-20 right-6 p-3 bg-gray-800/90 rounded-lg border border-green-500/30">
          <p className="text-green-400 text-sm">✅ Logged in: {userProfile.username || userProfile.email}</p>
        </div>
      )}
      
      {authenticated && user && !userProfile && (
        <div className="absolute top-20 right-6 p-3 bg-gray-800/90 rounded-lg border border-green-500/30">
          <p className="text-green-400 text-sm">✅ Authenticated via Privy</p>
        </div>
      )}
    </div>
  )
}
