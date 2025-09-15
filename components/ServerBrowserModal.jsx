'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

const ServerBrowserModal = ({ isOpen, onClose, onJoinLobby }) => {
  console.log('ServerBrowserModal rendered with isOpen:', isOpen)
  
  const [servers, setServers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalStats, setTotalStats] = useState({ totalPlayers: 0, totalActiveServers: 0 })
  const [selectedStakeFilter, setSelectedStakeFilter] = useState('All')
  const [showEmptyServers, setShowEmptyServers] = useState(false)
  
  // Safely get user from Privy with error handling
  let user = null
  try {
    const privyHook = usePrivy()
    user = privyHook?.user || null
  } catch (error) {
    console.warn('Privy hook not available in ServerBrowserModal:', error)
    user = null
  }

  // Stake level categorization
  const getStakeCategory = (stake) => {
    if (stake === 0) return 'Practice'
    if (stake <= 0.02) return 'Micro Stakes'
    if (stake <= 0.10) return 'Low Stakes'
    return 'High Stakes'
  }

  // Region flag mapping
  const getRegionFlag = (region) => {
    const flagMap = {
      'US East': '🇺🇸',
      'US-East-1': '🇺🇸', 
      'US West': '🇺🇸',
      'Europe (Frankfurt)': '🇩🇪',
      'Europe (London)': '🇬🇧',
      'Oceania': '🇦🇺',
      'OCE (Sydney)': '🇦🇺',
      'Asia': '🇸🇬'
    }
    return flagMap[region] || '🌍'
  }

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

  // Group and filter servers
  const processedServers = servers.map(server => ({
    ...server,
    stakeCategory: getStakeCategory(server.entryFee || 0),
    regionFlag: getRegionFlag(server.region),
    isActive: server.currentPlayers > 0,
    isEmpty: server.currentPlayers === 0
  }))

  // Filter by stake if selected
  const stakeFilteredServers = selectedStakeFilter === 'All' 
    ? processedServers 
    : processedServers.filter(server => server.stakeCategory === selectedStakeFilter)

  // Separate active and empty servers
  const activeServers = stakeFilteredServers.filter(server => server.isActive)
  const emptyServers = stakeFilteredServers.filter(server => server.isEmpty)

  // Group servers by stake category
  const groupedByStake = processedServers.reduce((acc, server) => {
    const category = server.stakeCategory
    if (!acc[category]) acc[category] = []
    acc[category].push(server)
    return acc
  }, {})

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

        {/* Stats Bar */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#2d3748',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <div>
            <strong style={{ color: '#10b981' }}>{totalStats.totalPlayers}</strong>
            <span style={{ color: '#9ca3af', marginLeft: '4px' }}>Players Online</span>
          </div>
          <div>
            <strong style={{ color: '#3b82f6' }}>{totalStats.totalActiveServers}</strong>
            <span style={{ color: '#9ca3af', marginLeft: '4px' }}>Active Servers</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => fetchServers(true)}
              disabled={refreshing}
              style={{
                backgroundColor: refreshing ? '#4a5568' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: refreshing ? 'not-allowed' : 'pointer'
              }}
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Stake Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['All', 'Practice', 'Micro Stakes', 'Low Stakes', 'High Stakes'].map(stake => (
            <button
              key={stake}
              onClick={() => setSelectedStakeFilter(stake)}
              style={{
                backgroundColor: selectedStakeFilter === stake ? '#10b981' : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: selectedStakeFilter === stake ? 'bold' : 'normal'
              }}
            >
              {stake === 'Practice' ? 'Practice' : 
               stake === 'Micro Stakes' ? 'Micro ($0.01-$0.02)' :
               stake === 'Low Stakes' ? 'Low ($0.05-$0.10)' :
               stake === 'High Stakes' ? 'High ($0.25+)' : 'All Servers'}
            </button>
          ))}
        </div>

        {/* Server List - Redesigned */}
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          border: '1px solid #374151',
          borderRadius: '8px',
          backgroundColor: '#2d3748'
        }}>
          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#9ca3af'
            }}>
              <div style={{ marginBottom: '8px' }}>Loading...</div>
              <div style={{ fontSize: '12px' }}>🔄 Loading...</div>
            </div>
          ) : activeServers.length === 0 && emptyServers.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#ef4444'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚠️</div>
              <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>No Servers Found</div>
              <div style={{ fontSize: '12px', marginBottom: '16px' }}>Try adjusting your filters or refresh</div>
              <button
                onClick={() => fetchServers(true)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              {/* Active Servers First */}
              {activeServers.length > 0 && (
                <div>
                  <div style={{
                    padding: '8px 16px',
                    backgroundColor: '#374151',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    borderBottom: '1px solid #4a5568'
                  }}>
                    🟢 ACTIVE SERVERS ({activeServers.length})
                  </div>
                  {activeServers.map(server => (
                    <div
                      key={server.id}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid #374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: server.status === 'full' ? '#4a1e1e' : 'transparent'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        {/* Condensed One-Line Format */}
                        <div style={{ 
                          fontSize: '14px',
                          color: server.status === 'full' ? '#9ca3af' : 'white',
                          fontWeight: '500'
                        }}>
                          {server.entryFee > 0 
                            ? `$${server.entryFee.toFixed(2)} Cash Game — ${server.regionFlag} ${server.region} | ${server.currentPlayers}/${server.maxPlayers} Players`
                            : `Practice — ${server.regionFlag} ${server.region} | ${server.currentPlayers}/${server.maxPlayers} Players`
                          }
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#9ca3af',
                          marginTop: '2px'
                        }}>
                          {server.ping}ms ping
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinServer(server)}
                        disabled={server.status === 'full'}
                        style={{
                          backgroundColor: server.status === 'full' ? '#4a5568' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: server.status === 'full' ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        {server.status === 'full' ? 'FULL' : 'JOIN'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty Servers Collapsible */}
              {emptyServers.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowEmptyServers(!showEmptyServers)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      backgroundColor: '#374151',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#9ca3af',
                      border: 'none',
                      borderBottom: '1px solid #4a5568',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {showEmptyServers ? '🔽' : '▶️'} EMPTY LOBBIES ({emptyServers.length})
                  </button>
                  {showEmptyServers && emptyServers.map(server => (
                    <div
                      key={server.id}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid #374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px',
                          color: '#9ca3af',
                          fontWeight: '500'
                        }}>
                          {server.entryFee > 0 
                            ? `$${server.entryFee.toFixed(2)} Cash Game — ${server.regionFlag} ${server.region} | ${server.currentPlayers}/${server.maxPlayers} Players`
                            : `Practice — ${server.regionFlag} ${server.region} | ${server.currentPlayers}/${server.maxPlayers} Players`
                          }
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6b7280',
                          marginTop: '2px'
                        }}>
                          {server.ping}ms ping
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinServer(server)}
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        JOIN
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <span>Auto-refresh every 3 seconds</span>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

export default ServerBrowserModal