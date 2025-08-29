// Database cleanup script to remove demo/test users
import { MongoClient } from 'mongodb'

// MongoDB connection
async function connectDB() {
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

async function cleanupDemoUsers() {
  console.log('🧹 Starting cleanup of demo/test users...')
  
  try {
    const db = await connectDB()
    
    // Define patterns that identify demo/test users
    const demoUserPatterns = [
      /^player_/,           // player_7xKXtg2C
      /^TestUser$/i,        // TestUser
      /^Test User$/i,       // Test User
      /^Profile Test User$/i,
      /^JWT Test User$/i,
      /^DB Test User/i,
      /^Update Test User$/i,
      /^Creation Test User/i,
      /^test$/i,            // test
      /^emailonly$/i,       // emailonly
      /^John Doe$/i,        // John Doe
      /^jane\.smith$/i,     // jane.smith
      /^wallet_/,           // wallet_9WzDXwBb
      /^jwt\.test$/i,       // jwt.test
      /^Structure Test User$/i,
      /^profile\.test$/i,   // profile.test
      /^testuser_/i,        // testuser_992a7b4f
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
      )
      
      if (isDemo) {
        demoUsers.push(user)
      }
    }
    
    console.log(`🎯 Found ${demoUsers.length} demo/test users to remove:`)
    demoUsers.forEach(user => {
      console.log(`  - ${user.id} (${user.username})`)
    })
    
    if (demoUsers.length === 0) {
      console.log('✅ No demo users found to cleanup')
      return
    }
    
    // Get IDs of demo users
    const demoUserIds = demoUsers.map(user => user.id)
    
    // Remove demo users from all collections
    console.log('\n🗑️ Removing demo users from all collections...')
    
    // 1. Remove from users collection
    const usersResult = await db.collection('users').deleteMany({
      id: { $in: demoUserIds }
    })
    console.log(`✅ Removed ${usersResult.deletedCount} users from users collection`)
    
    // 2. Remove from friendships (any friendship involving demo users)
    const friendshipsResult = await db.collection('friendships').deleteMany({
      $or: [
        { fromUserId: { $in: demoUserIds } },
        { toUserId: { $in: demoUserIds } }
      ]
    })
    console.log(`✅ Removed ${friendshipsResult.deletedCount} friendships involving demo users`)
    
    // 3. Remove from friend_requests
    const requestsResult = await db.collection('friend_requests').deleteMany({
      $or: [
        { fromUserId: { $in: demoUserIds } },
        { toUserId: { $in: demoUserIds } }
      ]
    })
    console.log(`✅ Removed ${requestsResult.deletedCount} friend requests involving demo users`)
    
    // 4. Remove from blocked_users
    const blocksResult = await db.collection('blocked_users').deleteMany({
      $or: [
        { blockerId: { $in: demoUserIds } },
        { blockedId: { $in: demoUserIds } }
      ]
    })
    console.log(`✅ Removed ${blocksResult.deletedCount} block relationships involving demo users`)
    
    // 5. Remove from any custom names
    const namesResult = await db.collection('custom_names').deleteMany({
      userId: { $in: demoUserIds }
    })
    console.log(`✅ Removed ${namesResult.deletedCount} custom names for demo users`)
    
    console.log('\n🎉 Demo user cleanup completed successfully!')
    console.log(`📊 Summary: Removed ${demoUsers.length} demo users and all related data`)
    
    // Show remaining users
    const remainingUsers = await db.collection('users').find({}).toArray()
    console.log(`\n📈 Remaining users in database: ${remainingUsers.length}`)
    if (remainingUsers.length > 0) {
      console.log('Remaining users:')
      remainingUsers.forEach(user => {
        console.log(`  - ${user.id} (${user.username})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run the cleanup
cleanupDemoUsers().then(() => {
  console.log('✅ Cleanup script completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Cleanup script failed:', error)
  process.exit(1)
})