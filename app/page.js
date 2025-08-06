'use client'

import { useState } from 'react'

import LoginModal from '@/components/auth/LoginModal'
import InteractiveGridCanvas from '@/components/game/InteractiveGridCanvas'
import HeroContent from '@/components/game/HeroContent'

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState(0)
  const [selectedStake, setSelectedStake] = useState(5)
  const [userProfile, setUserProfile] = useState(null)
  const [walletAddress, setWalletAddress] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(true)  // Force modal open for testing

  const handleWalletConnect = async () => {
    if (!isConnected) {
      // Simulate wallet connection - in real implementation, this would use Solana wallet adapter
      const mockWalletAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
      setWalletAddress(mockWalletAddress)
      
      try {
        // Check wallet balance
        const balanceResponse = await fetch(`/api/wallet/${mockWalletAddress}/balance`)
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          setBalance(balanceData.sol_balance || 0)
        }

        // Authenticate user
        const authResponse = await fetch('/api/auth/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: mockWalletAddress,
            signature: 'mock_signature',
            message: 'mock_message'
          })
        })

        if (authResponse.ok) {
          const authData = await authResponse.json()
          setUserProfile(authData.user)
          setIsConnected(true)
        }
      } catch (error) {
        console.error('Wallet connection failed:', error)
      }
    } else {
      // Disconnect
      setIsConnected(false)
      setUserProfile(null)
      setWalletAddress('')
      setBalance(0)
    }
  }

  const handleLoginSuccess = (userData) => {
    // Handle successful login from modal
    setUserProfile(userData.user)
    setIsConnected(true)
    console.log('Login successful:', userData)
  }

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden">
      {/* Interactive Hero Section - Full Screen */}
      <section className="relative h-full overflow-hidden">
        {/* Interactive Grid Canvas - Background Layer */}
        <InteractiveGridCanvas />
        
        {/* Hero Content - Foreground Layer */}
        <HeroContent 
          selectedStake={selectedStake}
          setSelectedStake={setSelectedStake}
          isConnected={isConnected}
          handleWalletConnect={handleWalletConnect}
          setShowLoginModal={setShowLoginModal}
          balance={balance}
          userProfile={userProfile}
        />
      </section>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
