'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Shield, DollarSign, Trophy, Users, Zap } from 'lucide-react'
import Link from 'next/link'

// Simple animation replacements using CSS classes
const AnimatedDiv = ({ children, className, ...props }) => (
  <div className={`${className} transition-all duration-500 hover:scale-105`} {...props}>
    {children}
  </div>
)

const AnimatedH1 = ({ children, className, ...props }) => (
  <h1 className={`${className} animate-fade-in`} {...props}>
    {children}
  </h1>
)

const AnimatedP = ({ children, className, ...props }) => (
  <p className={`${className} animate-fade-in-delay`} {...props}>
    {children}
  </p>
)

// Hero animation component
function HeroAnimation() {
  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden bg-gradient-to-br from-[#14F195]/20 to-[#FFD54F]/20 border border-[#14F195]/30">
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-1 p-4">
        {Array.from({ length: 48 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#14F195]/10 rounded-sm animate-grid-fill"
            style={{
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white animate-scale-in">
          <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
            100% <span className="turfloot-gradient bg-clip-text text-transparent">skill</span>
          </div>
          <div className="text-xl md:text-2xl text-muted-foreground">
            0% luck
          </div>
        </div>
      </div>
    </div>
  )
}

// Live pot ticker component
function LivePotTicker() {
  const [pots, setPots] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchPots = async () => {
      try {
        const response = await fetch('/api/pots')
        if (response.ok) {
          const data = await response.json()
          setPots(data)
        }
      } catch (error) {
        console.error('Failed to fetch pots:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPots()
    const interval = setInterval(fetchPots, 30000) // Update every 30s
    
    return () => clearInterval(interval)
  }, [])
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/50 border-border">
            <CardContent className="p-4 text-center">
              <div className="h-6 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {pots.map((pot, index) => (
        <div
          key={pot.table}
          className="animate-slide-up transform transition-all duration-300 hover:scale-105"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-4 text-center">
              <Badge variant="outline" className="mb-2 border-primary text-primary">
                {pot.table}
              </Badge>
              <div className="text-2xl font-bold text-[#FFD54F] animate-pulse-glow">
                ${pot.pot.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {pot.players} players
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14F195] to-[#FFD54F] flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TurfLoot</h1>
              <p className="text-xs text-muted-foreground">Capture with skill. Cash-out in crypto.</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/play" className="text-muted-foreground hover:text-foreground transition-colors">
              Play
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/legal" className="text-muted-foreground hover:text-foreground transition-colors">
              Legal
            </Link>
          </nav>
        </div>
      </header>

        {/* Hero Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <AnimatedH1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
                <span className="turfloot-gradient bg-clip-text text-transparent">
                  TurfLoot
                </span>
              </AnimatedH1>
              
              <AnimatedP className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Skill-based, Paper-io-style land-grab game that pays out in SOL on the Solana blockchain.
              </AnimatedP>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <div className="transform transition-all duration-200 hover:scale-105 active:scale-95 turfloot-glow">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/play">
                      <Play className="w-5 h-5 mr-2" />
                      Play for $1
                    </Link>
                  </Button>
                </div>
                
                <div className="transform transition-all duration-200 hover:scale-105 active:scale-95">
                  <Button variant="outline" size="lg" className="border-border hover:bg-muted">
                    <Trophy className="w-5 h-5 mr-2" />
                    Watch Demo
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <HeroAnimation />
            </div>
          </div>
        </section>

        {/* How Skill Wins Section */}
        <section className="py-16 bg-muted/5">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in">
              How Skill Wins
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Join",
                  description: "Connect your Solana wallet and join a game table",
                  icon: Users
                },
                {
                  step: "2",
                  title: "Outsmart",
                  description: "Use WASD to capture territory. Strategy beats luck.",
                  icon: Zap
                },
                {
                  step: "3",
                  title: "Withdraw",
                  description: "Press Q to cash out your winnings in SOL",
                  icon: DollarSign
                }
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="animate-slide-up transform transition-all duration-300 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <Card className="bg-card/50 border-border h-full hover:border-primary/50 transition-colors">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 transform transition-transform duration-300 hover:rotate-12">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-primary font-bold text-sm mb-2">STEP {item.step}</div>
                      <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Pot Ticker */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in">
              Live Game Pots
            </h2>
            
            <LivePotTicker />
          </div>
        </section>

        {/* Trust Bar */}
        <section className="py-12 bg-primary/5 border-y border-primary/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-8 text-center">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Provably Fair</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Smart-contract Escrow</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">10% Service Fee</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-[#14F195] to-[#FFD54F]" />
                  <span className="font-bold">TurfLoot</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Skill-based crypto gaming on Solana
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Game</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/play" className="hover:text-foreground">Play Now</Link></li>
                  <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/legal" className="hover:text-foreground">Terms & Conditions</Link></li>
                  <li><Link href="/legal" className="hover:text-foreground">Privacy Policy</Link></li>
                  <li><Link href="/legal" className="hover:text-foreground">Responsible Gaming</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Support</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="mailto:support@turfloot.com" className="hover:text-foreground">Contact Us</a></li>
                  <li><a href="#" className="hover:text-foreground">Discord</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
              <p>&copy; 2024 TurfLoot. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}