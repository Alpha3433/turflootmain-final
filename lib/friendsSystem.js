// Advanced Friends System with Redis, Rate Limiting, and Socket Events
import { MongoClient } from 'mongodb'

// MongoDB connection
let client = null
let db = null

async function getDb() {
  if (db) return db
  
  try {
    if (!client) {
      client = new MongoClient(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 20
      })
      await client.connect()
    }
    
    db = client.db(process.env.DB_NAME || 'turfloot_db')
    return db
  } catch (error) {
    console.error('❌ Database connection error:', error)
    throw error
  }
}

// Redis connection (mock implementation for now - can be replaced with real Redis)
class RedisManager {
  constructor() {
    this.presenceSet = new Map() // userId -> { online: boolean, lastSeen: timestamp }
    this.suggestionsCache = new Map() // userId -> [suggested userIds]
    this.rateLimitCache = new Map() // userId -> { count: number, resetTime: timestamp }
  }

  // Presence management
  setUserOnline(userId) {
    this.presenceSet.set(userId, { online: true, lastSeen: Date.now() })
    console.log(`🟢 User ${userId} is now online`)
  }

  setUserOffline(userId) {
    const existing = this.presenceSet.get(userId) || {}
    this.presenceSet.set(userId, { ...existing, online: false, lastSeen: Date.now() })
    console.log(`🔴 User ${userId} is now offline`)
  }

  isUserOnline(userId) {
    const presence = this.presenceSet.get(userId)
    return presence?.online || false
  }

  getOnlineUsers() {
    const online = []
    for (const [userId, presence] of this.presenceSet.entries()) {
      if (presence.online) {
        online.push(userId)
      }
    }
    return online
  }

  // Suggestions caching
  setSuggestions(userId, suggestions) {
    this.suggestionsCache.set(userId, suggestions)
    // Auto-expire after 5 minutes
    setTimeout(() => {
      this.suggestionsCache.delete(userId)
    }, 5 * 60 * 1000)
  }

  getSuggestions(userId) {
    return this.suggestionsCache.get(userId) || null
  }

  // Rate limiting
  checkRateLimit(userId) {
    const now = Date.now()
    const hourMs = 60 * 60 * 1000
    const limit = this.rateLimitCache.get(userId)

    if (!limit) {
      this.rateLimitCache.set(userId, { count: 1, resetTime: now + hourMs })
      return { allowed: true, remaining: 9 }
    }

    if (now > limit.resetTime) {
      // Reset the limit
      this.rateLimitCache.set(userId, { count: 1, resetTime: now + hourMs })
      return { allowed: true, remaining: 9 }
    }

    if (limit.count >= 10) {
      return { allowed: false, remaining: 0, resetIn: limit.resetTime - now }
    }

    limit.count++
    return { allowed: true, remaining: 10 - limit.count }
  }
}

// Global Redis instance
const redis = new RedisManager()

// Socket events manager (mock implementation)
class SocketManager {
  static emit(userId, event, data) {
    console.log(`🔌 Socket emit to ${userId}: ${event}`, data)
    // In real implementation, this would emit to actual WebSocket connections
  }

  static emitToMultiple(userIds, event, data) {
    userIds.forEach(userId => {
      this.emit(userId, event, data)
    })
  }
}

export class FriendsSystem {
  static async initializeCollections() {
    const db = await getDb()
    
    // Create indexes for performance  
    await db.collection('friendships').createIndex({ fromUserId: 1, toUserId: 1 }, { unique: true })
    await db.collection('friendships').createIndex({ toUserId: 1, status: 1 })
    await db.collection('friend_requests').createIndex({ fromUserId: 1, toUserId: 1 }, { unique: true })
    await db.collection('friend_requests').createIndex({ toUserId: 1, status: 1 })
    await db.collection('blocked_users').createIndex({ blockerId: 1, blockedId: 1 }, { unique: true })
    await db.collection('users').createIndex({ username: 1 })
    
    console.log('✅ Friends system collections initialized')
  }

  // 1. Send Friend Request
  static async sendFriendRequest(fromUserId, toUserId, fromUsername, toUsername) {
    const db = await getDb()

    // Validate input
    if (!fromUserId || !toUserId) {
      throw new Error('fromUserId and toUserId are required')
    }

    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself')
    }

    // Rate limiting check
    const rateLimit = redis.checkRateLimit(fromUserId)
    if (!rateLimit.allowed) {
      const error = new Error('Rate limit exceeded. Too many friend requests.')
      error.code = 429
      error.resetIn = rateLimit.resetIn
      throw error
    }

    // Check if blocked
    const isBlocked = await db.collection('blocked_users').findOne({
      $or: [
        { blockerId: fromUserId, blockedId: toUserId },
        { blockerId: toUserId, blockedId: fromUserId }
      ]
    })

    if (isBlocked) {
      throw new Error('Cannot send friend request to blocked user')
    }

    // Check if already friends
    const existingFriendship = await db.collection('friendships').findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId }
      ]
    })

    if (existingFriendship) {
      throw new Error('Users are already friends')
    }

    // Check for duplicate pending request
    const existingRequest = await db.collection('friend_requests').findOne({
      $or: [
        { fromUserId, toUserId, status: 'pending' },
        { fromUserId: toUserId, toUserId: fromUserId, status: 'pending' }
      ]
    })

    if (existingRequest) {
      throw new Error('Friend request already pending')
    }

    // Create friend request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const request = {
      id: requestId,
      fromUserId,
      toUserId,
      fromUsername: fromUsername || 'Unknown',
      toUsername: toUsername || 'Unknown',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('friend_requests').insertOne(request)

    // Emit socket event
    SocketManager.emit(toUserId, 'friend_request_incoming', {
      requestId,
      fromUserId,
      fromUsername: request.fromUsername
    })

    console.log(`✅ Friend request sent: ${fromUserId} → ${toUserId}`)
    return { success: true, requestId, remaining: rateLimit.remaining }
  }

  // 2. Accept Friend Request
  static async acceptFriendRequest(requestId, userId) {
    const db = await getDb()

    // Find the request
    const request = await db.collection('friend_requests').findOne({
      id: requestId,
      toUserId: userId,
      status: 'pending'
    })

    if (!request) {
      throw new Error('Friend request not found or already processed')
    }

    // Start transaction-like operation
    const friendshipId = `friendship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create friendship
    const friendship = {
      id: friendshipId,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      fromUsername: request.fromUsername,
      toUsername: request.toUsername,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('friendships').insertOne(friendship)

    // Update request status
    await db.collection('friend_requests').updateOne(
      { id: requestId },
      { 
        $set: { 
          status: 'accepted', 
          updatedAt: new Date().toISOString() 
        } 
      }
    )

    // Close any cross-requests (if B also sent request to A)
    await db.collection('friend_requests').updateMany(
      {
        fromUserId: request.toUserId,
        toUserId: request.fromUserId,
        status: 'pending'
      },
      {
        $set: {
          status: 'auto_closed',
          updatedAt: new Date().toISOString()
        }
      }
    )

    // Emit socket events
    SocketManager.emit(request.fromUserId, 'friend_request_accepted', {
      userId: request.toUserId,
      username: request.toUsername
    })
    
    SocketManager.emit(request.toUserId, 'friend_added', {
      userId: request.fromUserId,
      username: request.fromUsername
    })

    console.log(`✅ Friend request accepted: ${request.fromUserId} ↔ ${request.toUserId}`)
    return { success: true, friendshipId }
  }

  // 3. Decline Friend Request
  static async declineFriendRequest(requestId, userId) {
    const db = await getDb()

    const result = await db.collection('friend_requests').updateOne(
      {
        id: requestId,
        toUserId: userId,
        status: 'pending'
      },
      {
        $set: {
          status: 'declined',
          updatedAt: new Date().toISOString()
        }
      }
    )

    if (result.matchedCount === 0) {
      throw new Error('Friend request not found or already processed')
    }

    const request = await db.collection('friend_requests').findOne({ id: requestId })
    
    // Emit socket event
    SocketManager.emit(request.fromUserId, 'friend_request_declined', {
      userId: request.toUserId,
      username: request.toUsername
    })

    console.log(`❌ Friend request declined: ${requestId}`)
    return { success: true }
  }

  // 4. Block User
  static async blockUser(blockerId, blockedId, blockerUsername, blockedUsername) {
    const db = await getDb()

    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself')
    }

    // Remove existing friendship if any
    await db.collection('friendships').deleteMany({
      $or: [
        { fromUserId: blockerId, toUserId: blockedId },
        { fromUserId: blockedId, toUserId: blockerId }
      ]
    })

    // Cancel any pending requests
    await db.collection('friend_requests').updateMany(
      {
        $or: [
          { fromUserId: blockerId, toUserId: blockedId },
          { fromUserId: blockedId, toUserId: blockerId }
        ],
        status: 'pending'
      },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        }
      }
    )

    // Create block record
    const blockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await db.collection('blocked_users').insertOne({
      id: blockId,
      blockerId,
      blockedId,
      blockerUsername: blockerUsername || 'Unknown',
      blockedUsername: blockedUsername || 'Unknown',
      createdAt: new Date().toISOString()
    })

    // Emit socket events
    SocketManager.emit(blockedId, 'user_blocked_you', {
      userId: blockerId,
      username: blockerUsername
    })

    SocketManager.emit(blockerId, 'user_blocked', {
      userId: blockedId,
      username: blockedUsername
    })

    console.log(`🚫 User blocked: ${blockerId} blocked ${blockedId}`)
    return { success: true, blockId }
  }

  // 5. Get Friends List
  static async getFriendsList(userId) {
    const db = await getDb()

    const friendships = await db.collection('friendships').find({
      $or: [
        { fromUserId: userId },
        { toUserId: userId }
      ],
      status: 'active'
    }).toArray()

    const friends = friendships.map(friendship => {
      const friendId = friendship.fromUserId === userId ? friendship.toUserId : friendship.fromUserId
      const friendUsername = friendship.fromUserId === userId ? friendship.toUsername : friendship.fromUsername
      
      return {
        id: friendId,
        username: friendUsername,
        online: redis.isUserOnline(friendId),
        lastSeen: friendship.updatedAt,
        friendshipId: friendship.id
      }
    })

    return friends
  }

  // 6. Advanced User Search
  static async searchUsers(query, currentUserId, onlineOnly = false) {
    const db = await getDb()

    if (!query || query.length < 2) {
      return []
    }

    // Get user's relationships to filter out
    const [friends, blocks, pendingRequests] = await Promise.all([
      db.collection('friendships').find({
        $or: [
          { fromUserId: currentUserId },
          { toUserId: currentUserId }
        ],
        status: 'active'
      }).toArray(),

      db.collection('blocked_users').find({
        $or: [
          { blockerId: currentUserId },
          { blockedId: currentUserId }
        ]
      }).toArray(),

      db.collection('friend_requests').find({
        $or: [
          { fromUserId: currentUserId, status: 'pending' },
          { toUserId: currentUserId, status: 'pending' }
        ]
      }).toArray()
    ])

    // Create exclusion sets
    const excludeIds = new Set([currentUserId])
    
    friends.forEach(f => {
      excludeIds.add(f.fromUserId === currentUserId ? f.toUserId : f.fromUserId)
    })
    
    blocks.forEach(b => {
      excludeIds.add(b.blockerId === currentUserId ? b.blockedId : b.blockerId)
    })
    
    pendingRequests.forEach(r => {
      excludeIds.add(r.fromUserId === currentUserId ? r.toUserId : r.fromUserId)
    })

    // Build search query
    const searchQuery = {
      username: { $regex: query, $options: 'i' },
      id: { $nin: Array.from(excludeIds) }
    }

    let users = await db.collection('users').find(searchQuery).limit(20).toArray()

    // Filter by online status if requested
    if (onlineOnly) {
      users = users.filter(user => redis.isUserOnline(user.id))
    }

    return users.map(user => ({
      id: user.id,
      username: user.username,
      online: redis.isUserOnline(user.id),
      canSendRequest: true
    }))
  }

  // 7. Friend Suggestions
  static async getFriendSuggestions(userId, limit = 10) {
    // Check Redis cache first
    const cached = redis.getSuggestions(userId)
    if (cached) {
      console.log('📦 Returning cached suggestions')
      return cached
    }

    const db = await getDb()

    // Complex suggestion algorithm (simplified for this example)
    const suggestions = await db.collection('users')
      .aggregate([
        { $match: { id: { $ne: userId } } },
        { $sample: { size: limit * 2 } } // Get more than needed for filtering
      ])
      .toArray()

    // Filter out existing relationships (same as search)
    const filtered = await this.searchUsers('', userId)
    const suggestionIds = new Set(suggestions.map(s => s.id))
    const availableUsers = filtered.filter(user => suggestionIds.has(user.id))

    const result = availableUsers.slice(0, limit)
    
    // Cache the results
    redis.setSuggestions(userId, result)
    
    return result
  }

  // 8. Get Pending Requests
  static async getPendingRequests(userId) {
    const db = await getDb()

    const requests = await db.collection('friend_requests').find({
      toUserId: userId,
      status: 'pending'
    }).sort({ createdAt: -1 }).toArray()

    return requests.map(req => ({
      id: req.id,
      fromUserId: req.fromUserId,
      fromUsername: req.fromUsername,
      createdAt: req.createdAt
    }))
  }

  // 9. Presence Management
  static setUserOnline(userId) {
    redis.setUserOnline(userId)
    SocketManager.emit(userId, 'presence_updated', { online: true })
  }

  static setUserOffline(userId) {
    redis.setUserOffline(userId)
    SocketManager.emit(userId, 'presence_updated', { online: false })
  }

  static getOnlineUsers() {
    return redis.getOnlineUsers()
  }
}

export { redis as RedisManager, SocketManager }