import { NextResponse } from 'next/server'

// Geo-blocking configuration
const BLOCKED_COUNTRIES = [
  'AU', 'GB', 'BE', 'NL', 'AZ', // Countries
  'LA', 'MT', 'SD', 'TN', 'UT', 'WA' // US States
]

const GEO_MODE = process.env.NEXT_PUBLIC_GEO_MODE || 'audit'

// Temporarily disabled middleware for debugging
export function middleware(request) {
  // Just pass through without any processing
  return NextResponse.next()
}

export const config = {
  matcher: [],
}