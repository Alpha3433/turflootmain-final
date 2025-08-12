'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  ShoppingCart, 
  Package, 
  Palette, 
  Crown, 
  Zap, 
  Sparkles, 
  Eye, 
  Search,
  Filter,
  RotateCcw,
  Play,
  Star,
  Lock,
  Check
} from 'lucide-react'

const CustomizationModal = ({ isOpen, onClose, userBalance = 1250 }) => {
  const [activeTab, setActiveTab] = useState('inventory') // inventory | shop
  const [activeCategory, setActiveCategory] = useState('skins')
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterRarity, setFilterRarity] = useState('all')
  const [previewAnimation, setPreviewAnimation] = useState('idle')
  const [playerData, setPlayerData] = useState({
    equippedSkin: 'default_blue',
    equippedHat: null,
    equippedTrail: 'default_sparkle',
    equippedBoost: null,
    equippedFace: 'normal_eyes'
  })

  // Mock data for customization items
  const mockItems = {
    skins: [
      { id: 'default_blue', name: 'Classic Blue', rarity: 'common', price: 0, owned: true, equipped: true, preview: '/previews/skin_blue.png' },
      { id: 'golden_snake', name: 'Golden Snake', rarity: 'legendary', price: 500, owned: true, equipped: false, preview: '/previews/skin_gold.png' },
      { id: 'neon_green', name: 'Neon Green', rarity: 'rare', price: 150, owned: true, equipped: false, preview: '/previews/skin_neon.png' },
      { id: 'fire_red', name: 'Fire Red', rarity: 'epic', price: 300, owned: false, equipped: false, preview: '/previews/skin_fire.png' },
      { id: 'ice_blue', name: 'Ice Blue', rarity: 'rare', price: 180, owned: false, equipped: false, preview: '/previews/skin_ice.png' },
      { id: 'shadow_black', name: 'Shadow Black', rarity: 'legendary', price: 600, owned: false, equipped: false, preview: '/previews/skin_shadow.png' }
    ],
    hats: [
      { id: 'crown_gold', name: 'Golden Crown', rarity: 'legendary', price: 400, owned: true, equipped: false, preview: '/previews/hat_crown.png' },
      { id: 'cap_baseball', name: 'Baseball Cap', rarity: 'common', price: 50, owned: true, equipped: false, preview: '/previews/hat_cap.png' },
      { id: 'helmet_space', name: 'Space Helmet', rarity: 'epic', price: 250, owned: false, equipped: false, preview: '/previews/hat_space.png' }
    ],
    trails: [
      { id: 'default_sparkle', name: 'Default Sparkle', rarity: 'common', price: 0, owned: true, equipped: true, preview: '/previews/trail_sparkle.png' },
      { id: 'rainbow_trail', name: 'Rainbow Trail', rarity: 'epic', price: 200, owned: true, equipped: false, preview: '/previews/trail_rainbow.png' },
      { id: 'fire_trail', name: 'Fire Trail', rarity: 'rare', price: 120, owned: false, equipped: false, preview: '/previews/trail_fire.png' }
    ],
    boosts: [
      // Removed boosts category as requested
    ],
    faces: [
      { id: 'normal_eyes', name: 'Normal Eyes', rarity: 'common', price: 0, owned: true, equipped: true, preview: '/previews/face_normal.png' },
      { id: 'angry_eyes', name: 'Angry Eyes', rarity: 'rare', price: 80, owned: true, equipped: false, preview: '/previews/face_angry.png' },
      { id: 'wink_eyes', name: 'Wink Eyes', rarity: 'rare', price: 75, owned: false, equipped: false, preview: '/previews/face_wink.png' }
    ]
  }

  const categories = [
    { id: 'skins', name: 'Skins', icon: Palette, color: 'text-blue-400' },
    { id: 'hats', name: 'Hats', icon: Crown, color: 'text-yellow-400' },
    { id: 'trails', name: 'Trails', icon: Sparkles, color: 'text-purple-400' },
    { id: 'boosts', name: 'Boosts', icon: Zap, color: 'text-green-400' },
    { id: 'faces', name: 'Faces', icon: Eye, color: 'text-pink-400' }
  ]

  const rarityColors = {
    common: 'border-gray-400 text-gray-400',
    rare: 'border-blue-400 text-blue-400',
    epic: 'border-purple-400 text-purple-400',
    legendary: 'border-yellow-400 text-yellow-400'
  }

  const rarityGlow = {
    common: 'shadow-lg',
    rare: 'shadow-blue-500/20 shadow-lg',
    epic: 'shadow-purple-500/20 shadow-lg',
    legendary: 'shadow-yellow-500/20 shadow-lg'
  }

  // Filter and sort items
  const getFilteredItems = () => {
    let items = mockItems[activeCategory] || []
    
    // Filter by tab (inventory/shop)
    if (activeTab === 'inventory') {
      items = items.filter(item => item.owned)
    }
    
    // Filter by search
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Filter by rarity
    if (filterRarity !== 'all') {
      items = items.filter(item => item.rarity === filterRarity)
    }
    
    // Sort items
    switch (sortBy) {
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'price':
        items.sort((a, b) => a.price - b.price)
        break
      case 'rarity':
        const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 }
        items.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity])
        break
      default: // newest
        items.reverse()
    }
    
    return items
  }

  const handleEquipItem = (item) => {
    if (!item.owned) return
    
    setPlayerData(prev => ({
      ...prev,
      [`equipped${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1, -1)}`]: item.id
    }))
  }

  const handlePurchaseItem = (item) => {
    if (item.owned || userBalance < item.price) return
    
    // Mock purchase logic
    console.log(`Purchasing ${item.name} for ${item.price} coins`)
    // In real app, this would make an API call
  }

  const triggerAnimation = (animationType) => {
    setPreviewAnimation(animationType)
    setTimeout(() => setPreviewAnimation('idle'), 2000)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl max-w-7xl w-full mx-4 h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Palette className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Customize Appearance</h2>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                  activeTab === 'inventory' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Inventory</span>
              </button>
              <button
                onClick={() => setActiveTab('shop')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                  activeTab === 'shop' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Shop</span>
              </button>
            </div>
          </div>
          
          {/* Currency Display */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500/30">
              <span className="text-yellow-400 font-bold">💰 {userBalance.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Left Sidebar - Categories & Filters */}
          <div className="w-64 bg-gray-800/30 border-r border-gray-700/50 p-4 overflow-y-auto">
            {/* Categories */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">CATEGORIES</h3>
              <div className="space-y-1">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                        activeCategory === category.id
                          ? 'bg-purple-600/20 border border-purple-500/30'
                          : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${category.color}`} />
                      <span className="text-white text-sm">{category.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search & Filters */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-400 mb-2 block">SEARCH</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:border-purple-400/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-400 mb-2 block">SORT BY</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:border-purple-400/50 focus:outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="rarity">Rarity</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-400 mb-2 block">RARITY</label>
                <select
                  value={filterRarity}
                  onChange={(e) => setFilterRarity(e.target.value)}
                  className="w-full p-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:border-purple-400/50 focus:outline-none"
                >
                  <option value="all">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Center - Item Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-4 gap-4">
              {getFilteredItems().map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`relative bg-gray-800/50 rounded-lg p-4 border-2 cursor-pointer transition-all hover:scale-105 ${
                    item.equipped ? 'border-green-400 bg-green-400/10' : rarityColors[item.rarity]
                  } ${rarityGlow[item.rarity]} ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400' : ''}`}
                >
                  {/* Item Preview */}
                  <div className="aspect-square bg-gray-700/30 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    {/* Mock preview - in real app this would be actual item preview */}
                    <div className={`w-16 h-16 rounded-full ${
                      item.rarity === 'legendary' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                      item.rarity === 'epic' ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                      item.rarity === 'rare' ? 'bg-gradient-to-br from-blue-400 to-cyan-500' :
                      'bg-gradient-to-br from-gray-400 to-gray-600'
                    } ${!item.owned ? 'grayscale' : ''}`} />
                    
                    {/* Equipped indicator */}
                    {item.equipped && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    {/* Locked indicator */}
                    {!item.owned && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Item Info */}
                  <div className="text-center">
                    <h4 className="text-white text-sm font-semibold mb-1 truncate">{item.name}</h4>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className={`text-xs ${rarityColors[item.rarity]} capitalize`}>
                        {item.rarity}
                      </span>
                      {Array.from({ length: item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 4 : item.rarity === 'rare' ? 3 : 2 }).map((_, i) => (
                        <Star key={i} className={`w-2 h-2 ${rarityColors[item.rarity]} fill-current`} />
                      ))}
                    </div>
                    {!item.owned && (
                      <div className="text-yellow-400 text-sm font-bold">
                        💰 {item.price}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar - Preview & Details */}
          <div className="w-80 bg-gray-800/30 border-l border-gray-700/50 p-6 overflow-y-auto">
            {/* Live Preview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
              <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-600/50 mb-4">
                {/* Character Preview */}
                <div className="flex justify-center mb-4">
                  <div className={`w-20 h-20 rounded-full border-4 border-cyan-300 flex items-center justify-center transition-all duration-500 ${
                    previewAnimation === 'spin' ? 'animate-spin' :
                    previewAnimation === 'bounce' ? 'animate-bounce' :
                    previewAnimation === 'pulse' ? 'animate-pulse' :
                    'animate-breathe'
                  } ${
                    selectedItem && activeCategory === 'skins' ? 
                      selectedItem.rarity === 'legendary' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                      selectedItem.rarity === 'epic' ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                      selectedItem.rarity === 'rare' ? 'bg-gradient-to-br from-blue-400 to-cyan-500' :
                      'bg-cyan-400'
                    : 'bg-cyan-400'
                  }`}>
                    <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-6"></div>
                    <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-6"></div>
                  </div>
                </div>

                {/* Animation Controls */}
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => triggerAnimation('spin')}
                    className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                    title="Spin"
                  >
                    <RotateCcw className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => triggerAnimation('bounce')}
                    className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                    title="Jump"
                  >
                    <Play className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => triggerAnimation('pulse')}
                    className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                    title="Pulse"
                  >
                    <Sparkles className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Item Details */}
            {selectedItem && (
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/50">
                <h4 className="text-white text-lg font-semibold mb-3">{selectedItem.name}</h4>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white capitalize">{activeCategory.slice(0, -1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rarity:</span>
                    <span className={`${rarityColors[selectedItem.rarity]} capitalize font-semibold`}>
                      {selectedItem.rarity}
                    </span>
                  </div>
                  {!selectedItem.owned && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <span className="text-yellow-400 font-bold">💰 {selectedItem.price}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {selectedItem.owned ? (
                    <button
                      onClick={() => handleEquipItem(selectedItem)}
                      disabled={selectedItem.equipped}
                      className={`w-full py-3 rounded-lg font-semibold transition-all ${
                        selectedItem.equipped
                          ? 'bg-green-600/20 border border-green-500/30 text-green-400 cursor-not-allowed'
                          : 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 hover:scale-105'
                      }`}
                    >
                      {selectedItem.equipped ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchaseItem(selectedItem)}
                      disabled={userBalance < selectedItem.price}
                      className={`w-full py-3 rounded-lg font-semibold transition-all ${
                        userBalance < selectedItem.price
                          ? 'bg-gray-600/20 border border-gray-500/30 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 hover:scale-105'
                      }`}
                    >
                      {userBalance < selectedItem.price ? 'Insufficient Funds' : `Purchase for 💰 ${selectedItem.price}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CustomizationModal