'use client'

export default function SimpleHome() {
  return (
    <div className="min-h-screen w-full text-white relative flex flex-col bg-black" style={{
      background: 'linear-gradient(to bottom right, rgb(0, 0, 0), rgb(17, 24, 39), rgb(0, 0, 0))',
      minHeight: '100dvh'
    }}>
      
      {/* Top Region Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center justify-center px-4 py-2 space-x-2">
          {/* COINS Display */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-xs">$</span>
            </div>
            <span className="text-yellow-400 font-bold text-sm">COINS</span>
          </div>
          
          {/* Region Buttons */}
          <button className="px-3 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 border bg-teal-700/80 text-teal-200 border-teal-600 hover:bg-teal-600">
            OCEANIA
          </button>
          <button className="px-3 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 border bg-blue-700/80 text-blue-200 border-blue-600 hover:bg-blue-600">
            ASIA EAST
          </button>
          <button className="px-3 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 border bg-orange-700/80 text-orange-200 border-orange-600 hover:bg-orange-600">
            US EAST
          </button>
          <button className="px-3 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 border bg-green-700/80 text-green-200 border-green-600 hover:bg-green-600">
            US WEST
          </button>
          <button className="px-3 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 border bg-purple-700/80 text-purple-200 border-purple-600 hover:bg-purple-600">
            EUROPE
          </button>
          
          {/* LOGIN Button */}
          <button className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all hover:scale-105">
            LOGIN
          </button>
        </div>
      </div>

      {/* Add top padding to account for fixed navigation */}
      <div className="pt-16"></div>

      {/* Grid Background */}
      <div className="absolute inset-0 opacity-25">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0, 245, 255, 0.6)" strokeWidth="1.5"></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"></rect>
        </svg>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-40 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex flex-col pt-4 sm:pt-8 pb-4 sm:pb-20">
          
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-3">
              <span className="text-white">TURF</span>
              <span className="text-yellow-400">LOOT</span>
            </h1>
            <p className="text-gray-400 text-lg font-bold tracking-wide">SKILL-BASED GRID DOMINATION</p>
          </div>

          {/* Main Game Area */}
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 max-w-5xl mx-auto space-y-6 lg:space-y-0 flex-1">
            
            {/* Left Panels */}
            <div className="lg:col-span-3 space-y-4">
              {/* Leaderboard */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">🏆</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Leaderboard</h3>
                </div>
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="text-gray-400 text-sm">No players yet</div>
                </div>
              </div>

              {/* Friends */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">👥</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Friends</h3>
                </div>
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-gray-400 text-sm">No friends yet</div>
                </div>
              </div>
            </div>

            {/* Center - Main Game */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              
              {/* Stats */}
              <div className="flex justify-center space-x-12">
                <div className="text-center">
                  <div className="text-4xl font-black text-yellow-400 mb-1">0</div>
                  <div className="text-gray-400 text-sm font-medium">Players in Game</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-yellow-400 mb-1">$0</div>
                  <div className="text-gray-400 text-sm font-medium">Global Winnings</div>
                </div>
              </div>

              {/* Player Avatar */}
              <div className="flex justify-center">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl px-8 py-5 border border-gray-700/50 flex items-center space-x-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                    ?
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-xl font-semibold">Click to set name</span>
                    <span className="text-gray-400 text-sm font-medium">Choose your display name</span>
                  </div>
                </div>
              </div>

              {/* Stakes */}
              <div className="flex justify-center space-x-3">
                <button className="px-4 py-2 rounded-xl font-bold text-sm bg-cyan-400 text-black border-2 border-cyan-300">
                  FREE
                </button>
                <button className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-white border border-gray-600">
                  $1
                </button>
                <button className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-white border border-gray-600">
                  $5
                </button>
                <button className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-white border border-gray-600">
                  $20
                </button>
              </div>

              {/* Main Join Button */}
              <div className="flex justify-center">
                <button className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-black py-6 px-16 rounded-2xl text-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-2 border-cyan-300">
                  🌍 JOIN GLOBAL MULTIPLAYER
                </button>
              </div>

              {/* Secondary Buttons */}
              <div className="flex justify-center space-x-4">
                <button className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-2xl font-bold text-purple-400 transition-all hover:scale-105">
                  🌐 Server Browser
                </button>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white transition-all hover:scale-105">
                  🔗 Join Discord
                </button>
              </div>
            </div>

            {/* Right Panels */}
            <div className="lg:col-span-3 space-y-4">
              {/* Wallet */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-cyan-400/20 p-4 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-6 h-6 bg-cyan-400 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-black">💰</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Wallet</h3>
                </div>
                <div className="text-center py-4">
                  <div className="text-3xl font-black text-white mb-2">$0.00</div>
                  <div className="text-gray-400 text-sm">Game Balance</div>
                </div>
              </div>

              {/* Customize */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🎨</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Customize</h3>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-blue-600 flex items-center justify-center relative">
                    <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-6"></div>
                    <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-6"></div>
                  </div>
                  <div className="text-gray-400 text-xs mb-3">Your Character</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}