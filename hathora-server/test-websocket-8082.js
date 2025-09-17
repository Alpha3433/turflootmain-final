const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Generate test token
const JWT_SECRET = 'hathora-turfloot-secret';
const payload = {
  type: 'anonymous',
  id: 'test-player-456',
  name: 'TestPlayer456',
  iat: Math.floor(Date.now() / 1000)
};
const token = jwt.sign(payload, JWT_SECRET);

console.log('🧪 Testing WebSocket Connection...');
console.log(`🔑 Token: ${token.substring(0, 50)}...`);

// Create WebSocket connection
const ws = new WebSocket(`ws://localhost:8082/ws?token=${token}`);

ws.on('open', function open() {
  console.log('✅ WebSocket connection established!');
  
  // Send a move command
  const moveCommand = {
    type: 'move',
    x: 1000,
    y: 500,
    timestamp: Date.now()
  };
  
  console.log('📤 Sending move command:', moveCommand);
  ws.send(JSON.stringify(moveCommand));
  
  // Send a ping
  setTimeout(() => {
    const pingCommand = {
      type: 'ping',
      timestamp: Date.now()
    };
    console.log('📤 Sending ping:', pingCommand);
    ws.send(JSON.stringify(pingCommand));
  }, 1000);
  
  // Close connection after 5 seconds
  setTimeout(() => {
    console.log('🔚 Closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log('📥 Received message:', parsed.type, parsed);
  } catch (error) {
    console.log('📥 Received raw message:', data.toString());
  }
});

ws.on('close', function close(code, reason) {
  console.log(`👋 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
  process.exit(1);
});