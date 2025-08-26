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
        
        {/* Mobile Header - Compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/80 to-gray-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
              <Palette className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Customization</h2>
              <p className="text-xs text-gray-400">Personalize your experience</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Mobile Coin Balance - Compact */}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
              balanceHighlight 
                ? 'bg-green-500/30 border-green-400/50' 
                : 'bg-yellow-500/20 border-yellow-500/30'
            }`}>
              <div className="text-yellow-400 text-lg">💰</div>
              <div>
                <div className={`font-bold text-sm transition-all duration-500 ${
                  balanceHighlight ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {userBalance.toLocaleString()}
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex bg-gray-800/50 mx-4 mt-3 mb-2 rounded-xl p-1 border border-gray-700/50">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'inventory' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Collection</span>
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'shop' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Shop</span>
          </button>
        </div>

        {/* Mobile Content Area */}
        <div className="flex-1 px-4 pb-4 overflow-hidden">
          
          {/* Mobile Search & Filter */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 text-sm"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="expensive">Most Expensive</option>
                <option value="cheapest">Least Expensive</option>
              </select>
              
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
          </div>

          {/* Mobile Category Pills */}
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeCategory === category.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700/50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Items Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {getCurrentItems().map((item) => (
                <div
                  key={item.id}
                  className={`relative bg-gray-800/40 rounded-xl p-3 border transition-all cursor-pointer ${
                    playerData.equippedSkin === item.id
                      ? 'border-purple-500/60 bg-purple-600/20 shadow-lg'
                      : item.owned
                      ? 'border-gray-600/50 hover:border-gray-500/70 hover:bg-gray-700/40'
                      : 'border-gray-700/50 hover:border-purple-500/30'
                  }`}
                  onClick={() => item.owned ? handleEquipItem(item) : handlePurchaseItem(item)}
                >
                  {/* Mobile Item Preview */}
                  <div className="aspect-square bg-gray-900 rounded-lg mb-2 flex items-center justify-center border border-gray-700/50">
                    <div 
                      className="w-12 h-12 rounded-full border-2"
                      style={{ 
                        backgroundColor: item.color,
                        borderColor: item.color,
                        opacity: item.owned ? 1 : 0.6
                      }}
                    ></div>
                  </div>

                  {/* Mobile Item Info */}
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-white mb-1 truncate">{item.name}</h3>
                    
                    {/* Status Badges */}
                    <div className="flex flex-col space-y-1">
                      {playerData.equippedSkin === item.id && (
                        <div className="bg-purple-600/90 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Equipped
                        </div>
                      )}
                      
                      {item.owned && playerData.equippedSkin !== item.id && (
                        <div className="bg-green-600/90 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Owned
                        </div>
                      )}
                      
                      {!item.owned && (
                        <div className="bg-yellow-600/90 text-white text-xs px-2 py-1 rounded-full font-medium">
                          ${item.price}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Rarity Indicator */}
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                    item.rarity === 'legendary' ? 'bg-yellow-400' :
                    item.rarity === 'epic' ? 'bg-purple-500' :
                    item.rarity === 'rare' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Unchanged */}
      <div className="hidden md:block relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden border border-purple-500/30 shadow-2xl">
        
        {/* Header */}
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
            
            {/* Tab Switcher */}
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
          
          {/* Currency Display */}
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
          {/* Sidebar */}
          <div className="w-80 bg-gray-800/30 border-r border-gray-700/50 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Categories */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <span>Categories</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => {
                    const Icon = category.icon
                    const allItems = itemsData[category.id] || []
                    const ownedCount = allItems.filter(item => item.owned).length
                    const unownedCount = allItems.filter(item => !item.owned).length
                    const displayCount = activeTab === 'inventory' ? ownedCount : activeTab === 'shop' ? unownedCount : allItems.length
                    
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
                          {activeTab === 'inventory' ? `${ownedCount} owned` : 
                           activeTab === 'shop' ? `${unownedCount} available` : 
                           `${allItems.length} total`}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Search */}
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
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col transition-all duration-300">
            
            {/* Items Header */}
            <div className="p-6 border-b border-gray-700/50 bg-gray-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">{activeCategory}</h3>
                  <p className="text-gray-400">
                    {getFilteredItems().length} items {
                      activeTab === 'inventory' ? 'in your collection' : 
                      activeTab === 'shop' ? 'available for purchase' : 'available'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-4 gap-6">
                {getFilteredItems().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group relative bg-gray-800/50 rounded-2xl p-6 border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl h-80 flex flex-col ${
                      item.equipped ? 'border-green-400 bg-green-400/5 shadow-green-400/20' : rarityColors[item.rarity]
                    } ${selectedItem?.id === item.id ? 'ring-2 ring-purple-400 scale-105' : ''}`}
                  >
                    
                    {/* Item Preview */}
                    <div className="aspect-square bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
                      
                      {/* Skin Color Preview */}
                      {activeCategory === 'skins' && (
                        <div className={`w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center relative ${
                          item.id === 'default_blue' || item.id === 'classic_blue' ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 shadow-blue-500/50 shadow-lg' :
                          item.id === 'basic_red' ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-red-500/50 shadow-lg' :
                          item.id === 'basic_green' ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-green-500/50 shadow-lg' :
                          item.id === 'basic_yellow' ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-yellow-500/50 shadow-lg' :
                          item.id === 'basic_purple' ? 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-purple-500/50 shadow-lg' :
                          item.id === 'basic_orange' ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-orange-500/50 shadow-lg' :
                          item.id === 'rainbow_hologram' ? 'bg-gradient-to-br from-red-400 via-purple-500 to-blue-500 shadow-purple-500/60 shadow-xl animate-pulse' :
                          item.id === 'chrome_steel' ? 'bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400 shadow-gray-500/60 shadow-lg' :
                          item.id === 'matte_blue' ? 'bg-blue-600 shadow-blue-500/60 shadow-lg' :
                          item.id === 'golden_snake' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 shadow-yellow-500/60 shadow-xl' :
                          item.id === 'neon_green' ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 shadow-green-500/60 shadow-xl' :
                          item.id === 'fire_red' ? 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-500 shadow-red-500/60 shadow-xl' :
                          item.id === 'ice_blue' ? 'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 shadow-blue-500/60 shadow-xl' :
                          item.id === 'shadow_black' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black shadow-purple-500/60 shadow-xl' :
                          'bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600 shadow-cyan-500/50 shadow-lg'
                        } ${!item.owned ? 'grayscale opacity-60' : ''}`}>
                          {/* Eyes */}
                          <div className="w-2.5 h-2.5 bg-black rounded-full absolute top-5 left-5"></div>
                          <div className="w-2.5 h-2.5 bg-black rounded-full absolute top-5 right-5"></div>
                          
                          {/* Legendary effects */}
                          {(item.rarity === 'legendary') && (
                            <>
                              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                            </>
                          )}
                        </div>
                      )}
                      
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

                    {/* Item Info */}
                    <div className="text-center mb-6">
                      <h4 className="text-white text-lg font-bold mb-3 group-hover:text-purple-300 transition-colors line-clamp-1">{item.name}</h4>
                      <div className="flex items-center justify-center space-x-2 mb-4">
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
                        <div className="text-yellow-400 text-lg font-bold bg-yellow-400/10 px-4 py-2 rounded-xl border border-yellow-400/30 mb-4">
                          💰 {item.price}
                        </div>
                      )}
                    </div>

                    {/* Action Button - Fixed Position */}
                    <div className="absolute inset-x-4 bottom-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CustomizationModalClean