'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { X, Mail } from 'lucide-react'

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Privy hooks
  const { login, ready, authenticated, user } = usePrivy()

  // Handle successful Privy authentication
  const handlePrivyLogin = () => {
    console.log('🔍 Starting Privy authentication...')
    setLoading(true)
    
    login().then(() => {
      console.log('✅ Privy login initiated')
    }).catch((error) => {
      console.error('❌ Privy login error:', error)
      alert('Login failed. Please try again.')
      setLoading(false)
    })
  }

  // Handle authentication state changes
  if (authenticated && user) {
    console.log('✅ User authenticated via Privy:', user)
    
    // Create user object compatible with existing system
    const userData = {
      id: user.id,
      email: user.email?.address || user.google?.email || user.twitter?.email,
      username: user.google?.name || user.twitter?.name || user.email?.address?.split('@')[0] || `user_${Date.now()}`,
      profile: {
        avatar_url: user.google?.picture || user.twitter?.profilePictureUrl,
        display_name: user.google?.name || user.twitter?.name || user.email?.address?.split('@')[0],
      },
      auth_method: 'privy'
    }
    
    // Call success callback and close modal
    onSuccess(userData)
    onClose()
    return null
  }

  if (!isOpen) return null

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Send OTP to email
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      if (response.ok) {
        setStep('otp')
      } else {
        alert('Failed to send OTP. Please try again.')
      }
    } catch (error) {
      console.error('OTP send failed:', error)
      alert('Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      })
      
      if (response.ok) {
        const data = await response.json()
        onSuccess(data)
        onClose()
      } else {
        alert('Invalid OTP. Please try again.')
      }
    } catch (error) {
      console.error('OTP verification failed:', error)
      alert('Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
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
              {step === 'email' ? 'Log in or sign up' : 'Enter verification code'}
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

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              {/* Email input */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500"
                  required
                />
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Submit'}
              </Button>

              {/* Google login - Official Google button */}
              <div className="space-y-3">
                {/* Official Google Sign-In button */}
                <div ref={googleButtonRef} className="flex justify-center"></div>
                
                {/* Custom Google button (fallback) */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-gray-600 bg-white hover:bg-gray-50 text-gray-900 font-medium"
                  onClick={handleCustomGoogleClick}
                  disabled={loading}
                >
                  <div className="flex items-center justify-center space-x-3">
                    {/* Google G logo */}
                    <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </div>
                </Button>
              </div>

              {/* Terms */}
              <p className="text-sm text-gray-400 text-center">
                By logging in I agree to the{' '}
                <span className="text-yellow-500">Terms & Privacy Policy</span>
              </p>

              {/* Privy branding */}
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <span>Protected by</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="font-semibold text-white">privy</span>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-gray-400">
                  We sent a 6-digit code to<br />
                  <span className="text-yellow-500 font-semibold">{email}</span>
                </p>
              </div>

              {/* OTP input */}
              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-center text-2xl font-mono h-14 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500"
                maxLength={6}
                required
              />

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              {/* Back button */}
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-400 hover:text-white"
                onClick={() => setStep('email')}
              >
                ← Back to email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}