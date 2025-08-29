import { NextResponse } from 'next/server'
import { FriendsSystem } from '../../../lib/friendsSystem.js'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-API-Server': 'TurfLoot-FriendsAPI-Bypass'
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// GET handler for friends operations
export async function GET(request, { params }) {
  const { slug } = params
  const url = new URL(request.url)
  
  console.log('🤝 FRIENDS-API GET:', slug, url.searchParams.toString())
  
  try {
    const action = slug[0] || 'list'
    
    if (action === 'list') {
      const userId = url.searchParams.get('userId')
      
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders })
      }
      
      const db = await getDb()
      const friendships = db.collection('friendships')
      
      // Get all friendships for this user
      const userFriendships = await friendships.find({
        $or: [
          { fromUserId: userId, status: 'accepted' },
          { toUserId: userId, status: 'accepted' }
        ]
      }).toArray()
      
      const friends = userFriendships.map(friendship => ({
        id: friendship.fromUserId === userId ? friendship.toUserId : friendship.fromUserId,
        username: friendship.fromUserId === userId ? friendship.toUsername : friendship.fromUsername,
        online: false, // Default to offline for bypass
        lastSeen: friendship.updatedAt || new Date().toISOString()
      }))
      
      return NextResponse.json({
        friends,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'online-status') {
      const userId = url.searchParams.get('userId')
      
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders })
      }
      
      // Return empty online friends for bypass (real-time status would need WebSocket)
      return NextResponse.json({
        onlineFriends: [],
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Friends API GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders })
  }
}

// POST handler for friends operations
export async function POST(request, { params }) {
  const { slug } = params
  
  console.log('🤝 FRIENDS-API POST:', slug)
  
  try {
    const body = await request.json()
    const action = slug[0] || 'send-request'
    
    if (action === 'send-request') {
      const { fromUserId, toUserId } = body
      
      if (!fromUserId || !toUserId) {
        return NextResponse.json({ error: 'fromUserId and toUserId required' }, { status: 400, headers: corsHeaders })
      }
      
      if (fromUserId === toUserId) {
        return NextResponse.json({ error: 'Cannot add yourself as friend' }, { status: 400, headers: corsHeaders })
      }
      
      const db = await getDb()
      const friendships = db.collection('friendships')
      
      // Check for existing friendship
      const existing = await friendships.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId }
        ]
      })
      
      if (existing) {
        return NextResponse.json({ error: 'Friendship already exists' }, { status: 400, headers: corsHeaders })
      }
      
      // Create new friendship (auto-accept for bypass simplicity)
      const friendshipId = 'friendship_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      
      await friendships.insertOne({
        id: friendshipId,
        fromUserId,
        toUserId,
        fromUsername: body.fromUsername || 'User',
        toUsername: body.toUsername || 'User',
        status: 'accepted', // Auto-accept for bypass
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      console.log('✅ Friends API bypass - friend request sent (auto-accepted)')
      
      return NextResponse.json({
        success: true,
        message: 'Friend request sent successfully via bypass route',
        requestId: friendshipId,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'notifications') {
      const subAction = slug[1] || 'count'
      
      if (subAction === 'count') {
        // Return 0 notifications for bypass
        return NextResponse.json({
          count: 0,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
      
      if (subAction === 'mark-read') {
        // Mark as read (no-op for bypass)
        return NextResponse.json({
          success: true,
          message: 'Notifications marked as read via bypass route',
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Friends API POST error:', error)
    return NextResponse.json({ error: 'Failed to process friend request' }, { status: 500, headers: corsHeaders })
  }
}