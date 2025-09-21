'use client'

import React, { useState, useEffect } from 'react'

export default function GameLoadingPopup({ isVisible, roomType, entryFee, partyMode = false, partySize = 1 }) {
  const [progress, setProgress] = useState(0)

  // Animate progress from 0 to 100% over 800ms (matching the navigation delay)
  useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      return
    }

    const duration = 800 // Match the navigation delay
    const steps = 100
    const stepTime = duration / steps
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep += 1
      const newProgress = Math.min((currentStep / steps) * 100, 100)
      setProgress(newProgress)

      if (currentStep >= steps) {
        clearInterval(interval)
      }
    }, stepTime)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  const getRoomDisplayInfo = () => {
    if (partyMode) {
      return {
        title: `🎉 Starting Party Game`,
        subtitle: `${partySize} players • ${roomType === 'practice' ? 'Practice Mode' : `$${entryFee} Entry`}`,
        description: 'Coordinating with party members...',
        color: 'orange'
      }
    }

    switch (roomType) {
      case 'practice':
        return {
          title: '🤖 Joining Practice Room',
          subtitle: 'Free • Play with Bots',
          description: 'Loading practice environment...',
          color: 'green'
        }
      case '$1':
        return {
          title: '🎯 Joining $1 Room',
          subtitle: '$1 Entry Fee • Real Money',
          description: 'Connecting to multiplayer server...',
          color: 'blue'
        }
      case '$5':
        return {
          title: '💎 Joining $5 Room',
          subtitle: '$5 Entry Fee • Higher Stakes',
          description: 'Connecting to multiplayer server...',
          color: 'purple'
        }
      case '$25':
        return {
          title: '🔥 Joining $25 Room',
          subtitle: '$25 Entry Fee • Premium Play',
          description: 'Connecting to multiplayer server...',
          color: 'red'
        }
      default:
        return {
          title: '🎮 Joining Game',
          subtitle: 'Loading...',
          description: 'Connecting to game server...',
          color: 'gray'
        }
    }
  }

  const { title, subtitle, description, color } = getRoomDisplayInfo()

  const colorClasses = {
    orange: {
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/40',
      accent: 'bg-orange-500',
      text: 'text-orange-400',
      stroke: '#fb923c'
    },
    green: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/40',
      accent: 'bg-green-500',
      text: 'text-green-400',
      stroke: '#4ade80'
    },
    blue: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/40',
      accent: 'bg-blue-500',
      text: 'text-blue-400',
      stroke: '#60a5fa'
    },
    purple: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/40',
      accent: 'bg-purple-500',
      text: 'text-purple-400',
      stroke: '#a78bfa'
    },
    red: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      accent: 'bg-red-500',
      text: 'text-red-400',
      stroke: '#f87171'
    },
    gray: {
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/40',
      accent: 'bg-gray-500',
      text: 'text-gray-400',
      stroke: '#9ca3af'
    }
  }

  const colors = colorClasses[color] || colorClasses.gray
  const circumference = 2 * Math.PI * 45 // radius of 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className={`${colors.bg} ${colors.border} border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in duration-300`}>
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-white font-bold text-xl mb-2">{title}</h2>
          <p className={`${colors.text} text-sm font-medium mb-1`}>{subtitle}</p>
          <p className="text-gray-300 text-xs">{description}</p>
        </div>

        {/* Percentage Progress Circle */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className={`${colors.text} opacity-20`}
              />
              {/* Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={colors.stroke}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-100 ease-out drop-shadow-lg"
                style={{
                  filter: `drop-shadow(0 0 8px ${colors.stroke}40)`
                }}
              />
            </svg>
            
            {/* Percentage Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {Math.round(progress)}%
                </div>
                <div className={`text-xs ${colors.text} font-medium`}>
                  Loading
                </div>
              </div>
            </div>

            {/* Floating Particles around the circle */}
            <div className={`absolute top-2 left-8 w-2 h-2 ${colors.accent} rounded-full animate-bounce opacity-60`}></div>
            <div className={`absolute top-8 right-2 w-1.5 h-1.5 ${colors.accent} rounded-full animate-bounce delay-100 opacity-40`}></div>
            <div className={`absolute bottom-2 left-6 w-1.5 h-1.5 ${colors.accent} rounded-full animate-bounce delay-200 opacity-50`}></div>
            <div className={`absolute bottom-6 right-4 w-2 h-2 ${colors.accent} rounded-full animate-bounce delay-300 opacity-60`}></div>
          </div>

          {/* Progress Dots */}
          <div className="flex space-x-2">
            <div className={`w-2 h-2 ${colors.accent} rounded-full ${progress > 25 ? 'animate-pulse' : 'animate-bounce'}`}></div>
            <div className={`w-2 h-2 ${colors.accent} rounded-full ${progress > 50 ? 'animate-pulse' : 'animate-bounce delay-150'}`}></div>
            <div className={`w-2 h-2 ${colors.accent} rounded-full ${progress > 75 ? 'animate-pulse' : 'animate-bounce delay-300'}`}></div>
          </div>

          {/* Loading Text with Dynamic Messages */}
          <div className="text-center">
            <p className="text-white font-medium text-sm">
              {progress < 30 ? 'Initializing connection...' :
               progress < 60 ? 'Preparing game room...' :
               progress < 90 ? 'Loading game assets...' :
               'Almost ready!'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {progress < 100 ? `${Math.round(progress)}% complete` : 'Launching game...'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            {partyMode ? '🎉 Party Mode Active' : '🎮 Solo Mode'}
          </p>
        </div>
      </div>
    </div>
  )
}