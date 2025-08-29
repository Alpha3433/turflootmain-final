'use client'

import React from 'react'

export default function GameLoadingPopup({ isVisible, roomType, entryFee, partyMode = false, partySize = 1 }) {
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
      text: 'text-orange-400'
    },
    green: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/40',
      accent: 'bg-green-500',
      text: 'text-green-400'
    },
    blue: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/40',
      accent: 'bg-blue-500',
      text: 'text-blue-400'
    },
    purple: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/40',
      accent: 'bg-purple-500',
      text: 'text-purple-400'
    },
    red: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      accent: 'bg-red-500',
      text: 'text-red-400'
    },
    gray: {
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/40',
      accent: 'bg-gray-500',
      text: 'text-gray-400'
    }
  }

  const colors = colorClasses[color] || colorClasses.gray

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className={`${colors.bg} ${colors.border} border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in duration-300`}>
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-white font-bold text-xl mb-2">{title}</h2>
          <p className={`${colors.text} text-sm font-medium mb-1`}>{subtitle}</p>
          <p className="text-gray-300 text-xs">{description}</p>
        </div>

        {/* Loading Animation */}
        <div className="flex flex-col items-center space-y-4">
          {/* Spinning Game Elements */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Outer Ring */}
            <div className={`absolute inset-0 ${colors.border} border-4 rounded-full animate-spin`}></div>
            
            {/* Inner Pulsing Circle */}
            <div className={`w-12 h-12 ${colors.accent} rounded-full animate-pulse`}></div>
            
            {/* Floating Particles */}
            <div className={`absolute -top-2 -left-2 w-3 h-3 ${colors.accent} rounded-full animate-bounce`}></div>
            <div className={`absolute -top-2 -right-2 w-2 h-2 ${colors.accent} rounded-full animate-bounce delay-100`}></div>
            <div className={`absolute -bottom-2 -left-2 w-2 h-2 ${colors.accent} rounded-full animate-bounce delay-200`}></div>
            <div className={`absolute -bottom-2 -right-2 w-3 h-3 ${colors.accent} rounded-full animate-bounce delay-300`}></div>
          </div>

          {/* Progress Dots */}
          <div className="flex space-x-2">
            <div className={`w-2 h-2 ${colors.accent} rounded-full animate-pulse`}></div>
            <div className={`w-2 h-2 ${colors.accent} rounded-full animate-pulse delay-150`}></div>
            <div className={`w-2 h-2 ${colors.accent} rounded-full animate-pulse delay-300`}></div>
          </div>

          {/* Loading Text */}
          <div className="text-center">
            <p className="text-white font-medium text-sm">Preparing your game...</p>
            <p className="text-gray-400 text-xs mt-1">This should only take a moment</p>
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