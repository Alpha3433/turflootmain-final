// API Routing Configuration
// Central place to control routing behavior across the application

export const API_ROUTING_CONFIG = {
  // Set to false when Kubernetes ingress is fixed to allow /api/* routes
  USE_BYPASS_ROUTING: true,
  
  // Routes that are known to be blocked externally
  BLOCKED_ROUTES: [
    '/api/friends/',
    '/api/names/'
  ],
  
  // Bypass route mappings
  BYPASS_MAPPINGS: {
    '/api/friends/': '/friends-api/',
    '/api/names/': '/names-api/',
    '/api/lobby/': '/lobby-api/',
    '/api/party/': '/party-api/'
  },
  
  // Enable debug logging for route selection
  DEBUG_ROUTING: true
}

/**
 * Smart API URL resolver
 * Prefers standard routes, falls back to bypass only when needed
 */
export function getApiUrl(endpoint) {
  if (typeof window === 'undefined') {
    return endpoint // SSR fallback
  }
  
  const isLocalDevelopment = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  
  // Always use standard routes for localhost
  if (isLocalDevelopment) {
    return `http://localhost:3000${endpoint}`
  }
  
  // Infrastructure workaround for external deployment
  if (API_ROUTING_CONFIG.USE_BYPASS_ROUTING) {
    for (const [blockedRoute, bypassRoute] of Object.entries(API_ROUTING_CONFIG.BYPASS_MAPPINGS)) {
      if (endpoint.startsWith(blockedRoute)) {
        const newEndpoint = endpoint.replace(blockedRoute, bypassRoute)
        
        if (API_ROUTING_CONFIG.DEBUG_ROUTING) {
          console.log(`🔄 Infrastructure workaround: ${endpoint} → ${newEndpoint}`)
        }
        
        return newEndpoint
      }
    }
  }
  
  // Default: use standard routes (preferred)
  if (API_ROUTING_CONFIG.DEBUG_ROUTING && !isLocalDevelopment) {
    console.log(`✅ Using standard route: ${endpoint}`)
  }
  
  return endpoint
}

/**
 * Test if standard API routes are working
 * Returns true if infrastructure issue is resolved
 */
export async function testStandardRoutes() {
  const testEndpoints = ['/api/ping', '/api/friends/list?userId=test', '/api/names/get?userId=test']
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      // If we get any response (even 404), the route works
      if (response.ok || response.status === 404) {
        console.log(`✅ Standard route working: ${endpoint}`)
        continue
      } else {
        console.log(`❌ Standard route failed: ${endpoint} (${response.status})`)
        return false
      }
    } catch (error) {
      console.log(`❌ Standard route failed: ${endpoint} (${error.message})`)
      return false
    }
  }
  
  console.log('🎉 All standard routes working! Infrastructure issue resolved.')
  return true
}

/**
 * Automatically disable bypass routing if standard routes work
 */
export async function autoConfigureRouting() {
  if (typeof window === 'undefined') return
  
  const isLocalDevelopment = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
    
  // Only test on external deployment
  if (!isLocalDevelopment && API_ROUTING_CONFIG.USE_BYPASS_ROUTING) {
    console.log('🔍 Testing if standard API routes work...')
    
    const standardRoutesWork = await testStandardRoutes()
    
    if (standardRoutesWork) {
      API_ROUTING_CONFIG.USE_BYPASS_ROUTING = false
      console.log('✅ Switched to standard routes - infrastructure issue resolved!')
    } else {
      console.log('🔄 Continuing to use bypass routes - infrastructure issue persists')
    }
  }
}

export default {
  getApiUrl,
  testStandardRoutes,
  autoConfigureRouting,
  config: API_ROUTING_CONFIG
}