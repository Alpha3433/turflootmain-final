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
  const [friendRequests, setFriendRequests] = useState([]) // Incoming friend requests
  const [sentRequests, setSentRequests] = useState([]) // Sent friend requests
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('friends') // 'friends', 'requests', or 'search'

  // Get user-specific localStorage keys
  const getUserFriendsKey = () => `turfloot_friends_${user?.id}`
  const getUserRequestsKey = () => `turfloot_friend_requests_${user?.id}`
  const getUserSentRequestsKey = () => `turfloot_sent_requests_${user?.id}`

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
      // Load user-specific friends from localStorage
      const userFriendsKey = getUserFriendsKey()
      const localFriends = JSON.parse(localStorage.getItem(userFriendsKey) || '[]')
      console.log('👥 Loaded', localFriends.length, 'user-specific friends from localStorage for user:', user?.id)
      setAllFriends(localFriends)
      
      // Also try to load from server-side API if available
      try {
        const token = await getAccessToken()
        const response = await fetch(`/api/friends/list?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const serverData = await response.json()
          const serverFriends = serverData.friends || []
          console.log('👥 Loaded', serverFriends.length, 'friends from server API')
          
          // Merge server friends with local friends (server takes priority)
          const mergedFriends = [...serverFriends]
          
          // Add any local friends not on server (for offline-added friends)
          for (const localFriend of localFriends) {
            if (!serverFriends.find(sf => sf.id === localFriend.id)) {
              mergedFriends.push(localFriend)
            }
          }
          
          setAllFriends(mergedFriends)
          
          // Update localStorage with merged data
          localStorage.setItem(userFriendsKey, JSON.stringify(mergedFriends))
        }
      } catch (serverError) {
        console.log('⚠️ Server friends API not available, using localStorage only:', serverError.message)
      }
      
    } catch (error) {
      console.error('❌ Error fetching friends:', error)
      setAllFriends([])
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
      // ONLY use bulletproof names API - no fallbacks, and exclude current user
      console.log('🔍 Searching bulletproof names API for users:', query, 'excluding user:', user.id)
      const response = await fetch(`/api/names/search?q=${encodeURIComponent(query)}&userId=${user.id}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        let apiUsers = data.users || []
        
        // Additional safety check to prevent self-addition
        apiUsers = apiUsers.filter(u => u.id !== user.id)
        
        foundUsers = apiUsers
        console.log('✅ Names API search successful:', foundUsers.length, 'users found (self excluded)')
      } else {
        console.warn('⚠️ Names API search failed')
      }
    } catch (error) {
      console.error('❌ Names API search error:', error)
    }
    
    // Enhanced localStorage search for local users (excluding self)
    try {
      console.log('🔍 Searching localStorage for users...')
      const locallyKnownUsers = []
      
      // Check user-specific all users cache (not shared anymore)
      try {
        const userAllUsersKey = `turfloot_all_users_${user.id}`
        const allLocalUsers = JSON.parse(localStorage.getItem(userAllUsersKey) || '[]')
        for (const userData of allLocalUsers) {
          if (userData && userData.customName && 
              userData.customName.toLowerCase().includes(query.toLowerCase()) &&
              userData.userId !== user.id) { // Prevent self-addition
            
            locallyKnownUsers.push({
              id: userData.userId,
              username: userData.customName,
              joinDate: userData.timestamp,
              source: 'localStorage'
            })
          }
        }
      } catch (e) {
        console.error('⚠️ Error searching user-specific cache:', e)
      }
      
      if (locallyKnownUsers.length > 0) {
        console.log('✅ Found', locallyKnownUsers.length, 'users in localStorage (self excluded)')
        
        // Merge with API results, avoiding duplicates
        const existingIds = foundUsers.map(u => u.id)
        const newLocalUsers = locallyKnownUsers.filter(u => !existingIds.includes(u.id))
        foundUsers = [...foundUsers, ...newLocalUsers]
      }
      
    } catch (error) {
      console.error('❌ localStorage search error:', error)
    }
    
    // Final safety check to ensure current user is never in results
    foundUsers = foundUsers.filter(u => u.id !== user.id)
    
    console.log('📊 Final search results:', foundUsers.length, 'users found (verified self-excluded)')
    setSearchResults(foundUsers)
    
    setSearching(false)
  }

  const sendFriendRequest = async (targetUser) => {
    try {
      console.log('📤 Adding friend:', targetUser)
      
      // Simple localStorage-based friends system
      try {
        // Get current friends list
        const currentFriends = JSON.parse(localStorage.getItem('turfloot_friends') || '[]')
        
        // Check if already friends
        const existingFriend = currentFriends.find(
          friend => friend.id === targetUser.id
        )
        
        if (existingFriend) {
          alert(`You are already friends with ${targetUser.username}!`)
          return
        }
        
        // Add new friend
        const newFriend = {
          id: targetUser.id,
          username: targetUser.username,
          addedAt: new Date().toISOString(),
          source: targetUser.source || 'search'
        }
        
        currentFriends.push(newFriend)
        localStorage.setItem('turfloot_friends', JSON.stringify(currentFriends))
        
        console.log('✅ Friend added successfully to localStorage')
        
        // Refresh friends list
        setAllFriends(currentFriends)
        
        alert(`✅ Added ${targetUser.username} as a friend!\n\n👥 You can now see them in your friends list.`)
        
      } catch (error) {
        console.error('❌ Error adding friend to localStorage:', error)
        alert(`Failed to add ${targetUser.username} as friend. Please try again.`)
      }
      
      setSearchQuery('')
      setSearchResults([])
      
    } catch (error) {
      console.error('❌ Error sending friend request:', error)
      alert(`Failed to add ${targetUser.username} as friend. Please try again.`)
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