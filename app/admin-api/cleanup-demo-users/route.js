import { NextResponse } from 'next/server'
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

export async function POST() {
  try {
    console.log('🧹 Starting cleanup of demo/test users...')
    
    const db = await getDb()
    
    // Define patterns that identify demo/test users
    const demoUserPatterns = [
      /^player_/,           // player_7xKXtg2C
      /^TestUser$/i,        // TestUser
      /^Test User/i,        // Test User, Test User 1754821903
      /^TestUsername$/i,    // TestUsername
      /^Test Gaming User$/i, // Test Gaming User  
      /^Profile Test User$/i,
      /^JWT Test User$/i,
      /^DB Test User/i,
      /^Update Test User$/i,
      /^Creation Test User/i,
      /^Wallet Test User$/i, // Wallet Test User
      /^test$/i,            // test
      /^emailonly$/i,       // emailonly
      /^John Doe$/i,        // John Doe
      /^jane\.smith$/i,     // jane.smith
      /^wallet[._]/i,       // wallet_9WzDXwBb, wallet.test
      /^jwt\.test$/i,       // jwt.test
      /^Structure Test User$/i,
      /^profile\.test$/i,   // profile.test
      /^testuser_/i,        // testuser_992a7b4f
      /^gamer[._]/i,        // gamer.1754633264, gamer_1754633264
      /^gametest\./i,       // gametest.1754705893
      /^ConcurrentUser/i,   // ConcurrentUser0, ConcurrentUser1, etc.
      /^ConsistencyTestUser$/i,
      /^DatabaseTestUser/i, // DatabaseTestUser, DatabaseTestUser1, etc.
      /^Debug User$/i,      // Debug User
      /^EnhancedAuthUser/i, // EnhancedAuthUser1, etc.
      /^FlowTestUser/i,     // FlowTestUser2024
      /^AuthTestUser/i,     // AuthTestUser1, etc.
    ]
    
    // Also check for test IDs patterns
    const demoIdPatterns = [
      /^auth_user_/,        // auth_user_1, auth_user_2, etc.
      /^concurrent_user_/,  // concurrent_user_0_1756394330
      /^did:privy:consistency_test_/,
      /^did:privy:db_test_/,
      /^did:privy:enhanced_auth_user_/,
      /^did:privy:flow_test_/,
    ]
    
    // Get all users to check
    const users = await db.collection('users').find({}).toArray()
    console.log(`📊 Found ${users.length} total users in database`)
    
    let demoUsers = []
    
    // Find demo users by username patterns
    for (const user of users) {
      const isDemo = demoUserPatterns.some(pattern => 
        pattern.test(user.username || '')
      ) || demoIdPatterns.some(pattern => 
        pattern.test(user.id || '')
      ) || !user.username || user.username === null // Also remove users with null usernames
      
      if (isDemo) {
        demoUsers.push(user)
      }
    }
    
    console.log(`🎯 Found ${demoUsers.length} demo/test users to remove`)
    
    if (demoUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No demo users found to cleanup',
        removed: 0,
        remaining: users.length
      })
    }
    
    // Get IDs of demo users
    const demoUserIds = demoUsers.map(user => user.id)
    
    console.log('🗑️ Removing demo users from all collections...')
    
    // Remove demo users from all collections
    const results = {}
    
    // 1. Remove from users collection
    results.users = await db.collection('users').deleteMany({
      id: { $in: demoUserIds }
    })
    
    // 2. Remove from friendships
    results.friendships = await db.collection('friendships').deleteMany({
      $or: [
        { fromUserId: { $in: demoUserIds } },
        { toUserId: { $in: demoUserIds } }
      ]
    })
    
    // 3. Remove from friend_requests
    results.requests = await db.collection('friend_requests').deleteMany({
      $or: [
        { fromUserId: { $in: demoUserIds } },
        { toUserId: { $in: demoUserIds } }
      ]
    })
    
    // 4. Remove from blocked_users
    results.blocks = await db.collection('blocked_users').deleteMany({
      $or: [
        { blockerId: { $in: demoUserIds } },
        { blockedId: { $in: demoUserIds } }
      ]
    })
    
    // 5. Remove from custom_names
    results.names = await db.collection('custom_names').deleteMany({
      userId: { $in: demoUserIds }
    })
    
    // Get remaining users count
    const remainingUsers = await db.collection('users').find({}).toArray()
    
    console.log('🎉 Demo user cleanup completed!')
    
    return NextResponse.json({
      success: true,
      message: 'Demo users cleanup completed successfully',
      removed: demoUsers.length,
      remaining: remainingUsers.length,
      details: {
        usersRemoved: results.users.deletedCount,
        friendshipsRemoved: results.friendships.deletedCount,
        requestsRemoved: results.requests.deletedCount,
        blocksRemoved: results.blocks.deletedCount,
        namesRemoved: results.names.deletedCount
      },
      removedUsers: demoUsers.map(user => ({
        id: user.id,
        username: user.username
      }))
    })
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}