'use client'

import { useState } from 'react'
import { X, Copy } from 'lucide-react'

const UserSettings = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('account')
  const [username, setUsername] = useState(user?.username || 'wewae')

  if (!isOpen) return null

  const tabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'game', label: 'Game', icon: '🎮' },
    { id: 'legal', label: 'Legal', icon: '📄' }
  ]

  const handleUpdateUsername = () => {
    // TODO: Implement username update logic
    console.log('Updating username to:', username)
  }

  const copyWalletAddress = () => {
    const walletAddress = '89aJtp...JP8nGv'
    navigator.clipboard.writeText(walletAddress)
    // TODO: Show success toast
  }

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
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            📝 Update
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
              <span className="text-white font-mono">Connect wallet to view address</span>
            </div>
            <button
              onClick={copyWalletAddress}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Copy wallet address"
              disabled
            >
              <Copy size={18} />
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
            <span className="text-white font-medium">Login to view date</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="text-gray-400">🔥</div>
              <span className="text-gray-400">Login Streak</span>
            </div>
            <span className="text-white font-medium">Play games to build streak</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGameTab = () => (
    <div className="space-y-8">
      {/* Game Settings */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Gameplay Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Show Ping Monitor</div>
              <div className="text-sm text-gray-400">Display network latency in bottom left</div>
            </div>
            <button className="w-12 h-6 bg-green-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Kill Feed</div>
              <div className="text-sm text-gray-400">Show elimination notifications</div>
            </div>
            <button className="w-12 h-6 bg-green-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Auto Cash Out</div>
              <div className="text-sm text-gray-400">Automatically cash out at threshold</div>
            </div>
            <button className="w-12 h-6 bg-gray-600 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
            </button>
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
            <select className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Frame Rate</div>
              <div className="text-sm text-gray-400">Target FPS for smooth gameplay</div>
            </div>
            <select className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white">
              <option>60 FPS</option>
              <option>30 FPS</option>
              <option>Unlimited</option>
            </select>
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
                  <div className="text-sm text-gray-400">Last updated: August 8, 2025</div>
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
                  <div className="text-sm text-gray-400">Last updated: August 8, 2025</div>
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

      {/* Account Management */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Account Management</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-4 bg-yellow-400/10 hover:bg-yellow-400/20 rounded-lg border border-yellow-400/30 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="text-xl">📊</div>
              <div>
                <div className="text-yellow-400 font-medium">Export Data</div>
                <div className="text-sm text-gray-400">Download your game statistics</div>
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
      case 'legal': return renderLegalTab()
      default: return renderAccountTab()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl h-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-yellow-400">Settings</h1>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 p-6 pb-4 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
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
        <div className="p-6 overflow-y-auto h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default UserSettings