'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const GameSettingsContext = createContext()

export const useGameSettings = () => {
  const context = useContext(GameSettingsContext)
  if (!context) {
    throw new Error('useGameSettings must be used within a GameSettingsProvider')
  }
  return context
}

export const GameSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    // Display Settings
    showPingMonitor: true,
    showKillFeed: true,
    showMinimap: true,
    showControls: true,
    
    // Gameplay Settings
    autoCashOut: false,
    autoCashOutThreshold: 500,
    quickCashOut: true,
    
    // Performance Settings
    graphicsQuality: 'high',
    frameRate: '60',
    particleEffects: true,
    smoothCamera: true,
    
    // Audio Settings
    masterVolume: 0.7,
    soundEffects: true,
    backgroundMusic: false,
    
    // Interface Settings
    showFloatingText: true,
    showPlayerNames: true,
    showNetWorth: true,
    compactUI: false
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('turfloot_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('turfloot_settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [settings])

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateMultipleSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }))
  }

  const resetSettings = () => {
    setSettings({
      showPingMonitor: true,
      showKillFeed: true,
      showMinimap: true,
      showControls: true,
      autoCashOut: false,
      autoCashOutThreshold: 500,
      quickCashOut: true,
      graphicsQuality: 'high',
      frameRate: '60',
      particleEffects: true,
      smoothCamera: true,
      masterVolume: 0.7,
      soundEffects: true,
      backgroundMusic: false,
      showFloatingText: true,
      showPlayerNames: true,
      showNetWorth: true,
      compactUI: false
    })
  }

  const value = {
    settings,
    updateSetting,
    updateMultipleSettings,
    resetSettings
  }

  return (
    <GameSettingsContext.Provider value={value}>
      {children}
    </GameSettingsContext.Provider>
  )
}