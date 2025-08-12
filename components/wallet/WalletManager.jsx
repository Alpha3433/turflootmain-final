'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets, useFundWallet } from '@privy-io/react-auth'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

const WalletManager = ({ onBalanceUpdate }) => {
  const { authenticated, user, login, connectWallet } = usePrivy()
  const { wallets } = useWallets()
  const [balance, setBalance] = useState({ balance: 0, sol_balance: 0, usdc_balance: 0 })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [showCashOut, setShowCashOut] = useState(false)
  const [addFundsForm, setAddFundsForm] = useState({ amount: '', currency: 'SOL' })
  const [cashOutForm, setCashOutForm] = useState({ amount: '', currency: 'USD', address: '' })
  
  // Define fetch functions first
  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBalance(data)
        if (onBalanceUpdate) onBalanceUpdate(data)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/wallet/transactions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }
  
  // Now initialize useFundWallet hook with better error handling
  const { fundWallet } = useFundWallet({
    onUserExited: ({ balance }) => {
      console.log('💰 Privy funding flow exited, balance:', balance)
      // Refresh balance after funding
      fetchBalance()
      fetchTransactions()
    },
    onError: (error) => {
      console.error('💥 Privy funding error:', error)
    },
    onFundingMethodSelected: (method) => {
      console.log('💳 Funding method selected:', method)
    }
  })

  // Solana connection
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed')

  useEffect(() => {
    if (authenticated && user) {
      fetchBalance()
      fetchTransactions()
    }
  }, [authenticated, user])

  // Handle Add Funds with Privy
  const handleAddFunds = async () => {
    if (!authenticated) {
      alert('Please login first')
      return
    }

    try {
      console.log('🎯 Attempting to open Privy wallet funding modal')
      console.log('🔍 Debug info:', { 
        fundWallet: typeof fundWallet, 
        fundWalletAvailable: !!fundWallet,
        walletsCount: wallets?.length || 0,
        userWallet: user?.wallet?.address,
        authenticated,
        userId: user?.id
      })
      
      // Get user's wallet address
      let walletAddress = null
      
      if (wallets && wallets.length > 0) {
        walletAddress = wallets[0].address
        console.log('💳 Using connected wallet address:', walletAddress)
      } else if (user?.wallet?.address) {
        walletAddress = user.wallet.address
        console.log('💳 Using user wallet address:', walletAddress)
      }
      
      if (!walletAddress) {
        console.log('📱 No wallet address found, trying to connect wallet first...')
        if (typeof connectWallet === 'function') {
          console.log('🔗 Attempting wallet connection...')
          await connectWallet()
          console.log('✅ Wallet connection initiated')
          return
        } else {
          console.log('⚠️ No wallet connection available, showing custom modal')
          setShowAddFunds(true)
          return
        }
      }
      
      // Try to use Privy's native funding modal
      if (typeof fundWallet === 'function') {
        console.log('🚀 Attempting to open Privy native funding modal for:', walletAddress)
        
        try {
          await fundWallet(walletAddress, {
            uiConfig: {
              receiveFundsTitle: 'Add Funds to Your TurfLoot Wallet',
              receiveFundsSubtitle: 'Choose a method to add funds and start playing.',
            },
          })
          console.log('✅ Privy funding modal should have opened')
          return
        } catch (privyError) {
          console.error('❌ Privy fundWallet failed:', privyError)
          console.log('📋 Error details:', {
            message: privyError.message,
            name: privyError.name,
            stack: privyError.stack?.substring(0, 200)
          })
          throw privyError
        }
      } else {
        console.log('⚠️ fundWallet function not available, type:', typeof fundWallet)
        console.log('🔄 Falling back to custom modal')
        setShowAddFunds(true)
      }
      
    } catch (error) {
      console.error('❌ Error opening Privy funding modal:', error)
      console.log('📋 Full error details:', {
        message: error.message,
        name: error.name,
        cause: error.cause
      })
      console.log('🔄 Falling back to custom modal')
      setShowAddFunds(true)
    }
  }

  const handleCashOut = async (e) => {
    e.preventDefault()
    
    if (!authenticated) {
      alert('Please login first')
      return
    }

    setLoading(true)
    
    try {
      const amount = parseFloat(cashOutForm.amount)
      const minCashOut = cashOutForm.currency === 'SOL' ? 0.05 : 20 // 0.05 SOL or $20 USD
      const platformFeePercent = 10
      const platformFee = amount * (platformFeePercent / 100)
      const netAmount = amount - platformFee
      
      // Enhanced validation
      if (amount < minCashOut) {
        const minDisplay = cashOutForm.currency === 'SOL' ? '0.05 SOL' : '$20 USD'
        alert(`Minimum cash out is ${minDisplay}`)
        setLoading(false)
        return
      }

      // Check if user has sufficient balance
      const availableBalance = cashOutForm.currency === 'SOL' ? balance.sol_balance : balance.balance
      if (amount > availableBalance) {
        alert(`Insufficient balance. Available: ${availableBalance.toFixed(4)} ${cashOutForm.currency}`)
        setLoading(false)
        return
      }

      if (!cashOutForm.address) {
        alert('Please enter recipient wallet address')
        setLoading(false)
        return
      }

      // Validate Solana address
      try {
        new PublicKey(cashOutForm.address)
      } catch (err) {
        alert('Invalid Solana wallet address. Please enter a valid Solana address.')
        setLoading(false)
        return
      }
      
      // Confirmation dialog with fee breakdown
      const feeDisplay = `${platformFee.toFixed(4)} ${cashOutForm.currency}`
      const netDisplay = `${netAmount.toFixed(4)} ${cashOutForm.currency}`
      const confirmMessage = `Confirm Cash Out:\n\nAmount: ${amount} ${cashOutForm.currency}\nPlatform Fee (10%): ${feeDisplay}\nYou'll receive: ${netDisplay}\n\nProceed?`
      
      if (!confirm(confirmMessage)) {
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/wallet/cash-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          amount,
          currency: cashOutForm.currency,
          recipient_address: cashOutForm.address
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        alert(`✅ Cash out successful! ${data.message}\n\nTransaction will be processed within 24 hours.`)
        setCashOutForm({ amount: '', currency: 'SOL', address: '' })
        setShowCashOut(false)
        fetchBalance()
        fetchTransactions()
      } else {
        alert(`❌ Cash out failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error cashing out:', error)
      alert('Error processing cash out. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle MAX button for cash out (USD only)
  const handleMaxCashOut = () => {
    const availableBalance = balance.balance // Always use USD balance
    const minCashOut = 0.21 // $0.20 + $0.01 minimum
    
    if (availableBalance >= minCashOut) {
      setCashOutForm({ ...cashOutForm, amount: availableBalance.toFixed(2) })
    } else {
      alert(`Insufficient balance for minimum cash out of $${minCashOut.toFixed(2)} USD`)
    }
  }

  // Calculate fee display for cash out
  const getCashOutFeeInfo = () => {
    const amount = parseFloat(cashOutForm.amount) || 0
    const platformFee = amount * 0.1 // 10% fee
    const netAmount = amount - platformFee
    
    return {
      amount: amount,
      fee: platformFee,
      net: netAmount,
      feeDisplay: `${platformFee.toFixed(4)} ${cashOutForm.currency}`,
      netDisplay: `${netAmount.toFixed(4)} ${cashOutForm.currency}`
    }
  }

  if (!authenticated) {
    return (
      <div className="text-center py-6">
        <div className="text-gray-400 text-sm mb-4">Login to access wallet features</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Balance Display */}
      <div className="text-center py-4">
        <div className="text-3xl font-black text-white mb-2">${balance.balance.toFixed(2)}</div>
        <div className="text-gray-400 text-sm mb-2">Game Balance</div>
        <div className="text-xs text-gray-500">
          {balance.sol_balance.toFixed(4)} SOL • {balance.usdc_balance.toFixed(2)} USDC
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          onClick={handleAddFunds}
          className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-400 font-bold text-sm transition-all hover:scale-105"
        >
          Add Funds
        </button>
        <button 
          onClick={() => setShowCashOut(true)}
          className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 font-bold text-sm transition-all hover:scale-105"
        >
          Cash Out
        </button>
      </div>

      {/* Add Funds Modal */}
      {showAddFunds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-green-500/30">
            <button 
              onClick={() => setShowAddFunds(false)}
              className="absolute top-4 right-4 p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-xl font-bold text-white mb-4">Add Funds</h3>
            
            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Currency</label>
                <select
                  value={addFundsForm.currency}
                  onChange={(e) => setAddFundsForm({...addFundsForm, currency: e.target.value})}
                  className="w-full p-3 bg-gray-700/60 text-white rounded-xl border border-gray-600/50 focus:border-green-400/50 focus:outline-none"
                >
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Amount</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.01"
                  value={addFundsForm.amount}
                  onChange={(e) => setAddFundsForm({...addFundsForm, amount: e.target.value})}
                  placeholder="0.01"
                  className="w-full p-3 bg-gray-700/60 text-white rounded-xl border border-gray-600/50 focus:border-green-400/50 focus:outline-none"
                  required
                />
              </div>
              
              <div className="text-xs text-gray-400">
                Minimum deposit: 0.01 SOL
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Add Funds'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cash Out Modal - Fixed True Center Positioning */}
      {showCashOut && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl mx-4 border border-gray-700 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💸</span>
                <h2 className="text-2xl font-bold text-white">Cash Out</h2>
              </div>
              <button 
                onClick={() => setShowCashOut(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pb-6 space-y-6">
              {/* Available Balance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <span className="text-gray-300 text-lg font-medium">Available Balance</span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-500">${balance.balance.toFixed(2)}</div>
                  <div className="text-gray-400 text-base">{balance.sol_balance.toFixed(6)} SOL</div>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              <div className="bg-red-900/30 border border-red-600/50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-red-400">
                  <span className="text-xl">⚠️</span>
                  <span className="text-base font-medium">
                    Insufficient balance for cashout. Minimum $0.20 + $0.01 required.
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.21"
                    value={cashOutForm.amount}
                    onChange={(e) => setCashOutForm({...cashOutForm, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full text-3xl font-normal bg-gray-800 text-white rounded-xl border border-gray-600 focus:border-blue-400 focus:outline-none p-4 pr-32"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
                    <span className="text-gray-400 text-xl font-medium">USD</span>
                    <button
                      type="button"
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded transition-colors"
                    >
                      ⇅
                    </button>
                    <button
                      type="button"
                      onClick={handleMaxCashOut}
                      className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-black text-sm font-bold rounded transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Percentage Slider */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-600 rounded-full border-2 border-gray-500"></div>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full">
                      <div className="h-full w-0 bg-cyan-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-center text-gray-400 text-base">0% of available balance</div>
                </div>
              </div>

              {/* Destination Wallet Address */}
              <div className="space-y-3">
                <label className="block text-gray-300 text-lg font-medium">Destination Wallet Address</label>
                <input
                  type="text"
                  value={cashOutForm.address}
                  onChange={(e) => setCashOutForm({...cashOutForm, address: e.target.value})}
                  placeholder="Enter Solana wallet address..."
                  className="w-full p-4 bg-gray-800 text-white rounded-xl border border-gray-600 focus:border-blue-400 focus:outline-none font-mono text-base"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCashOut(false)}
                  className="flex-1 py-4 px-6 bg-transparent border-2 border-gray-500 text-white font-semibold rounded-xl hover:bg-gray-700/30 transition-colors text-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCashOut}
                  disabled={loading || !cashOutForm.amount || !cashOutForm.address}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {loading ? 'Processing...' : '💸 Cash Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-gray-300 text-sm mb-2">Recent Transactions</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-lg text-xs">
                <div>
                  <span className={`font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-blue-400'}`}>
                    {tx.type === 'deposit' ? '↓' : '↑'} {tx.amount} {tx.currency}
                  </span>
                  <div className="text-gray-500">
                    {tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'} {tx.status}
                  </div>
                </div>
                <div className="text-gray-400">
                  {new Date(tx.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletManager