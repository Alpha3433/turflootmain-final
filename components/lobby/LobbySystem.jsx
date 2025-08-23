'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Users, Plus, Globe, Lock, Crown, Check, X, MessageCircle, Play, Copy, RefreshCw, Wifi } from 'lucide-react'
import { io } from 'socket.io-client'

const LobbySystem = () => {
  const { user, authenticated } = usePrivy()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentLobby, setCurrentLobby] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBrowseModal, setShowBrowseModal] = useState(false)
  const [publicLobbies, setPublicLobbies] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  // Mobile detection for auto-condensing
  useEffect(() => {
    const detectMobile = () => {
      const userAgent = navigator.userAgent
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const aspectRatio = viewportWidth / viewportHeight
      
      // Comprehensive mobile detection
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
      const isMobileUserAgent = /Mobi|Android/i.test(userAgent)
      const isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isNarrowScreen = viewportWidth <= 768
      const isTabletPortrait = viewportWidth <= 1024 && aspectRatio < 1.2
      
      const mobile = isIOSDevice || isMobileUserAgent || isTouchCapable || isNarrowScreen || isTabletPortrait
      
      console.log('🎮 Lobby Mobile Detection:', {
        viewportWidth,
        aspectRatio: aspectRatio.toFixed(2),
        mobile,
        '📱 CONDENSED_MODE': mobile
      })
      
      setIsMobile(mobile)
    }

    detectMobile()
    
    // Re-detect on resize
    const handleResize = () => detectMobile()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Initialize Socket.IO connection
  useEffect(() => {
    if (authenticated && user && !socket) {
      const newSocket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        withCredentials: true,
        autoConnect: true,
      })

      newSocket.on('connect', () => {
        console.log('🔌 Connected to lobby server')
        setIsConnected(true)
        
        // Authenticate socket
        const token = localStorage.getItem('auth_token') || localStorage.getItem('privy:token')
        if (token) {
          newSocket.emit('authenticate', { token })
        }
      })

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from lobby server')
        setIsConnected(false)
      })

      newSocket.on('authenticated', (data) => {
        console.log('✅ Socket authenticated:', data.userId)
      })

      newSocket.on('auth_error', (error) => {
        console.error('❌ Socket auth error:', error)
        setError('Authentication failed')
      })

      // Lobby event handlers
      newSocket.on('lobby:created', (data) => {
        console.log('🎮 Lobby created:', data)
        setCurrentLobby(data.lobby)
        setShowCreateModal(false)
        setChatMessages([])
      })

      newSocket.on('lobby:state', (lobby) => {
        console.log('📊 Lobby state updated:', lobby)
        setCurrentLobby(lobby)
        
        // Update our ready status based on lobby state
        const ourPlayer = lobby.players.find(p => p.userId === user?.id)
        if (ourPlayer) {
          setIsReady(ourPlayer.ready)
        }
      })

      newSocket.on('lobby:member_joined', (data) => {
        console.log('👥 Member joined:', data)
        setChatMessages(prev => [...prev, {
          type: 'system',
          text: `${data.name} joined the lobby`,
          timestamp: new Date()
        }])
      })

      newSocket.on('lobby:member_left', (data) => {
        console.log('👋 Member left:', data)
        setChatMessages(prev => [...prev, {
          type: 'system',
          text: `Player left the lobby`,
          timestamp: new Date()
        }])
      })

      newSocket.on('lobby:chat', (message) => {
        console.log('💬 Chat message:', message)
        setChatMessages(prev => [...prev, {
          type: 'chat',
          ...message
        }])
      })

      newSocket.on('lobby:started', (data) => {
        console.log('🎮 Match started:', data)
        // Redirect to game with match data
        window.location.href = `/play?matchId=${data.matchId}&roomCode=${data.roomCode}`
      })

      newSocket.on('lobby:left', (data) => {
        console.log('👋 Left lobby:', data)
        setCurrentLobby(null)
        setChatMessages([])
        setIsReady(false)
      })

      newSocket.on('lobby:browse_result', (data) => {
        console.log('🔍 Browse result:', data)
        setPublicLobbies(data.lobbies)
      })

      newSocket.on('lobby:error', (error) => {
        console.error('❌ Lobby error:', error)
        setError(error.message)
        setTimeout(() => setError(null), 5000)
      })

      setSocket(newSocket)

      return () => {
        newSocket.disconnect()
      }
    }
  }, [authenticated, user, socket])

  // Create lobby
  const handleCreateLobby = (lobbyData) => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    socket.emit('lobby:create', {
      name: lobbyData.name || `${user?.email?.address || 'Player'}'s Lobby`,
      type: lobbyData.type || 'PUBLIC',
      region: lobbyData.region || 'na',
      maxPlayers: 2 // Always 2 for TurfLoot
    })
  }

  // Join lobby
  const handleJoinLobby = (lobbyId, joinCode = null) => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    socket.emit('lobby:join', { lobbyId, joinCode })
  }

  // Leave lobby
  const handleLeaveLobby = () => {
    if (!socket || !currentLobby) return

    socket.emit('lobby:leave', { lobbyId: currentLobby.id })
  }

  // Toggle ready status
  const handleToggleReady = () => {
    if (!socket || !currentLobby) return

    const newReadyStatus = !isReady
    socket.emit('lobby:ready', { ready: newReadyStatus })
  }

  // Send chat message
  const handleSendChat = () => {
    if (!socket || !currentLobby || !chatInput.trim()) return

    socket.emit('lobby:chat', { text: chatInput })
    setChatInput('')
  }

  // Start match
  const handleStartMatch = () => {
    if (!socket || !currentLobby) return

    socket.emit('lobby:start', {})
  }

  // Browse public lobbies
  const handleBrowseLobbies = (region = 'na') => {
    if (!socket || !isConnected) return

    socket.emit('lobby:browse', { region, limit: 10 })
  }

  // Copy join code
  const handleCopyJoinCode = (joinCode) => {
    navigator.clipboard.writeText(joinCode)
    // Could add a toast notification here
  }

  if (!authenticated) {
    return isMobile ? (
      // Mobile condensed lobby icon for unauthenticated users
      <div className="fixed top-4 left-4 z-40">
        <div className="w-12 h-12 bg-gray-800/90 backdrop-blur-sm rounded-full border border-gray-600/50 flex items-center justify-center">
          <Users className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    ) : (
      // Desktop full lobby widget for unauthenticated users
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50 min-w-[280px]">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-white font-bold text-sm">Lobby System</h3>
          </div>
          
          <div className="text-center py-2">
            <div className="text-gray-400 text-xs mb-2">
              Login to access lobby features
            </div>
            <div className="text-xs text-gray-500">
              Create or join 2-player lobbies
            </div>
          </div>
        </div>
      </div>
    )
  }

  return isMobile ? (
    // Mobile condensed lobby system
    <MobileCondensedLobby
      isConnected={isConnected}
      currentLobby={currentLobby}
      error={error}
      onCreateLobby={() => setShowCreateModal(true)}
      onBrowseLobbies={() => {
        setShowBrowseModal(true)
        handleBrowseLobbies()
      }}
      onLeaveLobby={handleLeaveLobby}
      // Pass modals and handlers
      showCreateModal={showCreateModal}
      setShowCreateModal={setShowCreateModal}
      showBrowseModal={showBrowseModal}
      setShowBrowseModal={setShowBrowseModal}
      publicLobbies={publicLobbies}
      handleCreateLobby={handleCreateLobby}
      handleJoinLobby={handleJoinLobby}
      handleBrowseLobbies={handleBrowseLobbies}
    />
  ) : (
    // Desktop full lobby system (unchanged)
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center justify-center space-x-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span className="text-xs text-gray-400">
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>

      {/* Current Lobby Display */}
      {currentLobby ? (
        <LobbyRoom
          lobby={currentLobby}
          currentUser={user}
          isReady={isReady}
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onToggleReady={handleToggleReady}
          onSendChat={handleSendChat}
          onStartMatch={handleStartMatch}
          onLeaveLobby={handleLeaveLobby}
          onCopyJoinCode={handleCopyJoinCode}
        />
      ) : (
        <LobbyButtons
          onCreateLobby={() => setShowCreateModal(true)}
          onBrowseLobbies={() => {
            setShowBrowseModal(true)
            handleBrowseLobbies()
          }}
          isConnected={isConnected}
        />
      )}

      {/* Create Lobby Modal */}
      {showCreateModal && (
        <CreateLobbyModal
          onClose={() => setShowCreateModal(false)}
          onCreateLobby={handleCreateLobby}
        />
      )}

      {/* Browse Lobbies Modal */}
      {showBrowseModal && (
        <BrowseLobbyModal
          lobbies={publicLobbies}
          onClose={() => setShowBrowseModal(false)}
          onJoinLobby={handleJoinLobby}
          onRefresh={() => handleBrowseLobbies()}
        />
      )}
    </div>
  )
}

// Lobby Action Buttons
const LobbyButtons = ({ onCreateLobby, onBrowseLobbies, isConnected }) => (
  <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50 min-w-[280px]">
    <div className="flex items-center space-x-2 mb-4">
      <Users className="w-5 h-5 text-purple-400" />
      <h3 className="text-white font-bold">Lobby System</h3>
    </div>
    
    <div className="space-y-3">
      <button
        onClick={onCreateLobby}
        disabled={!isConnected}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
      >
        <Plus className="w-4 h-4" />
        <span>Create Lobby</span>
      </button>
      
      <button
        onClick={onBrowseLobbies}
        disabled={!isConnected}
        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
      >
        <Globe className="w-4 h-4" />
        <span>Browse Lobbies</span>
      </button>
    </div>
  </div>
)

// Create Lobby Modal
const CreateLobbyModal = ({ onClose, onCreateLobby }) => {
  const [name, setName] = useState('')
  const [type, setType] = useState('PUBLIC')
  const [region, setRegion] = useState('na')

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreateLobby({ name, type, region })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-600 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Lobby</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Lobby Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Lobby"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="PUBLIC"
                  checked={type === 'PUBLIC'}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-2"
                />
                <Globe className="w-4 h-4 mr-1" />
                <span className="text-white text-sm">Public</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="PRIVATE"
                  checked={type === 'PRIVATE'}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-2"
                />
                <Lock className="w-4 h-4 mr-1" />
                <span className="text-white text-sm">Private</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="na">North America</option>
              <option value="eu">Europe</option>
              <option value="oce">Oceania</option>
              <option value="asia">Asia</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Browse Lobbies Modal
const BrowseLobbyModal = ({ lobbies, onClose, onJoinLobby, onRefresh }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60">
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-600 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Browse Public Lobbies</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-300" />
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-96">
        {lobbies.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No public lobbies available
          </div>
        ) : (
          <div className="space-y-3">
            {lobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:border-gray-500/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">{lobby.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                      <span>Host: {lobby.hostName}</span>
                      <span>Region: {lobby.region.toUpperCase()}</span>
                      <span>Players: {lobby.players}/{lobby.maxPlayers}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onJoinLobby(lobby.id)}
                    disabled={lobby.players >= lobby.maxPlayers}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
                  >
                    {lobby.players >= lobby.maxPlayers ? 'Full' : 'Join'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)

// Lobby Room Component
const LobbyRoom = ({
  lobby,
  currentUser,
  isReady,
  chatMessages,
  chatInput,
  setChatInput,
  onToggleReady,
  onSendChat,
  onStartMatch,
  onLeaveLobby,
  onCopyJoinCode
}) => {
  const isHost = lobby.hostUserId === currentUser?.id
  const allReady = lobby.players.every(p => p.ready || p.role === 'HOST')

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50 min-w-[320px] max-w-[400px]">
      {/* Lobby Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold">{lobby.name}</h3>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>{lobby.type}</span>
            <span>•</span>
            <span>{lobby.region.toUpperCase()}</span>
            {lobby.joinCode && (
              <>
                <span>•</span>
                <button
                  onClick={() => onCopyJoinCode(lobby.joinCode)}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>{lobby.joinCode}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onLeaveLobby}
          className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Players List */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Players ({lobby.players.length}/{lobby.maxPlayers})
        </h4>
        <div className="space-y-2">
          {lobby.players.map((player) => (
            <div
              key={player.userId}
              className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2"
            >
              <div className="flex items-center space-x-2">
                {player.role === 'HOST' && (
                  <Crown className="w-4 h-4 text-yellow-400" />
                )}
                <span className="text-white text-sm">{player.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                {player.ready ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <X className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ready Toggle */}
      <div className="mb-4">
        <button
          onClick={onToggleReady}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
            isReady
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
        >
          {isReady ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{isReady ? 'Ready' : 'Not Ready'}</span>
        </button>
      </div>

      {/* Chat */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-1">
          <MessageCircle className="w-4 h-4" />
          <span>Chat</span>
        </h4>
        <div className="bg-gray-700/30 rounded-lg p-2 h-20 overflow-y-auto text-xs">
          {chatMessages.length === 0 ? (
            <div className="text-gray-500 text-center py-2">No messages yet</div>
          ) : (
            <div className="space-y-1">
              {chatMessages.map((msg, index) => (
                <div key={index} className={msg.type === 'system' ? 'text-gray-400 italic' : 'text-white'}>
                  {msg.type === 'chat' && (
                    <span className="font-medium text-purple-300">{msg.userName}: </span>
                  )}
                  {msg.text}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex mt-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendChat()}
            placeholder="Type a message..."
            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded-l-lg text-white text-xs placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={onSendChat}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-r-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Start Match Button (Host Only) */}
      {isHost && (
        <button
          onClick={onStartMatch}
          disabled={!allReady || lobby.players.length < 1}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
        >
          <Play className="w-4 h-4" />
          <span>Start Match</span>
        </button>
      )}
    </div>
  )
}

// Mobile Condensed Lobby Component
const MobileCondensedLobby = ({
  isConnected,
  currentLobby,
  error,
  onCreateLobby,
  onBrowseLobbies,
  onLeaveLobby,
  showCreateModal,
  setShowCreateModal,
  showBrowseModal,
  setShowBrowseModal,
  publicLobbies,
  handleCreateLobby,
  handleJoinLobby,
  handleBrowseLobbies
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      {/* Mobile Lobby Icon */}
      <div className="fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-12 h-12 bg-gray-800/90 backdrop-blur-sm rounded-full border border-gray-600/50 flex items-center justify-center transition-all duration-200 ${
            isExpanded ? 'bg-purple-600/90 border-purple-500/50' : 'hover:bg-gray-700/90'
          }`}
        >
          <Users className={`w-5 h-5 ${isExpanded ? 'text-white' : 'text-gray-400'}`} />
          {/* Connection status indicator */}
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`} />
          {/* Active lobby indicator */}
          {currentLobby && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Mobile Expanded Lobby Panel */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-start"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="bg-gray-800/95 backdrop-blur-sm rounded-br-xl border-r border-b border-gray-600/50 max-w-xs w-full p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-bold text-sm">Lobby</h3>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-700/50 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-2 bg-red-900/50 border border-red-600/50 rounded text-red-200 text-xs">
                {error}
              </div>
            )}

            {/* Current Lobby or Actions */}
            {currentLobby ? (
              <MobileLobbyRoom lobby={currentLobby} onLeaveLobby={onLeaveLobby} />
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsExpanded(false)
                    onCreateLobby()
                  }}
                  disabled={!isConnected}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-medium py-2 px-3 rounded text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsExpanded(false)
                    onBrowseLobbies()
                  }}
                  disabled={!isConnected}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-medium py-2 px-3 rounded text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <Globe className="w-3 h-3" />
                  <span>Browse</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals (same as desktop) */}
      {showCreateModal && (
        <CreateLobbyModal
          onClose={() => setShowCreateModal(false)}
          onCreateLobby={handleCreateLobby}
        />
      )}

      {showBrowseModal && (
        <BrowseLobbyModal
          lobbies={publicLobbies}
          onClose={() => setShowBrowseModal(false)}
          onJoinLobby={handleJoinLobby}
          onRefresh={() => handleBrowseLobbies()}
        />
      )}
    </>
  )
}

// Mobile Lobby Room Component (Simplified)
const MobileLobbyRoom = ({ lobby, onLeaveLobby }) => (
  <div className="space-y-3">
    <div className="text-center">
      <div className="text-white font-medium text-sm">{lobby.name}</div>
      <div className="text-xs text-gray-400">
        {lobby.players.length}/{lobby.maxPlayers} players • {lobby.region.toUpperCase()}
      </div>
    </div>
    
    <div className="space-y-2">
      {lobby.players.map((player) => (
        <div
          key={player.userId}
          className="flex items-center justify-between bg-gray-700/50 rounded p-2"
        >
          <div className="flex items-center space-x-2">
            {player.role === 'HOST' && (
              <Crown className="w-3 h-3 text-yellow-400" />
            )}
            <span className="text-white text-xs">{player.name}</span>
          </div>
          {player.ready ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <X className="w-3 h-3 text-gray-400" />
          )}
        </div>
      ))}
    </div>
    
    <button
      onClick={onLeaveLobby}
      className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 font-medium py-2 px-3 rounded text-sm transition-colors"
    >
      Leave Lobby
    </button>
  </div>
)

export default LobbySystem