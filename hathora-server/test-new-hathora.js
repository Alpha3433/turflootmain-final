const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Generate test token
const JWT_SECRET = 'hathora-turfloot-secret';
const payload = {
  type: 'anonymous',
  id: 'test-new-hathora-player',
  name: 'NewHathoraTest',
  iat: Math.floor(Date.now() / 1000)
};
const token = jwt.sign(payload, JWT_SECRET);

console.log('🧪 Testing NEW Hathora App WebSocket Connection...');
console.log('🆕 New App ID: app-ad240461-f9c1-4c9b-9846-8b9cbcaa1298');
console.log('🏠 Room ID: 1juo80xfc4zxf');
console.log('🌐 Host: spghgd.edge.hathora.dev:18148');
console.log(`🔑 Token: ${token.substring(0, 50)}...`);

// Create WebSocket connection to NEW Hathora app
const ws = new WebSocket(`ws://spghgd.edge.hathora.dev:18148/ws?token=${token}`);

ws.on('open', function open() {
  console.log('✅ NEW Hathora WebSocket connection established!');
  
  // Send a move command
  const moveCommand = {
    type: 'move',
    x: 2000,
    y: 1500,
    timestamp: Date.now()
  };
  
  console.log('📤 Sending move command:', moveCommand);
  ws.send(JSON.stringify(moveCommand));
  
  // Send a ping after 2 seconds
  setTimeout(() => {
    const pingCommand = {
      type: 'ping',
      timestamp: Date.now()
    };
    console.log('📤 Sending ping:', pingCommand);
    ws.send(JSON.stringify(pingCommand));
  }, 2000);
  
  // Close connection after 8 seconds
  setTimeout(() => {
    console.log('🔚 Closing NEW Hathora connection...');
    ws.close();
  }, 8000);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log('📥 Received from NEW Hathora:', parsed.type);
    if (parsed.type === 'init') {
      console.log('  👤 Player initialized:', parsed.player.name, 'at', parsed.player.x.toFixed(0), parsed.player.y.toFixed(0));
    } else if (parsed.type === 'game_update') {
      const player = parsed.players[0];
      console.log('  🎮 Player update:', player.name, 'pos:', player.x.toFixed(0), player.y.toFixed(0), 'mass:', player.mass, 'score:', player.score);
    } else if (parsed.type === 'pong') {
      console.log('  🏓 Pong latency:', (Date.now() - parsed.clientTimestamp) + 'ms');
    }
  } catch (error) {
    console.log('📥 Received raw from NEW Hathora:', data.toString());
  }
});

ws.on('close', function close(code, reason) {
  console.log(`👋 NEW Hathora connection closed: ${code} - ${reason}`);
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('❌ NEW Hathora WebSocket error:', err);
  process.exit(1);
});