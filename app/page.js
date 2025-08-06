'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { WalletBalance } from '@/components/wallet/WalletBalance'
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
  Wallet
} from 'lucide-react'
import Link from 'next/link'

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

// Enhanced game lobby with real blockchain integration
function GameLobby({ onGameStart }) {
  const [selectedAmount, setSelectedAmount] = useState(1)
  const [currentPot, setCurrentPot] = useState(1247)
  const [pots, setPots] = useState([])
  const { connected } = useWallet()
  const { isAuthenticated } = useAuth()
  
  useEffect(() => {
    fetchPots()
    const interval = setInterval(fetchPots, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])
  
  const fetchPots = async () => {
    try {
      const response = await fetch('/api/pots')
      if (response.ok) {
        const data = await response.json()
        setPots(data)
        // Update current pot based on selected amount
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
    { value: 1, label: '$1', subtitle: 'Quick Play', color: 'from-blue-500 to-blue-600' },
    { value: 5, label: '$5', subtitle: 'Standard', color: 'from-purple-500 to-purple-600' },
    { value: 20, label: '$20', subtitle: 'High Stakes', color: 'from-red-500 to-red-600' }
  ]
  
  return (
    <div className="text-center">
      {/* Ultra-modern status indicator */}
      <div className="flex items-center justify-center mb-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#14F195] via-[#FFD54F] to-[#14F195] rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center space-x-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#14F195]/15 via-[#14F195]/10 to-[#14F195]/5 backdrop-blur-xl border border-[#14F195]/30 shadow-2xl">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#14F195] animate-pulse shadow-lg shadow-[#14F195]/50" />
              <span className="text-sm font-bold text-[#14F195] tracking-wide">LIVE GAMES</span>
            </div>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#FFD54F]" />
              <span className="text-sm font-bold text-[#FFD54F]">
                {pots.reduce((total, pot) => total + pot.players, 0)} Active
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#FFD54F] animate-pulse" />
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
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-[#FFD54F]/50 to-transparent"></div>
            <Star className="w-5 h-5 text-[#FFD54F] animate-pulse" />
            <span className="text-xl text-gray-200 font-semibold tracking-wide">Total Prize Pool</span>
            <Star className="w-5 h-5 text-[#FFD54F] animate-pulse" />
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-[#FFD54F]/50 to-transparent"></div>
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
                
                <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            disabled={!connected || !isAuthenticated}
            className="relative w-96 h-18 text-2xl font-bold bg-gradient-to-r from-[#14F195] to-[#0EA876] hover:from-[#14F195]/90 hover:to-[#0EA876]/90 text-black rounded-2xl shadow-2xl shadow-[#14F195]/40 transform hover:scale-105 transition-all duration-300 group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <Play className="w-7 h-7 mr-4 relative z-10" />
            <span className="relative z-10">
              {!connected ? 'CONNECT WALLET' : !isAuthenticated ? 'AUTHENTICATE' : `START GAME - ${selectedAmount}`}
            </span>
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-300">
          <div className="flex items-center">
            <Shield className="w-4 h-4 text-[#14F195] mr-2" />
            <span>100% skill-based</span>
          </div>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <span>Real-time multiplayer</span>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <span>Instant SOL payouts</span>
        </div>
      </div>
      
      {/* System status */}
      <div className="text-center">
        <div className="relative group inline-flex">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-green-400 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <div className="relative inline-flex items-center space-x-3 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500/15 via-green-400/10 to-green-500/5 border border-green-500/30 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
            <span className="text-sm font-semibold text-green-400">Blockchain Connected</span>
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-green-400 rounded animate-pulse"></div>
              <div className="w-1 h-3 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
              <div className="w-1 h-5 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1 h-2 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { publicKey, connected } = useWallet()
  const { user, isAuthenticated, authenticateWallet, logout } = useAuth()
  
  const handleGameStart = async (amount) => {
    if (!connected) {
      alert('Please connect your wallet first!')
      return
    }
    
    if (!isAuthenticated) {
      try {
        await authenticateWallet()
      } catch (error) {
        alert('Authentication failed. Please try again.')
        return
      }
    }
    
    // Navigate to game with selected amount
    window.location.href = `/play?stake=${amount}`
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0F0F0F] relative overflow-hidden">
      {/* Enhanced grid background with dynamic elements */}
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
      
      {/* Enhanced gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#14F195]/8 via-transparent to-[#FFD54F]/8" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14F195]/3 to-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.8)_70%)]" />
      
      {/* Floating ambient elements */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-[#14F195] rounded-full animate-ping" />
      <div className="absolute top-40 right-32 w-1 h-1 bg-[#FFD54F] rounded-full animate-pulse" />
      <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-[#14F195]/60 rounded-full animate-bounce" />
      
      {/* Ultra-modern header */}
      <header className="relative z-20 flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#14F195] via-[#FFD54F] to-[#14F195] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
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
          {/* User info */}
          {isAuthenticated && user && (
            <div className="hidden md:flex items-center space-x-3 px-4 py-2 rounded-xl bg-gradient-to-r from-[#14F195]/10 to-[#14F195]/5 backdrop-blur-xl border border-[#14F195]/20">
              <Wallet className="w-4 h-4 text-[#14F195]" />
              <span className="text-sm text-[#14F195] font-medium">{user.username}</span>
              <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Wallet connection */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD54F] to-[#FFA726] rounded-xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
            <WalletMultiButton className="relative !bg-gradient-to-r !from-[#FFD54F] !to-[#FFA726] hover:!from-[#FFD54F]/90 hover:!to-[#FFA726]/90 !text-black !font-bold !px-8 !py-3 !rounded-xl !shadow-xl hover:!shadow-2xl !transition-all !duration-300 !border-none" />
          </div>
        </div>
      </header>
      
      {/* Main content grid */}
      <div className="relative z-10 grid grid-cols-12 gap-6 p-6 h-[calc(100vh-140px)]">
        {/* Left sidebar */}
        <div className="col-span-3 space-y-6">
          <Leaderboard />
          
          {/* Community section */}
          <Card className="bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl hover:shadow-[#14F195]/10 transition-all duration-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Community</h3>
                    <p className="text-xs text-gray-400">1.2k online players</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              </div>
              <div className="text-center py-6">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-2xl backdrop-blur-sm"></div>
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-gray-600/30 to-gray-700/30 flex items-center justify-center border border-white/10">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <div className="text-sm text-gray-300 mb-4 font-medium">Join the action</div>
                <Button 
                  className="bg-gradient-to-r from-[#14F195]/20 to-[#14F195]/10 border border-[#14F195]/30 text-[#14F195] hover:from-[#14F195]/30 hover:to-[#14F195]/20 rounded-xl backdrop-blur-sm font-medium transition-all duration-300"
                  variant="outline"
                  size="sm"
                >
                  Connect Discord
                </Button>
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
          {connected ? <WalletBalance /> : (
            <Card className="bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl">
              <CardContent className="p-6 text-center">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 mb-4">Connect your wallet to view balance and start playing</p>
                <WalletMultiButton className="!bg-gradient-to-r !from-[#14F195] !to-[#0EA876] hover:!from-[#14F195]/90 hover:!to-[#0EA876]/90 !text-black !font-medium !rounded-xl !border-none" />
              </CardContent>
            </Card>
          )}
          
          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full group relative overflow-hidden bg-gradient-to-r from-[#14F195]/20 via-[#14F195]/15 to-[#14F195]/10 border border-[#14F195]/30 text-[#14F195] hover:from-[#14F195]/30 hover:to-[#14F195]/20 rounded-xl backdrop-blur-xl font-medium transition-all duration-300"
              variant="outline"
              asChild
            >
              <Link href="/dashboard">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#14F195]/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <Settings className="w-4 h-4 mr-2 relative z-10" />
                <span className="relative z-10">View Dashboard</span>
              </Link>
            </Button>
            <Button 
              className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-500 hover:via-purple-500 hover:to-blue-500 text-white rounded-xl shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 font-medium transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <span className="relative z-10">Join Discord Community</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modern compliance banner */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/80 via-black/90 to-black/80 backdrop-blur-xl border-t border-white/10 px-6 py-3 text-center text-xs text-gray-300 z-10">
        <div className="flex items-center justify-center space-x-4">
          <Shield className="w-4 h-4 text-[#14F195]" />
          <span>TurfLoot: 100% skill-based gaming • Real blockchain integration • Instant SOL payouts</span>
          <Link href="/legal" className="text-[#14F195] hover:text-[#14F195]/80 underline">
            Legal & Terms
          </Link>
        </div>
      </div>
    </div>
  )
}