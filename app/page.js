'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootGlass() {
  const router = useRouter()
  const [selectedStake, setSelectedStake] = useState('$1')
  const [liveStats, setLiveStats] = useState({ players: 28, winnings: 418237 })
  const [userName, setUserName] = useState('anth')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Simulate live stats updates
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        players: Math.floor(Math.random() * 45) + 25,
        winnings: Math.floor(Math.random() * 250000) + 300000
      }))
    }, 4000)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const handleJoinGame = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
    color: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ...(isMobile && {
      overflow: 'auto',
      paddingBottom: '20px'
    })
  }

  const mobileContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: '15px',
    gap: '20px',
    position: 'relative',
    zIndex: 10
  }

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    borderRadius: isMobile ? '16px' : '24px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: isMobile 
      ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
      : '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
    padding: isMobile ? '16px' : '24px'
  }

  const neomorphStyle = {
    background: '#f0f4f8',
    borderRadius: isMobile ? '16px' : '20px',
    boxShadow: isMobile
      ? '9px 9px 16px #d1d9e6, -9px -9px 16px #ffffff'
      : '15px 15px 30px #d1d9e6, -15px -15px 30px #ffffff',
    border: 'none',
    padding: isMobile ? '16px' : '20px'
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? '0' : '20px 40px',
    zIndex: 20,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0
    })
  }

  const titleStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 15,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: '100px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const mainTitleStyle = {
    fontSize: isMobile ? '2.8rem' : '5rem',
    fontWeight: '800',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em'
  }

  const subtitleStyle = {
    color: '#64748b',
    fontWeight: '600',
    fontSize: isMobile ? '14px' : '18px',
    letterSpacing: '0.05em',
    margin: 0,
    textTransform: 'uppercase'
  }

  const centerControlsStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 15,
    ...(isMobile ? {} : {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -40%)'
    })
  }

  const nameInputStyle = {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '12px',
    padding: isMobile ? '12px 16px' : '14px 20px',
    color: '#1e293b',
    fontWeight: '500',
    textAlign: 'center',
    width: isMobile ? '160px' : '200px',
    fontSize: isMobile ? '14px' : '16px',
    boxShadow: 'inset 2px 2px 4px rgba(148, 163, 184, 0.1)',
    outline: 'none',
    transition: 'all 0.3s ease'
  }

  const stakeButtonStyle = {
    padding: isMobile ? '12px 20px' : '16px 32px',
    borderRadius: '16px',
    fontWeight: '600',
    fontSize: isMobile ? '14px' : '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: 'none',
    margin: isMobile ? '0 4px' : '0 8px',
    backdropFilter: 'blur(10px)'
  }

  const activeStakeStyle = {
    ...stakeButtonStyle,
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#ffffff',
    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-2px)'
  }

  const inactiveStakeStyle = {
    ...stakeButtonStyle,
    background: 'rgba(255, 255, 255, 0.7)',
    color: '#475569',
    boxShadow: '0 4px 15px rgba(148, 163, 184, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
  }

  const joinButtonStyle = {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    color: '#ffffff',
    fontWeight: '700',
    padding: isMobile ? '16px 48px' : '20px 64px',
    borderRadius: '20px',
    fontSize: isMobile ? '16px' : '20px',
    marginBottom: isMobile ? '20px' : '32px',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    letterSpacing: '0.02em'
  }

  const secondaryButtonStyle = {
    padding: isMobile ? '10px 20px' : '12px 24px',
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    margin: isMobile ? '0 6px' : '0 10px',
    fontWeight: '500',
    fontSize: isMobile ? '12px' : '14px',
    boxShadow: '0 4px 15px rgba(148, 163, 184, 0.1)'
  }

  const iconStyle = {
    width: isMobile ? '24px' : '32px',
    height: isMobile ? '24px' : '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '12px' : '16px',
    fontWeight: '600'
  }

  const statsStyle = {
    textAlign: 'center',
    display: 'flex',
    gap: isMobile ? '48px' : '80px',
    justifyContent: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 15,
    ...(isMobile ? {} : {
      position: 'absolute',
      bottom: '120px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const statItemStyle = {
    textAlign: 'center'
  }

  const statNumberStyle = {
    fontSize: isMobile ? '28px' : '42px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '4px'
  }

  const statLabelStyle = {
    color: '#64748b',
    fontSize: isMobile ? '12px' : '14px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }

  const mobileGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    width: '100%'
  }

  // Desktop Layout
  if (!isMobile) {
    return (
      <div style={containerStyle}>
        
        {/* Floating Glass Orbs */}
        <div style={{
          position: 'absolute',
          top: '12%',
          left: '8%',
          zIndex: 5,
          width: '100px',
          height: '100px',
          background: 'rgba(59, 130, 246, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50%',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
          animation: 'gentleFloat 8s ease-in-out infinite'
        }} />

        <div style={{
          position: 'absolute',
          top: '65%',
          right: '12%',
          zIndex: 5,
          width: '80px',
          height: '80px',
          background: 'rgba(139, 92, 246, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50%',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
          animation: 'gentleFloat 10s ease-in-out infinite reverse'
        }} />

        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '15%',
          zIndex: 5,
          width: '60px',
          height: '60px',
          background: 'rgba(16, 185, 129, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50%',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          animation: 'gentleFloat 12s ease-in-out infinite'
        }} />

        {/* Subtle Grid Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.03,
          zIndex: 1,
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />

        {/* Desktop Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              🔥
            </div>
            <span style={{ 
              color: '#475569', 
              fontWeight: '600', 
              fontSize: '16px'
            }}>Welcome, ty8898812</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'rgba(255, 255, 255, 0.6)', 
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  boxShadow: '0 4px 15px rgba(148, 163, 184, 0.1)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Desktop Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>Skill-Based Grid Domination</p>
        </div>

        {/* Desktop Center Controls */}
        <div style={centerControlsStyle}>
          {/* Player Name Input */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '24px',
                boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}>
                0
              </div>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={nameInputStyle}
                placeholder="Enter your name"
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), inset 2px 2px 4px rgba(148, 163, 184, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)'
                  e.target.style.boxShadow = 'inset 2px 2px 4px rgba(148, 163, 184, 0.1)'
                }}
              />
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}>
                ✓
              </div>
            </div>
          </div>

          {/* Stakes */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', justifyContent: 'center' }}>
            {['$1', '$5', '$20'].map((stake) => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                style={selectedStake === stake ? activeStakeStyle : inactiveStakeStyle}
                onMouseOver={(e) => {
                  if (selectedStake !== stake) {
                    e.target.style.transform = 'translateY(-1px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(148, 163, 184, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedStake !== stake) {
                    e.target.style.transform = 'translateY(0px)'
                    e.target.style.boxShadow = '0 4px 15px rgba(148, 163, 184, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                  }
                }}
              >
                {stake}
              </button>
            ))}
          </div>

          {/* Main Join Button */}
          <button 
            onClick={handleJoinGame}
            style={joinButtonStyle}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-3px)'
              e.target.style.boxShadow = '0 15px 40px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0px)'
              e.target.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            ▶ JOIN GAME
          </button>

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              style={secondaryButtonStyle}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.8)'
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 6px 20px rgba(148, 163, 184, 0.2)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.6)'
                e.target.style.transform = 'translateY(0px)'
                e.target.style.boxShadow = '0 4px 15px rgba(148, 163, 184, 0.1)'
              }}
            >
              AI EU
            </button>
            <button 
              style={secondaryButtonStyle}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.8)'
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 6px 20px rgba(148, 163, 184, 0.2)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.6)'
                e.target.style.transform = 'translateY(0px)'
                e.target.style.boxShadow = '0 4px 15px rgba(148, 163, 184, 0.1)'
              }}
            >
              Browse Lobbies
            </button>
          </div>
        </div>

        {/* Desktop Panels */}
        {/* Left Panel - Leaderboard */}
        <div style={{
          position: 'absolute',
          left: '40px',
          top: '220px',
          width: '320px',
          zIndex: 10,
          ...glassStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
            }}>🏆</div>
            <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Leaderboard</h3>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{
                padding: '4px 10px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                fontSize: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontWeight: '600'
              }}>
                Live
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
              <span style={{ color: '#475569', fontSize: '15px', fontWeight: '500' }}>1. Quantum</span>
              <span style={{ 
                color: '#f59e0b', 
                fontWeight: '700', 
                fontSize: '15px'
              }}>$6,559.45</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
              <span style={{ color: '#475569', fontSize: '15px', fontWeight: '500' }}>2. Dernie237</span>
              <span style={{ 
                color: '#f59e0b', 
                fontWeight: '700', 
                fontSize: '15px'
              }}>$5,210.67</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#475569', fontSize: '15px', fontWeight: '500' }}>3. Mr.TK216</span>
              <span style={{ 
                color: '#f59e0b', 
                fontWeight: '700', 
                fontSize: '15px'
              }}>$4,757.38</span>
            </div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            color: '#475569',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(148, 163, 184, 0.1)'
          }}>
            View Full Leaderboard
          </button>
        </div>

        {/* Right Panel - Wallet */}
        <div style={{
          position: 'absolute',
          right: '40px',
          top: '220px',
          width: '300px',
          zIndex: 10,
          ...glassStyle,
          border: '1px solid rgba(6, 182, 212, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)'
            }}>💎</div>
            <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Wallet</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>[?] Copy Address</button>
              <button style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>[↻] Refresh Balance</button>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: '800', 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px'
            }}>$0.00</div>
            <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>0.0000 SOL</div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(16, 185, 129, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              color: '#059669',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)'
            }}>
              Add Funds
            </button>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(59, 130, 246, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              color: '#2563eb',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)'
            }}>
              Cash Out
            </button>
          </div>
        </div>

        {/* Bottom Left - Friends */}
        <div style={{
          position: 'absolute',
          left: '40px',
          bottom: '40px',
          width: '320px',
          zIndex: 10,
          ...glassStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
            }}>👥</div>
            <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Friends</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>[↻] Refresh</span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>0 playing</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'rgba(148, 163, 184, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 4px 15px rgba(148, 163, 184, 0.1)'
            }}>
              👤
            </div>
            <div style={{ color: '#64748b', fontSize: '15px', marginBottom: '8px', fontWeight: '500' }}>No friends... add some!</div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            color: '#475569',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(148, 163, 184, 0.1)'
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
        <div style={{
          position: 'absolute',
          right: '40px',
          bottom: '40px',
          width: '300px',
          zIndex: 10,
          ...glassStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', 
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'
            }}>🎨</div>
            <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '18px', margin: 0 }}>Customize</h3>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'rgba(236, 72, 153, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 8px 25px rgba(236, 72, 153, 0.2)',
              border: '1px solid rgba(236, 72, 153, 0.2)'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#1e293b',
                borderRadius: '50%',
                position: 'absolute',
                top: '20px',
                left: '22px'
              }} />
              <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#1e293b',
                borderRadius: '50%',
                position: 'absolute',
                top: '20px',
                right: '22px'
              }} />
            </div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '12px',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.3s ease'
          }}>
            👤 Manage Affiliate
          </button>
          
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            color: '#475569',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(148, 163, 184, 0.1)'
          }}>
            Change Appearance
          </button>
        </div>

        {/* Discord Button */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          zIndex: 10
        }}>
          <button style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #5865f2 0%, #4752c4 100%)',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 15px rgba(88, 101, 242, 0.3)',
            transition: 'all 0.3s ease'
          }}>
            🎮 Join Discord!
          </button>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes gentleFloat {
            0%, 100% { 
              transform: translateY(0px);
              opacity: 0.7;
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

  // Mobile Layout
  return (
    <div style={containerStyle}>
      
      {/* Mobile Floating Elements (Subtle) */}
      <div style={{
        position: 'fixed',
        top: '5%',
        left: '5%',
        zIndex: 2,
        width: '40px',
        height: '40px',
        background: 'rgba(59, 130, 246, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '50%',
        border: '1px solid rgba(59, 130, 246, 0.1)',
        animation: 'gentleFloat 8s ease-in-out infinite'
      }} />

      <div style={{
        position: 'fixed',
        bottom: '15%',
        right: '5%',
        zIndex: 2,
        width: '30px',
        height: '30px',
        background: 'rgba(139, 92, 246, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '50%',
        border: '1px solid rgba(139, 92, 246, 0.1)',
        animation: 'gentleFloat 10s ease-in-out infinite reverse'
      }} />

      {/* Mobile Content Container */}
      <div style={mobileContainerStyle}>
        
        {/* Mobile Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
            }}>
              🔥
            </div>
            <span style={{ 
              color: '#475569', 
              fontWeight: '600', 
              fontSize: '14px'
            }}>Welcome, ty8898812</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: 'rgba(255, 255, 255, 0.6)', 
                  backdropFilter: 'blur(10px)',
                  borderRadius: '6px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  boxShadow: '0 2px 8px rgba(148, 163, 184, 0.1)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Mobile Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>Skill-Based Grid Domination</p>
        </div>

        {/* Mobile Game Controls */}
        <div style={centerControlsStyle}>
          {/* Player Name Input */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '18px',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
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
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
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
          >
            ▶ JOIN GAME
          </button>

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button style={secondaryButtonStyle}>AI EU</button>
            <button style={secondaryButtonStyle}>Browse Lobbies</button>
          </div>
        </div>

        {/* Mobile Stats */}
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

        {/* Mobile Panels Grid */}
        <div style={mobileGridStyle}>
          {/* Leaderboard Panel */}
          <div style={neomorphStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }}>🏆</div>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '14px', margin: 0 }}>Leaderboard</h3>
            </div>
            
            <div style={{ marginBottom: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <span style={{ color: '#475569', fontWeight: '500' }}>1. Quantum</span>
                <span style={{ color: '#f59e0b', fontWeight: '700' }}>$6.5K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <span style={{ color: '#475569', fontWeight: '500' }}>2. Dernie237</span>
                <span style={{ color: '#f59e0b', fontWeight: '700' }}>$5.2K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#475569', fontWeight: '500' }}>3. Mr.TK216</span>
                <span style={{ color: '#f59e0b', fontWeight: '700' }}>$4.7K</span>
              </div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              background: '#f8fafc',
              border: 'none',
              borderRadius: '10px',
              color: '#475569',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: 'inset 2px 2px 4px #e2e8f0, inset -2px -2px 4px #ffffff'
            }}>
              View Full
            </button>
          </div>

          {/* Wallet Panel */}
          <div style={{...neomorphStyle, border: '1px solid rgba(6, 182, 212, 0.1)'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
              }}>💎</div>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '14px', margin: 0 }}>Wallet</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '800', 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '2px'
              }}>$0.00</div>
              <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '500' }}>0.0000 SOL</div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{
                flex: 1,
                padding: '8px',
                background: '#f0fdf4',
                border: 'none',
                borderRadius: '8px',
                color: '#059669',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '10px',
                boxShadow: 'inset 1px 1px 2px #dcfce7, inset -1px -1px 2px #ffffff'
              }}>
                Add
              </button>
              <button style={{
                flex: 1,
                padding: '8px',
                background: '#eff6ff',
                border: 'none',
                borderRadius: '8px',
                color: '#2563eb',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '10px',
                boxShadow: 'inset 1px 1px 2px #dbeafe, inset -1px -1px 2px #ffffff'
              }}>
                Cash Out
              </button>
            </div>
          </div>

          {/* Friends Panel */}
          <div style={neomorphStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
              }}>👥</div>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '14px', margin: 0 }}>Friends</h3>
            </div>
            
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#f8fafc',
                borderRadius: '50%',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                boxShadow: 'inset 2px 2px 4px #e2e8f0, inset -2px -2px 4px #ffffff'
              }}>
                👤
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '500' }}>No friends yet</div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              background: '#f8fafc',
              border: 'none',
              borderRadius: '10px',
              color: '#475569',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: 'inset 2px 2px 4px #e2e8f0, inset -2px -2px 4px #ffffff'
            }}>
              Add Friends
            </button>
          </div>

          {/* Customize Panel */}
          <div style={neomorphStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', 
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)'
              }}>🎨</div>
              <h3 style={{ color: '#1e293b', fontWeight: '700', fontSize: '14px', margin: 0 }}>Customize</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#fdf2f8',
                borderRadius: '50%',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: 'inset 2px 2px 4px #fce7f3, inset -2px -2px 4px #ffffff',
                border: '1px solid rgba(236, 72, 153, 0.1)'
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#1e293b',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '12px',
                  left: '12px'
                }} />
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#1e293b',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '12px',
                  right: '12px'
                }} />
              </div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '6px',
              fontSize: '10px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
            }}>
              👤 Manage Affiliate
            </button>
            
            <button style={{
              width: '100%',
              padding: '6px',
              background: '#f8fafc',
              border: 'none',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '10px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: 'inset 2px 2px 4px #e2e8f0, inset -2px -2px 4px #ffffff'
            }}>
              Change Appearance
            </button>
          </div>
        </div>

        {/* Mobile Discord Button */}
        <div style={{ textAlign: 'center' }}>
          <button style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #5865f2 0%, #4752c4 100%)',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(88, 101, 242, 0.3)',
            fontSize: '14px'
          }}>
            🎮 Join Discord!
          </button>
        </div>
      </div>

      {/* Mobile CSS Animations */}
      <style jsx>{`
        @keyframes gentleFloat {
          0%, 100% { 
            transform: translateY(0px);
            opacity: 0.5;
          }
          50% { 
            transform: translateY(-15px);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}