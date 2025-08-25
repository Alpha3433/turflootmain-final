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
  User,
  Grid,
  List,
  Settings,
  Heart,
  Bookmark,
  Share,
  Download,
  Upload,
  Maximize2,
  Minimize2
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
  const [viewMode, setViewMode] = useState('grid') // grid | list for desktop
  const [showPreviewPanel, setShowPreviewPanel] = useState(true) // desktop only
  const [playerData, setPlayerData] = useState({
    equippedSkin: 'default_blue',
    equippedHat: null,
    equippedTrail: 'default_sparkle',
    equippedBoost: null,
    equippedFace: 'normal_eyes'
  })

  // Detect device type on mount
  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  // Mock data for customization items
  const [itemsData, setItemsData] = useState({
    skins: [
      // Basic collection - Default colors for new users
      { id: 'default_blue', name: 'Classic Blue', rarity: 'common', price: 0, owned: true, equipped: true, preview: '/previews/skin_blue.png', description: 'The original TurfLoot skin that started it all.' },
      { id: 'basic_red', name: 'Basic Red', rarity: 'common', price: 0, owned: true, equipped: false, preview: '/previews/skin_red.png', description: 'A classic red skin for bold players.' },
      { id: 'basic_green', name: 'Basic Green', rarity: 'common', price: 0, owned: true, equipped: false, preview: '/previews/skin_green.png', description: 'Fresh green color for nature lovers.' },
      { id: 'basic_yellow', name: 'Basic Yellow', rarity: 'common', price: 0, owned: true, equipped: false, preview: '/previews/skin_yellow.png', description: 'Bright yellow for sunshine vibes.' },
      { id: 'basic_purple', name: 'Basic Purple', rarity: 'common', price: 0, owned: true, equipped: false, preview: '/previews/skin_purple.png', description: 'Royal purple for distinguished players.' },
      { id: 'basic_orange', name: 'Basic Orange', rarity: 'common', price: 0, owned: true, equipped: false, preview: '/previews/skin_orange.png', description: 'Vibrant orange energy.' },
      
      // Premium skins available in store
      { id: 'rainbow_hologram', name: 'Rainbow Hologram', rarity: 'legendary', price: 750, owned: false, equipped: false, preview: '/previews/skin_rainbow.png', description: 'Shimmering holographic rainbow effect that shifts colors.' },
      { id: 'chrome_steel', name: 'Chrome Steel', rarity: 'epic', price: 400, owned: false, equipped: false, preview: '/previews/skin_chrome.png', description: 'Polished metallic chrome finish with mirror reflections.' },
      { id: 'matte_blue', name: 'Matte Blue', rarity: 'rare', price: 200, owned: false, equipped: false, preview: '/previews/skin_matte.png', description: 'Sophisticated matte blue with subtle texture.' },
      { id: 'golden_snake', name: 'Golden Snake', rarity: 'legendary', price: 500, owned: false, equipped: false, preview: '/previews/skin_gold.png', description: 'Legendary golden skin with mystical powers.' },
      { id: 'neon_green', name: 'Neon Green', rarity: 'rare', price: 150, owned: false, equipped: false, preview: '/previews/skin_neon.png', description: 'Glows with electric energy in dark environments.' },
      { id: 'fire_red', name: 'Fire Red', rarity: 'epic', price: 300, owned: false, equipped: false, preview: '/previews/skin_fire.png', description: 'Burns with the fury of a thousand suns.' },
      { id: 'ice_blue', name: 'Ice Blue', rarity: 'rare', price: 180, owned: false, equipped: false, preview: '/previews/skin_ice.png', description: 'Frozen beauty with crystalline perfection.' },
      { id: 'shadow_black', name: 'Shadow Black', rarity: 'legendary', price: 600, owned: false, equipped: false, preview: '/previews/skin_shadow.png', description: 'Emerges from the void with dark energy.' }
    ],
    trails: [
      { id: 'default_sparkle', name: 'Default Sparkle', rarity: 'common', price: 0, owned: true, equipped: true, preview: '/previews/trail_sparkle.png', description: 'Basic particle trail for all players.' },
      { id: 'rainbow_trail', name: 'Rainbow Trail', rarity: 'epic', price: 200, owned: false, equipped: false, preview: '/previews/trail_rainbow.png', description: 'Leave a rainbow in your wake.' },
      { id: 'fire_trail', name: 'Fire Trail', rarity: 'rare', price: 120, owned: false, equipped: false, preview: '/previews/trail_fire.png', description: 'Blazing trail of destruction.' },
      { id: 'lightning_trail', name: 'Lightning Trail', rarity: 'epic', price: 180, owned: false, equipped: false, preview: '/previews/trail_lightning.png', description: 'Strike like lightning.' }
    ],
    faces: [
      { id: 'normal_eyes', name: 'Normal Eyes', rarity: 'common', price: 0, owned: true, equipped: true, preview: '/previews/face_normal.png', description: 'Standard friendly expression.' },
      { id: 'angry_eyes', name: 'Angry Eyes', rarity: 'rare', price: 80, owned: false, equipped: false, preview: '/previews/face_angry.png', description: 'Show your competitive spirit.' },
      { id: 'wink_eyes', name: 'Wink Eyes', rarity: 'rare', price: 75, owned: false, equipped: false, preview: '/previews/face_wink.png', description: 'Charming and playful expression.' },
      { id: 'laser_eyes', name: 'Laser Eyes', rarity: 'legendary', price: 400, owned: false, equipped: false, preview: '/previews/face_laser.png', description: 'Futuristic cybernetic enhancement.' }
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

  // Items per page
  const itemsPerPage = isMobile ? 6 : (viewMode === 'grid' ? 12 : 8)

  // Filter and sort items
  const getFilteredItems = () => {
    let items = itemsData[activeCategory] || []
    
    if (activeTab === 'inventory') {
      items = items.filter(item => item.owned)
    }
    
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (filterRarity !== 'all') {
      items = items.filter(item => item.rarity === filterRarity)
    }
    
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
      default:
        items.reverse()
    }
    
    return items
  }

  const getPaginatedItems = () => {
    const items = getFilteredItems()
    if (isMobile) {
      const startIndex = currentPage * itemsPerPage
      return items.slice(startIndex, startIndex + itemsPerPage)
    }
    return items // Desktop shows all items with scroll
  }

  const totalPages = Math.ceil(getFilteredItems().length / itemsPerPage)

  // Load saved customization data
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
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
    }
  }, [isOpen])

  const handleEquipItem = (item) => {
    if (!item.owned) return
    
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
        equipped: categoryItem.id === item.id
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
    
    try {
      localStorage.setItem('turfloot_player_customization', JSON.stringify(customizationData))
    } catch (error) {
      console.error('Failed to save customization:', error)
    }
  }

  const handlePurchaseItem = (item) => {
    if (item.owned || userBalance < item.price) return
    console.log(`Purchasing ${item.name} for ${item.price} coins`)
  }

  const triggerAnimation = (animationType) => {
    setPreviewAnimation(animationType)
    setTimeout(() => setPreviewAnimation('idle'), 2000)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {isMobile ? (
        // ==========================================
        // DEDICATED MOBILE EXPERIENCE
        // ==========================================
        <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
          
          {/* Mobile Header - Minimal & Clean */}
          <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 p-3 safe-area-inset-top">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
              
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-purple-400" />
                <h1 className="text-lg font-bold text-white">Style</h1>
              </div>
              
              <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-1.5 rounded-full border border-yellow-500/30">
                <span className="text-yellow-400 font-bold text-sm">💰 {userBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Mobile Character Preview - Hero Section */}
          <div className="flex-shrink-0 bg-gradient-to-br from-purple-900/20 via-gray-800/30 to-blue-900/20 p-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className={`w-28 h-28 rounded-full border-4 border-cyan-300 flex items-center justify-center transition-all duration-500 shadow-2xl ${
                  previewAnimation === 'spin' ? 'animate-spin' :
                  previewAnimation === 'bounce' ? 'animate-bounce' :
                  previewAnimation === 'pulse' ? 'animate-pulse' :
                  'animate-breathe'
                } ${
                  playerData.equippedSkin === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/60' :
                  playerData.equippedSkin === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/60' :
                  playerData.equippedSkin === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/60' :
                  playerData.equippedSkin === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/60' :
                  playerData.equippedSkin === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/60' :
                  'bg-cyan-400 shadow-cyan-500/60'
                }`}>
                  
                  {/* Enhanced Eyes */}
                  {playerData.equippedFace === 'angry_eyes' ? (
                    <>
                      <div className="w-2.5 h-1.5 bg-black rounded-sm absolute top-6 left-6 transform rotate-12"></div>
                      <div className="w-2.5 h-1.5 bg-black rounded-sm absolute top-6 right-6 transform -rotate-12"></div>
                      <div className="w-5 h-1 bg-red-600 rounded absolute bottom-6"></div>
                    </>
                  ) : playerData.equippedFace === 'wink_eyes' ? (
                    <>
                      <div className="w-2.5 h-0.5 bg-black rounded absolute top-6.5 left-6"></div>
                      <div className="w-2.5 h-2.5 bg-black rounded-full absolute top-6 right-6"></div>
                      <div className="w-4 h-1 bg-pink-500 rounded-full absolute bottom-6"></div>
                    </>
                  ) : playerData.equippedFace === 'laser_eyes' ? (
                    <>
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full absolute top-6 left-6 animate-pulse"></div>
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full absolute top-6 right-6 animate-pulse"></div>
                      <div className="w-1 h-8 bg-red-400 opacity-80 absolute top-8 left-7 animate-pulse"></div>
                      <div className="w-1 h-8 bg-red-400 opacity-80 absolute top-8 right-7 animate-pulse"></div>
                    </>
                  ) : (
                    <>
                      <div className="w-2.5 h-2.5 bg-black rounded-full absolute top-6 left-6"></div>
                      <div className="w-2.5 h-2.5 bg-black rounded-full absolute top-6 right-6"></div>
                    </>
                  )}
                  
                  {/* Legendary effects */}
                  {(playerData.equippedSkin === 'golden_snake' || playerData.equippedSkin === 'shadow_black' || playerData.equippedSkin === 'cyber_chrome') && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                    </>
                  )}
                </div>

                {/* Mobile Hat */}
                {playerData.equippedHat && (
                  <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 ${
                    playerData.equippedHat === 'crown_gold' ? 
                      'w-10 h-6 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-xl border-2 border-yellow-600' :
                    playerData.equippedHat === 'cap_baseball' ? 
                      'w-12 h-5 bg-gradient-to-r from-red-600 to-red-500 rounded-full' :
                    playerData.equippedHat === 'helmet_space' ? 
                      'w-14 h-8 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full border-2 border-blue-400' :
                    playerData.equippedHat === 'wizard_hat' ?
                      'w-8 h-12 bg-gradient-to-b from-purple-600 to-purple-800 rounded-t-full' :
                      'w-8 h-5 bg-gray-600 rounded'
                  }`}>
                    {playerData.equippedHat === 'crown_gold' && (
                      <div className="flex justify-center">
                        <div className="w-1 h-3 bg-yellow-300 rounded-t-full mt-1"></div>
                      </div>
                    )}
                    {playerData.equippedHat === 'wizard_hat' && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                )}

                {/* Mobile Trail */}
                {playerData.equippedTrail && (
                  <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 flex space-x-1">
                    {playerData.equippedTrail === 'rainbow_trail' ? (
                      <>
                        <div className="w-4 h-4 bg-red-400 opacity-80 animate-pulse rounded-full shadow-lg"></div>
                        <div className="w-3.5 h-3.5 bg-yellow-400 opacity-70 animate-pulse rounded-full shadow-lg" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-3 h-3 bg-green-400 opacity-60 animate-pulse rounded-full shadow-lg" style={{animationDelay: '0.4s'}}></div>
                        <div className="w-2.5 h-2.5 bg-blue-400 opacity-50 animate-pulse rounded-full" style={{animationDelay: '0.6s'}}></div>
                      </>
                    ) : playerData.equippedTrail === 'fire_trail' ? (
                      <>
                        <div className="w-4 h-2 bg-gradient-to-r from-orange-500 to-red-500 opacity-90 animate-pulse rounded-full shadow-lg"></div>
                        <div className="w-3 h-1.5 bg-red-500 opacity-80 animate-pulse rounded-full shadow-md" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-1 bg-orange-400 opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                      </>
                    ) : playerData.equippedTrail === 'lightning_trail' ? (
                      <>
                        <div className="w-3 h-6 bg-blue-300 opacity-90 animate-pulse" style={{clipPath: 'polygon(0 0, 100% 40%, 60% 50%, 100% 100%, 0 60%, 40% 50%)'}}></div>
                        <div className="w-2 h-4 bg-cyan-300 opacity-80 animate-pulse" style={{clipPath: 'polygon(0 0, 100% 40%, 60% 50%, 100% 100%, 0 60%, 40% 50%)', animationDelay: '0.3s'}}></div>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-blue-400 opacity-90 animate-pulse rounded-full shadow-lg"></div>
                        <div className="w-2.5 h-2.5 bg-cyan-400 opacity-80 animate-pulse rounded-full shadow-md" style={{animationDelay: '0.3s'}}></div>
                        <div className="w-2 h-2 bg-white opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.6s'}}></div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Animation Controls */}
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => triggerAnimation('spin')}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all shadow-lg hover:shadow-xl"
                >
                  <RotateCcw className="w-5 h-5 text-gray-300" />
                </button>
                <button
                  onClick={() => triggerAnimation('bounce')}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all shadow-lg hover:shadow-xl"
                >
                  <Play className="w-5 h-5 text-gray-300" />
                </button>
                <button
                  onClick={() => triggerAnimation('pulse')}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all shadow-lg hover:shadow-xl"
                >
                  <Sparkles className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              {/* Mobile Tab Switcher */}
              <div className="flex bg-gray-800/50 rounded-2xl p-1 shadow-lg w-full max-w-sm">
                <button
                  onClick={() => {setActiveTab('inventory'); setCurrentPage(0)}}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                    activeTab === 'inventory' 
                      ? 'bg-purple-600 text-white shadow-lg transform scale-105' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>My Items</span>
                </button>
                <button
                  onClick={() => {setActiveTab('shop'); setCurrentPage(0)}}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                    activeTab === 'shop' 
                      ? 'bg-purple-600 text-white shadow-lg transform scale-105' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Shop</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Categories - Horizontal Scroll */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-700/50">
            <div className="flex overflow-x-auto scrollbar-hide space-x-3 pb-1">
              {categories.map((category) => {
                const Icon = category.icon
                const itemCount = itemsData[category.id]?.filter(item => activeTab === 'inventory' ? item.owned : true).length || 0
                return (
                  <button
                    key={category.id}
                    onClick={() => {setActiveCategory(category.id); setCurrentPage(0)}}
                    className={`flex-shrink-0 flex flex-col items-center space-y-2 px-6 py-4 rounded-2xl text-sm font-medium transition-all ${
                      activeCategory === category.id
                        ? 'bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-2 border-purple-500/50 text-white shadow-lg transform scale-105'
                        : 'bg-gray-700/30 text-gray-400 hover:text-white hover:bg-gray-600/30'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${activeCategory === category.id ? 'text-purple-400' : category.color}`} />
                    <span className="font-semibold">{category.name}</span>
                    <span className="text-xs px-2 py-1 bg-black/20 rounded-full">
                      {itemCount} {activeTab === 'inventory' ? 'owned' : 'total'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mobile Search */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-700/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeCategory}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
              />
            </div>
          </div>

          {/* Mobile Items Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-3 safe-area-inset-bottom">
            <div className="grid grid-cols-2 gap-4">
              {getPaginatedItems().map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`relative bg-gray-800/50 rounded-2xl p-4 border-2 cursor-pointer transition-all hover:scale-105 ${
                    item.equipped ? 'border-green-400 bg-green-400/10 shadow-green-400/30 shadow-lg' : rarityColors[item.rarity]
                  } ${rarityGlow[item.rarity]} ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400 scale-105' : ''}`}
                >
                  {/* Mobile Item Preview */}
                  <div className="aspect-square bg-gray-700/30 rounded-2xl mb-3 flex items-center justify-center relative overflow-hidden">
                    {/* Enhanced mobile item previews */}
                    {activeCategory === 'skins' && (
                      <div className={`w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center relative ${
                        item.id === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/60 shadow-lg' :
                        item.id === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/60 shadow-lg' :
                        item.id === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/60 shadow-lg' :
                        item.id === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/60 shadow-lg' :
                        item.id === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/60 shadow-lg' :
                        item.id === 'royal_purple' ? 'bg-gradient-to-br from-purple-400 via-purple-600 to-purple-800 shadow-purple-500/60 shadow-lg' :
                        item.id === 'cyber_chrome' ? 'bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500 shadow-gray-500/60 shadow-lg' :
                        'bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600 shadow-cyan-500/60 shadow-lg'
                      } ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                        <div className="w-2.5 h-2.5 bg-black rounded-full absolute top-5 left-5"></div>
                        <div className="w-2.5 h-2.5 bg-black rounded-full absolute top-5 right-5"></div>
                        {item.rarity === 'legendary' && (
                          <>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Similar enhanced previews for other categories... */}
                    
                    {/* Equipped indicator */}
                    {item.equipped && (
                      <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5 shadow-lg">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    {/* Locked indicator */}
                    {!item.owned && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                        <Lock className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Mobile Item Info */}
                  <div className="text-center">
                    <h4 className="text-white text-sm font-bold mb-1 truncate">{item.name}</h4>
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${rarityColors[item.rarity]} capitalize bg-black/20`}>
                        {item.rarity}
                      </span>
                    </div>
                    {!item.owned && (
                      <div className="text-yellow-400 text-sm font-bold bg-yellow-400/10 px-3 py-1.5 rounded-xl border border-yellow-400/30">
                        💰 {item.price}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-4 mt-6 pb-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all disabled:opacity-50 shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-300" />
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300 font-medium bg-gray-800/50 px-4 py-2 rounded-xl">
                    {currentPage + 1} of {totalPages}
                  </span>
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all disabled:opacity-50 shadow-lg"
                >
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
              </div>
            )}
          </div>

          {/* Enhanced Mobile Bottom Sheet */}
          {selectedItem && (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900/98 backdrop-blur-md border-t border-gray-700/50 rounded-t-3xl transform transition-transform duration-300 shadow-2xl safe-area-inset-bottom">
              <div className="p-6">
                <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-6"></div>
                
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h4 className="text-white text-2xl font-bold mb-2">{selectedItem.name}</h4>
                    <p className="text-gray-400 text-sm mb-3 leading-relaxed">{selectedItem.description}</p>
                    <div className="flex items-center space-x-3">
                      <span className={`${rarityColors[selectedItem.rarity]} capitalize font-bold text-sm px-4 py-2 rounded-full bg-black/20 border border-current/30`}>
                        {selectedItem.rarity}
                      </span>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: selectedItem.rarity === 'legendary' ? 5 : selectedItem.rarity === 'epic' ? 4 : selectedItem.rarity === 'rare' ? 3 : 2 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${rarityColors[selectedItem.rarity]} fill-current`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {!selectedItem.owned && (
                    <div className="text-right ml-4">
                      <span className="text-yellow-400 font-bold text-2xl">💰 {selectedItem.price}</span>
                      <div className="text-gray-400 text-sm">Coins</div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedItem.owned ? (
                    <button
                      onClick={() => handleEquipItem(selectedItem)}
                      disabled={selectedItem.equipped}
                      className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg ${
                        selectedItem.equipped
                          ? 'bg-green-600/20 border-2 border-green-500/30 text-green-400 cursor-not-allowed'
                          : 'bg-purple-600/20 hover:bg-purple-600/30 border-2 border-purple-500/30 text-purple-400 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {selectedItem.equipped ? (
                        <div className="flex items-center justify-center space-x-3">
                          <Check className="w-6 h-6" />
                          <span>Currently Equipped</span>
                        </div>
                      ) : (
                        'Equip This Item'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchaseItem(selectedItem)}
                      disabled={userBalance < selectedItem.price}
                      className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg ${
                        userBalance < selectedItem.price
                          ? 'bg-gray-600/20 border-2 border-gray-500/30 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600/20 hover:bg-green-600/30 border-2 border-green-500/30 text-green-400 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {userBalance < selectedItem.price ? 'Insufficient Coins' : `Purchase for ${selectedItem.price} coins`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ==========================================
        // DEDICATED DESKTOP EXPERIENCE  
        // ==========================================
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden border border-purple-500/30 shadow-2xl">
            
            {/* Desktop Header - Professional & Feature Rich */}
            <div className="flex items-center justify-between p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
                    <Palette className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Premium Customization</h2>
                    <p className="text-gray-400">Personalize your TurfLoot experience</p>
                  </div>
                </div>
                
                {/* Desktop Tab Switcher */}
                <div className="flex bg-gray-800/50 rounded-2xl p-1.5 border border-gray-700/50">
                  <button
                    onClick={() => {setActiveTab('inventory'); setCurrentPage(0)}}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
                      activeTab === 'inventory' 
                        ? 'bg-purple-600 text-white shadow-lg transform scale-105' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    <span>My Collection</span>
                  </button>
                  <button
                    onClick={() => {setActiveTab('shop'); setCurrentPage(0)}}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-3 ${
                      activeTab === 'shop' 
                        ? 'bg-purple-600 text-white shadow-lg transform scale-105' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Item Shop</span>
                  </button>
                </div>
              </div>
              
              {/* Desktop Controls */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 bg-yellow-500/20 px-6 py-3 rounded-xl border border-yellow-500/30">
                  <div className="text-yellow-400 text-2xl">💰</div>
                  <div>
                    <div className="text-yellow-400 font-bold text-xl">{userBalance.toLocaleString()}</div>
                    <div className="text-yellow-600 text-sm">Coins</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all"
                    title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                  >
                    {viewMode === 'grid' ? <List className="w-5 h-5 text-gray-300" /> : <Grid className="w-5 h-5 text-gray-300" />}
                  </button>
                  
                  <button
                    onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                    className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all"
                    title={`${showPreviewPanel ? 'Hide' : 'Show'} preview panel`}
                  >
                    {showPreviewPanel ? <Minimize2 className="w-5 h-5 text-gray-300" /> : <Maximize2 className="w-5 h-5 text-gray-300" />}
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex h-[calc(95vh-120px)]">
              {/* Desktop Sidebar - Advanced Filters & Categories */}
              <div className="w-80 bg-gray-800/30 border-r border-gray-700/50 overflow-y-auto">
                <div className="p-6 space-y-6">
                  
                  {/* Categories Grid */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-purple-400" />
                      <span>Categories</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((category) => {
                        const Icon = category.icon
                        const itemCount = itemsData[category.id]?.filter(item => activeTab === 'inventory' ? item.owned : true).length || 0
                        const ownedCount = itemsData[category.id]?.filter(item => item.owned).length || 0
                        return (
                          <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`p-4 rounded-xl text-left transition-all group ${
                              activeCategory === category.id
                                ? 'bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-2 border-purple-500/50 transform scale-105'
                                : 'bg-gray-700/30 hover:bg-gray-600/30 border border-gray-600/30'
                            }`}
                          >
                            <div className="flex items-center space-x-3 mb-2">
                              <Icon className={`w-6 h-6 ${activeCategory === category.id ? 'text-purple-400' : category.color} group-hover:scale-110 transition-transform`} />
                              <span className="text-white font-medium">{category.name}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {activeTab === 'inventory' ? `${ownedCount} owned` : `${itemCount} total`}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Advanced Search */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-3">SEARCH & FILTER</h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search items..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                        />
                      </div>

                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm focus:border-purple-400/50 focus:outline-none"
                      >
                        <option value="newest">Sort: Newest First</option>
                        <option value="name">Sort: Alphabetical</option>
                        <option value="price">Sort: Price (Low to High)</option>
                        <option value="rarity">Sort: Rarity (Rare to Common)</option>
                      </select>

                      <select
                        value={filterRarity}
                        onChange={(e) => setFilterRarity(e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm focus:border-purple-400/50 focus:outline-none"
                      >
                        <option value="all">All Rarities</option>
                        <option value="common">Common Items</option>
                        <option value="rare">Rare Items</option>
                        <option value="epic">Epic Items</option>
                        <option value="legendary">Legendary Items</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl p-4 border border-gray-600/30">
                    <h3 className="text-sm font-bold text-gray-400 mb-3">COLLECTION STATS</h3>
                    <div className="space-y-2">
                      {categories.map((category) => {
                        const total = itemsData[category.id]?.length || 0
                        const owned = itemsData[category.id]?.filter(item => item.owned).length || 0
                        const percentage = total > 0 ? Math.round((owned / total) * 100) : 0
                        return (
                          <div key={category.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-300 capitalize">{category.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">{owned}/{total}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                percentage === 100 ? 'bg-green-500/20 text-green-400' :
                                percentage >= 75 ? 'bg-blue-500/20 text-blue-400' :
                                percentage >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Main Content */}
              <div className={`flex-1 flex flex-col ${showPreviewPanel ? 'mr-96' : ''} transition-all duration-300`}>
                
                {/* Desktop Items Header */}
                <div className="p-6 border-b border-gray-700/50 bg-gray-800/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white capitalize">{activeCategory}</h3>
                      <p className="text-gray-400">{getFilteredItems().length} items {activeTab === 'inventory' ? 'in your collection' : 'available'}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-400">View:</div>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Desktop Items Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-4 gap-6">
                      {getFilteredItems().map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`group relative bg-gray-800/50 rounded-2xl p-6 border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl ${
                            item.equipped ? 'border-green-400 bg-green-400/5 shadow-green-400/20' : rarityColors[item.rarity]
                          } ${rarityGlow[item.rarity]} ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400 scale-105' : ''}`}
                        >
                          
                          {/* Desktop Item Preview */}
                          <div className="aspect-square bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
                            {/* Enhanced desktop previews */}
                            {activeCategory === 'skins' && (
                              <div className={`w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center relative transition-all group-hover:scale-110 ${
                                item.id === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/50 shadow-xl' :
                                item.id === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/50 shadow-xl' :
                                item.id === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/50 shadow-xl' :
                                item.id === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/50 shadow-xl' :
                                item.id === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/50 shadow-xl' :
                                item.id === 'royal_purple' ? 'bg-gradient-to-br from-purple-400 via-purple-600 to-purple-800 shadow-purple-500/50 shadow-xl' :
                                item.id === 'cyber_chrome' ? 'bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500 shadow-gray-500/50 shadow-xl' :
                                'bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600 shadow-cyan-500/50 shadow-xl'
                              } ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                                <div className="w-3 h-3 bg-black rounded-full absolute top-6 left-6"></div>
                                <div className="w-3 h-3 bg-black rounded-full absolute top-6 right-6"></div>
                                {item.rarity === 'legendary' && (
                                  <>
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                                  </>
                                )}
                              </div>
                            )}
                            
                            {/* Enhanced desktop previews for other categories... */}
                            
                            {/* Hover Effects */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all rounded-2xl" />
                            
                            {/* Equipped Badge */}
                            {item.equipped && (
                              <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1.5 shadow-lg">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            
                            {/* Locked Overlay */}
                            {!item.owned && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                                <div className="text-center">
                                  <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                  <span className="text-gray-300 text-sm font-medium">Locked</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Desktop Item Info */}
                          <div className="text-center">
                            <h4 className="text-white text-lg font-bold mb-2 group-hover:text-purple-300 transition-colors">{item.name}</h4>
                            <div className="flex items-center justify-center space-x-2 mb-3">
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${rarityColors[item.rarity]} capitalize bg-black/20 border border-current/30`}>
                                {item.rarity}
                              </span>
                              <div className="flex items-center space-x-1">
                                {Array.from({ length: item.rarity === 'legendary' ? 5 : item.rarity === 'epic' ? 4 : item.rarity === 'rare' ? 3 : 2 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${rarityColors[item.rarity]} fill-current`} />
                                ))}
                              </div>
                            </div>
                            {!item.owned && (
                              <div className="text-yellow-400 text-lg font-bold bg-yellow-400/10 px-4 py-2 rounded-xl border border-yellow-400/30">
                                💰 {item.price}
                              </div>
                            )}
                          </div>

                          {/* Hover Action Button */}
                          <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                            {item.owned ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEquipItem(item)
                                }}
                                disabled={item.equipped}
                                className={`w-full py-2 rounded-xl font-semibold text-sm transition-all ${
                                  item.equipped
                                    ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                                    : 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400'
                                }`}
                              >
                                {item.equipped ? 'Equipped' : 'Equip'}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePurchaseItem(item)
                                }}
                                disabled={userBalance < item.price}
                                className={`w-full py-2 rounded-xl font-semibold text-sm transition-all ${
                                  userBalance < item.price
                                    ? 'bg-gray-600/20 border border-gray-500/30 text-gray-400'
                                    : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400'
                                }`}
                              >
                                Purchase
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getFilteredItems().map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`group flex items-center p-4 bg-gray-800/30 rounded-xl border cursor-pointer transition-all hover:bg-gray-700/30 ${
                            item.equipped ? 'border-green-400 bg-green-400/5' : 'border-gray-700'
                          } ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400' : ''}`}
                        >
                          
                          {/* List Item Preview */}
                          <div className="w-16 h-16 bg-gray-700/30 rounded-xl flex items-center justify-center mr-4">
                            {activeCategory === 'skins' && (
                              <div className={`w-12 h-12 rounded-full border-2 border-white/20 ${
                                item.id === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 to-orange-600' :
                                item.id === 'neon_green' ? 'bg-gradient-to-br from-green-300 to-green-600' :
                                'bg-cyan-400'
                              } ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                              </div>
                            )}
                          </div>

                          {/* List Item Info */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-bold text-lg">{item.name}</h4>
                                <p className="text-gray-400 text-sm">{item.description}</p>
                                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mt-1 ${rarityColors[item.rarity]} capitalize`}>
                                  {item.rarity}
                                </span>
                              </div>
                              
                              <div className="text-right">
                                {!item.owned && (
                                  <div className="text-yellow-400 font-bold text-lg mb-2">💰 {item.price}</div>
                                )}
                                
                                {item.owned ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEquipItem(item)
                                    }}
                                    disabled={item.equipped}
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                      item.equipped
                                        ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                                        : 'bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400'
                                    }`}
                                  >
                                    {item.equipped ? 'Equipped' : 'Equip'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handlePurchaseItem(item)
                                    }}
                                    disabled={userBalance < item.price}
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                      userBalance < item.price
                                        ? 'bg-gray-600/20 border border-gray-500/30 text-gray-400'
                                        : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400'
                                    }`}
                                  >
                                    Purchase
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Preview Panel */}
              {showPreviewPanel && (
                <div className="w-96 bg-gray-800/30 border-l border-gray-700/50 overflow-y-auto">
                  <div className="p-6">
                    
                    {/* Desktop Character Preview */}
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                        <Eye className="w-6 h-6 text-purple-400" />
                        <span>Live Preview</span>
                      </h3>
                      
                      <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-8 border border-gray-600/30 mb-6">
                        <div className="flex justify-center mb-6">
                          <div className="relative">
                            <div className={`w-32 h-32 rounded-full border-4 border-cyan-300 flex items-center justify-center transition-all duration-500 shadow-2xl ${
                              previewAnimation === 'spin' ? 'animate-spin' :
                              previewAnimation === 'bounce' ? 'animate-bounce' :
                              previewAnimation === 'pulse' ? 'animate-pulse' :
                              'animate-breathe'
                            } ${
                              playerData.equippedSkin === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/60' :
                              playerData.equippedSkin === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/60' :
                              playerData.equippedSkin === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/60' :
                              playerData.equippedSkin === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/60' :
                              playerData.equippedSkin === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/60' :
                              playerData.equippedSkin === 'royal_purple' ? 'bg-gradient-to-br from-purple-400 via-purple-600 to-purple-800 shadow-purple-500/60' :
                              playerData.equippedSkin === 'cyber_chrome' ? 'bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500 shadow-gray-500/60' :
                              'bg-cyan-400 shadow-cyan-500/60'
                            }`}>
                              
                              {/* Enhanced desktop eyes */}
                              {playerData.equippedFace === 'angry_eyes' ? (
                                <>
                                  <div className="w-3 h-2 bg-black rounded-sm absolute top-7 left-7 transform rotate-12"></div>
                                  <div className="w-3 h-2 bg-black rounded-sm absolute top-7 right-7 transform -rotate-12"></div>
                                  <div className="w-6 h-1.5 bg-red-600 rounded absolute bottom-7"></div>
                                </>
                              ) : playerData.equippedFace === 'wink_eyes' ? (
                                <>
                                  <div className="w-3 h-0.5 bg-black rounded absolute top-8 left-7"></div>
                                  <div className="w-3 h-3 bg-black rounded-full absolute top-7 right-7"></div>
                                  <div className="w-5 h-1.5 bg-pink-500 rounded-full absolute bottom-7"></div>
                                </>
                              ) : playerData.equippedFace === 'laser_eyes' ? (
                                <>
                                  <div className="w-3 h-3 bg-red-500 rounded-full absolute top-7 left-7 animate-pulse shadow-red-500/50 shadow-lg"></div>
                                  <div className="w-3 h-3 bg-red-500 rounded-full absolute top-7 right-7 animate-pulse shadow-red-500/50 shadow-lg"></div>
                                  <div className="w-1 h-12 bg-red-400 opacity-80 absolute top-10 left-8 animate-pulse"></div>
                                  <div className="w-1 h-12 bg-red-400 opacity-80 absolute top-10 right-8 animate-pulse"></div>
                                </>
                              ) : (
                                <>
                                  <div className="w-3 h-3 bg-black rounded-full absolute top-7 left-7"></div>
                                  <div className="w-3 h-3 bg-black rounded-full absolute top-7 right-7"></div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Animation Controls */}
                        <div className="flex justify-center space-x-3">
                          <button
                            onClick={() => triggerAnimation('spin')}
                            className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all hover:scale-110"
                            title="Spin Animation"
                          >
                            <RotateCcw className="w-5 h-5 text-gray-300" />
                          </button>
                          <button
                            onClick={() => triggerAnimation('bounce')}
                            className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all hover:scale-110"
                            title="Bounce Animation"
                          >
                            <Play className="w-5 h-5 text-gray-300" />
                          </button>
                          <button
                            onClick={() => triggerAnimation('pulse')}
                            className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all hover:scale-110"
                            title="Pulse Animation"
                          >
                            <Sparkles className="w-5 h-5 text-gray-300" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Item Details */}
                    {selectedItem && (
                      <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-6 border border-gray-600/30">
                        <h4 className="text-2xl font-bold text-white mb-3">{selectedItem.name}</h4>
                        
                        <div className="space-y-4 mb-6">
                          <div>
                            <span className="text-gray-400 text-sm">Description:</span>
                            <p className="text-white mt-1 leading-relaxed">{selectedItem.description}</p>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-400">Type:</span>
                            <span className="text-white capitalize font-medium">{activeCategory.slice(0, -1)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Rarity:</span>
                            <div className="flex items-center space-x-2">
                              <span className={`${rarityColors[selectedItem.rarity]} capitalize font-bold text-sm px-3 py-1 rounded-full bg-black/20 border border-current/30`}>
                                {selectedItem.rarity}
                              </span>
                              <div className="flex items-center space-x-1">
                                {Array.from({ length: selectedItem.rarity === 'legendary' ? 5 : selectedItem.rarity === 'epic' ? 4 : selectedItem.rarity === 'rare' ? 3 : 2 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${rarityColors[selectedItem.rarity]} fill-current`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {!selectedItem.owned && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Price:</span>
                              <span className="text-yellow-400 font-bold text-lg">💰 {selectedItem.price}</span>
                            </div>
                          )}
                        </div>

                        {/* Desktop Action Buttons */}
                        <div className="space-y-3">
                          {selectedItem.owned ? (
                            <button
                              onClick={() => handleEquipItem(selectedItem)}
                              disabled={selectedItem.equipped}
                              className={`w-full py-4 rounded-xl font-bold transition-all ${
                                selectedItem.equipped
                                  ? 'bg-green-600/20 border-2 border-green-500/30 text-green-400 cursor-not-allowed'
                                  : 'bg-purple-600/20 hover:bg-purple-600/30 border-2 border-purple-500/30 text-purple-400 hover:scale-105'
                              }`}
                            >
                              {selectedItem.equipped ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Check className="w-5 h-5" />
                                  <span>Currently Equipped</span>
                                </div>
                              ) : (
                                'Equip This Item'
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchaseItem(selectedItem)}
                              disabled={userBalance < selectedItem.price}
                              className={`w-full py-4 rounded-xl font-bold transition-all ${
                                userBalance < selectedItem.price
                                  ? 'bg-gray-600/20 border-2 border-gray-500/30 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-600/20 hover:bg-green-600/30 border-2 border-green-500/30 text-green-400 hover:scale-105'
                              }`}
                            >
                              {userBalance < selectedItem.price ? 'Insufficient Coins' : `Purchase for ${selectedItem.price} coins`}
                            </button>
                          )}
                          
                          <div className="flex space-x-2">
                            <button className="flex-1 py-3 bg-gray-700/30 hover:bg-gray-600/30 border border-gray-600/30 text-gray-300 rounded-xl transition-all flex items-center justify-center space-x-2">
                              <Heart className="w-4 h-4" />
                              <span>Favorite</span>
                            </button>
                            <button className="flex-1 py-3 bg-gray-700/30 hover:bg-gray-600/30 border border-gray-600/30 text-gray-300 rounded-xl transition-all flex items-center justify-center space-x-2">
                              <Share className="w-4 h-4" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

export default CustomizationModal

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
        // COMPLETELY REDESIGNED MOBILE LAYOUT - Visual and Touch-Friendly
        <div className={`w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden ${isLandscape ? 'h-screen' : 'h-full'}`}>
          
          {/* Compact Mobile Header */}
          <div className={`sticky top-0 z-10 bg-gray-900/98 backdrop-blur-md border-b border-gray-700/50 ${isLandscape ? 'px-6 py-2' : 'px-4 py-3'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all"
                >
                  <X className="w-4 h-4 text-gray-300" />
                </button>
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <h2 className={`font-bold text-white ${isLandscape ? 'text-base' : 'text-lg'}`}>Customize</h2>
                </div>
              </div>
              
              {/* Currency Display - Compact */}
              <div className="flex items-center space-x-2 bg-yellow-500/20 px-2 py-1 rounded-lg border border-yellow-500/30">
                <span className={`text-yellow-400 font-bold ${isLandscape ? 'text-xs' : 'text-sm'}`}>💰 {userBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {isLandscape ? (
            // LANDSCAPE MODE - Horizontal Layout
            <div className="flex h-full">
              {/* Left: Character Preview & Controls */}
              <div className="w-72 bg-gray-800/30 border-r border-gray-700/50 p-3 flex flex-col">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-gray-900/50 rounded-lg p-4 mb-3">
                    <div className="flex justify-center mb-3">
                      <div className="relative">
                        {/* Landscape Character Preview */}
                        <div className={`w-20 h-20 rounded-full border-3 border-cyan-300 flex items-center justify-center transition-all duration-500 shadow-lg ${
                          previewAnimation === 'spin' ? 'animate-spin' :
                          previewAnimation === 'bounce' ? 'animate-bounce' :
                          previewAnimation === 'pulse' ? 'animate-pulse' :
                          'animate-breathe'
                        } ${
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
                        </div>

                        {/* Landscape Hat */}
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

                        {/* Landscape Trail */}
                        {playerData.equippedTrail && (
                          <div className="absolute -right-12 top-1/2 transform -translate-y-1/2 flex space-x-0.5">
                            {playerData.equippedTrail === 'rainbow_trail' ? (
                              <>
                                <div className="w-2.5 h-2.5 bg-red-400 opacity-80 animate-pulse rounded-full"></div>
                                <div className="w-2 h-2 bg-yellow-400 opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-1.5 h-1.5 bg-green-400 opacity-60 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                              </>
                            ) : playerData.equippedTrail === 'fire_trail' ? (
                              <>
                                <div className="w-2.5 h-1 bg-gradient-to-r from-orange-500 to-red-500 opacity-90 animate-pulse rounded-full"></div>
                                <div className="w-2 h-0.5 bg-red-500 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-1.5 h-0.5 bg-orange-400 opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-blue-400 opacity-90 animate-pulse rounded-full"></div>
                                <div className="w-1.5 h-1.5 bg-cyan-400 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.3s'}}></div>
                                <div className="w-1 h-1 bg-white opacity-70 animate-pulse rounded-full" style={{animationDelay: '0.6s'}}></div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Landscape Animation Controls */}
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => triggerAnimation('spin')}
                        className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                      >
                        <RotateCcw className="w-3 h-3 text-gray-300" />
                      </button>
                      <button
                        onClick={() => triggerAnimation('bounce')}
                        className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                      >
                        <Play className="w-3 h-3 text-gray-300" />
                      </button>
                      <button
                        onClick={() => triggerAnimation('pulse')}
                        className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
                      >
                        <Sparkles className="w-3 h-3 text-gray-300" />
                      </button>
                    </div>
                  </div>

                  {/* Landscape Tab & Category Switcher */}
                  <div className="space-y-2">
                    <div className="flex bg-gray-800/50 rounded-lg p-1">
                      <button
                        onClick={() => {setActiveTab('inventory'); setCurrentPage(0)}}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                          activeTab === 'inventory' 
                            ? 'bg-purple-600 text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        <span>Inventory</span>
                      </button>
                      <button
                        onClick={() => {setActiveTab('shop'); setCurrentPage(0)}}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                          activeTab === 'shop' 
                            ? 'bg-purple-600 text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>Shop</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      {categories.map((category) => {
                        const Icon = category.icon
                        return (
                          <button
                            key={category.id}
                            onClick={() => {setActiveCategory(category.id); setCurrentPage(0)}}
                            className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              activeCategory === category.id
                                ? 'bg-purple-600/20 border border-purple-500/30 text-white'
                                : 'bg-gray-700/30 text-gray-400 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-3 h-3 ${category.color}`} />
                            <span>{category.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Items Grid - Landscape */}
              <div className="flex-1 flex flex-col">
                {/* Landscape Search */}
                <div className="p-3 border-b border-gray-700/50">
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

                {/* Landscape Items Grid */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid grid-cols-4 gap-2">
                    {getPaginatedItems().map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`relative bg-gray-800/50 rounded-lg p-2 border-2 cursor-pointer transition-all ${
                          item.equipped ? 'border-green-400 bg-green-400/10' : rarityColors[item.rarity]
                        } ${rarityGlow[item.rarity]} ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400' : ''}`}
                      >
                        {/* Landscape Item Preview - Compact */}
                        <div className="aspect-square bg-gray-700/30 rounded-lg mb-1 flex items-center justify-center relative overflow-hidden">
                          {/* Simplified landscape previews */}
                          {activeCategory === 'skins' && (
                            <div className={`w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center relative ${
                              item.id === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600' :
                              item.id === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600' :
                              item.id === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500' :
                              item.id === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500' :
                              item.id === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black' :
                              'bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600'
                            } ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                              <div className="w-1 h-1 bg-black rounded-full absolute top-2 left-2"></div>
                              <div className="w-1 h-1 bg-black rounded-full absolute top-2 right-2"></div>
                            </div>
                          )}
                          
                          {/* Similar compact previews for other categories... */}
                          {activeCategory === 'hats' && (
                            <div className="relative flex items-center justify-center">
                              <div className="w-6 h-6 bg-cyan-400 rounded-full border border-white/20 flex items-center justify-center">
                                <div className="w-0.5 h-0.5 bg-black rounded-full absolute top-1.5 left-1.5"></div>
                                <div className="w-0.5 h-0.5 bg-black rounded-full absolute top-1.5 right-1.5"></div>
                              </div>
                              <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                                {item.id === 'crown_gold' ? (
                                  <div className="w-4 h-2 bg-gradient-to-b from-yellow-200 to-yellow-600 rounded-t border border-yellow-700 text-xs">👑</div>
                                ) : item.id === 'cap_baseball' ? (
                                  <div className="w-5 h-2 bg-gradient-to-b from-red-400 to-red-600 rounded-full">🧢</div>
                                ) : item.id === 'helmet_space' ? (
                                  <div className="w-6 h-3 bg-gradient-to-b from-gray-100 to-gray-500 rounded-full border border-blue-300">🚀</div>
                                ) : (
                                  <div className="w-3 h-2 bg-gray-600 rounded">🎩</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {activeCategory === 'trails' && (
                            <div className="relative flex items-center justify-center">
                              <div className="w-6 h-6 bg-cyan-400 rounded-full border border-white/20 flex items-center justify-center">
                                <div className="w-0.5 h-0.5 bg-black rounded-full absolute top-1.5 left-1.5"></div>
                                <div className="w-0.5 h-0.5 bg-black rounded-full absolute top-1.5 right-1.5"></div>
                              </div>
                              <div className={`absolute -right-8 top-1/2 transform -translate-y-1/2 flex items-center space-x-0.5 ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                                {item.id === 'rainbow_trail' ? (
                                  <>
                                    <div className="w-1 h-1 bg-red-400 opacity-90 animate-pulse rounded-full"></div>
                                    <div className="w-0.5 h-0.5 bg-yellow-400 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                                  </>
                                ) : item.id === 'fire_trail' ? (
                                  <>
                                    <div className="w-1 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 opacity-90 animate-pulse rounded-full"></div>
                                    <div className="w-0.5 h-0.5 bg-red-500 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-1 h-1 bg-blue-400 opacity-90 animate-pulse rounded-full"></div>
                                    <div className="w-0.5 h-0.5 bg-cyan-400 opacity-80 animate-pulse rounded-full" style={{animationDelay: '0.3s'}}></div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {activeCategory === 'faces' && (
                            <div className={`w-8 h-8 bg-cyan-400 rounded-full border-2 border-white/20 flex items-center justify-center relative ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                              {item.id === 'angry_eyes' ? (
                                <>
                                  <div className="w-1 h-0.5 bg-black rounded-sm absolute top-2 left-2 transform rotate-12"></div>
                                  <div className="w-1 h-0.5 bg-black rounded-sm absolute top-2 right-2 transform -rotate-12"></div>
                                  <div className="w-2 h-0.5 bg-red-600 rounded absolute bottom-2"></div>
                                </>
                              ) : item.id === 'wink_eyes' ? (
                                <>
                                  <div className="w-1 h-0.5 bg-black rounded absolute top-2.5 left-2"></div>
                                  <div className="w-1 h-1 bg-black rounded-full absolute top-2 right-2"></div>
                                  <div className="w-1.5 h-0.5 bg-pink-500 rounded-full absolute bottom-2"></div>
                                </>
                              ) : (
                                <>
                                  <div className="w-1 h-1 bg-black rounded-full absolute top-2 left-2"></div>
                                  <div className="w-1 h-1 bg-black rounded-full absolute top-2 right-2"></div>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Equipped indicator */}
                          {item.equipped && (
                            <div className="absolute top-0.5 right-0.5 bg-green-500 rounded-full p-0.5">
                              <Check className="w-1.5 h-1.5 text-white" />
                            </div>
                          )}
                          
                          {/* Locked indicator */}
                          {!item.owned && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <Lock className="w-3 h-3 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Landscape Item Info */}
                        <div className="text-center">
                          <h4 className="text-white text-xs font-semibold mb-0.5 truncate">{item.name}</h4>
                          {!item.owned && (
                            <div className="text-yellow-400 text-xs font-bold">
                              💰 {item.price}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Landscape Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-3 mt-3">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all disabled:opacity-50"
                      >
                        <ChevronLeft className="w-3 h-3 text-gray-300" />
                      </button>
                      
                      <span className="text-gray-300 text-xs font-medium">
                        {currentPage + 1} / {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all disabled:opacity-50"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // PORTRAIT MODE - Completely Redesigned for Better Mobile Experience
            <div className="flex flex-col h-full">
              {/* Visual Character Preview - Made Much More Prominent */}
              <div className="bg-gradient-to-br from-purple-900/20 via-gray-800/30 to-blue-900/20 p-4 border-b border-gray-700/50">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {/* Larger Mobile Character Preview */}
                    <div className={`w-24 h-24 rounded-full border-4 border-cyan-300 flex items-center justify-center transition-all duration-500 shadow-xl ${
                      previewAnimation === 'spin' ? 'animate-spin' :
                      previewAnimation === 'bounce' ? 'animate-bounce' :
                      previewAnimation === 'pulse' ? 'animate-pulse' :
                      'animate-breathe'
                    } ${
                      playerData.equippedSkin === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/50 shadow-xl' :
                      playerData.equippedSkin === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/50 shadow-xl' :
                      playerData.equippedSkin === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/50 shadow-xl' :
                      playerData.equippedSkin === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/50 shadow-xl' :
                      playerData.equippedSkin === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/50 shadow-xl' :
                      'bg-cyan-400 shadow-cyan-500/50 shadow-xl'
                    }`}>
                      
                      {/* Eyes */}
                      {playerData.equippedFace === 'angry_eyes' ? (
                        <>
                          <div className="w-2 h-1.5 bg-black rounded-sm absolute top-5 left-5 transform rotate-12"></div>
                          <div className="w-2 h-1.5 bg-black rounded-sm absolute top-5 right-5 transform -rotate-12"></div>
                          <div className="w-4 h-1 bg-red-600 rounded absolute bottom-5"></div>
                        </>
                      ) : playerData.equippedFace === 'wink_eyes' ? (
                        <>
                          <div className="w-2 h-0.5 bg-black rounded absolute top-5.5 left-5"></div>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-5"></div>
                          <div className="w-3 h-1 bg-pink-500 rounded-full absolute bottom-5"></div>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-5"></div>
                          <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-5"></div>
                        </>
                      )}
                      
                      {/* Legendary effects */}
                      {(playerData.equippedSkin === 'golden_snake' || playerData.equippedSkin === 'shadow_black') && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                        </>
                      )}
                    </div>

                    {/* Mobile Hat */}
                    {playerData.equippedHat && (
                      <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${
                        playerData.equippedHat === 'crown_gold' ? 
                          'w-8 h-5 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg border border-yellow-600' :
                        playerData.equippedHat === 'cap_baseball' ? 
                          'w-10 h-4 bg-gradient-to-r from-red-600 to-red-500 rounded-full' :
                        playerData.equippedHat === 'helmet_space' ? 
                          'w-12 h-7 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full border-2 border-blue-400' :
                          'w-6 h-4 bg-gray-600 rounded'
                      }`}>
                        {playerData.equippedHat === 'crown_gold' && (
                          <div className="flex justify-center">
                            <div className="w-1 h-2 bg-yellow-300 rounded-t-full mt-0.5"></div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Trail */}
                    {playerData.equippedTrail && (
                      <div className="absolute -right-14 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        {playerData.equippedTrail === 'rainbow_trail' ? (
                          <>
                            <div className="w-3 h-3 bg-red-400 opacity-80 animate-pulse rounded-full shadow-lg"></div>
                            <div className="w-2.5 h-2.5 bg-yellow-400 opacity-70 animate-pulse rounded-full shadow-md" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-green-400 opacity-60 animate-pulse rounded-full shadow-sm" style={{animationDelay: '0.4s'}}></div>
                          </>
                        ) : playerData.equippedTrail === 'fire_trail' ? (
                          <>
                            <div className="w-3 h-1.5 bg-gradient-to-r from-orange-500 to-red-500 opacity-90 animate-pulse rounded-full shadow-lg"></div>
                            <div className="w-2.5 h-1 bg-red-500 opacity-80 animate-pulse rounded-full shadow-md" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-1 bg-orange-400 opacity-70 animate-pulse rounded-full shadow-sm" style={{animationDelay: '0.4s'}}></div>
                          </>
                        ) : (
                          <>
                            <div className="w-2.5 h-2.5 bg-blue-400 opacity-90 animate-pulse rounded-full shadow-lg"></div>
                            <div className="w-2 h-2 bg-cyan-400 opacity-80 animate-pulse rounded-full shadow-md" style={{animationDelay: '0.3s'}}></div>
                            <div className="w-1.5 h-1.5 bg-white opacity-70 animate-pulse rounded-full shadow-sm" style={{animationDelay: '0.6s'}}></div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Animation Controls */}
                <div className="flex justify-center space-x-4 mb-4">
                  <button
                    onClick={() => triggerAnimation('spin')}
                    className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all shadow-lg hover:shadow-xl"
                  >
                    <RotateCcw className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => triggerAnimation('bounce')}
                    className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all shadow-lg hover:shadow-xl"
                  >
                    <Play className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => triggerAnimation('pulse')}
                    className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all shadow-lg hover:shadow-xl"
                  >
                    <Sparkles className="w-4 h-4 text-gray-300" />
                  </button>
                </div>

                {/* Enhanced Tab Switcher */}
                <div className="flex bg-gray-800/50 rounded-xl p-1 mx-2 shadow-lg">
                  <button
                    onClick={() => {setActiveTab('inventory'); setCurrentPage(0)}}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                      activeTab === 'inventory' 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>My Items</span>
                  </button>
                  <button
                    onClick={() => {setActiveTab('shop'); setCurrentPage(0)}}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                      activeTab === 'shop' 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Shop</span>
                  </button>
                </div>
              </div>

              {/* Enhanced Category Selection */}
              <div className="px-4 py-3 border-b border-gray-700/50">
                <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-1">
                  {categories.map((category) => {
                    const Icon = category.icon
                    const itemCount = itemsData[category.id]?.filter(item => activeTab === 'inventory' ? item.owned : true).length || 0
                    return (
                      <button
                        key={category.id}
                        onClick={() => {setActiveCategory(category.id); setCurrentPage(0)}}
                        className={`flex-shrink-0 flex flex-col items-center space-y-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          activeCategory === category.id
                            ? 'bg-purple-600/20 border-2 border-purple-500/50 text-white shadow-lg'
                            : 'bg-gray-700/30 text-gray-400 hover:text-white hover:bg-gray-600/30'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${activeCategory === category.id ? 'text-purple-400' : category.color}`} />
                        <span>{category.name}</span>
                        <span className="text-xs opacity-75">({itemCount})</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Enhanced Search */}
              <div className="px-4 py-3 border-b border-gray-700/50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeCategory}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                  />
                </div>
              </div>

              {/* Enhanced Items Grid */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="grid grid-cols-2 gap-4">
                  {getPaginatedItems().map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`relative bg-gray-800/50 rounded-xl p-4 border-2 cursor-pointer transition-all hover:scale-105 ${
                        item.equipped ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg' : rarityColors[item.rarity]
                      } ${rarityGlow[item.rarity]} ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400 scale-105' : ''}`}
                    >
                      {/* Enhanced Mobile Item Preview */}
                      <div className="aspect-square bg-gray-700/30 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                        {/* Enhanced mobile previews with better visual hierarchy */}
                        {activeCategory === 'skins' && (
                          <div className={`w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center relative ${
                            item.id === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/50 shadow-lg' :
                            item.id === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/50 shadow-lg' :
                            item.id === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/50 shadow-lg' :
                            item.id === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/50 shadow-lg' :
                            item.id === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/50 shadow-lg' :
                            'bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600 shadow-cyan-500/50 shadow-lg'
                          } ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                            <div className="w-2 h-2 bg-black rounded-full absolute top-4 left-4"></div>
                            <div className="w-2 h-2 bg-black rounded-full absolute top-4 right-4"></div>
                            {item.rarity === 'legendary' && (
                              <>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Enhanced previews for other categories remain similar but larger and more detailed */}
                        
                        {/* Equipped indicator */}
                        {item.equipped && (
                          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 shadow-lg">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        {/* Locked indicator */}
                        {!item.owned && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                            <Lock className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Enhanced Mobile Item Info */}
                      <div className="text-center">
                        <h4 className="text-white text-sm font-bold mb-1 truncate">{item.name}</h4>
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${rarityColors[item.rarity]} capitalize bg-black/20`}>
                            {item.rarity}
                          </span>
                        </div>
                        {!item.owned && (
                          <div className="text-yellow-400 text-sm font-bold bg-yellow-400/10 px-2 py-1 rounded-lg">
                            💰 {item.price}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Mobile Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-4 mt-6 pb-6">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all disabled:opacity-50 shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-300" />
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300 font-medium bg-gray-800/50 px-4 py-2 rounded-lg">
                        {currentPage + 1} of {totalPages}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-all disabled:opacity-50 shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Mobile Bottom Sheet for Selected Item */}
          {selectedItem && (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900/98 backdrop-blur-md border-t border-gray-700/50 rounded-t-2xl transform transition-transform duration-300 shadow-2xl">
              <div className="p-4">
                {/* Bottom sheet handle */}
                <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4"></div>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-white text-xl font-bold">{selectedItem.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`${rarityColors[selectedItem.rarity]} capitalize font-semibold text-sm px-3 py-1 rounded-full bg-black/20`}>
                        {selectedItem.rarity}
                      </span>
                      {Array.from({ length: selectedItem.rarity === 'legendary' ? 5 : selectedItem.rarity === 'epic' ? 4 : selectedItem.rarity === 'rare' ? 3 : 2 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${rarityColors[selectedItem.rarity]} fill-current`} />
                      ))}
                    </div>
                  </div>
                  {!selectedItem.owned && (
                    <div className="text-right">
                      <span className="text-yellow-400 font-bold text-xl">💰 {selectedItem.price}</span>
                      <div className="text-gray-400 text-sm">Coins</div>
                    </div>
                  )}
                </div>

                {/* Enhanced Mobile Action Button */}
                <div className="space-y-3">
                  {selectedItem.owned ? (
                    <button
                      onClick={() => handleEquipItem(selectedItem)}
                      disabled={selectedItem.equipped}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                        selectedItem.equipped
                          ? 'bg-green-600/20 border-2 border-green-500/30 text-green-400 cursor-not-allowed'
                          : 'bg-purple-600/20 hover:bg-purple-600/30 border-2 border-purple-500/30 text-purple-400 hover:scale-105'
                      }`}
                    >
                      {selectedItem.equipped ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Check className="w-5 h-5" />
                          <span>Equipped</span>
                        </div>
                      ) : (
                        'Equip Item'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchaseItem(selectedItem)}
                      disabled={userBalance < selectedItem.price}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                        userBalance < selectedItem.price
                          ? 'bg-gray-600/20 border-2 border-gray-500/30 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600/20 hover:bg-green-600/30 border-2 border-green-500/30 text-green-400 hover:scale-105'
                      }`}
                    >
                      {userBalance < selectedItem.price ? 'Insufficient Funds' : `Purchase Item`}
                    </button>
                  )}
                </div>
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