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
  LogOut
} from 'lucide-react'
import Link from 'next/link'

// Simple wallet connection component
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
      <div className="flex items-center space-x-2">
        <div className="px-3 py-1 bg-[#14F195]/20 text-[#14F195] rounded text-sm font-mono">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </div>
        <Button variant="ghost" size="sm" onClick={handleDisconnect}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }
  
  return (
    <Button onClick={handleConnect} disabled={isConnecting} className="bg-[#FFD54F] hover:bg-[#FFD54F]/90 text-black font-bold">
      {isConnecting ? 'Connecting...' : 'Login'}
    </Button>
  )
}

// Leaderboard component
function Leaderboard() {
  const [leaders, setLeaders] = useState([
    { rank: 1, name: 'PlayerOne', winnings: '$525.23' },
    { rank: 2, name: 'Elden', winnings: '$320.59' },
    { rank: 3, name: 'Hodler', winnings: '$186.65' }
  ])
  
  return (
    <Card className="bg-black/40 border-[#14F195]/30">
      <CardContent className="p-4">
        <div className="flex items-center mb-4">
          <Trophy className="w-4 h-4 mr-2 text-[#FFD54F]" />
          <span className="text-sm font-bold text-[#FFD54F]">Leaderboard</span>
        </div>
        
        <div className="space-y-3">
          {leaders.map((leader) => (
            <div key={leader.rank} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#14F195]/20 flex items-center justify-center text-xs font-bold text-[#14F195]">
                  {leader.rank}
                </span>
                <span className="text-white">{leader.name}</span>
              </div>
              <span className="text-[#FFD54F] font-bold">{leader.winnings}</span>
            </div>
          ))}
        </div>
        
        <Button variant="outline" size="sm" className="w-full mt-4 border-[#14F195]/50 text-[#14F195] hover:bg-[#14F195]/10">
          View Full Leaderboard
        </Button>
      </CardContent>
    </Card>
  )
}

// Wallet info component
function WalletInfo({ walletAddress, balance, onRefresh }) {
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
    }
  }
  
  return (
    <Card className="bg-black/40 border-[#14F195]/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Wallet className="w-4 h-4 mr-2 text-[#14F195]" />
            <span className="text-sm font-bold text-[#14F195]">Wallet</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <button onClick={copyAddress} className="hover:text-[#14F195]">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={onRefresh} className="hover:text-[#14F195]">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-1">
            ${balance.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mb-4">
            {(balance / 210).toFixed(4)} SOL
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" className="bg-[#14F195] hover:bg-[#14F195]/90 text-black">
              Add Funds
            </Button>
            <Button size="sm" variant="outline" className="border-[#14F195]/50 text-[#14F195] hover:bg-[#14F195]/10">
              Cash Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main game selection component
function GameLobby({ onGameStart }) {
  const [selectedAmount, setSelectedAmount] = useState(1)
  const [isLive, setIsLive] = useState(true)
  const [currentPot, setCurrentPot] = useState(141)
  
  const gameAmounts = [1, 5, 20]
  
  return (
    <div className="text-center">
      {/* Game Status */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#14F195]/20 border border-[#14F195]/50">
          <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
          <span className="text-sm font-bold text-[#14F195]">LIVE</span>
        </div>
      </div>
      
      {/* Current Pot */}
      <div className="mb-8">
        <div className="text-6xl font-bold text-[#FFD54F] mb-2">
          ${currentPot}
        </div>
        <div className="text-sm text-gray-400">Current Pot</div>
      </div>
      
      {/* Game Amount Selection */}
      <div className="flex justify-center space-x-4 mb-8">
        {gameAmounts.map((amount) => (
          <button
            key={amount}
            onClick={() => setSelectedAmount(amount)}
            className={`w-16 h-16 rounded-lg font-bold text-lg transition-all ${
              selectedAmount === amount
                ? 'bg-[#FFD54F] text-black shadow-lg scale-110'
                : 'bg-black/50 text-white border border-gray-600 hover:border-[#14F195]/50'
            }`}
          >
            ${amount}
          </button>
        ))}
      </div>
      
      {/* Play Button */}
      <Button
        onClick={() => onGameStart(selectedAmount)}
        size="lg"
        className="w-64 h-16 text-xl font-bold bg-[#14F195] hover:bg-[#14F195]/90 text-black mb-6"
      >
        <Play className="w-6 h-6 mr-3" />
        PLAY FOR ${selectedAmount}
      </Button>
      
      {/* Server Status */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-bold text-red-400">SERVER DOWN</span>
        </div>
      </div>
    </div>
  )
}

// Player stats component  
function PlayerStats() {
  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full bg-gray-600 mx-auto mb-3 flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <div className="text-sm text-gray-400">No friends... add some!</div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#FFD54F]">33</div>
          <div className="text-xs text-gray-400">Players in Queue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#FFD54F]">$71,770</div>
          <div className="text-xs text-gray-400">Global Player Winnings</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 text-xs">
          Add Friends
        </Button>
        <Button size="sm" className="bg-[#FFD54F] text-black text-xs font-bold">
          Daily Create
        </Button>
        <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 text-xs">
          Change Appearance
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
      setBalance(Math.random() * 1000) // Mock balance
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
      setBalance(prev => prev + (Math.random() - 0.5) * 100)
    }
  }
  
  return (
    <div className="min-h-screen bg-[#1E1E1E] relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="border border-gray-700/30" />
          ))}
        </div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14F195] to-[#FFD54F] flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">Welcome, bruh!</div>
          </div>
        </div>
        
        <WalletConnect onWalletConnect={handleWalletConnect} walletAddress={walletAddress} />
      </header>
      
      {/* Main Content Grid */}
      <div className="relative z-10 grid grid-cols-12 gap-6 p-6 h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <div className="col-span-3 space-y-6">
          <Leaderboard />
          
          {/* Friends Section */}
          <Card className="bg-black/40 border-[#14F195]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-[#14F195]" />
                  <span className="text-sm font-bold text-[#14F195]">Friends</span>
                </div>
                <span className="text-xs text-gray-400">0 playing</span>
              </div>
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-600 mx-auto mb-3 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-sm text-gray-400 mb-4">No friends... add some!</div>
                <Button variant="outline" size="sm" className="border-[#14F195]/50 text-[#14F195] hover:bg-[#14F195]/10">
                  Add Friends
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Center Game Area */}
        <div className="col-span-6 flex items-center justify-center">
          <GameLobby onGameStart={handleGameStart} />
        </div>
        
        {/* Right Sidebar */}
        <div className="col-span-3 space-y-6">
          <WalletInfo 
            walletAddress={walletAddress} 
            balance={balance}
            onRefresh={handleRefreshBalance}
          />
          
          {/* Player Stats */}
          <Card className="bg-black/40 border-[#14F195]/30">
            <CardContent className="p-4">
              <PlayerStats />
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full border-[#14F195]/50 text-[#14F195] hover:bg-[#14F195]/10">
              <Settings className="w-4 h-4 mr-2" />
              Customize
            </Button>
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Join Discord!
            </Button>
          </div>
        </div>
      </div>
      
      {/* Compliance Banner */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#14F195]/10 border-t border-[#14F195]/20 px-4 py-2 text-center text-xs text-[#14F195] z-10">
        ⚠️ TurfLoot prizes are determined solely by player skill. Play responsibly. 
        <Link href="/legal" className="underline hover:no-underline ml-2">Legal</Link>
      </div>
    </div>
  )
}