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
    
    if (requestType === 'public') {
      // Get all public parties that are waiting for players - no auth required
      const { db } = await connectToDatabase()
      
      const publicParties = await db.collection('parties').find({
        privacy: 'public',
        status: 'waiting'
      }).toArray()
      
      // Filter parties that aren't full (client-side filtering)
      const availableParties = publicParties.filter(party => 
        Array.isArray(party.currentPlayers) && 
        party.currentPlayers.length < (party.maxPlayers || 2)
      )
      
      // Get party details with member information
      const partiesWithDetails = await Promise.all(
        availableParties.map(async (party) => {
          // Get member details
          const memberUsers = await db.collection('users').find({
            userIdentifier: { $in: party.currentPlayers }
          }).toArray()
          
          return {
            id: party.id,
            name: party.name,
            privacy: party.privacy,
            maxPlayers: party.maxPlayers,
            currentPlayerCount: party.currentPlayers.length,
            createdBy: party.createdBy,
            createdByUsername: party.createdByUsername,
            createdAt: party.createdAt,
            members: memberUsers.map(member => ({
              userIdentifier: member.userIdentifier,
              username: member.username || member.displayName || 'Unknown User',
              isOnline: member.isOnline || false,
              equippedSkin: member.equippedSkin || {
                type: 'circle',
                color: '#3b82f6',
                pattern: 'solid'
              }
            }))
          }
        })
      )
      
      console.log('✅ Public parties retrieved:', partiesWithDetails.length, 'parties')
      
      return NextResponse.json({
        success: true,
        parties: partiesWithDetails,
        count: partiesWithDetails.length
      })
    }
    
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
    
    if (requestType === 'current') {
      // Get user's current party
      const { db } = await connectToDatabase()
      
      const currentParty = await db.collection('parties').findOne({
        currentPlayers: userIdentifier,
        status: { $ne: 'finished' }
      })
      
      if (currentParty) {
        // Get party member details
        const memberUsers = await db.collection('users').find({
          userIdentifier: { $in: currentParty.currentPlayers }
        }).toArray()
        
        const partyWithMembers = {
          ...currentParty,
          members: memberUsers.map(member => ({
            userIdentifier: member.userIdentifier,
            username: member.username || member.displayName || 'Unknown User',
            isOnline: member.isOnline || false,
            equippedSkin: member.equippedSkin || {
              type: 'circle',
              color: '#3b82f6',
              pattern: 'solid'
            }
          }))
        }
        
        console.log('✅ Current party retrieved:', {
          partyId: currentParty.id,
          partyName: currentParty.name,
          memberCount: currentParty.currentPlayers.length
        })
        
        return NextResponse.json({
          success: true,
          party: partyWithMembers
        })
      } else {
        console.log('ℹ️ No current party found for user')
        return NextResponse.json({
          success: true,
          party: null
        })
      }
    }
    
    if (requestType === 'friends') {
      // Get private parties from friends (parties where user was invited or could join)
      const { db } = await connectToDatabase()
      
      // First, get user's friends list
      const userFriends = await db.collection('friends').find({
        $or: [
          { userIdentifier, status: 'accepted' },
          { friendIdentifier: userIdentifier, status: 'accepted' }
        ]
      }).toArray()
      
      // Extract friend identifiers
      const friendIds = userFriends.map(friendship => 
        friendship.userIdentifier === userIdentifier 
          ? friendship.friendIdentifier 
          : friendship.userIdentifier
      )
      
      // Get private parties created by friends
      const friendsParties = await db.collection('parties').find({
        privacy: 'private',
        status: 'waiting',
        createdBy: { $in: friendIds },
        currentPlayers: { $exists: true, $type: 'array' },
        $expr: { $lt: [{ $size: "$currentPlayers" }, "$maxPlayers"] } // Party not full
      }).toArray()
      
      // Get party details with member information
      const partiesWithDetails = await Promise.all(
        friendsParties.map(async (party) => {
          // Get member details
          const memberUsers = await db.collection('users').find({
            userIdentifier: { $in: party.currentPlayers }
          }).toArray()
          
          return {
            id: party.id,
            name: party.name,
            privacy: party.privacy,
            maxPlayers: party.maxPlayers,
            currentPlayerCount: party.currentPlayers.length,
            createdBy: party.createdBy,
            createdByUsername: party.createdByUsername,
            createdAt: party.createdAt,
            members: memberUsers.map(member => ({
              userIdentifier: member.userIdentifier,
              username: member.username || member.displayName || 'Unknown User',
              isOnline: member.isOnline || false,
              equippedSkin: member.equippedSkin || {
                type: 'circle',
                color: '#3b82f6',
                pattern: 'solid'
              }
            }))
          }
        })
      )
      
      console.log('✅ Friends parties retrieved:', partiesWithDetails.length, 'parties')
      
      return NextResponse.json({
        success: true,
        parties: partiesWithDetails,
        count: partiesWithDetails.length
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
    
    // Allow cleanup without authentication for admin tasks
    if (action === 'cleanup_test_parties') {
      return await handleCleanupTestParties()
    }
    
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
      
      case 'join_party':
        return await handleJoinParty(userIdentifier, partyId)
      
      case 'cleanup_test_parties':
        return await handleCleanupTestParties()
      
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
      console.log('🔍 Debug: Processing friend invite for:', friend)
      
      // Validate friend exists in database
      let friendUser = await db.collection('users').findOne({ userIdentifier: friend.id })
      
      if (!friendUser) {
        // Try flexible lookup for friend as well
        friendUser = await db.collection('users').findOne({
          $or: [
            { userIdentifier: friend.id },
            { email: friend.id },
            { walletAddress: friend.id }
          ]
        })
      }
      
      if (!friendUser) {
        console.log(`⚠️ Warning: Friend ${friend.username} (${friend.id}) not found in database, skipping invite`)
        return
      }
      
      const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const partyInvite = {
        id: inviteId,
        type: 'party_invite',
        partyId: partyId,
        partyName: partyData.name,
        fromUserIdentifier: userIdentifier,
        fromUsername: user.username || user.displayName || 'Unknown User',
        toUserIdentifier: friend.id,
        toUsername: friend.username || friendUser.username || friendUser.displayName || 'Unknown Friend',
        sentAt: timestamp,
        status: 'pending',
        privacy: partyData.privacy,
        maxPlayers: partyData.maxPlayers
      }
      
      // Store in party_invites collection
      await db.collection('party_invites').insertOne(partyInvite)
      
      console.log(`📤 Party invite sent to ${friend.username} (${friend.id})`)
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

export async function DELETE(request) {
  try {
    const { userIdentifier, partyId } = await request.json()
    
    console.log('🚪 Party LEAVE request:', { userIdentifier, partyId })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    if (!partyId) {
      return NextResponse.json(
        { error: 'Party ID required' },
        { status: 400 }
      )
    }
    
    const { db } = await connectToDatabase()
    
    // Find the party
    const party = await db.collection('parties').findOne({ id: partyId })
    
    if (!party) {
      return NextResponse.json(
        { error: 'Party not found' },
        { status: 404 }
      )
    }
    
    // Check if user is in the party
    if (!party.currentPlayers.includes(userIdentifier)) {
      return NextResponse.json(
        { error: 'User not in this party' },
        { status: 400 }
      )
    }
    
    // Remove user from party
    await db.collection('parties').updateOne(
      { id: partyId },
      { $pull: { currentPlayers: userIdentifier } }
    )
    
    // Check if party is now empty
    const updatedParty = await db.collection('parties').findOne({ id: partyId })
    
    if (updatedParty.currentPlayers.length === 0) {
      // If party is empty, mark it as finished or delete it
      await db.collection('parties').updateOne(
        { id: partyId },
        { $set: { status: 'finished', finishedAt: new Date().toISOString() } }
      )
      console.log('🏁 Party marked as finished - no remaining members')
    }
    
    console.log('✅ User successfully left party:', {
      userIdentifier,
      partyId,
      partyName: party.name,
      remainingMembers: updatedParty.currentPlayers.length
    })
    
    return NextResponse.json({
      success: true,
      message: `Successfully left party "${party.name}"`,
      remainingMembers: updatedParty.currentPlayers.length
    })
    
  } catch (error) {
    console.error('❌ Error leaving party:', error)
    return NextResponse.json(
      { error: 'Failed to leave party' },
      { status: 500 }
    )
  }
}

async function handleCleanupTestParties() {
  try {
    const { db } = await connectToDatabase()
    
    // Remove test parties by name patterns
    const testPartyPatterns = [
      /test.*party/i,
      /dynamic.*display/i,
      /skin.*avatar.*test/i,
      /avatar.*display/i,
      /test.*user.*lookup/i
    ]
    
    const testPartyQuery = {
      $or: testPartyPatterns.map(pattern => ({ name: { $regex: pattern } }))
    }
    
    // Find test parties first to log what we're removing
    const testParties = await db.collection('parties').find(testPartyQuery).toArray()
    console.log('🧹 Found test parties to remove:', testParties.map(p => ({ id: p.id, name: p.name })))
    
    // Remove test parties
    const deleteResult = await db.collection('parties').deleteMany(testPartyQuery)
    
    // Also remove any related party invites for these parties
    const partyIds = testParties.map(p => p.id)
    if (partyIds.length > 0) {
      const inviteDeleteResult = await db.collection('party_invites').deleteMany({
        partyId: { $in: partyIds }
      })
      console.log('🧹 Removed related party invites:', inviteDeleteResult.deletedCount)
    }
    
    console.log('✅ Test party cleanup completed:', {
      partiesRemoved: deleteResult.deletedCount,
      invitesRemoved: partyIds.length > 0 ? await db.collection('party_invites').countDocuments({ partyId: { $in: partyIds } }) : 0
    })
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${deleteResult.deletedCount} test parties removed`,
      partiesRemoved: deleteResult.deletedCount
    })
    
  } catch (error) {
    console.error('❌ Error cleaning up test parties:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup test parties' },
      { status: 500 }
    )
  }
}