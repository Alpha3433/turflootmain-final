'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  Users, 
  Settings,
  Wallet,
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
import InteractiveGridCanvas from '@/components/game/InteractiveGridCanvas'
import HeroContent from '@/components/game/HeroContent'

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

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Interactive Hero Section */}
      <section className="relative h-screen overflow-hidden">
        {/* Interactive Grid Canvas - Background Layer */}
        <InteractiveGridCanvas />
        
        {/* Hero Content - Foreground Layer */}
        <HeroContent 
          selectedStake={selectedStake}
          setSelectedStake={setSelectedStake}
          isConnected={isConnected}
          handleWalletConnect={handleWalletConnect}
          setShowLoginModal={setShowLoginModal}
        />
      </section>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
