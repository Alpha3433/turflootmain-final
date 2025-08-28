import { NextResponse } from 'next/server'

// Enhanced middleware for external API access
export function middleware(request) {
  const { pathname } = request.nextUrl
  
  console.log('🔀 MIDDLEWARE: Processing request for path:', pathname)
  console.log('🔀 MIDDLEWARE: Method:', request.method)
  console.log('🔀 MIDDLEWARE: Host:', request.headers.get('host'))
  
  // Handle OPTIONS preflight requests for CORS
  if (request.method === 'OPTIONS') {
    console.log('🔀 MIDDLEWARE: Handling OPTIONS preflight request')
    
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Access-Control-Max-Age': '86400',
        'X-Preflight-Handled': 'TurfLoot-Middleware'
      }
    })
  }
  
  // Add security headers and API-specific enhancements
  const response = NextResponse.next()
  
  // Standard security headers
  response.headers.set('X-Frame-Options', 'ALLOWALL')
  response.headers.set('Content-Security-Policy', 'frame-ancestors *;')
  
  // Enhanced CORS headers for all requests
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
  
  // API-specific enhancements
  if (pathname.startsWith('/api/')) {
    console.log('🔀 MIDDLEWARE: API route detected - enhancing for external access')
    
    // Add API identification headers
    response.headers.set('X-API-Gateway', 'TurfLoot-NextJS')
    response.headers.set('X-External-Access', 'Enhanced')
    response.headers.set('X-Route-Path', pathname)
    
    // Prevent caching issues that might cause 502 errors
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for enhanced CORS handling
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}