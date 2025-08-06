'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet, 
  RefreshCw, 
  Copy, 
  ExternalLink,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

export function WalletBalance() {
  const { publicKey, connected } = useWallet()
  const [balance, setBalance] = useState(null)
  const [usdValue, setUsdValue] = useState(null)
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(false)
  const [priceChange, setPriceChange] = useState(0)

  // Fetch wallet balance
  const fetchBalance = async () => {
    if (!publicKey || !connected) return

    try {
      setLoading(true)
      
      // Fetch SOL balance
      const balanceResponse = await fetch(`/api/wallet/${publicKey.toString()}/balance`)
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        setBalance(balanceData.sol_balance)
        setUsdValue(balanceData.usd_value)
      }

      // Fetch token accounts
      const tokensResponse = await fetch(`/api/wallet/${publicKey.toString()}/tokens`)
      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json()
        setTokens(tokensData.tokens)
      }

      // Simulate price change (in real app, fetch from price API)
      setPriceChange((Math.random() - 0.5) * 10)
      
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and interval
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance()
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchBalance, 30000)
      return () => clearInterval(interval)
    }
  }, [connected, publicKey])

  // Copy wallet address
  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString())
    }
  }

  // Open in Solana Explorer
  const openInExplorer = () => {
    if (publicKey) {
      const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet'
      window.open(`https://explorer.solana.com/address/${publicKey.toString()}${network}`, '_blank')
    }
  }

  if (!connected || !publicKey) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Connect your wallet to view balance</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Wallet Balance
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchBalance}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Badge variant="outline" className="text-xs">
                {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* SOL Balance */}
            <div>
              <div className="text-3xl font-bold text-accent">
                {loading ? '...' : balance?.toFixed(4) || '0.0000'} SOL
              </div>
              {usdValue && (
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">
                    ≈ ${usdValue.toFixed(2)} USD
                  </span>
                  {priceChange !== 0 && (
                    <div className={`flex items-center text-xs ${
                      priceChange > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {priceChange > 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(priceChange).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Wallet Address */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="font-mono text-sm">
                  {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openInExplorer}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Holdings */}
      {tokens.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-sm">Token Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {tokens.map((token, index) => (
                <div key={token.mint} className="flex items-center justify-between p-2 rounded bg-muted/20">
                  <div>
                    <div className="font-medium text-sm">
                      {token.name || `Token ${index + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {token.amount?.toFixed(token.decimals || 2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}