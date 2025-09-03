// Load environment variables first
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

// Log environment loading
console.log('🔍 Environment variables loaded:')
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET')
console.log('NEXT_PUBLIC_PRIVY_APP_ID:', process.env.NEXT_PUBLIC_PRIVY_APP_ID ? 'SET' : 'NOT SET')
console.log('MONGO_URL:', process.env.MONGO_URL ? 'SET' : 'NOT SET')
console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET')

// Custom server to handle WebSocket connections and TurfLoot game server
import { createServer } from 'http'
import next from 'next'
import { parse } from 'url'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize TurfLoot Game Server with Socket.IO
  try {
    const { gameServer } = await import('./lib/gameServer.js')
    gameServer.initialize(server)
    console.log('🎮 TurfLoot Game Server initialized with Socket.IO')
  } catch (error) {
    console.log('⚠️ Game server not available:', error.message)
  }

  // Keep legacy WebSocket support for backwards compatibility
  try {
    const { initializeWebSocket } = require('./lib/websocket.js')
    const io = initializeWebSocket(server)
    console.log('📡 Legacy WebSocket server initialized')
  } catch (error) {
    console.log('⚠️ Legacy WebSocket not available:', error.message)
  }

  server
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`🚀 TurfLoot server ready on http://${hostname}:${port}`)
    })
})