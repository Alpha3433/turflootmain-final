import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

// MongoDB connection with optimized settings for API calls
let client = null
let db = null

async function getDb() {
  if (db) return db
  
  try {
    if (!client) {
      client = new MongoClient(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10
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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-API-Server': 'TurfLoot-NamesAPI-Bypass'
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// GET handler for name retrieval and search
export async function GET(request, { params }) {
  const { slug } = params
  const url = new URL(request.url)
  
  console.log('🔍 NAMES-API GET:', slug, url.searchParams.toString())
  
  try {
    const action = slug[0] || 'get'
    
    if (action === 'search') {
      const q = url.searchParams.get('q')
      const userId = url.searchParams.get('userId')
      
      console.log('🔍 Names search bypass:', { q, userId })
      
      if (!q || !userId) {
        return NextResponse.json({ error: 'Query and userId required' }, { status: 400, headers: corsHeaders })
      }
      
      // Return search results (simplified for bypass)
      const results = {
        users: [],
        total: 0,
        timestamp: new Date().toISOString()
      }
      
      return NextResponse.json(results, { headers: corsHeaders })
    }
    
    if (action === 'get') {
      const userId = url.searchParams.get('userId')
      
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders })
      }
      
      const db = await getDb()
      const names = db.collection('names')
      
      const result = await names.findOne({ userId })
      
      return NextResponse.json({
        success: true,
        customName: result?.customName || null,
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Names API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders })
  }
}

// POST handler for name updates
export async function POST(request, { params }) {
  const { slug } = params
  
  console.log('📝 NAMES-API POST:', slug)
  
  try {
    const body = await request.json()
    const action = slug[0] || 'update'
    
    if (action === 'update') {
      const { userId, customName } = body
      
      console.log('📝 Names update bypass:', { userId, customName })
      
      if (!userId || !customName) {
        return NextResponse.json({ error: 'userId and customName required' }, { status: 400, headers: corsHeaders })
      }
      
      const db = await getDb()
      const names = db.collection('names')
      
      const result = await names.replaceOne(
        { userId },
        {
          userId,
          customName,
          updatedAt: new Date(),
          createdAt: new Date()
        },
        { upsert: true }
      )
      
      console.log('✅ Names API bypass - name saved successfully')
      
      return NextResponse.json({
        success: true,
        message: 'Name saved successfully via bypass route',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
    
  } catch (error) {
    console.error('❌ Names API POST error:', error)
    return NextResponse.json({ error: 'Failed to save name' }, { status: 500, headers: corsHeaders })
  }
}