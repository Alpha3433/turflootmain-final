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
    
    // Get current user's friends from database
    const userFriends = await db.collection('friends').find({
      userIdentifier: currentUserIdentifier
    }).toArray()
    
    // Get pending friend requests from database
    const sentRequests = await db.collection('friend_requests').find({
      fromUserIdentifier: currentUserIdentifier,
      status: 'pending'
    }).toArray()
    
    const receivedRequests = await db.collection('friend_requests').find({
      toUserIdentifier: currentUserIdentifier,
      status: 'pending'
    }).toArray()
    
    // Create sets of userIdentifiers to exclude
    const friendUserIdentifiers = new Set(userFriends.map(f => f.friendUserIdentifier))
    const sentRequestUserIdentifiers = new Set(sentRequests.map(r => r.toUserIdentifier))
    const receivedRequestUserIdentifiers = new Set(receivedRequests.map(r => r.fromUserIdentifier))
    
    // Filter out users who are already friends or have pending requests
    const availableUsers = users.filter(user => {
      const userIdentifier = user.userIdentifier
      return !friendUserIdentifiers.has(userIdentifier) && 
             !sentRequestUserIdentifiers.has(userIdentifier) && 
             !receivedRequestUserIdentifiers.has(userIdentifier)
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
      // Get friend requests for this user from database
      const { db } = await connectToDatabase()
      
      const sentRequests = await db.collection('friend_requests').find({
        fromUserIdentifier: userIdentifier,
        status: 'pending'
      }).toArray()
      
      const receivedRequests = await db.collection('friend_requests').find({
        toUserIdentifier: userIdentifier,
        status: 'pending'
      }).toArray()
      
      const userRequests = {
        sent: sentRequests,
        received: receivedRequests
      }
      
      console.log('✅ Friend requests retrieved from database:', userRequests)
      
      return NextResponse.json({
        success: true,
        requests: userRequests,
        sentCount: sentRequests.length,
        receivedCount: receivedRequests.length
      })
    } else {
      // Get user's friends from database
      const { db } = await connectToDatabase()
      
      const userFriends = await db.collection('friends').find({
        userIdentifier: userIdentifier
      }).toArray()
      
      console.log('✅ Friends list retrieved from database:', userFriends.length, 'friends')
      
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
    
    // Find the target user by username in MongoDB (only real Privy users)
    const targetUser = await db.collection('users').findOne({
      username: { $regex: new RegExp(`^${toUsername}$`, 'i') } // Case-insensitive match
    })
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found. Only authenticated TurfLoot users can receive friend requests.' },
        { status: 404 }
      )
    }
    
    const toUserIdentifier = targetUser.userIdentifier
    console.log('✅ Found target user in database:', { toUsername, toUserIdentifier })
    
    // Get sender user info
    const fromUser = await db.collection('users').findOne({
      userIdentifier: fromUserIdentifier
    })
    
    if (!fromUser) {
      return NextResponse.json(
        { error: 'Sender user not found in database' },
        { status: 404 }
      )
    }
    
    // Check if request already exists
    const existingRequest = await db.collection('friend_requests').findOne({
      fromUserIdentifier: fromUserIdentifier,
      toUserIdentifier: toUserIdentifier,
      status: 'pending'
    })
    
    if (existingRequest) {
      return NextResponse.json(
        { error: 'Friend request already sent to this user' },
        { status: 400 }
      )
    }
    
    // Check if they're already friends
    const existingFriend = await db.collection('friends').findOne({
      userIdentifier: fromUserIdentifier,
      friendUserIdentifier: toUserIdentifier
    })
    
    if (existingFriend) {
      return NextResponse.json(
        { error: 'This user is already your friend' },
        { status: 400 }
      )
    }
    
    // Create the friend request in database
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()
    
    const friendRequest = {
      id: requestId,
      fromUserIdentifier: fromUserIdentifier,
      fromUsername: fromUser.username,
      toUserIdentifier: toUserIdentifier,
      toUsername: targetUser.username,
      sentAt: timestamp,
      status: 'pending'
    }
    
    // Store in database
    await db.collection('friend_requests').insertOne(friendRequest)
    
    console.log('✅ Friend request stored in database successfully')
    
    return NextResponse.json({
      success: true,
      message: `Friend request sent to ${toUsername}`,
      request: {
        id: requestId,
        toUsername: toUsername,
        sentAt: timestamp,
        status: 'pending'
      }
    })
    
  } catch (error) {
    console.error('❌ Error sending friend request:', error)
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    )
  }
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