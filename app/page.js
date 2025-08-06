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

export default function Home() {
  const [livePot, setLivePot] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    // Simulate live pot updates
    const interval = setInterval(() => {
      setLivePot(prev => prev + Math.random() * 0.1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleWalletConnect = () => {
    // TODO: Implement wallet connection when providers are restored
    setIsConnected(!isConnected)
    setBalance(5.25) // Mock balance
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E1E1E] via-[#2A2A2A] to-[#1E1E1E] text-white overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-grid-pattern animate-pulse"></div>
      </div>
      
      {/* Main container */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#14F195] to-[#9945FF] rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-black">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold font-dm-sans">TurfLoot</h1>
              <p className="text-sm text-gray-400">Skill-based territory battles</p>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <Card className="glass-card border-[#14F195]/20">
                  <CardContent className="px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse"></div>
                      <span className="text-sm">{balance.toFixed(2)} SOL</span>
                    </div>
                  </CardContent>
                </Card>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-[#14F195]/30 text-[#14F195] hover:bg-[#14F195]/10"
                  onClick={handleWalletConnect}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connected
                </Button>
              </div>
            ) : (
              <Button 
                className="btn-shimmer bg-gradient-to-r from-[#14F195] to-[#9945FF] text-black font-semibold"
                onClick={handleWalletConnect}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            )}
          </div>
        </header>

        {/* Main game lobby */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Left column - Game info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live pot ticker */}
            <Card className="glass-card border-[#14F195]/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-[#14F195]/10 to-[#9945FF]/10 px-6 py-4 border-b border-[#14F195]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-[#14F195] rounded-full animate-pulse"></div>
                      <span className="font-semibold">LIVE POT</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-[#14F195]" />
                      <span className="text-2xl font-bold text-[#14F195]">
                        {livePot.toFixed(2)} SOL
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-400">
                    Real-time prize pool from all active games. Winner takes all based on territory control.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Game modes */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card border-[#14F195]/20 hover:border-[#14F195]/40 transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary" className="bg-[#14F195]/20 text-[#14F195]">
                      <Zap className="w-3 h-3 mr-1" />
                      Quick Match
                    </Badge>
                    <span className="text-sm text-gray-400">2-4 players</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Instant Battle</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Jump into a game immediately. Stakes: 0.1-1 SOL
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#14F195]">Avg. duration: 3-5min</span>
                    <Play className="w-4 h-4 text-[#14F195] group-hover:scale-110 transition-transform" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-[#9945FF]/20 hover:border-[#9945FF]/40 transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary" className="bg-[#9945FF]/20 text-[#9945FF]">
                      <Trophy className="w-3 h-3 mr-1" />
                      Tournament
                    </Badge>
                    <span className="text-sm text-gray-400">8-16 players</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Championship</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Elimination rounds. Stakes: 1-5 SOL entry
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9945FF]">Next starts: 2min</span>
                    <Trophy className="w-4 h-4 text-[#9945FF] group-hover:scale-110 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column - Player stats & actions */}
          <div className="space-y-6">
            {/* Player profile */}
            {isConnected ? (
              <Card className="glass-card border-[#14F195]/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#14F195] to-[#9945FF] rounded-full flex items-center justify-center">
                      <span className="font-bold text-black">P</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Player_7xKX...</h3>
                      <p className="text-sm text-gray-400">Connected wallet</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Games Won</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Win Rate</span>
                      <span className="font-semibold">0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Total Winnings</span>
                      <span className="font-semibold text-[#14F195]">0 SOL</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card border-orange-500/20">
                <CardContent className="p-6 text-center">
                  <Shield className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Connect Wallet</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Connect your Solana wallet to start playing and earning
                  </p>
                  <Button 
                    className="w-full btn-shimmer bg-gradient-to-r from-[#14F195] to-[#9945FF] text-black font-semibold"
                    onClick={handleWalletConnect}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick actions */}
            <div className="space-y-3">
              <Link href="/play">
                <Button className="w-full h-12 btn-shimmer bg-gradient-to-r from-[#14F195] to-[#9945FF] text-black font-bold text-lg">
                  <Play className="w-5 h-5 mr-2" />
                  PLAY NOW
                </Button>
              </Link>
              
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full border-[#14F195]/30 text-[#14F195] hover:bg-[#14F195]/10">
                    <Trophy className="w-4 h-4 mr-1" />
                    Stats
                  </Button>
                </Link>
                <Button variant="outline" className="border-[#9945FF]/30 text-[#9945FF] hover:bg-[#9945FF]/10">
                  <Users className="w-4 h-4 mr-1" />
                  Lobby
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-[#14F195]/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#14F195] mb-1">24</div>
              <div className="text-xs text-gray-400">Players Online</div>
            </CardContent>
          </Card>
          <Card className="glass-card border-[#14F195]/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#14F195] mb-1">8</div>
              <div className="text-xs text-gray-400">Active Games</div>
            </CardContent>
          </Card>
          <Card className="glass-card border-[#14F195]/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#14F195] mb-1">156.7</div>
              <div className="text-xs text-gray-400">SOL Won Today</div>
            </CardContent>
          </Card>
          <Card className="glass-card border-[#14F195]/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#14F195] mb-1">2.3s</div>
              <div className="text-xs text-gray-400">Avg Match Time</div>
            </CardContent>
          </Card>
        </div>

        {/* Footer note */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>⚠️ Backend fully functional with Solana integration, authentication & multiplayer | Wallet providers temporarily disabled for performance optimization</p>
        </div>
      </div>
    </div>
  )
}
