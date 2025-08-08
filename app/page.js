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
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated grid pattern */}
        <div className="h-full w-full opacity-15" style={{
          backgroundImage: `
            linear-gradient(rgba(250,204,21,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(250,204,21,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}></div>
        
        {/* Floating orbs for atmosphere */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-yellow-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Compact Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4">
        {/* Left side - Welcome message */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 via-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-5 h-5 bg-white rounded-full relative">
                <div className="absolute top-1 left-1 w-1 h-1 bg-black rounded-full"></div>
              </div>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <span className="text-white text-lg font-semibold">Welcome, bruh!</span>
        </div>

        {/* Center - Live indicator */}
        <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-green-500/30">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-bold">Live</span>
          <div className="text-gray-400 text-sm">•</div>
          <span className="text-gray-300 text-sm">38 Online</span>
        </div>

        {/* Right side - Login button */}
        <button 
          onClick={handleLoginClick}
          disabled={!ready}
          className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 shadow-xl hover:scale-105"
        >
          <span className="relative">{ready ? 'Login' : 'Loading...'}</span>
        </button>
      </header>

      {/* Compact Main Content */}
      <div className="relative z-10 flex flex-col" style={{height: 'calc(100vh - 100px)'}}>
        
        {/* Compact Title Section */}
        <div className="text-center mb-2">
          <div className="relative inline-block">
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-white drop-shadow-xl">TURF</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600">LOOT</span>
            </h1>
          </div>
          <p className="text-gray-300 text-sm font-bold tracking-wide mt-1">
            SKILL-BASED TERRITORY GAME
          </p>
          <div className="text-yellow-400 text-xs font-medium mt-1">
            ⚡ Real-time • 🏆 Skill-based • 💎 Blockchain verified
          </div>
        </div>

        {/* Compact Main Interface */}
        <div className="flex-1 flex justify-center px-4 min-h-0">
          <div className="grid grid-cols-12 gap-4 max-w-7xl w-full h-full">
            
            {/* Compact Left Panel */}
            <div className="col-span-3 space-y-3 h-full">
              {/* Compact Leaderboard */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[48%]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">🏆</div>
                  <h3 className="text-white font-bold text-sm">Leaderboard</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { rank: 1, name: 'aji', amount: '$1,610.02', color: 'text-yellow-400' },
                    { rank: 2, name: 'Erion', amount: '$1,380.53', color: 'text-gray-300' },
                    { rank: 3, name: 'Hotller', amount: '$1,233.80', color: 'text-orange-400' }
                  ].map((player) => (
                    <div key={player.rank} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-lg text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-xs ${player.color}`}>#{player.rank}</span>
                        <span className="text-gray-300">{player.name}</span>
                      </div>
                      <span className="text-yellow-400 font-bold text-xs">{player.amount}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 py-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 rounded-lg text-xs font-bold transition-all">
                  View Full Leaderboard
                </button>
              </div>

              {/* Compact Friends Panel */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[48%]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">👥</div>
                  <h3 className="text-white font-bold text-sm">Friends</h3>
                  <span className="text-gray-400 text-xs bg-gray-800/50 px-2 py-0.5 rounded-full">w/ RobtHurt</span>
                </div>
                <div className="text-center py-3">
                  <div className="text-3xl font-bold text-gray-600 mb-2">0</div>
                  <div className="text-gray-400 text-xs mb-2">No friends... add some!</div>
                  <button className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium">
                    Invite Friends
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Center Panel */}
            <div className="col-span-6 flex flex-col justify-center space-y-2">
              {/* Compact User Name Section */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-black">
                    ?
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Login to set your name</span>
                </div>
                <button className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all">
                  <span className="text-sm">✏️</span>
                </button>
              </div>

              {/* Compact Betting Options */}
              <div className="flex justify-center space-x-4">
                {[1, 5, 20].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedBet(amount)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 ${
                      selectedBet === amount
                        ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black shadow-xl shadow-orange-500/25'
                        : 'bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 text-white border border-gray-600/50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Large Join Game Button */}
              <div className="text-center">
                <button className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-8 py-3 rounded-2xl font-black text-lg shadow-2xl transition-all duration-300 hover:scale-105 flex items-center space-x-3 mx-auto">
                  <span className="text-xl">▶</span>
                  <span className="relative">JOIN GAME</span>
                </button>
              </div>

              {/* Compact Game Options */}
              <div className="flex justify-center space-x-4">
                <button className="px-4 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl text-sm font-bold border border-gray-600/50 transition-all hover:scale-105">
                  UB
                </button>
                <button className="px-4 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl text-sm font-bold border border-gray-600/50 transition-all hover:scale-105">
                  Browse Lobbies
                </button>
              </div>
            </div>

            {/* Compact Right Panel */}
            <div className="col-span-3 space-y-3 h-full">
              {/* Compact Wallet */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[58%]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">💳</div>
                    <h3 className="text-white font-bold text-sm">Wallet</h3>
                  </div>
                  <div className="flex space-x-2 text-xs">
                    <button className="text-gray-400 hover:text-cyan-400">Copy</button>
                    <span className="text-gray-600">•</span>
                    <button className="text-gray-400 hover:text-cyan-400">Refresh</button>
                  </div>
                </div>
                <div className="text-center mb-3 p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-xl font-black text-white mb-1">$0.00</div>
                  <div className="text-gray-400 text-xs">0.0000 SOL</div>
                </div>
                <div className="flex space-x-2">
                  <button className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-lg font-bold text-xs transition-all hover:scale-105">
                    Add Funds
                  </button>
                  <button className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-bold text-xs transition-all hover:scale-105">
                    Cash Out
                  </button>
                </div>
              </div>

              {/* Compact Customize */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[38%]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">🎨</div>
                  <h3 className="text-white font-bold text-sm">Customize</h3>
                </div>
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full relative shadow-xl hover:scale-110 transition-all">
                    <div className="absolute inset-2 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-full"></div>
                    <div className="absolute right-0 top-1/2 transform translate-x-1.5 -translate-y-1/2 w-3 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-r-full"></div>
                  </div>
                </div>
                <button className="w-full py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]">
                  Change Skin
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Section */}
        <div className="relative z-10 py-2 mt-auto">
          {/* Compact Stats */}
          <div className="flex justify-center space-x-6 mb-2">
            <div className="text-center bg-black/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700/30">
              <div className="text-lg font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">38</div>
              <div className="text-gray-400 text-xs">Players in Game</div>
            </div>
            <div className="text-center bg-black/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700/30">
              <div className="text-lg font-black bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">$96,512</div>
              <div className="text-gray-400 text-xs">Global Winnings</div>
            </div>
          </div>

          {/* Compact Action Buttons */}
          <div className="flex justify-center space-x-3">
            <button className="px-3 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-lg text-xs font-bold border border-gray-600/50 transition-all hover:scale-105">
              Add Friends
            </button>
            <button className="px-3 py-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black rounded-lg text-xs font-bold transition-all hover:scale-105">
              Daily Crate
            </button>
            <button className="px-3 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-lg text-xs font-bold border border-gray-600/50 transition-all hover:scale-105">
              Affiliate
            </button>
            <button className="px-3 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-lg text-xs font-bold border border-gray-600/50 transition-all hover:scale-105">
              Change Appearance
            </button>
          </div>
        </div>
      </div>

      {/* Discord Button */}
      <div className="absolute bottom-2 left-2">
        <button className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all hover:scale-105">
          <span className="text-sm">🔗</span>
          <span>Discord</span>
        </button>
      </div>

      {/* User Status Display - Only show userProfile, not Privy auth status */}
      {userProfile && (
        <div className="absolute top-16 right-6 p-3 bg-black/60 backdrop-blur-md rounded-lg border border-green-500/30">
          <p className="text-green-400 text-sm">✅ {userProfile.username || userProfile.email}</p>
        </div>
      )}
    </div>
  )
}
