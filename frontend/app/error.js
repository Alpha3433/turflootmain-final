'use client'

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">500</h1>
        <h2 className="text-2xl text-gray-300 mb-8">Server Error</h2>
        <p className="text-gray-400 mb-8">Something went wrong on our end.</p>
        <div className="space-x-4">
          <button 
            onClick={reset}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <a 
            href="/" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors inline-block"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  )
}