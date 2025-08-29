import { NextResponse } from 'next/server'
import { UserManager } from '../../../lib/userManager.js'
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
  'Cache-Control': 'no-store, no-cache, must-revalidate'
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Sync all users with custom names from the names API
export async function POST() {
  try {
    console.log('🔄 Starting user sync with custom display names...')
    
    const db = await getDb()
    
    // Get all custom names from the names collection
    const customNames = await db.collection('custom_names').find({}).toArray()
    console.log(`📋 Found ${customNames.length} custom names to sync`)
    
    let syncedCount = 0
    let createdCount = 0
    let updatedCount = 0
    
    for (const nameRecord of customNames) {
      try {
        const { userId, customName } = nameRecord
        
        if (!userId || !customName) {
          continue
        }
        
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ id: userId })
        
        if (existingUser) {
          // Update existing user with custom name
          await db.collection('users').updateOne(
            { id: userId },
            { 
              $set: { 
                username: customName,
                hasCustomName: true,
                updatedAt: new Date().toISOString()
              } 
            }
          )
          updatedCount++
          console.log(`✅ Updated user: ${userId} → ${customName}`)
        } else {
          // Create new user with custom name
          const newUser = {
            id: userId,
            username: customName,
            email: null,
            privyId: userId.startsWith('did:privy:') ? userId : null,
            isPrivyUser: userId.startsWith('did:privy:'),
            hasCustomName: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
          }
          
          await db.collection('users').insertOne(newUser)
          createdCount++
          console.log(`✅ Created user: ${userId} → ${customName}`)
        }
        
        syncedCount++
      } catch (error) {
        console.error(`❌ Error syncing user ${nameRecord.userId}:`, error)
      }
    }
    
    // Get updated user count
    const totalUsers = await db.collection('users').countDocuments({})
    
    console.log('🎉 User sync completed!')
    
    return NextResponse.json({
      success: true,
      message: 'All users synced with custom display names',
      synced: syncedCount,
      created: createdCount,
      updated: updatedCount,
      totalUsers,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500, headers: corsHeaders })
  }
}