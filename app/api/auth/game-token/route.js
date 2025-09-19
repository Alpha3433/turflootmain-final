import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    console.log('🔐 Generating game authentication token...')
    
    const body = await request.json()
    const { playerId, playerName } = body
    
    // Generate player info if not provided
    const finalPlayerId = playerId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const finalPlayerName = playerName || `player-${Math.random().toString(36).substring(2, 9)}`
    
    // Create JWT payload that matches what the Hathora game server expects
    const playerPayload = {
      type: 'anonymous',
      id: finalPlayerId,
      name: finalPlayerName,
      iat: Math.floor(Date.now() / 1000)
    }
    
    // Sign with the same secret that the Hathora game server uses
    const token = jwt.sign(playerPayload, 'hathora-turfloot-secret')
    
    console.log('✅ Game authentication token generated successfully')
    console.log(`👤 Player ID: ${finalPlayerId}, Name: ${finalPlayerName}`)
    
    return NextResponse.json({
      success: true,
      token: token,
      player: {
        id: finalPlayerId,
        name: finalPlayerName
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error generating game token:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to generate game token',
      message: error.message
    }, { status: 500 })
  }
}