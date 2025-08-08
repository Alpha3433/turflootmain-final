'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

export default function Home() {
  const [userProfile, setUserProfile] = useState(null)
  const [selectedBet, setSelectedBet] = useState(5)
  const [showWelcome, setShowWelcome] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [customName, setCustomName] = useState('')
  const [displayName, setDisplayName] = useState('')
  
  // Get Privy hooks
  const { login, ready, authenticated, user, logout } = usePrivy()

  // Check for new authentication and show welcome message
  useEffect(() => {
    if (authenticated && user && !hasShownWelcome) {
      console.log('🎉 User authenticated:', user)
      setShowWelcome(true)
      setHasShownWelcome(true)
      setUserProfile(user)
      
      // Initialize display name from user data or existing custom name
      const initialName = user.google?.name || user.email?.address || 'Player'
      setDisplayName(initialName)
    }
  }, [authenticated, user, hasShownWelcome])

  // Handle direct Privy login when button is clicked
  const handleLoginClick = () => {
    console.log('🔍 Starting direct Privy login...')
    
    // Call Privy's login directly - this will show the interface
    login().then(() => {
      console.log('✅ Privy login interface opened')
    }).catch((error) => {
      console.error('❌ Privy login error:', error)
      alert('Login failed. Please try again.')
    })
  }

  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData)
    setUserProfile(userData)
  }

  const closeWelcome = () => {
    setShowWelcome(false)
  }

  const handleLogout = () => {
    logout()
    setUserProfile(null)
    setHasShownWelcome(false)
    setDisplayName('')
    setCustomName('')
  }

  const handleNameClick = () => {
    if (authenticated && user) {
      setIsEditingName(true)
      setCustomName(displayName)
    }
  }

  const handleNameSave = async () => {
    if (!customName.trim()) return

    try {
      console.log('💾 Saving custom name:', customName)
      
      // Make API call to update user profile
      const response = await fetch('/api/users/profile/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          customName: customName.trim(),
          privyId: user.id
        })
      })

      if (response.ok) {
        setDisplayName(customName.trim())
        setIsEditingName(false)
        console.log('✅ Name updated successfully')
      } else {
        console.error('❌ Failed to update name')
        alert('Failed to update name. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error updating name:', error)
      alert('Error updating name. Please try again.')
    }
  }

  const handleNameCancel = () => {
    setIsEditingName(false)
    setCustomName('')
  }

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      handleNameCancel()
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated grid pattern */}
        <div className="h-full w-full opacity-15" style={{
          backgroundImage: `
            linear-gradient(rgba(250,204,21,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(250,204,21,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}></div>
        
        {/* Floating orbs for atmosphere */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-yellow-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Compact Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4">
        {/* Left side - Welcome message */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 via-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-5 h-5 bg-white rounded-full relative">
                <div className="absolute top-1 left-1 w-1 h-1 bg-black rounded-full"></div>
              </div>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <span className="text-white text-lg font-semibold">
            {authenticated && user 
              ? `Welcome, ${user.google?.name || user.email?.address || 'Player'}!` 
              : 'Welcome, bruh!'
            }
          </span>
        </div>

        {/* Center - Live indicator */}
        <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-green-500/30">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-bold">Live</span>
          <div className="text-gray-400 text-sm">•</div>
          <span className="text-gray-300 text-sm">38 Online</span>
        </div>

        {/* Right side - Login button or User Navigation */}
        <div className="flex items-center space-x-3">
          {authenticated && user ? (
            // Authenticated user navigation
            <>
              {/* Profile Icon */}
              <button className="p-2.5 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              {/* Settings Icon */}
              <button className="p-2.5 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Sound Icon */}
              <button className="p-2.5 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-xl border border-gray-600/30 transition-all hover:scale-105 group">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              
              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 backdrop-blur-md rounded-xl border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium transition-all hover:scale-105"
              >
                Logout
              </button>
            </>
          ) : (
            // Login button for non-authenticated users
            <button 
              onClick={handleLoginClick}
              disabled={!ready}
              className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 shadow-xl hover:scale-105"
            >
              <span className="relative">{ready ? 'Login' : 'Loading...'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Compact Main Content */}
      <div className="relative z-10 flex flex-col" style={{height: 'calc(100vh - 100px)'}}>
        
        {/* Enhanced Title Section */}
        <div className="text-center mb-4">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black tracking-tight mb-2">
              <span className="text-white drop-shadow-xl">TURF</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600">LOOT</span>
            </h1>
          </div>
          <p className="text-gray-300 text-2xl font-bold tracking-wide mt-2 mb-3">
            SKILL-BASED TERRITORY GAME
          </p>
          <div className="text-yellow-400 text-lg font-medium mt-2">
            ⚡ Real-time • 🏆 Skill-based • 💎 Blockchain verified
          </div>
        </div>

        {/* Compact Main Interface */}
        <div className="flex-1 flex justify-center px-4 min-h-0">
          <div className="grid grid-cols-12 gap-4 max-w-7xl w-full h-full">
            
            {/* Compact Left Panel */}
            <div className="col-span-3 space-y-3 h-full">
              {/* Compact Leaderboard */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[48%]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">🏆</div>
                  <h3 className="text-white font-bold text-sm">Leaderboard</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { rank: 1, name: 'aji', amount: '$1,610.02', color: 'text-yellow-400' },
                    { rank: 2, name: 'Erion', amount: '$1,380.53', color: 'text-gray-300' },
                    { rank: 3, name: 'Hotller', amount: '$1,233.80', color: 'text-orange-400' }
                  ].map((player) => (
                    <div key={player.rank} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-lg text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-xs ${player.color}`}>#{player.rank}</span>
                        <span className="text-gray-300">{player.name}</span>
                      </div>
                      <span className="text-yellow-400 font-bold text-xs">{player.amount}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 py-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 rounded-lg text-xs font-bold transition-all">
                  View Full Leaderboard
                </button>
              </div>

              {/* Compact Friends Panel */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[48%]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">👥</div>
                  <h3 className="text-white font-bold text-sm">Friends</h3>
                  <span className="text-gray-400 text-xs bg-gray-800/50 px-2 py-0.5 rounded-full">w/ RobtHurt</span>
                </div>
                <div className="text-center py-3">
                  <div className="text-3xl font-bold text-gray-600 mb-2">0</div>
                  <div className="text-gray-400 text-xs mb-2">No friends... add some!</div>
                  <button className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium">
                    Invite Friends
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Center Panel */}
            <div className="col-span-6 flex flex-col justify-center space-y-2">
              {/* Compact User Name Section */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-black">
                    {authenticated && user ? (
                      user.google?.name?.charAt(0)?.toUpperCase() || 
                      user.email?.address?.charAt(0)?.toUpperCase() || 
                      '?'
                    ) : '?'}
                  </div>
                  <span className="text-gray-300 text-sm font-medium">
                    {authenticated && user ? "Enter your Name!" : "Login to set your name"}
                  </span>
                </div>
                <button className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all">
                  <span className="text-sm">✏️</span>
                </button>
              </div>

              {/* Compact Betting Options */}
              <div className="flex justify-center space-x-4">
                {[1, 5, 20].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedBet(amount)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 ${
                      selectedBet === amount
                        ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black shadow-xl shadow-orange-500/25'
                        : 'bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 text-white border border-gray-600/50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Large Join Game Button */}
              <div className="text-center">
                <button className="relative group bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-8 py-3 rounded-2xl font-black text-lg shadow-2xl transition-all duration-300 hover:scale-105 flex items-center space-x-3 mx-auto">
                  <span className="text-xl">▶</span>
                  <span className="relative">JOIN GAME</span>
                </button>
              </div>

              {/* Compact Game Options */}
              <div className="flex justify-center space-x-4">
                <button className="px-4 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl text-sm font-bold border border-gray-600/50 transition-all hover:scale-105">
                  UB
                </button>
                <button className="px-4 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-xl text-sm font-bold border border-gray-600/50 transition-all hover:scale-105">
                  Browse Lobbies
                </button>
              </div>
            </div>

            {/* Compact Right Panel */}
            <div className="col-span-3 space-y-3 h-full">
              {/* Compact Wallet */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[58%]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">💳</div>
                    <h3 className="text-white font-bold text-sm">Wallet</h3>
                  </div>
                  <div className="flex space-x-2 text-xs">
                    <button className="text-gray-400 hover:text-cyan-400">Copy</button>
                    <span className="text-gray-600">•</span>
                    <button className="text-gray-400 hover:text-cyan-400">Refresh</button>
                  </div>
                </div>
                <div className="text-center mb-3 p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-xl font-black text-white mb-1">$0.00</div>
                  <div className="text-gray-400 text-xs">0.0000 SOL</div>
                </div>
                <div className="flex space-x-2">
                  <button className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-lg font-bold text-xs transition-all hover:scale-105">
                    Add Funds
                  </button>
                  <button className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-bold text-xs transition-all hover:scale-105">
                    Cash Out
                  </button>
                </div>
              </div>

              {/* Compact Customize */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 h-[38%]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-lg">🎨</div>
                  <h3 className="text-white font-bold text-sm">Customize</h3>
                </div>
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full relative shadow-xl hover:scale-110 transition-all">
                    <div className="absolute inset-2 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-full"></div>
                    <div className="absolute right-0 top-1/2 transform translate-x-1.5 -translate-y-1/2 w-3 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-r-full"></div>
                  </div>
                </div>
                <button className="w-full py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]">
                  Change Skin
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Section */}
        <div className="relative z-10 py-1 flex-shrink-0">
          {/* Compact Stats */}
          <div className="flex justify-center space-x-6 mb-2">
            <div className="text-center bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-gray-700/30">
              <div className="text-lg font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">38</div>
              <div className="text-gray-400 text-xs">Players in Game</div>
            </div>
            <div className="text-center bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-gray-700/30">
              <div className="text-lg font-black bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">$96,512</div>
              <div className="text-gray-400 text-xs">Global Winnings</div>
            </div>
          </div>

          {/* Compact Action Buttons */}
          <div className="flex justify-center space-x-3">
            <button className="px-3 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-lg text-xs font-bold border border-gray-600/50 transition-all hover:scale-105">
              Add Friends
            </button>
            <button className="px-3 py-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black rounded-lg text-xs font-bold transition-all hover:scale-105">
              Daily Crate
            </button>
            <button className="px-3 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-lg text-xs font-bold border border-gray-600/50 transition-all hover:scale-105">
              Affiliate
            </button>
            <button className="px-3 py-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 rounded-lg text-xs font-bold border border-gray-600/50 transition-all hover:scale-105">
              Change Appearance
            </button>
          </div>
        </div>
      </div>

      {/* Discord Button */}
      <div className="absolute bottom-2 left-2">
        <button className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all hover:scale-105">
          <span className="text-sm">🔗</span>
          <span>Discord</span>
        </button>
      </div>

      {/* Welcome Message Popup */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-yellow-500/30 shadow-2xl">
            {/* Close button */}
            <button 
              onClick={closeWelcome}
              className="absolute top-4 right-4 p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all hover:scale-110"
            >
              <svg className="w-5 h-5 text-gray-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Welcome content */}
            <div className="text-center">
              {/* Celebration icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                <span className="text-4xl">🎉</span>
              </div>
              
              {/* Welcome message */}
              <h2 className="text-3xl font-black text-white mb-2">
                Welcome to 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 ml-2">
                  TURFLOOT
                </span>
                !
              </h2>
              
              <p className="text-gray-300 text-lg mb-6">
                Hey {user?.google?.name || user?.email?.address || 'Player'}! 🚀
              </p>
              
              <div className="bg-black/30 rounded-xl p-4 mb-6 border border-gray-600/30">
                <p className="text-gray-200 text-sm mb-3">
                  You're all set to dominate the turf! Here's what you can do:
                </p>
                <ul className="text-left text-sm text-gray-300 space-y-2">
                  <li className="flex items-center space-x-2">
                    <span className="text-yellow-400">⚡</span>
                    <span>Join real-time multiplayer battles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">💎</span>
                    <span>Win SOL by capturing territory</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-blue-400">🎨</span>
                    <span>Customize your character skin</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-purple-400">👥</span>
                    <span>Invite friends and climb leaderboards</span>
                  </li>
                </ul>
              </div>
              
              {/* Action buttons */}
              <div className="space-y-3">
                <button 
                  onClick={closeWelcome}
                  className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 shadow-xl"
                >
                  Let's Play! 🎮
                </button>
                
                <button 
                  onClick={closeWelcome}
                  className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white px-6 py-2 rounded-xl font-medium transition-all duration-300"
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
