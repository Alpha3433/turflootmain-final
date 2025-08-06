'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [apiStatus, setApiStatus] = useState('Testing...')

  useEffect(() => {
    // Test backend API
    fetch('/api/')
      .then(res => res.json())
      .then(data => {
        setApiStatus(`Backend API Working: ${data.message}`)
      })
      .catch(err => {
        setApiStatus(`Backend API Error: ${err.message}`)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E1E1E] via-[#2A2A2A] to-[#1E1E1E] text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">TurfLoot - Backend Testing</h1>
        <div className="text-center">
          <p className="text-lg mb-4">{apiStatus}</p>
          <p className="text-sm text-gray-400">
            This is a temporary page for backend API testing.
          </p>
        </div>
      </div>
    </div>
  )
}
