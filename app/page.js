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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated grid pattern */}
        <div className="h-full w-full opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(250,204,21,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(250,204,21,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          animation: 'gridMove 20s linear infinite'
        }}></div>
        
        {/* Floating orbs for atmosphere */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-32 right-32 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-cyan-400/20 rounded-full blur-lg"></div>
      </div>

      {/* Modern Header with enhanced styling */}
      <header className="relative z-10 flex justify-between items-center p-8 backdrop-blur-sm">
        {/* Left side - Welcome message with enhanced styling */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 via-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/25">
              <div className="w-6 h-6 bg-white rounded-full relative">
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-black rounded-full"></div>
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <span className="text-white text-xl font-semibold tracking-wide">Welcome, bruh!</span>
        </div>

        {/* Center - Enhanced Live indicator */}
        <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-md px-6 py-3 rounded-full border border-green-500/30">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
          <span className="text-green-400 font-bold text-lg">Live</span>
          <div className="text-gray-400 text-sm">•</div>
          <span className="text-gray-300 text-sm font-medium">38 Online</span>
        </div>

        {/* Right side - Enhanced Login button */}
        <button 
          onClick={handleLoginClick}
          disabled={!ready}
          className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 shadow-2xl shadow-orange-500/25 hover:shadow-orange-400/40 hover:scale-105 transform"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-orange-300 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          <span className="relative">{ready ? 'Login' : 'Loading...'}</span>
        </button>
      </header>

      {/* Enhanced Main Title with better effects */}
      <div className="relative z-10 text-center mb-12">
        <div className="relative inline-block">
          <h1 className="text-8xl font-black tracking-tight relative">
            <span className="text-white drop-shadow-2xl">TURF</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 drop-shadow-lg">LOOT</span>
          </h1>
          <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-yellow-400/20 blur-2xl -z-10"></div>
        </div>
        <p className="text-gray-300 text-2xl font-bold tracking-wider mt-4 opacity-90">
          SKILL-BASED TERRITORY GAME
        </p>
        <div className="mt-2 text-yellow-400 text-sm font-medium">
          ⚡ Real-time multiplayer • 🏆 Skill-based rewards • 💎 Blockchain verified
        </div>
      </div>

      {/* Enhanced Main Gaming Interface */}
      <div className="relative z-10 flex justify-center px-8">
        <div className="grid grid-cols-12 gap-8 max-w-8xl w-full">
          
          {/* Enhanced Left Panel - Leaderboard */}
          <div className="col-span-3 space-y-8">
            {/* Enhanced Leaderboard */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-2xl hover:border-gray-600/50 transition-all duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <div className="text-2xl">🏆</div>
                <h3 className="text-white font-bold text-xl">Leaderboard</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-yellow-400/50 to-transparent"></div>
              </div>
              <div className="space-y-4">
                {[
                  { rank: 1, name: 'aji', amount: '$1,610.02', color: 'text-yellow-400' },
                  { rank: 2, name: 'Erion', amount: '$1,380.53', color: 'text-gray-300' },
                  { rank: 3, name: 'Hotller', amount: '$1,233.80', color: 'text-orange-400' }
                ].map((player) => (
                  <div key={player.rank} className="flex justify-between items-center py-3 px-4 bg-gray-800/30 rounded-lg hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center space-x-3">
                      <span className={`font-bold ${player.color}`}>#{player.rank}</span>
                      <span className="text-gray-300 font-medium">{player.name}</span>
                    </div>
                    <span className="text-yellow-400 font-bold">{player.amount}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-[1.02]">
                View Full Leaderboard
              </button>
            </div>

            {/* Enhanced Friends Panel */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="text-2xl">👥</div>
                <h3 className="text-white font-bold text-xl">Friends</h3>
                <span className="text-gray-400 text-sm bg-gray-800/50 px-3 py-1 rounded-full">w/ RobtHurt</span>
              </div>
              <div className="text-center py-12">
                <div className="text-8xl font-bold text-gray-600 mb-4 opacity-50">0</div>
                <div className="text-gray-400 text-base mb-4">No friends... add some!</div>
                <button className="px-6 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 font-medium transition-colors">
                  Invite Friends
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Center Panel - Game Area */}
          <div className="col-span-6 space-y-8">
            {/* Enhanced User Name Section */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-2xl flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold text-black">
                  ?
                </div>
                <span className="text-gray-300 text-lg font-medium">Login to set your name</span>
              </div>
              <button className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl border border-gray-600/50 transition-all hover:scale-110">
                <span className="text-xl">✏️</span>
              </button>
            </div>

            {/* Enhanced Betting Options */}
            <div className="flex justify-center space-x-6">
              {[1, 5, 20].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedBet(amount)}
                  className={`relative group px-12 py-6 rounded-2xl font-bold text-2xl transition-all duration-300 hover:scale-105 transform ${
                    selectedBet === amount
                      ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black shadow-2xl shadow-orange-500/30'
                      : 'bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 text-white border-2 border-gray-600/50 hover:border-gray-500/50'
                  }`}
                >
                  {selectedBet === amount && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-orange-300/20 rounded-2xl blur"></div>
                  )}
                  <span className="relative">${amount}</span>
                </button>
              ))}
            </div>

            {/* Enhanced Join Game Button */}
            <div className="text-center">
              <button className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-16 py-8 rounded-3xl font-black text-3xl shadow-2xl transition-all duration-300 hover:scale-105 transform flex items-center space-x-4 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/30 to-orange-300/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="text-4xl">▶</span>
                <span className="relative tracking-wider">JOIN GAME</span>
              </button>
            </div>

            {/* Enhanced Game Options */}
            <div className="flex justify-center space-x-6">
              <button className="px-8 py-4 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl font-bold text-lg border border-gray-600/50 hover:border-gray-500/50 transition-all hover:scale-105">
                UB
              </button>
              <button className="px-8 py-4 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl font-bold text-lg border border-gray-600/50 hover:border-gray-500/50 transition-all hover:scale-105">
                Browse Lobbies
              </button>
            </div>
          </div>

          {/* Enhanced Right Panel - Wallet & Customize */}
          <div className="col-span-3 space-y-8">
            {/* Enhanced Wallet */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💳</div>
                  <h3 className="text-white font-bold text-xl">Wallet</h3>
                </div>
                <div className="flex space-x-4 text-xs">
                  <button className="text-gray-400 hover:text-cyan-400 font-medium transition-colors">Copy</button>
                  <span className="text-gray-600">•</span>
                  <button className="text-gray-400 hover:text-cyan-400 font-medium transition-colors">Refresh</button>
                </div>
              </div>
              <div className="text-center mb-6 p-6 bg-gray-800/30 rounded-xl">
                <div className="text-4xl font-black text-white mb-2">$0.00</div>
                <div className="text-gray-400 text-base">0.0000 SOL</div>
              </div>
              <div className="flex space-x-3">
                <button className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25">
                  Add Funds
                </button>
                <button className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-blue-500/25">
                  Cash Out
                </button>
              </div>
            </div>

            {/* Enhanced Customize */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="text-2xl">🎨</div>
                <h3 className="text-white font-bold text-xl">Customize</h3>
              </div>
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-28 h-28 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full relative shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all duration-300 hover:scale-110">
                    <div className="absolute inset-3 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-full"></div>
                    <div className="absolute right-0 top-1/2 transform translate-x-3 -translate-y-1/2 w-6 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-r-full"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-200/20 to-blue-300/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              </div>
              <button className="w-full py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 rounded-xl font-bold transition-all hover:scale-[1.02]">
                Change Skin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Bottom Stats */}
      <div className="relative z-10 flex justify-center space-x-16 mt-12 mb-8">
        <div className="text-center bg-black/20 backdrop-blur-sm px-8 py-6 rounded-2xl border border-gray-700/30">
          <div className="text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">38</div>
          <div className="text-gray-400 text-lg font-medium mt-2">Players in Game</div>
        </div>
        <div className="text-center bg-black/20 backdrop-blur-sm px-8 py-6 rounded-2xl border border-gray-700/30">
          <div className="text-5xl font-black bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">$96,512</div>
          <div className="text-gray-400 text-lg font-medium mt-2">Global Player Winnings</div>
        </div>
      </div>

      {/* Enhanced Bottom Action Buttons */}
      <div className="relative z-10 flex justify-center space-x-6 mb-12">
        <button className="px-8 py-4 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl font-bold border border-gray-600/50 hover:border-gray-500/50 transition-all hover:scale-105">
          Add Friends
        </button>
        <button className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-orange-500/25">
          Daily Crate
        </button>
        <button className="px-8 py-4 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl font-bold border border-gray-600/50 hover:border-gray-500/50 transition-all hover:scale-105">
          Affiliate
        </button>
        <button className="px-8 py-4 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl font-bold border border-gray-600/50 hover:border-gray-500/50 transition-all hover:scale-105">
          Change Appearance
        </button>
      </div>

      {/* Enhanced Discord Button */}
      <div className="absolute bottom-8 left-8">
        <button className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl font-bold flex items-center space-x-3 shadow-xl shadow-blue-500/25 hover:scale-105 transition-all duration-300">
          <span className="text-2xl">🔗</span>
          <span className="text-lg">Join Discord!</span>
        </button>
      </div>

      {/* Enhanced User Status Display */}
      {userProfile && (
        <div className="absolute top-24 right-8 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-green-500/30 shadow-xl">
          <p className="text-green-400 font-medium">✅ Logged in: {userProfile.username || userProfile.email}</p>
        </div>
      )}
      
      {authenticated && user && !userProfile && (
        <div className="absolute top-24 right-8 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-green-500/30 shadow-xl">
          <p className="text-green-400 font-medium">✅ Authenticated via Privy</p>
        </div>
      )}

      {/* CSS Animation Keyframes */}
      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  )
}
