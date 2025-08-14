'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'

export default function DebugPrivyPage() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const [debugInfo, setDebugInfo] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('🔍 Debug Privy Page - Privy state changed:', { ready, authenticated, user: !!user })
    
    const info = {
      ready: ready,
      authenticated: authenticated,
      hasUser: !!user,
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      timestamp: new Date().toISOString()
    }
    
    setDebugInfo(info)
    
    // Test Privy services connectivity
    if (typeof window !== 'undefined') {
      fetch('https://auth.privy.io/health', { method: 'HEAD' })
        .then(response => {
          console.log('✅ Privy health check:', response.status)
          setDebugInfo(prev => ({ ...prev, privyHealthy: response.status === 200 }))
        })
        .catch(err => {
          console.error('❌ Privy health check failed:', err)
          setDebugInfo(prev => ({ ...prev, privyHealthy: false, privyError: err.message }))
        })
    }
  }, [ready, authenticated, user])

  const handleTestLogin = async () => {
    try {
      console.log('🧪 Testing Privy login...')
      setError(null)
      await login()
      console.log('✅ Login initiated')
    } catch (err) {
      console.error('❌ Login failed:', err)
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🔍 Privy Debug Console</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Privy State */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-blue-400">Privy State</h2>
          <div className="space-y-2">
            <div className={`flex items-center space-x-2 ${ready ? 'text-green-400' : 'text-red-400'}`}>
              <span>{ready ? '✅' : '❌'}</span>
              <span>Ready: {ready.toString()}</span>
            </div>
            <div className={`flex items-center space-x-2 ${authenticated ? 'text-green-400' : 'text-yellow-400'}`}>
              <span>{authenticated ? '✅' : '⚪'}</span>
              <span>Authenticated: {authenticated.toString()}</span>
            </div>
            <div className={`flex items-center space-x-2 ${user ? 'text-green-400' : 'text-yellow-400'}`}>
              <span>{user ? '✅' : '⚪'}</span>
              <span>User: {user ? 'Present' : 'None'}</span>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-green-400">Environment</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">App ID:</span>
              <span className="ml-2 font-mono text-yellow-300">
                {debugInfo.appId ? `${debugInfo.appId.substring(0, 15)}...` : 'MISSING'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Privy Health:</span>
              <span className={`ml-2 ${debugInfo.privyHealthy === true ? 'text-green-400' : debugInfo.privyHealthy === false ? 'text-red-400' : 'text-yellow-400'}`}>
                {debugInfo.privyHealthy === true ? 'Healthy' : debugInfo.privyHealthy === false ? 'Failed' : 'Checking...'}
              </span>
            </div>
            {debugInfo.privyError && (
              <div>
                <span className="text-gray-400">Error:</span>
                <span className="ml-2 text-red-400 text-xs">{debugInfo.privyError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-purple-400">Actions</h2>
          <div className="space-y-3">
            <button
              onClick={handleTestLogin}
              disabled={!ready}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {ready ? 'Test Login' : 'Waiting for Privy...'}
            </button>
            
            {authenticated && (
              <button
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900 border border-red-600 rounded-lg text-red-200 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-orange-400">Debug Info</h2>
          <pre className="text-xs bg-gray-900 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-8 text-center">
        <a 
          href="/" 
          className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-white font-medium"
        >
          ← Back to TurfLoot
        </a>
      </div>
    </div>
  )
}