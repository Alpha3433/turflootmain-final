import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

// MongoDB connection
let cachedClient = null
let cachedDb = null

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  const db = client.db(process.env.DB_NAME || 'turfloot_db')

  cachedClient = client
  cachedDb = db

  return { client, db }
}

// All friend data now stored in MongoDB - no mock data structures

async function getPrivyUsers(currentUserIdentifier) {
  try {
    const { db } = await connectToDatabase()
    
    // Get all Privy users who have signed up
    const users = await db.collection('users').find({
      userIdentifier: { $ne: currentUserIdentifier } // Exclude current user
    }).toArray()
    
    // Get current user's friends and pending requests to filter out
    const userFriends = mockFriends.get(currentUserIdentifier) || []
    const userRequests = mockFriendRequests.get(currentUserIdentifier) || { sent: [], received: [] }
    
    const friendUsernames = userFriends.map(f => f.username.toLowerCase())
    const sentRequestUsernames = userRequests.sent.map(r => r.toUsername.toLowerCase())
    const receivedRequestUsernames = userRequests.received.map(r => r.fromUsername.toLowerCase())
    
    // Filter out users who are already friends or have pending requests
    const availableUsers = users.filter(user => {
      const username = (user.username || user.displayName || 'Unknown').toLowerCase()
      return !friendUsernames.includes(username) && 
             !sentRequestUsernames.includes(username) && 
             !receivedRequestUsernames.includes(username)
    }).map(user => ({
      username: user.username || user.displayName || `User_${user.userIdentifier.slice(-4)}`,
      status: user.isOnline ? 'online' : 'offline',
      joinedAt: user.createdAt || user.joinedAt || new Date().toISOString(),
      gamesPlayed: user.gamesPlayed || 0
    }))
    
    return availableUsers
  } catch (error) {
    console.error('❌ Error fetching Privy users:', error)
    return []
  }
}

async function storePrivyUser(userIdentifier, userData) {
  try {
    const { db } = await connectToDatabase()
    
    const userDoc = {
      userIdentifier,
      username: userData.username || userData.displayName || `User_${userIdentifier.slice(-4)}`,
      displayName: userData.displayName,
      email: userData.email,
      walletAddress: userData.walletAddress,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      isOnline: true,
      gamesPlayed: 0
    }
    
    await db.collection('users').updateOne(
      { userIdentifier },
      { $set: userDoc },
      { upsert: true }
    )
    
    console.log('✅ Privy user stored/updated:', userIdentifier)
    return true
  } catch (error) {
    console.error('❌ Error storing Privy user:', error)
    return false
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdentifier = searchParams.get('userIdentifier')
    const requestType = searchParams.get('type') // 'friends', 'requests', or 'users'
    
    console.log('👥 Friends/Requests/Users list request:', { userIdentifier, requestType })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json({
        success: true,
        friends: [],
        requests: { sent: [], received: [] },
        users: [],
        message: 'Please log in to see other users'
      })
    }
    
    if (requestType === 'users') {
      // Get list of all available Privy users to add as friends
      const availableUsers = await getPrivyUsers(userIdentifier)
      
      console.log('✅ Available Privy users retrieved:', availableUsers.length, 'users')
      
      return NextResponse.json({
        success: true,
        users: availableUsers,
        count: availableUsers.length
      })
    } else if (requestType === 'requests') {
      // Get friend requests for this user
      const userRequests = mockFriendRequests.get(userIdentifier) || { sent: [], received: [] }
      
      console.log('✅ Friend requests retrieved:', userRequests)
      
      return NextResponse.json({
        success: true,
        requests: userRequests,
        sentCount: userRequests.sent.length,
        receivedCount: userRequests.received.length
      })
    } else {
      // Get user's friends from mock data
      const userFriends = mockFriends.get(userIdentifier) || []
      
      console.log('✅ Friends list retrieved:', userFriends.length, 'friends')
      
      return NextResponse.json({
        success: true,
        friends: userFriends,
        count: userFriends.length
      })
    }
    
  } catch (error) {
    console.error('❌ Error fetching friends/requests/users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friends/requests/users list' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { action, userIdentifier, friendIdentifier, friendUsername, requestId, userData } = await request.json()
    
    console.log('👥 Friend action request:', { action, userIdentifier, friendIdentifier, friendUsername, requestId })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    switch (action) {
      case 'register_user':
        return await handleRegisterPrivyUser(userIdentifier, userData)
      
      case 'send_request':
        return await handleSendFriendRequest(userIdentifier, friendUsername)
      
      case 'accept_request':
        return await handleAcceptFriendRequest(userIdentifier, requestId)
      
      case 'decline_request':
        return await handleDeclineFriendRequest(userIdentifier, requestId)
      
      case 'cancel_request':
        return await handleCancelFriendRequest(userIdentifier, requestId)
      
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

async function handleRegisterPrivyUser(userIdentifier, userData) {
  console.log('📝 Registering/updating Privy user:', { userIdentifier, userData })
  
  const success = await storePrivyUser(userIdentifier, userData)
  
  if (success) {
    return NextResponse.json({
      success: true,
      message: 'User registered/updated successfully'
    })
  } else {
    return NextResponse.json(
      { error: 'Failed to register/update user' },
      { status: 500 }
    )
  }
}

async function handleSendFriendRequest(fromUserIdentifier, toUsername) {
  console.log('📤 Sending friend request:', { fromUserIdentifier, toUsername })
  
  try {
    const { db } = await connectToDatabase()
    
    // Find the target user by username in MongoDB
    const targetUser = await db.collection('users').findOne({
      username: { $regex: new RegExp(`^${toUsername}$`, 'i') } // Case-insensitive match
    })
    
    let toUserIdentifier = null
    if (targetUser) {
      toUserIdentifier = targetUser.userIdentifier
      console.log('✅ Found target user in database:', { toUsername, toUserIdentifier })
    } else {
      // If user not found, create a mock user identifier for demo purposes
      toUserIdentifier = `mock_user_${toUsername.toLowerCase()}_${Date.now()}`
      console.log('🔍 Created mock user for demo:', { toUsername, toUserIdentifier })
    }
  } catch (error) {
    console.error('❌ Error finding target user:', error)
    // Fallback to mock user
    toUserIdentifier = `mock_user_${toUsername.toLowerCase()}_${Date.now()}`
  }
  
  // Check if already friends or request exists
  const fromUserRequests = mockFriendRequests.get(fromUserIdentifier) || { sent: [], received: [] }
  const toUserRequests = mockFriendRequests.get(toUserIdentifier) || { sent: [], received: [] }
  
  // Check if request already sent
  const existingSentRequest = fromUserRequests.sent.find(r => r.toUsername.toLowerCase() === toUsername.toLowerCase())
  if (existingSentRequest) {
    return NextResponse.json(
      { error: 'Friend request already sent to this user' },
      { status: 400 }
    )
  }
  
  // Check if they're already friends
  const fromUserFriends = mockFriends.get(fromUserIdentifier) || []
  const existingFriend = fromUserFriends.find(f => f.username.toLowerCase() === toUsername.toLowerCase())
  if (existingFriend) {
    return NextResponse.json(
      { error: 'This user is already your friend' },
      { status: 400 }
    )
  }
  
  // Create the friend request
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const timestamp = new Date().toISOString()
  
  // Get sender's username (for demo, extract from identifier or use placeholder)
  const fromUsername = `User_${fromUserIdentifier.slice(-4)}`
  
  const sentRequest = {
    id: requestId,
    toUsername: toUsername,
    toUserIdentifier: toUserIdentifier,
    sentAt: timestamp,
    status: 'pending'
  }
  
  const receivedRequest = {
    id: requestId,
    fromUsername: fromUsername,
    fromUserIdentifier: fromUserIdentifier,
    receivedAt: timestamp,
    status: 'pending'
  }
  
  // Add to sender's sent requests
  fromUserRequests.sent.push(sentRequest)
  mockFriendRequests.set(fromUserIdentifier, fromUserRequests)
  
  // Add to receiver's received requests
  toUserRequests.received.push(receivedRequest)
  mockFriendRequests.set(toUserIdentifier, toUserRequests)
  
  console.log('✅ Friend request sent successfully')
  console.log('📤 Sender requests:', fromUserRequests)
  console.log('📥 Receiver requests:', toUserRequests)
  
  return NextResponse.json({
    success: true,
    message: `Friend request sent to ${toUsername}`,
    request: sentRequest
  })
}

async function handleAcceptFriendRequest(userIdentifier, requestId) {
  console.log('✅ Accepting friend request:', { userIdentifier, requestId })
  
  const userRequests = mockFriendRequests.get(userIdentifier) || { sent: [], received: [] }
  const requestIndex = userRequests.received.findIndex(r => r.id === requestId)
  
  if (requestIndex === -1) {
    return NextResponse.json(
      { error: 'Friend request not found' },
      { status: 404 }
    )
  }
  
  const request = userRequests.received[requestIndex]
  const fromUserIdentifier = request.fromUserIdentifier
  const fromUsername = request.fromUsername
  
  // Remove from received requests
  userRequests.received.splice(requestIndex, 1)
  mockFriendRequests.set(userIdentifier, userRequests)
  
  // Remove from sender's sent requests
  const senderRequests = mockFriendRequests.get(fromUserIdentifier) || { sent: [], received: [] }
  const senderRequestIndex = senderRequests.sent.findIndex(r => r.id === requestId)
  if (senderRequestIndex !== -1) {
    senderRequests.sent.splice(senderRequestIndex, 1)
    mockFriendRequests.set(fromUserIdentifier, senderRequests)
  }
  
  // Add to both users' friends lists
  const currentUserFriends = mockFriends.get(userIdentifier) || []
  const senderFriends = mockFriends.get(fromUserIdentifier) || []
  
  const currentUsername = `User_${userIdentifier.slice(-4)}`
  
  const newFriendForCurrentUser = {
    id: fromUserIdentifier,
    username: fromUsername,
    status: 'accepted',
    addedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    isOnline: Math.random() > 0.5
  }
  
  const newFriendForSender = {
    id: userIdentifier,
    username: currentUsername,
    status: 'accepted',
    addedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    isOnline: true
  }
  
  currentUserFriends.push(newFriendForCurrentUser)
  senderFriends.push(newFriendForSender)
  
  mockFriends.set(userIdentifier, currentUserFriends)
  mockFriends.set(fromUserIdentifier, senderFriends)
  
  console.log('✅ Friend request accepted, both users are now friends')
  
  return NextResponse.json({
    success: true,
    message: `You and ${fromUsername} are now friends!`,
    friend: newFriendForCurrentUser
  })
}

async function handleDeclineFriendRequest(userIdentifier, requestId) {
  console.log('❌ Declining friend request:', { userIdentifier, requestId })
  
  const userRequests = mockFriendRequests.get(userIdentifier) || { sent: [], received: [] }
  const requestIndex = userRequests.received.findIndex(r => r.id === requestId)
  
  if (requestIndex === -1) {
    return NextResponse.json(
      { error: 'Friend request not found' },
      { status: 404 }
    )
  }
  
  const request = userRequests.received[requestIndex]
  const fromUserIdentifier = request.fromUserIdentifier
  
  // Remove from received requests
  userRequests.received.splice(requestIndex, 1)
  mockFriendRequests.set(userIdentifier, userRequests)
  
  // Remove from sender's sent requests
  const senderRequests = mockFriendRequests.get(fromUserIdentifier) || { sent: [], received: [] }
  const senderRequestIndex = senderRequests.sent.findIndex(r => r.id === requestId)
  if (senderRequestIndex !== -1) {
    senderRequests.sent.splice(senderRequestIndex, 1)
    mockFriendRequests.set(fromUserIdentifier, senderRequests)
  }
  
  return NextResponse.json({
    success: true,
    message: 'Friend request declined'
  })
}

async function handleCancelFriendRequest(userIdentifier, requestId) {
  console.log('🚫 Canceling friend request:', { userIdentifier, requestId })
  
  const userRequests = mockFriendRequests.get(userIdentifier) || { sent: [], received: [] }
  const requestIndex = userRequests.sent.findIndex(r => r.id === requestId)
  
  if (requestIndex === -1) {
    return NextResponse.json(
      { error: 'Friend request not found' },
      { status: 404 }
    )
  }
  
  const request = userRequests.sent[requestIndex]
  const toUserIdentifier = request.toUserIdentifier
  
  // Remove from sent requests
  userRequests.sent.splice(requestIndex, 1)
  mockFriendRequests.set(userIdentifier, userRequests)
  
  // Remove from receiver's received requests
  const receiverRequests = mockFriendRequests.get(toUserIdentifier) || { sent: [], received: [] }
  const receiverRequestIndex = receiverRequests.received.findIndex(r => r.id === requestId)
  if (receiverRequestIndex !== -1) {
    receiverRequests.received.splice(receiverRequestIndex, 1)
    mockFriendRequests.set(toUserIdentifier, receiverRequests)
  }
  
  return NextResponse.json({
    success: true,
    message: 'Friend request canceled'
  })
}

async function handleRemoveFriend(userIdentifier, friendIdentifier) {
  console.log('🗑️ Removing friend:', { userIdentifier, friendIdentifier })
  
  const userFriends = mockFriends.get(userIdentifier) || []
  const updatedUserFriends = userFriends.filter(f => f.id !== friendIdentifier)
  mockFriends.set(userIdentifier, updatedUserFriends)
  
  // Also remove from the friend's list
  const friendFriends = mockFriends.get(friendIdentifier) || []
  const updatedFriendFriends = friendFriends.filter(f => f.id !== userIdentifier)
  mockFriends.set(friendIdentifier, updatedFriendFriends)
  
  return NextResponse.json({
    success: true,
    message: 'Friend removed successfully'
  })
}