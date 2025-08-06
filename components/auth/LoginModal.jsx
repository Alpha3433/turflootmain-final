'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { X, Mail } from 'lucide-react'

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handleGoogleLogin = () => {
    // Implement Google OAuth
    alert('Google login not implemented yet')
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

              {/* Google login */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 border-gray-600 bg-gray-800/30 hover:bg-gray-700 text-white"
                onClick={handleGoogleLogin}
              >
                <div className="flex items-center justify-center space-x-3">
                  {/* Google icon */}
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500"></div>
                  <span>Google</span>
                </div>
              </Button>

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