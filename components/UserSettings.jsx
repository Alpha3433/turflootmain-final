'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { useGameSettings } from './providers/GameSettingsProvider'

const UserSettings = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('account')
  const [username, setUsername] = useState(user?.username || user?.custom_name || user?.google?.name || user?.email?.address || 'Player')
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)
  
  const { settings, updateSetting, resetSettings } = useGameSettings()

  // Update username when user prop changes
  useEffect(() => {
    if (user) {
      const currentName = user.custom_name || user.google?.name || user.email?.address || 'Player'
      setUsername(currentName)
    }
  }, [user])

  if (!isOpen) return null

  const tabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'game', label: 'Game', icon: '🎮' },
    { id: 'display', label: 'Display', icon: '🖥️' },
    { id: 'audio', label: 'Audio', icon: '🔊' },
    { id: 'legal', label: 'Legal', icon: '📄' }
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

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-5xl h-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-yellow-400">Settings</h1>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 p-6 pb-4 border-b border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full max-h-[calc(90vh-200px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default UserSettings