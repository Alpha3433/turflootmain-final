import { NextResponse } from 'next/server'
import { PartySystem } from '../../../lib/partySystem.js'
import { MongoClient } from 'mongodb'

// MongoDB connection
async function getDb() {
  try {
    const client = new MongoClient(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    })
    await client.connect()
    return client.db(process.env.DB_NAME || 'turfloot_db')
  } catch (error) {
    console.error('❌ Database connection error:', error)
    throw error
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-API-Server': 'TurfLoot-LobbyAPI-PartyIntegrated'
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Party-integrated lobby system
export class PartyLobbySystem {
  // Create a game lobby that party members can join together
  static async createPartyLobby(ownerId, roomType, entryFee) {
    const db = await getDb()

    // Check if user has a party
    const party = await PartySystem.getUserParty(ownerId)
    
    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const lobby = {
      id: lobbyId,
      ownerId,
      roomType, // $1, $5, $10, $25, $100, practice
      entryFee,
      partyId: party?.id || null,
      partyMembers: party ? party.members.map(m => m.id) : [ownerId],
      status: 'waiting', // waiting, starting, active, completed
      maxPlayers: party ? party.memberCount : 1,
      currentPlayers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('lobbies').insertOne(lobby)

    // If user has party, notify all party members about the room
    if (party) {
      console.log(`🎮 Party lobby created: ${lobbyId} for ${roomType} room with ${party.memberCount} members`)
      
      // In a real implementation, this would emit WebSocket events to all party members
      party.members.forEach(member => {
        console.log(`🔔 Notifying party member ${member.username} about ${roomType} room`)
      })
    }

    return { success: true, lobbyId, lobby, partySize: party?.memberCount || 1 }
  }

  // Party owner joins a room, bringing all party members
  static async joinRoomWithParty(ownerId, roomType, entryFee) {
    const db = await getDb()

    // Get user's current party
    const party = await PartySystem.getUserParty(ownerId)

    if (!party) {
      // User has no party, join solo
      return await this.joinRoomSolo(ownerId, roomType, entryFee)
    }

    // Verify user is party owner
    if (party.userRole !== 'owner') {
      throw new Error('Only party owner can choose rooms for the party')
    }

    // Create lobby entry for the entire party
    const result = await this.createPartyLobby(ownerId, roomType, entryFee)

    // Add all party members to the lobby
    const playerEntries = party.members.map(member => ({
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      lobbyId: result.lobbyId,
      userId: member.id,
      username: member.username,
      role: member.role, // owner or member
      status: 'ready',
      joinedAt: new Date().toISOString()
    }))

    await db.collection('lobby_players').insertMany(playerEntries)

    // Update lobby with current players
    await db.collection('lobbies').updateOne(
      { id: result.lobbyId },
      { 
        $set: { 
          currentPlayers: party.members.map(m => m.id),
          status: 'ready',
          updatedAt: new Date().toISOString()
        }
      }
    )

    console.log(`🎮 Party of ${party.memberCount} joining ${roomType} room together`)

    return {
      success: true,
      lobbyId: result.lobbyId,
      roomType,
      entryFee,
      partyMembers: party.members,
      message: `Party of ${party.memberCount} joining ${roomType} room`
    }
  }

  // Solo user joins room (no party)
  static async joinRoomSolo(userId, roomType, entryFee) {
    const db = await getDb()

    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const lobby = {
      id: lobbyId,
      ownerId: userId,
      roomType,
      entryFee,
      partyId: null,
      partyMembers: [userId],
      status: 'ready',
      maxPlayers: 1,
      currentPlayers: [userId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('lobbies').insertOne(lobby)

    console.log(`🎮 Solo player joining ${roomType} room`)

    return {
      success: true,
      lobbyId,
      roomType,
      entryFee,
      partyMembers: [],
      message: `Joining ${roomType} room solo`
    }
  }

  // Get lobby status
  static async getLobbyStatus(lobbyId) {
    const db = await getDb()

    const [lobby, players] = await Promise.all([
      db.collection('lobbies').findOne({ id: lobbyId }),
      db.collection('lobby_players').find({ lobbyId }).toArray()
    ])

    if (!lobby) {
      throw new Error('Lobby not found')
    }

    return {
      lobby,
      players: players.map(p => ({
        userId: p.userId,
        username: p.username,
        role: p.role,
        status: p.status
      }))
    }
  }
}

// GET handler
export async function GET(request, { params }) {
  const { slug } = params
  const url = new URL(request.url)
  
  console.log('🎮 LOBBY-API GET:', slug, url.searchParams.toString())
  
  try {
    const action = slug[0] || 'status'
    
    if (action === 'status') {
      const lobbyId = url.searchParams.get('lobbyId')
      
      if (!lobbyId) {
        return NextResponse.json({ error: 'lobbyId required' }, { status: 400, headers: corsHeaders })
      }
      
      const status = await PartyLobbySystem.getLobbyStatus(lobbyId)
      
      return NextResponse.json({
        ...status,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Lobby API GET error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal error'
    }, { status: 500, headers: corsHeaders })
  }
}

// POST handler
export async function POST(request, { params }) {
  const { slug } = params
  
  console.log('🎮 LOBBY-API POST:', slug)
  
  try {
    const body = await request.json()
    const action = slug[0] || 'create'
    
    if (action === 'create') {
      // Create lobby - party owner joins room and brings party members
      const { userId, roomType, entryFee } = body
      
      console.log(`🏰 Creating lobby for room type: ${roomType}`)
      
      if (!userId || !roomType) {
        return NextResponse.json({ 
          error: 'userId and roomType required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await PartyLobbySystem.joinRoomWithParty(userId, roomType, entryFee || 0)
      
      return NextResponse.json({
        success: true,
        message: result.message,
        lobbyId: result.lobbyId,
        roomType: result.roomType,
        entryFee: result.entryFee,
        partySize: result.partyMembers.length,
        partyMembers: result.partyMembers,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    if (action === 'join-room') {
      // Alternative endpoint for joining specific room
      const { userId, roomType, entryFee } = body
      
      if (!userId || !roomType) {
        return NextResponse.json({ 
          error: 'userId and roomType required' 
        }, { status: 400, headers: corsHeaders })
      }
      
      const result = await PartyLobbySystem.joinRoomWithParty(userId, roomType, entryFee || 0)
      
      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Lobby API POST error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create lobby',
      timestamp: new Date().toISOString()
    }, { status: 500, headers: corsHeaders })
  }
}