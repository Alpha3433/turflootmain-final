import { NextResponse } from 'next/server'

// Simple health check endpoint to test routing
export async function GET() {
  console.log('🏥 HEALTH CHECK: Direct route accessed')
  
  return NextResponse.json(
    { 
      status: 'healthy',
      service: 'turfloot-api',
      timestamp: new Date().toISOString(),
      route: 'direct-health-check'
    },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'X-Health-Check': 'TurfLoot-Direct'
      }
    }
  )
}

export async function POST() {
  return GET()
}