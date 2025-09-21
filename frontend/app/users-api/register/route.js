import { NextResponse } from 'next/server'
import { UserManager } from '../../../lib/userManager.js'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-API-Server': 'TurfLoot-UserRegistration'
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Register or update user in database
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, username, email } = body
    
    console.log('👤 User registration/update request:', { userId, username, email })
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required' 
      }, { status: 400, headers: corsHeaders })
    }
    
    // Ensure user exists in database
    const user = await UserManager.ensureUserExists(userId, username, email)
    
    // Update last active
    await UserManager.updateLastActive(userId)
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isPrivyUser: user.isPrivyUser,
        createdAt: user.createdAt
      },
      message: 'User registered/updated successfully',
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ User registration error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to register user',
      timestamp: new Date().toISOString()
    }, { status: 500, headers: corsHeaders })
  }
}

// Get user information
export async function GET(request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'userId parameter is required' 
      }, { status: 400, headers: corsHeaders })
    }
    
    const user = await UserManager.getUser(userId)
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404, headers: corsHeaders })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isPrivyUser: user.isPrivyUser,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      },
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Get user error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get user',
      timestamp: new Date().toISOString()
    }, { status: 500, headers: corsHeaders })
  }
}