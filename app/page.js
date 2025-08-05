'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Zap, 
  Trophy, 
  Users, 
  Wallet,
  Copy,
  RefreshCw,
  Settings,
  LogOut,
  TrendingUp,
  Star,
  Shield
} from 'lucide-react'
import Link from 'next/link'

// Modern wallet connection component
function WalletConnect({ onWalletConnect, walletAddress }) {
  const [isConnecting, setIsConnecting] = useState(false)
  
  const handleConnect = async () => {
    setIsConnecting(true)
    setTimeout(() => {
      const mockWallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      onWalletConnect(mockWallet)
      setIsConnecting(false)
    }, 1000)
  }
  
  const handleDisconnect = () => {
    onWalletConnect(null)
  }
  
  if (walletAddress) {
    return (
      <div className="flex items-center space-x-3">
        <div className="px-4 py-2 bg-gradient-to-r from-[#14F195]/20 to-[#14F195]/10 backdrop-blur-sm border border-[#14F195]/30 rounded-xl text-[#14F195] text-sm font-mono">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDisconnect}
          className="hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }
  
  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting} 
      className="bg-gradient-to-r from-[#FFD54F] to-[#FFA726] hover:from-[#FFD54F]/90 hover:to-[#FFA726]/90 text-black font-bold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {isConnecting ? (
        <>
          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2" />
          Connecting...
        </>
      ) : (
        'Connect Wallet'
      )}
    </Button>
  )
}

// Modern leaderboard component
function Leaderboard() {
  const [leaders, setLeaders] = useState([
    { rank: 1, name: 'CryptoKing', winnings: '$1,247.89', trend: '+15.2%' },
    { rank: 2, name: 'SkillMaster', winnings: '$892.34', trend: '+8.7%' },
    { rank: 3, name: 'TurfLord', winnings: '$654.21', trend: '+12.1%' }
  ])
  
  return (
    <Card className="bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#FFD54F] to-[#FFA726] flex items-center justify-center mr-3">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Leaderboard</h3>
              <p className="text-xs text-gray-400">Top performers</p>
            </div>
          </div>
          <Badge className="bg-[#14F195]/20 text-[#14F195] border-[#14F195]/30">
            Live
          </Badge>
        </div>
        
        <div className="space-y-4">
          {leaders.map((leader) => (
            <div key={leader.rank} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-white/5 to-white/2 hover:from-white/10 hover:to-white/5 transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  leader.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' :
                  leader.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-black' :
                  'bg-gradient-to-r from-amber-600 to-amber-800 text-white'
                }`}>
                  {leader.rank}
                </div>
                <div>
                  <div className="text-white font-medium">{leader.name}</div>
                  <div className="text-xs text-gray-400 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {leader.trend}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#FFD54F] font-bold">{leader.winnings}</div>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4 bg-gradient-to-r from-[#14F195]/10 to-[#14F195]/5 border-[#14F195]/30 text-[#14F195] hover:bg-[#14F195]/20 rounded-xl"
        >
          View Full Rankings
        </Button>
      </CardContent>
    </Card>
  )
}

// Modern wallet info component
function WalletInfo({ walletAddress, balance, onRefresh }) {
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
    }
  }
  
  return (
    <Card className="bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#14F195] to-[#0EA876] flex items-center justify-center mr-3">
              <Wallet className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Wallet</h3>
              <p className="text-xs text-gray-400">Your balance</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={copyAddress} 
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200"
            >
              <Copy className="w-4 h-4 text-gray-400 hover:text-[#14F195]" />
            </button>
            <button 
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-gray-400 hover:text-[#14F195]" />
            </button>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <div className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
            ${balance.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400 mb-1">
            {(balance / 210).toFixed(4)} SOL
          </div>
          <div className="text-xs text-gray-500">
            ≈ ${(balance * 1.02).toFixed(2)} USD
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button className="bg-gradient-to-r from-[#14F195] to-[#0EA876] hover:from-[#14F195]/90 hover:to-[#0EA876]/90 text-black font-medium rounded-xl shadow-lg">
            Add Funds
          </Button>
          <Button 
            variant="outline" 
            className="border-[#14F195]/30 text-[#14F195] hover:bg-[#14F195]/10 rounded-xl"
          >
            Cash Out
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Modern game lobby component
function GameLobby({ onGameStart }) {
  const [selectedAmount, setSelectedAmount] = useState(1)
  const [currentPot, setCurrentPot] = useState(1247)
  
  const gameAmounts = [
    { value: 1, label: '$1', subtitle: 'Quick Play' },
    { value: 5, label: '$5', subtitle: 'Standard' },
    { value: 20, label: '$20', subtitle: 'High Stakes' }
  ]
  
  return (
    <div className="text-center">
      {/* Modern status indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#14F195]/20 to-[#14F195]/10 backdrop-blur-sm border border-[#14F195]/30 shadow-lg">
          <div className="w-3 h-3 rounded-full bg-[#14F195] animate-pulse shadow-lg shadow-[#14F195]/50" />
          <span className="text-sm font-bold text-[#14F195] tracking-wide">LIVE GAMES</span>
          <div className="w-2 h-2 rounded-full bg-[#FFD54F] animate-pulse" />
        </div>
      </div>
      
      {/* Modern pot display */}
      <div className="mb-12">
        <div className="mb-4">
          <div className="text-7xl font-black bg-gradient-to-r from-[#FFD54F] via-[#FFA726] to-[#FF9800] bg-clip-text text-transparent drop-shadow-lg">
            ${currentPot.toLocaleString()}
          </div>
          <div className="flex items-center justify-center mt-2">
            <Star className="w-4 h-4 text-[#FFD54F] mr-2" />
            <span className="text-lg text-gray-300 font-medium">Total Prize Pool</span>
            <Star className="w-4 h-4 text-[#FFD54F] ml-2" />
          </div>
        </div>
        <div className="text-sm text-gray-400">
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400">
            +$89 in the last hour
          </span>
        </div>
      </div>
      
      {/* Modern game selection */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-white mb-6">Choose Your Game</h3>
        <div className="flex justify-center space-x-4">
          {gameAmounts.map((amount) => (
            <button
              key={amount.value}
              onClick={() => setSelectedAmount(amount.value)}
              className={`p-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 ${
                selectedAmount === amount.value
                  ? 'bg-gradient-to-br from-[#FFD54F] to-[#FFA726] text-black shadow-2xl shadow-[#FFD54F]/30 scale-110'
                  : 'bg-gradient-to-br from-black/60 to-black/40 text-white border border-white/20 hover:border-[#14F195]/50 backdrop-blur-sm'
              }`}
            >
              <div className="text-2xl mb-1">{amount.label}</div>
              <div className="text-xs opacity-70">{amount.subtitle}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Modern play button */}
      <div className="mb-8">
        <Button
          onClick={() => onGameStart(selectedAmount)}
          size="lg"
          className="w-80 h-16 text-xl font-bold bg-gradient-to-r from-[#14F195] to-[#0EA876] hover:from-[#14F195]/90 hover:to-[#0EA876]/90 text-black rounded-2xl shadow-2xl shadow-[#14F195]/30 transform hover:scale-105 transition-all duration-300"
        >
          <Play className="w-6 h-6 mr-3" />
          START GAME - ${selectedAmount}
        </Button>
        <p className="text-xs text-gray-400 mt-3">
          <Shield className="w-3 h-3 inline mr-1" />
          100% skill-based • Instant payouts • Provably fair
        </p>
      </div>
      
      {/* Modern server status */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/20 to-green-400/10 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-green-400">All Systems Operational</span>
        </div>
      </div>
    </div>
  )
}

// Modern player stats component  
function PlayerStats() {
  return (
    <div className="space-y-6">
      {/* Social section */}
      <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-600/50 to-gray-700/50 mx-auto mb-4 flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <div className="text-sm text-gray-400 mb-4">No friends connected</div>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-[#14F195]/30 text-[#14F195] hover:bg-[#14F195]/10 rounded-xl"
        >
          Invite Friends
        </Button>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
          <div className="text-2xl font-bold text-[#FFD54F]">127</div>
          <div className="text-xs text-gray-400">Active Players</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20">
          <div className="text-2xl font-bold text-[#FFD54F]">$94K</div>
          <div className="text-xs text-gray-400">Total Payouts</div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-[#FFD54F] to-[#FFA726] text-black font-medium rounded-xl"
        >
          Daily Bonus
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-gray-600 text-gray-400 rounded-xl hover:bg-white/5"
        >
          Achievements
        </Button>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState(null)
  const [balance, setBalance] = useState(0.00)
  
  const handleWalletConnect = (address) => {
    setWalletAddress(address)
    if (address) {
      setBalance(Math.random() * 1500 + 500) // Mock balance $500-2000
    } else {
      setBalance(0)
    }
  }
  
  const handleGameStart = (amount) => {
    if (walletAddress) {
      // Navigate to game
      window.location.href = '/play'
    } else {
      alert('Please connect your wallet first!')
    }
  }
  
  const handleRefreshBalance = () => {
    if (walletAddress) {
      setBalance(prev => prev + (Math.random() - 0.5) * 200)
    }
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
      
      {/* Enhanced gradient overlays with more depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#14F195]/8 via-transparent to-[#FFD54F]/8" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14F195]/3 to-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.8)_70%)]" />
      
      {/* Floating ambient elements */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-[#14F195] rounded-full animate-ping" />
      <div className="absolute top-40 right-32 w-1 h-1 bg-[#FFD54F] rounded-full animate-pulse" />
      <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-[#14F195]/60 rounded-full animate-bounce" />
      
      {/* Ultra-modern header with enhanced glassmorphism */}
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
              Next-gen skill gaming platform
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Modern notification indicator */}
          <div className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#14F195]/10 to-[#14F195]/5 backdrop-blur-xl border border-[#14F195]/20">
            <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse" />
            <span className="text-sm text-[#14F195] font-medium">Live Tournament</span>
          </div>
          
          <WalletConnect onWalletConnect={handleWalletConnect} walletAddress={walletAddress} />
        </div>
      </header>
      
      {/* Ultra-modern main content grid with enhanced glassmorphism */}
      <div className="relative z-10 grid grid-cols-12 gap-6 p-6 h-[calc(100vh-140px)]">
        {/* Enhanced left sidebar */}
        <div className="col-span-3 space-y-6">
          <Leaderboard />
          
          {/* Ultra-modern community section with enhanced glass effect */}
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
        
        {/* Enhanced right sidebar with ultra-modern design */}
        <div className="col-span-3 space-y-6">
          <WalletInfo 
            walletAddress={walletAddress} 
            balance={balance}
            onRefresh={handleRefreshBalance}
          />
          
          {/* Ultra-modern player stats with enhanced glassmorphism */}
          <Card className="bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl hover:shadow-[#FFD54F]/10 transition-all duration-500 group">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center mr-3">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Your Stats</h3>
                  <p className="text-xs text-gray-400">Performance analytics</p>
                </div>
              </div>
              <PlayerStats />
            </CardContent>
          </Card>
          
          {/* Ultra-modern action buttons with enhanced effects */}
          <div className="space-y-3">
            <Button 
              className="w-full group relative overflow-hidden bg-gradient-to-r from-[#14F195]/20 via-[#14F195]/15 to-[#14F195]/10 border border-[#14F195]/30 text-[#14F195] hover:from-[#14F195]/30 hover:to-[#14F195]/20 rounded-xl backdrop-blur-xl font-medium transition-all duration-300"
              variant="outline"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#14F195]/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <Settings className="w-4 h-4 mr-2 relative z-10" />
              <span className="relative z-10">Customize Profile</span>
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
          <span>TurfLoot: 100% skill-based gaming • Provably fair • Instant SOL payouts</span>
          <Link href="/legal" className="text-[#14F195] hover:text-[#14F195]/80 underline">
            Legal & Terms
          </Link>
        </div>
      </div>
    </div>
  )
}