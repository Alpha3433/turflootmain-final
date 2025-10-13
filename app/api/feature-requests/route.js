import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../lib/mongodb.js'

// POST /api/feature-requests - Submit a new feature request
export async function POST(request) {
  try {
    const body = await request.json()
    const { category, request: featureRequest, userIdentifier, userName, timestamp } = body
    
    if (!category || !featureRequest) {
      return NextResponse.json({ error: 'Category and request are required' }, { status: 400 })
    }
    
    console.log(`💡 New feature request: [${category}] from ${userName}`)
    
    // Send to Airtable
    const airtableApiKey = process.env.AIRTABLE_API_KEY
    const airtableBaseId = process.env.AIRTABLE_BASE_ID
    const airtableTableName = process.env.AIRTABLE_TABLE_NAME || 'Feature Requests'
    
    let airtableRecordId = null
    
    if (airtableApiKey && airtableBaseId) {
      try {
        console.log('📊 Sending feature request to Airtable...')
        
        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                'Category': category,
                'Request': featureRequest.trim(),
                'User Name': userName || 'Anonymous',
                'User ID': userIdentifier || 'anonymous',
                'Status': 'Pending',
                'Submitted At': new Date(timestamp || Date.now()).toISOString(),
                'Upvotes': 0
              }
            })
          }
        )
        
        if (airtableResponse.ok) {
          const airtableData = await airtableResponse.json()
          airtableRecordId = airtableData.id
          console.log(`✅ Feature request saved to Airtable: ${airtableRecordId}`)
        } else {
          const errorText = await airtableResponse.text()
          console.error('❌ Airtable API error:', errorText)
        }
      } catch (airtableError) {
        console.error('❌ Error sending to Airtable:', airtableError)
        // Continue to save to MongoDB even if Airtable fails
      }
    } else {
      console.warn('⚠️ Airtable credentials not configured, skipping Airtable sync')
    }
    
    // Also save to MongoDB as backup
    const { db } = await connectToDatabase()
    const featureRequestsCollection = db.collection('feature_requests')
    
    // Create feature request document
    const requestDoc = {
      category,
      request: featureRequest.trim(),
      userIdentifier: userIdentifier || 'anonymous',
      userName: userName || 'Anonymous',
      status: 'pending',
      submittedAt: new Date(timestamp || Date.now()),
      upvotes: 0,
      comments: [],
      airtableRecordId: airtableRecordId
    }
    
    await featureRequestsCollection.insertOne(requestDoc)
    
    console.log(`✅ Feature request saved to MongoDB: ${requestDoc._id}`)
    
    return NextResponse.json({
      success: true,
      message: 'Feature request submitted successfully',
      requestId: requestDoc._id,
      airtableRecordId: airtableRecordId
    })
    
  } catch (error) {
    console.error('❌ Error submitting feature request:', error)
    return NextResponse.json(
      { error: 'Failed to submit feature request', message: error.message },
      { status: 500 }
    )
  }
}

// GET /api/feature-requests - Get all feature requests (for admin panel)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    
    const { db } = await connectToDatabase()
    const featureRequestsCollection = db.collection('feature_requests')
    
    // Build query filter
    const filter = {}
    if (category && category !== 'all') filter.category = category
    if (status && status !== 'all') filter.status = status
    
    const requests = await featureRequestsCollection
      .find(filter)
      .sort({ submittedAt: -1 })
      .limit(100)
      .toArray()
    
    return NextResponse.json({
      success: true,
      requests: requests.map(req => ({
        id: req._id,
        category: req.category,
        request: req.request,
        userName: req.userName,
        status: req.status,
        submittedAt: req.submittedAt,
        upvotes: req.upvotes || 0
      }))
    })
    
  } catch (error) {
    console.error('❌ Error fetching feature requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feature requests', message: error.message },
      { status: 500 }
    )
  }
}
