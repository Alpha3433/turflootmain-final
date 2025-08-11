'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

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
          💰 Top 10 Players
          <span className="text-sm text-gray-400 ml-2">• 25+ games required</span>
        </h2>
        <select className="bg-gray-800 border border-yellow-400/30 rounded px-3 py-1 text-yellow-400">
          <option>💰 Winnings</option>
          <option>🏆 Wins</option>
          <option>⚡ K/D</option>
        </select>
      </div>
      
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-4xl">🏆</div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white mb-2">Leaderboard Loading...</h3>
          <p className="text-gray-400">Top players will appear here once you start playing</p>
        </div>
      </div>
    </div>
  )

  const renderSearch = () => (
    <div className="flex flex-col items-center justify-center h-96 space-y-6">
      <div className="text-6xl">🔍</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Search Players</h2>
        <p className="text-gray-400 mb-4">Start typing to find players by username or Game ID</p>
        <div className="text-sm text-gray-500 space-y-1">
          <div>• Username: "john", "player123"</div>
          <div>• Game ID: "abc123def456..."</div>
        </div>
      </div>
      <input 
        type="text"
        placeholder="Search by username or Game ID..."
        className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
      />
    </div>
  )

  const renderProfile = () => (
    <div className="space-y-6">
      {/* User Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user?.username || 'Player'}</h2>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-gray-400">📅 Joined Aug 8, 2025</div>
          <div className="text-sm text-gray-400">🔥 0 day streak</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Game Performance */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center">
            🏆 Game Performance
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
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center">
            🎯 Combat & Time
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

      {/* Earnings */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600/30">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-yellow-400 flex items-center">
            📈 Earnings <span className="text-2xl font-bold text-yellow-400 ml-4">${stats.earnings}</span>
          </h3>
          <select className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white">
            <option>YTD</option>
            <option>All Time</option>
            <option>This Month</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderFriends = () => (
    <div className="space-y-4">
      {/* Friends Tabs */}
      <div className="flex space-x-2">
        {['👥 Friends', '❌ Blocked', '⏳ Pending'].map((tab) => (
          <button
            key={tab}
            className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-medium"
          >
            {tab}
          </button>
        ))}
      </div>

      <input 
        type="text"
        placeholder="Search friends..."
        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
      />

      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-4xl">👥</div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white mb-2">No friends yet</h3>
          <p className="text-gray-400">Add friends to see them here</p>
        </div>
      </div>
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