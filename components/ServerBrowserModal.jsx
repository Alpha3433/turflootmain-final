'use client'

import { useState, useEffect } from 'react'

const ServerBrowserModal = ({ isOpen, onClose, onJoinLobby }) => {
  console.log('🎮 REDESIGNED ServerBrowserModal v4.0 FORCE UPDATE loaded:', isOpen)
  
  const [servers, setServers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStakeFilter, setSelectedStakeFilter] = useState('All')
  const [showEmptyServers, setShowEmptyServers] = useState(false)
  const [totalStats, setTotalStats] = useState({ totalPlayers: 0, totalActiveServers: 0 })

  // Fetch servers
  const fetchServers = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const response = await fetch('/api/servers/lobbies')
      const data = await response.json()
      setServers(data.servers || [])
      setTotalStats({
        totalPlayers: data.totalPlayers || 0,
        totalActiveServers: data.totalActiveServers || 0
      })
    } catch (error) {
      console.error('Error fetching servers:', error)
      setServers([])
    }
    setIsLoading(false)
    if (showRefresh) setRefreshing(false)
  }

  useEffect(() => {
    if (isOpen) {
      fetchServers()
      const interval = setInterval(fetchServers, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  // Helper functions
  const getStakeCategory = (stake) => {
    if (stake === 0) return 'Practice'
    if (stake <= 0.02) return 'Micro Stakes'
    if (stake <= 0.10) return 'Low Stakes'
    return 'High Stakes'
  }

  const getRegionFlag = (region) => {
    const flagMap = {
      'US East': '🇺🇸',
      'US West': '🇺🇸',
      'Europe (Frankfurt)': '🇩🇪',
      'Europe (London)': '🇬🇧',
      'Oceania': '🇦🇺',
      'OCE (Sydney)': '🇦🇺'
    }
    return flagMap[region] || '🌍'
  }

  // Process servers
  const processedServers = servers.map(server => ({
    ...server,
    stakeCategory: getStakeCategory(server.entryFee || 0),
    regionFlag: getRegionFlag(server.region),
    isActive: server.currentPlayers > 0,
    isEmpty: server.currentPlayers === 0
  }))

  // Filter by stake
  const filteredServers = selectedStakeFilter === 'All' 
    ? processedServers 
    : processedServers.filter(server => server.stakeCategory === selectedStakeFilter)

  // Separate active and empty
  const activeServers = filteredServers.filter(server => server.isActive)
  const emptyServers = filteredServers.filter(server => server.isEmpty)

  const handleJoinServer = (server) => {
    onJoinLobby({
      id: server.id,
      region: server.region,
      name: server.name,
      entryFee: server.entryFee,
      gameType: server.gameType,
      mode: server.mode
    })
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a202c',
        border: '2px solid #10b981',
        borderRadius: '8px',
        padding: '24px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #10b981',
          paddingBottom: '16px'
        }}>
          <h2 style={{
            color: '#10b981',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            🎮 NEW REDESIGNED SERVER BROWSER v4.0
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#10b981',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#2d3748',
          borderRadius: '6px',
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
        </div>

        {/* NEW: Stake Filter Pills */}
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

        {/* Server List */}
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          border: '1px solid #374151',
          borderRadius: '8px',
          backgroundColor: '#2d3748'
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              🔄 Loading servers...
            </div>
          ) : (
            <>
              {/* NEW: Active Servers First */}
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
                        {/* NEW: Condensed One-Line Format */}
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

              {/* NEW: Empty Servers Collapsible */}
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
          <span>Auto-refresh every 5 seconds</span>
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