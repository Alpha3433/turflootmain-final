'use client'

import { useState, useEffect } from 'react'

const LeaderboardModal = ({ isOpen, onClose }) => {
  const [leaderboard, setLeaderboard] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [leaderboardType, setLeaderboardType] = useState('winnings')

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard()
    }
  }, [isOpen, leaderboardType])

  const loadLeaderboard = async () => {
    setIsLoading(true)
    try {
      console.log('🏆 Loading leaderboard data, type:', leaderboardType)
      
      const response = await fetch('/api/users/leaderboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Leaderboard data received:', data)
        
        // Process the leaderboard data
        const processedLeaderboard = data.users?.map((userData, index) => ({
          rank: index + 1,
          username: userData.username,
          gamesWon: userData.gamesWon || 0,
          gamesPlayed: userData.gamesPlayed || 0,
          totalTerritory: userData.totalTerritory || 0,
          winRate: userData.gamesPlayed > 0 ? ((userData.gamesWon / userData.gamesPlayed) * 100).toFixed(1) : '0.0',
          bestPercent: userData.bestPercent || 0
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
      setIsLoading(false)
    }
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
      zIndex: 100000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1a202c',
        border: '2px solid #68d391',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 0 30px rgba(104, 211, 145, 0.3)'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #68d391',
          background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                🏆
              </div>
              <div>
                <h2 style={{ 
                  color: '#68d391', 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  margin: 0,
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(104, 211, 145, 0.6)'
                }}>
                  GLOBAL LEADERBOARD
                </h2>
                <p style={{ 
                  color: '#a0aec0', 
                  fontSize: '14px', 
                  margin: '4px 0 0 0',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  Top players by performance
                </p>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(252, 129, 129, 0.2)',
                border: '2px solid #fc8181',
                borderRadius: '8px',
                padding: '8px',
                color: '#fc8181',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Leaderboard Type Filter */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'rgba(26, 32, 44, 0.5)',
          borderBottom: '1px solid rgba(104, 211, 145, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              color: '#68d391', 
              fontSize: '14px', 
              fontWeight: '600',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              FILTER:
            </span>
            <select
              value={leaderboardType}
              onChange={(e) => setLeaderboardType(e.target.value)}
              style={{
                background: '#2d3748',
                border: '2px solid #68d391',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#e2e8f0',
                fontSize: '14px',
                fontFamily: '"Rajdhani", sans-serif',
                cursor: 'pointer'
              }}
            >
              <option value="winnings">By Winnings</option>
              <option value="winrate">By Win Rate</option>
              <option value="games">By Games Played</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '20px 24px', 
          maxHeight: '500px', 
          overflowY: 'auto',
          backgroundColor: '#1a202c'
        }}>
          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#68d391',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '12px' }}>🔄 LOADING LEADERBOARD...</div>
              <div style={{ fontSize: '14px', color: '#a0aec0' }}>Fetching latest rankings</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Header Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 120px 120px 120px 100px',
                gap: '16px',
                padding: '12px 16px',
                backgroundColor: 'rgba(104, 211, 145, 0.1)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                color: '#68d391',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                <div>RANK</div>
                <div>PLAYER</div>
                <div>GAMES WON</div>
                <div>GAMES PLAYED</div>
                <div>WIN RATE</div>
                <div>TERRITORY</div>
              </div>
              
              {/* Leaderboard Entries */}
              {leaderboard.length > 0 ? (
                leaderboard.map((player, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 120px 120px 120px 100px',
                      gap: '16px',
                      padding: '16px',
                      backgroundColor: index % 2 === 0 ? 'rgba(45, 55, 72, 0.3)' : 'rgba(26, 32, 44, 0.3)',
                      borderRadius: '8px',
                      borderLeft: index < 3 ? `4px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32'}` : '4px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(104, 211, 145, 0.1)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'rgba(45, 55, 72, 0.3)' : 'rgba(26, 32, 44, 0.3)'
                      e.currentTarget.style.transform = 'translateX(0px)'
                    }}
                  >
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: index < 3 ? (index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32') : '#68d391',
                      fontFamily: '"Rajdhani", sans-serif',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      #{player.rank}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#e2e8f0',
                      fontFamily: '"Rajdhani", sans-serif',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {player.username || 'Anonymous'}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: '#68d391',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {player.gamesWon}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: '#a0aec0',
                      fontFamily: '"Rajdhani", sans-serif',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {player.gamesPlayed}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: parseFloat(player.winRate) >= 70 ? '#68d391' : parseFloat(player.winRate) >= 50 ? '#f6ad55' : '#fc8181',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {player.winRate}%
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: '#f6ad55',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {player.totalTerritory}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: '#a0aec0',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '12px' }}>📊 NO DATA AVAILABLE</div>
                  <div style={{ fontSize: '14px' }}>Play some games to see the leaderboard!</div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'rgba(26, 32, 44, 0.8)',
          borderTop: '1px solid rgba(104, 211, 145, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#68d391',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            🔄 Updates in real-time • Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeaderboardModal