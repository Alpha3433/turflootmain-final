'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Palette, 
  Shirt, 
  Crown, 
  Sparkles,
  RotateCcw,
  Save,
  Shuffle
} from 'lucide-react'

const CharacterCustomizer = ({ isConnected, onSave }) => {
  const [character, setCharacter] = useState({
    skinColor: 'orange',
    bodyType: 'snake',
    accessories: [],
    eyes: 'normal',
    pattern: 'solid'
  })

  const skinColors = [
    { id: 'orange', name: 'Orange', color: 'from-orange-400 to-orange-600' },
    { id: 'green', name: 'Green', color: 'from-green-400 to-green-600' },
    { id: 'blue', name: 'Blue', color: 'from-blue-400 to-blue-600' },
    { id: 'purple', name: 'Purple', color: 'from-purple-400 to-purple-600' },
    { id: 'red', name: 'Red', color: 'from-red-400 to-red-600' },
    { id: 'yellow', name: 'Yellow', color: 'from-yellow-400 to-yellow-600' },
  ]

  const bodyTypes = [
    { id: 'snake', name: 'Snake', icon: '🐍' },
    { id: 'dragon', name: 'Dragon', icon: '🐲' },
    { id: 'worm', name: 'Worm', icon: '🪱' },
    { id: 'lizard', name: 'Lizard', icon: '🦎' },
  ]

  const eyeTypes = [
    { id: 'normal', name: 'Normal' },
    { id: 'sleepy', name: 'Sleepy' },
    { id: 'angry', name: 'Angry' },
    { id: 'happy', name: 'Happy' },
  ]

  const patterns = [
    { id: 'solid', name: 'Solid' },
    { id: 'stripes', name: 'Stripes' },
    { id: 'spots', name: 'Spots' },
    { id: 'gradient', name: 'Gradient' },
  ]

  const accessories = [
    { id: 'crown', name: 'Crown', icon: '👑', price: 100 },
    { id: 'hat', name: 'Hat', icon: '🎩', price: 50 },
    { id: 'glasses', name: 'Glasses', icon: '🕶️', price: 25 },
    { id: 'bow', name: 'Bow Tie', icon: '🎀', price: 30 },
  ]

  const updateCharacter = (key, value) => {
    setCharacter(prev => ({ ...prev, [key]: value }))
  }

  const toggleAccessory = (accessoryId) => {
    setCharacter(prev => ({
      ...prev,
      accessories: prev.accessories.includes(accessoryId)
        ? prev.accessories.filter(id => id !== accessoryId)
        : [...prev.accessories, accessoryId]
    }))
  }

  const randomizeCharacter = () => {
    setCharacter({
      skinColor: skinColors[Math.floor(Math.random() * skinColors.length)].id,
      bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)].id,
      eyes: eyeTypes[Math.floor(Math.random() * eyeTypes.length)].id,
      pattern: patterns[Math.floor(Math.random() * patterns.length)].id,
      accessories: Math.random() > 0.5 ? [accessories[Math.floor(Math.random() * accessories.length)].id] : []
    })
  }

  const resetCharacter = () => {
    setCharacter({
      skinColor: 'orange',
      bodyType: 'snake',
      accessories: [],
      eyes: 'normal',
      pattern: 'solid'
    })
  }

  const saveCharacter = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first!')
      return
    }

    try {
      const response = await fetch('/api/users/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character)
      })

      if (response.ok) {
        onSave?.(character)
        alert('Character saved successfully!')
      } else {
        alert('Failed to save character')
      }
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save character')
    }
  }

  const CharacterPreview = () => {
    const selectedSkinColor = skinColors.find(c => c.id === character.skinColor)
    
    return (
      <div className="relative">
        {/* Character body */}
        <div className={`w-32 h-32 bg-gradient-to-br ${selectedSkinColor?.color} rounded-full relative shadow-xl`}>
          {/* Pattern overlay */}
          {character.pattern === 'stripes' && (
            <div className="absolute inset-0 bg-black/20 rounded-full" 
                 style={{ 
                   backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)'
                 }} />
          )}
          {character.pattern === 'spots' && (
            <div className="absolute inset-0 rounded-full">
              <div className="absolute top-4 left-6 w-3 h-3 bg-black/30 rounded-full"></div>
              <div className="absolute top-8 right-8 w-2 h-2 bg-black/30 rounded-full"></div>
              <div className="absolute bottom-6 left-8 w-2 h-2 bg-black/30 rounded-full"></div>
            </div>
          )}
          
          {/* Eyes */}
          <div className="absolute top-6 left-6 w-5 h-5 bg-white rounded-full">
            <div className={`absolute w-3 h-3 bg-black rounded-full ${
              character.eyes === 'sleepy' ? 'top-2 left-1' :
              character.eyes === 'angry' ? 'top-0 left-1' :
              character.eyes === 'happy' ? 'top-1 left-1' :
              'top-1 left-1'
            }`}></div>
          </div>
          <div className="absolute top-6 right-6 w-5 h-5 bg-white rounded-full">
            <div className={`absolute w-3 h-3 bg-black rounded-full ${
              character.eyes === 'sleepy' ? 'top-2 left-1' :
              character.eyes === 'angry' ? 'top-0 left-1' :
              character.eyes === 'happy' ? 'top-1 left-1' :
              'top-1 left-1'
            }`}></div>
          </div>

          {/* Mouth based on eye type */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            {character.eyes === 'happy' ? (
              <div className="w-6 h-3 border-b-2 border-black/30 rounded-full"></div>
            ) : (
              <div className="w-6 h-1 bg-black/30 rounded-full"></div>
            )}
          </div>

          {/* Accessories */}
          {character.accessories.includes('crown') && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-2xl">👑</div>
          )}
          {character.accessories.includes('hat') && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-2xl">🎩</div>
          )}
          {character.accessories.includes('glasses') && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-2xl">🕶️</div>
          )}
          {character.accessories.includes('bow') && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xl">🎀</div>
          )}
        </div>

        {/* Body type indicator */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
            {bodyTypes.find(b => b.id === character.bodyType)?.icon} {bodyTypes.find(b => b.id === character.bodyType)?.name}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-gray-900/80 border-yellow-500/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-lg">Character Customizer</span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={randomizeCharacter}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={resetCharacter}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Character Preview */}
        <div className="flex justify-center mb-6">
          <CharacterPreview />
        </div>

        {/* Skin Color */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Skin Color</h3>
          <div className="grid grid-cols-3 gap-2">
            {skinColors.map((color) => (
              <Button
                key={color.id}
                variant={character.skinColor === color.id ? "default" : "outline"}
                size="sm"
                className={`h-10 ${character.skinColor === color.id ? 'bg-yellow-500 text-black' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                onClick={() => updateCharacter('skinColor', color.id)}
              >
                <div className={`w-4 h-4 bg-gradient-to-r ${color.color} rounded-full mr-2`}></div>
                {color.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Body Type */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Body Type</h3>
          <div className="grid grid-cols-2 gap-2">
            {bodyTypes.map((type) => (
              <Button
                key={type.id}
                variant={character.bodyType === type.id ? "default" : "outline"}
                size="sm"
                className={character.bodyType === type.id ? 'bg-yellow-500 text-black' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
                onClick={() => updateCharacter('bodyType', type.id)}
              >
                <span className="mr-2">{type.icon}</span>
                {type.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Eyes */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Eyes</h3>
          <div className="grid grid-cols-2 gap-2">
            {eyeTypes.map((eye) => (
              <Button
                key={eye.id}
                variant={character.eyes === eye.id ? "default" : "outline"}
                size="sm"
                className={character.eyes === eye.id ? 'bg-yellow-500 text-black' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
                onClick={() => updateCharacter('eyes', eye.id)}
              >
                {eye.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Pattern */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Pattern</h3>
          <div className="grid grid-cols-2 gap-2">
            {patterns.map((pattern) => (
              <Button
                key={pattern.id}
                variant={character.pattern === pattern.id ? "default" : "outline"}
                size="sm"
                className={character.pattern === pattern.id ? 'bg-yellow-500 text-black' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
                onClick={() => updateCharacter('pattern', pattern.id)}
              >
                {pattern.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Accessories */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Accessories</h3>
          <div className="space-y-2">
            {accessories.map((accessory) => (
              <div key={accessory.id} className="flex items-center justify-between">
                <Button
                  variant={character.accessories.includes(accessory.id) ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 mr-2 ${character.accessories.includes(accessory.id) ? 'bg-yellow-500 text-black' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                  onClick={() => toggleAccessory(accessory.id)}
                  disabled={!isConnected}
                >
                  <span className="mr-2">{accessory.icon}</span>
                  {accessory.name}
                </Button>
                <Badge variant="secondary" className="bg-green-900/50 text-green-400">
                  ${accessory.price}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold"
          onClick={saveCharacter}
          disabled={!isConnected}
        >
          <Save className="w-4 h-4 mr-2" />
          {isConnected ? 'Save Character' : 'Connect Wallet to Save'}
        </Button>

        {!isConnected && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Connect your wallet to save and use your custom character in games
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default CharacterCustomizer