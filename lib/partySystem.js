// Advanced Party/Lobby System with Real-time Notifications
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

// Socket events manager for real-time party updates
class PartySocketManager {
  static emit(userId, event, data) {
    console.log(`🎉 Party socket emit to ${userId}: ${event}`, data)
    // In real implementation, this would emit to actual WebSocket connections
  }

  static emitToParty(partyId, event, data) {
    console.log(`🎉 Party socket emit to party ${partyId}: ${event}`, data)
    // Would emit to all party members
  }
}

export class PartySystem {
  static async initializeCollections() {
    const db = await getDb()
    
    // Create indexes for performance
    await db.collection('parties').createIndex({ id: 1 }, { unique: true })
    await db.collection('parties').createIndex({ ownerId: 1 })
    await db.collection('parties').createIndex({ status: 1 })
    await db.collection('party_invitations').createIndex({ partyId: 1, toUserId: 1 }, { unique: true })
    await db.collection('party_invitations').createIndex({ toUserId: 1, status: 1 })
    await db.collection('party_members').createIndex({ partyId: 1, userId: 1 }, { unique: true })
    
    console.log('✅ Party system collections initialized')
  }

  // 1. Create New Party
  static async createParty(ownerId, ownerUsername, partyName = null) {
    const db = await getDb()

    if (!ownerId || !ownerUsername) {
      throw new Error('ownerId and ownerUsername are required')
    }

    // Check if user is already in any party (consistent with getUserParty logic)
    const existingMembership = await db.collection('party_members').findOne({
      userId: ownerId,
      status: 'joined'
    })

    if (existingMembership) {
      // Get the party details for better error message
      const existingParty = await db.collection('parties').findOne({
        id: existingMembership.partyId,
        status: { $in: ['active', 'waiting'] }
      })
      
      if (existingParty) {
        throw new Error(`You already have an active party: "${existingParty.name}". Leave your current party first.`)
      }
    }

    // Create new party
    const partyId = `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const party = {
      id: partyId,
      ownerId,
      ownerUsername,
      name: partyName || `${ownerUsername}'s Party`,
      status: 'waiting', // waiting, active, disbanded
      maxMembers: 2, // ✅ ENFORCED 2-PLAYER LIMIT
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('parties').insertOne(party)

    // Add owner as first member
    const ownerMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      partyId,
      userId: ownerId,
      username: ownerUsername,
      role: 'owner',
      status: 'joined',
      joinedAt: new Date().toISOString()
    }

    console.log(`🔍 createParty: Inserting party member:`, ownerMember)
    await db.collection('party_members').insertOne(ownerMember)
    console.log(`🔍 createParty: Party member inserted successfully`)

    console.log(`🎉 Party created: ${partyId} by ${ownerUsername} (Max: 2 players)`)
    return { success: true, partyId, party }
  }

  // 2. Invite Friend to Party
  static async inviteFriend(partyId, fromUserId, toUserId, toUsername) {
    const db = await getDb()

    // Validate party exists and user has permission
    const party = await db.collection('parties').findOne({ id: partyId, status: 'waiting' })
    if (!party) {
      throw new Error('Party not found or not accepting invites')
    }

    // Check if user is owner or member of the party
    const membership = await db.collection('party_members').findOne({
      partyId,
      userId: fromUserId,
      status: 'joined'
    })

    if (!membership) {
      throw new Error('You must be a member of this party to invite others')
    }

    // Check if target user is already invited or member
    const [existingInvite, existingMember] = await Promise.all([
      db.collection('party_invitations').findOne({
        partyId,
        toUserId,
        status: 'pending'
      }),
      db.collection('party_members').findOne({
        partyId,
        userId: toUserId
      })
    ])

    if (existingInvite) {
      throw new Error('User already has a pending invitation to this party')
    }

    if (existingMember) {
      throw new Error('User is already in this party')
    }

    // Check party capacity
    const currentMembers = await db.collection('party_members').countDocuments({
      partyId,
      status: 'joined'
    })

    if (currentMembers >= party.maxMembers) {
      throw new Error('Party is full')
    }

    // Create invitation
    const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const invitation = {
      id: invitationId,
      partyId,
      partyName: party.name,
      fromUserId,
      fromUsername: membership.username,
      toUserId,
      toUsername,
      status: 'pending', // pending, accepted, declined, expired
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    }

    await db.collection('party_invitations').insertOne(invitation)

    // Emit socket event to invited user
    PartySocketManager.emit(toUserId, 'party_invitation_received', {
      invitationId,
      partyId,
      partyName: party.name,
      fromUserId,
      fromUsername: membership.username,
      expiresAt: invitation.expiresAt
    })

    console.log(`🎉 Party invitation sent: ${fromUserId} → ${toUserId} for party ${partyId}`)
    return { success: true, invitationId }
  }

  // 3. Accept Party Invitation
  static async acceptInvitation(invitationId, userId) {
    const db = await getDb()

    // Find valid invitation
    const invitation = await db.collection('party_invitations').findOne({
      id: invitationId,
      toUserId: userId,
      status: 'pending'
    })

    if (!invitation) {
      throw new Error('Invitation not found or already processed')
    }

    // Check if invitation expired
    if (new Date(invitation.expiresAt) < new Date()) {
      await db.collection('party_invitations').updateOne(
        { id: invitationId },
        { $set: { status: 'expired', updatedAt: new Date().toISOString() } }
      )
      throw new Error('Invitation has expired')
    }

    // Check if party still exists and has space
    const party = await db.collection('parties').findOne({ 
      id: invitation.partyId, 
      status: { $in: ['waiting', 'active'] }
    })

    if (!party) {
      throw new Error('Party no longer exists or is not available')
    }

    const currentMembers = await db.collection('party_members').countDocuments({
      partyId: invitation.partyId,
      status: 'joined'
    })

    if (currentMembers >= party.maxMembers) {
      throw new Error('Party is now full')
    }

    // Leave any existing party first
    await this.leaveAllParties(userId)

    // Accept invitation
    await db.collection('party_invitations').updateOne(
      { id: invitationId },
      { 
        $set: { 
          status: 'accepted', 
          acceptedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } 
      }
    )

    // Add user as party member
    const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const member = {
      id: memberId,
      partyId: invitation.partyId,
      userId,
      username: invitation.toUsername,
      role: 'member',
      status: 'joined',
      joinedAt: new Date().toISOString()
    }

    await db.collection('party_members').insertOne(member)

    // Notify all party members
    const allMembers = await db.collection('party_members').find({
      partyId: invitation.partyId,
      status: 'joined'
    }).toArray()

    PartySocketManager.emitToParty(invitation.partyId, 'member_joined', {
      userId,
      username: invitation.toUsername,
      partyId: invitation.partyId,
      memberCount: allMembers.length
    })

    // Notify party owner specifically
    PartySocketManager.emit(party.ownerId, 'party_member_joined', {
      userId,
      username: invitation.toUsername,
      partyId: invitation.partyId,
      partyName: party.name
    })

    console.log(`🎉 User joined party: ${userId} → ${invitation.partyId}`)
    return { success: true, partyId: invitation.partyId, memberCount: allMembers.length }
  }

  // 4. Decline Party Invitation
  static async declineInvitation(invitationId, userId) {
    const db = await getDb()

    const result = await db.collection('party_invitations').updateOne(
      {
        id: invitationId,
        toUserId: userId,
        status: 'pending'
      },
      {
        $set: {
          status: 'declined',
          declinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    )

    if (result.matchedCount === 0) {
      throw new Error('Invitation not found or already processed')
    }

    const invitation = await db.collection('party_invitations').findOne({ id: invitationId })
    
    // Notify party owner
    PartySocketManager.emit(invitation.fromUserId, 'party_invitation_declined', {
      userId,
      username: invitation.toUsername,
      partyId: invitation.partyId
    })

    console.log(`❌ Party invitation declined: ${invitationId}`)
    return { success: true }
  }

  // 5. Get User's Current Party
  static async getUserParty(userId) {
    const db = await getDb()

    console.log(`🔍 getUserParty: Looking for userId=${userId} with status='joined'`)
    
    // Debug: Check all party_members for this user
    const allMemberships = await db.collection('party_members').find({ userId }).toArray()
    console.log(`🔍 getUserParty: Found ${allMemberships.length} total memberships for user:`, allMemberships)

    const membership = await db.collection('party_members').findOne({
      userId,
      status: 'joined'
    })

    console.log(`🔍 getUserParty: Active membership found:`, membership)

    if (!membership) {
      console.log(`🔍 getUserParty: No active membership found for userId=${userId}`)
      return null
    }

    console.log(`🔍 getUserParty: Looking for party with id=${membership.partyId} and status in ['waiting', 'active']`)
    const party = await db.collection('parties').findOne({
      id: membership.partyId,
      status: { $in: ['waiting', 'active'] }
    })

    console.log(`🔍 getUserParty: Party found:`, party)

    if (!party) {
      console.log(`🔍 getUserParty: No active party found for partyId=${membership.partyId}`)
      return null
    }

    // Get all party members
    const members = await db.collection('party_members').find({
      partyId: party.id,
      status: 'joined'
    }).sort({ joinedAt: 1 }).toArray()

    return {
      ...party,
      members: members.map(member => ({
        id: member.userId,
        username: member.username,
        role: member.role,
        joinedAt: member.joinedAt
      })),
      memberCount: members.length,
      userRole: membership.role
    }
  }

  // 6. Leave Party
  static async leaveParty(partyId, userId) {
    const db = await getDb()

    const membership = await db.collection('party_members').findOne({
      partyId,
      userId,
      status: 'joined'
    })

    if (!membership) {
      throw new Error('You are not a member of this party')
    }

    // Remove member
    await db.collection('party_members').updateOne(
      { partyId, userId },
      { 
        $set: { 
          status: 'left', 
          leftAt: new Date().toISOString() 
        } 
      }
    )

    // If owner leaves, disband party
    if (membership.role === 'owner') {
      await this.disbandParty(partyId)
      return { success: true, disbanded: true }
    }

    // Notify remaining party members
    PartySocketManager.emitToParty(partyId, 'member_left', {
      userId,
      username: membership.username,
      partyId
    })

    console.log(`👋 User left party: ${userId} → ${partyId}`)
    return { success: true, disbanded: false }
  }

  // 7. Leave All Parties (helper for switching parties)
  static async leaveAllParties(userId) {
    const db = await getDb()

    const memberships = await db.collection('party_members').find({
      userId,
      status: 'joined'
    }).toArray()

    for (const membership of memberships) {
      await this.leaveParty(membership.partyId, userId)
    }
  }

  // 8. Disband Party
  static async disbandParty(partyId) {
    const db = await getDb()

    // Get party and members
    const [party, members] = await Promise.all([
      db.collection('parties').findOne({ id: partyId }),
      db.collection('party_members').find({ partyId, status: 'joined' }).toArray()
    ])

    if (!party) {
      throw new Error('Party not found')
    }

    // Update party status
    await db.collection('parties').updateOne(
      { id: partyId },
      { 
        $set: { 
          status: 'disbanded', 
          disbandedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } 
      }
    )

    // Update all members
    await db.collection('party_members').updateMany(
      { partyId },
      { 
        $set: { 
          status: 'disbanded', 
          leftAt: new Date().toISOString() 
        } 
      }
    )

    // Cancel pending invitations
    await db.collection('party_invitations').updateMany(
      { partyId, status: 'pending' },
      { 
        $set: { 
          status: 'cancelled', 
          updatedAt: new Date().toISOString() 
        } 
      }
    )

    // Notify all members
    members.forEach(member => {
      PartySocketManager.emit(member.userId, 'party_disbanded', {
        partyId,
        partyName: party.name,
        reason: 'Party owner disbanded the party'
      })
    })

    console.log(`💀 Party disbanded: ${partyId}`)
    return { success: true }
  }

  // 9. Get Pending Invitations for User
  static async getPendingInvitations(userId) {
    const db = await getDb()

    const invitations = await db.collection('party_invitations').find({
      toUserId: userId,
      status: 'pending',
      expiresAt: { $gt: new Date().toISOString() }
    }).sort({ createdAt: -1 }).toArray()

    return invitations.map(invite => ({
      id: invite.id,
      partyId: invite.partyId,
      partyName: invite.partyName,
      fromUserId: invite.fromUserId,
      fromUsername: invite.fromUsername,
      toUserId: invite.toUserId,
      toUsername: invite.toUsername,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt
    }))
  }

  // 10. Get Friends Available to Invite
  static async getInvitableFriends(userId, partyId) {
    const db = await getDb()

    // Get user's friends
    const friendships = await db.collection('friendships').find({
      $or: [
        { fromUserId: userId, status: 'active' },
        { toUserId: userId, status: 'active' }
      ]
    }).toArray()

    const friendIds = friendships.map(f => 
      f.fromUserId === userId ? f.toUserId : f.fromUserId
    )

    if (friendIds.length === 0) {
      return []
    }

    // Get friends who are NOT already in a party or invited
    const [existingMembers, pendingInvites] = await Promise.all([
      db.collection('party_members').find({
        userId: { $in: friendIds },
        status: 'joined'
      }).toArray(),
      
      db.collection('party_invitations').find({
        toUserId: { $in: friendIds },
        status: 'pending'
      }).toArray()
    ])

    const unavailableIds = new Set([
      ...existingMembers.map(m => m.userId),
      ...pendingInvites.map(i => i.toUserId)
    ])

    // Get available friends
    const availableFriends = []
    for (const friendship of friendships) {
      const friendId = friendship.fromUserId === userId ? friendship.toUserId : friendship.fromUserId
      const friendUsername = friendship.fromUserId === userId ? friendship.toUsername : friendship.fromUsername
      
      if (!unavailableIds.has(friendId)) {
        availableFriends.push({
          id: friendId,
          username: friendUsername
        })
      }
    }

    return availableFriends
  }

  // Start coordinated game for party members
  static async startPartyGame(partyId, roomType, entryFee = 0, ownerId) {
    const db = await getDb()

    try {
      // Verify party exists and user is owner
      const party = await db.collection('parties').findOne({ 
        id: partyId,
        ownerId: ownerId,
        status: 'waiting'
      })

      if (!party) {
        return { 
          success: false, 
          error: 'Party not found or you are not the owner' 
        }
      }

      // Get all party members
      const members = await db.collection('party_members').find({
        partyId: partyId,
        status: 'joined'
      }).toArray()

      if (members.length < 2 || members.length > 2) {
        return {
          success: false,
          error: `Invalid party size: ${members.length}. Must be exactly 2 members.`
        }
      }

      // Generate unique game room ID
      const gameRoomId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create game room entry in database
      const gameRoom = {
        id: gameRoomId,
        partyId: partyId,
        roomType: roomType,
        entryFee: entryFee,
        maxPlayers: 2,
        currentPlayers: 0,
        status: 'waiting_for_players', // waiting_for_players, active, completed
        members: members.map(member => ({
          userId: member.userId,
          username: member.username,
          status: 'invited' // invited, joined, disconnected
        })),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      }

      // Store game room
      await db.collection('game_rooms').insertOne(gameRoom)

      // Update party status to in_game
      await db.collection('parties').updateOne(
        { id: partyId },
        { 
          $set: { 
            status: 'in_game',
            gameRoomId: gameRoomId,
            gameStartedAt: new Date().toISOString()
          } 
        }
      )

      // Create notifications for party members (excluding owner)
      const notifications = members
        .filter(member => member.userId !== ownerId)
        .map(member => ({
          id: `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: member.userId,
          type: 'party_game_start',
          title: 'Party Game Starting!',
          message: `${party.ownerUsername} started a ${roomType} game. Click to join!`,
          data: {
            gameRoomId: gameRoomId,
            partyId: partyId,
            roomType: roomType,
            entryFee: entryFee,
            partyMembers: members
          },
          status: 'pending', // pending, seen, dismissed
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes
        }))

      // Store notifications for party members
      if (notifications.length > 0) {
        await db.collection('party_notifications').insertMany(notifications)
        console.log(`📢 Created ${notifications.length} party game notifications`)
      }

      console.log(`🎮 Party game started: ${gameRoomId} for party ${partyId} (${roomType}, $${entryFee})`)
      console.log(`👥 Party members: ${members.map(m => m.username).join(', ')}`)

      return {
        success: true,
        gameRoomId: gameRoomId,
        partyMembers: members,
        roomType: roomType,
        entryFee: entryFee,
        notificationsCreated: notifications.length
      }

    } catch (error) {
      console.error('❌ Error starting party game:', error)
      return {
        success: false,
        error: 'Failed to start party game'
      }
    }
  }

  // Get party notifications for user
  static async getPartyNotifications(userId) {
    const db = await getDb()

    try {
      const notifications = await db.collection('party_notifications').find({
        userId: userId,
        status: { $in: ['pending', 'seen'] },
        expiresAt: { $gt: new Date().toISOString() }
      }).sort({ createdAt: -1 }).limit(10).toArray()

      console.log(`📢 Retrieved ${notifications.length} notifications for user ${userId}`)

      return {
        success: true,
        notifications: notifications,
        count: notifications.length
      }

    } catch (error) {
      console.error('❌ Error getting party notifications:', error)
      return {
        success: false,
        error: 'Failed to get notifications',
        notifications: [],
        count: 0
      }
    }
  }

  // Mark notification as seen
  static async markNotificationSeen(notificationId, userId) {
    const db = await getDb()

    try {
      const result = await db.collection('party_notifications').updateOne(
        { id: notificationId, userId: userId },
        { 
          $set: { 
            status: 'seen',
            seenAt: new Date().toISOString()
          } 
        }
      )

      if (result.matchedCount > 0) {
        console.log(`👀 Notification ${notificationId} marked as seen by ${userId}`)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: 'Notification not found or not owned by user' 
        }
      }

    } catch (error) {
      console.error('❌ Error marking notification as seen:', error)
      return {
        success: false,
        error: 'Failed to mark notification as seen'
      }
    }
  }
}

export { PartySocketManager }