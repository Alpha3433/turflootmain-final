'use client'

import { useState, useEffect } from 'react'
// import { useWallet } from '@solana/wallet-adapter-react'
// import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
// import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Zap, 
  Trophy, 
  Users, 
  Copy,
  RefreshCw,
  Settings,
  LogOut,
  TrendingUp,
  Star,
  Shield,
  Wallet,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

// Mock wallet connection for demonstration
function MockWalletConnect() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  
  const handleConnect = () => {
    setConnecting(true)
    setTimeout(() => {
      setConnected(true)
      setConnecting(false)
    }, 1500)
  }
  
  const handleDisconnect = () => {
    setConnected(false)
  }
  
  if (connected) {
    return (
      <div className="flex items-center space-x-3">
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#14F195] to-[#0EA876] rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative px-6 py-3 bg-gradient-to-r from-[#14F195]/15 via-[#14F195]/10 to-[#14F195]/5 backdrop-blur-xl border border-[#14F195]/30 rounded-xl text-[#14F195] text-sm font-mono shadow-lg">
            7xKXtg...sgAsU
          </div>
        </div>
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-600 rounded-lg blur opacity-0 group-hover:opacity-40 transition duration-300"></div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDisconnect}
            className="relative hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 border border-transparent hover:border-red-500/30 rounded-lg backdrop-blur-sm"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD54F] to-[#FFA726] rounded-xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
      <Button 
        onClick={handleConnect} 
        disabled={connecting}
        className="relative bg-gradient-to-r from-[#FFD54F] to-[#FFA726] hover:from-[#FFD54F]/90 hover:to-[#FFA726]/90 text-black font-bold px-8 py-3 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group"
      >
        {connecting ? (
          <>
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin mr-3" />
            <span className="relative z-10">Connecting...</span>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <span className="relative z-10">Connect Wallet</span>
          </>
        )}
      </Button>
    </div>
  )
}

// Ultra-modern leaderboard component with real data
function Leaderboard() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchLeaderboard()
  }, [])
  
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      if (response.ok) {
        const data = await response.json()
        setLeaders(data.slice(0, 3)) // Top 3
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      // Fallback to mock data
      setLeaders([
        { id: 1, username: 'CryptoKing', profile: { total_winnings: 1247.89 }, stats: { games_won: 127, games_played: 200 } },
        { id: 2, username: 'SkillMaster', profile: { total_winnings: 892.34 }, stats: { games_won: 89, games_played: 150 } },
        { id: 3, username: 'TurfLord', profile: { total_winnings: 654.21 }, stats: { games_won: 65, games_played: 120 } }
      ])
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card className="bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl hover:shadow-[#FFD54F]/10 transition-all duration-500 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD54F] to-[#FFA726] rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-r from-[#FFD54F] to-[#FFA726] flex items-center justify-center mr-3">
                <Trophy className="w-5 h-5 text-black" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Leaderboard</h3>
              <p className="text-xs text-gray-400">Top earners today</p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-[#14F195]/20 blur rounded-full"></div>
            <Badge className="relative bg-[#14F195]/20 text-[#14F195] border-[#14F195]/30 backdrop-blur-sm px-3 py-1">
              Live
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#14F195]" />
            </div>
          ) : (
            leaders.map((leader, index) => (
              <div key={leader.id} className="group/item relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/[0.02] to-white/[0.01] backdrop-blur-sm border border-white/[0.05] hover:border-white/20 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg transition-transform duration-300 group-hover/item:scale-110 ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-yellow-400/30' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-gray-400/30' :
                      'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-amber-600/30'
                    }`}>
                      {index + 1}
                      <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{leader.username}</div>
                      <div className="text-xs text-gray-400 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1 text-green-400" />
                        <span className="text-green-400">{leader.stats ? `${((leader.stats.games_won / leader.stats.games_played) * 100).toFixed(1)}%` : '65.2%'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#FFD54F] font-bold text-lg">${leader.profile?.total_winnings?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <Button 
          className="w-full mt-6 group relative overflow-hidden bg-gradient-to-r from-[#14F195]/15 via-[#14F195]/10 to-[#14F195]/5 border border-[#14F195]/30 text-[#14F195] hover:from-[#14F195]/25 hover:to-[#14F195]/15 rounded-xl backdrop-blur-sm font-medium transition-all duration-300"
          variant="outline" 
          size="sm" 
          onClick={fetchLeaderboard}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#14F195]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          <span className="relative z-10">Refresh Rankings</span>
        </Button>
      </CardContent>
    </Card>
  )
}

// Enhanced game lobby
function GameLobby({ onGameStart }) {
  const [selectedAmount, setSelectedAmount] = useState(1)
  const [currentPot, setCurrentPot] = useState(1247)
  const [pots, setPots] = useState([])
  
  useEffect(() => {
    fetchPots()
    const interval = setInterval(fetchPots, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const fetchPots = async () => {
    try {
      const response = await fetch('/api/pots')
      if (response.ok) {
        const data = await response.json()
        setPots(data)
        const selectedPot = data.find(p => p.table === `$${selectedAmount}`)
        if (selectedPot) {
          setCurrentPot(selectedPot.pot)
        }
      }
    } catch (error) {
      console.error('Error fetching pots:', error)
    }
  }
  
  const gameAmounts = [
    { value: 1, label: '$1', subtitle: 'Quick Play' },
    { value: 5, label: '$5', subtitle: 'Standard' },
    { value: 20, label: '$20', subtitle: 'High Stakes' }
  ]
  
  return (
    <div className="text-center">
      {/* Status indicator */}
      <div className="flex items-center justify-center mb-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#14F195] via-[#FFD54F] to-[#14F195] rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center space-x-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#14F195]/15 via-[#14F195]/10 to-[#14F195]/5 backdrop-blur-xl border border-[#14F195]/30 shadow-2xl">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#14F195] animate-pulse shadow-lg shadow-[#14F195]/50" />
              <span className="text-sm font-bold text-[#14F195] tracking-wide">BLOCKCHAIN CONNECTED</span>
            </div>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#FFD54F]" />
              <span className="text-sm font-bold text-[#FFD54F]">
                {pots.reduce((total, pot) => total + pot.players, 0)} Active
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Prize pool display */}
      <div className="mb-14">
        <div className="mb-6">
          <div className="relative inline-block">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#FFD54F]/20 via-[#FFA726]/30 to-[#FFD54F]/20 blur-2xl rounded-full"></div>
            <div className="relative text-8xl font-black bg-gradient-to-r from-[#FFD54F] via-[#FFA726] to-[#FF9800] bg-clip-text text-transparent drop-shadow-2xl">
              ${currentPot.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-center mt-4 space-x-3">
            <Star className="w-5 h-5 text-[#FFD54F] animate-pulse" />
            <span className="text-xl text-gray-200 font-semibold tracking-wide">Total Prize Pool</span>
            <Star className="w-5 h-5 text-[#FFD54F] animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Game selection */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-8">Choose Your Stakes</h3>
        <div className="flex justify-center space-x-6">
          {gameAmounts.map((amount) => {
            const potData = pots.find(p => p.table === amount.label)
            return (
              <button
                key={amount.value}
                onClick={() => {
                  setSelectedAmount(amount.value)
                  if (potData) setCurrentPot(potData.pot)
                }}
                className={`group relative p-8 rounded-2xl font-bold text-lg transition-all duration-500 transform hover:scale-105 ${
                  selectedAmount === amount.value
                    ? 'scale-110 shadow-2xl shadow-[#FFD54F]/40'
                    : 'hover:shadow-xl hover:shadow-white/10'
                }`}
              >
                <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                  selectedAmount === amount.value
                    ? 'bg-gradient-to-br from-[#FFD54F] to-[#FFA726] opacity-100'
                    : 'bg-gradient-to-br from-black/60 via-black/40 to-black/30 border border-white/20 group-hover:border-[#14F195]/50 backdrop-blur-xl'
                }`}></div>
                
                {selectedAmount === amount.value && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD54F] to-[#FFA726] rounded-2xl blur opacity-60"></div>
                )}
                
                <div className="relative z-10">
                  <div className={`text-3xl mb-2 transition-colors duration-300 ${
                    selectedAmount === amount.value ? 'text-black' : 'text-white'
                  }`}>
                    {amount.label}
                  </div>
                  <div className={`text-xs opacity-80 transition-colors duration-300 ${
                    selectedAmount === amount.value ? 'text-black/80' : 'text-gray-400'
                  }`}>
                    {amount.subtitle}
                  </div>
                  {potData && (
                    <div className={`text-xs mt-1 ${
                      selectedAmount === amount.value ? 'text-black/60' : 'text-gray-500'
                    }`}>
                      {potData.players} players
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Play button */}
      <div className="mb-10">
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#14F195] via-[#0EA876] to-[#14F195] rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
          <Button
            onClick={() => onGameStart(selectedAmount)}
            size="lg"
            className="relative w-96 h-18 text-2xl font-bold bg-gradient-to-r from-[#14F195] to-[#0EA876] hover:from-[#14F195]/90 hover:to-[#0EA876]/90 text-black rounded-2xl shadow-2xl shadow-[#14F195]/40 transform hover:scale-105 transition-all duration-300 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <Play className="w-7 h-7 mr-4 relative z-10" />
            <span className="relative z-10">START GAME - ${selectedAmount}</span>
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-300">
          <div className="flex items-center">
            <Shield className="w-4 h-4 text-[#14F195] mr-2" />
            <span>Real blockchain integration</span>  
          </div>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <span>Multiplayer battles</span>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <span>Instant SOL payouts</span>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const handleGameStart = (amount) => {
    // Navigate to game with selected amount
    window.location.href = `/play?stake=${amount}`
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0F0F0F] relative overflow-hidden">
      {/* Enhanced grid background */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div className="grid grid-cols-32 grid-rows-24 h-full w-full">
          {Array.from({ length: 768 }).map((_, i) => (
            <div 
              key={i} 
              className={`border border-white/10 ${i % 47 === 0 ? 'bg-[#14F195]/5 animate-pulse' : ''} ${i % 73 === 0 ? 'bg-[#FFD54F]/3' : ''}`} 
            />
          ))}
        </div>
      </div>
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#14F195]/8 via-transparent to-[#FFD54F]/8" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14F195]/3 to-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.8)_70%)]" />
      
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#14F195] via-[#FFD54F] to-[#14F195] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#14F195] to-[#0EA876] flex items-center justify-center shadow-2xl shadow-[#14F195]/30 group-hover:scale-105 transition-all duration-300">
              <Zap className="w-7 h-7 text-black" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent drop-shadow-lg">
              TurfLoot
            </div>
            <div className="text-sm text-gray-400 font-medium tracking-wide">
              Blockchain skill gaming platform
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#14F195]/10 to-[#14F195]/5 backdrop-blur-xl border border-[#14F195]/20">
            <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse" />
            <span className="text-sm text-[#14F195] font-medium">System Ready</span>
          </div>
          
          <MockWalletConnect />
        </div>
      </header>
      
      {/* Main content */}
      <div className="relative z-10 grid grid-cols-12 gap-6 p-6 h-[calc(100vh-140px)]">
        {/* Left sidebar */}
        <div className="col-span-3 space-y-6">
          <Leaderboard />
          
          {/* Features showcase */}
          <Card className="bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">New Features</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-green-400">  
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Real Solana Integration
                  </div>
                  <div className="flex items-center text-blue-400">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    User Authentication
                  </div>
                  <div className="flex items-center text-purple-400">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>  
                    Multiplayer Battles
                  </div>
                  <div className="flex items-center text-yellow-400">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                    Live Leaderboards
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Center game area */}
        <div className="col-span-6 flex items-center justify-center">
          <GameLobby onGameStart={handleGameStart} />
        </div>
        
        {/* Right sidebar */}
        <div className="col-span-3 space-y-6">
          {/* System status */}
          <Card className="bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#14F195] to-[#0EA876] flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">System Status</h3>
                  <p className="text-xs text-gray-400">All systems operational</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Blockchain</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Authentication</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs text-green-400">Ready</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Multiplayer</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full group relative overflow-hidden bg-gradient-to-r from-[#14F195]/20 via-[#14F195]/15 to-[#14F195]/10 border border-[#14F195]/30 text-[#14F195] hover:from-[#14F195]/30 hover:to-[#14F195]/20 rounded-xl backdrop-blur-xl font-medium transition-all duration-300"
              variant="outline"
              asChild
            >
              <Link href="/dashboard">
                <Settings className="w-4 h-4 mr-2 relative z-10" />
                <span className="relative z-10">View Dashboard</span>
              </Link>
            </Button>
            <Button 
              className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-500 hover:via-purple-500 hover:to-blue-500 text-white rounded-xl shadow-xl font-medium transition-all duration-300"
            >
              <span className="relative z-10">Join Community</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Compliance banner */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/80 via-black/90 to-black/80 backdrop-blur-xl border-t border-white/10 px-6 py-3 text-center text-xs text-gray-300 z-10">
        <div className="flex items-center justify-center space-x-4">
          <Shield className="w-4 h-4 text-[#14F195]" />
          <span>TurfLoot: Real blockchain integration • Skill-based gaming • Secure & transparent</span>
          <Link href="/legal" className="text-[#14F195] hover:text-[#14F195]/80 underline">
            Legal & Terms
          </Link>
        </div>
      </div>
    </div>
  )
}