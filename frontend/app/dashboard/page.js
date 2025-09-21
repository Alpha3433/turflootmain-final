'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Wallet, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [balance] = useState(1.2345)

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>
        </div>

        {/* Balance Card */}
        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <DollarSign className="w-8 h-8 text-[#14F195]" />
                <div>
                  <p className="text-2xl font-bold">{balance.toFixed(4)} SOL</p>
                  <p className="text-sm text-muted-foreground">≈ ${(balance * 210).toFixed(2)} USD</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">More Dashboard Features Coming Soon</h2>
            <p className="text-muted-foreground">Game history, analytics, and more will be available here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}