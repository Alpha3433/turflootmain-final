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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdentifier = searchParams.get('userIdentifier')
    const requestType = searchParams.get('type') // 'invites'
    
    console.log('🎯 Party GET request:', { userIdentifier, requestType })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json({
        success: true,
        invites: [],
        message: 'Please log in to see party invites'
      })
    }
    
    if (requestType === 'invites') {
      // Get party invites for this user
      const { db } = await connectToDatabase()
      
      const partyInvites = await db.collection('party_invites').find({
        toUserIdentifier: userIdentifier,
        status: 'pending'
      }).toArray()
      
      console.log('✅ Party invites retrieved:', partyInvites.length, 'invites')
      
      return NextResponse.json({
        success: true,
        invites: partyInvites,
        count: partyInvites.length
      })
    }
    
    return NextResponse.json({
      success: true,
      invites: [],
      count: 0
    })
    
  } catch (error) {
    console.error('❌ Error fetching party data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch party data' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { action, userIdentifier, partyData, invitedFriends, inviteId, partyId } = await request.json()
    
    console.log('🎯 Party API request:', { action, userIdentifier, partyData, invitedFriendsCount: invitedFriends?.length })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    switch (action) {
      case 'create_and_invite':
        return await handleCreatePartyAndInvite(userIdentifier, partyData, invitedFriends)
      
      case 'accept_invite':
        return await handleAcceptPartyInvite(userIdentifier, inviteId, partyId)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('❌ Error handling party request:', error)
    return NextResponse.json(
      { error: 'Failed to process party request' },
      { status: 500 }
    )
  }
}

async function handleCreatePartyAndInvite(userIdentifier, partyData, invitedFriends) {
  try {
    const { db } = await connectToDatabase()
    
    // Get user info with flexible lookup
    console.log('🔍 Debug: Looking for user with userIdentifier:', userIdentifier)
    
    // Try multiple lookup methods to find the user
    let user = await db.collection('users').findOne({ userIdentifier })
    let lookupMethod = 'userIdentifier'
    
    if (!user) {
      // Try looking up by email (if userIdentifier is an email)
      user = await db.collection('users').findOne({ email: userIdentifier })
      lookupMethod = 'email'
    }
    
    if (!user) {
      // Try looking up by wallet address (if userIdentifier is a wallet)
      user = await db.collection('users').findOne({ walletAddress: userIdentifier })
      lookupMethod = 'walletAddress'
    }
    
    if (!user) {
      // Try looking up by any field that matches the userIdentifier
      user = await db.collection('users').findOne({
        $or: [
          { userIdentifier: userIdentifier },
          { email: userIdentifier },
          { walletAddress: userIdentifier },
          { id: userIdentifier },
          { _id: userIdentifier }
        ]
      })
      lookupMethod = 'flexible'
    }
    
    console.log('🔍 Debug: User lookup result:', user ? `Found via ${lookupMethod}` : 'Not found')
    
    if (!user) {
      // Debug: Check what users exist in the database
      const sampleUsers = await db.collection('users').find().limit(3).toArray()
      console.log('🔍 Debug: Sample user documents:', sampleUsers.map(u => ({ 
        fields: Object.keys(u),
        userIdentifier: u.userIdentifier,
        email: u.email,
        walletAddress: u.walletAddress
      })))
      
      return NextResponse.json(
        { error: 'User not found in database. Check server logs for debugging info.' },
        { status: 404 }
      )
    }
    
    // Create party
    const partyId = `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()
    
    const party = {
      id: partyId,
      name: partyData.name,
      createdBy: userIdentifier,
      createdByUsername: user.username,
      privacy: partyData.privacy || 'public',
      maxPlayers: partyData.maxPlayers || 2,
      currentPlayers: [userIdentifier],
      status: 'waiting',
      createdAt: timestamp,
      invitedPlayers: invitedFriends.map(friend => friend.id)
    }
    
    // Store party in database
    await db.collection('parties').insertOne(party)
    
    // Send party invites to friends
    const invitePromises = invitedFriends.map(async (friend) => {
      const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const partyInvite = {
        id: inviteId,
        type: 'party_invite',
        partyId: partyId,
        partyName: partyData.name,
        fromUserIdentifier: userIdentifier,
        fromUsername: user.username,
        toUserIdentifier: friend.id,
        toUsername: friend.username,
        sentAt: timestamp,
        status: 'pending',
        privacy: partyData.privacy,
        maxPlayers: partyData.maxPlayers
      }
      
      // Store in party_invites collection (or reuse friend_requests with type field)
      await db.collection('party_invites').insertOne(partyInvite)
      
      console.log(`📤 Party invite sent to ${friend.username}`)
    })
    
    await Promise.all(invitePromises)
    
    console.log('✅ Party created and invites sent:', {
      partyId,
      partyName: partyData.name,
      invitesSent: invitedFriends.length
    })
    
    return NextResponse.json({
      success: true,
      message: `Party "${partyData.name}" created successfully`,
      party: {
        id: partyId,
        name: partyData.name,
        privacy: partyData.privacy,
        maxPlayers: partyData.maxPlayers,
        invitesSent: invitedFriends.length
      }
    })
    
  } catch (error) {
    console.error('❌ Error creating party and sending invites:', error)
    return NextResponse.json(
      { error: 'Failed to create party' },
      { status: 500 }
    )
  }
}

async function handleAcceptPartyInvite(userIdentifier, inviteId, partyId) {
  try {
    const { db } = await connectToDatabase()
    
    // Get user info
    const user = await db.collection('users').findOne({ userIdentifier })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Find and remove the party invite
    const invite = await db.collection('party_invites').findOne({
      id: inviteId,
      toUserIdentifier: userIdentifier,
      status: 'pending'
    })
    
    if (!invite) {
      return NextResponse.json(
        { error: 'Party invite not found' },
        { status: 404 }
      )
    }
    
    // Remove the invite
    await db.collection('party_invites').deleteOne({ id: inviteId })
    
    // Add user to the party
    await db.collection('parties').updateOne(
      { id: partyId },
      { $addToSet: { currentPlayers: userIdentifier } }
    )
    
    console.log('✅ Party invite accepted:', {
      userIdentifier,
      partyId,
      partyName: invite.partyName
    })
    
    return NextResponse.json({
      success: true,
      message: `Successfully joined party "${invite.partyName}"`,
      party: {
        id: partyId,
        name: invite.partyName
      }
    })
    
  } catch (error) {
    console.error('❌ Error accepting party invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept party invite' },
      { status: 500 }
    )
  }
}