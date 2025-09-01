'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SpectatorMode from '@/components/SpectatorMode'
import { Card, CardContent } from '@/components/ui/card'
import { Eye } from 'lucide-react'

function SpectatorPageContent() {
  const searchParams = useSearchParams()
  const roomId = searchParams.get('roomId')
  const mode = searchParams.get('mode') || 'free'
  const fee = parseFloat(searchParams.get('fee')) || 0
  const autoSpectate = searchParams.get('autoSpectate') === 'true'
  const stake = searchParams.get('stake') || (fee === 0 ? 'FREE' : fee.toString())

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Eye className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Spectator Request</h2>
            <p className="text-muted-foreground">
              No room ID provided. Please return to the lobby and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SpectatorMode 
      roomId={roomId} 
      gameMode={mode}
      entryFee={fee}
      autoSpectate={autoSpectate}
      stake={stake}
    />
  )
}

export default function SpectatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Eye className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">Loading Spectator Mode...</h2>
            <p className="text-muted-foreground">
              Preparing your spectator experience...
            </p>
          </CardContent>
        </Card>
      </div>
    }>
      <SpectatorPageContent />
    </Suspense>
  )
}