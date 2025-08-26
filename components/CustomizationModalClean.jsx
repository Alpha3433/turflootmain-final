'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  ShoppingCart, 
  Package, 
  Palette, 
  Sparkles, 
  Eye, 
  Search,
  Check,
  Lock,
  Star
} from 'lucide-react'

const CustomizationModalClean = ({ isOpen, onClose, userBalance = 1250 }) => {
  const [activeTab, setActiveTab] = useState('inventory')
  const [activeCategory, setActiveCategory] = useState('skins')
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterRarity, setFilterRarity] = useState('all')
  const [balanceHighlight, setBalanceHighlight] = useState(false)
  const [previousBalance, setPreviousBalance] = useState(userBalance)
  
  const [playerData, setPlayerData] = useState({
    equippedSkin: 'default_blue'
  })

  const [itemsData, setItemsData] = useState({
    skins: [
      // Basic collection - Default colors for new users
      { id: 'default_blue', name: 'Classic Blue', rarity: 'common', price: 0, owned: true, equipped: true, color: '#4F46E5', description: 'The original TurfLoot skin that started it all.' },
      { id: 'basic_red', name: 'Basic Red', rarity: 'common', price: 0, owned: true, equipped: false, color: '#EF4444', description: 'A classic red skin for bold players.' },
      { id: 'basic_green', name: 'Basic Green', rarity: 'common', price: 0, owned: true, equipped: false, color: '#10B981', description: 'Fresh green color for nature lovers.' },
      { id: 'basic_yellow', name: 'Basic Yellow', rarity: 'common', price: 0, owned: true, equipped: false, color: '#F59E0B', description: 'Bright yellow for sunshine vibes.' },
      { id: 'basic_purple', name: 'Basic Purple', rarity: 'common', price: 0, owned: true, equipped: false, color: '#8B5CF6', description: 'Royal purple for distinguished players.' },
      { id: 'basic_orange', name: 'Basic Orange', rarity: 'common', price: 0, owned: true, equipped: false, color: '#F97316', description: 'Vibrant orange energy.' },
      
      // Premium skins available in store
      { id: 'rainbow_hologram', name: 'Rainbow Hologram', rarity: 'legendary', price: 750, owned: false, equipped: false, color: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FECA57)', description: 'Shimmering holographic rainbow effect that shifts colors.' },
      { id: 'chrome_steel', name: 'Chrome Steel', rarity: 'epic', price: 400, owned: false, equipped: false, color: '#9CA3AF', description: 'Polished metallic chrome finish with mirror reflections.' },
      { id: 'matte_blue', name: 'Matte Blue', rarity: 'rare', price: 200, owned: false, equipped: false, color: '#1E40AF', description: 'Sophisticated matte blue with subtle texture.' },
      { id: 'golden_snake', name: 'Golden Snake', rarity: 'legendary', price: 500, owned: false, equipped: false, color: '#D97706', description: 'Legendary golden skin with mystical powers.' },
      { id: 'neon_green', name: 'Neon Green', rarity: 'rare', price: 150, owned: false, equipped: false, color: '#00FF88', description: 'Glows with electric energy in dark environments.' },
      { id: 'fire_red', name: 'Fire Red', rarity: 'epic', price: 300, owned: false, equipped: false, color: '#DC2626', description: 'Burns with the fury of a thousand suns.' },
      { id: 'ice_blue', name: 'Ice Blue', rarity: 'rare', price: 180, owned: false, equipped: false, color: '#0EA5E9', description: 'Frozen beauty with crystalline perfection.' },
      { id: 'shadow_black', name: 'Shadow Black', rarity: 'legendary', price: 600, owned: false, equipped: false, color: '#1F2937', description: 'Emerges from the void with dark energy.' }
    ]
  })

  const categories = [
    { id: 'skins', name: 'Skins', icon: Palette, color: 'text-blue-400' }
  ]

  const rarityColors = {
    common: 'border-gray-400 text-gray-100',
    rare: 'border-blue-400 text-blue-200',
    epic: 'border-purple-400 text-purple-200',
    legendary: 'border-yellow-400 text-yellow-100'
  }

  // Load saved customization data and update equipped states
  useEffect(() => {
    if (!isOpen) return
    
    try {
      const saved = localStorage.getItem('turfloot_player_customization')
      if (saved) {
        const customizationData = JSON.parse(saved)
        console.log('Loading customization:', customizationData) // Debug log
        
        // Update player data
        setPlayerData(prev => ({
          ...prev,
          equippedSkin: customizationData.skin || 'default_blue'
        }))
        
        // Update equipped states in items data
        setItemsData(prev => {
          const newItemsData = { ...prev }
          
          // Set equipped states for skins
          if (customizationData.skin && newItemsData.skins) {
            newItemsData.skins = newItemsData.skins.map(item => ({
              ...item,
              equipped: item.id === customizationData.skin
            }))
          }
          
          return newItemsData
        })
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
    }
  }, [isOpen])

  // Balance change detection and highlight effect
  useEffect(() => {
    if (userBalance !== previousBalance && previousBalance !== userBalance) {
      console.log(`💰 Balance changed in customization modal: ${previousBalance} → ${userBalance}`)
      setBalanceHighlight(true)
      setPreviousBalance(userBalance)
      
      // Remove highlight after 2 seconds
      const timer = setTimeout(() => {
        setBalanceHighlight(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [userBalance, previousBalance])

  // Filter and sort items
  const getFilteredItems = () => {
    let items = itemsData[activeCategory] || []
    
    // Separate items based on active tab
    if (activeTab === 'inventory') {
      // My Collection: Only show owned items
      items = items.filter(item => item.owned)
    } else if (activeTab === 'shop') {
      // Item Shop: Only show unowned items
      items = items.filter(item => !item.owned)
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

  const handleEquipItem = (item) => {
    if (!item.owned) return
    
    // Update items data to mark new item as equipped and others as unequipped
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
    
    // Update local player data immediately
    const categoryKey = activeCategory === 'skins' ? 'equippedSkin' : null
    
    if (categoryKey) {
      setPlayerData(prev => ({
        ...prev,
        [categoryKey]: item.id
      }))
    }
    
    // Save to localStorage immediately with all current data
    const newCustomizationData = {
      skin: activeCategory === 'skins' ? item.id : playerData.equippedSkin
    }
    
    try {
      localStorage.setItem('turfloot_player_customization', JSON.stringify(newCustomizationData))
      console.log('Saved customization:', newCustomizationData) // Debug log
    } catch (error) {
      console.error('Failed to save customization:', error)
    }
    
    // Also trigger a custom event to notify the game of the change
    window.dispatchEvent(new CustomEvent('playerCustomizationChanged', { 
      detail: newCustomizationData 
    }))
  }

  const handlePurchaseItem = (item) => {
    if (item.owned || userBalance < item.price) return
    console.log(`Purchasing ${item.name} for ${item.price} coins`)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Mobile Layout */}
      <div className="md:hidden w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        
        {/* Mobile Header - Enhanced */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-800/90">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-600/30 rounded-xl border border-purple-500/40 shadow-lg">
              <Palette className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Customization</h2>
              <p className="text-sm text-gray-400">Personalize your style</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Mobile Coin Balance - Enhanced */}
            <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl border-2 transition-all duration-500 ${
              balanceHighlight 
                ? 'bg-green-500/30 border-green-400/60 shadow-lg shadow-green-400/20' 
                : 'bg-yellow-500/25 border-yellow-500/40 shadow-lg'
            }`}>
              <div className="text-yellow-300 text-xl">💰</div>
              <div>
                <div className={`font-bold text-base transition-all duration-500 ${
                  balanceHighlight ? 'text-green-300 scale-110' : 'text-yellow-300'
                }`}>
                  {userBalance.toLocaleString()}
                  {balanceHighlight && (
                    <span className="ml-1 text-green-200 text-sm animate-bounce">+</span>
                  )}
                </div>
                <div className="text-yellow-500 text-xs font-medium">COINS</div>
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

        {/* Mobile Tab Switcher - Enhanced */}
        <div className="flex bg-gray-800/60 mx-5 mt-4 mb-3 rounded-2xl p-1.5 border border-gray-700/60 shadow-lg">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center space-x-3 active:scale-95 ${
              activeTab === 'inventory' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Collection</span>
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center space-x-3 active:scale-95 ${
              activeTab === 'shop' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Shop</span>
          </button>
        </div>

        {/* Mobile Content Area - Enhanced */}
        <div className="flex-1 px-5 pb-5 overflow-hidden">
          
          {/* Mobile Search & Filter - Enhanced */}
          <div className="mb-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search skins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-800/60 border border-gray-700/60 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:bg-gray-800/80 text-base shadow-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-4 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white text-base focus:outline-none focus:border-purple-500/60 shadow-lg font-medium"
              >
                <option value="newest">🆕 Newest First</option>
                <option value="oldest">📅 Oldest First</option>
                <option value="expensive">💎 Most Expensive</option>
                <option value="cheapest">💰 Least Expensive</option>
              </select>
              
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="px-4 py-4 bg-gray-800/60 border border-gray-700/60 rounded-xl text-white text-base focus:outline-none focus:border-purple-500/60 shadow-lg font-medium"
              >
                <option value="all">✨ All Rarities</option>
                <option value="common">⚪ Common</option>
                <option value="rare">🔵 Rare</option>
                <option value="epic">🟣 Epic</option>
                <option value="legendary">🟡 Legendary</option>
              </select>
            </div>
          </div>

          {/* Mobile Category Pills - Enhanced */}
          <div className="flex space-x-3 mb-5 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center space-x-3 px-5 py-3 rounded-2xl text-base font-bold transition-all whitespace-nowrap active:scale-95 shadow-lg ${
                    activeCategory === category.id
                      ? 'bg-purple-600 text-white shadow-purple-600/30'
                      : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 border border-gray-700/60'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Items Grid - Optimized */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getFilteredItems().map((item) => (
                <div
                  key={item.id}
                  className={`relative bg-gray-800/50 rounded-2xl p-5 border-2 transition-all cursor-pointer active:scale-95 min-h-[120px] ${
                    playerData.equippedSkin === item.id
                      ? 'border-purple-500/80 bg-purple-600/25 shadow-lg shadow-purple-500/20'
                      : item.owned
                      ? 'border-gray-600/60 hover:border-gray-500/80 hover:bg-gray-700/50'
                      : 'border-gray-700/60 hover:border-purple-500/40 hover:bg-gray-700/30'
                  }`}
                  onClick={() => item.owned ? handleEquipItem(item) : handlePurchaseItem(item)}
                >
                  {/* Mobile Item Preview - Larger */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700/50 shadow-inner">
                      <div 
                        className="w-12 h-12 rounded-full border-3 shadow-lg"
                        style={{ 
                          background: item.color?.includes('linear-gradient') ? item.color : item.color,
                          borderColor: item.owned ? item.color : 'rgba(156, 163, 175, 0.5)',
                          opacity: item.owned ? 1 : 0.7
                        }}
                      ></div>
                    </div>

                    {/* Mobile Item Info - Better Layout */}
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-white mb-1 leading-tight">{item.name}</h3>
                      
                      {/* Rarity Badge */}
                      <div className={`inline-block px-2 py-1 rounded-lg text-xs font-bold mb-2 ${
                        item.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                        item.rarity === 'epic' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' :
                        item.rarity === 'rare' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 
                        'bg-gray-600/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {item.rarity.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge - More Prominent */}
                  <div className="flex">
                    {playerData.equippedSkin === item.id && (
                      <div className="w-full bg-purple-600 text-white text-sm px-4 py-2 rounded-xl font-bold text-center shadow-lg">
                        ✓ EQUIPPED
                      </div>
                    )}
                    
                    {item.owned && playerData.equippedSkin !== item.id && (
                      <div className="w-full bg-green-600 text-white text-sm px-4 py-2 rounded-xl font-bold text-center shadow-lg">
                        TAP TO EQUIP
                      </div>
                    )}
                    
                    {!item.owned && (
                      <div className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm px-4 py-2 rounded-xl font-bold text-center shadow-lg">
                        BUY FOR {item.price} COINS
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Unchanged */}
      <div className="hidden md:block relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden border border-purple-500/30 shadow-2xl">
        
        {/* Desktop Header */}
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
                onClick={() => setActiveTab('inventory')}
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
                onClick={() => setActiveTab('shop')}
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
          
          {/* Desktop Currency Display */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl border transition-all duration-500 ${
              balanceHighlight 
                ? 'bg-green-500/30 border-green-400/50 shadow-lg shadow-green-400/20' 
                : 'bg-yellow-500/20 border-yellow-500/30'
            }`}>
              <div className="text-yellow-400 text-2xl">💰</div>
              <div>
                <div className={`font-bold text-xl transition-all duration-500 ${
                  balanceHighlight ? 'text-green-400 scale-110' : 'text-yellow-400'
                }`}>
                  {userBalance.toLocaleString()}
                  {balanceHighlight && (
                    <span className="ml-2 text-green-300 text-sm animate-bounce">+</span>
                  )}
                </div>
                <div className="text-yellow-600 text-sm">Coins</div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(95vh-120px)]">
          {/* Desktop Sidebar */}
          <div className="w-80 bg-gray-800/30 border-r border-gray-700/50 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Desktop Categories */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <span>Categories</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => {
                    const IconComponent = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`flex items-center space-x-3 p-4 rounded-xl text-left transition-all ${
                          activeCategory === category.id
                            ? 'bg-purple-600/80 text-white shadow-lg border border-purple-500/50'
                            : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600/40 hover:text-white border border-gray-700/50'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span className="font-medium text-sm">{category.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Desktop Filters */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Filters</h3>
                <div className="space-y-4">
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  
                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="expensive">Most Expensive</option>
                      <option value="cheapest">Least Expensive</option>
                    </select>
                  </div>
                  
                  {/* Rarity Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rarity</label>
                    <select
                      value={filterRarity}
                      onChange={(e) => setFilterRarity(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
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
            </div>
          </div>

          {/* Desktop Main Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-6">
              {getFilteredItems().map((item) => (
                <div
                  key={item.id}
                  className={`relative bg-gray-800/40 rounded-2xl p-6 border transition-all cursor-pointer hover:scale-105 ${
                    playerData.equippedSkin === item.id
                      ? 'border-purple-500/60 bg-purple-600/20 shadow-lg shadow-purple-500/20'
                      : item.owned
                      ? 'border-gray-600/50 hover:border-gray-500/70 hover:bg-gray-700/40'
                      : 'border-gray-700/50 hover:border-purple-500/30'
                  }`}
                  onClick={() => item.owned ? handleEquipItem(item) : handlePurchaseItem(item)}
                >
                  {/* Desktop Item Preview */}
                  <div className="aspect-square bg-gray-900 rounded-xl mb-4 flex items-center justify-center border border-gray-700/50">
                    <div 
                      className="w-16 h-16 rounded-full border-4"
                      style={{ 
                        backgroundColor: item.color,
                        borderColor: item.color,
                        opacity: item.owned ? 1 : 0.6
                      }}
                    ></div>
                  </div>

                  {/* Desktop Item Info */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                    
                    {/* Status Badges */}
                    <div className="space-y-2">
                      {playerData.equippedSkin === item.id && (
                        <div className="bg-purple-600/90 text-white text-sm px-4 py-2 rounded-full font-medium">
                          Currently Equipped
                        </div>
                      )}
                      
                      {item.owned && playerData.equippedSkin !== item.id && (
                        <div className="bg-green-600/90 text-white text-sm px-4 py-2 rounded-full font-medium">
                          Owned - Click to Equip
                        </div>
                      )}
                      
                      {!item.owned && (
                        <div className="bg-yellow-600/90 text-white text-sm px-4 py-2 rounded-full font-medium">
                          Purchase for {item.price} coins
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Rarity Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold ${
                    item.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                    item.rarity === 'epic' ? 'bg-purple-600 text-white' :
                    item.rarity === 'rare' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                  }`}>
                    {item.rarity.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CustomizationModalClean