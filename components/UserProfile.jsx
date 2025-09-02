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
    if (!user?.id && !user?.privyId) {
      console.log('❌ User not authenticated, cannot fetch friends')
      setFriends([])
      return
    }

    try {
      setLoading(true)
      console.log('👥 Loading friends from friends API for user:', user.id || user.privyId)
      
      // Use the same API endpoint as FriendsPanel for consistency
      const userId = user.id || user.privyId
      const apiUrl = `/friends-api/list?userId=${userId}`
      console.log('🔗 DEBUG: Using friends API URL =', apiUrl)
      
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const serverData = await response.json()
        const serverFriends = serverData.friends || []
        console.log('✅ Friends API successful:', serverFriends.length, 'friends loaded')
        
        // Transform the data to match UserProfile component structure
        const processedFriends = serverFriends.map(friend => ({
          id: friend.id || friend.friendId,
          name: friend.name || friend.customName || friend.nickname || `Player${friend.id?.slice(-4) || 'Unknown'}`,
          status: friend.isOnline ? 'online' : 'offline',
          lastSeen: friend.lastActive ? new Date(friend.lastActive).toLocaleDateString() : 'Unknown',
          wins: friend.stats?.wins || 0,
          avatar: '👤'
        }))
        
        setFriends(processedFriends)
        console.log('✅ Processed friends for Social Hub:', processedFriends)
      } else {
        console.error('Failed to load friends from friends API:', response.status)
        setFriends([])
      }
    } catch (error) {
      console.error('Error loading friends from friends API:', error)
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
    <div className="space-y-3">
      {/* Leaderboard Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Global Leaderboard</h3>
            <p className="text-sm text-gray-400">Live rankings • Updated real-time</p>
          </div>
        </div>
        
        <select 
          className={`${isLandscape ? 'px-3 py-1.5 text-sm' : 'px-3 py-1.5 text-sm'} bg-gray-800/60 border border-gray-700/60 rounded-xl text-white focus:outline-none focus:border-yellow-500/60 shadow-lg font-medium`}
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
        <div className="flex flex-col items-center justify-center h-40 space-y-3">
          <div className="text-3xl animate-pulse">🏆</div>
          <div className="text-gray-400 text-sm">Loading leaderboard...</div>
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.map((player, index) => (
            <div key={player.id || index} className={`p-3 rounded-xl border-2 transition-all hover:scale-[1.01] ${
              index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40 shadow-lg shadow-yellow-500/20' :
              index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/40' :
              index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border-orange-500/40' :
              'bg-gray-800/50 border-gray-700/60 hover:border-gray-600/60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm border-2 ${
                    index === 0 ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-200' :
                    index === 1 ? 'bg-gray-400/30 border-gray-400/60 text-gray-200' :
                    index === 2 ? 'bg-orange-500/30 border-orange-500/60 text-orange-200' :
                    'bg-gray-700/50 border-gray-600/60 text-gray-300'
                  }`}>
                    #{player.rank || index + 1}
                  </div>
                  
                  <div>
                    <div className="font-medium text-white text-sm">{player.username || `Player${(player.id || index).toString().slice(-4)}`}</div>
                    <div className="text-xs text-gray-400">
                      {leaderboardType === 'winnings' && `$${(player.totalWinnings || 0).toFixed(2)} earned`}
                      {leaderboardType === 'wins' && `${player.gamesWon || 0} victories`}
                      {leaderboardType === 'kd' && `${((player.totalEliminations || 0) / Math.max(player.gamesPlayed || 1, 1)).toFixed(2)} K/D`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-bold ${
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
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <UserSearch className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Find Players</h3>
          <p className="text-sm text-gray-400">Search and connect with other players</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Search players by username..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            handleSearch(e.target.value)
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              handleSearch(searchQuery.trim())
            }
          }}
          className={`w-full pl-12 pr-4 ${isLandscape ? 'py-3 text-sm' : 'py-4 text-base'} bg-gray-800/60 border border-gray-700/60 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/60 focus:bg-gray-800/80 shadow-lg`}
        />
        <button
          onClick={() => searchQuery.trim() && handleSearch(searchQuery.trim())}
          disabled={!searchQuery.trim() || loading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-xl transition-all font-medium"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <div className="text-4xl animate-pulse">🔍</div>
          <div className="text-gray-400">Searching players...</div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-3">
          {searchResults.map((player) => (
            <div key={player.id} className="p-4 bg-gray-800/50 rounded-2xl border-2 border-gray-700/60 hover:border-gray-600/60 transition-all hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center border-2 border-blue-500/40">
                      <div className="text-2xl">{player.avatar}</div>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                      player.status === 'online' ? 'bg-green-400' :
                      player.status === 'playing' ? 'bg-yellow-400' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  
                  <div>
                    <div className="font-bold text-white text-lg">{player.name}</div>
                    <div className="text-sm text-gray-400">
                      {player.wins} wins • {player.status === 'online' ? 'Online' : player.status === 'playing' ? 'In Game' : 'Offline'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => addFriend(player.id)}
                    disabled={player.friendRequestSent}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      player.friendRequestSent
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg'
                    }`}
                  >
                    {player.friendRequestSent ? (
                      <>✓ Sent</>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 inline mr-2" />
                        Add Friend
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <div className="text-4xl">❌</div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">No players found</h3>
            <p className="text-gray-400">Try searching with a different username</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <div className="text-4xl">🔍</div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Search for Players</h3>
            <p className="text-gray-400">Enter a username to find and connect with players</p>
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
      {/* Friends Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
          <Users className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Friends</h3>
          <p className="text-sm text-gray-400">Manage your connections</p>
        </div>
      </div>

      {/* Friends Filter Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { id: 'friends', label: '👥 Friends', count: friends.length },
          { id: 'blocked', label: '❌ Blocked', count: 0 },
          { id: 'pending', label: '⏳ Pending', count: 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFriendsFilter(tab.id)}
            className={`${isLandscape ? 'py-2' : 'py-3'} px-3 rounded-xl font-medium transition-all flex flex-col items-center justify-center space-y-1 ${
              friendsFilter === tab.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 border border-gray-700/60'
            }`}
          >
            <span className={`${isLandscape ? 'text-sm' : 'text-base'} font-bold`}>
              {tab.label.split(' ')[0]}
            </span>
            <span className={`${isLandscape ? 'text-xs' : 'text-sm'} leading-tight`}>
              {tab.label.split(' ').slice(1).join(' ')}
            </span>
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                friendsFilter === tab.id ? 'bg-white/20 text-white' : 'bg-purple-600/80 text-white'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Search friends..."
          className={`w-full pl-12 pr-4 ${isLandscape ? 'py-3 text-sm' : 'py-4 text-base'} bg-gray-800/60 border border-gray-700/60 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:bg-gray-800/80 shadow-lg`}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <div className="text-4xl animate-pulse">👥</div>
          <div className="text-gray-400">Loading friends...</div>
        </div>
      ) : friendsFilter === 'friends' && friends.length > 0 ? (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div key={friend.id} className="p-4 bg-gray-800/50 rounded-2xl border-2 border-gray-700/60 hover:border-gray-600/60 transition-all hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center border-2 border-purple-500/40">
                      <div className="text-2xl">{friend.avatar}</div>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                      friend.status === 'online' ? 'bg-green-400' :
                      friend.status === 'playing' ? 'bg-yellow-400' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  
                  <div>
                    <div className="font-bold text-white text-lg">{friend.name}</div>
                    <div className="text-sm text-gray-400">
                      {friend.wins} wins • {friend.lastSeen}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {friend.status === 'playing' && (
                    <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white text-sm rounded-xl transition-all font-bold shadow-lg">
                      Join Game
                    </button>
                  )}
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm rounded-xl transition-all font-bold shadow-lg">
                    Message
                  </button>
                </div>
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

      {/* Desktop Layout - Compact Design */}
      <div className="hidden md:block relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-blue-500/30 shadow-2xl">
        
        {/* Desktop Header - Reduced padding */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Social Hub</h2>
                <p className="text-sm text-gray-400">Connect, compete, and climb the ranks</p>
              </div>
            </div>
            
            {/* Desktop Tab Switcher - Compact */}
            <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                      activeTab === tab.id 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Desktop Content - Reduced padding and height */}
        <div className="p-6 overflow-y-auto h-[calc(85vh-100px)]">
          {renderContent()}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default UserProfile