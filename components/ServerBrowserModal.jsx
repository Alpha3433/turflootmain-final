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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1a202c',
        border: '2px solid #374151',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '600px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '24px',
        color: 'white'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #374151',
          paddingBottom: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>🌐 Server Browser</h2>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '4px 0 0 0' }}>Choose your battleground</p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#10b981' }}>
            🎉 Server Browser is Working!
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
            This modal successfully opens when you click the SERVER BROWSER button.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Close Modal
            </button>
            <button
              onClick={() => {
                // Demo join functionality
                onJoinLobby({ id: 'demo-server', name: 'Demo Server', region: 'US-East' })
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Join Demo Server
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServerBrowserModal