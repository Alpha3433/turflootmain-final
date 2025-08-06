'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Wallet, Trophy, Users, Copy, RefreshCw } from 'lucide-react'

const HeroContent = ({ 
  selectedStake, 
  setSelectedStake, 
  isConnected, 
  handleWalletConnect,
  setShowLoginModal,
  balance = 0,
  userProfile = null
}) => {
  const stakeAmounts = [1, 5, 20, 50]

  // Mock data - in real app this would come from props
  const leaderboardData = [
    { rank: 1, name: 'TL', winnings: 1520.05 },
    { rank: 2, name: 'RageStreet', winnings: 1316.12 },
    { rank: 3, name: 'Xzibit', winnings: 1062.78 }
  ]

  const globalStats = {
    playersInGame: 42,
    globalWinnings: 77010
  }

  return (
    <div className="relative z-20 h-full flex flex-col pointer-events-none">
      {/* Top Header */}
      <header className="flex items-center justify-between p-6 pointer-events-auto">
        <div className="flex items-center space-x-3">
          <div className="text-orange-400 text-lg">🔥</div>
          <span className="text-lg font-medium text-white">
            Welcome, {isConnected && userProfile ? userProfile.username : 'player'}!
          </span>
        </div>
        <Button 
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 rounded-lg"
          onClick={() => setShowLoginModal(true)}
        >
          {isConnected ? 'Profile' : 'Login'}
        </Button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-8 pointer-events-none">
        <div className="w-full max-w-7xl grid grid-cols-12 gap-8 items-center pointer-events-none">
          
          {/* Left Section - Leaderboard */}
          <div className="col-span-3 pointer-events-auto">
            <Card className="bg-black/40 backdrop-blur-sm border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-white">Leaderboard</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-500">Live</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {leaderboardData.map((player) => (
                    <div key={player.rank} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-500 font-bold w-3">{player.rank}.</span>
                        <span className="text-white">{player.name}</span>
                      </div>
                      <span className="text-yellow-500 font-semibold">${player.winnings.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur-sm border-blue-500/30 mt-4">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white">Friends</span>
                  <span className="text-xs text-gray-400">0 playing</span>
                </div>
                <div className="text-center py-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">👤</span>
                  </div>
                  <p className="text-xs text-gray-500">No friends... add some!</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Section - Main Game */}
          <div className="col-span-6 text-center space-y-8 pointer-events-auto">
            {/* Branding */}
            <div className="space-y-4">
              <h1 className="text-6xl font-black tracking-wider leading-tight">
                <span className="text-white">TURF</span><span className="text-[#14F195]">LOOT</span>
              </h1>
              <p className="text-xl font-bold text-[#14F195] tracking-wide">
                SKILL-BASED TERRITORY BATTLES
              </p>
            </div>

            {/* Interactive hint */}
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-[#14F195]/30 inline-block">
              <p className="text-sm text-gray-300">
                🎮 <span className="text-[#14F195] font-semibold">Move your mouse</span> to paint the grid!
              </p>
            </div>

            {/* Stake Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                {stakeAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedStake === amount ? "default" : "outline"}
                    className={`w-16 h-12 font-bold text-lg transition-all ${
                      selectedStake === amount 
                        ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg" 
                        : "border-yellow-500/50 bg-black/40 backdrop-blur-sm text-yellow-500 hover:bg-yellow-500/20"
                    }`}
                    onClick={() => setSelectedStake(amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>

              {/* Main CTA */}
              <Button 
                className="w-80 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-xl tracking-wide shadow-xl transform hover:scale-105 transition-all duration-200"
                disabled={!isConnected}
              >
                <Play className="w-6 h-6 mr-3" />
                {isConnected ? 'JOIN GAME' : 'LOGIN TO PLAY'}
              </Button>
            </div>

            {/* Additional Actions */}
            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline"
                className="border-gray-600 bg-black/40 backdrop-blur-sm text-gray-300 hover:bg-gray-700"
              >
                🎯 UB
              </Button>
              <Button 
                variant="outline"
                className="border-gray-600 bg-black/40 backdrop-blur-sm text-gray-300 hover:bg-gray-700"
              >
                🎮 Browse Lobbies
              </Button>
            </div>
          </div>

          {/* Right Section - Wallet */}
          <div className="col-span-3">
            <Card className="bg-black/40 backdrop-blur-sm border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-green-400" />
                    <span className="font-bold text-white">Wallet</span>
                  </div>
                  {isConnected && (
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="p-1 text-gray-400 hover:text-white">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 text-gray-400 hover:text-white">
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-yellow-500">
                    ${isConnected ? (balance * 200).toFixed(2) : '0.00'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {isConnected ? `${balance.toFixed(4)} SOL` : '0.0000 SOL'}
                  </div>
                </div>

                {isConnected ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="bg-green-600 hover:bg-green-500 text-white text-sm h-10">
                      Add Funds
                    </Button>
                    <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/20 text-sm h-10">
                      Cash Out
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white font-bold h-10"
                    onClick={handleWalletConnect}
                  >
                    Connect Wallet
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur-sm border-purple-500/30 mt-4">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="font-bold text-white">Customize</span>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 text-xs h-8">
                    👑 Daily Crate
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 text-xs h-8">
                    💎 Affiliate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="p-6">
        <div className="flex items-center justify-center space-x-16 text-center">
          <div>
            <div className="text-3xl font-bold text-yellow-500">{globalStats.playersInGame}</div>
            <div className="text-sm text-gray-400">Players in Game</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-500">${globalStats.globalWinnings.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Global Player Winnings</div>
          </div>
        </div>
      </div>

      {/* Discord Button */}
      <Button className="absolute bottom-6 left-6 bg-indigo-600 hover:bg-indigo-500 text-white" size="sm">
        🎮 Join Discord!
      </Button>
    </div>
  )
}

export default HeroContent