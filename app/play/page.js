'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
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

// Dynamically import wallet components to avoid SSR issues
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
)

const WalletProvider = dynamic(
  () => import('@/components/wallet/WalletProvider'),
  { ssr: false }
)

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
    if (!window.Phaser) {
      // Load Phaser dynamically
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js'
      script.onload = initGame
      document.head.appendChild(script)
    } else {
      initGame()
    }
    
    function initGame() {
      const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 800,
        parent: 'turfloot-canvas',
        backgroundColor: '#000000',
        scene: {
          preload: preload,
          create: create,
          update: update
        },
        physics: {
          default: 'arcade',
          arcade: {
            debug: false
          }
        }
      }
      
      gameRef.current = new Phaser.Game(config)
    }
    
    let player
    let cursors
    let gridSize = 20
    let grid = []
    let playerTrail = []
    let territory = []
    let gameActive = true
    
    function preload() {
      // Create colored rectangles for the game
      this.add.graphics()
        .fillStyle(0x14F195)
        .fillRect(0, 0, gridSize, gridSize)
        .generateTexture('player', gridSize, gridSize)
      
      this.add.graphics()
        .fillStyle(0x14F195, 0.5)
        .fillRect(0, 0, gridSize, gridSize)
        .generateTexture('trail', gridSize, gridSize)
      
      this.add.graphics()
        .fillStyle(0x14F195, 0.8)
        .fillRect(0, 0, gridSize, gridSize)
        .generateTexture('territory', gridSize, gridSize)
    }
    
    function create() {
      // Initialize grid
      const cols = config.width / gridSize
      const rows = config.height / gridSize
      
      for (let x = 0; x < cols; x++) {
        grid[x] = []
        for (let y = 0; y < rows; y++) {
          grid[x][y] = 0 // 0 = empty, 1 = territory, 2 = trail
        }
      }
      
      // Create player
      player = this.add.sprite(400, 400, 'player')
      player.gridX = Math.floor(player.x / gridSize)
      player.gridY = Math.floor(player.y / gridSize)
      
      // Set initial territory
      for (let x = player.gridX - 2; x <= player.gridX + 2; x++) {
        for (let y = player.gridY - 2; y <= player.gridY + 2; y++) {
          if (x >= 0 && x < cols && y >= 0 && y < rows) {
            grid[x][y] = 1
            const territorySprite = this.add.sprite(x * gridSize + gridSize/2, y * gridSize + gridSize/2, 'territory')
            territory.push(territorySprite)
          }
        }
      }
      
      // Controls
      cursors = this.input.keyboard.createCursorKeys()
      const wasd = this.input.keyboard.addKeys('W,S,A,D,Q')
      
      // Movement with WASD
      this.input.keyboard.on('keydown-W', () => movePlayer(0, -1))
      this.input.keyboard.on('keydown-S', () => movePlayer(0, 1))
      this.input.keyboard.on('keydown-A', () => movePlayer(-1, 0))
      this.input.keyboard.on('keydown-D', () => movePlayer(1, 0))
      
      // Cash out with Q
      this.input.keyboard.on('keydown-Q', () => {
        if (gameActive) {
          onCashOut()
        }
      })
    }
    
    function movePlayer(dx, dy) {
      if (!gameActive) return
      
      const newX = player.gridX + dx
      const newY = player.gridY + dy
      const cols = config.width / gridSize
      const rows = config.height / gridSize
      
      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
        player.gridX = newX
        player.gridY = newY
        player.x = newX * gridSize + gridSize/2
        player.y = newY * gridSize + gridSize/2
        
        // Add to trail if not in own territory
        if (grid[newX][newY] !== 1) {
          grid[newX][newY] = 2
          const trailSprite = gameRef.current.scene.scenes[0].add.sprite(
            newX * gridSize + gridSize/2, 
            newY * gridSize + gridSize/2, 
            'trail'
          )
          playerTrail.push({ sprite: trailSprite, x: newX, y: newY })
        } else if (playerTrail.length > 0) {
          // Returned to territory - convert trail to territory
          convertTrailToTerritory()
        }
        
        updateGameStats()
      }
    }
    
    function convertTrailToTerritory() {
      playerTrail.forEach(trailPoint => {
        grid[trailPoint.x][trailPoint.y] = 1
        trailPoint.sprite.setTexture('territory')
        territory.push(trailPoint.sprite)
      })
      
      // Fill enclosed areas (simplified flood fill)
      fillEnclosedAreas()
      
      playerTrail = []
      updateGameStats()
    }
    
    function fillEnclosedAreas() {
      // Simplified area filling - in a real game this would be more sophisticated
      const cols = config.width / gridSize
      const rows = config.height / gridSize
      
      for (let x = 1; x < cols - 1; x++) {
        for (let y = 1; y < rows - 1; y++) {
          if (grid[x][y] === 0) {
            // Check if surrounded by territory
            let surrounded = true
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (grid[x + dx] && grid[x + dx][y + dy] !== 1) {
                  surrounded = false
                  break
                }
              }
              if (!surrounded) break
            }
            
            if (surrounded) {
              grid[x][y] = 1
              const territorySprite = gameRef.current.scene.scenes[0].add.sprite(
                x * gridSize + gridSize/2, 
                y * gridSize + gridSize/2, 
                'territory'
              )
              territory.push(territorySprite)
            }
          }
        }
      }
    }
    
    function updateGameStats() {
      const cols = config.width / gridSize
      const rows = config.height / gridSize
      const totalCells = cols * rows
      let territoryCount = 0
      
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          if (grid[x][y] === 1) {
            territoryCount++
          }
        }
      }
      
      const territoryPercent = (territoryCount / totalCells) * 100
      const usdValue = territoryPercent * 0.2 // $0.20 per percent for $1 game
      
      onGameUpdate({
        territoryPercent,
        usdValue
      })
    }
    
    function update() {
      // Game loop - can add enemy AI, power-ups, etc.
    }
    
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [onGameUpdate, onCashOut])
  
  return (
    <div className="flex-1 flex items-center justify-center bg-black p-4">
      <div className="relative">
        <div id="turfloot-canvas" className="game-canvas" />
        
        {/* Game instructions overlay */}
        <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-sm">
          <div className="font-bold mb-1">Controls:</div>
          <div>WASD - Move player</div>
          <div>Q - Cash out</div>
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