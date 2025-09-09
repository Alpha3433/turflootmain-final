import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { username, userIdentifier } = await request.json()
    
    console.log('💾 Username save request:', { username, userIdentifier })
    
    // Validate input
    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    // Clean username (remove extra spaces, limit length)
    const cleanUsername = username.trim().slice(0, 20)
    
    // TODO: When MongoDB is set up, save to database
    // For now, we'll just return success as persistence is handled client-side
    
    console.log('✅ Username saved successfully:', cleanUsername)
    
    return NextResponse.json({
      success: true,
      username: cleanUsername,
      message: 'Username saved successfully'
    })
    
  } catch (error) {
    console.error('❌ Error saving username:', error)
    return NextResponse.json(
      { error: 'Failed to save username' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdentifier = searchParams.get('userIdentifier')
    
    console.log('📖 Username fetch request:', { userIdentifier })
    
    if (!userIdentifier || userIdentifier === 'guest') {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    // TODO: When MongoDB is set up, fetch from database
    // For now, return null as persistence is handled client-side
    
    return NextResponse.json({
      success: true,
      username: null,
      message: 'Username fetch completed (client-side persistence active)'
    })
    
  } catch (error) {
    console.error('❌ Error fetching username:', error)
    return NextResponse.json(
      { error: 'Failed to fetch username' },
      { status: 500 }
    )
  }
}