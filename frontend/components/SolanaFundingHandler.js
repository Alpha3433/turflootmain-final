'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '../utils/privyClient'

// Client-only component to handle Solana funding
export default function SolanaFundingHandler({ onFundWalletReady }) {
  const { authenticated, ready } = usePrivy()
  const [fundWallet, setFundWallet] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Only initialize on client side when ready and authenticated
    if (typeof window !== 'undefined' && ready && authenticated) {
      const initializeFundWallet = async () => {
        try {
          console.log('🔧 Loading useFundWallet hook from Solana package...')
          
          // Dynamic import to avoid SSR issues
          const { useFundWallet } = await import('@privy-io/react-auth/solana')
          
          // We can't use the hook here since we're in useEffect
          // Instead, we'll create a wrapper component
          console.log('✅ useFundWallet module loaded successfully')
          
          // Set up a flag that the parent component can use
          if (onFundWalletReady) {
            onFundWalletReady(true)
          }
          
        } catch (error) {
          console.error('❌ Failed to load useFundWallet:', error)
          setError(error.message)
          if (onFundWalletReady) {
            onFundWalletReady(false)
          }
        }
      }

      initializeFundWallet()
    }
  }, [ready, authenticated, onFundWalletReady])

  // This component doesn't render anything
  return null
}

// Wrapper component that can use the hook
export function SolanaFundWalletProvider({ children, onFundWallet }) {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (!isClient) {
    // Server-side rendering - don't use the hook
    return children
  }
  
  // Client-side - can safely use the hook
  return <ClientSideFundWallet onFundWallet={onFundWallet}>{children}</ClientSideFundWallet>
}

function ClientSideFundWallet({ children, onFundWallet }) {
  const { authenticated, ready } = usePrivy()
  const [fundWallet, setFundWallet] = useState(null)
  
  useEffect(() => {
    if (ready && authenticated) {
      const loadFundWallet = async () => {
        try {
          const { useFundWallet } = await import('@privy-io/react-auth/solana')
          
          // We still can't use the hook here, but we can pass the module
          if (onFundWallet) {
            onFundWallet({ useFundWallet })
          }
        } catch (error) {
          console.error('Failed to load fund wallet:', error)
        }
      }
      
      loadFundWallet()
    }
  }, [ready, authenticated, onFundWallet])
  
  return children
}