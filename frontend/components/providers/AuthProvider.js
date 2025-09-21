'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const { publicKey, signMessage } = useWallet()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('turfloot_token')
    const savedUser = localStorage.getItem('turfloot_user')
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Error parsing saved user data:', error)
        localStorage.removeItem('turfloot_token')
        localStorage.removeItem('turfloot_user')
      }
    }
    
    setLoading(false)
  }, [])

  // Authenticate with wallet signature
  const authenticateWallet = async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected')
    }

    try {
      setLoading(true)
      
      const message = `Sign this message to authenticate with TurfLoot: ${Date.now()}`
      const encodedMessage = new TextEncoder().encode(message)
      const signature = await signMessage(encodedMessage)
      
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: publicKey.toString(),
          signature: Array.from(signature),
          message
        })
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      const data = await response.json()
      
      // Save to state and localStorage
      setUser(data.user)
      setToken(data.token)
      setIsAuthenticated(true)
      
      localStorage.setItem('turfloot_token', data.token)
      localStorage.setItem('turfloot_user', JSON.stringify(data.user))
      
      return data.user
    } catch (error) {
      console.error('Wallet authentication error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const logout = () => {
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    localStorage.removeItem('turfloot_token')
    localStorage.removeItem('turfloot_user')
  }

  // Get current user data
  const getCurrentUser = async () => {
    if (!token) return null

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
        }
        throw new Error('Failed to get user data')
      }

      const data = await response.json()
      setUser(data.user)
      localStorage.setItem('turfloot_user', JSON.stringify(data.user))
      
      return data
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // Update user profile
  const updateProfile = async (profileData) => {
    if (!token || !user) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      // Refresh user data
      await getCurrentUser()
      
      return true
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    authenticateWallet,
    logout,
    getCurrentUser,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}