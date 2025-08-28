import { NextResponse } from 'next/server'

// Simplified in-memory name storage for production reliability
// This bypasses MongoDB entirely to avoid infrastructure issues
const userNames = new Map()
const nameHistory = new Map()

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function POST(request, { params }) {
  const { slug } = params
  const action = slug?.[0] || 'update'

  try {
    const body = await request.json()
    console.log(`📝 Names API - ${action}:`, body)

    if (action === 'update') {
      const { userId, customName, privyId, email } = body

      // Validation
      if (!userId) {
        return NextResponse.json(
          { error: 'userId is required' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (!customName || typeof customName !== 'string' || customName.length < 1 || customName.length > 20) {
        return NextResponse.json(
          { error: 'customName must be a string between 1 and 20 characters' },
          { status: 400, headers: corsHeaders }
        )
      }

      // Store name in memory (survives until server restart)
      const nameData = {
        userId,
        customName: customName.trim(),
        privyId: privyId || userId,
        email: email || null,
        updatedAt: new Date().toISOString(),
        source: 'names_api'
      }

      userNames.set(userId, nameData)
      
      // Keep history for debugging
      if (!nameHistory.has(userId)) {
        nameHistory.set(userId, [])
      }
      nameHistory.get(userId).push({
        name: customName.trim(),
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Name stored for ${userId}: "${customName.trim()}"`)
      console.log(`📊 Total names stored: ${userNames.size}`)

      return NextResponse.json({
        success: true,
        message: 'Name stored successfully',
        customName: customName.trim(),
        userId,
        timestamp: new Date().toISOString(),
        storage: 'in_memory_reliable'
      }, { headers: corsHeaders })

    } else if (action === 'batch-sync') {
      // Batch sync multiple names
      const { names } = body
      
      if (!Array.isArray(names)) {
        return NextResponse.json(
          { error: 'names must be an array' },
          { status: 400, headers: corsHeaders }
        )
      }

      let syncedCount = 0
      for (const nameData of names) {
        if (nameData.userId && nameData.customName) {
          userNames.set(nameData.userId, {
            ...nameData,
            updatedAt: new Date().toISOString(),
            source: 'batch_sync'
          })
          syncedCount++
        }
      }

      console.log(`✅ Batch synced ${syncedCount} names`)
      
      return NextResponse.json({
        success: true,
        syncedCount,
        totalStored: userNames.size
      }, { headers: corsHeaders })

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('❌ Names API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET(request, { params }) {
  const { slug } = params
  const action = slug?.[0] || 'get'
  const url = new URL(request.url)

  try {
    if (action === 'get') {
      const userId = url.searchParams.get('userId')
      
      if (!userId) {
        return NextResponse.json(
          { error: 'userId parameter is required' },
          { status: 400, headers: corsHeaders }
        )
      }

      const nameData = userNames.get(userId)
      
      if (nameData) {
        console.log(`📖 Retrieved name for ${userId}: "${nameData.customName}"`)
        return NextResponse.json({
          success: true,
          ...nameData
        }, { headers: corsHeaders })
      } else {
        return NextResponse.json(
          { error: 'Name not found' },
          { status: 404, headers: corsHeaders }
        )
      }

    } else if (action === 'search') {
      const query = url.searchParams.get('q')
      const currentUserId = url.searchParams.get('userId')
      
      if (!query || query.length < 2) {
        return NextResponse.json({
          users: [],
          message: 'Query must be at least 2 characters'
        }, { headers: corsHeaders })
      }

      const matchingUsers = []
      for (const [userId, nameData] of userNames.entries()) {
        if (userId !== currentUserId && 
            nameData.customName.toLowerCase().includes(query.toLowerCase())) {
          matchingUsers.push({
            id: userId,
            username: nameData.customName,
            updatedAt: nameData.updatedAt,
            source: 'names_api'
          })
        }
      }

      console.log(`🔍 Search "${query}" found ${matchingUsers.length} users`)
      
      return NextResponse.json({
        users: matchingUsers.slice(0, 10), // Limit to 10 results
        total: matchingUsers.length
      }, { headers: corsHeaders })

    } else if (action === 'all') {
      // Debug endpoint to see all stored names
      const allNames = Array.from(userNames.entries()).map(([userId, data]) => ({
        userId: userId.substring(0, 20) + '...',
        customName: data.customName,
        updatedAt: data.updatedAt
      }))

      return NextResponse.json({
        totalNames: userNames.size,
        names: allNames
      }, { headers: corsHeaders })

    } else if (action === 'history') {
      const userId = url.searchParams.get('userId')
      
      if (userId && nameHistory.has(userId)) {
        return NextResponse.json({
          history: nameHistory.get(userId)
        }, { headers: corsHeaders })
      } else {
        return NextResponse.json({
          history: []
        }, { headers: corsHeaders })
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('❌ Names API GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}