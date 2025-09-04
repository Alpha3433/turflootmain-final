'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootHome() {
  const router = useRouter()
  const [gameStake, setGameStake] = useState('FREE')

  const handleJoinMultiplayer = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-30">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0, 255, 255, 0.3)" strokeWidth="1"></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"></rect>
        </svg>
      </div>

      {/* Welcome Message */}
      <div className="absolute top-4 left-6 z-50">
        <span className="text-white text-lg font-medium">Welcome, anth!</span>
      </div>

      {/* Top Navigation Bar */}
      <div className="absolute top-4 right-6 z-50 flex items-center space-x-2">
        {/* COINS */}
        <div className="flex items-center space-x-1 bg-yellow-600/80 px-3 py-2 rounded-lg border border-yellow-500">
          <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-black text-xs font-bold">$</span>
          </div>
          <span className="text-yellow-100 font-bold text-sm">COINS</span>
        </div>

        {/* Region Buttons */}
        <button className="px-3 py-2 bg-teal-600 text-white font-bold text-xs rounded-lg border border-teal-500">
          OCEANIA
        </button>
        <button className="px-3 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg border border-blue-500">
          ASIA EAST  
        </button>
        <button className="px-3 py-2 bg-orange-600 text-white font-bold text-xs rounded-lg border border-orange-500">
          US WEST
        </button>
        <button className="px-3 py-2 bg-orange-700 text-white font-bold text-xs rounded-lg border border-orange-600">
          US EAST
        </button>
        <button className="px-3 py-2 bg-purple-600 text-white font-bold text-xs rounded-lg border border-purple-500">
          EUROPE
        </button>
        <button className="px-3 py-2 bg-red-600 text-white font-bold text-xs rounded-lg border border-red-500">
          GLOBAL
        </button>
        <button className="px-3 py-2 bg-red-700 text-white font-bold text-xs rounded-lg border border-red-600">
          LOGIN
        </button>
      </div>

      {/* Warning Message */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center space-x-2 text-yellow-400 text-sm">
          <span>⚠️</span>
          <span>Artificial prices are determined solely by player skill. Play responsibly.</span>
        </div>
      </div>

      {/* Floating Game Elements */}
      
      {/* Floating Coins */}
      <div className="absolute top-20 left-12 z-20">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
          <span className="text-black font-black text-lg">$</span>
        </div>
      </div>
      
      <div className="absolute top-32 right-20 z-20">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-bounce" style={{animationDelay: '1s'}}>
          <span className="text-black font-black text-base">$</span>
        </div>
      </div>
      
      <div className="absolute bottom-32 left-20 z-20">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-bounce" style={{animationDelay: '2s'}}>
          <span className="text-black font-black text-base">$</span>
        </div>
      </div>

      <div className="absolute bottom-20 right-32 z-20">
        <div className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-bounce" style={{animationDelay: '0.5s'}}>
          <span className="text-black font-black text-sm">$</span>
        </div>
      </div>

      {/* Floating Player Circles */}
      <div className="absolute top-40 left-32 z-20">
        <div className="w-16 h-16 bg-cyan-400 rounded-full flex items-center justify-center shadow-xl animate-pulse">
          <div className="w-2 h-2 bg-black rounded-full absolute top-4 left-5"></div>
          <div className="w-2 h-2 bg-black rounded-full absolute top-4 right-5"></div>
        </div>
      </div>

      <div className="absolute bottom-48 left-8 z-20">
        <div className="w-20 h-20 bg-pink-400 rounded-full flex items-center justify-center shadow-xl animate-pulse" style={{animationDelay: '1s'}}>
          <div className="w-2 h-2 bg-black rounded-full absolute top-6 left-6"></div>
          <div className="w-2 h-2 bg-black rounded-full absolute top-6 right-6"></div>
        </div>
      </div>

      <div className="absolute bottom-80 right-12 z-20">
        <div className="w-14 h-14 bg-red-400 rounded-full flex items-center justify-center shadow-xl animate-pulse" style={{animationDelay: '1.5s'}}>
          <div className="w-2 h-2 bg-black rounded-full absolute top-3 left-4"></div>
          <div className="w-2 h-2 bg-black rounded-full absolute top-3 right-4"></div>
        </div>
      </div>

      <div className="absolute bottom-96 right-40 z-20">
        <div className="w-18 h-18 bg-blue-500 rounded-full flex items-center justify-center shadow-xl animate-pulse" style={{animationDelay: '0.7s'}}>
          <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-5"></div>
          <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-5"></div>
        </div>
      </div>

      {/* Floating Virus/Spikes */}
      <div className="absolute top-80 right-48 z-20">
        <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center shadow-xl relative animate-spin" style={{animationDuration: '4s'}}>
          <div className="absolute inset-0 rounded-full bg-green-400"></div>
          <div className="absolute -top-2 left-1/2 w-1 h-4 bg-green-500 transform -translate-x-1/2 rotate-0"></div>
          <div className="absolute -right-2 top-1/2 w-4 h-1 bg-green-500 transform -translate-y-1/2 rotate-0"></div>
          <div className="absolute -bottom-2 left-1/2 w-1 h-4 bg-green-500 transform -translate-x-1/2 rotate-0"></div>
          <div className="absolute -left-2 top-1/2 w-4 h-1 bg-green-500 transform -translate-y-1/2 rotate-0"></div>
        </div>
      </div>

      <div className="absolute bottom-60 left-40 z-20">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl relative animate-spin" style={{animationDuration: '3s', animationDelay: '1s'}}>
          <div className="absolute inset-0 rounded-full bg-green-500"></div>
          <div className="absolute -top-1 left-1/2 w-1 h-3 bg-green-600 transform -translate-x-1/2"></div>
          <div className="absolute -right-1 top-1/2 w-3 h-1 bg-green-600 transform -translate-y-1/2"></div>
          <div className="absolute -bottom-1 left-1/2 w-1 h-3 bg-green-600 transform -translate-x-1/2"></div>
          <div className="absolute -left-1 top-1/2 w-3 h-1 bg-green-600 transform -translate-y-1/2"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-30 flex flex-col items-center justify-center min-h-screen px-8">
        
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-black tracking-tight mb-4">
            <span className="text-white">TURF</span>
            <span className="text-yellow-400">LOOT</span>
          </h1>
          <p className="text-gray-300 text-xl font-bold tracking-wide">SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center space-x-16 mb-8">
          <div className="text-center">
            <div className="text-5xl font-black text-yellow-400 mb-2">0</div>
            <div className="text-gray-400 text-sm font-medium">Players in Game</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black text-yellow-400 mb-2">$0</div>
            <div className="text-gray-400 text-sm font-medium">Global Player Winnings</div>
          </div>
        </div>

        {/* Player Avatar */}
        <div className="mb-8">
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-2xl px-8 py-6 border border-gray-600 flex items-center space-x-5">
            <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white border-2 border-blue-400">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-white text-2xl font-semibold">anth</span>
              <span className="text-gray-400 text-sm font-medium">Click to edit</span>
            </div>
          </div>
        </div>

        {/* Stakes */}
        <div className="flex justify-center space-x-4 mb-6">
          <button 
            onClick={() => setGameStake('FREE')}
            className={`px-6 py-3 rounded-xl font-bold text-base transition-all hover:scale-105 ${
              gameStake === 'FREE' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-500'
            }`}
          >
            FREE
          </button>
          <button 
            onClick={() => setGameStake('1')}
            className={`px-6 py-3 rounded-xl font-bold text-base transition-all hover:scale-105 ${
              gameStake === '1' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-500'
            }`}
          >
            $1
          </button>
          <button 
            onClick={() => setGameStake('5')}
            className={`px-6 py-3 rounded-xl font-bold text-base transition-all hover:scale-105 ${
              gameStake === '5' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-500'
            }`}
          >
            $5
          </button>
          <button 
            onClick={() => setGameStake('20')}
            className={`px-6 py-3 rounded-xl font-bold text-base transition-all hover:scale-105 ${
              gameStake === '20' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-500'
            }`}
          >
            $20
          </button>
        </div>

        {/* Connection Status */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-cyan-500/20 border border-cyan-400/40 rounded-xl">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-cyan-300 font-medium text-base">
              🌍 Connected to Global Servers with Players Worldwide
            </span>
          </div>
        </div>

        {/* Main Join Button */}
        <div className="mb-8">
          <button 
            onClick={handleJoinMultiplayer}
            className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-black py-6 px-20 rounded-2xl text-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-2 border-cyan-300"
          >
            🌍 JOIN GLOBAL MULTIPLAYER
          </button>
        </div>

        {/* Secondary Buttons */}
        <div className="flex justify-center space-x-6">
          <button className="px-8 py-4 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-2xl font-bold text-purple-300 transition-all hover:scale-105 text-base">
            🌐 Server Browser
          </button>
          <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white transition-all hover:scale-105 shadow-lg text-base">
            🔗 Join Discord
          </button>
        </div>
      </div>

      {/* Left Panel - Leaderboard */}
      <div className="absolute left-6 top-80 w-72 z-40">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700/60 p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">🏆</span>
            </div>
            <h3 className="text-white font-bold text-xl">Leaderboard</h3>
            <div className="ml-auto">
              <span className="px-2 py-1 bg-green-500/30 text-green-400 text-xs rounded-full font-medium border border-green-500/50">Live</span>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-gray-400 text-base mb-2">No players yet</div>
            <div className="text-gray-500 text-sm">Be the first to claim cash and appear on</div>
            <div className="text-gray-500 text-sm">the leaderboard.</div>
          </div>
          <button className="w-full py-4 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50 rounded-xl text-yellow-300 font-bold transition-all hover:scale-105 text-base">
            View Full Leaderboard
          </button>
        </div>
      </div>

      {/* Right Panel - Wallet */}
      <div className="absolute right-6 top-80 w-64 z-40">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-cyan-400/30 p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">💰</span>
            </div>
            <h3 className="text-white font-bold text-xl">Wallet</h3>
          </div>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="text-4xl font-black text-white">$25.00</div>
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xs">$</span>
              </div>
            </div>
            <div className="text-gray-400 text-base">Game Balance</div>
          </div>
          <div className="space-y-4">
            <button className="w-full py-4 bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 rounded-xl text-green-300 font-bold transition-all hover:scale-105 text-base flex items-center justify-center gap-2">
              Add Funds
              <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xs">$</span>
              </div>
            </button>
            <button className="w-full py-4 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 rounded-xl text-blue-300 font-bold transition-all hover:scale-105 text-base">
              Cash Out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left Panel - Friends */}
      <div className="absolute left-6 bottom-6 w-72 z-40">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700/60 p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">👥</span>
            </div>
            <h3 className="text-white font-bold text-xl">Friends</h3>
            <div className="ml-auto">
              <span className="px-2 py-1 bg-cyan-500/30 text-cyan-400 text-xs rounded-full font-medium border border-cyan-500/50">0 Refresh</span>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👥</div>
            <div className="text-gray-400 text-base mb-2">No friends yet</div>
            <div className="text-gray-500 text-sm">Add friends to see them here.</div>
          </div>
          <button className="w-full py-4 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-xl text-purple-300 font-bold transition-all hover:scale-105 text-base">
            Add Friends
          </button>
        </div>
      </div>

      {/* Bottom Right Panel - Customize */}
      <div className="absolute right-6 bottom-6 w-64 z-40">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700/60 p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🎨</span>
            </div>
            <h3 className="text-white font-bold text-xl">Customize</h3>
          </div>
          <div className="text-center mb-6">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center border-3 border-blue-400 text-white text-3xl font-bold relative">
                A
                <div className="w-3 h-3 bg-black rounded-full absolute top-6 left-7"></div>
                <div className="w-3 h-3 bg-black rounded-full absolute top-6 right-7"></div>
              </div>
            </div>
            <div className="text-gray-400 text-sm mb-4">Your Character</div>
          </div>
          <button className="w-full py-4 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-xl text-purple-300 font-bold transition-all hover:scale-105 text-base">
            Change Appearance
          </button>
        </div>
      </div>

      {/* Top right corner streak indicator */}
      <div className="absolute top-96 right-8 z-30">
        <div className="bg-gray-900/70 px-4 py-2 rounded-lg border border-gray-600">
          <span className="text-yellow-400 text-sm font-bold">Streak: 0</span>
        </div>
      </div>
    </div>
  )
}