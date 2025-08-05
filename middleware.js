import { NextResponse } from 'next/server'

// Geo-blocking configuration
const BLOCKED_COUNTRIES = [
  'AU', 'GB', 'BE', 'NL', 'AZ', // Countries
  'LA', 'MT', 'SD', 'TN', 'UT', 'WA' // US States
]

const GEO_MODE = process.env.NEXT_PUBLIC_GEO_MODE || 'audit'

export function middleware(request) {
  // Get country/region from headers (Cloudflare, Vercel, etc.)
  const country = request.headers.get('cf-ipcountry') || 
                 request.headers.get('x-vercel-ip-country') ||
                 request.geo?.country ||
                 'XX'
  
  const region = request.headers.get('cf-region') ||
                request.headers.get('x-vercel-ip-country-region') ||
                request.geo?.region ||
                ''
  
  const url = request.nextUrl.pathname
  const location = region || country
  
  // Log for audit purposes
  console.log(`[GEO-AUDIT] ${location} ${url}`)
  
  // Check if location is blocked
  const isBlocked = BLOCKED_COUNTRIES.includes(country) || 
                   BLOCKED_COUNTRIES.includes(region)
  
  if (isBlocked) {
    if (GEO_MODE === 'block') {
      // Redirect to blocked page
      if (!url.startsWith('/blocked')) {
        return NextResponse.redirect(new URL('/blocked', request.url))
      }
    } else {
      // Audit mode - just log, don't block
      console.log(`[GEO-AUDIT] Would block ${location} in production mode`)
    }
  }
  
  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}