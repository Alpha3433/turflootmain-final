'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

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
    try {
      const token = await getAccessToken()
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      }
    } catch (error) {
      console.error('❌ Error searching users:', error)
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (targetUsername) => {
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
          toUserId: targetUsername // This endpoint expects username, needs to be updated
        })
      })
      
      if (response.ok) {
        alert('Friend request sent successfully!')
        setSearchQuery('')
        setSearchResults([])
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to send friend request'}`)
      }
    } catch (error) {
      console.error('❌ Error sending friend request:', error)
      alert('Failed to send friend request')
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
                      onClick={() => sendFriendRequest(user.username)}
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