'use client'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold text-center">TurfLoot Test Page</h1>
      <p className="text-center mt-4">If you can see this, the basic setup is working.</p>
      <div className="mt-8 text-center">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Test Button
        </button>
      </div>
    </div>
  )
}