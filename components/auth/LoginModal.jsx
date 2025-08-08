'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [authProcessed, setAuthProcessed] = useState(false)
  
  // Privy hooks
  const { login, ready, authenticated, user } = usePrivy()

  // Handle authentication state changes with useEffect
  useEffect(() => {
    // Only process authentication if modal is open and user hasn't been processed yet
    if (authenticated && user && isOpen && !authProcessed) {
      console.log('✅ User authenticated via Privy:', user)
      setAuthProcessed(true)
      
      // Send Privy authentication data to backend
      const sendPrivyAuthToBackend = async () => {
        try {
          setLoading(true)
          console.log('🔄 Sending Privy auth data to backend...')
          
          const response = await fetch('/api/auth/privy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              access_token: 'privy_token', // Privy handles tokens internally
              privy_user: user
            })
          })
          
          if (response.ok) {
            const backendData = await response.json()
            console.log('✅ Backend authentication successful:', backendData)
            
            // Create user object compatible with existing system
            const userData = {
              id: backendData.user.id,
              email: backendData.user.email,
              username: backendData.user.username,
              profile: backendData.user.profile,
              auth_method: 'privy',
              token: backendData.token
            }
            
            // Call success callback and close modal
            onSuccess(userData)
            onClose()
          } else {
            const errorData = await response.json()
            console.error('❌ Backend authentication failed:', errorData)
            alert('Authentication failed. Please try again.')
          }
        } catch (error) {
          console.error('❌ Backend authentication error:', error)
          alert('Authentication failed. Please try again.')
        } finally {
          setLoading(false)
        }
      }
      
      sendPrivyAuthToBackend()
    }
  }, [authenticated, user, isOpen, authProcessed, onSuccess, onClose])

  // Reset auth processed state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAuthProcessed(false)
      setLoading(false)
      console.log('🔄 Modal closed - resetting authentication state')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Handle Google login
  const handleGoogleLogin = () => {
    console.log('🔍 Starting Google login via Privy...')
    setLoading(true)
    
    // Use Privy's login - it will show their interface with options
    login().then(() => {
      console.log('✅ Google login initiated')
      setLoading(false)
    }).catch((error) => {
      console.error('❌ Google login error:', error)
      alert('Google login failed. Please try again.')
      setLoading(false)
    })
  }

  // Handle Email login  
  const handleEmailLogin = () => {
    console.log('🔍 Starting Email login via Privy...')
    setLoading(true)
    
    // Use Privy's login - it will show their interface with options
    login().then(() => {
      console.log('✅ Email login initiated') 
      setLoading(false)
    }).catch((error) => {
      console.error('❌ Email login error:', error)
      alert('Email login failed. Please try again.')
      setLoading(false)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900/95 border-yellow-500/30 relative">
        <CardContent className="p-8">
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Log in or sign up
            </h2>
            
            {/* Cute character mascot */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Snake/Dragon character */}
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 via-yellow-500 to-orange-600 rounded-full relative shadow-lg">
                  {/* Eyes */}
                  <div className="absolute top-4 left-4 w-4 h-4 bg-white rounded-full">
                    <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full"></div>
                  </div>
                  <div className="absolute top-4 right-4 w-4 h-4 bg-white rounded-full">
                    <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full"></div>
                  </div>
                  
                  {/* Mouth */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                    <div className="w-8 h-2 bg-black/20 rounded-full"></div>
                  </div>
                  
                  {/* Nostrils */}
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-black/30 rounded-full"></div>
                      <div className="w-1 h-1 bg-black/30 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* Red tongue */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Authentication Options */}
          <div className="space-y-4">
            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-14 border-gray-600 bg-white hover:bg-gray-50 text-gray-900 font-medium"
              onClick={handleGoogleLogin}
              disabled={loading || !ready}
            >
              <div className="flex items-center justify-center space-x-3">
                {/* Google G logo */}
                <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
              </div>
            </Button>

            {/* Email Login Button */}
            <Button
              type="button"
              className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg"
              onClick={handleEmailLogin}
              disabled={loading || !ready}
            >
              {loading ? 'Starting...' : 'Continue with Email'}
            </Button>

            {/* OR Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">or</span>
              </div>
            </div>

            {/* Additional options can go here if needed */}
          </div>

          {/* Privy branding */}
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>Protected by • privy</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}