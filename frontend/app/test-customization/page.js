'use client'

import { useState } from 'react'
import CustomizationModalClean from '@/components/CustomizationModalClean'

export default function TestCustomization() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-white text-4xl font-bold mb-8">Customization Preview Test</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all"
        >
          Open Customization Modal
        </button>
        
        <CustomizationModalClean 
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userBalance={1250}
        />
      </div>
    </div>
  )
}