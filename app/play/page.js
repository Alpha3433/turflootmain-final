'use client'

import { useState, useEffect, useRef } from 'react'
// import { motion } from 'framer-motion' // TODO: Add back when framer-motion is installed
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Wallet, 
  LogOut, 
  DollarSign, 
  MapPin, 
  Clock, 
  Trophy,
  ArrowLeft,
  Zap,
  Copy,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Temporary motion replacement
const motion = {
  div: ({ children, initial, animate, transition, className, ...props }) => 
    <div className={className} {...props}>{children}</div>
}

// Simple wallet connection component (placeholder for Solana)
function WalletConnect({ onWalletConnect, walletAddress }) {
  const [isConnecting, setIsConnecting] = useState(false)
  
  const handleConnect = async () => {
    setIsConnecting(true)
    // Simulate wallet connection
    setTimeout(() => {
      const mockWallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      onWalletConnect(mockWallet)
      setIsConnecting(false)
    }, 1000)
  }
  
  const handleDisconnect = () => {
    onWalletConnect(null)
  }
  
  return (
    <div className="flex items-center space-x-2">
      {walletAddress ? (
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 bg-[#14F195]/20 text-[#14F195] rounded text-sm font-mono">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button onClick={handleConnect} disabled={isConnecting} className="bg-[#14F195] hover:bg-[#14F195]/90 text-black">
          <Wallet className="w-4 h-4 mr-2" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      )}
    </div>
  )
}

// Game stats sidebar component
function GameSidebar({ 
  walletAddress, 
  solBalance, 
  territoryPercent, 
  usdValue, 
  timeRemaining, 
  gameActive, 
  onCashOut,
  onRefreshBalance 
}) {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const formatAddress = (address) => {
    if (!address) return 'Not connected'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const sidebarContent = (
    <div className="space-y-4">
      {/* Wallet Info */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshBalance}
              className="p-1 h-auto"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Address:</span>
              <div className="flex items-center space-x-1">
                <span className="font-mono">{formatAddress(walletAddress)}</span>
                {walletAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="p-1 h-auto"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-bold text-[#FFD54F]">
                {solBalance.toFixed(4)} SOL
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Territory Stats */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Territory Control
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Captured</span>
                <span className="font-bold">{territoryPercent.toFixed(1)}%</span>
              </div>
              <Progress 
                value={territoryPercent} 
                className="h-2 bg-muted"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Value:</span>
              <span className="font-bold text-[#14F195]">
                ${usdValue.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Game Timer */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Round Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#FFD54F] mb-1">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-xs text-muted-foreground">
              {gameActive ? 'Game in progress' : 'Waiting to start'}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cash Out */}
      <Card className="bg-gradient-to-br from-[#14F195]/10 to-[#FFD54F]/10 border-[#14F195]/30">
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-[#14F195]" />
            <div className="text-sm font-medium text-[#14F195]">Cash Out Available</div>
          </div>
          
          <Button
            onClick={onCashOut}
            disabled={!gameActive || territoryPercent === 0 || !walletAddress}
            className="w-full bg-[#14F195] hover:bg-[#14F195]/90 text-black font-medium"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Cash Out ${usdValue.toFixed(2)}
          </Button>
          
          <div className="text-xs text-center text-muted-foreground mt-2">
            Hold Q key to cash out
          </div>
        </CardContent>
      </Card>
    </div>
  )
  
  if (isMobile) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40 max-h-[50vh] overflow-y-auto"
      >
        {sidebarContent}
      </motion.div>
    )
  }
  
  return (
    <div className="w-80 bg-background border-l border-border p-4 overflow-y-auto">
      {sidebarContent}
    </div>
  )
}

// Interactive Paper-io game component
function PaperIOGame({ onGameUpdate, onCashOut }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  
  useEffect(() => {
    let gameInstance = null
    
    // Load Phaser and TurfLoot game
    const loadGame = () => {
      if (typeof window !== 'undefined') {
        // Load Phaser if not already loaded
        if (!window.Phaser) {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js'
          script.onload = () => loadTurfLootGame()
          document.head.appendChild(script)
        } else {
          loadTurfLootGame()
        }
      }
    }
    
    const loadTurfLootGame = () => {
      // Load TurfLoot game script
      if (!window.TurfLootGame) {
        const gameScript = document.createElement('script')
        gameScript.src = '/game/turfloot-game.js'
        gameScript.onload = () => initGame()
        document.head.appendChild(gameScript)
      } else {
        initGame()
      }
    }
    
    const initGame = () => {
      if (window.TurfLootGame) {
        gameInstance = new window.TurfLootGame()
        gameRef.current = gameInstance
        
        // Listen for messages from the game
        const handleMessage = (event) => {
          if (event.data && event.data.type) {
            switch (event.data.type) {
              case 'update':
                onGameUpdate({
                  territoryPercent: event.data.territoryPercent,
                  usdValue: event.data.usdValue
                })
                break
              case 'cashout':
                onCashOut()
                break
            }
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Cleanup function
        return () => {
          window.removeEventListener('message', handleMessage)
        }
      }
    }
    
    loadGame()
    
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [onGameUpdate, onCashOut])
  
  return (
    <div className="flex-1 flex items-center justify-center bg-black p-4">
      <div className="relative">
        <div id="turfloot-canvas" className="game-canvas border-2 border-[#14F195] rounded-lg" />
        
        {/* Game instructions overlay */}
        <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-sm backdrop-blur">
          <div className="font-bold mb-2 text-[#14F195]">🎮 Controls:</div>
          <div>• <span className="text-[#FFD54F]">WASD</span> - Move player</div>
          <div>• <span className="text-[#FFD54F]">Q</span> - Cash out winnings</div>
          <div className="mt-2 text-xs text-gray-400">Capture territory by returning to your base!</div>
        </div>
        
        {/* Game status */}
        <div className="absolute top-4 right-4 bg-black/90 text-white p-3 rounded-lg text-sm backdrop-blur">
          <div className="font-bold mb-1 text-[#14F195]">🏆 Objective:</div>
          <div className="text-xs">Capture <span className="text-[#FFD54F]">maximum territory</span></div>
          <div className="text-xs">without hitting your trail!</div>
        </div>
      </div>
    </div>
  )
}

export default function PlayPage() {
  const [walletAddress, setWalletAddress] = useState(null)
  const [solBalance, setSolBalance] = useState(0.0425) // Mock balance
  const [territoryPercent, setTerritoryPercent] = useState(0)
  const [usdValue, setUsdValue] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutes
  const [gameActive, setGameActive] = useState(true)
  
  // Timer countdown
  useEffect(() => {
    if (gameActive && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0) {
      setGameActive(false)
    }
  }, [timeRemaining, gameActive])
  
  // Simulate SOL balance updates when wallet connects
  useEffect(() => {
    if (walletAddress) {
      // Simulate getting real balance from Solana RPC
      setSolBalance(0.0425 + Math.random() * 0.1)
    } else {
      setSolBalance(0)
    }
  }, [walletAddress])
  
  const handleWalletConnect = (address) => {
    setWalletAddress(address)
    if (address) {
      console.log(`Connected to wallet: ${address}`)
      // TODO: Fetch real SOL balance from Solana RPC
    }
  }
  
  const handleGameUpdate = ({ territoryPercent, usdValue }) => {
    setTerritoryPercent(territoryPercent)
    setUsdValue(usdValue)
  }
  
  const handleCashOut = async () => {
    if (!walletAddress || territoryPercent === 0) {
      alert('Please connect your wallet and capture some territory first!')
      return
    }
    
    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount: usdValue / 100, // Convert USD to SOL (rough approximation)
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Cash-out request sent! You'll receive ${(usdValue / 100).toFixed(4)} SOL`)
        setGameActive(false)
        
        // Update balance optimistically
        setSolBalance(prev => prev + (usdValue / 100))
      } else {
        throw new Error('Cash-out failed')
      }
    } catch (error) {
      console.error('Cash-out failed:', error)
      alert('Cash-out failed. Please try again.')
    }
  }
  
  const handleRefreshBalance = async () => {
    if (!walletAddress) return
    
    // TODO: Fetch real balance from Solana RPC
    // For now, simulate with small random change
    setSolBalance(prev => prev + (Math.random() - 0.5) * 0.01)
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[#14F195]" />
            <span className="font-bold">TurfLoot Game</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="border-[#14F195] text-[#14F195]">
            $1 Table
          </Badge>
          <WalletConnect onWalletConnect={handleWalletConnect} walletAddress={walletAddress} />
        </div>
      </header>
      
      {/* Game Container */}
      <div className="flex-1 flex">
        {/* Game Canvas */}
        <PaperIOGame 
          onGameUpdate={handleGameUpdate}
          onCashOut={handleCashOut}
        />
        
        {/* Sidebar - Desktop only, Mobile uses bottom drawer */}
        <div className="hidden md:block">
          <GameSidebar
            walletAddress={walletAddress}
            solBalance={solBalance}
            territoryPercent={territoryPercent}
            usdValue={usdValue}
            timeRemaining={timeRemaining}
            gameActive={gameActive}
            onCashOut={handleCashOut}
            onRefreshBalance={handleRefreshBalance}
          />
        </div>
      </div>
      
      {/* Mobile Bottom Drawer */}
      <div className="md:hidden">
        <GameSidebar
          walletAddress={walletAddress}
          solBalance={solBalance}
          territoryPercent={territoryPercent}
          usdValue={usdValue}
          timeRemaining={timeRemaining}
          gameActive={gameActive}  
          onCashOut={handleCashOut}
          onRefreshBalance={handleRefreshBalance}
        />
      </div>
    </div>
  )
}

// Game stats sidebar component
function GameSidebar({ 
  walletAddress, 
  solBalance, 
  territoryPercent, 
  usdValue, 
  timeRemaining, 
  gameActive, 
  onCashOut,
  onRefreshBalance 
}) {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const formatAddress = (address) => {
    if (!address) return 'Not connected'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const sidebarContent = (
    <div className="space-y-4">
      {/* Wallet Info */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshBalance}
              className="p-1 h-auto"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Address:</span>
              <div className="flex items-center space-x-1">
                <span className="font-mono">{formatAddress(walletAddress)}</span>
                {walletAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="p-1 h-auto"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-bold text-[#FFD54F]">
                {solBalance.toFixed(4)} SOL
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Territory Stats */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Territory Control
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Captured</span>
                <span className="font-bold">{territoryPercent.toFixed(1)}%</span>
              </div>
              <Progress 
                value={territoryPercent} 
                className="h-2 bg-muted"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Value:</span>
              <span className="font-bold text-[#14F195]">
                ${usdValue.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Game Timer */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Round Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#FFD54F] mb-1">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-xs text-muted-foreground">
              {gameActive ? 'Game in progress' : 'Waiting to start'}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cash Out */}
      <Card className="bg-gradient-to-br from-[#14F195]/10 to-[#FFD54F]/10 border-[#14F195]/30">
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-[#14F195]" />
            <div className="text-sm font-medium text-[#14F195]">Cash Out Available</div>
          </div>
          
          <Button
            onClick={onCashOut}
            disabled={!gameActive || territoryPercent === 0}
            className="w-full bg-[#14F195] hover:bg-[#14F195]/90 text-black font-medium"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Cash Out ${usdValue.toFixed(2)}
          </Button>
          
          <div className="text-xs text-center text-muted-foreground mt-2">
            Hold Q key to cash out
          </div>
        </CardContent>
      </Card>
    </div>
  )
  
  if (isMobile) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40 max-h-[50vh] overflow-y-auto"
      >
        {sidebarContent}
      </motion.div>
    )
  }
  
  return (
    <div className="w-80 bg-background border-l border-border p-4 overflow-y-auto">
      {sidebarContent}
    </div>
  )
}

// Interactive Paper-io game component
function PaperIOGame({ onGameUpdate, onCashOut }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  
  useEffect(() => {
    let gameInstance = null
    
    // Load Phaser and TurfLoot game
    const loadGame = () => {
      if (typeof window !== 'undefined') {
        // Load Phaser if not already loaded
        if (!window.Phaser) {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js'
          script.onload = () => loadTurfLootGame()
          document.head.appendChild(script)
        } else {
          loadTurfLootGame()
        }
      }
    }
    
    const loadTurfLootGame = () => {
      // Load TurfLoot game script
      if (!window.TurfLootGame) {
        const gameScript = document.createElement('script')
        gameScript.src = '/game/turfloot-game.js'
        gameScript.onload = () => initGame()
        document.head.appendChild(gameScript)
      } else {
        initGame()
      }
    }
    
    const initGame = () => {
      if (window.TurfLootGame) {
        gameInstance = new window.TurfLootGame()
        gameRef.current = gameInstance
        
        // Listen for messages from the game
        const handleMessage = (event) => {
          if (event.data && event.data.type) {
            switch (event.data.type) {
              case 'update':
                onGameUpdate({
                  territoryPercent: event.data.territoryPercent,
                  usdValue: event.data.usdValue
                })
                break
              case 'cashout':
                onCashOut()
                break
            }
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Cleanup function
        return () => {
          window.removeEventListener('message', handleMessage)
        }
      }
    }
    
    loadGame()
    
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [onGameUpdate, onCashOut])
  
  return (
    <div className="flex-1 flex items-center justify-center bg-black p-4">
      <div className="relative">
        <div id="turfloot-canvas" className="game-canvas border-2 border-[#14F195] rounded-lg" />
        
        {/* Game instructions overlay */}
        <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded-lg text-sm backdrop-blur">
          <div className="font-bold mb-2 text-[#14F195]">🎮 Controls:</div>
          <div>• <span className="text-[#FFD54F]">WASD</span> - Move player</div>
          <div>• <span className="text-[#FFD54F]">Q</span> - Cash out winnings</div>
          <div className="mt-2 text-xs text-gray-400">Capture territory by returning to your base!</div>
        </div>
        
        {/* Game status */}
        <div className="absolute top-4 right-4 bg-black/90 text-white p-3 rounded-lg text-sm backdrop-blur">
          <div className="font-bold mb-1 text-[#14F195]">🏆 Objective:</div>
          <div className="text-xs">Capture <span className="text-[#FFD54F]">maximum territory</span></div>
          <div className="text-xs">without hitting your trail!</div>
        </div>
      </div>
    </div>
  )
}

export default function PlayPage() {
  const [walletAddress, setWalletAddress] = useState(null)
  const [solBalance, setSolBalance] = useState(0)
  const [territoryPercent, setTerritoryPercent] = useState(0)
  const [usdValue, setUsdValue] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutes
  const [gameActive, setGameActive] = useState(true)
  
  // Timer countdown
  useEffect(() => {
    if (gameActive && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0) {
      setGameActive(false)
    }
  }, [timeRemaining, gameActive])
  
  const handleGameUpdate = ({ territoryPercent, usdValue }) => {
    setTerritoryPercent(territoryPercent)
    setUsdValue(usdValue)
  }
  
  const handleCashOut = async () => {
    if (!walletAddress || territoryPercent === 0) return
    
    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount: usdValue / 100, // Convert USD to SOL (rough approximation)
        }),
      })
      
      if (response.ok) {
        alert(`Cash-out request sent! You'll receive ${(usdValue / 100).toFixed(4)} SOL`)
        setGameActive(false)
      }
    } catch (error) {
      console.error('Cash-out failed:', error)
      alert('Cash-out failed. Please try again.')
    }
  }
  
  const handleRefreshBalance = () => {
    // TODO: Fetch real Solana balance
    setSolBalance(prev => prev + Math.random() * 0.1)
  }
  
  return (
    <WalletProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-[#14F195]" />
              <span className="font-bold">TurfLoot Game</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="border-[#14F195] text-[#14F195]">
              $1 Table
            </Badge>
            <WalletMultiButton />
          </div>
        </header>
        
        {/* Game Container */}
        <div className="flex-1 flex">
          {/* Game Canvas */}
          <PaperIOGame 
            onGameUpdate={handleGameUpdate}
            onCashOut={handleCashOut}
          />
          
          {/* Sidebar - Desktop only, Mobile uses bottom drawer */}
          <div className="hidden md:block">
            <GameSidebar
              walletAddress={walletAddress}
              solBalance={solBalance}
              territoryPercent={territoryPercent}
              usdValue={usdValue}
              timeRemaining={timeRemaining}
              gameActive={gameActive}
              onCashOut={handleCashOut}
              onRefreshBalance={handleRefreshBalance}
            />
          </div>
        </div>
        
        {/* Mobile Bottom Drawer */}
        <div className="md:hidden">
          <GameSidebar
            walletAddress={walletAddress}
            solBalance={solBalance}
            territoryPercent={territoryPercent}
            usdValue={usdValue}
            timeRemaining={timeRemaining}
            gameActive={gameActive}  
            onCashOut={handleCashOut}
            onRefreshBalance={handleRefreshBalance}
          />
        </div>
      </div>
    </WalletProvider>
  )
}