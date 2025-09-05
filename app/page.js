'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootCosmic() {
  const router = useRouter()
  const [selectedStake, setSelectedStake] = useState('$1')
  const [liveStats, setLiveStats] = useState({ players: 31, winnings: 342876 })
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
        players: Math.floor(Math.random() * 50) + 20,
        winnings: Math.floor(Math.random() * 200000) + 250000
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
    background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f0a2e 50%, #000000 100%)',
    color: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: 'Arial, sans-serif',
    ...(isMobile && {
      overflow: 'auto',
      paddingBottom: '20px'
    })
  }

  const mobileContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: '10px',
    gap: '15px',
    position: 'relative',
    zIndex: 30
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? '10px 0' : '20px',
    zIndex: 60,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: 0,
      left: '20px',
      right: '20px'
    })
  }

  const titleStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 50,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: '120px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const mainTitleStyle = {
    fontSize: isMobile ? '2.5rem' : '4.5rem',
    fontWeight: '900',
    marginBottom: '8px',
    margin: 0,
    textShadow: '0 0 30px rgba(139, 92, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4)'
  }

  const subtitleStyle = {
    color: '#a855f7',
    fontWeight: 'bold',
    fontSize: isMobile ? '12px' : '18px',
    letterSpacing: isMobile ? '2px' : '3px',
    margin: 0,
    textShadow: '0 0 20px rgba(168, 85, 247, 0.6)'
  }

  const cosmicPanelStyle = {
    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 10, 46, 0.9) 100%)',
    borderRadius: isMobile ? '12px' : '20px',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    padding: isMobile ? '12px' : '20px',
    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    margin: isMobile ? '0' : 'auto',
    width: '100%'
  }

  const centerControlsStyle = {
    textAlign: 'center',
    padding: isMobile ? '15px 0' : '0',
    zIndex: 40,
    ...(isMobile ? {} : {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    })
  }

  const nameInputStyle = {
    backgroundColor: 'rgba(30, 27, 75, 0.8)',
    border: '2px solid rgba(139, 92, 246, 0.6)',
    borderRadius: '12px',
    padding: isMobile ? '10px 16px' : '12px 20px',
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    width: isMobile ? '140px' : '180px',
    fontSize: isMobile ? '14px' : '16px',
    boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
    backdropFilter: 'blur(10px)'
  }

  const stakeButtonStyle = {
    padding: isMobile ? '10px 16px' : '14px 28px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: isMobile ? '14px' : '18px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid rgba(139, 92, 246, 0.4)',
    margin: isMobile ? '0 3px' : '0 6px',
    backdropFilter: 'blur(10px)'
  }

  const activeStakeStyle = {
    ...stakeButtonStyle,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    color: '#ffffff',
    border: '2px solid #a855f7',
    boxShadow: '0 0 30px rgba(168, 85, 247, 0.6), 0 8px 20px rgba(139, 92, 246, 0.3)'
  }

  const inactiveStakeStyle = {
    ...stakeButtonStyle,
    backgroundColor: 'rgba(30, 27, 75, 0.6)',
    color: '#e0e7ff'
  }

  const joinButtonStyle = {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
    color: '#ffffff',
    fontWeight: 'bold',
    padding: isMobile ? '14px 40px' : '18px 80px',
    borderRadius: '20px',
    fontSize: isMobile ? '16px' : '22px',
    marginBottom: isMobile ? '15px' : '30px',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 0 40px rgba(139, 92, 246, 0.6), 0 12px 30px rgba(59, 130, 246, 0.4)',
    transition: 'all 0.3s ease',
    textShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
  }

  const secondaryButtonStyle = {
    padding: isMobile ? '8px 16px' : '10px 24px',
    backgroundColor: 'rgba(30, 27, 75, 0.7)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    borderRadius: '10px',
    color: '#c7d2fe',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    margin: isMobile ? '0 4px' : '0 8px',
    backdropFilter: 'blur(5px)',
    fontSize: isMobile ? '12px' : '14px'
  }

  const cosmicIconStyle = {
    width: isMobile ? '20px' : '28px',
    height: isMobile ? '20px' : '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '12px' : '16px',
    boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)'
  }

  const statsStyle = {
    textAlign: 'center',
    display: 'flex',
    gap: isMobile ? '40px' : '80px',
    justifyContent: 'center',
    padding: isMobile ? '15px 0' : '0',
    zIndex: 40,
    ...(isMobile ? {} : {
      position: 'absolute',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const statItemStyle = {
    textAlign: 'center'
  }

  const statNumberStyle = {
    fontSize: isMobile ? '24px' : '36px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
    textShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
  }

  const statLabelStyle = {
    color: '#c7d2fe',
    fontSize: isMobile ? '11px' : '14px',
    textShadow: '0 0 10px rgba(199, 210, 254, 0.5)'
  }

  const mobileGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    width: '100%'
  }

  // Desktop Layout
  if (!isMobile) {
    return (
      <div style={containerStyle}>
        
        {/* Animated Starfield Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          overflow: 'hidden'
        }}>
          {/* Stars */}
          {[...Array(100)].map((_, i) => (
            <div
              key={`star-${i}`}
              style={{
                position: 'absolute',
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                opacity: Math.random() * 0.8 + 0.2,
                animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`
              }}
            />
          ))}
        </div>

        {/* Floating Game Orbs (Large Player-like) */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          zIndex: 10,
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, #3b82f6 0%, #1e40af 70%, rgba(30, 64, 175, 0.3) 100%)',
          borderRadius: '50%',
          opacity: 0.7,
          animation: 'cosmicFloat 8s ease-in-out infinite',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.6), inset -10px -10px 20px rgba(30, 64, 175, 0.8)'
        }}>
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '25%',
            width: '15px',
            height: '15px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            opacity: 0.9
          }} />
          <div style={{
            position: 'absolute',
            top: '25%',
            right: '25%',
            width: '15px',
            height: '15px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            opacity: 0.9
          }} />
        </div>

        <div style={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          zIndex: 10,
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle, #ec4899 0%, #be185d 70%, rgba(190, 24, 93, 0.3) 100%)',
          borderRadius: '50%',
          opacity: 0.8,
          animation: 'cosmicFloat 10s ease-in-out infinite reverse',
          boxShadow: '0 0 40px rgba(236, 72, 153, 0.6), inset -8px -8px 16px rgba(190, 24, 93, 0.8)'
        }}>
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '30%',
            width: '12px',
            height: '12px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            opacity: 0.9
          }} />
          <div style={{
            position: 'absolute',
            top: '30%',
            right: '30%',
            width: '12px',
            height: '12px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            opacity: 0.9
          }} />
        </div>

        {/* Floating Food Pellets */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`pellet-${i}`}
            style={{
              position: 'absolute',
              width: Math.random() * 8 + 4 + 'px',
              height: Math.random() * 8 + 4 + 'px',
              background: `radial-gradient(circle, ${['#22c55e', '#eab308', '#f97316', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 5)]} 0%, transparent 70%)`,
              borderRadius: '50%',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.3,
              animation: `floatPellet ${Math.random() * 6 + 4}s ease-in-out infinite`,
              zIndex: 5,
              boxShadow: '0 0 10px currentColor'
            }}
          />
        ))}

        {/* Cosmic Grid Lines */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.1,
          zIndex: 2,
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridMove 25s linear infinite'
        }} />

        {/* Desktop Header */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'radial-gradient(circle, #3b82f6 0%, #1e40af 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)'
          }}>
            🔥
          </div>
          <span style={{ 
            color: '#fbbf24', 
            fontWeight: 'bold', 
            fontSize: '16px',
            textShadow: '0 0 15px rgba(251, 191, 36, 0.8)' 
          }}>Welcome, ty8898812</span>
        </div>

        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              style={{ 
                width: '28px', 
                height: '28px', 
                background: 'rgba(75, 85, 99, 0.8)', 
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
              }}
            />
          ))}
        </div>

        {/* Desktop Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            <span style={{ color: '#ffffff' }}>TURF</span>
            <span style={{ color: '#fbbf24' }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Desktop Panels and Controls */}
        {/* Left Panel - Leaderboard */}
        <div style={{
          position: 'absolute',
          left: '30px',
          top: '200px',
          width: '320px',
          zIndex: 50,
          ...cosmicPanelStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...cosmicIconStyle, 
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
              color: '#000000' 
            }}>🏆</div>
            <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Leaderboard</h3>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{
                padding: '4px 10px',
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                fontSize: '12px',
                borderRadius: '15px',
                border: '1px solid rgba(34, 197, 94, 0.6)',
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)'
              }}>
                Live
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ color: '#e0e7ff', fontSize: '15px' }}>1. Quantum</span>
              <span style={{ 
                color: '#fbbf24', 
                fontWeight: 'bold', 
                fontSize: '15px',
                textShadow: '0 0 10px rgba(251, 191, 36, 0.6)'
              }}>$6,559.45</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ color: '#e0e7ff', fontSize: '15px' }}>2. Dernie237</span>
              <span style={{ 
                color: '#fbbf24', 
                fontWeight: 'bold', 
                fontSize: '15px',
                textShadow: '0 0 10px rgba(251, 191, 36, 0.6)'
              }}>$5,210.67</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ color: '#e0e7ff', fontSize: '15px' }}>3. Mr.TK216</span>
              <span style={{ 
                color: '#fbbf24', 
                fontWeight: 'bold', 
                fontSize: '15px',
                textShadow: '0 0 10px rgba(251, 191, 36, 0.6)'
              }}>$4,757.38</span>
            </div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'rgba(30, 27, 75, 0.8)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '12px',
            color: '#e0e7ff',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(5px)'
          }}>
            View Full Leaderboard
          </button>
        </div>

        {/* Desktop Center Controls and other panels... */}
        <div style={centerControlsStyle}>
          {/* Player Name Input */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '24px',
                boxShadow: '0 0 25px rgba(251, 191, 36, 0.6)'
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
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.6)'
              }}>
                ✓
              </div>
            </div>
          </div>

          {/* Stakes */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', justifyContent: 'center' }}>
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
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 60px rgba(139, 92, 246, 0.8), 0 15px 40px rgba(59, 130, 246, 0.6)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 40px rgba(139, 92, 246, 0.6), 0 12px 30px rgba(59, 130, 246, 0.4)'
            }}
          >
            ▶ JOIN GAME
          </button>

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button style={secondaryButtonStyle}>AI EU</button>
            <button style={secondaryButtonStyle}>Browse Lobbies</button>
          </div>
        </div>

        {/* Right Panel - Wallet */}
        <div style={{
          position: 'absolute',
          right: '30px',
          top: '200px',
          width: '300px',
          zIndex: 50,
          ...cosmicPanelStyle,
          borderColor: 'rgba(6, 182, 212, 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...cosmicIconStyle, 
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
              color: '#ffffff' 
            }}>💰</div>
            <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Wallet</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button style={{ fontSize: '11px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>[?] Copy Address</button>
              <button style={{ fontSize: '11px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>[↻] Refresh Balance</button>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: '900', 
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '6px',
              textShadow: '0 0 20px rgba(251, 191, 36, 0.6)'
            }}>$0.00</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>0.0000 SOL</div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.6)',
              borderRadius: '12px',
              color: '#22c55e',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)',
              backdropFilter: 'blur(5px)'
            }}>
              Add Funds
            </button>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.6)',
              borderRadius: '12px',
              color: '#3b82f6',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
              backdropFilter: 'blur(5px)'
            }}>
              Cash Out
            </button>
          </div>
        </div>

        {/* Bottom Left - Friends */}
        <div style={{
          position: 'absolute',
          left: '30px',
          bottom: '30px',
          width: '320px',
          zIndex: 50,
          ...cosmicPanelStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...cosmicIconStyle, 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              color: '#ffffff' 
            }}>👥</div>
            <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Friends</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>[↻] Refresh</span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>0 playing</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '35px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'radial-gradient(circle, rgba(75, 85, 99, 0.8) 0%, rgba(55, 65, 81, 0.9) 100%)',
              borderRadius: '50%',
              margin: '0 auto 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
            }}>
              👤
            </div>
            <div style={{ color: '#c7d2fe', fontSize: '15px', marginBottom: '10px' }}>No friends... add some!</div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'rgba(30, 27, 75, 0.8)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '12px',
            color: '#e0e7ff',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(5px)'
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
          right: '30px',
          bottom: '30px',
          width: '300px',
          zIndex: 50,
          ...cosmicPanelStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...cosmicIconStyle, 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
              color: '#ffffff' 
            }}>🎨</div>
            <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Customize</h3>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'radial-gradient(circle, #ec4899 0%, #be185d 70%, rgba(190, 24, 93, 0.3) 100%)',
              borderRadius: '50%',
              margin: '0 auto 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 0 30px rgba(236, 72, 153, 0.5)',
              border: '2px solid rgba(236, 72, 153, 0.6)'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                position: 'absolute',
                top: '20px',
                left: '22px',
                boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)'
              }} />
              <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                position: 'absolute',
                top: '20px',
                right: '22px',
                boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)'
              }} />
            </div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#000000',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '10px',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)',
            transition: 'all 0.3s ease'
          }}>
            👤 Manage Affiliate
          </button>
          
          <button style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'rgba(30, 27, 75, 0.8)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '12px',
            color: '#e0e7ff',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(5px)'
          }}>
            Change Appearance
          </button>
        </div>

        {/* Discord Button */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 50
        }}>
          <button style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.5)',
            transition: 'all 0.3s ease'
          }}>
            🎮 Join Discord!
          </button>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes twinkle {
            0%, 100% { 
              opacity: 0.2;
              transform: scale(1);
            }
            50% { 
              opacity: 1;
              transform: scale(1.2);
            }
          }
          
          @keyframes cosmicFloat {
            0%, 100% { 
              transform: translateY(0px) translateX(0px);
              opacity: 0.7;
            }
            25% { 
              transform: translateY(-30px) translateX(20px);
              opacity: 0.9;
            }
            50% { 
              transform: translateY(-15px) translateX(-10px);
              opacity: 1;
            }
            75% { 
              transform: translateY(-40px) translateX(15px);
              opacity: 0.8;
            }
          }
          
          @keyframes floatPellet {
            0%, 100% { 
              transform: translateY(0px) translateX(0px) scale(1);
              opacity: 0.3;
            }
            25% { 
              transform: translateY(-15px) translateX(10px) scale(1.1);
              opacity: 0.6;
            }
            50% { 
              transform: translateY(-25px) translateX(-5px) scale(0.9);
              opacity: 0.8;
            }
            75% { 
              transform: translateY(-10px) translateX(8px) scale(1.05);
              opacity: 0.5;
            }
          }
          
          @keyframes gridMove {
            0% { 
              backgroundPosition: 0px 0px;
            }
            100% { 
              backgroundPosition: 60px 60px;
            }
          }
        `}</style>
      </div>
    )
  }

  // Mobile Layout
  return (
    <div style={containerStyle}>
      
      {/* Mobile Animated Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        {/* Fewer stars for mobile performance */}
        {[...Array(30)].map((_, i) => (
          <div
            key={`star-${i}`}
            style={{
              position: 'absolute',
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`
            }}
          />
        ))}
      </div>

      {/* Mobile Floating Elements (Smaller) */}
      <div style={{
        position: 'fixed',
        top: '10%',
        left: '5%',
        zIndex: 5,
        width: '60px',
        height: '60px',
        background: 'radial-gradient(circle, #3b82f6 0%, #1e40af 70%, rgba(30, 64, 175, 0.3) 100%)',
        borderRadius: '50%',
        opacity: 0.6,
        animation: 'cosmicFloat 8s ease-in-out infinite',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
      }}>
        <div style={{
          position: 'absolute',
          top: '35%',
          left: '35%',
          width: '6px',
          height: '6px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          opacity: 0.9
        }} />
        <div style={{
          position: 'absolute',
          top: '35%',
          right: '35%',
          width: '6px',
          height: '6px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          opacity: 0.9
        }} />
      </div>

      <div style={{
        position: 'fixed',
        bottom: '20%',
        right: '5%',
        zIndex: 5,
        width: '50px',
        height: '50px',
        background: 'radial-gradient(circle, #ec4899 0%, #be185d 70%, rgba(190, 24, 93, 0.3) 100%)',
        borderRadius: '50%',
        opacity: 0.7,
        animation: 'cosmicFloat 10s ease-in-out infinite reverse',
        boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)'
      }}>
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '40%',
          width: '5px',
          height: '5px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          opacity: 0.9
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          right: '40%',
          width: '5px',
          height: '5px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          opacity: 0.9
        }} />
      </div>

      {/* Mobile Floating Pellets (Fewer) */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`pellet-${i}`}
          style={{
            position: 'fixed',
            width: Math.random() * 5 + 2 + 'px',
            height: Math.random() * 5 + 2 + 'px',
            background: `radial-gradient(circle, ${['#22c55e', '#eab308', '#f97316', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 5)]} 0%, transparent 70%)`,
            borderRadius: '50%',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            opacity: Math.random() * 0.5 + 0.2,
            animation: `floatPellet ${Math.random() * 6 + 4}s ease-in-out infinite`,
            zIndex: 3
          }}
        />
      ))}

      {/* Mobile Content Container */}
      <div style={mobileContainerStyle}>
        
        {/* Mobile Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              background: 'radial-gradient(circle, #3b82f6 0%, #1e40af 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)'
            }}>
              🔥
            </div>
            <span style={{ 
              color: '#fbbf24', 
              fontWeight: 'bold', 
              fontSize: '12px',
              textShadow: '0 0 10px rgba(251, 191, 36, 0.8)' 
            }}>Welcome, ty8898812</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  background: 'rgba(75, 85, 99, 0.8)', 
                  borderRadius: '4px',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Mobile Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            <span style={{ color: '#ffffff' }}>TURF</span>
            <span style={{ color: '#fbbf24' }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Mobile Game Controls */}
        <div style={centerControlsStyle}>
          {/* Player Name Input */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '18px',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)'
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
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.6)'
              }}>
                ✓
              </div>
            </div>
          </div>

          {/* Stakes */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
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
          <div style={cosmicPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...cosmicIconStyle, 
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                color: '#000000' 
              }}>🏆</div>
              <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Leaderboard</h3>
            </div>
            
            <div style={{ marginBottom: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: '#e0e7ff' }}>1. Quantum</span>
                <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>$6.5K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: '#e0e7ff' }}>2. Dernie237</span>
                <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>$5.2K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: '#e0e7ff' }}>3. Mr.TK216</span>
                <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>$4.7K</span>
              </div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'rgba(30, 27, 75, 0.8)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '8px',
              color: '#e0e7ff',
              fontSize: '11px',
              cursor: 'pointer'
            }}>
              View Full
            </button>
          </div>

          {/* Wallet Panel */}
          <div style={{...cosmicPanelStyle, borderColor: 'rgba(6, 182, 212, 0.5)'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...cosmicIconStyle, 
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
                color: '#ffffff' 
              }}>💰</div>
              <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Wallet</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '900', 
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '3px'
              }}>$0.00</div>
              <div style={{ color: '#9ca3af', fontSize: '10px' }}>0.0000 SOL</div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.6)',
                borderRadius: '8px',
                color: '#22c55e',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '10px'
              }}>
                Add
              </button>
              <button style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.6)',
                borderRadius: '8px',
                color: '#3b82f6',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '10px'
              }}>
                Cash Out
              </button>
            </div>
          </div>

          {/* Friends Panel */}
          <div style={cosmicPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...cosmicIconStyle, 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                color: '#ffffff' 
              }}>👥</div>
              <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Friends</h3>
            </div>
            
            <div style={{ textAlign: 'center', padding: '15px 0' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'radial-gradient(circle, rgba(75, 85, 99, 0.8) 0%, rgba(55, 65, 81, 0.9) 100%)',
                borderRadius: '50%',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                border: '1px solid rgba(139, 92, 246, 0.4)'
              }}>
                👤
              </div>
              <div style={{ color: '#c7d2fe', fontSize: '11px' }}>No friends yet</div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'rgba(30, 27, 75, 0.8)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '8px',
              color: '#e0e7ff',
              fontSize: '11px',
              cursor: 'pointer'
            }}>
              Add Friends
            </button>
          </div>

          {/* Customize Panel */}
          <div style={cosmicPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...cosmicIconStyle, 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                color: '#ffffff' 
              }}>🎨</div>
              <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Customize</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'radial-gradient(circle, #ec4899 0%, #be185d 70%, rgba(190, 24, 93, 0.3) 100%)',
                borderRadius: '50%',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 0 15px rgba(236, 72, 153, 0.4)',
                border: '1px solid rgba(236, 72, 153, 0.6)'
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '12px',
                  left: '12px'
                }} />
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#ffffff',
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
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: '#000000',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '6px',
              fontSize: '10px'
            }}>
              👤 Manage Affiliate
            </button>
            
            <button style={{
              width: '100%',
              padding: '6px',
              backgroundColor: 'rgba(30, 27, 75, 0.8)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '8px',
              color: '#e0e7ff',
              fontSize: '10px',
              cursor: 'pointer'
            }}>
              Change Appearance
            </button>
          </div>
        </div>

        {/* Mobile Discord Button */}
        <div style={{ textAlign: 'center' }}>
          <button style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            fontWeight: 'bold',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            fontSize: '12px'
          }}>
            🎮 Join Discord!
          </button>
        </div>
      </div>

      {/* Mobile CSS Animations */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { 
            opacity: 0.2;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        @keyframes cosmicFloat {
          0%, 100% { 
            transform: translateY(0px) translateX(0px);
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
        
        @keyframes floatPellet {
          0%, 100% { 
            transform: translateY(0px) translateX(0px);
            opacity: 0.2;
          }
          50% { 
            transform: translateY(-15px) translateX(5px);
            opacity: 0.5;
          }
        }
        
        @media (orientation: landscape) and (max-height: 500px) {
          .mobile-title {
            font-size: 2rem !important;
          }
          .mobile-panels {
            grid-template-columns: 1fr 1fr 1fr 1fr !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  )
}