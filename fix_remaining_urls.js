// Script to update remaining API calls to use localhost
// This contains the updated API calls for the FriendsPanel

// fetchNotificationCount function
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

// acceptFriendRequest function
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

// declineFriendRequest function  
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

// markNotificationsAsRead function
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