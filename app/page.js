'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootGaming() {
  const router = useRouter()
  const [selectedStake, setSelectedStake] = useState('$1')
  const [liveStats, setLiveStats] = useState({ players: 23, winnings: 287451 })
  const [userName, setUserName] = useState('anth')

  useEffect(() => {
    // Simulate live stats updates
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        players: Math.floor(Math.random() * 40) + 15,
        winnings: Math.floor(Math.random() * 150000) + 200000
      }))
    }, 4000)
    
    return () => clearInterval(interval)
  }, [])

  const handleJoinGame = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#000000',
    color: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: 'Arial, sans-serif'
  }

  const headerStyle = {
    position: 'absolute',
    top: '16px',
    left: '16px',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const titleStyle = {
    position: 'absolute',
    top: '96px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 30,
    textAlign: 'center'
  }

  const mainTitleStyle = {
    fontSize: '4rem',
    fontWeight: '900',
    marginBottom: '8px',
    margin: 0
  }

  const subtitleStyle = {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '18px',
    letterSpacing: '2px',
    margin: 0
  }

  const panelStyle = {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: '16px',
    border: '1px solid #374151',
    padding: '16px'
  }

  const leaderboardStyle = {
    position: 'absolute',
    left: '24px',
    top: '160px',
    width: '320px',
    zIndex: 40,
    ...panelStyle
  }

  const walletStyle = {
    position: 'absolute',
    right: '24px',
    top: '160px',
    width: '288px',
    zIndex: 40,
    ...panelStyle,
    borderColor: 'rgba(6, 182, 212, 0.3)'
  }

  const friendsStyle = {
    position: 'absolute',
    left: '24px',
    bottom: '24px',
    width: '320px',
    zIndex: 40,
    ...panelStyle
  }

  const customizeStyle = {
    position: 'absolute',
    right: '24px',
    bottom: '24px',
    width: '288px',
    zIndex: 40,
    ...panelStyle
  }

  const centerControlsStyle = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 30,
    textAlign: 'center'
  }

  const nameInputStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    width: '160px',
    fontSize: '16px'
  }

  const stakeButtonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid #374151',
    margin: '0 4px'
  }

  const activeStakeStyle = {
    ...stakeButtonStyle,
    backgroundColor: '#facc15',
    color: '#000000',
    border: '2px solid #fbbf24'
  }

  const inactiveStakeStyle = {
    ...stakeButtonStyle,
    backgroundColor: '#1f2937',
    color: '#ffffff'
  }

  const joinButtonStyle = {
    background: 'linear-gradient(135deg, #facc15 0%, #f97316 100%)',
    color: '#000000',
    fontWeight: 'bold',
    padding: '16px 64px',
    borderRadius: '16px',
    fontSize: '20px',
    marginBottom: '24px',
    cursor: 'pointer',
    border: '2px solid #fbbf24',
    boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)',
    transition: 'all 0.3s ease'
  }

  const secondaryButtonStyle = {
    padding: '8px 24px',
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#9ca3af',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    margin: '0 8px'
  }

  const iconStyle = {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px'
  }

  const statsStyle = {
    position: 'absolute',
    bottom: '64px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 30,
    textAlign: 'center',
    display: 'flex',
    gap: '64px'
  }

  const statItemStyle = {
    textAlign: 'center'
  }

  const statNumberStyle = {
    fontSize: '32px',
    fontWeight: '900',
    color: '#facc15',
    marginBottom: '4px'
  }

  const statLabelStyle = {
    color: '#9ca3af',
    fontSize: '14px'
  }

  return (
    <div style={containerStyle}>
      
      {/* Top Header */}
      <div style={headerStyle}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}>
          🔥
        </div>
        <span style={{ color: '#f97316', fontWeight: 'bold' }}>Welcome, ty8898812</span>
      </div>

      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ width: '24px', height: '24px', backgroundColor: '#4b5563', borderRadius: '4px' }}></div>
        <div style={{ width: '24px', height: '24px', backgroundColor: '#4b5563', borderRadius: '4px' }}></div>
        <div style={{ width: '24px', height: '24px', backgroundColor: '#4b5563', borderRadius: '4px' }}></div>
      </div>

      {/* Floating Game Elements */}
      <div style={{
        position: 'absolute',
        top: '64px',
        left: '128px',
        zIndex: 20,
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        borderRadius: '50%',
        opacity: 0.8,
        animation: 'float 4s ease-in-out infinite'
      }}></div>
      
      <div style={{
        position: 'absolute',
        bottom: '128px',
        right: '160px',
        zIndex: 20,
        width: '64px',
        height: '64px',
        background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        borderRadius: '50%',
        opacity: 0.7,
        animation: 'float 6s ease-in-out infinite'
      }}></div>

      {/* Main Title */}
      <div style={titleStyle}>
        <h1 style={mainTitleStyle}>
          <span style={{ color: '#ffffff' }}>TURF</span>
          <span style={{ color: '#facc15' }}>LOOT</span>
        </h1>
        <p style={subtitleStyle}>SKILL-BASED GRID DOMINATION</p>
      </div>

      {/* Left Panel - Leaderboard */}
      <div style={leaderboardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ ...iconStyle, backgroundColor: '#facc15', color: '#000000' }}>🏆</div>
          <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Leaderboard</h3>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{
              padding: '2px 8px',
              backgroundColor: 'rgba(34, 197, 94, 0.3)',
              color: '#22c55e',
              fontSize: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.5)'
            }}>
              Live
            </div>
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ color: '#d1d5db', fontSize: '14px' }}>1. Quantum</span>
            <span style={{ color: '#facc15', fontWeight: 'bold', fontSize: '14px' }}>$6,559.45</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ color: '#d1d5db', fontSize: '14px' }}>2. Dernie237</span>
            <span style={{ color: '#facc15', fontWeight: 'bold', fontSize: '14px' }}>$5,210.67</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ color: '#d1d5db', fontSize: '14px' }}>3. Mr.TK216</span>
            <span style={{ color: '#facc15', fontWeight: 'bold', fontSize: '14px' }}>$4,757.38</span>
          </div>
        </div>
        
        <button style={{
          width: '100%',
          padding: '8px',
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#d1d5db',
          fontSize: '14px',
          cursor: 'pointer'
        }}>
          View Full Leaderboard
        </button>
      </div>

      {/* Center Area - Game Controls */}
      <div style={centerControlsStyle}>
        
        {/* Player Name Input */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#facc15',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              fontWeight: 'bold',
              fontSize: '20px'
            }}>
              0
            </div>
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={nameInputStyle}
              placeholder="Enter your name"
            />
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#22c55e',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold'
            }}>
              ✓
            </div>
          </div>
        </div>

        {/* Stakes */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
          {['$1', '$5', '$20'].map((stake) => (
            <button
              key={stake}
              onClick={() => setSelectedStake(stake)}
              style={selectedStake === stake ? activeStakeStyle : inactiveStakeStyle}
            >
              {stake}
            </button>
          ))}
        </div>

        {/* Main Join Button */}
        <button 
          onClick={handleJoinGame}
          style={joinButtonStyle}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          ▶ JOIN GAME
        </button>

        {/* Secondary Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button style={secondaryButtonStyle}>AI EU</button>
          <button style={secondaryButtonStyle}>Browse Lobbies</button>
        </div>
      </div>

      {/* Right Panel - Wallet */}
      <div style={walletStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ ...iconStyle, backgroundColor: '#06b6d4', color: '#ffffff' }}>💰</div>
          <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Wallet</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>[?] Copy Address</button>
            <button style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>[↻] Refresh Balance</button>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#facc15', marginBottom: '4px' }}>$0.00</div>
          <div style={{ color: '#9ca3af', fontSize: '14px' }}>0.0000 SOL</div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button style={{
            flex: 1,
            padding: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.3)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '8px',
            color: '#22c55e',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Add Funds
          </button>
          <button style={{
            flex: 1,
            padding: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '8px',
            color: '#3b82f6',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Cash Out
          </button>
        </div>
      </div>

      {/* Bottom Left - Friends */}
      <div style={friendsStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ ...iconStyle, backgroundColor: '#3b82f6', color: '#ffffff' }}>👥</div>
          <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Friends</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>[↻] Refresh</span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>0 playing</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#4b5563',
            borderRadius: '50%',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            👤
          </div>
          <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '8px' }}>No friends... add some!</div>
        </div>
        
        <button style={{
          width: '100%',
          padding: '8px',
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#d1d5db',
          fontSize: '14px',
          cursor: 'pointer'
        }}>
          Add Friends
        </button>
      </div>

      {/* Bottom Center - Stats */}
      <div style={statsStyle}>
        <div style={statItemStyle}>
          <div style={statNumberStyle}>{liveStats.players}</div>
          <div style={statLabelStyle}>Players in Game</div>
        </div>
        <div style={statItemStyle}>
          <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
          <div style={statLabelStyle}>Global Player Winnings</div>
        </div>
      </div>

      {/* Bottom Right - Customize */}
      <div style={customizeStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ ...iconStyle, backgroundColor: '#8b5cf6', color: '#ffffff' }}>🎨</div>
          <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Customize</h3>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#ec4899',
            borderRadius: '50%',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#000000',
              borderRadius: '50%',
              position: 'absolute',
              top: '16px',
              left: '20px'
            }}></div>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#000000',
              borderRadius: '50%',
              position: 'absolute',
              top: '16px',
              right: '20px'
            }}></div>
          </div>
        </div>
        
        <button style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#facc15',
          color: '#000000',
          fontWeight: 'bold',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '8px'
        }}>
          👤 Manage Affiliate
        </button>
        
        <button style={{
          width: '100%',
          padding: '8px',
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#d1d5db',
          fontSize: '14px',
          cursor: 'pointer'
        }}>
          Change Appearance
        </button>
      </div>

      {/* Discord Button */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 40
      }}>
        <button style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          fontWeight: 'bold',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🎮 Join Discord!
        </button>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px);
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-20px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}