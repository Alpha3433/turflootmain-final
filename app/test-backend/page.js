'use client'

import { useState } from 'react'

export default function TestBackend() {
  const [result, setResult] = useState('')

  const testAPI = async () => {
    try {
      const response = await fetch('/api/')
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Error: ${error.message}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Backend API Test</h1>
      <button 
        onClick={testAPI}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Test Root API
      </button>
      <pre className="bg-gray-100 p-4 rounded text-black">
        {result}
      </pre>
    </div>
  )
}