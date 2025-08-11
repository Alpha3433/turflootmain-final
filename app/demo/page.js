'use client'

import { useState } from 'react'
import UserProfile from '../../components/UserProfile'
import UserSettings from '../../components/UserSettings'

export default function ProfileSettingsDemo() {
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const demoUser = {
    username: 'wewae',
    email: { address: 'demo@turfloot.com' },
    id: 'demo-user-123',
    google: { name: 'Demo User' }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-yellow-400 mb-8 text-center">Profile & Settings Demo</h1>
        
        <div className="flex justify-center space-x-8 mb-12">
          <button
            onClick={() => setShowProfile(true)}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-lg transition-all hover:scale-105 shadow-lg"
          >
            👤 Open Profile
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-lg transition-all hover:scale-105 shadow-lg"
          >
            ⚙️ Open Settings
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Features Demonstrated</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-cyan-400 mb-3">👤 Profile Page</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• 🏆 Live leaderboard with top players</li>
                <li>• 🔍 Player search functionality</li>
                <li>• 📊 Game performance statistics</li>
                <li>• ⚔️ Combat & time tracking</li>
                <li>• 💰 Earnings overview</li>
                <li>• 👥 Friends management</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-yellow-400 mb-3">⚙️ Settings Page</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• 👤 Account management</li>
                <li>• 📝 Username updates</li>
                <li>• 💳 Wallet information</li>
                <li>• 🎮 Game preferences</li>
                <li>• 📄 Legal documents</li>
                <li>• 🗑️ Account deletion</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-3">✨ Design Features</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• 🎨 Dark theme with yellow/cyan accents matching TurfLoot branding</li>
            <li>• 📱 Responsive tabs and navigation</li>
            <li>• 🎯 Interactive elements with hover states</li>
            <li>• 📊 Live data integration ready</li>
            <li>• 🔒 Modal overlay system</li>
            <li>• 🎪 Professional gaming interface</li>
          </ul>
        </div>
      </div>

      {/* Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
        user={demoUser}
      />
      
      {/* Settings Modal */}
      <UserSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        user={demoUser}
      />
    </div>
  )
}