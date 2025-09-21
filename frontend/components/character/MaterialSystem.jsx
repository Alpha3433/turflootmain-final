/**
 * Advanced Material System for Character Customization
 * Provides premium materials, textures, and visual effects
 */

export const MaterialTypes = {
  BASIC: 'basic',
  METALLIC: 'metallic', 
  HOLOGRAPHIC: 'holographic',
  ANIMATED: 'animated',
  PARTICLE: 'particle',
  GLOW: 'glow'
}

export const RarityTiers = {
  COMMON: { 
    name: 'Common', 
    color: '#9CA3AF', 
    glow: 'rgba(156, 163, 175, 0.2)',
    effects: [] 
  },
  RARE: { 
    name: 'Rare', 
    color: '#3B82F6', 
    glow: 'rgba(59, 130, 246, 0.4)',
    effects: ['shimmer'] 
  },
  EPIC: { 
    name: 'Epic', 
    color: '#8B5CF6', 
    glow: 'rgba(139, 92, 246, 0.5)',
    effects: ['shimmer', 'particles'] 
  },
  LEGENDARY: { 
    name: 'Legendary', 
    color: '#F59E0B', 
    glow: 'rgba(245, 158, 11, 0.7)',
    effects: ['shimmer', 'particles', 'rainbow'] 
  }
}

// Enhanced skin materials with premium effects
export const SkinMaterials = {
  // Basic Materials (Common)
  matte_blue: {
    id: 'matte_blue',
    name: 'Matte Blue',
    type: MaterialTypes.BASIC,
    rarity: RarityTiers.COMMON,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
    price: 0,
    description: 'Clean, professional matte finish'
  },
  
  // Metallic Materials (Rare)
  chrome_steel: {
    id: 'chrome_steel',
    name: 'Chrome Steel',
    type: MaterialTypes.METALLIC,
    rarity: RarityTiers.RARE,
    gradient: 'linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 50%, #6B7280 100%)',
    reflection: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 50%)',
    price: 150,
    description: 'Polished chrome finish with realistic reflections'
  },
  
  copper_bronze: {
    id: 'copper_bronze',
    name: 'Copper Bronze',
    type: MaterialTypes.METALLIC,
    rarity: RarityTiers.RARE,
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #9A3412 100%)',
    reflection: 'radial-gradient(circle at 40% 20%, rgba(255,196,143,0.6) 0%, transparent 60%)',
    price: 180,
    description: 'Warm copper with bronze highlights'
  },

  // Holographic Materials (Epic)
  rainbow_holo: {
    id: 'rainbow_holo',
    name: 'Rainbow Hologram',
    type: MaterialTypes.HOLOGRAPHIC,
    rarity: RarityTiers.EPIC,
    gradient: 'conic-gradient(from 0deg, #FF0080, #FF8000, #80FF00, #00FF80, #0080FF, #8000FF, #FF0080)',
    animation: 'holo-shift 3s ease-in-out infinite',
    price: 300,
    description: 'Mesmerizing holographic rainbow effect'
  },
  
  crystal_prism: {
    id: 'crystal_prism',
    name: 'Crystal Prism',
    type: MaterialTypes.HOLOGRAPHIC,
    rarity: RarityTiers.EPIC,
    gradient: 'linear-gradient(45deg, transparent 0%, rgba(147,197,253,0.8) 25%, rgba(196,165,255,0.8) 50%, rgba(253,164,175,0.8) 75%, transparent 100%)',
    animation: 'crystal-rotate 4s linear infinite',
    price: 350,
    description: 'Crystalline structure with light refraction'
  },

  // Animated Materials (Epic/Legendary)  
  plasma_storm: {
    id: 'plasma_storm',
    name: 'Plasma Storm',
    type: MaterialTypes.ANIMATED,
    rarity: RarityTiers.EPIC,
    gradient: 'radial-gradient(circle, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
    animation: 'plasma-pulse 2s ease-in-out infinite',
    particles: true,
    price: 400,
    description: 'Swirling plasma energy with electric particles'
  },

  liquid_mercury: {
    id: 'liquid_mercury',
    name: 'Liquid Mercury',
    type: MaterialTypes.ANIMATED,
    rarity: RarityTiers.LEGENDARY,
    gradient: 'radial-gradient(ellipse at center, #E5E7EB 0%, #9CA3AF 40%, #4B5563 80%, #1F2937 100%)',
    animation: 'mercury-flow 6s ease-in-out infinite',
    reflection: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.9) 0%, transparent 40%)',
    price: 600,
    description: 'Flowing liquid metal that responds to movement'
  },

  // Particle Materials (Legendary)
  star_forge: {
    id: 'star_forge',
    name: 'Star Forge',
    type: MaterialTypes.PARTICLE,
    rarity: RarityTiers.LEGENDARY,
    gradient: 'radial-gradient(circle, #1E1B4B 0%, #312E81 30%, #1E40AF 60%, #000000 100%)',
    particles: {
      type: 'stars',
      count: 15,
      color: '#FBBF24',
      size: '2px',
      animation: 'twinkle 1.5s ease-in-out infinite alternate'
    },
    price: 800,
    description: 'Deep space material with twinkling star particles'
  }
}

// Enhanced trail materials
export const TrailMaterials = {
  basic_sparkle: {
    id: 'basic_sparkle',
    name: 'Basic Sparkle',
    type: MaterialTypes.BASIC,
    rarity: RarityTiers.COMMON,
    particles: { type: 'sparkle', count: 5, color: '#FBBF24' },
    price: 0
  },
  
  neon_lightning: {
    id: 'neon_lightning',
    name: 'Neon Lightning',
    type: MaterialTypes.GLOW,
    rarity: RarityTiers.RARE,
    particles: { type: 'lightning', count: 8, color: '#06D6A0' },
    glow: 'rgba(6, 214, 160, 0.6)',
    price: 200
  },

  phoenix_fire: {
    id: 'phoenix_fire',
    name: 'Phoenix Fire',
    type: MaterialTypes.ANIMATED,
    rarity: RarityTiers.EPIC,
    particles: { 
      type: 'flame', 
      count: 12, 
      colors: ['#FF6B35', '#F7931E', '#FFD23F'],
      animation: 'flame-flicker 0.8s ease-in-out infinite'
    },
    price: 350
  },

  cosmic_dust: {
    id: 'cosmic_dust',
    name: 'Cosmic Dust',
    type: MaterialTypes.PARTICLE,
    rarity: RarityTiers.LEGENDARY,
    particles: {
      type: 'galaxy',
      count: 20,
      colors: ['#8B5CF6', '#EC4899', '#06D6A0', '#FBBF24'],
      animation: 'cosmic-swirl 4s linear infinite'
    },
    price: 500
  }
}

// Hat materials with 3D effects
export const HatMaterials = {
  leather_brown: {
    id: 'leather_brown',
    name: 'Leather Brown',
    type: MaterialTypes.BASIC,
    rarity: RarityTiers.COMMON,
    texture: 'url(/textures/leather.png)',
    price: 0
  },

  golden_crown: {
    id: 'golden_crown',
    name: 'Golden Crown',
    type: MaterialTypes.METALLIC,
    rarity: RarityTiers.LEGENDARY,
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)',
    gems: [
      { color: '#EF4444', position: 'center' },
      { color: '#3B82F6', position: 'left' },
      { color: '#10B981', position: 'right' }
    ],
    price: 1000
  }
}

// Material rendering utilities
export const MaterialRenderer = {
  // Apply material styles to element
  applyMaterial: (element, material, customization = {}) => {
    if (!element || !material) return

    const styles = {}

    // Base gradient/color
    if (material.gradient) {
      styles.background = material.gradient
    }

    // Metallic reflection overlay
    if (material.reflection) {
      styles.backgroundImage = `${material.gradient}, ${material.reflection}`
    }

    // Animations
    if (material.animation) {
      styles.animation = material.animation
    }

    // Glow effects
    if (material.rarity.glow) {
      styles.boxShadow = `0 0 20px ${material.rarity.glow}, inset 0 0 20px ${material.rarity.glow}`
    }

    // Apply styles
    Object.assign(element.style, styles)

    // Add particles if specified
    if (material.particles) {
      MaterialRenderer.addParticleEffect(element, material.particles)
    }
  },

  // Add particle effects
  addParticleEffect: (element, particleConfig) => {
    const container = document.createElement('div')
    container.className = 'material-particles'
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `

    for (let i = 0; i < particleConfig.count; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.cssText = `
        position: absolute;
        width: ${particleConfig.size || '3px'};
        height: ${particleConfig.size || '3px'};
        background: ${Array.isArray(particleConfig.colors) 
          ? particleConfig.colors[i % particleConfig.colors.length]
          : particleConfig.color || '#FFFFFF'};
        border-radius: 50%;
        animation: ${particleConfig.animation || 'particle-float 3s ease-in-out infinite'};
        animation-delay: ${Math.random() * 2}s;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
      `
      container.appendChild(particle)
    }

    element.appendChild(container)
  },

  // Get CSS for material
  getMaterialCSS: (material) => {
    let css = ''

    if (material.animation) {
      css += `
        @keyframes ${material.animation.split(' ')[0]} {
          /* Animation keyframes would be defined here */
        }
      `
    }

    return css
  }
}

// Rarity upgrade system
export const RarityUpgrade = {
  canUpgrade: (item, userCurrency) => {
    const upgradeCost = item.price * 2 // Double the price to upgrade
    return userCurrency >= upgradeCost && item.rarity !== RarityTiers.LEGENDARY
  },

  getUpgradeCost: (item) => {
    return item.price * 2
  },

  upgradeRarity: (item) => {
    const rarityLevels = [
      RarityTiers.COMMON,
      RarityTiers.RARE, 
      RarityTiers.EPIC,
      RarityTiers.LEGENDARY
    ]

    const currentIndex = rarityLevels.findIndex(r => r.name === item.rarity.name)
    if (currentIndex < rarityLevels.length - 1) {
      return {
        ...item,
        rarity: rarityLevels[currentIndex + 1],
        price: item.price * 3 // Increased value after upgrade
      }
    }
    return item
  }
}