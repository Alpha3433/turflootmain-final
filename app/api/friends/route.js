import { NextResponse } from 'next/server'

// Mock friends data for development - will be replaced with database
let mockFriends = new Map()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdentifier = searchParams.get('userIdentifier')
    
    console.log('👥 Friends list request:', { userIdentifier })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json({
        success: true,
        friends: [],
        message: 'Guest users have no friends list'
      })
    }
    
    // Get user's friends from mock data
    const userFriends = mockFriends.get(userIdentifier) || []
    
    console.log('✅ Friends list retrieved:', userFriends.length, 'friends')
    
    return NextResponse.json({
      success: true,
      friends: userFriends,
      count: userFriends.length
    })
    
  } catch (error) {
    console.error('❌ Error fetching friends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friends list' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { action, userIdentifier, friendIdentifier, friendUsername } = await request.json()
    
    console.log('👥 Friend action request:', { action, userIdentifier, friendIdentifier, friendUsername })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    switch (action) {
      case 'send_request':
        return await handleSendFriendRequest(userIdentifier, friendIdentifier, friendUsername)
      
      case 'accept_request':
        return await handleAcceptFriendRequest(userIdentifier, friendIdentifier)
      
      case 'decline_request':
        return await handleDeclineFriendRequest(userIdentifier, friendIdentifier)
      
      case 'remove_friend':
        return await handleRemoveFriend(userIdentifier, friendIdentifier)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('❌ Error handling friend action:', error)
    return NextResponse.json(
      { error: 'Failed to process friend action' },
      { status: 500 }
    )
  }
}

async function handleSendFriendRequest(userIdentifier, friendIdentifier, friendUsername) {
  // Mock implementation - in production this would:
  // 1. Check if friend exists
  // 2. Check if already friends
  // 3. Send notification to friend
  // 4. Store pending request
  
  console.log('📤 Sending friend request:', { userIdentifier, friendIdentifier, friendUsername })
  
  // For now, just add to mock friends list for demonstration
  const userFriends = mockFriends.get(userIdentifier) || []
  const newFriend = {
    id: friendIdentifier || `mock_${Date.now()}`,
    username: friendUsername,
    status: 'pending',
    addedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    isOnline: Math.random() > 0.5 // Random online status for demo
  }
  
  // Check if already exists
  const existingFriend = userFriends.find(f => f.id === newFriend.id || f.username === friendUsername)
  if (existingFriend) {
    return NextResponse.json(
      { error: 'Friend request already sent or user is already a friend' },
      { status: 400 }
    )
  }
  
  userFriends.push(newFriend)
  mockFriends.set(userIdentifier, userFriends)
  
  console.log('✅ Friend request sent successfully')
  
  return NextResponse.json({
    success: true,
    message: `Friend request sent to ${friendUsername}`,
    friend: newFriend
  })
}

async function handleAcceptFriendRequest(userIdentifier, friendIdentifier) {
  console.log('✅ Accepting friend request:', { userIdentifier, friendIdentifier })
  
  const userFriends = mockFriends.get(userIdentifier) || []
  const friendIndex = userFriends.findIndex(f => f.id === friendIdentifier)
  
  if (friendIndex === -1) {
    return NextResponse.json(
      { error: 'Friend request not found' },
      { status: 404 }
    )
  }
  
  userFriends[friendIndex].status = 'accepted'
  mockFriends.set(userIdentifier, userFriends)
  
  return NextResponse.json({
    success: true,
    message: 'Friend request accepted',
    friend: userFriends[friendIndex]
  })
}

async function handleDeclineFriendRequest(userIdentifier, friendIdentifier) {
  console.log('❌ Declining friend request:', { userIdentifier, friendIdentifier })
  
  const userFriends = mockFriends.get(userIdentifier) || []
  const updatedFriends = userFriends.filter(f => f.id !== friendIdentifier)
  mockFriends.set(userIdentifier, updatedFriends)
  
  return NextResponse.json({
    success: true,
    message: 'Friend request declined'
  })
}

async function handleRemoveFriend(userIdentifier, friendIdentifier) {
  console.log('🗑️ Removing friend:', { userIdentifier, friendIdentifier })
  
  const userFriends = mockFriends.get(userIdentifier) || []
  const updatedFriends = userFriends.filter(f => f.id !== friendIdentifier)
  mockFriends.set(userIdentifier, updatedFriends)
  
  return NextResponse.json({
    success: true,
    message: 'Friend removed successfully'
  })
}