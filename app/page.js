'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../config/apiRouting'

// Mock Privy hook directly
function useMockPrivy() {
  return {
    ready: true,
    authenticated: false,
    user: null,
    login: () => {
      console.log('Mock login clicked')
      alert('Login functionality will be available soon!')
    },
    logout: () => console.log('Mock logout')
  }
}

// Simple mock components to replace complex ones
const SimpleFriendsPanel = () => (
  <div className="text-center py-4">
    <div className="text-2xl mb-2">👥</div>
    <div className="text-gray-400 text-sm mb-1">No friends yet</div>
    <div className="text-gray-500 text-xs">Add friends to see them here</div>
  </div>
)

const SimpleWalletManager = () => (
  <div className="text-center py-4 relative">
    <div className="flex items-center justify-center gap-2 mb-2">
      <div className="text-3xl font-black text-white">$0.00</div>
    </div>
    <div className="text-gray-400 text-sm mb-2">Game Balance</div>
  </div>
)

// Main Home component
export default function HomeContent() {
  // Get Privy authentication (mocked)
  const { ready, authenticated, user, login, logout } = useMockPrivy()
  
  const router = useRouter()
  
  // State management
  const [currentServer, setCurrentServer] = useState('Asia-East')
  const [currentPing, setCurrentPing] = useState(35) 
  const [userBalance, setUserBalance] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [liveStats, setLiveStats] = useState({ players: 0, globalWinnings: 0 })
  const [gameStake, setGameStake] = useState('FREE')
  const [friendsList, setFriendsList] = useState([])
  const [userProfile, setUserProfile] = useState({
    name: 'Click to set name',
    avatar_url: null,
    character_color: '#00f5ff'
  })

  // Available regions
  const availableRegions = [
    { id: 'us-east', displayName: 'US East' },
    { id: 'us-west', displayName: 'US West' },
    { id: 'eu-west', displayName: 'EU West' },
    { id: 'eu-central', displayName: 'EU Central' },
    { id: 'asia-se', displayName: 'Asia SE' },
    { id: 'asia-east', displayName: 'Asia East' },
    { id: 'asia-south', displayName: 'Asia South' },
    { id: 'oceania', displayName: 'Oceania' }
  ]

  // Handle login click
  const handleLoginClick = () => {
    if (!ready) {
      console.log('⚠️ Authentication not ready yet')
      return
    }
    login()
  }

  // Handle logout
  const handleLogout = () => {
    logout()
  }

  // Handle practice mode (join global multiplayer)
  const handlePracticeMode = () => {
    console.log('🌍 Starting Global Multiplayer...')
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  // Handle region selection
  const handleRegionSelect = (regionId) => {
    const region = availableRegions.find(r => r.id === regionId)
    if (region) {
      setCurrentServer(region.displayName)
      // Simulate ping measurement
      setCurrentPing(Math.floor(Math.random() * 50) + 20)
    }
  }

  // Get region colors
  const getRegionColors = (displayName, isActive) => {
    const colors = {
      'Oceania': isActive ? 'bg-teal-600 text-white border-teal-400' : 'bg-teal-700/80 text-teal-200 border-teal-600 hover:bg-teal-600',
      'Asia East': isActive ? 'bg-blue-600 text-white border-blue-400' : 'bg-blue-700/80 text-blue-200 border-blue-600 hover:bg-blue-600',
      'US East': isActive ? 'bg-orange-600 text-white border-orange-400' : 'bg-orange-700/80 text-orange-200 border-orange-600 hover:bg-orange-600',
      'US West': isActive ? 'bg-green-600 text-white border-green-400' : 'bg-green-700/80 text-green-200 border-green-600 hover:bg-green-600',
      'Europe': isActive ? 'bg-purple-600 text-white border-purple-400' : 'bg-purple-700/80 text-purple-200 border-purple-600 hover:bg-purple-600'
    }
    return colors[displayName] || (isActive ? 'bg-gray-600 text-white border-gray-400' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600')
  }

  // Fetch data on component mount
  useEffect(() => {
    // Fetch leaderboard
    fetch(getApiUrl('/users/leaderboard'))
      .then(res => res.json())
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(err => console.error('Failed to fetch leaderboard:', err))

    // Fetch live stats
    fetch(getApiUrl('/stats/live-players'))
      .then(res => res.json())
      .then(data => setLiveStats(prev => ({ ...prev, players: data.count || 0 })))
      .catch(err => console.error('Failed to fetch live players:', err))

    fetch(getApiUrl('/stats/global-winnings'))
      .then(res => res.json())
      .then(data => setLiveStats(prev => ({ ...prev, globalWinnings: data.totalWinnings || 0 })))
      .catch(err => console.error('Failed to fetch global winnings:', err))
  }, [])

  return (
    <div className="min-h-screen w-full text-white relative flex flex-col bg-black" style={{
      background: 'linear-gradient(to bottom right, rgb(0, 0, 0), rgb(17, 24, 39), rgb(0, 0, 0))',
      minHeight: '100dvh'
    }}>
      
      {/* Top Region Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center justify-center px-4 py-2 space-x-2">
          {/* COINS Display */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-xs">$</span>
            </div>
            <span className="text-yellow-400 font-bold text-sm">COINS</span>
          </div>
          
          {/* Region Buttons */}
          {availableRegions.map((region) => (
            <button
              key={region.id}
              onClick={() => handleRegionSelect(region.id)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 border ${
                getRegionColors(region.displayName, currentServer === region.displayName)
              }`}
            >
              {region.displayName}
            </button>
          ))}
          
          {/* LOGIN Button */}
          <button
            onClick={handleLoginClick}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all hover:scale-105"
          >
            LOGIN
          </button>
        </div>
      </div>

      {/* Add top padding to account for fixed navigation */}
      <div className="pt-16"></div>

      {/* Floating Elements */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ minHeight: '100dvh' }}>
        {/* Floating Coins */}
        <div className="absolute top-20 left-16 animate-bounce" style={{ animationDelay: '0s' }}>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200">
            <span className="text-black font-black text-lg">$</span>
          </div>
        </div>
        <div className="absolute top-32 right-24 animate-bounce" style={{ animationDelay: '1.5s' }}>
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200">
            <span className="text-black font-black text-base">$</span>
          </div>
        </div>

        {/* Grid Background */}
        <div className="absolute inset-0 opacity-25">
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0, 245, 255, 0.6)" strokeWidth="1.5"></path>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"></rect>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-40 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex flex-col pt-4 sm:pt-8 pb-4 sm:pb-20">
          
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-4xl md:text-5xl xl:text-6xl font-black tracking-tight mb-3">
              <span className="text-white">TURF</span>
              <span className="text-yellow-400">LOOT</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg font-bold tracking-wide">SKILL-BASED GRID DOMINATION</p>
          </div>

          {/* Game Interface Grid */}
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-3 max-w-5xl mx-auto space-y-6 sm:space-y-7 lg:space-y-0 flex-1">
            
            {/* Left Panels */}
            <div className="order-3 lg:order-1 col-span-12 lg:col-span-3 space-y-4 lg:space-y-3 mt-2 lg:mt-0">
              {/* Leaderboard Panel */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-3 lg:p-4 shadow-2xl">
                <div className="flex items-center space-x-3 mb-3 lg:mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-xs lg:text-sm">🏆</span>
                  </div>
                  <h3 className="text-white font-bold text-base lg:text-lg">Leaderboard</h3>
                  <div className="ml-auto">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Live</span>
                  </div>
                </div>
                <div className="space-y-2 lg:space-y-3">
                  {leaderboard.length > 0 ? (
                    leaderboard.slice(0, 5).map((player, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <span className="text-gray-300 text-sm">{index + 1}. {player.name}</span>
                        <span className="text-yellow-400 font-bold text-sm">${player.winnings}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🏆</div>
                      <div className="text-gray-400 text-sm">No players yet</div>
                      <div className="text-gray-500 text-xs">Be the first to cash out!</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Friends Panel */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-3 lg:p-4 shadow-2xl">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold text-xs lg:text-sm">👥</span>
                    </div>
                    <h3 className="text-white font-bold text-base lg:text-lg">Friends</h3>
                  </div>
                </div>
                <SimpleFriendsPanel />
              </div>
            </div>

            {/* Center - Main Game */}
            <div className="order-1 lg:order-2 col-span-12 lg:col-span-6 flex flex-col justify-center space-y-3 lg:space-y-4">
              
              {/* Stats */}
              <div className="flex justify-center space-x-8 lg:space-x-12">
                <div className="text-center">
                  <div className="text-3xl lg:text-4xl font-black text-yellow-400 mb-1">
                    {liveStats.players}
                  </div>
                  <div className="text-gray-400 text-xs lg:text-sm font-medium">Players in Game</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl lg:text-4xl font-black text-yellow-400 mb-1">
                    ${liveStats.globalWinnings}
                  </div>
                  <div className="text-gray-400 text-xs lg:text-sm font-medium">Global Player Winnings</div>
                </div>
              </div>

              {/* Player Avatar */}
              <div className="flex justify-center">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl px-6 lg:px-8 py-4 lg:py-5 border border-gray-700/50 flex items-center space-x-4 lg:space-x-5">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-lg lg:text-xl font-bold text-white">
                    ?
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-xl font-semibold cursor-pointer hover:text-cyan-400">
                      {userProfile.name}
                    </span>
                    <span className="text-gray-400 text-sm font-medium">Choose your display name</span>
                  </div>
                </div>
              </div>

              {/* Stakes */}
              <div className="flex justify-center space-x-3">
                <button 
                  onClick={() => setGameStake('FREE')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    gameStake === 'FREE' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  FREE
                </button>
                <button 
                  onClick={() => setGameStake('1')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    gameStake === '1' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  $1
                </button>
                <button 
                  onClick={() => setGameStake('5')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    gameStake === '5' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  $5
                </button>
                <button 
                  onClick={() => setGameStake('20')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 ${
                    gameStake === '20' ? 'bg-cyan-400 text-black border-2 border-cyan-300' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}
                >
                  $20
                </button>
              </div>

              {/* Connection Status */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-500/10 border border-cyan-400/30 rounded-xl">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-cyan-400 font-medium text-sm">
                    🌍 Connected to {currentServer} ({currentPing}ms) - Global Servers
                  </span>
                </div>
              </div>

              {/* Main Join Button */}
              <div className="flex justify-center">
                <button 
                  onClick={handlePracticeMode}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-black py-4 lg:py-6 px-8 lg:px-16 rounded-2xl text-lg lg:text-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-2 border-cyan-300"
                >
                  🌍 JOIN GLOBAL MULTIPLAYER
                </button>
              </div>

              {/* Secondary Buttons */}
              <div className="flex justify-center space-x-4 mt-4">
                <button className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-2xl font-bold text-purple-400 transition-all hover:scale-105 text-sm">
                  🌐 Server Browser
                </button>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white transition-all hover:scale-105 shadow-lg text-sm">
                  🔗 Join Discord
                </button>
              </div>
            </div>

            {/* Right Panels */}
            <div className="order-2 lg:order-3 col-span-12 lg:col-span-3 space-y-4 lg:space-y-3">
              {/* Wallet Panel */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-cyan-400/20 p-3 lg:p-4 shadow-2xl">
                <div className="flex items-center space-x-3 mb-3 lg:mb-4">
                  <div className="w-5 h-5 lg:w-6 lg:h-6 bg-cyan-400 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-black">💰</span>
                  </div>
                  <h3 className="text-white font-bold text-base lg:text-lg">Wallet</h3>
                </div>
                <SimpleWalletManager />
                <div className="space-y-3">
                  <button className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-400 font-bold text-sm transition-all hover:scale-105">
                    Add Funds
                  </button>
                  <button className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 font-bold text-sm transition-all hover:scale-105">
                    Cash Out
                  </button>
                </div>
              </div>

              {/* Customize Panel */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 lg:p-6 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4 lg:mb-6">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs lg:text-sm">🎨</span>
                  </div>
                  <h3 className="text-white font-bold text-base lg:text-lg">Customize</h3>
                </div>
                <div className="text-center">
                  <div className="relative w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-3 lg:mb-4">
                    <div 
                      className="w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center border-2 border-cyan-300 bg-gradient-to-br from-cyan-300 via-blue-500 to-blue-600"
                      style={{ backgroundColor: userProfile.character_color }}
                    >
                      <div className="w-2 h-2 bg-black rounded-full absolute top-4 lg:top-5 left-4 lg:left-6"></div>
                      <div className="w-2 h-2 bg-black rounded-full absolute top-4 lg:top-5 right-4 lg:right-6"></div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs mb-3">Your Character</div>
                  <button className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-400 font-medium transition-all hover:scale-105 text-sm">
                    Change Appearance
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}