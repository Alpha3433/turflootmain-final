'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootLayoutMatch() {
  const router = useRouter()
  const [gameStake, setGameStake] = useState('FREE')

  const handleJoinMultiplayer = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0, 255, 255, 0.4)" strokeWidth="1"></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"></rect>
        </svg>
      </div>

      {/* Welcome Message - Top Left */}
      <div className="absolute top-4 left-6 z-50">
        <span className="text-white text-lg font-medium">Welcome, anth!</span>
      </div>

      {/* Top Navigation - Top Right */}
      <div className="absolute top-4 right-6 z-50 flex items-center space-x-2">
        <div className="bg-yellow-600 px-3 py-1 rounded border border-yellow-500 flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-black text-xs font-bold">$</span>
          </div>
          <span className="text-white font-bold text-xs">COINS</span>
        </div>
        <button className="px-2 py-1 bg-teal-600 text-white font-bold text-xs rounded border border-teal-500">OCEANIA</button>
        <button className="px-2 py-1 bg-blue-600 text-white font-bold text-xs rounded border border-blue-500">ASIA EAST</button>
        <button className="px-2 py-1 bg-orange-600 text-white font-bold text-xs rounded border border-orange-500">US WEST</button>
        <button className="px-2 py-1 bg-orange-700 text-white font-bold text-xs rounded border border-orange-600">US EAST</button>
        <button className="px-2 py-1 bg-purple-600 text-white font-bold text-xs rounded border border-purple-500">EUROPE</button>
        <button className="px-2 py-1 bg-red-600 text-white font-bold text-xs rounded border border-red-500">GLOBAL</button>
        <button className="px-2 py-1 bg-red-700 text-white font-bold text-xs rounded border border-red-600">LOGIN</button>
      </div>

      {/* Warning Message */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center space-x-2 text-yellow-400 text-sm">
          <span>⚠️</span>
          <span>Artificial prices are determined solely by player skill. Play responsibly.</span>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-32 left-12 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
        <span className="text-black font-bold">$</span>
      </div>
      <div className="absolute top-40 right-20 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '1s'}}>
        <span className="text-black font-bold text-sm">$</span>
      </div>
      <div className="absolute bottom-40 left-16 w-12 h-12 bg-cyan-400 rounded-full animate-pulse">
        <div className="w-2 h-2 bg-black rounded-full absolute top-3 left-3"></div>
        <div className="w-2 h-2 bg-black rounded-full absolute top-3 right-3"></div>
      </div>
      <div className="absolute bottom-60 right-24 w-10 h-10 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}>
        <div className="w-1 h-1 bg-black rounded-full absolute top-2 left-2"></div>
        <div className="w-1 h-1 bg-black rounded-full absolute top-2 right-2"></div>
      </div>

      {/* Main Content Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black mb-4">
            <span className="text-white">TURF</span>
            <span className="text-yellow-400">LOOT</span>
          </h1>
          <p className="text-gray-300 text-xl font-bold">SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Stats */}
        <div className="flex space-x-16 mb-8">
          <div className="text-center">
            <div className="text-4xl font-black text-yellow-400">0</div>
            <div className="text-gray-400 text-sm">Players in Game</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-yellow-400">$0</div>
            <div className="text-gray-400 text-sm">Global Player Winnings</div>
          </div>
        </div>

        {/* Player Avatar */}
        <div className="bg-gray-800 rounded-2xl px-8 py-6 border border-gray-600 flex items-center space-x-4 mb-6">
          <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white border-2 border-blue-400">
            A
          </div>
          <div>
            <div className="text-white text-xl font-semibold">anth</div>
            <div className="text-gray-400 text-sm">Click to edit</div>
          </div>
        </div>

        {/* Stakes */}
        <div className="flex space-x-3 mb-6">
          <button 
            onClick={() => setGameStake('FREE')}
            className={`px-6 py-3 rounded-xl font-bold ${gameStake === 'FREE' ? 'bg-cyan-400 text-black' : 'bg-gray-700 text-white'}`}
          >
            FREE
          </button>
          <button 
            onClick={() => setGameStake('1')}
            className={`px-6 py-3 rounded-xl font-bold ${gameStake === '1' ? 'bg-cyan-400 text-black' : 'bg-gray-700 text-white'}`}
          >
            $1
          </button>
          <button 
            onClick={() => setGameStake('5')}
            className={`px-6 py-3 rounded-xl font-bold ${gameStake === '5' ? 'bg-cyan-400 text-black' : 'bg-gray-700 text-white'}`}
          >
            $5
          </button>
          <button 
            onClick={() => setGameStake('20')}
            className={`px-6 py-3 rounded-xl font-bold ${gameStake === '20' ? 'bg-cyan-400 text-black' : 'bg-gray-700 text-white'}`}
          >
            $20
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 px-6 py-3 bg-cyan-500/20 border border-cyan-400/40 rounded-xl">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-cyan-300 font-medium">🌍 Connected to Global Servers with Players Worldwide</span>
          </div>
        </div>

        {/* Main Button */}
        <button 
          onClick={handleJoinMultiplayer}
          className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-black py-6 px-16 rounded-2xl text-2xl transition-all hover:scale-105 shadow-2xl border-2 border-cyan-300 mb-6"
        >
          🌍 JOIN GLOBAL MULTIPLAYER
        </button>

        {/* Secondary Buttons */}
        <div className="flex space-x-6">
          <button className="px-8 py-4 bg-purple-600/30 border border-purple-500/50 rounded-2xl font-bold text-purple-300 hover:scale-105 transition-all">
            🌐 Server Browser
          </button>
          <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white hover:scale-105 transition-all">
            🔗 Join Discord
          </button>
        </div>
      </div>

      {/* Left Panel - Leaderboard */}
      <div className="absolute left-6 top-80 w-64 z-40">
        <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold">🏆</span>
            </div>
            <h3 className="text-white font-bold text-lg">Leaderboard</h3>
            <span className="ml-auto px-2 py-1 bg-green-500/30 text-green-400 text-xs rounded-full">Live</span>
          </div>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-gray-400 mb-2">No players yet</div>
            <div className="text-gray-500 text-sm">Be the first to claim cash and appear on the leaderboard.</div>
          </div>
          <button className="w-full py-3 bg-yellow-600/30 border border-yellow-500/50 rounded-xl text-yellow-300 font-bold hover:scale-105 transition-all">
            View Full Leaderboard
          </button>
        </div>
      </div>

      {/* Right Panel - Wallet */}
      <div className="absolute right-6 top-80 w-56 z-40">
        <div className="bg-gray-900/80 rounded-2xl border border-cyan-400/30 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold">💰</span>
            </div>
            <h3 className="text-white font-bold text-lg">Wallet</h3>
          </div>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="text-3xl font-black text-white">$25.00</div>
              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xs">$</span>
              </div>
            </div>
            <div className="text-gray-400">Game Balance</div>
          </div>
          <div className="space-y-3">
            <button className="w-full py-3 bg-green-600/30 border border-green-500/50 rounded-xl text-green-300 font-bold hover:scale-105 transition-all flex items-center justify-center gap-2">
              Add Funds
              <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xs">$</span>
              </div>
            </button>
            <button className="w-full py-3 bg-blue-600/30 border border-blue-500/50 rounded-xl text-blue-300 font-bold hover:scale-105 transition-all">
              Cash Out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left Panel - Friends */}
      <div className="absolute left-6 bottom-6 w-64 z-40">
        <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold">👥</span>
            </div>
            <h3 className="text-white font-bold text-lg">Friends</h3>
            <span className="ml-auto px-2 py-1 bg-cyan-500/30 text-cyan-400 text-xs rounded-full">0 Refresh</span>
          </div>
          <div className="text-center py-6">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-gray-400 mb-1">No friends yet</div>
            <div className="text-gray-500 text-sm">Add friends to see them here.</div>
          </div>
          <button className="w-full py-3 bg-purple-600/30 border border-purple-500/50 rounded-xl text-purple-300 font-bold hover:scale-105 transition-all">
            Add Friends
          </button>
        </div>
      </div>

      {/* Bottom Right Panel - Customize */}
      <div className="absolute right-6 bottom-6 w-56 z-40">
        <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🎨</span>
            </div>
            <h3 className="text-white font-bold text-lg">Customize</h3>
          </div>
          <div className="text-center mb-4">
            <div className="w-20 h-20 mx-auto mb-3 bg-blue-500 rounded-full flex items-center justify-center border-2 border-blue-400 text-white text-2xl font-bold relative">
              A
              <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-6"></div>
              <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-6"></div>
            </div>
            <div className="text-gray-400 text-sm">Your Character</div>
          </div>
          <button className="w-full py-3 bg-purple-600/30 border border-purple-500/50 rounded-xl text-purple-300 font-bold hover:scale-105 transition-all">
            Change Appearance
          </button>
        </div>
      </div>
    </div>
  )
}