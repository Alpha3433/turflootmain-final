// Smart API Router - tries standard routes first, falls back to bypass only if needed

class SmartApiRouter {
  constructor() {
    this.routeStatus = new Map() // Cache which routes work/fail
    this.testingInProgress = new Set() // Prevent duplicate tests
  }

  // Test if a standard API route works
  async testStandardRoute(endpoint) {
    if (typeof window === 'undefined') return false
    
    const cacheKey = `standard_${endpoint}`
    
    // Return cached result if available
    if (this.routeStatus.has(cacheKey)) {
      return this.routeStatus.get(cacheKey)
    }
    
    // Prevent duplicate testing
    if (this.testingInProgress.has(cacheKey)) {
      return false // Assume failure during testing
    }
    
    this.testingInProgress.add(cacheKey)
    
    try {
      const testUrl = endpoint.includes('?') 
        ? `${endpoint}&test=connectivity` 
        : `${endpoint}?test=connectivity`
        
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'X-Connectivity-Test': 'true' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      const works = response.ok || response.status === 404 // 404 is better than timeout/502
      this.routeStatus.set(cacheKey, works)
      
      console.log(`🔍 Standard route test: ${endpoint} → ${works ? 'WORKS' : 'BLOCKED'}`)
      return works
      
    } catch (error) {
      console.log(`🔍 Standard route test: ${endpoint} → FAILED (${error.message})`)
      this.routeStatus.set(cacheKey, false)
      return false
    } finally {
      this.testingInProgress.delete(cacheKey)
    }
  }

  // Get the best URL for an endpoint
  async getApiUrl(endpoint) {
    if (typeof window === 'undefined') {
      return endpoint // SSR fallback
    }
    
    const isLocalDevelopment = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    
    // Always use standard routes for local development
    if (isLocalDevelopment) {
      return `http://localhost:3000${endpoint}`
    }
    
    // For external deployment, test if standard routes work
    const standardWorks = await this.testStandardRoute(endpoint)
    
    if (standardWorks) {
      console.log(`✅ Using standard route: ${endpoint}`)
      return endpoint
    }
    
    // Fall back to bypass routes only if standard routes fail
    console.log(`🔄 Falling back to bypass route for: ${endpoint}`)
    
    if (endpoint.startsWith('/api/friends/')) {
      return endpoint.replace('/api/friends/', '/friends-api/')
    }
    
    if (endpoint.startsWith('/api/names/')) {
      return endpoint.replace('/api/names/', '/names-api/')
    }
    
    // For other APIs, return as-is and let them fail naturally
    return endpoint
  }

  // Sync version for immediate use (uses cached results)
  getApiUrlSync(endpoint) {
    if (typeof window === 'undefined') {
      return endpoint
    }
    
    const isLocalDevelopment = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    
    if (isLocalDevelopment) {
      return `http://localhost:3000${endpoint}`
    }
    
    // Check if we have cached knowledge about this route
    const cacheKey = `standard_${endpoint}`
    const standardWorks = this.routeStatus.get(cacheKey)
    
    if (standardWorks === true) {
      return endpoint
    }
    
    if (standardWorks === false) {
      // Use bypass routes
      if (endpoint.startsWith('/api/friends/')) {
        return endpoint.replace('/api/friends/', '/friends-api/')
      }
      
      if (endpoint.startsWith('/api/names/')) {
        return endpoint.replace('/api/names/', '/names-api/')
      }
    }
    
    // Default: return standard route (will test on first use)
    return endpoint
  }

  // Clear cached results (for manual refresh)
  clearCache() {
    this.routeStatus.clear()
    console.log('🔄 API route cache cleared')
  }

  // Get current route status for debugging
  getRouteStatus() {
    return Object.fromEntries(this.routeStatus)
  }
}

// Global instance
export const smartRouter = new SmartApiRouter()

// Helper hook for React components
export const useSmartApiUrl = () => {
  const getApiUrl = async (endpoint) => {
    return await smartRouter.getApiUrl(endpoint)
  }

  const getApiUrlSync = (endpoint) => {
    return smartRouter.getApiUrlSync(endpoint)
  }

  return { getApiUrl, getApiUrlSync }
}