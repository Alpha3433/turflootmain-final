import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('📝 Report API called')
    
    // Parse the request body
    const reportData = await request.json()
    
    // Validate required fields
    if (!reportData.reportType) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      )
    }
    
    // Log the report for admin review
    console.log('🚨 PLAYER REPORT RECEIVED:', {
      timestamp: reportData.timestamp,
      reportType: reportData.reportType,
      reportTarget: reportData.reportTarget,
      reporterId: reportData.reporterId,
      gameSession: reportData.gameSession,
      reason: reportData.reportReason,
      truncatedReason: reportData.reportReason?.substring(0, 100) + (reportData.reportReason?.length > 100 ? '...' : '')
    })
    
    // In a production environment, you would:
    // 1. Store this in a database
    // 2. Send notifications to admins
    // 3. Potentially trigger automated actions
    // 4. Track repeat offenders
    
    // For now, we'll just log it and return success
    // You can monitor these reports in the server logs
    
    // Simulate database storage (replace with actual database call)
    const report = {
      id: Date.now().toString(),
      ...reportData,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    
    // Log success
    console.log('✅ Report logged successfully:', {
      reportId: report.id,
      type: report.reportType,
      target: report.reportTarget
    })
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Report submitted successfully',
        reportId: report.id
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Report submission error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to submit report',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // This endpoint could be used by admins to view reports
    // For security, you'd want to add admin authentication here
    
    return NextResponse.json(
      { 
        message: 'Reports API is active',
        endpoints: {
          POST: 'Submit a new report',
          GET: 'View reports (admin only)'
        }
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Reports GET error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}