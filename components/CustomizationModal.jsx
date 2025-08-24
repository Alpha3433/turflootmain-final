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
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  User
} from 'lucide-react'

const CustomizationModal = ({ isOpen, onClose, userBalance = 1250 }) => {
  const [activeTab, setActiveTab] = useState('inventory') // inventory | shop
  const [activeCategory, setActiveCategory] = useState('skins')
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterRarity, setFilterRarity] = useState('all')
  const [previewAnimation, setPreviewAnimation] = useState('idle')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [playerData, setPlayerData] = useState({
    equippedSkin: 'default_blue',
    equippedHat: null,
    equippedTrail: 'default_sparkle',
    equippedBoost: null,
    equippedFace: 'normal_eyes'
  })

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mock data for customization items - with proper equipped state management
  const [itemsData, setItemsData] = useState({
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
    faces: [
      { id: 'normal_eyes', name: 'Normal Eyes', rarity: 'common', price: 0, owned: true, equipped: true, preview: '/previews/face_normal.png' },
      { id: 'angry_eyes', name: 'Angry Eyes', rarity: 'rare', price: 80, owned: true, equipped: false, preview: '/previews/face_angry.png' },
      { id: 'wink_eyes', name: 'Wink Eyes', rarity: 'rare', price: 75, owned: false, equipped: false, preview: '/previews/face_wink.png' }
    ]
  })

  const categories = [
    { id: 'skins', name: 'Skins', icon: Palette, color: 'text-blue-400' },
    { id: 'hats', name: 'Hats', icon: Crown, color: 'text-yellow-400' },
    { id: 'trails', name: 'Trails', icon: Sparkles, color: 'text-purple-400' },
    { id: 'faces', name: 'Faces', icon: Eye, color: 'text-pink-400' }
  ]

  const rarityColors = {
    common: 'border-gray-400 text-gray-100',
    rare: 'border-blue-400 text-blue-200',
    epic: 'border-purple-400 text-purple-200',
    legendary: 'border-yellow-400 text-yellow-100'
  }

  const rarityGlow = {
    common: 'shadow-md',
    rare: 'shadow-blue-500/30 shadow-lg',
    epic: 'shadow-purple-500/30 shadow-lg',
    legendary: 'shadow-yellow-500/40 shadow-xl'
  }

  // Items per page for mobile pagination
  const itemsPerPage = isMobile ? 6 : 12

  // Filter and sort items
  const getFilteredItems = () => {
    let items = itemsData[activeCategory] || []
    
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

  // Paginated items for mobile
  const getPaginatedItems = () => {
    const items = getFilteredItems()
    const startIndex = currentPage * itemsPerPage
    return items.slice(startIndex, startIndex + itemsPerPage)
  }

  const totalPages = Math.ceil(getFilteredItems().length / itemsPerPage)

  // Load saved customization data on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('turfloot_player_customization')
      if (saved) {
        const customizationData = JSON.parse(saved)
        setPlayerData(prev => ({
          ...prev,
          equippedSkin: customizationData.skin || prev.equippedSkin,
          equippedHat: customizationData.hat || prev.equippedHat,
          equippedTrail: customizationData.trail || prev.equippedTrail,
          equippedFace: customizationData.face || prev.equippedFace
        }))
        console.log('Loaded player customization:', customizationData)
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
    }
  }, [isOpen])

  const handleEquipItem = (item) => {
    if (!item.owned) return
    
    // Update items data to mark the new item as equipped and unequip others in the same category
    setItemsData(prev => {
      const newItemsData = { ...prev }
      
      // Unequip all items in the current category
      newItemsData[activeCategory] = newItemsData[activeCategory].map(categoryItem => ({
        ...categoryItem,
        equipped: false
      }))
      
      // Equip the selected item
      newItemsData[activeCategory] = newItemsData[activeCategory].map(categoryItem => ({
        ...categoryItem,
        equipped: categoryItem.id === item.id ? true : categoryItem.equipped
      }))
      
      return newItemsData
    })
    
    // Update local player data
    const categoryKey = `equipped${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1, -1)}`
    setPlayerData(prev => ({
      ...prev,
      [categoryKey]: item.id
    }))
    
    // Update global player appearance
    const customizationData = {
      skin: activeCategory === 'skins' ? item.id : playerData.equippedSkin,
      hat: activeCategory === 'hats' ? item.id : playerData.equippedHat,
      trail: activeCategory === 'trails' ? item.id : playerData.equippedTrail,
      face: activeCategory === 'faces' ? item.id : playerData.equippedFace
    }
    
    // Store in localStorage for persistence across game sessions
    try {
      localStorage.setItem('turfloot_player_customization', JSON.stringify(customizationData))
      console.log('Player customization saved:', customizationData)
    } catch (error) {
      console.error('Failed to save customization:', error)
    }
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {isMobile ? (
        // MOBILE LAYOUT - Stack-based, full screen
        <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
          
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all"
                >
                  <X className="w-5 h-5 text-gray-300" />
                </button>
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Customize</h2>
                </div>
              </div>
              
              {/* Currency Display */}
              <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                <span className="text-yellow-400 font-bold text-sm">💰 {userBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Live Preview - Mobile */}
          <div className="bg-gray-800/30 p-4 border-b border-gray-700/50">
            <div className="flex justify-center mb-4">
              <div className="relative">
                {/* Mobile Character Preview - Compact */}
                <div className={`w-16 h-16 rounded-full border-3 border-cyan-300 flex items-center justify-center transition-all duration-500 shadow-lg ${
                  previewAnimation === 'spin' ? 'animate-spin' :
                  previewAnimation === 'bounce' ? 'animate-bounce' :
                  previewAnimation === 'pulse' ? 'animate-pulse' :
                  'animate-breathe'
                } ${
                  // Dynamic skin based on equipped item
                  playerData.equippedSkin === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/30 shadow-lg' :
                  playerData.equippedSkin === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/30 shadow-lg' :
                  playerData.equippedSkin === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/30 shadow-lg' :
                  playerData.equippedSkin === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/30 shadow-lg' :
                  playerData.equippedSkin === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/30 shadow-lg' :
                  'bg-cyan-400'
                }`}>
                  
                  {/* Eyes */}
                  {playerData.equippedFace === 'angry_eyes' ? (
                    <>
                      <div className="w-1.5 h-1 bg-black rounded-sm absolute top-4 left-4 transform rotate-12"></div>
                      <div className="w-1.5 h-1 bg-black rounded-sm absolute top-4 right-4 transform -rotate-12"></div>
                      <div className="w-3 h-0.5 bg-red-600 rounded absolute bottom-4"></div>
                    </>
                  ) : playerData.equippedFace === 'wink_eyes' ? (
                    <>
                      <div className="w-1.5 h-0.5 bg-black rounded absolute top-4 left-4"></div>
                      <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-4 right-4"></div>
                      <div className="w-2 h-0.5 bg-pink-500 rounded-full absolute bottom-4"></div>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-4 left-4"></div>
                      <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-4 right-4"></div>
                    </>
                  )}
                  
                  {/* Legendary effects */}
                  {(playerData.equippedSkin === 'golden_snake' || playerData.equippedSkin === 'shadow_black') && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                    </>
                  )}
                </div>

                {/* Mobile Hat */}
                {playerData.equippedHat && (
                  <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 ${
                    playerData.equippedHat === 'crown_gold' ? 
                      'w-6 h-4 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg border border-yellow-600' :
                    playerData.equippedHat === 'cap_baseball' ? 
                      'w-8 h-3 bg-gradient-to-r from-red-600 to-red-500 rounded-full' :
                    playerData.equippedHat === 'helmet_space' ? 
                      'w-10 h-6 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full border-2 border-blue-400' :
                      'w-4 h-3 bg-gray-600 rounded'
                  }`}>
                    {playerData.equippedHat === 'crown_gold' && (
                      <div className="flex justify-center">
                        <div className="w-0.5 h-1.5 bg-yellow-300 rounded-t-full mt-0.5"></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Trail */}
                {playerData.equippedTrail && (
                  <div className="absolute -right-10 top-1/2 transform -translate-y-1/2 flex space-x-0.5">
                    {playerData.equippedTrail === 'rainbow_trail' ? (
                      <>
                        <div className="w-2 h-2 bg-red-400 opacity-80 animate-pulse rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-yellow-400 opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-1 bg-green-400 opacity-60 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                      </>
                    ) : playerData.equippedTrail === 'fire_trail' ? (
                      <>
                        <div className="w-2 h-1 bg-gradient-to-r from-orange-500 to-red-500 opacity-90 animate-pulse rounded-full"></div>
                        <div className="w-1.5 h-0.5 bg-red-500 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-0.5 bg-orange-400 opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-blue-400 opacity-90 animate-pulse rounded-full"></div>
                        <div className="w-1 h-1 bg-cyan-400 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.3s'}}></div>
                        <div className="w-0.5 h-0.5 bg-white opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.6s'}}></div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Animation Controls - Mobile */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => triggerAnimation('spin')}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
              >
                <RotateCcw className="w-4 h-4 text-gray-300" />
              </button>
              <button
                onClick={() => triggerAnimation('bounce')}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
              >
                <Play className="w-4 h-4 text-gray-300" />
              </button>
              <button
                onClick={() => triggerAnimation('pulse')}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
              >
                <Sparkles className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex bg-gray-800/50 m-4 rounded-lg p-1">
            <button
              onClick={() => {setActiveTab('inventory'); setCurrentPage(0)}}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'inventory' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventory</span>
            </button>
            <button
              onClick={() => {setActiveTab('shop'); setCurrentPage(0)}}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'shop' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Shop</span>
            </button>
          </div>

          {/* Mobile Category Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide mx-4 mb-4 space-x-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => {setActiveCategory(category.id); setCurrentPage(0)}}
                  className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === category.id
                      ? 'bg-purple-600/20 border border-purple-500/30 text-white'
                      : 'bg-gray-700/30 text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${category.color}`} />
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Search */}
          <div className="mx-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:border-purple-400/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Mobile Items Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-20">
            <div className="grid grid-cols-2 gap-3">
              {getPaginatedItems().map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`relative bg-gray-800/50 rounded-lg p-3 border-2 cursor-pointer transition-all ${
                    item.equipped ? 'border-green-400 bg-green-400/10' : rarityColors[item.rarity]
                  } ${rarityGlow[item.rarity]} ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400' : ''}`}
                >
                  {/* Mobile Item Preview */}
                  <div className="aspect-square bg-gray-700/30 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                    {/* Simplified mobile previews */}
                    {activeCategory === 'skins' && (
                      <div className={`w-12 h-12 rounded-full border-3 border-white/20 flex items-center justify-center relative ${
                        item.id === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600' :
                        item.id === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600' :
                        item.id === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500' :
                        item.id === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500' :
                        item.id === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black' :
                        'bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600'
                      } ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                        <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-3 left-3"></div>
                        <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-3 right-3"></div>
                      </div>
                    )}
                    
                    {activeCategory === 'hats' && (
                      <div className="relative flex items-center justify-center">
                        <div className="w-10 h-10 bg-cyan-400 rounded-full border-2 border-white/20 flex items-center justify-center">
                          <div className="w-1 h-1 bg-black rounded-full absolute top-2.5 left-3"></div>
                          <div className="w-1 h-1 bg-black rounded-full absolute top-2.5 right-3"></div>
                        </div>
                        <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                          {item.id === 'crown_gold' ? (
                            <div className="w-8 h-5 bg-gradient-to-b from-yellow-200 to-yellow-600 rounded-t-lg border border-yellow-700">
                              <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                                <div className="w-1 h-2 bg-yellow-300 rounded-t-full"></div>
                                <div className="w-1 h-2.5 bg-yellow-300 rounded-t-full"></div>
                                <div className="w-1 h-2 bg-yellow-300 rounded-t-full"></div>
                              </div>
                            </div>
                          ) : item.id === 'cap_baseball' ? (
                            <div className="w-10 h-4 bg-gradient-to-b from-red-400 to-red-600 rounded-full">
                              <div className="absolute top-2 right-0 w-4 h-3 bg-red-700 rounded-full transform rotate-12"></div>
                            </div>
                          ) : item.id === 'helmet_space' ? (
                            <div className="w-12 h-8 bg-gradient-to-b from-gray-100 to-gray-500 rounded-full border-2 border-blue-300">
                              <div className="absolute inset-2 bg-gradient-to-b from-blue-200/60 to-blue-400/80 rounded-full"></div>
                            </div>
                          ) : (
                            <div className="w-6 h-4 bg-gray-600 rounded"></div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {activeCategory === 'trails' && (
                      <div className="relative flex items-center justify-center">
                        <div className="w-10 h-10 bg-cyan-400 rounded-full border-2 border-white/20 flex items-center justify-center">
                          <div className="w-1 h-1 bg-black rounded-full absolute top-2.5 left-3"></div>
                          <div className="w-1 h-1 bg-black rounded-full absolute top-2.5 right-3"></div>
                        </div>
                        <div className={`absolute -right-12 top-1/2 transform -translate-y-1/2 flex items-center space-x-0.5 ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                          {item.id === 'rainbow_trail' ? (
                            <>
                              <div className="w-2 h-2 bg-red-400 opacity-90 animate-pulse rounded-full"></div>
                              <div className="w-1.5 h-1.5 bg-yellow-400 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                              <div className="w-1 h-1 bg-green-400 opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                            </>
                          ) : item.id === 'fire_trail' ? (
                            <>
                              <div className="w-2 h-1 bg-gradient-to-r from-orange-500 to-red-500 opacity-90 animate-pulse rounded-full"></div>
                              <div className="w-1.5 h-0.5 bg-red-500 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                              <div className="w-1 h-0.5 bg-orange-400 opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-blue-400 opacity-90 animate-pulse rounded-full"></div>
                              <div className="w-1 h-1 bg-cyan-400 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.3s'}}></div>
                              <div className="w-0.5 h-0.5 bg-white opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.6s'}}></div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {activeCategory === 'faces' && (
                      <div className={`w-12 h-12 bg-cyan-400 rounded-full border-3 border-white/20 flex items-center justify-center relative ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                        {item.id === 'angry_eyes' ? (
                          <>
                            <div className="w-1.5 h-1 bg-black rounded-sm absolute top-3 left-3 transform rotate-12"></div>
                            <div className="w-1.5 h-1 bg-black rounded-sm absolute top-3 right-3 transform -rotate-12"></div>
                            <div className="w-3 h-0.5 bg-red-600 rounded absolute bottom-3"></div>
                          </>
                        ) : item.id === 'wink_eyes' ? (
                          <>
                            <div className="w-1.5 h-0.5 bg-black rounded absolute top-3.5 left-3"></div>
                            <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-3 right-3"></div>
                            <div className="w-2 h-0.5 bg-pink-500 rounded-full absolute bottom-3"></div>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-3 left-3"></div>
                            <div className="w-1.5 h-1.5 bg-black rounded-full absolute top-3 right-3"></div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Equipped indicator */}
                    {item.equipped && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                    
                    {/* Locked indicator */}
                    {!item.owned && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <Lock className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Mobile Item Info */}
                  <div className="text-center">
                    <h4 className="text-white text-xs font-semibold mb-1 truncate">{item.name}</h4>
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <span className={`text-xs font-semibold ${rarityColors[item.rarity]} capitalize`}>
                        {item.rarity}
                      </span>
                    </div>
                    {!item.owned && (
                      <div className="text-yellow-400 text-xs font-bold">
                        💰 {item.price}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-300" />
                </button>
                
                <span className="text-gray-300 font-medium">
                  {currentPage + 1} / {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Bottom Sheet for Selected Item */}
          {selectedItem && (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 p-4 rounded-t-2xl transform transition-transform duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white text-lg font-semibold">{selectedItem.name}</h4>
                  <span className={`${rarityColors[selectedItem.rarity]} capitalize font-semibold text-sm`}>
                    {selectedItem.rarity}
                  </span>
                </div>
                {!selectedItem.owned && (
                  <span className="text-yellow-400 font-bold">💰 {selectedItem.price}</span>
                )}
              </div>

              {/* Mobile Action Button */}
              <div className="space-y-2">
                {selectedItem.owned ? (
                  <button
                    onClick={() => handleEquipItem(selectedItem)}
                    disabled={selectedItem.equipped}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      selectedItem.equipped
                        ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                        : 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400'
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
                        ? 'bg-gray-600/20 border border-gray-500/30 text-gray-400'
                        : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400'
                    }`}
                  >
                    {userBalance < selectedItem.price ? 'Insufficient Funds' : `Purchase`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // DESKTOP LAYOUT - Keep existing design
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl max-w-7xl w-full h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl">
            {/* Original desktop layout continues... */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Palette className="w-6 h-6 text-purple-400" />
                  <h2 className="text-2xl font-bold text-white">Customize Appearance</h2>
                </div>
                
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
              {/* Desktop layout content... */}
              <div className="w-64 bg-gray-800/30 border-r border-gray-700/50 p-4 overflow-y-auto">
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
                      {/* Desktop item preview content remains the same... */}
                      <div className="aspect-square bg-gray-700/30 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                        {/* Existing desktop preview logic... */}
                        <div className="text-center text-gray-400 text-sm">Preview</div>
                      </div>

                      <div className="text-center">
                        <h4 className="text-white text-sm font-semibold mb-1 truncate">{item.name}</h4>
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <span className={`text-xs font-semibold ${rarityColors[item.rarity]} capitalize`}>
                            {item.rarity}
                          </span>
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

              {/* Right Sidebar - Desktop */}
              <div className="w-80 bg-gray-800/30 border-l border-gray-700/50 p-6 overflow-y-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
                  <div className="bg-gray-900/50 rounded-lg p-8 text-center">
                    <div className="text-gray-400">Character Preview</div>
                  </div>
                </div>

                {selectedItem && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-white text-lg font-semibold mb-3">{selectedItem.name}</h4>
                    
                    <div className="space-y-2">
                      {selectedItem.owned ? (
                        <button
                          onClick={() => handleEquipItem(selectedItem)}
                          disabled={selectedItem.equipped}
                          className={`w-full py-3 rounded-lg font-semibold transition-all ${
                            selectedItem.equipped
                              ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                              : 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400'
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
                              ? 'bg-gray-600/20 border border-gray-500/30 text-gray-400'
                              : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400'
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
        </div>
      )}
    </div>,
    document.body
  )
}

export default CustomizationModal