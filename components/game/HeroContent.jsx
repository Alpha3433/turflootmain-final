'use client'

import { Button } from '@/components/ui/button'
import { Play, Wallet } from 'lucide-react'

const HeroContent = ({ 
  selectedStake, 
  setSelectedStake, 
  isConnected, 
  handleWalletConnect,
  setShowLoginModal 
}) => {
  const stakeAmounts = [1, 5, 20, 50]

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 text-center">
      {/* Main branding */}
      <div className="space-y-6 mb-12">
        <div className="relative">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-wider leading-tight">
            <span className="text-white drop-shadow-2xl">TURF</span>
            <span className="text-[#14F195] drop-shadow-2xl">LOOT</span>
          </h1>
          <p className="text-xl md:text-2xl font-bold text-[#14F195] tracking-wide mt-4 drop-shadow-lg">
            SKILL-BASED TERRITORY BATTLES
          </p>
        </div>
        
        {/* Interactive hint */}
        <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-[#14F195]/30">
          <p className="text-sm md:text-base text-gray-300">
            🎮 <span className="text-[#14F195] font-semibold">Move your mouse</span> to paint the grid - just like in the game!
          </p>
        </div>
      </div>

      {/* Game stats teaser */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-2xl font-bold text-[#14F195]">50×50</div>
          <div className="text-xs text-gray-400">Grid Size</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-2xl font-bold text-[#14F195]">4sec</div>
          <div className="text-xs text-gray-400">Trail Life</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-2xl font-bold text-[#14F195]">Real</div>
          <div className="text-xs text-gray-400">SOL Prizes</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-2xl font-bold text-[#14F195]">Live</div>
          <div className="text-xs text-gray-400">Multiplayer</div>
        </div>
      </div>

      {/* Stake selection */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        <span className="text-lg font-semibold mr-4 text-white drop-shadow-lg">Select Stake:</span>
        {stakeAmounts.map((amount) => (
          <Button
            key={amount}
            variant={selectedStake === amount ? "default" : "outline"}
            className={`w-16 h-12 font-bold text-lg transition-all transform hover:scale-105 ${
              selectedStake === amount 
                ? "bg-[#14F195] hover:bg-[#14F195]/90 text-black shadow-lg shadow-[#14F195]/30" 
                : "border-[#14F195]/50 bg-black/40 backdrop-blur-sm text-[#14F195] hover:bg-[#14F195]/20 hover:border-[#14F195]"
            }`}
            onClick={() => setSelectedStake(amount)}
          >
            ${amount}
          </Button>
        ))}
      </div>

      {/* Main CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {isConnected ? (
          <Button 
            className="w-80 h-16 bg-gradient-to-r from-[#14F195] to-emerald-400 hover:from-[#14F195]/90 hover:to-emerald-400/90 text-black font-black text-xl tracking-wide shadow-xl shadow-[#14F195]/40 transform hover:scale-105 transition-all duration-200"
          >
            <Play className="w-6 h-6 mr-3" />
            JOIN GAME - ${selectedStake}
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              className="w-80 h-16 bg-gradient-to-r from-[#14F195] to-emerald-400 hover:from-[#14F195]/90 hover:to-emerald-400/90 text-black font-black text-xl tracking-wide shadow-xl shadow-[#14F195]/40 transform hover:scale-105 transition-all duration-200"
              onClick={handleWalletConnect}
            >
              <Wallet className="w-6 h-6 mr-3" />
              CONNECT WALLET
            </Button>
            <Button 
              variant="outline"
              className="w-80 h-16 border-2 border-white/30 bg-black/40 backdrop-blur-sm text-white font-bold text-lg hover:bg-white/10 hover:border-white/50 transform hover:scale-105 transition-all duration-200"
              onClick={() => setShowLoginModal(true)}
            >
              LOGIN WITH EMAIL
            </Button>
          </div>
        )}
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-300">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse"></div>
          <span>100% Skill-Based</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse"></div>
          <span>Instant SOL Payouts</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse"></div>
          <span>Real-Time Multiplayer</span>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full relative">
          <div className="w-1 h-3 bg-white/50 rounded-full absolute top-2 left-1/2 transform -translate-x-1/2 animate-pulse"></div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Scroll for more</p>
      </div>
    </div>
  )
}

export default HeroContent