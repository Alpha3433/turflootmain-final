'use client'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">TurfLoot Test Page</h1>
        <p className="text-gray-400">If you can see this, the basic React rendering is working.</p>
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl mb-2">Simple Test Elements:</h2>
          <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-4">
            Test Button
          </button>
          <div className="mt-4 text-yellow-400">
            🎮 This should be visible if CSS and JS are working
          </div>
        </div>
      </div>
    </div>
  )
}