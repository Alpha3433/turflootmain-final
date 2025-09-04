'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootGaming() {
  const router = useRouter()
  const [selectedStake, setSelectedStake] = useState('FREE')
  const [liveStats, setLiveStats] = useState({ players: 21, winnings: 276639 })
  const [userName, setUserName] = useState('anth')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    // Simulate live stats updates
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        players: Math.floor(Math.random() * 50) + 15,
        winnings: Math.floor(Math.random() * 100000) + 200000
      }))
    }, 4000)
    
    return () => clearInterval(interval)
  }, [])

  const handleJoinGame = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      
      {/* Top Header */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
          🔥
        </div>
        <span className="text-orange-400 font-bold">Welcome, ty8898812</span>
      </div>

      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <div className="w-6 h-6 bg-gray-600 rounded"></div>
        <div className="w-6 h-6 bg-gray-600 rounded"></div>
        <div className="w-6 h-6 bg-gray-600 rounded"></div>
      </div>

      {/* Floating Game Elements */}
      <div className="absolute top-16 left-32 z-20">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-80 animate-pulse" />
      </div>
      <div className="absolute bottom-32 right-40 z-20">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full opacity-70 animate-bounce" />
      </div>

      {/* Main Title */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30 text-center">
        <h1 className="text-6xl font-black mb-2">
          <span className="text-white">TURF</span>
          <span className="text-yellow-400">LOOT</span>
        </h1>
        <p className="text-white font-bold text-lg tracking-wider">SKILL-BASED GRID DOMINATION</p>
      </div>

      {/* Left Panel - Leaderboard */}
      <div className="absolute left-6 top-40 w-80 z-40">
        <div className="bg-gray-900/90 rounded-2xl border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center">
              🏆
            </div>
            <h3 className="text-white font-bold">Leaderboard</h3>
            <div className="ml-auto">
              <div className="px-2 py-1 bg-green-500/30 text-green-400 text-xs rounded border border-green-500/50">
                Live
              </div>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-300 text-sm">1. Quantum</span>
              <span className="text-yellow-400 font-bold text-sm">$6,559.45</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-300 text-sm">2. Dernie237</span>
              <span className="text-yellow-400 font-bold text-sm">$5,210.67</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-300 text-sm">3. Mr.TK216</span>
              <span className="text-yellow-400 font-bold text-sm">$4,757.38</span>
            </div>
          </div>
          
          <button className="w-full py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 text-sm hover:bg-gray-700 transition-colors">
            View Full Leaderboard
          </button>
        </div>
      </div>

      {/* Center Area - Game Controls */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 text-center">
        
        {/* Player Name Input */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-black font-bold text-xl">
              0
            </div>
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white font-semibold text-center w-40"
              placeholder="Enter your name"
            />
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold">
              ✓
            </div>
          </div>
        </div>

        {/* Stakes */}
        <div className="flex gap-2 mb-6 justify-center">
          {['$1', '$5', '$20'].map((stake) => (
            <button
              key={stake}
              onClick={() => setSelectedStake(stake)}
              className={`px-6 py-3 rounded-lg font-bold text-lg transition-all ${
                selectedStake === stake
                  ? 'bg-yellow-500 text-black border-2 border-yellow-400'
                  : 'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        {/* Main Join Button */}
        <button 
          onClick={handleJoinGame}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-4 px-16 rounded-2xl text-xl mb-6 hover:scale-105 transition-all shadow-2xl border-2 border-yellow-400"
        >
          ▶ JOIN GAME
        </button>

        {/* Secondary Buttons */}
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">
            AI EU
          </button>
          <button className="px-6 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">
            Browse Lobbies
          </button>
        </div>
      </div>

      {/* Right Panel - Wallet */}
      <div className="absolute right-6 top-40 w-72 z-40">
        <div className="bg-gray-900/90 rounded-2xl border border-cyan-400/30 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-cyan-400 rounded flex items-center justify-center">
              💰
            </div>
            <h3 className="text-white font-bold">Wallet</h3>
            <div className="ml-auto flex gap-2">
              <button className="text-xs text-gray-400 hover:text-white">[?] Copy Address</button>
              <button className="text-xs text-gray-400 hover:text-white">[↻] Refresh Balance</button>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <div className="text-4xl font-black text-yellow-400 mb-1">$0.00</div>
            <div className="text-gray-400 text-sm">0.0000 SOL</div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <button className="flex-1 py-3 bg-green-600/30 border border-green-500/50 rounded-lg text-green-300 font-bold hover:bg-green-600/50 transition-colors">
              Add Funds
            </button>
            <button className="flex-1 py-3 bg-blue-600/30 border border-blue-500/50 rounded-lg text-blue-300 font-bold hover:bg-blue-600/50 transition-colors">
              Cash Out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left - Friends */}
      <div className="absolute left-6 bottom-6 w-80 z-40">
        <div className="bg-gray-900/90 rounded-2xl border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
              👥
            </div>
            <h3 className="text-white font-bold">Friends</h3>
            <div className="ml-auto flex gap-2">
              <span className="text-xs text-gray-400">[↻] Refresh</span>
              <span className="text-xs text-gray-400">0 playing</span>
            </div>
          </div>
          
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
              👤
            </div>
            <div className="text-gray-400 text-sm mb-2">No friends... add some!</div>
          </div>
          
          <button className="w-full py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 text-sm hover:bg-gray-700 transition-colors">
            Add Friends
          </button>
        </div>
      </div>

      {/* Bottom Center - Stats */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-30 text-center">
        <div className="flex gap-16">
          <div>
            <div className="text-4xl font-black text-yellow-400 mb-1">{liveStats.players}</div>
            <div className="text-gray-400 text-sm">Players in Game</div>
          </div>
          <div>
            <div className="text-4xl font-black text-yellow-400 mb-1">${liveStats.winnings.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">Global Player Winnings</div>
          </div>
        </div>
      </div>

      {/* Bottom Right - Customize */}
      <div className="absolute right-6 bottom-6 w-72 z-40">
        <div className="bg-gray-900/90 rounded-2xl border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
              🎨
            </div>
            <h3 className="text-white font-bold">Customize</h3>
          </div>
          
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-pink-500 rounded-full mx-auto mb-3 flex items-center justify-center relative">
              <div className="w-2 h-2 bg-black rounded-full absolute top-4 left-5"></div>
              <div className="w-2 h-2 bg-black rounded-full absolute top-4 right-5"></div>
            </div>
          </div>
          
          <button className="w-full py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors mb-2">
            👤 Manage Affiliate
          </button>
          
          <button className="w-full py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 text-sm hover:bg-gray-700 transition-colors">
            Change Appearance
          </button>
        </div>
      </div>

      {/* Discord Button */}
      <div className="absolute bottom-4 left-4 z-40">
        <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2">
          🎮 Join Discord!
        </button>
      </div>
    </div>
  )
}