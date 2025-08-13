'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

const ServerBrowserModal = ({ isOpen, onClose, onJoinLobby }) => {
  const [lobbies, setLobbies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalStats, setTotalStats] = useState({ totalPlayers: 0, totalActiveGames: 0 })
  const { user } = usePrivy()

  // Fetch lobby data
  const fetchLobbies = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      
      const response = await fetch('/api/servers/lobbies')
      const data = await response.json()
      
      if (response.ok) {
        setLobbies(data.lobbies || [])
        setTotalStats({
          totalPlayers: data.totalPlayers || 0,
          totalActiveGames: data.totalActiveGames || 0
        })
      } else {
        console.error('Failed to fetch lobbies:', data)
      }
    } catch (error) {
      console.error('Error fetching lobbies:', error)
    } finally {
      setIsLoading(false)
      if (showRefresh) setRefreshing(false)
    }
  }

  // Auto-refresh every 5 seconds when modal is open
  useEffect(() => {
    if (isOpen) {
      fetchLobbies()
      const interval = setInterval(() => fetchLobbies(true), 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const handleJoinLobby = (lobby) => {
    if (!user && lobby.mode === 'cash') {
      alert('Please login to join cash games')
      return
    }
    
    if (lobby.currentPlayers >= lobby.maxPlayers) {
      alert('This lobby is full. Please try another one.')
      return
    }
    
    onJoinLobby(lobby)
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-400/10'
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10'
      case 'High': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStakeColor = (stake) => {
    if (stake === 0) return 'text-blue-400'
    if (stake >= 20) return 'text-red-400'
    if (stake >= 5) return 'text-yellow-400'
    return 'text-green-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🌐</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Server Browser</h2>
              <p className="text-gray-400 text-sm">Choose your battleground</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Stats */}
            <div className="text-right text-sm">
              <div className="text-green-400 font-bold">{totalStats.totalPlayers} Players</div>
              <div className="text-blue-400">{totalStats.totalActiveGames} Active Games</div>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={() => fetchLobbies(true)}
              disabled={refreshing}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg 
                className={`w-5 h-5 text-gray-300 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-400">Loading lobbies...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="bg-black/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    {/* Lobby Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                          {lobby.name}
                        </h3>
                        
                        {/* Difficulty Badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getDifficultyColor(lobby.difficulty)}`}>
                          {lobby.difficulty}
                        </span>
                        
                        {/* Entry Fee */}
                        <span className={`font-bold ${getStakeColor(lobby.stake)}`}>
                          {lobby.stake === 0 ? 'FREE' : `$${lobby.stake}`}
                        </span>
                      </div>
                      
                      {/* Stats Row */}
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12a4 4 0 110-8 4 4 0 010 8zM9 2a6 6 0 100 12A6 6 0 009 2zM19 19a1 1 0 01-1 1h-8a1 1 0 01-1-1v-1a3 3 0 016 0v1zM14 9a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-white font-medium">{lobby.currentPlayers}/{lobby.maxPlayers}</span>
                          <span>players</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span>{lobby.avgWaitTime}</span>
                        </div>
                        
                        {lobby.waitingPlayers > 0 && (
                          <div className="flex items-center space-x-1 text-yellow-400">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zM6.5 9.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd" />
                            </svg>
                            <span>{lobby.waitingPlayers} waiting</span>
                          </div>
                        )}
                        
                        {lobby.activeGames > 0 && (
                          <div className="flex items-center space-x-1 text-green-400">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                            <span>{lobby.activeGames} active</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Potential Winnings */}
                      {lobby.potentialWinning > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-400">Potential Prize:</span>
                          <span className="ml-2 text-green-400 font-bold">${lobby.potentialWinning.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Join Button */}
                    <div className="ml-4">
                      <button
                        onClick={() => handleJoinLobby(lobby)}
                        disabled={lobby.currentPlayers >= lobby.maxPlayers}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${
                          lobby.currentPlayers >= lobby.maxPlayers
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : lobby.stake === 0
                              ? 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
                              : lobby.stake >= 20
                                ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white hover:scale-105'
                                : lobby.stake >= 5
                                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white hover:scale-105'
                                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:scale-105'
                        }`}
                      >
                        {lobby.currentPlayers >= lobby.maxPlayers ? 'FULL' : 'JOIN'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {lobbies.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-4">🎮</div>
                  <p>No lobbies available at the moment.</p>
                  <p className="text-sm mt-2">Check back in a few seconds!</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span>🔄 Auto-refresh every 5s</span>
              {!user && (
                <span className="text-yellow-400">⚠️ Login required for cash games</span>
              )}
            </div>
            <div className="text-xs">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServerBrowserModal