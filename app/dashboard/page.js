'use client'

import { useState, useEffect } from 'react'
// import { motion } from 'framer-motion' // TODO: Add back when framer-motion is installed
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  History, 
  ArrowUpRight,
  ArrowDownLeft,
  Play,
  Trophy,
  Users,
  Clock,
  Copy,
  RefreshCw,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Temporary motion replacement
const motion = {
  div: ({ children, initial, animate, transition, className, ...props }) => 
    <div className={className} {...props}>{children}</div>
}

// Dynamic imports to avoid SSR issues
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
)

const WalletProvider = dynamic(
  () => import('@/components/wallet/WalletProvider'),
  { ssr: false }
)

// Privy on-ramp component
function PrivyOnRampWidget() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleFundWallet = async () => {
    setIsLoading(true)
    
    try {
      // Simulate Privy on-ramp widget
      // In real implementation, this would open Privy's on-ramp modal
      const mockOnRampData = {
        amount: 100, // $100 USD
        crypto_amount: 0.5, // ~0.5 SOL
        currency: 'USD',
        crypto_currency: 'SOL',
        status: 'completed'
      }
      
      // Simulate API call to our webhook
      const response = await fetch('/api/onramp/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-signature': 'mock_signature_for_demo'
        },
        body: JSON.stringify({
          event_type: 'fiat_onramp.completed',
          data: {
            id: `onramp_${Date.now()}`,
            user_id: 'privy_user_demo',
            ...mockOnRampData
          }
        })
      })
      
      if (response.ok) {
        alert(`Successfully added ${mockOnRampData.crypto_amount} SOL to your wallet!`)
      } else {
        throw new Error('On-ramp failed')
      }
    } catch (error) {
      console.error('On-ramp error:', error)
      alert('On-ramp failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <CreditCard className="w-4 h-4 mr-2" />
          Add Funds with Privy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Buy SOL with credit card, bank transfer, or other payment methods using Privy's secure on-ramp.
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between items-center mb-1">
              <span>Amount:</span>
              <span className="font-bold">$100.00 USD</span>
            </div>
            <div className="flex justify-between items-center">
              <span>You'll receive:</span>
              <span className="font-bold text-[#14F195]">~0.5 SOL</span>
            </div>
          </div>
          
          <Button
            onClick={handleFundWallet}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Buy SOL with Privy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Balance card component
function BalanceCard({ solBalance, usdValue, onRefresh }) {
  const [walletAddress, setWalletAddress] = useState(null)
  
  const formatAddress = (address) => {
    if (!address) return 'Not connected'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
    }
  }
  
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            Wallet Balance
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold text-accent">
              {solBalance.toFixed(4)} SOL
            </div>
            <div className="text-muted-foreground">
              ≈ ${usdValue.toFixed(2)} USD
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Address:</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{formatAddress(walletAddress)}</span>
              {walletAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="p-1 h-auto"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Stats cards component
function StatsCards({ stats }) {
  const statCards = [
    {
      title: 'Total Winnings',
      value: `$${stats.totalWinnings.toFixed(2)}`,
      change: '+12.5%',
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      title: 'Games Played',
      value: stats.gamesPlayed.toString(),
      change: '+3 this week',
      icon: Play,
      color: 'text-blue-500'
    },
    {
      title: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      change: '+5.2%',
      icon: Trophy,
      color: 'text-yellow-500'
    },
    {
      title: 'Avg. Territory',
      value: `${stats.avgTerritory.toFixed(1)}%`,
      change: '+2.1%',
      icon: Users,
      color: 'text-purple-500'
    }
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className={`text-xs ${stat.color}`}>{stat.change}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

// Match history component
function MatchHistory({ matches }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="w-5 h-5 mr-2" />
          Recent Matches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${match.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium">{match.table} Table</div>
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {match.duration}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium">{match.territory}% territory</div>
                <div className={`text-sm ${match.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                  {match.result === 'win' ? '+' : '-'}${Math.abs(match.payout).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [solBalance, setSolBalance] = useState(0.0425)
  const [usdValue, setUsdValue] = useState(8.95)
  const [stats, setStats] = useState({
    totalWinnings: 127.50,
    gamesPlayed: 43,
    winRate: 67.4,
    avgTerritory: 23.8
  })
  
  const [matches, setMatches] = useState([
    {
      id: 1,
      table: '$5',
      duration: '2:15',
      territory: 45.2,
      result: 'win',
      payout: 8.25
    },
    {
      id: 2,
      table: '$1',
      duration: '1:48',
      territory: 12.7,
      result: 'loss',
      payout: -1.00
    },
    {
      id: 3,
      table: '$20',
      duration: '2:00',
      territory: 67.9,
      result: 'win',
      payout: 35.60
    }
  ])
  
  const handleRefreshBalance = () => {
    // TODO: Fetch real balance from Solana
    setSolBalance(prev => prev + Math.random() * 0.01)
    setUsdValue(solBalance * 210) // Approximate SOL price
  }
  
  const handleWithdraw = async () => {
    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: 'user-wallet-address', // TODO: Get from wallet
          amount: solBalance,
        }),
      })
      
      if (response.ok) {
        alert(`Withdrawal of ${solBalance.toFixed(4)} SOL initiated!`)
      }
    } catch (error) {
      console.error('Withdrawal failed:', error)
      alert('Withdrawal failed. Please try again.')
    }
  }
  
  return (
    <WalletProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">TurfLoot</h1>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline">
                <Link href="/play">
                  <Play className="w-4 h-4 mr-2" />
                  Play Game
                </Link>
              </Button>
              <WalletMultiButton />
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-8">
          {/* Balance and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <BalanceCard 
                solBalance={solBalance} 
                usdValue={usdValue}
                onRefresh={handleRefreshBalance}
              />
            </div>
            
            <div className="space-y-4">
              <PrivyOnRampWidget />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={handleWithdraw}
                  >
                    <ArrowDownLeft className="w-4 h-4 mr-2" />
                    Withdraw SOL
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/play">
                      <Play className="w-4 h-4 mr-2" />
                      Quick Play
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Stats Cards */}
          <StatsCards stats={stats} />
          
          {/* Tabs Section */}
          <div className="mt-8">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">Match History</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="history" className="mt-6">
                <MatchHistory matches={matches} />
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Detailed analytics coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </WalletProvider>
  )
}