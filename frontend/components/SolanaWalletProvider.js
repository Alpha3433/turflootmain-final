'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// Create context for Solana wallet functionality
const SolanaWalletContext = createContext({})

export const useSolanaWalletContext = () => {
  return useContext(SolanaWalletContext)
}

export default function SolanaWalletProvider({ children, authenticated, ready }) {
  const [fundWallet, setFundWallet] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only initialize on client side when user is ready and authenticated
    if (typeof window !== 'undefined' && ready) {
      const initSolanaWallets = async () => {
        try {
          console.log('🔧 Initializing Solana wallet functionality...')
          
          // Dynamic import to avoid SSR issues
          const { useSolanaWallets } = await import('@privy-io/react-auth/solana')
          
          // We can't use the hook here directly, but we can create a function that will work
          // The hook needs to be used at component level, so we'll pass a function
          setFundWallet(() => {
            return async () => {
              try {
                console.log('💰 Attempting to trigger Privy Solana funding...')
                
                // Try to find the Privy instance and call fundWallet
                if (window.privy && window.privy.fundWallet) {
                  console.log('✅ Found window.privy.fundWallet')
                  await window.privy.fundWallet()
                  return
                }

                // Alternative: try to trigger via Privy's embedded wallet functionality
                const privyEmbeddedElement = document.querySelector('[data-privy-iframe-container]')
                if (privyEmbeddedElement) {
                  console.log('✅ Found Privy embedded element, attempting to trigger funding')
                  // Dispatch a custom event that Privy might listen for
                  const fundEvent = new CustomEvent('privy-fund-wallet')
                  window.dispatchEvent(fundEvent)
                  return
                }

                console.log('⚠️ Privy funding not available yet, showing user message')
                alert('Please log in first, then try the deposit button again.')
                
              } catch (error) {
                console.error('❌ Error in Solana funding:', error)
                alert(`Funding error: ${error.message || 'Please try refreshing the page'}`)
              }
            }
          })
          
          setIsLoading(false)
          console.log('✅ Solana wallet functionality initialized')
          
        } catch (error) {
          console.error('❌ Failed to initialize Solana wallets:', error)
          setIsLoading(false)
        }
      }

      initSolanaWallets()
    }
  }, [ready, authenticated])

  const contextValue = {
    fundWallet,
    isLoading
  }

  return (
    <SolanaWalletContext.Provider value={contextValue}>
      {children}
    </SolanaWalletContext.Provider>
  )
}