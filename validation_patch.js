// Validation patch for notification endpoints
// This contains the enhanced validation code for the remaining endpoints

// Get notification count for badge display
if (route === 'friends/notifications/count') {
  try {
    const { userId, ...extraFields } = body
    
    // Strict input validation
    if (!userId) {
      return NextResponse.json({
        error: 'userId is required'
      }, { status: 400, headers: corsHeaders })
    }

    // Validate data type
    if (typeof userId !== 'string') {
      return NextResponse.json({
        error: 'userId must be a string',
        details: `Got userId: ${typeof userId}`
      }, { status: 400, headers: corsHeaders })
    }

    // Validate string content
    if (userId.trim() === '') {
      return NextResponse.json({
        error: 'userId cannot be empty string'
      }, { status: 400, headers: corsHeaders })
    }

    // Reject extra fields
    if (Object.keys(extraFields).length > 0) {
      return NextResponse.json({
        error: 'Invalid request fields detected',
        details: `Unexpected fields: ${Object.keys(extraFields).join(', ')}`
      }, { status: 400, headers: corsHeaders })
    }

    const db = await getDb()
    const friends = db.collection('friends')
    
    // Count unnotified pending requests
    const unnotifiedCount = await friends.countDocuments({
      toUserId: userId,
      status: 'pending',
      notified: { $ne: true }
    })

    console.log(`🔔 ${unnotifiedCount} unnotified friend requests for user ${userId}`)
    
    return NextResponse.json({
      success: true,
      count: unnotifiedCount,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })
    
  } catch (error) {
    console.error('Error getting notification count:', error)
    return NextResponse.json({
      error: 'Failed to get notification count'
    }, { status: 500, headers: corsHeaders })
  }
}

// Mark notifications as read
if (route === 'friends/notifications/mark-read') {
  try {
    const { userId, ...extraFields } = body
    
    // Strict input validation
    if (!userId) {
      return NextResponse.json({
        error: 'userId is required'
      }, { status: 400, headers: corsHeaders })
    }

    // Validate data type
    if (typeof userId !== 'string') {
      return NextResponse.json({
        error: 'userId must be a string',
        details: `Got userId: ${typeof userId}`
      }, { status: 400, headers: corsHeaders })
    }

    // Validate string content
    if (userId.trim() === '') {
      return NextResponse.json({
        error: 'userId cannot be empty string'
      }, { status: 400, headers: corsHeaders })
    }

    // Reject extra fields
    if (Object.keys(extraFields).length > 0) {
      return NextResponse.json({
        error: 'Invalid request fields detected',
        details: `Unexpected fields: ${Object.keys(extraFields).join(', ')}`
      }, { status: 400, headers: corsHeaders })
    }

    const db = await getDb()
    const friends = db.collection('friends')
    
    // Mark all pending requests for this user as notified
    const result = await friends.updateMany(
      {
        toUserId: userId,
        status: 'pending'
      },
      {
        $set: {
          notified: true,
          notifiedAt: new Date()
        }
      }
    )

    console.log(`✅ Marked ${result.modifiedCount} notifications as read for user ${userId}`)
    
    return NextResponse.json({
      success: true,
      markedCount: result.modifiedCount,
      message: 'Notifications marked as read'
    }, { headers: corsHeaders })
    
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({
      error: 'Failed to mark notifications as read'
    }, { status: 500, headers: corsHeaders })
  }
}