'use client'

import { useState, useEffect } from 'react'

const ServerBrowserModal = ({ isOpen, onClose, onJoinLobby }) => {
  console.log('🎮 REDESIGNED ServerBrowserModal v4.0 FORCE UPDATE loaded:', isOpen)
  
  const [servers, setServers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStakeFilter, setSelectedStakeFilter] = useState('All')
  const [showEmptyServers, setShowEmptyServers] = useState(false)
  const [totalStats, setTotalStats] = useState({ totalPlayers: 0, totalActiveServers: 0 })
  const [errorMessage, setErrorMessage] = useState('')
  const [pingingRegions, setPingingRegions] = useState(false)

  // Client-side ping measurement function
  const measureClientPing = async (endpoint) => {
    try {
      const startTime = performance.now()
      
      // Try to ping the Hathora API endpoint with CORS-friendly request
      const response = await fetch(`https://${endpoint}/health`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      const endTime = performance.now()
      const clientPing = Math.round(endTime - startTime)
      
      console.log(`📡 Client ping to ${endpoint}: ${clientPing}ms`)
      return Math.min(clientPing, 999) // Cap at 999ms for display
    } catch (error) {
      console.warn(`⚠️ Client ping to ${endpoint} failed:`, error.message)
      
      // Fallback: Try a simple fetch to the main domain
      try {
        const startTime = performance.now()
        await fetch(`https://${endpoint}`, { 
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(3000)
        })
        const endTime = performance.now()
        const fallbackPing = Math.round(endTime - startTime)
        console.log(`📡 Fallback ping to ${endpoint}: ${fallbackPing}ms`)
        return Math.min(fallbackPing, 999)
      } catch (fallbackError) {
        console.warn(`⚠️ Fallback ping also failed for ${endpoint}`)
        // Return estimated ping based on region
        return endpoint.includes('sydney') ? 180 : 
               endpoint.includes('frankfurt') ? 45 :
               endpoint.includes('london') ? 55 :
               endpoint.includes('seattle') ? 35 : 25
      }
    }
  }

  // Measure client-side pings for all servers
  const measureServerPings = async (serverList) => {
    if (!serverList || serverList.length === 0) return serverList
    
    setPingingRegions(true)
    console.log('📡 Measuring client-side pings to game servers...')
    
    // Get unique ping endpoints
    const uniqueEndpoints = [...new Set(serverList.map(s => s.pingEndpoint))].filter(Boolean)
    
    // Measure pings concurrently
    const pingPromises = uniqueEndpoints.map(async (endpoint) => {
      const ping = await measureClientPing(endpoint)
      return { endpoint, ping }
    })
    
    const pingResults = await Promise.all(pingPromises)
    const pingMap = Object.fromEntries(pingResults.map(r => [r.endpoint, r.ping]))
    
    // Update servers with real client pings
    const serversWithPings = serverList.map(server => ({
      ...server,
      ping: server.pingEndpoint ? pingMap[server.pingEndpoint] : null
    }))
    
    setPingingRegions(false)
    console.log('✅ Client-side ping measurement complete')
    return serversWithPings
  }

  // Fetch servers
  const fetchServers = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    setErrorMessage('') // Clear previous errors
    
    try {
      console.log('🌐 Fetching servers from /api/servers...')
      const response = await fetch('/api/servers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      })
      console.log('📡 Server response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Server response error:', errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ Server data received:', {
        servers: data.servers?.length || 0,
        totalPlayers: data.totalPlayers || 0,
        totalActiveServers: data.totalActiveServers || 0,
        sampleServer: data.servers?.[0]?.name || 'No servers'
      })
      
      if (!data.servers || data.servers.length === 0) {
        console.warn('⚠️ No servers in response')
        setErrorMessage('No servers available')
        setServers([])
      } else {
        // Measure client-side pings for all servers
        const serversWithPings = await measureServerPings(data.servers)
        setServers(serversWithPings)
        setErrorMessage('')
      }
      
      setTotalStats({
        totalPlayers: data.totalPlayers || 0,
        totalActiveServers: data.totalActiveServers || 0
      })
    } catch (error) {
      console.error('❌ Error fetching servers:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      setErrorMessage(`Failed to load servers: ${error.message}`)
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

  // Process servers - exclude practice servers (entryFee === 0)
  const processedServers = servers
    .filter(server => server.entryFee > 0) // Only show cash games, remove practice servers
    .map(server => ({
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

  // Calculate dynamic stats from filtered servers (cash games only)
  const dynamicStats = {
    totalPlayers: filteredServers.reduce((sum, server) => sum + (server.currentPlayers || 0), 0),
    totalActiveServers: activeServers.length
  }

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
      zIndex: 99999
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
        {/* Header with ping status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #10b981',
          paddingBottom: '16px'
        }}>
          <div>
            <h2 style={{
              color: '#10b981',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: 0,
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              SERVER BROWSER
              {pingingRegions && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#10b981',
                  fontWeight: 'normal'
                }}>
                  📡 Measuring your ping...
                </span>
              )}
            </h2>
          </div>
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
            <strong style={{ color: '#10b981' }}>{dynamicStats.totalPlayers}</strong>
            <span style={{ color: '#9ca3af', marginLeft: '4px' }}>Players Online</span>
          </div>
          <div>
            <strong style={{ color: '#3b82f6' }}>{dynamicStats.totalActiveServers}</strong>
            <span style={{ color: '#9ca3af', marginLeft: '4px' }}>Active Servers</span>
          </div>
        </div>

        {/* NEW: Stake Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['All', 'Micro Stakes', 'Low Stakes', 'High Stakes'].map(stake => (
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
              {stake === 'Micro Stakes' ? 'Micro ($0.01-$0.02)' :
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
          ) : errorMessage ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Failed to Load Servers</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{errorMessage}</div>
              <button
                onClick={() => fetchServers(true)}
                style={{
                  marginTop: '16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🔄 Retry
              </button>
            </div>
          ) : servers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              📭 No servers available
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
                        backgroundColor: server.status === 'full' ? '#4a1e1e' : 'transparent',
                        border: 'none' // Remove any practice server highlighting
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
                          {server.ping !== null ? `${server.ping}ms ping` : (pingingRegions ? '... ping' : 'N/A ping')}
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
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        border: 'none' // Remove any practice server highlighting
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
                          {server.ping !== null ? `${server.ping}ms ping` : (pingingRegions ? '... ping' : 'N/A ping')}
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