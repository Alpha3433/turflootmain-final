'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TurfLootSynthwave() {
  const router = useRouter()
  const [selectedStake, setSelectedStake] = useState('$1')
  const [liveStats, setLiveStats] = useState({ players: 42, winnings: 567891 })
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
        players: Math.floor(Math.random() * 60) + 30,
        winnings: Math.floor(Math.random() * 300000) + 400000
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
    background: 'linear-gradient(180deg, #0a0a0a 0%, #1a0a2e 30%, #16213e 70%, #0f3460 100%)',
    color: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: '"Orbitron", "Courier New", monospace',
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
    zIndex: 20
  }

  const neonPanelStyle = {
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: isMobile ? '12px' : '16px',
    border: '2px solid #ff00ff',
    boxShadow: `
      0 0 20px #ff00ff,
      0 0 40px rgba(255, 0, 255, 0.3),
      inset 0 0 20px rgba(255, 0, 255, 0.1)
    `,
    padding: isMobile ? '16px' : '20px',
    position: 'relative'
  }

  const cyanPanelStyle = {
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: isMobile ? '12px' : '16px',
    border: '2px solid #00ffff',
    boxShadow: `
      0 0 20px #00ffff,
      0 0 40px rgba(0, 255, 255, 0.3),
      inset 0 0 20px rgba(0, 255, 255, 0.1)
    `,
    padding: isMobile ? '16px' : '20px',
    position: 'relative'
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? '0' : '20px 40px',
    zIndex: 30,
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
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: '100px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const mainTitleStyle = {
    fontSize: isMobile ? '3rem' : '5.5rem',
    fontWeight: '900',
    margin: '0 0 8px 0',
    background: 'linear-gradient(45deg, #ff00ff 0%, #00ffff 50%, #ff0080 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px #ff00ff, 0 0 60px #00ffff',
    letterSpacing: '0.1em',
    fontFamily: '"Orbitron", monospace'
  }

  const subtitleStyle = {
    color: '#00ffff',
    fontWeight: '700',
    fontSize: isMobile ? '12px' : '16px',
    letterSpacing: '0.3em',
    margin: 0,
    textTransform: 'uppercase',
    textShadow: '0 0 10px #00ffff',
    fontFamily: '"Orbitron", monospace'
  }

  const centerControlsStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -30%)'
    })
  }

  const nameInputStyle = {
    background: 'rgba(0, 0, 0, 0.9)',
    border: '2px solid #ff00ff',
    borderRadius: '8px',
    padding: isMobile ? '12px 16px' : '14px 20px',
    color: '#ff00ff',
    fontWeight: '600',
    textAlign: 'center',
    width: isMobile ? '160px' : '200px',
    fontSize: isMobile ? '14px' : '16px',
    boxShadow: '0 0 20px rgba(255, 0, 255, 0.5), inset 0 0 10px rgba(255, 0, 255, 0.1)',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: '"Orbitron", monospace'
  }

  const stakeButtonStyle = {
    padding: isMobile ? '12px 20px' : '16px 32px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: isMobile ? '14px' : '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid',
    margin: isMobile ? '0 4px' : '0 8px',
    fontFamily: '"Orbitron", monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }

  const activeStakeStyle = {
    ...stakeButtonStyle,
    background: 'linear-gradient(45deg, #ff00ff 0%, #ff0080 100%)',
    color: '#ffffff',
    borderColor: '#ff00ff',
    boxShadow: '0 0 30px #ff00ff, 0 0 60px rgba(255, 0, 255, 0.3)',
    transform: 'scale(1.05)'
  }

  const inactiveStakeStyle = {
    ...stakeButtonStyle,
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#00ffff',
    borderColor: '#00ffff',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
  }

  const joinButtonStyle = {
    background: 'linear-gradient(45deg, #ff0080 0%, #ff00ff 50%, #8000ff 100%)',
    color: '#ffffff',
    fontWeight: '900',
    padding: isMobile ? '16px 48px' : '20px 64px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '20px',
    marginBottom: isMobile ? '20px' : '32px',
    cursor: 'pointer',
    border: '2px solid #ff00ff',
    boxShadow: '0 0 40px #ff00ff, 0 0 80px rgba(255, 0, 255, 0.4)',
    transition: 'all 0.3s ease',
    letterSpacing: '0.1em',
    fontFamily: '"Orbitron", monospace',
    textTransform: 'uppercase'
  }

  const secondaryButtonStyle = {
    padding: isMobile ? '10px 20px' : '12px 24px',
    background: 'rgba(0, 0, 0, 0.8)',
    border: '2px solid #00ffff',
    borderRadius: '8px',
    color: '#00ffff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    margin: isMobile ? '0 6px' : '0 10px',
    fontWeight: '600',
    fontSize: isMobile ? '12px' : '14px',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
    fontFamily: '"Orbitron", monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }

  const iconStyle = {
    width: isMobile ? '24px' : '32px',
    height: isMobile ? '24px' : '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '12px' : '16px',
    fontWeight: '700'
  }

  const statsStyle = {
    textAlign: 'center',
    display: 'flex',
    gap: isMobile ? '48px' : '80px',
    justifyContent: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const statItemStyle = {
    textAlign: 'center'
  }

  const statNumberStyle = {
    fontSize: isMobile ? '28px' : '42px',
    fontWeight: '900',
    background: 'linear-gradient(45deg, #ff00ff 0%, #00ffff 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '4px',
    textShadow: '0 0 20px #ff00ff',
    fontFamily: '"Orbitron", monospace'
  }

  const statLabelStyle = {
    color: '#00ffff',
    fontSize: isMobile ? '11px' : '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    textShadow: '0 0 10px #00ffff',
    fontFamily: '"Orbitron", monospace'
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
        
        {/* Animated Synthwave Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          overflow: 'hidden'
        }}>
          
          {/* Moving Grid */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200%',
            height: '200%',
            opacity: 0.6,
            backgroundImage: `
              linear-gradient(#ff00ff 2px, transparent 2px),
              linear-gradient(90deg, #ff00ff 2px, transparent 2px),
              linear-gradient(#00ffff 1px, transparent 1px),
              linear-gradient(90deg, #00ffff 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
            animation: 'synthGrid 20s linear infinite'
          }} />

          {/* Neon Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`particle-${i}`}
              style={{
                position: 'absolute',
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                background: ['#ff00ff', '#00ffff', '#ff0080'][Math.floor(Math.random() * 3)],
                borderRadius: '50%',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                opacity: Math.random() * 0.8 + 0.2,
                animation: `neonFloat ${Math.random() * 4 + 6}s ease-in-out infinite`,
                boxShadow: `0 0 10px currentColor`,
                zIndex: 5
              }}
            />
          ))}

          {/* Synthwave Sun */}
          <div style={{
            position: 'absolute',
            bottom: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, #ff0080 0%, #ff00ff 50%, transparent 70%)',
            borderRadius: '50%',
            opacity: 0.3,
            animation: 'synthPulse 4s ease-in-out infinite',
            zIndex: 2
          }} />

          {/* Retro Triangles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`triangle-${i}`}
              style={{
                position: 'absolute',
                width: 0,
                height: 0,
                borderLeft: `${Math.random() * 20 + 10}px solid transparent`,
                borderRight: `${Math.random() * 20 + 10}px solid transparent`,
                borderBottom: `${Math.random() * 30 + 20}px solid ${['#ff00ff', '#00ffff', '#ff0080'][Math.floor(Math.random() * 3)]}`,
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                opacity: Math.random() * 0.3 + 0.1,
                animation: `retroFloat ${Math.random() * 8 + 10}s ease-in-out infinite`,
                filter: `drop-shadow(0 0 10px currentColor)`,
                zIndex: 3
              }}
            />
          ))}
        </div>

        {/* Desktop Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(45deg, #ff0080 0%, #ff00ff 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 0 20px #ff0080',
              border: '2px solid #ff00ff'
            }}>
              🔥
            </div>
            <span style={{ 
              color: '#00ffff', 
              fontWeight: '700', 
              fontSize: '16px',
              textShadow: '0 0 10px #00ffff',
              fontFamily: '"Orbitron", monospace'
            }}>WELCOME, PLAYER_8812</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'rgba(0, 0, 0, 0.8)', 
                  border: '2px solid #00ffff',
                  borderRadius: '6px',
                  boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Desktop Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ 
              background: 'linear-gradient(45deg, #ff0080 0%, #ffff00 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>NEON GRID DOMINATION</p>
        </div>

        {/* Desktop Center Controls */}
        <div style={centerControlsStyle}>
          {/* Player Name Input */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(45deg, #ff0080 0%, #ff00ff 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '24px',
                boxShadow: '0 0 30px #ff0080',
                border: '2px solid #ff00ff',
                fontFamily: '"Orbitron", monospace'
              }}>
                0
              </div>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={nameInputStyle}
                placeholder="ENTER_USERNAME"
                onFocus={(e) => {
                  e.target.style.borderColor = '#00ffff'
                  e.target.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6), inset 0 0 15px rgba(0, 255, 255, 0.1)'
                  e.target.style.color = '#00ffff'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ff00ff'
                  e.target.style.boxShadow = '0 0 20px rgba(255, 0, 255, 0.5), inset 0 0 10px rgba(255, 0, 255, 0.1)'
                  e.target.style.color = '#ff00ff'
                }}
              />
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(45deg, #00ffff 0%, #0080ff 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '600',
                boxShadow: '0 0 20px #00ffff',
                border: '2px solid #00ffff'
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
                    e.target.style.transform = 'scale(1.02)'
                    e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.5)'
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedStake !== stake) {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'
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
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 60px #ff00ff, 0 0 100px rgba(255, 0, 255, 0.6)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 40px #ff00ff, 0 0 80px rgba(255, 0, 255, 0.4)'
            }}
          >
            ▶ JACK IN
          </button>

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              style={secondaryButtonStyle}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(0, 255, 255, 0.1)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'
              }}
            >
              NEURAL NET
            </button>
            <button 
              style={secondaryButtonStyle}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(0, 255, 255, 0.1)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'
              }}
            >
              DATA STREAMS
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
          zIndex: 20,
          ...neonPanelStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #ff0080 0%, #ff00ff 100%)', 
              color: '#ffffff',
              boxShadow: '0 0 20px #ff0080',
              border: '2px solid #ff00ff'
            }}>🏆</div>
            <h3 style={{ color: '#ff00ff', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Orbitron", monospace', textShadow: '0 0 10px #ff00ff' }}>RANKINGS</h3>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{
                padding: '4px 10px',
                background: 'rgba(0, 255, 0, 0.1)',
                color: '#00ff00',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #00ff00',
                fontWeight: '600',
                boxShadow: '0 0 10px #00ff00',
                fontFamily: '"Orbitron", monospace'
              }}>
                LIVE
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255, 0, 255, 0.3)' }}>
              <span style={{ color: '#00ffff', fontSize: '15px', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>01. QUANTUM_X</span>
              <span style={{ 
                color: '#ffff00', 
                fontWeight: '700', 
                fontSize: '15px',
                textShadow: '0 0 10px #ffff00',
                fontFamily: '"Orbitron", monospace'
              }}>$6,559.45</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255, 0, 255, 0.3)' }}>
              <span style={{ color: '#00ffff', fontSize: '15px', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>02. CIPHER_237</span>
              <span style={{ 
                color: '#ffff00', 
                fontWeight: '700', 
                fontSize: '15px',
                textShadow: '0 0 10px #ffff00',
                fontFamily: '"Orbitron", monospace'
              }}>$5,210.67</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#00ffff', fontSize: '15px', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>03. MATRIX_216</span>
              <span style={{ 
                color: '#ffff00', 
                fontWeight: '700', 
                fontSize: '15px',
                textShadow: '0 0 10px #ffff00',
                fontFamily: '"Orbitron", monospace'
              }}>$4,757.38</span>
            </div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #ff00ff',
            borderRadius: '8px',
            color: '#ff00ff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(255, 0, 255, 0.3)',
            fontFamily: '"Orbitron", monospace',
            textTransform: 'uppercase'
          }}>
            ACCESS FULL DATA
          </button>
        </div>

        {/* Right Panel - Wallet */}
        <div style={{
          position: 'absolute',
          right: '40px',
          top: '220px',
          width: '300px',
          zIndex: 20,
          ...cyanPanelStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #00ffff 0%, #0080ff 100%)', 
              color: '#ffffff',
              boxShadow: '0 0 20px #00ffff',
              border: '2px solid #00ffff'
            }}>💎</div>
            <h3 style={{ color: '#00ffff', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Orbitron", monospace', textShadow: '0 0 10px #00ffff' }}>CREDITS</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button style={{ fontSize: '11px', color: '#00ffff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>[?] COPY_ADDR</button>
              <button style={{ fontSize: '11px', color: '#00ffff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>[↻] REFRESH</button>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: '800', 
              background: 'linear-gradient(45deg, #ffff00 0%, #ff8000 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
              textShadow: '0 0 20px #ffff00',
              fontFamily: '"Orbitron", monospace'
            }}>$0.00</div>
            <div style={{ color: '#00ffff', fontSize: '14px', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>0.0000 SOL</div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(0, 255, 0, 0.1)',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              color: '#00ff00',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(0, 255, 0, 0.3)',
              fontFamily: '"Orbitron", monospace',
              textTransform: 'uppercase'
            }}>
              UPLOAD
            </button>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '2px solid #ff0040',
              borderRadius: '8px',
              color: '#ff0040',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(255, 0, 64, 0.3)',
              fontFamily: '"Orbitron", monospace',
              textTransform: 'uppercase'
            }}>
              EXTRACT
            </button>
          </div>
        </div>

        {/* Bottom Left - Friends */}
        <div style={{
          position: 'absolute',
          left: '40px',
          bottom: '40px',
          width: '320px',
          zIndex: 20,
          ...neonPanelStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #8000ff 0%, #ff00ff 100%)', 
              color: '#ffffff',
              boxShadow: '0 0 20px #8000ff',
              border: '2px solid #ff00ff'
            }}>👥</div>
            <h3 style={{ color: '#ff00ff', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Orbitron", monospace', textShadow: '0 0 10px #ff00ff' }}>NETWORK</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#00ffff', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>[↻] SCAN</span>
              <span style={{ fontSize: '11px', color: '#00ffff', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>0 ONLINE</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '2px solid #ff00ff',
              borderRadius: '8px',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 0 20px rgba(255, 0, 255, 0.3)'
            }}>
              👤
            </div>
            <div style={{ color: '#00ffff', fontSize: '15px', marginBottom: '8px', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>NO CONNECTIONS FOUND</div>
            <div style={{ color: '#ff00ff', fontSize: '12px', fontFamily: '"Orbitron", monospace' }}>ESTABLISH NEW LINKS</div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #ff00ff',
            borderRadius: '8px',
            color: '#ff00ff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(255, 0, 255, 0.3)',
            fontFamily: '"Orbitron", monospace',
            textTransform: 'uppercase'
          }}>
            CONNECT NODES
          </button>
        </div>

        {/* Bottom Center - Stats */}
        <div style={statsStyle}>
          <div style={statItemStyle}>
            <div style={statNumberStyle}>{liveStats.players}</div>
            <div style={statLabelStyle}>USERS JACKED IN</div>
          </div>
          <div style={statItemStyle}>
            <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
            <div style={statLabelStyle}>TOTAL EXTRACTED</div>
          </div>
        </div>

        {/* Bottom Right - Customize */}
        <div style={{
          position: 'absolute',
          right: '40px',
          bottom: '40px',
          width: '300px',
          zIndex: 20,
          ...cyanPanelStyle
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #ff0080 0%, #ff8000 100%)', 
              color: '#ffffff',
              boxShadow: '0 0 20px #ff0080',
              border: '2px solid #ff0080'
            }}>🎨</div>
            <h3 style={{ color: '#00ffff', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Orbitron", monospace', textShadow: '0 0 10px #00ffff' }}>AVATAR</h3>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'radial-gradient(circle, #ff0080 0%, #ff00ff 70%, rgba(255, 0, 255, 0.3) 100%)',
              border: '2px solid #ff00ff',
              borderRadius: '8px',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 0 30px rgba(255, 0, 128, 0.5)'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#00ffff',
                borderRadius: '50%',
                position: 'absolute',
                top: '20px',
                left: '22px',
                boxShadow: '0 0 10px #00ffff'
              }} />
              <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#00ffff',
                borderRadius: '50%',
                position: 'absolute',
                top: '20px',
                right: '22px',
                boxShadow: '0 0 10px #00ffff'
              }} />
            </div>
          </div>
          
          <button style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(45deg, #ff8000 0%, #ffff00 100%)',
            color: '#000000',
            fontWeight: '700',
            borderRadius: '8px',
            border: '2px solid #ff8000',
            cursor: 'pointer',
            marginBottom: '12px',
            boxShadow: '0 0 20px rgba(255, 128, 0, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: '"Orbitron", monospace',
            textTransform: 'uppercase'
          }}>
            👤 UPGRADE CORE
          </button>
          
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #00ffff',
            borderRadius: '8px',
            color: '#00ffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
            fontFamily: '"Orbitron", monospace',
            textTransform: 'uppercase'
          }}>
            MODIFY SKIN
          </button>
        </div>

        {/* Discord Button */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          zIndex: 20
        }}>
          <button style={{
            padding: '12px 20px',
            background: 'linear-gradient(45deg, #5865f2 0%, #8000ff 100%)',
            color: '#ffffff',
            fontWeight: '700',
            borderRadius: '8px',
            border: '2px solid #5865f2',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 25px rgba(88, 101, 242, 0.5)',
            transition: 'all 0.3s ease',
            fontFamily: '"Orbitron", monospace',
            textTransform: 'uppercase'
          }}>
            🎮 JACK INTO DISCORD
          </button>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
          
          @keyframes synthGrid {
            0% { 
              transform: translateX(0) translateY(0);
            }
            100% { 
              transform: translateX(-100px) translateY(-100px);
            }
          }
          
          @keyframes neonFloat {
            0%, 100% { 
              transform: translateY(0px) translateX(0px) rotate(0deg);
              opacity: 0.3;
            }
            25% { 
              transform: translateY(-20px) translateX(10px) rotate(90deg);
              opacity: 0.8;
            }
            50% { 
              transform: translateY(-10px) translateX(-15px) rotate(180deg);
              opacity: 1;
            }
            75% { 
              transform: translateY(-30px) translateX(5px) rotate(270deg);
              opacity: 0.6;
            }
          }
          
          @keyframes synthPulse {
            0%, 100% { 
              transform: translateX(-50%) scale(1);
              opacity: 0.3;
            }
            50% { 
              transform: translateX(-50%) scale(1.2);
              opacity: 0.6;
            }
          }
          
          @keyframes retroFloat {
            0%, 100% { 
              transform: translateY(0px) rotate(0deg);
              opacity: 0.1;
            }
            50% { 
              transform: translateY(-40px) rotate(180deg);
              opacity: 0.4;
            }
          }
        `}</style>
      </div>
    )
  }

  // Mobile Layout
  return (
    <div style={containerStyle}>
      
      {/* Mobile Synthwave Background (Simplified) */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        
        {/* Mobile Grid */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '150%',
          height: '150%',
          opacity: 0.4,
          backgroundImage: `
            linear-gradient(#ff00ff 1px, transparent 1px),
            linear-gradient(90deg, #ff00ff 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'synthGrid 25s linear infinite'
        }} />

        {/* Mobile Particles (Fewer) */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`particle-${i}`}
            style={{
              position: 'absolute',
              width: '3px',
              height: '3px',
              background: ['#ff00ff', '#00ffff'][Math.floor(Math.random() * 2)],
              borderRadius: '50%',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2,
              animation: `neonFloat ${Math.random() * 6 + 8}s ease-in-out infinite`,
              boxShadow: `0 0 8px currentColor`,
              zIndex: 5
            }}
          />
        ))}

        {/* Mobile Sun */}
        <div style={{
          position: 'absolute',
          bottom: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, #ff0080 0%, #ff00ff 50%, transparent 70%)',
          borderRadius: '50%',
          opacity: 0.2,
          animation: 'synthPulse 4s ease-in-out infinite',
          zIndex: 2
        }} />
      </div>

      {/* Mobile Content Container */}
      <div style={mobileContainerStyle}>
        
        {/* Mobile Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(45deg, #ff0080 0%, #ff00ff 100%)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: '0 0 15px #ff0080',
              border: '2px solid #ff00ff'
            }}>
              🔥
            </div>
            <span style={{ 
              color: '#00ffff', 
              fontWeight: '700', 
              fontSize: '12px',
              textShadow: '0 0 8px #00ffff',
              fontFamily: '"Orbitron", monospace'
            }}>PLAYER_8812</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: 'rgba(0, 0, 0, 0.8)', 
                  border: '2px solid #00ffff',
                  borderRadius: '4px',
                  boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Mobile Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ 
              background: 'linear-gradient(45deg, #ff0080 0%, #ffff00 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>NEON GRID DOMINATION</p>
        </div>

        {/* Mobile Game Controls */}
        <div style={centerControlsStyle}>
          {/* Player Name Input */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(45deg, #ff0080 0%, #ff00ff 100%)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '18px',
                boxShadow: '0 0 20px #ff0080',
                border: '2px solid #ff00ff',
                fontFamily: '"Orbitron", monospace'
              }}>
                0
              </div>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={nameInputStyle}
                placeholder="USERNAME"
              />
              <div style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(45deg, #00ffff 0%, #0080ff 100%)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '600',
                boxShadow: '0 0 15px #00ffff',
                border: '2px solid #00ffff'
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
            ▶ JACK IN
          </button>

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button style={secondaryButtonStyle}>NEURAL NET</button>
            <button style={secondaryButtonStyle}>DATA STREAMS</button>
          </div>
        </div>

        {/* Mobile Stats */}
        <div style={statsStyle}>
          <div style={statItemStyle}>
            <div style={statNumberStyle}>{liveStats.players}</div>
            <div style={statLabelStyle}>USERS ONLINE</div>
          </div>
          <div style={statItemStyle}>
            <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
            <div style={statLabelStyle}>TOTAL EXTRACTED</div>
          </div>
        </div>

        {/* Mobile Panels Grid */}
        <div style={mobileGridStyle}>
          {/* Leaderboard Panel */}
          <div style={neonPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #ff0080 0%, #ff00ff 100%)', 
                color: '#ffffff',
                boxShadow: '0 0 15px #ff0080',
                border: '1px solid #ff00ff'
              }}>🏆</div>
              <h3 style={{ color: '#ff00ff', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Orbitron", monospace' }}>RANKS</h3>
            </div>
            
            <div style={{ marginBottom: '12px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255, 0, 255, 0.2)' }}>
                <span style={{ color: '#00ffff', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>QUANTUM_X</span>
                <span style={{ color: '#ffff00', fontWeight: '700', fontFamily: '"Orbitron", monospace' }}>$6.5K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255, 0, 255, 0.2)' }}>
                <span style={{ color: '#00ffff', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>CIPHER_237</span>
                <span style={{ color: '#ffff00', fontWeight: '700', fontFamily: '"Orbitron", monospace' }}>$5.2K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#00ffff', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>MATRIX_216</span>
                <span style={{ color: '#ffff00', fontWeight: '700', fontFamily: '"Orbitron", monospace' }}>$4.7K</span>
              </div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #ff00ff',
              borderRadius: '6px',
              color: '#ff00ff',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Orbitron", monospace'
            }}>
              ACCESS DATA
            </button>
          </div>

          {/* Wallet Panel */}
          <div style={cyanPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #00ffff 0%, #0080ff 100%)', 
                color: '#ffffff',
                boxShadow: '0 0 15px #00ffff',
                border: '1px solid #00ffff'
              }}>💎</div>
              <h3 style={{ color: '#00ffff', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Orbitron", monospace' }}>CREDITS</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                background: 'linear-gradient(45deg, #ffff00 0%, #ff8000 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '2px',
                fontFamily: '"Orbitron", monospace'
              }}>$0.00</div>
              <div style={{ color: '#00ffff', fontSize: '9px', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>0.0000 SOL</div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(0, 255, 0, 0.1)',
                border: '1px solid #00ff00',
                borderRadius: '6px',
                color: '#00ff00',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: '"Orbitron", monospace'
              }}>
                UPLOAD
              </button>
              <button style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid #ff0040',
                borderRadius: '6px',
                color: '#ff0040',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: '"Orbitron", monospace'
              }}>
                EXTRACT
              </button>
            </div>
          </div>

          {/* Friends Panel */}
          <div style={neonPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #8000ff 0%, #ff00ff 100%)', 
                color: '#ffffff',
                boxShadow: '0 0 15px #8000ff',
                border: '1px solid #ff00ff'
              }}>👥</div>
              <h3 style={{ color: '#ff00ff', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Orbitron", monospace' }}>NETWORK</h3>
            </div>
            
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '32px',      
                height: '32px',
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #ff00ff',
                borderRadius: '6px',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                boxShadow: '0 0 15px rgba(255, 0, 255, 0.3)'
              }}>
                👤
              </div>
              <div style={{ color: '#00ffff', fontSize: '10px', fontWeight: '600', fontFamily: '"Orbitron", monospace' }}>NO CONNECTIONS</div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #ff00ff',
              borderRadius: '6px',
              color: '#ff00ff',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Orbitron", monospace'
            }}>
              CONNECT
            </button>
          </div>

          {/* Customize Panel */}
          <div style={cyanPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #ff0080 0%, #ff8000 100%)', 
                color: '#ffffff',
                boxShadow: '0 0 15px #ff0080',
                border: '1px solid #ff0080'
              }}>🎨</div>
              <h3 style={{ color: '#00ffff', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Orbitron", monospace' }}>AVATAR</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'radial-gradient(circle, #ff0080 0%, #ff00ff 70%, rgba(255, 0, 255, 0.3) 100%)',
                border: '1px solid #ff00ff',
                borderRadius: '6px',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 0 20px rgba(255, 0, 128, 0.4)'
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#00ffff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  boxShadow: '0 0 5px #00ffff'
                }} />
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#00ffff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  boxShadow: '0 0 5px #00ffff'
                }} />
              </div>
            </div>
            
            <button style={{
              width: '100%',
              padding: '8px',
              background: 'linear-gradient(45deg, #ff8000 0%, #ffff00 100%)',
              color: '#000000',
              fontWeight: '700',
              borderRadius: '6px',
              border: '1px solid #ff8000',
              cursor: 'pointer',
              marginBottom: '6px',
              fontSize: '9px',
              fontFamily: '"Orbitron", monospace'
            }}>
              👤 UPGRADE
            </button>
            
            <button style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #00ffff',
              borderRadius: '6px',
              color: '#00ffff',
              fontSize: '9px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Orbitron", monospace'
            }}>
              MODIFY
            </button>
          </div>
        </div>

        {/* Mobile Discord Button */}
        <div style={{ textAlign: 'center' }}>
          <button style={{
            padding: '12px 20px',
            background: 'linear-gradient(45deg, #5865f2 0%, #8000ff 100%)',
            color: '#ffffff',
            fontWeight: '700',
            borderRadius: '8px',
            border: '2px solid #5865f2',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(88, 101, 242, 0.5)',
            fontSize: '12px',
            fontFamily: '"Orbitron", monospace'
          }}>
            🎮 JACK INTO DISCORD
          </button>
        </div>
      </div>

      {/* Mobile CSS Animations */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        
        @keyframes synthGrid {
          0% { 
            transform: translateX(0) translateY(0);
          }
          100% { 
            transform: translateX(-50px) translateY(-50px);
          }
        }
        
        @keyframes neonFloat {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
          50% { 
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.6;
          }
        }
        
        @keyframes synthPulse {
          0%, 100% { 
            transform: translateX(-50%) scale(1);
            opacity: 0.2;
          }
          50% { 
            transform: translateX(-50%) scale(1.1);
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  )
}