#!/usr/bin/env node

/**
 * Production Database Initialization Script
 * 
 * This script ensures that the production MongoDB database has the correct
 * collections and indexes for the TurfLoot application.
 * 
 * Run this on production to resolve 500 errors related to missing collections.
 */

const { MongoClient } = require('mongodb')

// Database configuration
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/turfloot'
const DB_NAME = process.env.DB_NAME || 'turfloot'

async function initializeDatabase() {
  console.log('🚀 Initializing TurfLoot Production Database...')
  console.log('📍 MongoDB URL:', MONGO_URL.replace(/\/\/.*@/, '//***:***@')) // Hide credentials
  
  let client
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...')
    client = new MongoClient(MONGO_URL)
    await client.connect()
    console.log('✅ Connected to MongoDB successfully')
    
    const db = client.db(DB_NAME)
    console.log('📂 Using database:', DB_NAME)
    
    // Initialize Users Collection
    console.log('👥 Initializing users collection...')
    const users = db.collection('users')
    
    // Create indexes for users collection
    await users.createIndex({ id: 1 }, { unique: true })
    await users.createIndex({ privy_id: 1 })
    await users.createIndex({ email: 1 })
    await users.createIndex({ username: 1 })
    await users.createIndex({ customName: 1 })
    console.log('✅ Users collection indexes created')
    
    // Initialize Friends Collection  
    console.log('👫 Initializing friends collection...')
    const friends = db.collection('friends')
    
    await friends.createIndex({ fromUserId: 1 })
    await friends.createIndex({ toUserId: 1 })
    await friends.createIndex({ status: 1 })
    console.log('✅ Friends collection indexes created')
    
    // Initialize Lobbies Collection
    console.log('🏰 Initializing lobbies collection...')
    const lobbies = db.collection('lobbies')
    
    await lobbies.createIndex({ id: 1 }, { unique: true })
    await lobbies.createIndex({ createdBy: 1 })
    await lobbies.createIndex({ roomCode: 1 })
    console.log('✅ Lobbies collection indexes created')
    
    // Initialize Lobby Invites Collection
    console.log('📧 Initializing lobby_invites collection...')
    const lobbyInvites = db.collection('lobby_invites')
    
    await lobbyInvites.createIndex({ lobbyId: 1 })
    await lobbyInvites.createIndex({ toUserId: 1 })
    await lobbyInvites.createIndex({ status: 1 })
    console.log('✅ Lobby invites collection indexes created')
    
    // Test insert and update operations
    console.log('🧪 Testing database operations...')
    
    const testUserId = 'test-user-' + Date.now()
    const testUser = {
      id: testUserId,
      privy_id: testUserId,
      email: 'test@turfloot.com',
      customName: 'TestUser',
      username: 'TestUser', 
      displayName: 'TestUser',
      balance: 25.00,
      created_at: new Date(),
      updated_at: new Date(),
      last_name_change: new Date()
    }
    
    // Test insert
    const insertResult = await users.insertOne(testUser)
    console.log('✅ Test insert successful:', insertResult.insertedId)
    
    // Test update (simulate name change)
    const updateResult = await users.updateOne(
      { id: testUserId },
      { 
        $set: { 
          customName: 'UpdatedTestUser',
          username: 'UpdatedTestUser',
          displayName: 'UpdatedTestUser',
          updated_at: new Date(),
          last_name_change: new Date()
        }
      }
    )
    console.log('✅ Test update successful. Modified count:', updateResult.modifiedCount)
    
    // Test query (simulate user lookup)
    const foundUser = await users.findOne({ id: testUserId })
    if (foundUser && foundUser.customName === 'UpdatedTestUser') {
      console.log('✅ Test query successful. Name update verified.')
    } else {
      throw new Error('Test query failed - user not found or name not updated')
    }
    
    // Clean up test data
    await users.deleteOne({ id: testUserId })
    console.log('✅ Test cleanup completed')
    
    // Database statistics
    console.log('📊 Database Statistics:')
    const collections = await db.listCollections().toArray()
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments()
      console.log(`  📁 ${collection.name}: ${count} documents`)
    }
    
    console.log('🎉 Database initialization completed successfully!')
    console.log('')
    console.log('✅ Your production database is now ready for TurfLoot!')
    console.log('✅ All collections created with proper indexes')
    console.log('✅ Database operations tested and verified')
    console.log('')
    console.log('🚀 You can now deploy your application - name changes should work!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    if (error.code === 'ENOTFOUND') {
      console.error('')
      console.error('💡 DNS Resolution Error: Cannot reach MongoDB server')
      console.error('   - Check your MONGO_URL environment variable')
      console.error('   - Verify your MongoDB server is running')
      console.error('   - Check network connectivity')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('')
      console.error('💡 Connection Refused: MongoDB server not accepting connections')
      console.error('   - Verify MongoDB is running on the specified port')
      console.error('   - Check firewall rules and port accessibility')
    } else if (error.code === 18) {
      console.error('')
      console.error('💡 Authentication Failed: Invalid MongoDB credentials')
      console.error('   - Check your username and password in MONGO_URL')
      console.error('   - Verify user has proper permissions')
    }
    
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('🔐 Database connection closed')
    }
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
}

module.exports = { initializeDatabase }