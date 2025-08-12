'use client'

import { useState, useEffect } from 'react'
import { X, Search, Plus, Users, Trophy, Target, Clock } from 'lucide-react'

const UserProfile = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('leaderboard')
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
    if (!user?.id && !user?.privyId) return
    
    try {
      setLoading(true)
      console.log('📊 Loading user stats for:', user?.id || user?.privyId)
      
      // If user has profile data with stats, use it
      if (user.stats) {
        const userStats = user.stats
        setStats({
          winRate: userStats.games_played > 0 ? ((userStats.games_won / userStats.games_played) * 100).toFixed(1) : 0.0,
          gamesWon: userStats.games_won || 0,
          gamesPlayed: userStats.games_played || 0,
          avgSurvival: formatTime(userStats.avg_survival_time || 0),
          totalEliminations: userStats.total_eliminations || 0,
          killsPerGame: userStats.games_played > 0 ? (userStats.total_eliminations / userStats.games_played).toFixed(1) : 0.0,
          totalPlayTime: formatPlayTime(userStats.total_play_time || 0),
          avgGameTime: formatTime(userStats.avg_game_time || 0),
          earnings: userStats.total_earnings || 0.00
        })
      } else {
        // Generate some dynamic stats based on user activity for demo
        const randomStats = generateDemoStats()
        setStats(randomStats)
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateDemoStats = () => {
    // Generate realistic-looking stats for demonstration
    const gamesPlayed = Math.floor(Math.random() * 50) + 5
    const gamesWon = Math.floor(gamesPlayed * (0.15 + Math.random() * 0.3))
    const totalEliminations = Math.floor(gamesPlayed * (1.2 + Math.random() * 2.8))
    
    return {
      winRate: gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0.0,
      gamesWon,
      gamesPlayed,
      avgSurvival: formatTime(60 + Math.floor(Math.random() * 180)), // 1-4 minutes
      totalEliminations,
      killsPerGame: gamesPlayed > 0 ? (totalEliminations / gamesPlayed).toFixed(1) : 0.0,
      totalPlayTime: formatPlayTime(gamesPlayed * (120 + Math.random() * 240)), // 2-6 min per game
      avgGameTime: formatTime(120 + Math.floor(Math.random() * 240)),
      earnings: (gamesWon * (5 + Math.random() * 45)).toFixed(2) // $5-50 per win
    }
  }

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      console.log('🏆 Loading leaderboard data, type:', leaderboardType)
      
      // Generate dynamic leaderboard data
      const mockLeaderboard = []
      const playerNames = [
        'ProGamer2024', 'ElitePlayer', 'TurfMaster', 'CashKing', 'VictorySeeker',
        'GameChanger', 'TopShooter', 'StrategyPro', 'QuickWin', 'DominantForce'
      ]
      
      for (let i = 0; i < 10; i++) {
        const isCurrentUser = i === 2 && user // Put current user at #3
        mockLeaderboard.push({
          rank: i + 1,
          name: isCurrentUser ? (user.custom_name || user.google?.name || 'You') : playerNames[i],
          winnings: Math.floor((1000 - (i * 80)) + Math.random() * 500),
          wins: Math.floor((50 - (i * 4)) + Math.random() * 20),
          killDeathRatio: (2.5 - (i * 0.2) + Math.random() * 0.8).toFixed(2),
          isCurrentUser,
          avatar: isCurrentUser ? '👤' : ['🎮', '🏆', '⚡', '🔥', '💎', '🚀', '⭐', '💪', '🎯', '👑'][i]
        })
      }
      
      setLeaderboard(mockLeaderboard)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      setLoading(true)
      console.log('👥 Loading friends list')
      
      // Generate demo friends data
      const mockFriends = [
        { id: 1, name: 'GameBuddy', status: 'online', lastSeen: 'Online', wins: 23, avatar: '🎮' },
        { id: 2, name: 'StrategyMaster', status: 'playing', lastSeen: 'In game', wins: 34, avatar: '🏆' },
        { id: 3, name: 'CasualPlayer', status: 'offline', lastSeen: '2h ago', wins: 12, avatar: '⚡' }
      ]
      
      setFriends(mockFriends)
    } catch (error) {
      console.error('Error loading friends:', error)
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
      console.log('🔍 Searching for:', query)
      
      // Generate mock search results
      const mockResults = [
        { id: 1, name: `${query}Player`, wins: 15, status: 'online', avatar: '🔍' },
        { id: 2, name: `Elite${query}`, wins: 28, status: 'offline', avatar: '🎯' },
        { id: 3, name: `${query}Master`, wins: 42, status: 'playing', avatar: '👑' }
      ].filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      
      setSearchResults(mockResults)
    } catch (error) {
      console.error('Error searching players:', error)
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

  const addFriend = (playerId) => {
    console.log('➕ Adding friend:', playerId)
    // In real implementation, this would make an API call
    alert('Friend request sent!')
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'friends', label: 'Friends', icon: '👥' }
  ]

  const renderLeaderboard = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-yellow-400 flex items-center">
          🏆 Global Leaderboard
          <span className="text-sm text-gray-400 ml-2">• Live Rankings</span>
        </h2>
        <select 
          className="bg-gray-800 border border-yellow-400/30 rounded px-3 py-1 text-yellow-400"
          value={leaderboardType}
          onChange={(e) => {
            setLeaderboardType(e.target.value)
            loadLeaderboard()
          }}
        >
          <option value="winnings">💰 Winnings</option>
          <option value="wins">🏆 Wins</option>
          <option value="kd">⚡ K/D Ratio</option>
        </select>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-4xl animate-spin">⏳</div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Loading Leaderboard...</h3>
            <p className="text-gray-400">Fetching latest rankings</p>
          </div>
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.map((player) => (
            <div
              key={player.rank}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                player.isCurrentUser
                  ? 'bg-yellow-400/10 border-yellow-400/50 ring-1 ring-yellow-400/30'
                  : 'bg-gray-800/50 border-gray-600/30 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  player.rank === 1 ? 'bg-yellow-500 text-black' :
                  player.rank === 2 ? 'bg-gray-400 text-black' :
                  player.rank === 3 ? 'bg-amber-600 text-white' : 
                  'bg-gray-600 text-white'
                }`}>
                  {player.rank}
                </div>
                <div className="text-2xl">{player.avatar}</div>
                <div>
                  <div className={`font-bold ${player.isCurrentUser ? 'text-yellow-400' : 'text-white'}`}>
                    {player.name} {player.isCurrentUser && '(You)'}
                  </div>
                  <div className="text-sm text-gray-400">{player.wins} wins</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-400">${player.winnings.toLocaleString()}</div>
                <div className="text-sm text-gray-400">K/D: {player.killDeathRatio}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-4xl">🏆</div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Leaderboard Empty</h3>
            <p className="text-gray-400">Be the first to climb the rankings!</p>
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
              <button
                onClick={() => addFriend(player.id)}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-medium rounded-lg transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Friend
              </button>
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

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl h-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-yellow-400 flex items-center">
            👥 Social
          </h1>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 p-6 pb-4 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default UserProfile