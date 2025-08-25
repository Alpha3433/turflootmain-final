'use client'

import { useState, useEffect, useRef } from 'react'
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
  Check,
  ArrowUp,
  Flame,
  Diamond,
  Wand2
} from 'lucide-react'
import { SkinMaterials, TrailMaterials, HatMaterials, MaterialRenderer, RarityTiers, RarityUpgrade } from '../character/MaterialSystem'

const EnhancedCustomizationModal = ({ isOpen, onClose, userBalance = 2500 }) => {
  const [activeTab, setActiveTab] = useState('inventory')
  const [activeCategory, setActiveCategory] = useState('skins')
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('rarity')
  const [filterRarity, setFilterRarity] = useState('all')
  const [previewAnimation, setPreviewAnimation] = useState('idle')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const previewRef = useRef(null)
  
  // Enhanced player data with material system
  const [playerData, setPlayerData] = useState({
    equippedSkin: 'matte_blue',
    equippedTrail: 'basic_sparkle',
    equippedFace: 'normal_eyes',
    ownedItems: new Set(['matte_blue', 'basic_sparkle', 'normal_eyes', 'chrome_steel', 'rainbow_holo'])
  })

  // Combined materials data
  const [materialsData] = useState({
    skins: Object.values(SkinMaterials),
    trails: Object.values(TrailMaterials),
    faces: [
      { id: 'normal_eyes', name: 'Normal Eyes', rarity: RarityTiers.COMMON, price: 0, type: 'basic' },
      { id: 'angry_eyes', name: 'Angry Eyes', rarity: RarityTiers.RARE, price: 80, type: 'basic' },
      { id: 'cyber_eyes', name: 'Cyber Eyes', rarity: RarityTiers.EPIC, price: 200, type: 'animated' },
      { id: 'galaxy_eyes', name: 'Galaxy Eyes', rarity: RarityTiers.LEGENDARY, price: 500, type: 'particle' }
    ]
  })

  const categories = [
    { id: 'skins', name: 'Skins', icon: Palette, color: 'text-blue-400' },
    { id: 'trails', name: 'Trails', icon: Sparkles, color: 'text-purple-400' },
    { id: 'faces', name: 'Faces', icon: Eye, color: 'text-pink-400' }
  ]

  // Enhanced filtering and sorting
  const getFilteredItems = () => {
    let items = materialsData[activeCategory] || []
    
    // Filter by tab (inventory/shop)
    if (activeTab === 'inventory') {
      items = items.filter(item => playerData.ownedItems.has(item.id))
    }
    
    // Filter by search
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Filter by rarity
    if (filterRarity !== 'all') {
      items = items.filter(item => item.rarity.name.toLowerCase() === filterRarity)
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
        const rarityOrder = { 'Common': 0, 'Rare': 1, 'Epic': 2, 'Legendary': 3 }
        items.sort((a, b) => rarityOrder[b.rarity.name] - rarityOrder[a.rarity.name])
        break
      default:
        items.reverse()
    }
    
    return items
  }

  // Enhanced preview with material effects
  useEffect(() => {
    if (selectedItem && previewRef.current) {
      // Apply material effects to preview
      MaterialRenderer.applyMaterial(previewRef.current, selectedItem)
    }
  }, [selectedItem])

  // Enhanced equip function
  const handleEquipItem = (item) => {
    if (!playerData.ownedItems.has(item.id)) return
    
    setPlayerData(prev => ({
      ...prev,
      [`equipped${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1, -1)}`]: item.id
    }))
    
    // Save to localStorage
    const customizationData = {
      skin: activeCategory === 'skins' ? item.id : playerData.equippedSkin,
      trail: activeCategory === 'trails' ? item.id : playerData.equippedTrail,
      face: activeCategory === 'faces' ? item.id : playerData.equippedFace
    }
    
    localStorage.setItem('turfloot_player_customization', JSON.stringify(customizationData))
  }

  // Enhanced purchase with rarity effects
  const handlePurchaseItem = (item) => {
    if (playerData.ownedItems.has(item.id) || userBalance < item.price) return
    
    setPlayerData(prev => ({
      ...prev,
      ownedItems: new Set([...prev.ownedItems, item.id])
    }))
    
    // Trigger purchase animation based on rarity
    triggerPurchaseAnimation(item.rarity.name)
  }

  // Material upgrade system
  const handleUpgradeItem = (item) => {
    if (!RarityUpgrade.canUpgrade(item, userBalance)) return
    
    const upgradedItem = RarityUpgrade.upgradeRarity(item)
    setShowUpgradeModal(false)
    // Update item in materials data (in real app, this would be server-side)
  }

  const triggerPurchaseAnimation = (rarity) => {
    setPreviewAnimation(rarity.toLowerCase())
    setTimeout(() => setPreviewAnimation('idle'), 3000)
  }

  const getRarityIcon = (rarity) => {
    switch (rarity.name) {
      case 'Common': return <div className="w-2 h-2 bg-gray-400 rounded-full" />
      case 'Rare': return <Star className="w-3 h-3 text-blue-400" />
      case 'Epic': return <Diamond className="w-3 h-3 text-purple-400" />
      case 'Legendary': return <Flame className="w-3 h-3 text-yellow-400" />
      default: return null
    }
  }

  const getMaterialTypeIcon = (type) => {
    switch (type) {
      case 'metallic': return <div className="text-gray-300">⚡</div>
      case 'holographic': return <div className="text-purple-400">🌈</div>
      case 'animated': return <div className="text-green-400">🔄</div>
      case 'particle': return <div className="text-yellow-400">✨</div>
      case 'glow': return <div className="text-cyan-400">💫</div>
      default: return null
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-8xl w-full mx-4 h-[95vh] overflow-hidden border-2 border-purple-500/40 shadow-2xl">
        
        {/* Enhanced Header with Premium Look */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">Premium Customization</h2>
                <p className="text-purple-300 text-sm">Legendary Materials & Effects</p>
              </div>
            </div>
            
            {/* Enhanced Tab Switcher */}
            <div className="flex bg-gray-800/60 rounded-xl p-1.5 border border-purple-500/20">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'inventory' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Package className="w-5 h-5" />
                <span>My Collection</span>
              </button>
              <button
                onClick={() => setActiveTab('shop')}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'shop' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Premium Store</span>
              </button>
            </div>
          </div>
          
          {/* Enhanced Currency Display */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-6 py-3 rounded-xl border border-yellow-500/30">
              <div className="text-2xl">💎</div>
              <div>
                <div className="text-yellow-400 font-black text-lg">{userBalance.toLocaleString()}</div>
                <div className="text-yellow-300 text-xs">Premium Crystals</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all border border-gray-600/50 hover:border-gray-500/50"
            >
              <X className="w-6 h-6 text-gray-300" />
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Enhanced Left Sidebar */}
          <div className="w-80 bg-gradient-to-b from-gray-800/40 to-gray-900/60 border-r border-gray-700/50 p-6 overflow-y-auto">
            
            {/* Enhanced Categories */}
            <div className="mb-8">
              <h3 className="text-sm font-black text-purple-300 mb-4 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>CATEGORIES</span>
              </h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon
                  const itemCount = materialsData[category.id]?.length || 0
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-left transition-all border ${
                        activeCategory === category.id
                          ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 border-purple-500/50 shadow-lg'
                          : 'hover:bg-gray-700/40 border-gray-600/30 hover:border-gray-500/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${category.color}`} />
                        <span className="text-white font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-700/60 px-2 py-1 rounded-full">
                        {itemCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Enhanced Search & Filters */}
            <div className="space-y-6">
              <div>
                <label className="text-sm font-black text-purple-300 mb-3 block flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>SEARCH ITEMS</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-500/50 focus:bg-gray-800/80 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-purple-300 mb-3 block flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>FILTER BY RARITY</span>
                </label>
                <select
                  value={filterRarity}
                  onChange={(e) => setFilterRarity(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white focus:border-purple-500/50 transition-all"
                >
                  <option value="all">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-black text-purple-300 mb-3 block">SORT BY</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white focus:border-purple-500/50 transition-all"
                >
                  <option value="rarity">Rarity</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Enhanced Main Content Area */}
          <div className="flex-1 flex">
            
            {/* Enhanced Items Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {getFilteredItems().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`relative group cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                      item.rarity.name === 'Legendary' ? 'border-yellow-400/60 bg-gradient-to-br from-yellow-500/10 to-orange-500/10' :
                      item.rarity.name === 'Epic' ? 'border-purple-400/60 bg-gradient-to-br from-purple-500/10 to-pink-500/10' :
                      item.rarity.name === 'Rare' ? 'border-blue-400/60 bg-gradient-to-br from-blue-500/10 to-cyan-500/10' :
                      'border-gray-600/60 bg-gradient-to-br from-gray-500/10 to-gray-600/10'
                    }`}
                    style={{
                      boxShadow: `0 0 30px ${item.rarity.glow}`
                    }}
                  >
                    
                    {/* Item Preview */}
                    <div className="relative w-full h-32 mb-4 rounded-xl overflow-hidden">
                      <div
                        ref={selectedItem?.id === item.id ? previewRef : null}
                        className="w-full h-full rounded-xl"
                        style={{
                          background: item.gradient || item.rarity.color,
                          animation: item.animation || 'none'
                        }}
                      >
                        {/* Material Type Indicator */}
                        <div className="absolute top-2 right-2 bg-black/60 rounded-lg p-1">
                          {getMaterialTypeIcon(item.type)}
                        </div>
                      </div>
                    </div>

                    {/* Item Info */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-bold text-lg">{item.name}</h4>
                        <div className="flex items-center space-x-1">
                          {getRarityIcon(item.rarity)}
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm line-clamp-2">
                        {item.description || 'Premium material with enhanced effects'}
                      </p>

                      {/* Rarity Badge */}
                      <div className="flex items-center justify-between">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-bold border"
                          style={{ 
                            color: item.rarity.color,
                            borderColor: item.rarity.color + '40',
                            backgroundColor: item.rarity.color + '15'
                          }}
                        >
                          {item.rarity.name}
                        </span>
                        
                        {item.price > 0 && (
                          <div className="flex items-center space-x-1 text-yellow-400 font-bold">
                            <span>💎</span>
                            <span>{item.price}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2 pt-2">
                        {playerData.ownedItems.has(item.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEquipItem(item)
                            }}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition-all flex items-center justify-center space-x-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>Equip</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePurchaseItem(item)
                            }}
                            disabled={userBalance < item.price}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-4 rounded-xl transition-all flex items-center justify-center space-x-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span>Buy</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Preview Panel */}
            {selectedItem && (
              <div className="w-96 bg-gradient-to-b from-gray-800/60 to-gray-900/80 border-l border-gray-700/50 p-6">
                <div className="space-y-6">
                  
                  {/* Large Preview */}
                  <div className="relative">
                    <div className="w-full h-64 rounded-2xl overflow-hidden border-2 border-gray-600/50">
                      <div
                        className="w-full h-full"
                        style={{
                          background: selectedItem.gradient || selectedItem.rarity.color,
                          animation: selectedItem.animation || 'none'
                        }}
                      />
                    </div>
                    
                    {/* Preview Controls */}
                    <div className="absolute bottom-4 right-4 space-x-2">
                      <button
                        onClick={() => triggerAnimation('pulse')}
                        className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-all"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPreviewAnimation('idle')}
                        className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Item Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-black text-white mb-2">{selectedItem.name}</h3>
                      <p className="text-gray-300 leading-relaxed">{selectedItem.description}</p>
                    </div>

                    {/* Material Properties */}
                    <div className="bg-gray-800/40 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-purple-300 mb-3">Material Properties</h4>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white ml-2 capitalize">{selectedItem.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Rarity:</span>
                          <span className="ml-2" style={{ color: selectedItem.rarity.color }}>
                            {selectedItem.rarity.name}
                          </span>
                        </div>
                        {selectedItem.animation && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Effects:</span>
                            <span className="text-cyan-300 ml-2">Animated</span>
                          </div>
                        )}
                        {selectedItem.particles && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Particles:</span>
                            <span className="text-yellow-300 ml-2">Dynamic</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Advanced Actions */}
                    <div className="space-y-3">
                      {playerData.ownedItems.has(selectedItem.id) ? (
                        <>
                          <button
                            onClick={() => handleEquipItem(selectedItem)}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2"
                          >
                            <Check className="w-5 h-5" />
                            <span>Equip Material</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handlePurchaseItem(selectedItem)}
                          disabled={userBalance < selectedItem.price}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2"
                        >
                          <ShoppingCart className="w-5 h-5" />
                          <span>Purchase for 💎{selectedItem.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
    document.body
  )
}

export default EnhancedCustomizationModal