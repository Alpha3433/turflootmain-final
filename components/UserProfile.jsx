'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Search, 
  Plus, 
  Users, 
  Trophy, 
  Target, 
  Clock,
  UserSearch,
  UserPlus
} from 'lucide-react'

const UserProfile = ({ isOpen, onClose, user, initialTab = 'leaderboard' }) => {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isLandscape, setIsLandscape] = useState(false)

  // Reset tab when modal opens with new initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  // Orientation detection effect
  useEffect(() => {
    if (!isOpen) return
    
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }
    
    // Check orientation on mount
    checkOrientation()
    
    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [isOpen])

  const [stats, setStats] = useState({
    winRate: 0.0,
    gamesWon: 0,
    gamesPlayed: 0,
    avgSurvival: '0:00',
    totalEliminations: 0,
    killsPerGame: 0.0,
    totalPlayTime: '0h 0m',
    avgGameTime: '0:00',
    earnings: 0.00
  })
  const [leaderboard, setLeaderboard] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [friends, setFriends] = useState([])
  const [friendsFilter, setFriendsFilter] = useState('friends')
  const [loading, setLoading] = useState(false)
  const [leaderboardType, setLeaderboardType] = useState('winnings')
  
  // Load user stats when component opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserStats()
      if (activeTab === 'leaderboard') {
        loadLeaderboard()
      }
    }
  }, [isOpen, user])

  // Load data when tab changes
  useEffect(() => {
    if (isOpen && user) {
      switch (activeTab) {
        case 'leaderboard':
          loadLeaderboard()
          break
        case 'friends':
          loadFriends()
          break
      }
    }
  }, [activeTab, isOpen, user])

  const loadUserStats = async () => {
    try {
      setLoading(true)
      console.log('📊 Loading real user stats')
      
      // For demo purposes, load stats for the demo user
      // TODO: Replace with actual authenticated user ID
      const userId = user?.id || user?.privyId || 'demo-user'
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const userData = await response.json()
        console.log('📊 User data received:', userData)
        
        // Use real user stats if available
        if (userData.user?.stats) {
          const userStats = userData.user.stats
          setStats({
            winRate: userStats.win_rate?.toFixed(1) || '0.0',
            gamesWon: userStats.games_won || 0,
            gamesPlayed: userStats.games_played || 0,
            avgSurvival: formatTime(userStats.avg_survival_time || 0),
            totalEliminations: userStats.total_eliminations || 0,
            killsPerGame: userStats.games_played > 0 ? (userStats.total_eliminations / userStats.games_played).toFixed(1) : '0.0',
            totalPlayTime: formatPlayTime(userStats.total_play_time || 0),
            avgGameTime: formatTime(userStats.avg_game_time || 0),
            earnings: (userStats.total_earnings || 0).toFixed(2)
          })
          console.log('📊 Stats loaded from database:', userStats)
        } else {
          // User exists but no stats yet - show zeros
          console.log('📊 No stats available for user - showing empty state')
          setStats({
            winRate: '0.0',
            gamesWon: 0,
            gamesPlayed: 0,
            avgSurvival: '0:00',
            totalEliminations: 0,
            killsPerGame: '0.0',
            totalPlayTime: '0h 0m',
            avgGameTime: '0:00',
            earnings: '0.00'
          })
        }
      } else {
        console.error('Failed to load user stats:', response.status)
        // Show empty stats on error
        setStats({
          winRate: '0.0',
          gamesWon: 0,
          gamesPlayed: 0,
          avgSurvival: '0:00',
          totalEliminations: 0,
          killsPerGame: '0.0',
          totalPlayTime: '0h 0m',
          avgGameTime: '0:00',
          earnings: '0.00'
        })
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
      // Show empty stats on error
      setStats({
        winRate: '0.0',
        gamesWon: 0,
        gamesPlayed: 0,
        avgSurvival: '0:00',
        totalEliminations: 0,
        killsPerGame: '0.0',
        totalPlayTime: '0h 0m',
        avgGameTime: '0:00',
        earnings: '0.00'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      console.log('🏆 Loading real leaderboard data, type:', leaderboardType)
      
      // TODO: Create API endpoint for leaderboard data
      // For now, fetch from users collection and calculate rankings
      const response = await fetch('/api/users/leaderboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📊 Leaderboard data received:', data)
        
        // Process and rank users
        const processedLeaderboard = data.users?.map((userData, index) => ({
          rank: index + 1,
          name: userData.custom_name || userData.email?.split('@')[0] || `Player${userData.id?.slice(-4)}`,
          winnings: userData.stats?.total_earnings || 0,
          wins: userData.stats?.games_won || 0,
          killDeathRatio: userData.stats?.games_played > 0 
            ? (userData.stats.total_eliminations / Math.max(userData.stats.games_played - userData.stats.games_won, 1)).toFixed(2)
            : '0.00',
          isCurrentUser: userData.id === user?.id || userData.privyId === user?.privyId,
          avatar: userData.id === user?.id || userData.privyId === user?.privyId ? '👤' : '🎮'
        })) || []
        
        setLeaderboard(processedLeaderboard)
      } else {
        console.error('Failed to load leaderboard:', response.status)
        setLeaderboard([])
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      setLoading(true)
      console.log('👥 Loading real friends list')
      
      if (!user?.id && !user?.privyId) {
        setFriends([])
        return
      }

      const response = await fetch('/api/users/friends', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('👥 Friends data received:', data)
        
        const processedFriends = data.friends?.map(friend => ({
          id: friend.id,
          name: friend.custom_name || friend.email?.split('@')[0] || `Player${friend.id?.slice(-4)}`,
          status: friend.online_status || 'offline',
          lastSeen: friend.last_seen ? new Date(friend.last_seen).toLocaleString() : 'Unknown',
          wins: friend.stats?.games_won || 0,
          avatar: '👤'
        })) || []
        
        setFriends(processedFriends)
      } else {
        console.error('Failed to load friends:', response.status)
        setFriends([])
      }
    } catch (error) {
      console.error('Error loading friends:', error)
      setFriends([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    try {
      setLoading(true)
      console.log('🔍 Searching for real users:', query)
      
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}&limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Search results received:', data)
        
        const processedResults = data.users?.map(userData => ({
          id: userData.id,
          name: userData.custom_name || userData.email?.split('@')[0] || `Player${userData.id?.slice(-4)}`,
          wins: userData.stats?.games_won || 0,
          status: userData.online_status || 'offline',
          avatar: '👤'
        })) || []
        
        setSearchResults(processedResults)
      } else {
        console.error('Failed to search users:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPlayTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  const addFriend = async (playerId) => {
    try {
      const currentUserId = user?.id || user?.privyId || 'demo-user'
      console.log('➕ Adding friend:', playerId, 'from user:', currentUserId)
      
      const response = await fetch('/api/friends/send-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId: currentUserId,
          toUserId: playerId
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Friend request sent:', result)
        alert('✅ Friend request sent successfully!')
        
        // Update search results to show request sent
        setSearchResults(prev => 
          prev.map(p => 
            p.id === playerId 
              ? { ...p, friendRequestSent: true }
              : p
          )
        )
      } else {
        const error = await response.json()
        console.error('❌ Failed to send friend request:', error)
        alert(`❌ ${error.error}`)
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('❌ Network error. Please try again.')
    }
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, color: 'text-yellow-400' },
    { id: 'search', label: 'Search', icon: UserSearch, color: 'text-blue-400' },
    { id: 'profile', label: 'Profile', icon: Target, color: 'text-green-400' },
    { id: 'friends', label: 'Friends', icon: Users, color: 'text-purple-400' }
  ]

  const renderLeaderboard = () => (
    <div className="space-y-4">
      {/* Leaderboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Global Leaderboard</h3>
            <p className="text-sm text-gray-400">Live rankings • Updated real-time</p>
          </div>
        </div>
        
        <select 
          className={`${isLandscape ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'} bg-gray-800/60 border border-gray-700/60 rounded-xl text-white focus:outline-none focus:border-yellow-500/60 shadow-lg font-medium`}
          value={leaderboardType}
          onChange={(e) => {
            setLeaderboardType(e.target.value)
            loadLeaderboard()
          }}
        >
          <option value="winnings">💰 Total Winnings</option>
          <option value="wins">🏆 Games Won</option>
          <option value="kd">⚡ K/D Ratio</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <div className="text-4xl animate-pulse">🏆</div>
          <div className="text-gray-400">Loading leaderboard...</div>
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-3">
          {leaderboard.map((player, index) => (
            <div key={player.id || index} className={`p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] ${
              index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40 shadow-lg shadow-yellow-500/20' :
              index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/40' :
              index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border-orange-500/40' :
              'bg-gray-800/50 border-gray-700/60 hover:border-gray-600/60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 ${
                    index === 0 ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-200' :
                    index === 1 ? 'bg-gray-400/30 border-gray-400/60 text-gray-200' :
                    index === 2 ? 'bg-orange-500/30 border-orange-500/60 text-orange-200' :
                    'bg-gray-700/50 border-gray-600/60 text-gray-300'
                  }`}>
                    #{player.rank || index + 1}
                  </div>
                  
                  <div>
                    <div className="font-bold text-white text-lg">{player.username || `Player${(player.id || index).toString().slice(-4)}`}</div>
                    <div className="text-sm text-gray-400">
                      {leaderboardType === 'winnings' && `$${(player.totalWinnings || 0).toFixed(2)} earned`}
                      {leaderboardType === 'wins' && `${player.gamesWon || 0} victories`}
                      {leaderboardType === 'kd' && `${((player.totalEliminations || 0) / Math.max(player.gamesPlayed || 1, 1)).toFixed(2)} K/D`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-xl font-bold ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    index === 2 ? 'text-orange-400' : 'text-white'
                  }`}>
                    {leaderboardType === 'winnings' && `$${(player.totalWinnings || 0).toFixed(2)}`}
                    {leaderboardType === 'wins' && (player.gamesWon || 0)}
                    {leaderboardType === 'kd' && ((player.totalEliminations || 0) / Math.max(player.gamesPlayed || 1, 1)).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {player.gamesPlayed || 0} games played
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <div className="text-4xl">🏆</div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">No rankings yet</h3>
            <p className="text-gray-400">Play games to see global rankings</p>
          </div>
        </div>
      )}
    </div>
  )

  const renderSearch = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">🔍 Find Players</h2>
        <p className="text-gray-400">Search by username or Game ID</p>
      </div>
      
      <div className="relative">
        <input 
          type="text"
          placeholder="Search by username or Game ID..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            handleSearch(e.target.value)
          }}
          className="w-full px-4 py-3 pl-12 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
        />
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
      </div>

      {loading && searchQuery ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-2xl animate-spin">🔍</div>
          <span className="ml-3 text-gray-400">Searching...</span>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-yellow-400">Search Results</h3>
          {searchResults.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{player.avatar}</div>
                <div>
                  <div className="font-bold text-white">{player.name}</div>
                  <div className="text-sm text-gray-400">
                    {player.wins} wins • {player.status}
                    {player.status === 'online' && <span className="text-green-400 ml-1">●</span>}
                    {player.status === 'playing' && <span className="text-yellow-400 ml-1">●</span>}
                  </div>
                </div>
              </div>
              {player.friendRequestSent ? (
                <div className="px-3 py-1 bg-gray-600/20 text-gray-400 rounded text-sm">
                  ✓ Request Sent
                </div>
              ) : (
                <button
                  onClick={() => addFriend(player.id)}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-medium rounded-lg transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Friend
                </button>
              )}
            </div>
          ))}
        </div>
      ) : searchQuery ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-4xl">😔</div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">No Results Found</h3>
            <p className="text-gray-400">Try a different search term</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-6xl">🔍</div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Start Searching</h3>
            <p className="text-gray-400 mb-4">Find players by typing their username or Game ID</p>
            <div className="text-sm text-gray-500 space-y-1">
              <div>• Username: "ProGamer", "player123"</div>
              <div>• Game ID: "abc123def456..."</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderProfile = () => (
    <div className="space-y-6">
      {/* User Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-3xl shadow-lg">
              👤
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.custom_name || user?.google?.name || user?.email?.address || 'Player'}</h2>
              <div className="text-sm text-gray-400">
                {user?.email?.address && `📧 ${user.email.address}`}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-gray-400">📅 Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'today'}</div>
          <div className="text-sm text-gray-400">🔥 {stats.gamesPlayed > 0 ? `${Math.max(1, Math.floor(stats.gamesPlayed / 5))} day streak` : 'Start playing to build streak'}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Game Performance */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600/30 hover:border-yellow-400/30 transition-colors">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Game Performance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.winRate}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Games Won</div>
              <div className="text-2xl font-bold text-green-400">{stats.gamesWon}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Games Played</div>
              <div className="text-2xl font-bold text-white">{stats.gamesPlayed}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Avg Survival</div>
              <div className="text-2xl font-bold text-orange-400">{stats.avgSurvival}</div>
            </div>
          </div>
        </div>

        {/* Combat & Time */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600/30 hover:border-yellow-400/30 transition-colors">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Combat & Time
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Eliminations</div>
              <div className="text-2xl font-bold text-red-400">{stats.totalEliminations}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Kills Per Game</div>
              <div className="text-2xl font-bold text-red-400">{stats.killsPerGame}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Play Time</div>
              <div className="text-2xl font-bold text-white">{stats.totalPlayTime}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Avg Game Time</div>
              <div className="text-2xl font-bold text-white">{stats.avgGameTime}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings & Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Earnings */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600/30 hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-yellow-400 flex items-center">
              💰 Total Earnings
            </h3>
            <select className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm">
              <option>All Time</option>
              <option>This Month</option>
              <option>This Week</option>
            </select>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-2">${stats.earnings}</div>
          <div className="text-sm text-gray-400">
            {stats.gamesWon > 0 ? `$${(parseFloat(stats.earnings) / stats.gamesWon).toFixed(2)} avg per win` : 'Win games to start earning'}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center">
            🏅 Recent Achievements
          </h3>
          <div className="space-y-3">
            {stats.gamesPlayed >= 10 && (
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🎮</div>
                <div>
                  <div className="text-white font-medium">Veteran Player</div>
                  <div className="text-sm text-gray-400">Played 10+ games</div>
                </div>
              </div>
            )}
            {parseFloat(stats.winRate) >= 25 && (
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🏆</div>
                <div>
                  <div className="text-white font-medium">Skilled Competitor</div>
                  <div className="text-sm text-gray-400">25%+ win rate</div>
                </div>
              </div>
            )}
            {stats.totalEliminations >= 50 && (
              <div className="flex items-center space-x-3">
                <div className="text-2xl">⚔️</div>
                <div>
                  <div className="text-white font-medium">Eliminator</div>
                  <div className="text-sm text-gray-400">50+ total eliminations</div>
                </div>
              </div>
            )}
            {stats.gamesPlayed === 0 && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-sm">Play games to unlock achievements!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderFriends = () => (
    <div className="space-y-4">
      {/* Friends Tabs */}
      <div className="flex space-x-2 mb-4">
        {[
          { id: 'friends', label: '👥 Friends', count: friends.length },
          { id: 'blocked', label: '❌ Blocked', count: 0 },
          { id: 'pending', label: '⏳ Pending', count: 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFriendsFilter(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
              friendsFilter === tab.id
                ? 'bg-yellow-400 text-black'
                : 'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                friendsFilter === tab.id ? 'bg-black/20 text-black' : 'bg-gray-600 text-white'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <input 
          type="text"
          placeholder="Search friends..."
          className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <div className="text-2xl animate-spin">⏳</div>
          <div className="text-gray-400">Loading friends...</div>
        </div>
      ) : friendsFilter === 'friends' && friends.length > 0 ? (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="text-3xl">{friend.avatar}</div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                    friend.status === 'online' ? 'bg-green-400' :
                    friend.status === 'playing' ? 'bg-yellow-400' : 'bg-gray-500'
                  }`}></div>
                </div>
                <div>
                  <div className="font-bold text-white">{friend.name}</div>
                  <div className="text-sm text-gray-400">
                    {friend.wins} wins • {friend.lastSeen}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {friend.status === 'playing' && (
                  <button className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors">
                    Join Game
                  </button>
                )}
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors">
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <div className="text-4xl">
            {friendsFilter === 'friends' ? '👥' : 
             friendsFilter === 'blocked' ? '❌' : '⏳'}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">
              {friendsFilter === 'friends' ? 'No friends yet' :
               friendsFilter === 'blocked' ? 'No blocked players' : 'No pending requests'}
            </h3>
            <p className="text-gray-400">
              {friendsFilter === 'friends' ? 'Add friends through search to see them here' :
               friendsFilter === 'blocked' ? 'Blocked players will appear here' : 'Pending friend requests will appear here'}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'leaderboard': return renderLeaderboard()
      case 'search': return renderSearch()
      case 'profile': return renderProfile()
      case 'friends': return renderFriends()
      default: return renderProfile()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Mobile Layout - Portrait and Landscape Optimized */}
      <div className="md:hidden w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        
        {/* Mobile Header - Responsive for Portrait/Landscape */}
        <div className={`px-5 ${isLandscape ? 'py-2' : 'py-3'} border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-800/90`}>
          {/* Portrait Layout - 2 Rows */}
          {!isLandscape && (
            <div>
              {/* Top Row - Title and Close Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-600/30 rounded-xl border border-blue-500/40 shadow-lg">
                    <Users className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">Social</h2>
                    <p className="text-sm text-gray-400">Connect and compete</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-3 bg-gray-700/60 hover:bg-gray-600/70 rounded-xl transition-all active:scale-95 shadow-lg"
                >
                  <X className="w-6 h-6 text-gray-300" />
                </button>
              </div>
            </div>
          )}

          {/* Landscape Layout - Single Compact Row */}
          {isLandscape && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-500/40 shadow-lg">
                  <Users className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Social</h2>
                  <p className="text-xs text-gray-400">Connect and compete</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 bg-gray-700/60 hover:bg-gray-600/70 rounded-lg transition-all active:scale-95 shadow-lg"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Tab Switcher - Responsive */}
        <div className={`bg-gray-800/60 mx-5 ${isLandscape ? 'mt-2 mb-2' : 'mt-4 mb-3'} rounded-2xl p-1.5 border border-gray-700/60 shadow-lg`}>
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${isLandscape ? 'py-2' : 'py-3'} rounded-xl ${isLandscape ? 'text-sm font-semibold' : 'text-base font-bold'} transition-all flex flex-col items-center justify-center space-y-1 active:scale-95 ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
                  }`}
                >
                  <IconComponent className={`${isLandscape ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isLandscape ? 'text-xs' : 'text-sm'} leading-tight`}>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobile Content Area - Responsive */}
        <div className={`flex-1 flex flex-col px-5 ${isLandscape ? 'pb-3' : 'pb-5'} overflow-hidden`}>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="pb-4">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Modern Design */}
      <div className="hidden md:block relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden border border-blue-500/30 shadow-2xl">
        
        {/* Desktop Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Social Hub</h2>
                <p className="text-gray-400">Connect, compete, and climb the ranks</p>
              </div>
            </div>
            
            {/* Desktop Tab Switcher */}
            <div className="flex bg-gray-800/50 rounded-2xl p-1.5 border border-gray-700/50">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
                      activeTab === tab.id 
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Desktop Content */}
        <div className="p-8 overflow-y-auto h-[calc(95vh-120px)]">
          {renderContent()}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default UserProfile