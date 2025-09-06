'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

const ServerBrowserModal = ({ isOpen, onClose, onJoinLobby }) => {
  console.log('ServerBrowserModal rendered with isOpen:', isOpen)
  
  const [servers, setServers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalStats, setTotalStats] = useState({ totalPlayers: 0, totalActiveServers: 0 })
  const [selectedRegion, setSelectedRegion] = useState('All')
  const [selectedGameType, setSelectedGameType] = useState('All')
  const [regions, setRegions] = useState([])
  const [gameTypes, setGameTypes] = useState([])
  const { user } = usePrivy()

  // Fetch server data
  const fetchServers = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      
      const response = await fetch('/api/servers/lobbies')
      const data = await response.json()
      
      if (response.ok) {
        setServers(data.servers || [])
        setRegions(['All', ...(data.regions || [])])
        setGameTypes(['All', ...(data.gameTypes || []).map(gt => gt.name)])
        setTotalStats({
          totalPlayers: data.totalPlayers || 0,
          totalActiveServers: data.totalActiveServers || 0
        })
      } else {
        console.error('Failed to fetch servers:', data)
      }
    } catch (error) {
      console.error('Error fetching servers:', error)
    } finally {
      setIsLoading(false)
      if (showRefresh) setRefreshing(false)
    }
  }

  // Auto-refresh every 3 seconds when modal is open (faster for real-time updates)
  useEffect(() => {
    if (isOpen) {
      console.log('🌐 Server Browser opened - starting real-time updates')
      fetchServers()
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing server data for real-time player counts')
        fetchServers(true)
      }, 3000) // Changed from 5000ms to 3000ms for faster updates
      return () => {
        console.log('🌐 Server Browser closed - stopping real-time updates')
        clearInterval(interval)
      }
    }
  }, [isOpen])

  const handleJoinServer = (server) => {
    if (!user && server.mode === 'cash') {
      alert('Please login to join cash games')
      return
    }
    
    if (server.status === 'full') {
      alert('This server is full. Please try another one.')
      return
    }
    
    // Show info for free games that they use bots
    if (server.stake === 0) {
      const confirmed = window.confirm(
        '🤖 Free games use AI bots for instant testing and practice.\n\n' +
        'Cash games use real players for competitive multiplayer.\n\n' +
        'Continue with bot practice game?'
      )
      if (!confirmed) return
    }
    
    // Pass server data to join function
    onJoinLobby({
      id: server.id,
      mode: server.mode,
      entryFee: server.entryFee,
      region: server.region,
      name: server.name
    })
  }

  // Filter servers based on selected region and game type
  const filteredServers = servers.filter(server => {
    const regionMatch = selectedRegion === 'All' || server.region === selectedRegion
    const gameTypeMatch = selectedGameType === 'All' || server.name.includes(selectedGameType.split(' ')[0])
    return regionMatch && gameTypeMatch
  })

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Simplified Header for Testing */}
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

        {/* Simplified Content */}
        <div className="p-6">
          <div className="text-white text-center">
            <h3 className="text-xl mb-4">Server Browser is Working!</h3>
            <p className="text-gray-400 mb-4">This modal is successfully opening when you click the SERVER BROWSER button.</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
            >
              Close Modal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServerBrowserModal