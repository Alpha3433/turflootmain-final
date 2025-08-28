'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

// Crypto polyfill for older browsers
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => 
    (Math.random() * 16 | 0).toString(16)
  )
}

const FriendsPanel = ({ onInviteFriend, onClose }) => {
  const { user, getAccessToken, authenticated } = usePrivy()
  const [onlineFriends, setOnlineFriends] = useState([])
  const [allFriends, setAllFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([]) // Incoming friend requests
  const [sentRequests, setSentRequests] = useState([]) // Sent friend requests
  const [loading, setLoading] = useState(true)
  const [loadingFriends, setLoadingFriends] = useState(false) // Loading state for friends operations
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('friends') // 'friends', 'requests', or 'search'
  const [notificationCount, setNotificationCount] = useState(0) // Notification count for badge
  
  // Dynamic API URL utility function
  const getApiUrl = (endpoint) => {
    if (typeof window === 'undefined') return endpoint // SSR fallback
    
    const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const baseURL = isLocalDevelopment ? 'http://localhost:3000' : ''
    return `${baseURL}${endpoint}`
  }

  // Remove localStorage functions - app is now server-only

  useEffect(() => {
    if (user) {
      fetchFriends()
      fetchOnlineFriends()
      fetchPendingRequests() // Fetch pending friend requests
      fetchNotificationCount() // Fetch notification count
      
      // Set up periodic refresh for online status and notifications
      const interval = setInterval(() => {
        fetchOnlineFriends()
        fetchNotificationCount() // Check for new notifications
      }, 10000) // Every 10 seconds
      
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchFriends = async () => {
    if (!authenticated || !user?.id) {
      console.log('❌ User not authenticated, cannot fetch friends')
      setAllFriends([])
      return
    }

    try {
      setLoadingFriends(true)
      console.log('👥 Fetching friends from server for user:', user.id)
      
      const token = await getAccessToken()
      // Use dynamic API URL based on environment
      const apiUrl = getApiUrl(`/api/friends/list?userId=${user.id}`)
      console.log('🔗 DEBUG: Using friends list URL =', apiUrl)
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const serverData = await response.json()
        const serverFriends = serverData.friends || []
        console.log('✅ Server friends API successful:', serverFriends.length, 'friends loaded')
        setAllFriends(serverFriends)
      } else {
        console.error('❌ Server friends API failed:', response.status)
        setAllFriends([])
      }
      
    } catch (error) {
      console.error('❌ Error fetching friends from server:', error)
      setAllFriends([])
    } finally {
      setLoadingFriends(false)
    }
  }

  const fetchOnlineFriends = async () => {
    if (!user?.id) return
    
    try {
      // Force localhost URL to avoid 502 gateway issues
      const apiUrl = `http://localhost:3000/api/friends/online-status?userId=${user.id}`
      console.log('🔗 DEBUG: Using localhost online friends URL =', apiUrl)
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOnlineFriends(data.onlineFriends || [])
      }
    } catch (error) {
      console.error('❌ Error fetching online friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    if (!authenticated || !user?.id) {
      console.log('❌ User not authenticated, cannot search')
      setSearchResults([])
      return
    }

    setSearching(true)
    
    try {
      console.log('🔍 Searching server API for users:', query, 'excluding user:', user.id)
      
      const apiUrl = getApiUrl(`/api/names/search?q=${encodeURIComponent(query)}&userId=${user.id}`)
      console.log('🔗 DEBUG: Calling API URL =', apiUrl)
      
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        let apiUsers = data.users || []
        
        // Additional safety check to prevent self-addition
        apiUsers = apiUsers.filter(u => u.id !== user.id)
        
        console.log('✅ Server API search successful:', apiUsers.length, 'users found (self excluded)')
        setSearchResults(apiUsers)
      } else {
        console.error('❌ Server API search failed:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('❌ Server API search error:', error)
      setSearchResults([])
    }
    
    setSearching(false)
  }

  const sendFriendRequest = async (targetUser) => {
    if (!authenticated || !user?.id) {
      alert('Please login to add friends!')
      return
    }

    try {
      console.log('📤 Sending friend request to:', targetUser)
      
      // Additional safety check to prevent self-addition
      if (targetUser.id === user.id) {
        alert('You cannot add yourself as a friend!')
        return
      }
      
      // ONLY server-side friend request - NO localStorage fallback
      const token = await getAccessToken()
      // Use relative URL for same-origin requests
      const apiUrl = `/api/friends/send-request`
      console.log('🔗 DEBUG: Using relative send friend request URL =', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromUserId: user.id,
          fromUserName: user.email?.split('@')[0] || 'Unknown User',
          toUserId: targetUser.id,
          toUserName: targetUser.username
        })
      })
      
      if (response.ok) {
        const serverResult = await response.json()
        console.log('✅ Server-side friend request successful:', serverResult)
        
        alert(`✅ Added ${targetUser.username} as a friend!\n\n👥 You can now see them in your friends list.`)
        
        // Refresh friends list from server
        await fetchFriends()
        
        // Clear search results and query
        setSearchQuery('')
        setSearchResults([])
        setActiveTab('friends') // Switch to friends tab to show the update
      } else {
        const errorData = await response.json()
        console.error('❌ Server-side friend request failed:', errorData)
        alert(`Failed to add ${targetUser.username} as friend: ${errorData.error || 'Unknown error'}`)
      }
      
    } catch (error) {
      console.error('❌ Error sending friend request:', error)
      alert(`Failed to add ${targetUser.username} as friend. Please try again.`)
    }
  }

  // Fetch pending friend requests for notifications
  const fetchPendingRequests = async () => {
    if (!authenticated || !user?.id) {
      setFriendRequests([])
      return
    }

    try {
      console.log('📬 Fetching pending friend requests for user:', user.id)
      
      const token = await getAccessToken()
      const response = await fetch('http://localhost:3000/api/friends/requests/pending', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const requests = data.requests || []
        console.log('✅ Pending requests loaded:', requests.length)
        setFriendRequests(requests)
        return requests
      } else {
        console.error('❌ Failed to fetch pending requests:', response.status)
        setFriendRequests([])
      }
    } catch (error) {
      console.error('❌ Error fetching pending requests:', error)
      setFriendRequests([])
    }
  }

  // Fetch notification count for badge
  const fetchNotificationCount = async () => {
    if (!authenticated || !user?.id) {
      setNotificationCount(0)
      return
    }

    try {
      const token = await getAccessToken()
      const response = await fetch('http://localhost:3000/api/friends/notifications/count', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const count = data.count || 0
        console.log('🔔 Notification count:', count)
        setNotificationCount(count)
      }
    } catch (error) {
      console.error('❌ Error fetching notification count:', error)
    }
  }

  // Accept friend request
  const acceptFriendRequest = async (requestId, fromUserName) => {
    if (!authenticated || !user?.id) {
      alert('Please login to accept friend requests!')
      return
    }

    try {
      console.log('✅ Accepting friend request:', requestId)
      
      const token = await getAccessToken()
      const response = await fetch('http://localhost:3000/api/friends/accept-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: requestId,
          userId: user.id
        })
      })
      
      if (response.ok) {
        console.log('✅ Friend request accepted successfully')
        alert(`✅ Accepted friend request from ${fromUserName}!\n\nThey are now in your friends list.`)
        
        // Refresh all relevant data
        await Promise.all([
          fetchPendingRequests(),
          fetchFriends(),
          fetchNotificationCount()
        ])
        
        // Switch to friends tab to show the update
        setActiveTab('friends')
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to accept friend request:', errorData)
        alert(`Failed to accept friend request: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error accepting friend request:', error)
      alert('Failed to accept friend request. Please try again.')
    }
  }

  // Decline friend request
  const declineFriendRequest = async (requestId, fromUserName) => {
    if (!authenticated || !user?.id) {
      alert('Please login to decline friend requests!')
      return
    }

    try {
      console.log('❌ Declining friend request:', requestId)
      
      const token = await getAccessToken()
      const response = await fetch('http://localhost:3000/api/friends/decline-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: requestId,
          userId: user.id
        })
      })
      
      if (response.ok) {
        console.log('❌ Friend request declined successfully')
        alert(`❌ Declined friend request from ${fromUserName}`)
        
        // Refresh relevant data
        await Promise.all([
          fetchPendingRequests(),
          fetchNotificationCount()
        ])
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to decline friend request:', errorData)
        alert(`Failed to decline friend request: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error declining friend request:', error)
      alert('Failed to decline friend request. Please try again.')
    }
  }

  // Mark notifications as read
  const markNotificationsAsRead = async () => {
    if (!authenticated || !user?.id) return

    try {
      const token = await getAccessToken()
      await fetch('http://localhost:3000/api/friends/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id
        })
      })
      
      // Reset notification count
      setNotificationCount(0)
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error)
    }
  }

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery && activeTab === 'search') {
        searchUsers(searchQuery)
      }
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery, activeTab])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4">
          <div className="text-center text-white">Loading friends...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Friends</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Friends ({allFriends.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('requests')
              markNotificationsAsRead() // Mark as read when user opens requests tab
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-orange-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Requests ({friendRequests.length})
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Add Friends
          </button>
        </div>

        {activeTab === 'friends' ? (
          <div className="space-y-2">
            {/* Online Friends */}
            {onlineFriends.length > 0 && (
              <>
                <h3 className="text-green-400 font-semibold text-sm mb-2">
                  🟢 Online ({onlineFriends.filter(f => f.isOnline).length})
                </h3>
                {onlineFriends.filter(f => f.isOnline).map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-white font-medium">{friend.username}</div>
                        <div className="text-xs text-gray-400">
                          {friend.currentRoom ? `In ${friend.gameMode} game` : 'In lobby'}
                        </div>
                      </div>
                    </div>
                    {friend.canInvite && onInviteFriend && (
                      <button
                        onClick={() => onInviteFriend(friend.id, friend.username)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md transition-colors"
                      >
                        Invite
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Offline Friends */}
            {allFriends.filter(f => !onlineFriends.find(of => of.id === f.id && of.isOnline)).length > 0 && (
              <>
                <h3 className="text-gray-400 font-semibold text-sm mb-2 mt-4">
                  ⚫ Offline
                </h3>
                {allFriends.filter(f => !onlineFriends.find(of => of.id === f.id && of.isOnline)).map(friend => (
                  <div key={friend.id} className="flex items-center space-x-3 p-3 bg-gray-800/40 rounded-lg">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <div>
                      <div className="text-gray-300">{friend.username}</div>
                      <div className="text-xs text-gray-500">Offline</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {allFriends.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">No friends yet</div>
                <button
                  onClick={() => setActiveTab('search')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Search for friends to add
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'requests' ? (
          <div className="space-y-2">
            {friendRequests.length > 0 ? (
              <>
                <h3 className="text-orange-400 font-semibold text-sm mb-3">
                  📬 Friend Requests ({friendRequests.length})
                </h3>
                {friendRequests.map(request => (
                  <div key={request.id} className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-medium">{request.fromUserName}</div>
                        <div className="text-xs text-gray-400">
                          Sent {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-3">
                        <button
                          onClick={() => acceptFriendRequest(request.id, request.fromUserName)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors font-medium"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => declineFriendRequest(request.id, request.fromUserName)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors font-medium"
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">📭 No friend requests</div>
                <div className="text-xs text-gray-500 mb-3">
                  When someone sends you a friend request, it will appear here.
                </div>
                <button
                  onClick={() => setActiveTab('search')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Search for friends to add
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {searching && (
              <div className="text-center text-gray-400">Searching...</div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{user.username}</div>
                      <div className="text-xs text-gray-400">
                        Joined {new Date(user.joinDate).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md transition-colors"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                No users found matching "{searchQuery}"
              </div>
            )}

            {searchQuery.length < 2 && (
              <div className="text-center text-gray-400 py-4">
                <div className="text-sm mb-3">Type at least 2 characters to search</div>
                
                <div className="text-xs bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-2">
                  <div className="font-semibold text-blue-400 mb-2">💡 Finding Friends Tips:</div>
                  <div className="text-left space-y-1">
                    <div>• Search by the exact username they set</div>
                    <div>• Make sure they've updated their name first</div>
                    <div>• Try refreshing the page if not found</div>
                    <div>• Both users need to be on https://turfloot.com/</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FriendsPanel