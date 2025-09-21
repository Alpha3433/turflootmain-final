import { NextResponse } from 'next/server'
import { FriendsSystem } from '../../../lib/friendsSystem.js'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-API-Server': 'TurfLoot-FriendsAPI-Advanced'
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Initialize collections on first load
let initialized = false
async function ensureInitialized() {
  if (!initialized) {
    await FriendsSystem.initializeCollections()
    initialized = true
  }
}

// GET handler for friends operations
export async function GET(request, { params }) {
  await ensureInitialized()
  const { slug } = params
  const url = new URL(request.url)
  
  console.log('🤝 FRIENDS-API GET:', slug, url.searchParams.toString())
  
  try {
    const action = slug[0] || 'list'
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders })
    }
    
    if (action === 'list') {
      const friends = await FriendsSystem.getFriendsList(userId)
      return NextResponse.json({
        friends,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'pending-requests') {
      const requests = await FriendsSystem.getPendingRequests(userId)
      return NextResponse.json({
        requests,
        count: requests.length,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'suggestions') {
      const limit = parseInt(url.searchParams.get('limit')) || 10
      const suggestions = await FriendsSystem.getFriendSuggestions(userId, limit)
      return NextResponse.json({
        suggestions,
        count: suggestions.length,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'search') {
      const query = url.searchParams.get('q') || ''
      const onlineOnly = url.searchParams.get('onlineOnly') === 'true'
      const showAll = url.searchParams.get('showAll') === 'true'
      
      // If showAll is true, return all available users regardless of query length
      if (!showAll && query.length < 2) {
        return NextResponse.json({
          users: [],
          message: 'Query must be at least 2 characters'
        }, { headers: corsHeaders })
      }
      
      const users = await FriendsSystem.searchUsers(showAll ? '' : query, userId, onlineOnly, showAll)
      return NextResponse.json({
        users,
        total: users.length,
        query,
        onlineOnly,
        showAll,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'online-status') {
      const friends = await FriendsSystem.getFriendsList(userId)
      const onlineFriends = friends.filter(friend => friend.online)
      
      return NextResponse.json({
        onlineFriends,
        totalFriends: friends.length,
        onlineCount: onlineFriends.length,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Friends API GET error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal error',
      code: error.code || 500
    }, { status: error.code || 500, headers: corsHeaders })
  }
}

// POST handler for friends operations
export async function POST(request, { params }) {
  await ensureInitialized()
  const { slug } = params
  
  console.log('🤝 FRIENDS-API POST:', slug)
  
  try {
    const body = await request.json()
    const action = slug[0] || 'send-request'
    
    if (action === 'send-request') {
      const { fromUserId, toUserId, fromUsername, toUsername } = body
      
      if (!fromUserId || !toUserId) {
        return NextResponse.json({ 
          error: 'fromUserId and toUserId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await FriendsSystem.sendFriendRequest(
        fromUserId, 
        toUserId, 
        fromUsername, 
        toUsername
      )
      
      return NextResponse.json({
        success: true,
        message: 'Friend request sent successfully',
        requestId: result.requestId,
        remaining: result.remaining,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'accept-request') {
      const { requestId, userId } = body
      
      if (!requestId || !userId) {
        return NextResponse.json({ 
          error: 'requestId and userId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await FriendsSystem.acceptFriendRequest(requestId, userId)
      
      return NextResponse.json({
        success: true,
        message: 'Friend request accepted',
        friendshipId: result.friendshipId,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'decline-request') {
      const { requestId, userId } = body
      
      if (!requestId || !userId) {
        return NextResponse.json({ 
          error: 'requestId and userId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      await FriendsSystem.declineFriendRequest(requestId, userId)
      
      return NextResponse.json({
        success: true,
        message: 'Friend request declined',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'block-user') {
      const { blockerId, blockedId, blockerUsername, blockedUsername } = body
      
      if (!blockerId || !blockedId) {
        return NextResponse.json({ 
          error: 'blockerId and blockedId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await FriendsSystem.blockUser(
        blockerId, 
        blockedId, 
        blockerUsername, 
        blockedUsername
      )
      
      return NextResponse.json({
        success: true,
        message: 'User blocked successfully',
        blockId: result.blockId,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'presence') {
      const subAction = slug[1] || 'online'
      const { userId } = body
      
      if (!userId) {
        return NextResponse.json({ 
          error: 'userId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      if (subAction === 'online') {
        FriendsSystem.setUserOnline(userId)
        return NextResponse.json({
          success: true,
          message: 'User set as online',
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
      
      if (subAction === 'offline') {
        FriendsSystem.setUserOffline(userId)
        return NextResponse.json({
          success: true,
          message: 'User set as offline',
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
    }
    
    // Legacy endpoints for backward compatibility
    if (action === 'notifications') {
      const subAction = slug[1] || 'count'
      
      if (subAction === 'count') {
        const { userId } = body
        if (!userId) {
          return NextResponse.json({ 
            error: 'userId required' 
          }, { status: 400, headers: corsHeaders })
        }
        
        const requests = await FriendsSystem.getPendingRequests(userId)
        return NextResponse.json({
          count: requests.length,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
      
      if (subAction === 'mark-read') {
        // No-op for now - notifications are handled by the requests system
        return NextResponse.json({
          success: true,
          message: 'Notifications marked as read',
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Friends API POST error:', error)
    
    if (error.code === 429) {
      return NextResponse.json({
        error: error.message,
        code: 429,
        resetIn: error.resetIn,
        timestamp: new Date().toISOString()
      }, { status: 429, headers: corsHeaders })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to process request',
      timestamp: new Date().toISOString()
    }, { status: 500, headers: corsHeaders })
  }
}