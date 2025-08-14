'use client'

export default function TestEnvPage() {
  const envVars = {
    'NEXT_PUBLIC_PRIVY_APP_ID': process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    'NEXT_PUBLIC_BASE_URL': process.env.NEXT_PUBLIC_BASE_URL,
    'NEXT_PUBLIC_TESTING_MODE': process.env.NEXT_PUBLIC_TESTING_MODE,
    'NODE_ENV': process.env.NODE_ENV,
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Environment Variables Test</h1>
      
      <div className="space-y-4">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-yellow-400">{key}:</span>
              <span className={value ? 'text-green-400' : 'text-red-400'}>
                {value || 'NOT SET'}
              </span>
            </div>
            {key === 'NEXT_PUBLIC_PRIVY_APP_ID' && value && (
              <div className="text-sm text-gray-400 mt-1">
                Length: {value.length} characters
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-900 rounded-lg">
        <h2 className="font-bold mb-2">📋 Diagnosis:</h2>
        <ul className="space-y-1 text-sm">
          <li className={envVars.NEXT_PUBLIC_PRIVY_APP_ID ? 'text-green-400' : 'text-red-400'}>
            {envVars.NEXT_PUBLIC_PRIVY_APP_ID ? '✅' : '❌'} Privy App ID
          </li>
          <li className={envVars.NEXT_PUBLIC_BASE_URL ? 'text-green-400' : 'text-red-400'}>
            {envVars.NEXT_PUBLIC_BASE_URL ? '✅' : '❌'} Base URL
          </li>
          <li className={envVars.NODE_ENV ? 'text-green-400' : 'text-red-400'}>
            {envVars.NODE_ENV ? '✅' : '❌'} Node Environment
          </li>
        </ul>
      </div>

      <div className="mt-4 text-center">
        <a 
          href="/" 
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  )
}