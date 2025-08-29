'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { X, Search, Users, UserPlus, Clock, Ban, CheckCircle, XCircle } from 'lucide-react'

const AdvancedFriendsPanel = ({ onClose }) => {
  const { user, authenticated } = usePrivy()
  
  // State management
  const [activeTab, setActiveTab] = useState('friends') // friends, requests, search, suggestions
  const [loading, setLoading] = useState(false)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 10 })

  // Dynamic API URL utility function with bypass routing
  const getApiUrl = useCallback((endpoint) => {
    if (typeof window === 'undefined') return endpoint
    
    const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    if (isLocalDevelopment) {
      return `http://localhost:3000${endpoint}`
    }
    
    // External deployment: use bypass routes
    if (endpoint.startsWith('/api/friends/')) {
      return endpoint.replace('/api/friends/', '/friends-api/')
    }
    
    return endpoint
  }, [])

  // API call wrapper with error handling
  const apiCall = useCallback(async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 429) {
          alert(`Rate limit exceeded. ${data.resetIn ? `Try again in ${Math.ceil(data.resetIn / 1000)} seconds.` : 'Please try again later.'}`)
        }
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      
      return data
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }, [])

  // Load friends list
  const loadFriends = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const data = await apiCall(getApiUrl(`/friends-api/list?userId=${user.id}`))
      setFriends(data.friends || [])
    } catch (error) {
      console.error('Failed to load friends:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, apiCall, getApiUrl])

  // Load pending requests
  const loadPendingRequests = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const data = await apiCall(getApiUrl(`/friends-api/pending-requests?userId=${user.id}`))
      setPendingRequests(data.requests || [])
    } catch (error) {
      console.error('Failed to load pending requests:', error)
    }
  }, [user?.id, apiCall, getApiUrl])

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const data = await apiCall(getApiUrl(`/friends-api/suggestions?userId=${user.id}&limit=10`))
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }, [user?.id, apiCall, getApiUrl])

  // Search users
  const searchUsers = useCallback(async (query) => {
    if (!user?.id || !query || query.length < 2) {
      setSearchResults([])
      return
    }
    
    try {
      setLoading(true)
      const data = await apiCall(getApiUrl(`/friends-api/search?userId=${user.id}&q=${encodeURIComponent(query)}&onlineOnly=${onlineOnly}`))
      setSearchResults(data.users || [])
    } catch (error) {
      console.error('Failed to search users:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, onlineOnly, apiCall, getApiUrl])

  // Send friend request
  const sendFriendRequest = useCallback(async (toUserId, toUsername) => {
    if (!user?.id) return
    
    try {
      const data = await apiCall(getApiUrl('/friends-api/send-request'), {
        method: 'POST',
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId,
          fromUsername: user.email?.address?.split('@')[0] || 'User',
          toUsername
        })
      })
      
      setRateLimitInfo({ remaining: data.remaining })
      alert('Friend request sent successfully!')
      
      // Refresh search results to remove the user
      if (searchQuery) {
        searchUsers(searchQuery)
      }
      
    } catch (error) {
      console.error('Failed to send friend request:', error)
      alert(`Failed to send friend request: ${error.message}`)
    }
  }, [user, searchQuery, searchUsers, apiCall, getApiUrl])

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId) => {
    if (!user?.id) return
    
    try {
      await apiCall(getApiUrl('/friends-api/accept-request'), {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          userId: user.id
        })
      })
      
      alert('Friend request accepted!')
      await Promise.all([loadFriends(), loadPendingRequests()])
      
    } catch (error) {
      console.error('Failed to accept friend request:', error)
      alert(`Failed to accept request: ${error.message}`)
    }
  }, [user?.id, loadFriends, loadPendingRequests, apiCall, getApiUrl])

  // Decline friend request
  const declineFriendRequest = useCallback(async (requestId) => {
    if (!user?.id) return
    
    try {
      await apiCall(getApiUrl('/friends-api/decline-request'), {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          userId: user.id
        })
      })
      
      alert('Friend request declined')
      await loadPendingRequests()
      
    } catch (error) {
      console.error('Failed to decline friend request:', error)
      alert(`Failed to decline request: ${error.message}`)
    }
  }, [user?.id, loadPendingRequests, apiCall, getApiUrl])

  // Block user
  const blockUser = useCallback(async (blockedId, blockedUsername) => {
    if (!user?.id) return
    
    const confirmed = confirm(`Are you sure you want to block ${blockedUsername}? This will remove them from your friends list and prevent future friend requests.`)
    if (!confirmed) return
    
    try {
      await apiCall(getApiUrl('/friends-api/block-user'), {
        method: 'POST',
        body: JSON.stringify({
          blockerId: user.id,
          blockedId,
          blockerUsername: user.email?.address?.split('@')[0] || 'User',
          blockedUsername
        })
      })
      
      alert(`${blockedUsername} has been blocked`)
      await loadFriends()
      
    } catch (error) {
      console.error('Failed to block user:', error)
      alert(`Failed to block user: ${error.message}`)
    }
  }, [user, loadFriends, apiCall, getApiUrl])

  // Set user presence
  const setPresence = useCallback(async (online) => {
    if (!user?.id) return
    
    try {
      await apiCall(getApiUrl(`/friends-api/presence/${online ? 'online' : 'offline'}`), {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      })
    } catch (error) {
      console.error('Failed to update presence:', error)
    }
  }, [user?.id, apiCall, getApiUrl])

  // Initial load and presence management
  useEffect(() => {
    if (authenticated && user?.id) {
      loadFriends()
      loadPendingRequests()
      loadSuggestions()
      setPresence(true)
      
      // Set offline on unmount
      return () => {
        setPresence(false)
      }
    }
  }, [authenticated, user?.id, loadFriends, loadPendingRequests, loadSuggestions, setPresence])

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'search') {
        searchUsers(searchQuery)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery, onlineOnly, activeTab, searchUsers])

  if (!authenticated || !user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Friends</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-300">Please log in to access friends functionality.</p>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'friends':
        return (
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-4 text-gray-400">Loading friends...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto mb-2 text-gray-400" size={48} />
                <p className="text-gray-400">No friends yet</p>
                <p className="text-sm text-gray-500">Search for users to add as friends</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${friend.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-medium text-white">{friend.username}</p>
                      <p className="text-xs text-gray-400">
                        {friend.online ? 'Online' : `Last seen: ${new Date(friend.lastSeen).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => blockUser(friend.id, friend.username)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Block user"
                  >
                    <Ban size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )

      case 'requests':
        return (
          <div className="space-y-2">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto mb-2 text-gray-400" size={48} />
                <p className="text-gray-400">No pending requests</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{request.fromUsername}</p>
                    <p className="text-xs text-gray-400">
                      Sent {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => acceptFriendRequest(request.id)}
                      className="text-green-400 hover:text-green-300 p-1"
                      title="Accept"
                    >
                      <CheckCircle size={20} />
                    </button>
                    <button
                      onClick={() => declineFriendRequest(request.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Decline"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'search':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onlineOnly"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="onlineOnly" className="text-sm text-gray-300">
                  Online users only
                </label>
              </div>
              {rateLimitInfo.remaining < 10 && (
                <p className="text-xs text-yellow-400">
                  {rateLimitInfo.remaining} friend requests remaining this hour
                </p>
              )}
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-400">Searching...</div>
              ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                <div className="text-center py-4 text-gray-400">No users found</div>
              ) : (
                searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <p className="font-medium text-white">{user.username}</p>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user.id, user.username)}
                      disabled={!user.canSendRequest || rateLimitInfo.remaining <= 0}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm"
                    >
                      Add Friend
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'suggestions':
        return (
          <div className="space-y-2">
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="mx-auto mb-2 text-gray-400" size={48} />
                <p className="text-gray-400">No suggestions available</p>
                <button
                  onClick={loadSuggestions}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                >
                  Refresh Suggestions
                </button>
              </div>
            ) : (
              <>
                {suggestions.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <p className="font-medium text-white">{user.username}</p>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user.id, user.username)}
                      disabled={rateLimitInfo.remaining <= 0}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
                <button
                  onClick={loadSuggestions}
                  className="w-full mt-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
                >
                  Load More Suggestions
                </button>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Friends</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'friends', label: 'Friends', badge: friends.length },
            { id: 'requests', label: 'Requests', badge: pendingRequests.length },
            { id: 'search', label: 'Search' },
            { id: 'suggestions', label: 'Suggestions' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 bg-blue-600 text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default AdvancedFriendsPanel