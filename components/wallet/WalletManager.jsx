'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
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
  const [cashOutForm, setCashOutForm] = useState({ amount: '', currency: 'SOL', address: '' })

  // Solana connection
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed')

  useEffect(() => {
    if (authenticated && user) {
      fetchBalance()
      fetchTransactions()
    }
  }, [authenticated, user])

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

  // Handle Add Funds with Privy
  const handleAddFunds = async () => {
    if (!authenticated) {
      alert('Please login first')
      return
    }

    try {
      console.log('🎯 Attempting to open Privy wallet funding modal')
      console.log('🔍 Available Privy functions:', { fundWallet: typeof fundWallet, authenticated, user: !!user })
      
      // Check if fundWallet is available
      if (typeof fundWallet === 'function') {
        console.log('✅ fundWallet function found, calling it...')
        await fundWallet()
        console.log('✅ Privy funding modal should be open')
        
        // Refresh balance after funding (with delay for processing)
        setTimeout(() => {
          fetchBalance()
          fetchTransactions()
        }, 2000)
      } else {
        console.warn('⚠️ fundWallet function not available, using fallback modal')
        console.log('🔍 This might mean:')
        console.log('  1. Privy version doesn\'t support fundWallet')
        console.log('  2. Privy configuration doesn\'t have funding enabled')
        console.log('  3. Need to use a different Privy hook')
        
        // Fallback to custom modal
        setShowAddFunds(true)
      }
    } catch (error) {
      console.error('❌ Error opening Privy funding:', error)
      console.log('🔄 Falling back to custom modal')
      // Fallback to custom modal on error
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
      
      if (amount < 0.05) {
        alert('Minimum cash out is 0.05 SOL')
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
        alert('Invalid Solana wallet address')
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
        alert(`✅ ${data.message}`)
        setCashOutForm({ amount: '', currency: 'SOL', address: '' })
        setShowCashOut(false)
        fetchBalance()
        fetchTransactions()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error cashing out:', error)
      alert('Error processing cash out. Please try again.')
    } finally {
      setLoading(false)
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

      {/* Cash Out Modal */}
      {showCashOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-blue-500/30">
            <button 
              onClick={() => setShowCashOut(false)}
              className="absolute top-4 right-4 p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-xl font-bold text-white mb-4">Cash Out</h3>
            
            <form onSubmit={handleCashOut} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Currency</label>
                <select
                  value={cashOutForm.currency}
                  onChange={(e) => setCashOutForm({...cashOutForm, currency: e.target.value})}
                  className="w-full p-3 bg-gray-700/60 text-white rounded-xl border border-gray-600/50 focus:border-blue-400/50 focus:outline-none"
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
                  min="0.05"
                  value={cashOutForm.amount}
                  onChange={(e) => setCashOutForm({...cashOutForm, amount: e.target.value})}
                  placeholder="0.05"
                  className="w-full p-3 bg-gray-700/60 text-white rounded-xl border border-gray-600/50 focus:border-blue-400/50 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Recipient Wallet Address</label>
                <input
                  type="text"
                  value={cashOutForm.address}
                  onChange={(e) => setCashOutForm({...cashOutForm, address: e.target.value})}
                  placeholder="Enter Solana wallet address"
                  className="w-full p-3 bg-gray-700/60 text-white rounded-xl border border-gray-600/50 focus:border-blue-400/50 focus:outline-none"
                  required
                />
              </div>
              
              <div className="text-xs text-gray-400">
                Minimum cash out: 0.05 SOL • Platform fee: 10%
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Cash Out'}
              </button>
            </form>
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