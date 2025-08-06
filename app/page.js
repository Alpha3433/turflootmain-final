'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Trophy, 
  Users, 
  Settings,
  TrendingUp,
  Shield,
  Wallet,
  Plus,
  Copy,
  RefreshCw,
  Crown,
  Star,
  UserPlus,
  Loader2,
  Palette
} from 'lucide-react'

import LoginModal from '@/components/auth/LoginModal'
import CharacterCustomizer from '@/components/game/CharacterCustomizer'

const LeaderboardCard = ({ leaderboardData, loading }) => (
  <Card className="bg-gray-900/80 border-yellow-500/30">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-bold">Leaderboard</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-500">LIVE</span>
        </div>
      </div>
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
            <span className="ml-2 text-sm text-gray-400">Loading...</span>
          </div>
        ) : leaderboardData.length > 0 ? (
          leaderboardData.map((player, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-yellow-500 font-bold w-4">{index + 1}.</span>
                <span className="text-sm">{player.username || `Player_${player.id?.slice(0, 8)}`}</span>
              </div>
              <span className="text-yellow-500 font-bold">${player.total_winnings?.toFixed(2) || '0.00'}</span>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No players yet</p>
          </div>
        )}
      </div>
      <Button variant="outline" className="w-full mt-4 border-gray-700 text-gray-300 hover:bg-gray-800" size="sm">
        View Full Leaderboard
      </Button>
    </CardContent>
  </Card>
)

export default function Home() {
  const [leaderboardData, setLeaderboardData] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [globalStats, setGlobalStats] = useState({ winnings: 0, players: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState(0)
  const [selectedStake, setSelectedStake] = useState(5)
  const [userProfile, setUserProfile] = useState(null)
  const [walletAddress, setWalletAddress] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCharacterCustomizer, setShowCharacterCustomizer] = useState(false)

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLeaderboardLoading(true)
        const response = await fetch('/api/leaderboard')
        if (response.ok) {
          const data = await response.json()
          setLeaderboardData(data.slice(0, 3)) // Top 3 players
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLeaderboardLoading(false)
      }
    }

    fetchLeaderboard()
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch global stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true)
        // Get total games and calculate stats
        const gamesResponse = await fetch('/api/games')
        const usersResponse = await fetch('/api/users')
        
        if (gamesResponse.ok && usersResponse.ok) {
          const games = await gamesResponse.json()
          const users = await usersResponse.json()
          
          // Calculate real stats from data
          const totalWinnings = users.reduce((sum, user) => sum + (user.profile?.total_winnings || 0), 0)
          const activeGames = games.filter(game => game.status === 'active').length
          
          setGlobalStats({ 
            winnings: totalWinnings, 
            players: activeGames 
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
    // Refresh stats every 15 seconds
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleWalletConnect = async () => {
    if (!isConnected) {
      // Simulate wallet connection - in real implementation, this would use Solana wallet adapter
      const mockWalletAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
      setWalletAddress(mockWalletAddress)
      
      try {
        // Check wallet balance
        const balanceResponse = await fetch(`/api/wallet/${mockWalletAddress}/balance`)
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          setBalance(balanceData.sol_balance || 0)
        }

        // Authenticate user
        const authResponse = await fetch('/api/auth/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: mockWalletAddress,
            signature: 'mock_signature',
            message: 'mock_message'
          })
        })

        if (authResponse.ok) {
          const authData = await authResponse.json()
          setUserProfile(authData.user)
          setIsConnected(true)
        }
      } catch (error) {
        console.error('Wallet connection failed:', error)
      }
    } else {
      // Disconnect
      setIsConnected(false)
      setUserProfile(null)
      setWalletAddress('')
      setBalance(0)
    }
  }

  const handleLoginSuccess = (userData) => {
    // Handle successful login from modal
    setUserProfile(userData.user)
    setIsConnected(true)
    console.log('Login successful:', userData)
  }

  const handleCharacterSave = (characterData) => {
    // Handle character save
    console.log('Character saved:', characterData)
  }

  const stakeAmounts = [1, 5, 20, 50]

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-5">
        <div className="bg-grid-pattern h-full animate-pulse"></div>
      </div>

      {/* Top header */}
      <header className="relative z-10 flex items-center justify-between p-6 bg-black/80 backdrop-blur-sm border-b border-yellow-500/20">
        <div className="flex items-center space-x-4">
          <div className="text-orange-400 text-lg">🔥</div>
          <span className="text-lg font-medium">
            Welcome, {isConnected && userProfile ? userProfile.username : 'player'}!
          </span>
        </div>
        <Button 
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6"
          onClick={() => setShowLoginModal(true)}
        >
          {isConnected ? 'Profile' : 'Login'}
        </Button>
      </header>

      <div className="relative z-10 flex h-[calc(100vh-80px)]">
        {/* Left sidebar */}
        <div className="w-80 bg-black/60 backdrop-blur-sm border-r border-yellow-500/20 p-6 space-y-6 overflow-y-auto">
          <LeaderboardCard leaderboardData={leaderboardData} loading={leaderboardLoading} />

          {/* Friends */}
          <Card className="bg-gray-900/80 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="font-bold">Friends</span>
                  <Badge variant="secondary" className="bg-blue-900/50 text-blue-400">Online</Badge>
                </div>
                <span className="text-sm text-gray-400">0 playing</span>
              </div>
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-5 h-5 text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 mb-3">Connect wallet to find friends</p>
              </div>
              <Button 
                className="w-full bg-gray-800 hover:bg-gray-700 text-white" 
                size="sm"
                disabled={!isConnected}
              >
                Add Friends
              </Button>
            </CardContent>
          </Card>

          {/* Character Customizer Toggle */}
          <Card className="bg-gray-900/80 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span className="font-bold">Character</span>
                </div>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold"
                onClick={() => setShowCharacterCustomizer(!showCharacterCustomizer)}
              >
                {showCharacterCustomizer ? 'Hide Customizer' : 'Customize Character'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          {/* Main branding */}
          <div className="text-center space-y-4">
            <div className="relative">
              <h1 className="text-6xl font-black tracking-wider">
                <span className="text-white">TURF</span>
                <span className="text-yellow-500 drop-shadow-lg">LOOT</span>
              </h1>
              <p className="text-xl font-bold text-yellow-500 tracking-wide mt-2">
                SKILL-BASED TERRITORY BATTLES
              </p>
            </div>
          </div>

          {/* Stake selection */}
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold mr-4">Select Stake:</span>
            {stakeAmounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedStake === amount ? "default" : "outline"}
                className={`w-16 h-12 font-bold text-lg ${
                  selectedStake === amount 
                    ? "bg-yellow-500 hover:bg-yellow-400 text-black" 
                    : "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20"
                }`}
                onClick={() => setSelectedStake(amount)}
              >
                ${amount}
              </Button>
            ))}
          </div>

          {/* Main join button */}
          <Button 
            className="w-80 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-xl tracking-wide shadow-lg transform hover:scale-105 transition-all duration-200"
            disabled={!isConnected}
          >
            <Play className="w-6 h-6 mr-3" />
            {isConnected ? `JOIN GAME - $${selectedStake}` : 'CONNECT WALLET FIRST'}
          </Button>

          {/* Quick actions */}
          <div className="flex space-x-4">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800" size="lg">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800" size="lg">
              <Users className="w-4 h-4 mr-2" />
              Browse Lobbies
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-12 text-center">
            <div>
              <div className="text-3xl font-bold text-yellow-500">
                {statsLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : globalStats.players}
              </div>
              <div className="text-sm text-gray-400">Players in Game</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-500">
                {statsLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : `$${globalStats.winnings.toFixed(2)}`}
              </div>
              <div className="text-sm text-gray-400">Total Player Winnings</div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 bg-black/60 backdrop-blur-sm border-l border-yellow-500/20 p-6 space-y-6 overflow-y-auto">
          {/* Wallet section */}
          <Card className="bg-gray-900/80 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-green-400" />
                  <span className="font-bold">Wallet</span>
                </div>
                {isConnected && (
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="p-1">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-1">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-yellow-500">
                  {isConnected ? `$${(balance * 200).toFixed(2)}` : '$0.00'}
                </div>
                <div className="text-sm text-gray-400">
                  {isConnected ? `${balance.toFixed(4)} SOL` : '0.0000 SOL'}
                </div>
              </div>

              {isConnected ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button className="bg-green-600 hover:bg-green-500 text-white">
                    Add Funds
                  </Button>
                  <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/20">
                    Cash Out
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white font-bold"
                  onClick={handleWalletConnect}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </CardContent>
          </Card>

          {/* User profile */}
          {isConnected && userProfile && (
            <Card className="bg-gray-900/80 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="font-bold text-black">
                      {userProfile.username?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  </div>
                  <h3 className="font-bold">{userProfile.username}</h3>
                  <p className="text-sm text-gray-400">Connected</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Games Won:</span>
                    <span className="font-semibold">{userProfile.profile?.stats?.games_won || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="font-semibold">{userProfile.profile?.win_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Winnings:</span>
                    <span className="font-semibold text-yellow-500">
                      ${userProfile.profile?.total_winnings?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Character Customizer - Show when toggled */}
          {showCharacterCustomizer && (
            <CharacterCustomizer 
              isConnected={isConnected}
              onSave={handleCharacterSave}
            />
          )}

          {/* Customize */}
          <Card className="bg-gray-900/80 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="font-bold">Customize</span>
              </div>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={!isConnected}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Daily Crate
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={!isConnected}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Affiliate
                </Button>
                <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
                  <Settings className="w-4 h-4 mr-2" />
                  Change Appearance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-8 right-8 z-10">
        <div className="w-32 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-80 animate-pulse"></div>
      </div>
      <div className="absolute bottom-16 right-32 z-10">
        <div className="w-24 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Discord button */}
      <Button className="absolute bottom-6 left-6 bg-indigo-600 hover:bg-indigo-500" size="sm">
        Join Discord
      </Button>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
