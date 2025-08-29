// User Management System - Ensures Privy users are registered in database
import { MongoClient } from 'mongodb'

// MongoDB connection
let client = null
let db = null

async function getDb() {
  if (db) return db
  
  try {
    if (!client) {
      client = new MongoClient(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 20
      })
      await client.connect()
    }
    
    db = client.db(process.env.DB_NAME || 'turfloot_db')
    return db
  } catch (error) {
    console.error('❌ Database connection error:', error)
    throw error
  }
}

export class UserManager {
  // Ensure user exists in database (register if new)
  static async ensureUserExists(userId, username, email = null) {
    try {
      const db = await getDb()
      
      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ id: userId })
      
      if (existingUser) {
        // Update username if it's different
        if (existingUser.username !== username) {
          await db.collection('users').updateOne(
            { id: userId },
            { 
              $set: { 
                username,
                email,
                updatedAt: new Date().toISOString()
              } 
            }
          )
          console.log(`✅ Updated user: ${userId} (${username})`)
        }
        return existingUser
      }
      
      // Create new user
      const newUser = {
        id: userId,
        username: username || `User_${Date.now()}`,
        email,
        privyId: userId.startsWith('did:privy:') ? userId : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPrivyUser: userId.startsWith('did:privy:'),
        lastActive: new Date().toISOString()
      }
      
      await db.collection('users').insertOne(newUser)
      console.log(`✅ Registered new user: ${userId} (${username})`)
      
      return newUser
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error)
      throw error
    }
  }
  
  // Get user by ID
  static async getUser(userId) {
    try {
      const db = await getDb()
      return await db.collection('users').findOne({ id: userId })
    } catch (error) {
      console.error('❌ Error getting user:', error)
      return null
    }
  }
  
  // Update user's last active timestamp
  static async updateLastActive(userId) {
    try {
      const db = await getDb()
      await db.collection('users').updateOne(
        { id: userId },
        { 
          $set: { 
            lastActive: new Date().toISOString()
          } 
        }
      )
    } catch (error) {
      console.error('❌ Error updating last active:', error)
    }
  }
  
  // Get all users (for search functionality)
  static async getAllUsers() {
    try {
      const db = await getDb()
      return await db.collection('users').find({}).toArray()
    } catch (error) {
      console.error('❌ Error getting all users:', error)
      return []
    }
  }
  
  // Update user profile
  static async updateUserProfile(userId, updates) {
    try {
      const db = await getDb()
      
      const result = await db.collection('users').updateOne(
        { id: userId },
        { 
          $set: { 
            ...updates,
            updatedAt: new Date().toISOString()
          } 
        }
      )
      
      console.log(`✅ Updated profile for user: ${userId}`)
      return result.modifiedCount > 0
    } catch (error) {
      console.error('❌ Error updating user profile:', error)
      return false
    }
  }
}