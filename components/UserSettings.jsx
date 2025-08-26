'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Copy, 
  Check, 
  User, 
  Gamepad2, 
  Monitor, 
  Volume2, 
  FileText,
  Settings as SettingsIcon
} from 'lucide-react'
import { useGameSettings } from './providers/GameSettingsProvider'

const UserSettings = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('account')
  const [username, setUsername] = useState(user?.username || user?.custom_name || user?.google?.name || user?.email?.address || 'Player')
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  
  const { settings, updateSetting, resetSettings } = useGameSettings()

  // Update username when user prop changes
  useEffect(() => {
    if (user) {
      const currentName = user.custom_name || user.google?.name || user.email?.address || 'Player'
      setUsername(currentName)
    }
  }, [user])

  // Orientation detection effect
  useEffect(() => {
    if (!isOpen) return
    
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }
    
    // Check orientation on mount
    checkOrientation()
    
    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [isOpen])

  if (!isOpen) return null

  const tabs = [
    { id: 'account', label: 'Account', icon: User, color: 'text-blue-400' },
    { id: 'game', label: 'Game', icon: Gamepad2, color: 'text-green-400' },
    { id: 'display', label: 'Display', icon: Monitor, color: 'text-purple-400' },
    { id: 'audio', label: 'Audio', icon: Volume2, color: 'text-orange-400' },
    { id: 'legal', label: 'Legal', icon: FileText, color: 'text-red-400' }
  ]

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      alert('Please enter a valid username')
      return
    }

    if (!user?.id && !user?.privyId) {
      alert('Please login to update your username')
      return
    }

    setIsUpdatingUsername(true)

    try {
      console.log('💾 Updating username to:', username.trim())
      console.log('🔑 User ID:', user?.id || user?.privyId)

      const response = await fetch('/api/users/profile/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || user?.privyId,
          customName: username.trim(),
          privyId: user?.privyId
        }),
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Username update response:', data)
        alert(`✅ Username successfully updated to "${username.trim()}"!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Username update failed:', response.status, errorData)
        alert(`❌ Failed to update username: ${errorData.error || 'Server error'}`)
      }
    } catch (error) {
      console.error('❌ Network error updating username:', error)
      alert(`❌ Network error: ${error.message}. Please check your connection and try again.`)
    } finally {
      setIsUpdatingUsername(false)
    }
  }

  const copyWalletAddress = async () => {
    const walletAddress = user?.wallet?.address || 'Connect wallet to view address'
    try {
      await navigator.clipboard.writeText(walletAddress)
      setShowCopySuccess(true)
      setTimeout(() => setShowCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy wallet address:', error)
    }
  }

  const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`w-12 h-6 rounded-full relative transition-all ${
        enabled ? 'bg-green-500' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
          enabled ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )

  const renderAccountTab = () => (
    <div className="space-y-8">
      {/* Username Section */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Username</h3>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
            placeholder="Enter username"
          />
          <button
            onClick={handleUpdateUsername}
            disabled={isUpdatingUsername}
            className={`px-6 py-3 text-white font-medium rounded-lg transition-colors ${
              isUpdatingUsername 
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isUpdatingUsername ? '⏳ Updating...' : '📝 Update'}
          </button>
        </div>
      </div>

      {/* Wallet Information */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Wallet Information</h3>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                💳
              </div>
              <span className="text-white font-mono">
                {user?.wallet?.address || 'Connect wallet to view address'}
              </span>
            </div>
            <button
              onClick={copyWalletAddress}
              className="p-2 text-gray-400 hover:text-white transition-colors relative"
              title="Copy wallet address"
              disabled={!user?.wallet?.address}
            >
              {showCopySuccess ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Account Information</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="text-gray-400">📅</div>
              <span className="text-gray-400">Member Since</span>
            </div>
            <span className="text-white font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Login to view date'}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="text-gray-400">🔥</div>
              <span className="text-gray-400">Login Streak</span>
            </div>
            <span className="text-white font-medium">
              {user?.loginStreak || 'Play games to build streak'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGameTab = () => (
    <div className="space-y-8">
      {/* Gameplay Settings */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Gameplay Settings</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Auto Cash Out</div>
              <div className="text-sm text-gray-400">Automatically cash out when reaching threshold</div>
            </div>
            <ToggleSwitch 
              enabled={settings.autoCashOut} 
              onChange={(value) => updateSetting('autoCashOut', value)}
            />
          </div>
          
          {settings.autoCashOut && (
            <div className="ml-4 flex items-center space-x-4">
              <span className="text-white font-medium">Threshold:</span>
              <input
                type="number"
                value={settings.autoCashOutThreshold}
                onChange={(e) => updateSetting('autoCashOutThreshold', parseInt(e.target.value))}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white w-24"
                min="100"
                max="10000"
                step="50"
              />
              <span className="text-gray-400">dollars</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Quick Cash Out</div>
              <div className="text-sm text-gray-400">Reduce cash out time from 5s to 3s</div>
            </div>
            <ToggleSwitch 
              enabled={settings.quickCashOut} 
              onChange={(value) => updateSetting('quickCashOut', value)}
            />
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Graphics Quality</div>
              <div className="text-sm text-gray-400">Adjust visual quality for performance</div>
            </div>
            <select 
              value={settings.graphicsQuality}
              onChange={(e) => updateSetting('graphicsQuality', e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Target Frame Rate</div>
              <div className="text-sm text-gray-400">Higher FPS for smoother gameplay</div>
            </div>
            <select 
              value={settings.frameRate}
              onChange={(e) => updateSetting('frameRate', e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
            >
              <option value="30">30 FPS</option>
              <option value="60">60 FPS</option>
              <option value="120">120 FPS</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Particle Effects</div>
              <div className="text-sm text-gray-400">Visual effects for eliminations and cash-outs</div>
            </div>
            <ToggleSwitch 
              enabled={settings.particleEffects} 
              onChange={(value) => updateSetting('particleEffects', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Smooth Camera</div>
              <div className="text-sm text-gray-400">Smooth camera following and transitions</div>
            </div>
            <ToggleSwitch 
              enabled={settings.smoothCamera} 
              onChange={(value) => updateSetting('smoothCamera', value)}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderDisplayTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Interface Elements</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Show Ping Monitor</div>
              <div className="text-sm text-gray-400">Display network latency in bottom left</div>
            </div>
            <ToggleSwitch 
              enabled={settings.showPingMonitor} 
              onChange={(value) => updateSetting('showPingMonitor', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Kill Feed</div>
              <div className="text-sm text-gray-400">Show elimination notifications</div>
            </div>
            <ToggleSwitch 
              enabled={settings.showKillFeed} 
              onChange={(value) => updateSetting('showKillFeed', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Minimap</div>
              <div className="text-sm text-gray-400">Show minimap in bottom right</div>
            </div>
            <ToggleSwitch 
              enabled={settings.showMinimap} 
              onChange={(value) => updateSetting('showMinimap', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Floating Text</div>
              <div className="text-sm text-gray-400">Show floating damage and money text</div>
            </div>
            <ToggleSwitch 
              enabled={settings.showFloatingText} 
              onChange={(value) => updateSetting('showFloatingText', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Player Names</div>
              <div className="text-sm text-gray-400">Display player names above characters</div>
            </div>
            <ToggleSwitch 
              enabled={settings.showPlayerNames} 
              onChange={(value) => updateSetting('showPlayerNames', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Net Worth Display</div>
              <div className="text-sm text-gray-400">Show cash values above players</div>
            </div>
            <ToggleSwitch 
              enabled={settings.showNetWorth} 
              onChange={(value) => updateSetting('showNetWorth', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Compact UI</div>
              <div className="text-sm text-gray-400">Reduce UI element sizes for more screen space</div>
            </div>
            <ToggleSwitch 
              enabled={settings.compactUI} 
              onChange={(value) => updateSetting('compactUI', value)}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderAudioTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Audio Settings</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Master Volume</div>
              <div className="text-sm text-gray-400">Overall game volume</div>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.masterVolume}
                onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
                className="w-24 accent-yellow-400"
              />
              <span className="text-white w-12 text-right">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Sound Effects</div>
              <div className="text-sm text-gray-400">Game sound effects (eliminations, cash-out, etc.)</div>
            </div>
            <ToggleSwitch 
              enabled={settings.soundEffects} 
              onChange={(value) => updateSetting('soundEffects', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Background Music</div>
              <div className="text-sm text-gray-400">Ambient background music during gameplay</div>
            </div>
            <ToggleSwitch 
              enabled={settings.backgroundMusic} 
              onChange={(value) => updateSetting('backgroundMusic', value)}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderLegalTab = () => (
    <div className="space-y-8">
      {/* Legal Documents */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Legal Documents</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-xl">📄</div>
                <div>
                  <div className="text-white font-medium">Terms of Service</div>
                  <div className="text-sm text-gray-400">View current terms and conditions</div>
                </div>
              </div>
              <div className="text-gray-400">→</div>
            </div>
          </button>
          
          <button className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-xl">🔒</div>
                <div>
                  <div className="text-white font-medium">Privacy Policy</div>
                  <div className="text-sm text-gray-400">View privacy and data policies</div>
                </div>
              </div>
              <div className="text-gray-400">→</div>
            </div>
          </button>
          
          <button className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-xl">⚖️</div>
                <div>
                  <div className="text-white font-medium">Game Rules</div>
                  <div className="text-sm text-gray-400">Fair play guidelines</div>
                </div>
              </div>
              <div className="text-gray-400">→</div>
            </div>
          </button>
        </div>
      </div>

      {/* Settings Management */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Settings Management</h3>
        <div className="space-y-3">
          <button 
            onClick={resetSettings}
            className="w-full text-left p-4 bg-yellow-400/10 hover:bg-yellow-400/20 rounded-lg border border-yellow-400/30 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="text-xl">🔄</div>
              <div>
                <div className="text-yellow-400 font-medium">Reset All Settings</div>
                <div className="text-sm text-gray-400">Restore all settings to default values</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Account Management</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="text-xl">📊</div>
              <div>
                <div className="text-blue-400 font-medium">Export Data</div>
                <div className="text-sm text-gray-400">Download your game statistics and settings</div>
              </div>
            </div>
          </button>
          
          <button className="w-full text-left p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/30 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="text-xl">🗑️</div>
              <div>
                <div className="text-red-400 font-medium">Delete Account</div>
                <div className="text-sm text-gray-400">Permanently delete your account</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'account': return renderAccountTab()
      case 'game': return renderGameTab()
      case 'display': return renderDisplayTab()
      case 'audio': return renderAudioTab()
      case 'legal': return renderLegalTab()
      default: return renderAccountTab()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Mobile Layout - Portrait and Landscape Optimized */}
      <div className="md:hidden w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        
        {/* Mobile Header - Responsive for Portrait/Landscape */}
        <div className={`px-5 ${isLandscape ? 'py-2' : 'py-3'} border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-800/90`}>
          {/* Portrait Layout - 2 Rows */}
          {!isLandscape && (
            <div>
              {/* Top Row - Title and Close Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-orange-600/30 rounded-xl border border-orange-500/40 shadow-lg">
                    <SettingsIcon className="w-6 h-6 text-orange-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">Settings</h2>
                    <p className="text-sm text-gray-400">Customize your experience</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-3 bg-gray-700/60 hover:bg-gray-600/70 rounded-xl transition-all active:scale-95 shadow-lg"
                >
                  <X className="w-6 h-6 text-gray-300" />
                </button>
              </div>
            </div>
          )}

          {/* Landscape Layout - Single Compact Row */}
          {isLandscape && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-600/30 rounded-lg border border-orange-500/40 shadow-lg">
                  <SettingsIcon className="w-5 h-5 text-orange-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Settings</h2>
                  <p className="text-xs text-gray-400">Customize your experience</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 bg-gray-700/60 hover:bg-gray-600/70 rounded-lg transition-all active:scale-95 shadow-lg"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Tab Switcher - Responsive */}
        <div className={`bg-gray-800/60 mx-5 ${isLandscape ? 'mt-2 mb-2' : 'mt-4 mb-3'} rounded-2xl p-1.5 border border-gray-700/60 shadow-lg overflow-x-auto`}>
          <div className="flex space-x-1 min-w-max">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 ${isLandscape ? 'py-2' : 'py-3'} rounded-xl ${isLandscape ? 'text-sm font-semibold' : 'text-base font-bold'} transition-all whitespace-nowrap active:scale-95 min-w-max ${
                    activeTab === tab.id 
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
                  }`}
                >
                  <IconComponent className={`${isLandscape ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobile Content Area - Responsive */}
        <div className={`flex-1 flex flex-col px-5 ${isLandscape ? 'pb-3' : 'pb-5'} overflow-hidden`}>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="pb-4">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Modern Design */}
      <div className="hidden md:block relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden border border-orange-500/30 shadow-2xl">
        
        {/* Desktop Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-600/20 rounded-xl border border-orange-500/30">
                <SettingsIcon className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Settings</h2>
                <p className="text-gray-400">Customize your TurfLoot experience</p>
              </div>
            </div>
            
            {/* Desktop Tab Switcher */}
            <div className="flex bg-gray-800/50 rounded-2xl p-1.5 border border-gray-700/50">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
                      activeTab === tab.id 
                        ? 'bg-orange-600 text-white shadow-lg transform scale-105' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Desktop Content */}
        <div className="p-8 overflow-y-auto h-[calc(95vh-120px)]">
          {renderContent()}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default UserSettings