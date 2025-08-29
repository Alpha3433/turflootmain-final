import { NextResponse } from 'next/server'
import { PartySystem } from '../../../lib/partySystem.js'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-API-Server': 'TurfLoot-PartyAPI'
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Initialize collections on first load
let initialized = false
async function ensureInitialized() {
  if (!initialized) {
    await PartySystem.initializeCollections()
    initialized = true
  }
}

// GET handler for party operations
export async function GET(request, { params }) {
  await ensureInitialized()
  const { slug } = params
  const url = new URL(request.url)
  
  console.log('🎉 PARTY-API GET:', slug, url.searchParams.toString())
  
  try {
    const action = slug[0] || 'current'
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders })
    }
    
    if (action === 'current') {
      // Get user's current party
      const party = await PartySystem.getUserParty(userId)
      
      return NextResponse.json({
        party,
        hasParty: !!party,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'invitations') {
      // Get pending party invitations for user
      const invitations = await PartySystem.getPendingInvitations(userId)
      
      return NextResponse.json({
        invitations,
        count: invitations.length,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'invitable-friends') {
      // Get friends that can be invited to party
      const partyId = url.searchParams.get('partyId')
      
      if (!partyId) {
        return NextResponse.json({ error: 'partyId required' }, { status: 400, headers: corsHeaders })
      }
      
      const friends = await PartySystem.getInvitableFriends(userId, partyId)
      
      return NextResponse.json({
        friends,
        count: friends.length,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Party API GET error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal error',
      code: error.code || 500
    }, { status: error.code || 500, headers: corsHeaders })
  }
}

// POST handler for party operations
export async function POST(request, { params }) {
  await ensureInitialized()
  const { slug } = params
  
  console.log('🎉 PARTY-API POST:', slug)
  
  try {
    const body = await request.json()
    const action = slug[0] || 'create'
    
    if (action === 'create') {
      // Create new party
      const { ownerId, ownerUsername, partyName } = body
      
      if (!ownerId || !ownerUsername) {
        return NextResponse.json({ 
          error: 'ownerId and ownerUsername required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await PartySystem.createParty(ownerId, ownerUsername, partyName)
      
      return NextResponse.json({
        success: true,
        message: 'Party created successfully',
        partyId: result.partyId,
        party: result.party,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'invite') {
      // Send party invitation to friend
      const { partyId, fromUserId, toUserId, toUsername } = body
      
      if (!partyId || !fromUserId || !toUserId || !toUsername) {
        return NextResponse.json({ 
          error: 'partyId, fromUserId, toUserId, and toUsername required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await PartySystem.inviteFriend(partyId, fromUserId, toUserId, toUsername)
      
      return NextResponse.json({
        success: true,
        message: 'Party invitation sent successfully',
        invitationId: result.invitationId,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'accept-invitation') {
      // Accept party invitation
      const { invitationId, userId } = body
      
      if (!invitationId || !userId) {
        return NextResponse.json({ 
          error: 'invitationId and userId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await PartySystem.acceptInvitation(invitationId, userId)
      
      return NextResponse.json({
        success: true,
        message: 'Party invitation accepted',
        partyId: result.partyId,
        memberCount: result.memberCount,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'decline-invitation') {
      // Decline party invitation
      const { invitationId, userId } = body
      
      if (!invitationId || !userId) {
        return NextResponse.json({ 
          error: 'invitationId and userId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      await PartySystem.declineInvitation(invitationId, userId)
      
      return NextResponse.json({
        success: true,
        message: 'Party invitation declined',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'leave') {
      // Leave current party
      const { partyId, userId } = body
      
      if (!partyId || !userId) {
        return NextResponse.json({ 
          error: 'partyId and userId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await PartySystem.leaveParty(partyId, userId)
      
      return NextResponse.json({
        success: true,
        message: result.disbanded ? 'Party disbanded' : 'Left party successfully',
        disbanded: result.disbanded,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'start-game') {
      // Start coordinated game for party members
      const { partyId, roomType, entryFee, ownerId } = body
      
      if (!partyId || !roomType || !ownerId) {
        return NextResponse.json({ 
          error: 'partyId, roomType, and ownerId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await PartySystem.startPartyGame(partyId, roomType, entryFee, ownerId)
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Party game started successfully',
          gameRoomId: result.gameRoomId,
          partyMembers: result.partyMembers,
          roomType: result.roomType,
          entryFee: result.entryFee,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } else {
        return NextResponse.json({ 
          error: result.error || 'Failed to start party game',
          timestamp: new Date().toISOString()
        }, { status: 400, headers: corsHeaders })
      }
    }
    
    if (action === 'disband') {
      // Disband party (owner only)
      const { partyId, ownerId } = body
      
      if (!partyId || !ownerId) {
        return NextResponse.json({ 
          error: 'partyId and ownerId required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      await PartySystem.disbandParty(partyId)
      
      return NextResponse.json({
        success: true,
        message: 'Party disbanded successfully',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Party API POST error:', error)
    
    return NextResponse.json({ 
      error: error.message || 'Failed to process request',
      timestamp: new Date().toISOString()
    }, { status: 500, headers: corsHeaders })
  }
}