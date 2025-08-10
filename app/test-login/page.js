'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestLogin() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const loginAsTestUser = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Create a simple test session without backend
      const testUserData = {
        userId: 'test-user-max-money',
        privyId: 'test-user-max-money',
        email: 'testuser@turfloot.com',
        username: 'TestPlayer',
        isTestUser: true,
        timestamp: Date.now()
      }
      
      // Store test user data in localStorage
      localStorage.setItem('test_user_session', JSON.stringify(testUserData))
      localStorage.setItem('auth_token', 'test-session-token')
      localStorage.setItem('test_user_authenticated', 'true')
      
      setMessage('✅ Successfully logged in as test user!')
      
      // Force redirect immediately and also with timeout as backup
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
      
      // Also try router push as backup
      setTimeout(() => {
        router.push('/')
      }, 1500)
      
    } catch (error) {
      setMessage('❌ Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">TurfLoot Test Login</h1>
        
        <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl mb-6">
          <h2 className="text-xl font-bold mb-4">Test Account Details</h2>
          <div className="text-left space-y-2 text-sm text-gray-300 mb-6">
            <div><strong>Email:</strong> testuser@turfloot.com</div>
            <div><strong>Username:</strong> TestPlayer</div>
            <div><strong>Balance:</strong> $10,000</div>
            <div><strong>SOL:</strong> 50.0</div>
            <div><strong>USDC:</strong> 5000.0</div>
          </div>
          
          <button
            onClick={loginAsTestUser}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:from-gray-600 disabled:to-gray-500 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? 'Logging in...' : 'Login as Test User'}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-600/20 border border-green-500/30 text-green-400' 
              : 'bg-red-600/20 border border-red-500/30 text-red-400'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-6 text-gray-400 text-sm">
          <p>⚠️ This is for testing purposes only</p>
          <p>Use this account to test cash games and wallet features</p>
        </div>
      </div>
    </div>
  )
}