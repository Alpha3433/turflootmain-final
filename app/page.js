'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootLanding() {
  const router = useRouter()
  const [selectedStake, setSelectedStake] = useState('FREE')
  const [liveStats, setLiveStats] = useState({ players: 0, winnings: 0 })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    // Simulate live stats updates
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        players: Math.floor(Math.random() * 25),
        winnings: Math.floor(Math.random() * 1000)
      }))
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  const handleJoinGame = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  const stakes = [
    { value: 'FREE', label: 'FREE', color: 'emerald' },
    { value: '1', label: '$1', color: 'blue' },
    { value: '5', label: '$5', color: 'purple' },
    { value: '20', label: '$20', color: 'orange' }
  ]

  return (
    <div className="min-h-screen bg-gradient-slate text-white overflow-hidden relative">
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
      </div>

      {/* Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-4 h-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-60 animate-float-${i % 3}`}
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6">
        <div className={`transition-all duration-1000 ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
          <span className="text-lg font-medium text-slate-300">Welcome back, anth</span>
        </div>
        
        <div className={`flex items-center gap-3 transition-all duration-1000 delay-200 ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Global Servers</span>
          </div>
          <button className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 hover:bg-slate-700/50 transition-colors">
            <span className="text-sm font-medium">Login</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        
        {/* Title Section */}
        <div className={`text-center mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h1 className="text-7xl font-black mb-4 text-gradient">
            TURF<span style={{color: '#10b981'}}>LOOT</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium tracking-wide">
            Skill-Based Grid Domination
          </p>
        </div>

        {/* Live Stats */}
        <div className={`flex gap-12 mb-8 transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400 mb-1 transition-all duration-500">
              {liveStats.players}
            </div>
            <div className="text-sm text-slate-500 uppercase tracking-wide">Players Online</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400 mb-1 transition-all duration-500">
              ${liveStats.winnings}
            </div>
            <div className="text-sm text-slate-500 uppercase tracking-wide">Total Winnings</div>
          </div>
        </div>

        {/* Stake Selection */}
        <div className={`flex gap-3 mb-8 transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {stakes.map((stake) => (
            <button
              key={stake.value}
              onClick={() => setSelectedStake(stake.value)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 ${
                selectedStake === stake.value
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-800/50 backdrop-blur border border-slate-700 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {stake.label}
            </button>
          ))}
        </div>

        {/* Main CTA Button */}
        <div className={`mb-8 transition-all duration-1000 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button
            onClick={handleJoinGame}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold py-4 px-12 rounded-2xl text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/25 relative overflow-hidden group"
          >
            <span className="relative z-10">🌍 JOIN GLOBAL MULTIPLAYER</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className={`flex gap-4 transition-all duration-1000 delay-1100 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button className="bg-slate-800/50 backdrop-blur border border-slate-700 text-slate-300 px-6 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-300 hover:scale-105">
            🎮 Server Browser
          </button>
          <button className="bg-slate-800/50 backdrop-blur border border-slate-700 text-slate-300 px-6 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-300 hover:scale-105">
            💬 Discord
          </button>
        </div>
      </main>

      {/* Side Panels */}
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Leaderboard Panel */}
        <div className={`absolute left-6 top-1/2 -translate-y-1/2 w-64 pointer-events-auto transition-all duration-1000 delay-1300 ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                🏆
              </div>
              <h3 className="text-lg font-semibold">Leaderboard</h3>
              <div className="ml-auto w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎯</div>
              <div className="text-slate-400 text-sm mb-2">No champions yet</div>
              <div className="text-slate-500 text-xs">Be the first to claim victory</div>
            </div>
            <button className="w-full bg-slate-800/50 border border-slate-700 text-slate-300 py-3 rounded-xl hover:bg-slate-700/50 transition-colors text-sm font-medium">
              View Rankings
            </button>
          </div>
        </div>

        {/* Wallet Panel */}
        <div className={`absolute right-6 top-1/2 -translate-y-1/2 w-64 pointer-events-auto transition-all duration-1000 delay-1500 ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                💎
              </div>
              <h3 className="text-lg font-semibold">Wallet</h3>
            </div>
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-emerald-400 mb-1">$25.00</div>
              <div className="text-slate-500 text-sm">Available Balance</div>
            </div>
            <div className="space-y-3">
              <button className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl hover:bg-emerald-500/30 transition-colors text-sm font-medium">
                Add Funds
              </button>
              <button className="w-full bg-slate-800/50 border border-slate-700 text-slate-300 py-3 rounded-xl hover:bg-slate-700/50 transition-colors text-sm font-medium">
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes float-0 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes float-1 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
          50% { 
            transform: translateY(-15px) rotate(-180deg);
            opacity: 1;
          }
        }
        
        @keyframes float-2 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.5;
          }
          50% { 
            transform: translateY(-25px) rotate(90deg);
            opacity: 1;
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.5); }
          50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.8); }
        }
        
        .animate-float-0 { animation: float-0 6s ease-in-out infinite; }
        .animate-float-1 { animation: float-1 8s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 7s ease-in-out infinite; }
        
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        .glow-effect {
          animation: glow 3s ease-in-out infinite;
        }

        /* Ensure proper gradient rendering */
        .bg-gradient-slate {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        }
        
        .bg-gradient-emerald {
          background: linear-gradient(135deg, #10b981 0%, #06d6a0 100%);
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  )
}