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
  const { user, getAccessToken } = usePrivy()
  const [onlineFriends, setOnlineFriends] = useState([])
  const [allFriends, setAllFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [localUsers, setLocalUsers] = useState([]) // Track locally discovered users
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('friends') // 'friends' or 'search'

  useEffect(() => {
    if (user) {
      fetchFriends()
      fetchOnlineFriends()
      // Set up periodic refresh for online status
      const interval = setInterval(fetchOnlineFriends, 10000) // Every 10 seconds
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchFriends = async () => {
    try {
      const token = await getAccessToken()
      const response = await fetch(`/api/friends/list?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAllFriends(data.friends || [])
      }
    } catch (error) {
      console.error('❌ Error fetching friends:', error)
    }
  }

  const fetchOnlineFriends = async () => {
    try {
      const token = await getAccessToken()
      const response = await fetch(`/api/friends/online-status?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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

    setSearching(true)
    let foundUsers = []
    
    try {
      // Strategy 1: Try server API search
      console.log('🔍 Searching server for users:', query)
      const token = await getAccessToken()
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        foundUsers = data.users || []
        console.log('✅ Server search successful:', foundUsers.length, 'users found')
      } else {
        console.warn('⚠️ Server search failed, using fallback methods')
      }
    } catch (error) {
      console.error('❌ Server search error:', error)
    }
    
    // Strategy 2: Search localStorage for locally known users
    try {
      console.log('🔍 Searching localStorage for users...')
      const locallyKnownUsers = []
      
      // Check all localStorage keys for user data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('turfloot_user_')) {
          try {
            const userData = JSON.parse(localStorage.getItem(key))
            if (userData && userData.customName && 
                userData.customName.toLowerCase().includes(query.toLowerCase()) &&
                userData.userId !== user.id) {
              
              locallyKnownUsers.push({
                id: userData.userId,
                username: userData.customName,
                joinDate: userData.timestamp,
                source: 'localStorage'
              })
            }
          } catch (e) {
            // Skip invalid localStorage entries
          }
        }
      }
      
      if (locallyKnownUsers.length > 0) {
        console.log('✅ Found', locallyKnownUsers.length, 'users in localStorage')
        
        // Merge with server results, avoiding duplicates
        const existingIds = foundUsers.map(u => u.id)
        const newLocalUsers = locallyKnownUsers.filter(u => !existingIds.includes(u.id))
        foundUsers = [...foundUsers, ...newLocalUsers]
      }
      
    } catch (error) {
      console.error('❌ localStorage search error:', error)
    }
    
    // Strategy 3: Manual user ID search (if user enters a full user ID)
    if (query.startsWith('did:privy:') && query.length > 15) {
      console.log('🔍 Detected potential user ID, adding manual entry option')
      const existingIds = foundUsers.map(u => u.id)
      if (!existingIds.includes(query)) {
        foundUsers.push({
          id: query,
          username: `User ${query.substring(10, 20)}...`,
          joinDate: new Date().toISOString(),
          source: 'manual'
        })
      }
    }
    
    console.log('📊 Final search results:', foundUsers.length, 'users found')
    setSearchResults(foundUsers)
    
    setSearching(false)
  }

  const sendFriendRequest = async (targetUser) => {
    try {
      console.log('📤 Sending friend request to:', targetUser)
      
      // Strategy 1: Try server API
      let serverSuccess = false
      try {
        const token = await getAccessToken()
        const response = await fetch('/api/friends/send-request', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fromUserId: user.id,
            toUserId: targetUser.id || targetUser.username,
            targetUsername: targetUser.username
          })
        })
        
        if (response.ok) {
          serverSuccess = true
          console.log('✅ Server friend request successful')
        } else {
          console.warn('⚠️ Server friend request failed, using localStorage fallback')
        }
      } catch (error) {
        console.error('❌ Server friend request error:', error)
      }
      
      // Strategy 2: Store friend request locally for when server is available
      if (!serverSuccess) {
        try {
          // Store pending friend request in localStorage
          const pendingRequests = JSON.parse(localStorage.getItem('turfloot_pending_friend_requests') || '[]')
          const newRequest = {
            id: generateId(),
            fromUserId: user.id,
            fromUsername: displayName || 'Anonymous',
            toUserId: targetUser.id,
            toUsername: targetUser.username,
            timestamp: new Date().toISOString(),
            status: 'pending_local'
          }
          
          // Check if request already exists
          const existingRequest = pendingRequests.find(
            req => req.fromUserId === user.id && req.toUserId === targetUser.id
          )
          
          if (!existingRequest) {
            pendingRequests.push(newRequest)
            localStorage.setItem('turfloot_pending_friend_requests', JSON.stringify(pendingRequests))
            console.log('💾 Friend request stored locally for later sync')
          }
          
          // Also store the target user info for future searches
          const userInfo = {
            userId: targetUser.id,
            customName: targetUser.username,
            timestamp: new Date().toISOString(),
            discoveredVia: 'friend_request'
          }
          localStorage.setItem(`turfloot_user_${targetUser.id}`, JSON.stringify(userInfo))
          
        } catch (error) {
          console.error('❌ Error storing friend request locally:', error)
        }
      }
      
      // User feedback
      if (serverSuccess) {
        alert(`✅ Friend request sent to ${targetUser.username}!`)
      } else {
        alert(`📤 Friend request to ${targetUser.username} saved!\n\n💾 Will be sent when server connection is available.\nYou can find them in searches now.`)
      }
      
      setSearchQuery('')
      setSearchResults([])
      
    } catch (error) {
      console.error('❌ Error sending friend request:', error)
      alert(`Failed to send friend request to ${targetUser.username}. Please try again.`)
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
                Type at least 2 characters to search
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FriendsPanel