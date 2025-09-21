'use client'

import { useState, useEffect } from 'react'
import { X, Trophy, Crown, Zap, Target, Clock, DollarSign, Star } from 'lucide-react'

const Achievements = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('achievements')
  const [loading, setLoading] = useState(false)
  const [achievementData, setAchievementData] = useState({
    season: null,
    totalAP: 0,
    achievements: [],
    progress: {},
    cosmetics: { unlocked: [], available: [] }
  })
  const [dailyChallenge, setDailyChallenge] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')

  // Load achievement data when component opens
  useEffect(() => {
    if (isOpen) {
      loadAchievementData()
      loadDailyChallenge()
    }
  }, [isOpen])

  const loadAchievementData = async () => {
    try {
      setLoading(true)
      console.log('🏆 Loading achievement data')
      
      const userId = user?.id || user?.privyId || 'demo-user'
      const response = await fetch(`/api/achievements/progress?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Achievement data received:', data)
        setAchievementData(data)
      } else {
        console.error('Failed to load achievement data:', response.status)
      }
    } catch (error) {
      console.error('Error loading achievement data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDailyChallenge = async () => {
    try {
      const userId = user?.id || user?.privyId || 'demo-user'
      const response = await fetch(`/api/achievements/daily-challenge?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        setDailyChallenge(data.challenge)
      }
    } catch (error) {
      console.error('Error loading daily challenge:', error)
    }
  }

  const unlockCosmetic = async (cosmetic) => {
    try {
      const userId = user?.id || user?.privyId || 'demo-user'
      const response = await fetch('/api/achievements/unlock-cosmetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cosmeticId: cosmetic.id })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Cosmetic unlocked:', result)
        
        // Update local state
        setAchievementData(prev => ({
          ...prev,
          totalAP: result.remainingAP,
          cosmetics: {
            ...prev.cosmetics,
            unlocked: [...prev.cosmetics.unlocked, cosmetic.id]
          }
        }))
        
        alert(`🎉 Unlocked ${cosmetic.name}!`)
      } else {
        const error = await response.json()
        alert(`❌ ${error.error}`)
      }
    } catch (error) {
      console.error('Error unlocking cosmetic:', error)
      alert('❌ Failed to unlock cosmetic')
    }
  }

  const getUserTier = (totalAP) => {
    if (totalAP >= 4000) return { name: 'prestige', color: '#9d4edd', displayName: 'Prestige' }
    if (totalAP >= 2000) return { name: 'gold', color: '#ffd700', displayName: 'Gold' }
    if (totalAP >= 800) return { name: 'silver', color: '#c0c0c0', displayName: 'Silver' }
    return { name: 'bronze', color: '#cd7f32', displayName: 'Bronze' }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'persistence': return <Clock className="w-4 h-4" />
      case 'combat': return <Target className="w-4 h-4" />
      case 'earnings': return <DollarSign className="w-4 h-4" />
      case 'skill': return <Trophy className="w-4 h-4" />
      default: return <Star className="w-4 h-4" />
    }
  }

  const currentTier = getUserTier(achievementData.totalAP)
  const filteredAchievements = achievementData.achievements.filter(
    achievement => filterCategory === 'all' || achievement.category === filterCategory
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-md border border-yellow-400/30 rounded-2xl w-full max-w-6xl h-[80vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-4">
            <div className="text-3xl">🏆</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Achievement System</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>Season {achievementData.season?.number || 1}</span>
                <span>•</span>
                <span>{achievementData.season?.daysRemaining || 0} days remaining</span>
                <span>•</span>
                <span style={{ color: currentTier.color }}>{currentTier.displayName} Tier</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* AP Counter */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">💎</div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{achievementData.totalAP} AP</div>
                <div className="text-sm text-gray-400">Achievement Points</div>
              </div>
            </div>
            
            {/* Daily Challenge */}
            {dailyChallenge && (
              <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg p-3 border border-yellow-400/20">
                <div className="text-2xl">{dailyChallenge.icon}</div>
                <div>
                  <div className="font-bold text-yellow-400">{dailyChallenge.name}</div>
                  <div className="text-xs text-gray-400">{dailyChallenge.description}</div>
                  <div className="text-xs text-green-400">+{dailyChallenge.ap} AP • Expires in {dailyChallenge.expiresIn}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex h-full">
          {/* Navigation Tabs */}
          <div className="w-48 border-r border-gray-700/50 p-4">
            <div className="space-y-2">
              {[
                { id: 'achievements', label: '🏆 Achievements', icon: Trophy },
                { id: 'cosmetics', label: '🎨 Cosmetics', icon: Crown }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-3 ${
                    activeTab === tab.id
                      ? 'bg-yellow-400 text-black'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Category Filters (for achievements tab) */}
            {activeTab === 'achievements' && (
              <div className="mt-6 space-y-2">
                <div className="text-sm font-bold text-gray-400 mb-2">Categories</div>
                {[
                  { id: 'all', label: 'All', icon: Star },
                  { id: 'persistence', label: 'Persistence', icon: Clock },
                  { id: 'combat', label: 'Combat', icon: Target },
                  { id: 'earnings', label: 'Earnings', icon: DollarSign },
                  { id: 'skill', label: 'Skill', icon: Trophy }
                ].map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setFilterCategory(category.id)}
                    className={`w-full px-3 py-2 rounded text-sm transition-colors flex items-center space-x-2 ${
                      filterCategory === category.id
                        ? 'bg-yellow-400/20 text-yellow-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <category.icon className="w-3 h-3" />
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="text-4xl animate-spin">⏳</div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Loading Achievement Data...</h3>
                  <p className="text-gray-400">Please wait while we fetch your progress</p>
                </div>
              </div>
            ) : activeTab === 'achievements' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {filterCategory === 'all' ? 'All Achievements' : 
                     filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1) + ' Achievements'}
                  </h3>
                  <div className="text-sm text-gray-400">
                    {filteredAchievements.filter(a => achievementData.progress[a.id]?.completed).length} / {filteredAchievements.length} completed
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAchievements.map((achievement) => {
                    const progress = achievementData.progress[achievement.id] || {}
                    const isCompleted = progress.completed
                    const canClaim = progress.canClaim

                    return (
                      <div
                        key={achievement.id}
                        className={`bg-gray-800/50 rounded-lg p-4 border transition-all ${
                          isCompleted 
                            ? 'border-green-400/50 bg-green-400/5'
                            : canClaim
                            ? 'border-yellow-400/50 bg-yellow-400/5'
                            : 'border-gray-600/30 hover:border-gray-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`text-2xl ${isCompleted ? 'grayscale-0' : 'grayscale'}`}>
                              {achievement.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-bold ${isCompleted ? 'text-green-400' : 'text-white'}`}>
                                  {achievement.name}
                                </h4>
                                {getCategoryIcon(achievement.category)}
                              </div>
                              <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    isCompleted ? 'bg-green-400' : 'bg-yellow-400'
                                  }`}
                                  style={{ width: `${Math.min(100, progress.percentage || 0)}%` }}
                                />
                              </div>
                              
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">
                                  {progress.current || 0} / {progress.required || 0}
                                </span>
                                <span className={`font-bold ${isCompleted ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {isCompleted ? '✅ Complete' : `${progress.percentage || 0}%`}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`font-bold ${isCompleted ? 'text-green-400' : 'text-yellow-400'}`}>
                              +{achievement.ap} AP
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              achievement.tier === 'prestige' ? 'bg-purple-500/20 text-purple-400' :
                              achievement.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                              achievement.tier === 'silver' ? 'bg-gray-500/20 text-gray-400' :
                              'bg-amber-600/20 text-amber-400'
                            }`}>
                              {achievement.tier.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              // Cosmetics Tab
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">Cosmetic Shop</h3>
                
                {/* Tier Sections */}
                {['bronze', 'silver', 'gold', 'prestige'].map((tier) => {
                  const tierCosmetics = achievementData.cosmetics.available.filter(c => c.tier === tier)
                  if (tierCosmetics.length === 0) return null

                  const tierColor = tier === 'prestige' ? '#9d4edd' : 
                                   tier === 'gold' ? '#ffd700' : 
                                   tier === 'silver' ? '#c0c0c0' : '#cd7f32'

                  return (
                    <div key={tier} className="space-y-4">
                      <h4 className="text-lg font-bold" style={{ color: tierColor }}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tierCosmetics.map((cosmetic) => {
                          const isUnlocked = achievementData.cosmetics.unlocked.includes(cosmetic.id)
                          const canAfford = achievementData.totalAP >= cosmetic.cost

                          return (
                            <div
                              key={cosmetic.id}
                              className={`bg-gray-800/50 rounded-lg p-4 border transition-all ${
                                isUnlocked 
                                  ? 'border-green-400/50 bg-green-400/5'
                                  : 'border-gray-600/30 hover:border-gray-500/50'
                              }`}
                            >
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="text-2xl">{cosmetic.icon}</div>
                                <div>
                                  <h5 className={`font-bold ${isUnlocked ? 'text-green-400' : 'text-white'}`}>
                                    {cosmetic.name}
                                  </h5>
                                  <p className="text-xs text-gray-400">{cosmetic.description}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="text-yellow-400 font-bold">
                                  {cosmetic.cost} AP
                                </div>
                                
                                {isUnlocked ? (
                                  <div className="px-3 py-1 bg-green-400/20 text-green-400 rounded text-sm">
                                    ✅ Owned
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => unlockCosmetic(cosmetic)}
                                    disabled={!canAfford}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                      canAfford
                                        ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    {canAfford ? 'Unlock' : 'Need More AP'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Achievements